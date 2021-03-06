'use babel';

import {CompositeDisposable} from 'atom';

export default {

  subscriptions: null,
  hydrogenCallback: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a
    // CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add(
        'atom-workspace', {'papyrus-sedge:toggle': () => this.toggle()}));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'papyrus-sedge:select-codeblock': () => this.selectFencedCodeBlock()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'papyrus-sedge:hydrogen-codeblock': () => this.hydrogenThisCodeblock()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'papyrus-sedge:hydrogen-all-codeblocks': () =>
                                                   this.hydrogenAllCodeblocks()
    }));
  },

  deactivate() { this.subscriptions.dispose();},

  serialize() { return {};},

  hydrogenConsumer(hydrogenProvider) {
    console.log('Getting Hydrogen provider', hydrogenProvider);
    this.hydrogenCallback = hydrogenProvider;
  },

  hydrogenCallbackWrapper() {
    const res = this.hydrogenCallback ? this.hydrogenCallback() : null;
    console.log('Wrapper Hydrogen said:', res || '¡callback not available!');
    return res;
  },

  selectFencedCodeBlock() {
    // Get editor object
    const e = atom.workspace.getActiveTextEditor();

    // Current cursor position. Save this because we'll lose it after selecting
    // the code block.
    const curr = e.getCursorBufferPosition();

    // We need to give backwardsScanInBufferRange/scanInBufferRange a Range to
    // search over, to find the opening and closing fences.
    let rang = [[0, 0], [curr.row, curr.column]];

    // first & last will be the Points bounding the contents of the code block
    let first = [];
    let last = [];

    // Search backwards from current to find `first` (fence start)
    e.backwardsScanInBufferRange(/^(~~~|```).*\n/, rang, function(obj) {
      first = obj.range.end;
      return obj.stop();
    });

    // Search forwards from current to find fence end, `last`
    rang = [[curr.row, curr.column], [9999999, 9999999]];
    e.scanInBufferRange(/^(~~~|```)$/, rang, function(obj) {
      last = obj.range.start;
      return obj.stop();
    });

    // Select the fenced code block and return start/end and cursor
    e.setSelectedBufferRange([first, last]);
    return {curr, first, last};
  },

  dispatchEditorCommand(command) {
    const editor = atom.workspace.getActiveTextEditor();
    atom.commands.dispatch(atom.views.getView(editor), command)
  },

  hydrogenThisCodeblock() {
    const e = atom.workspace.getActiveTextEditor();

    // Select the fenced code block.
    const {curr, first, last} = this.selectFencedCodeBlock();
    // If it contains a `no-hydrogen` directive, skip processing it.
    if (e.getSelectedText().indexOf('no-hydrogen') >= 0) {
      e.setCursorBufferPosition(curr);
      return Promise.resolve(undefined);
    }
    // Otherwise invoke `Hydrogen: Run` on it.
    this.dispatchEditorCommand('hydrogen:run');

    const hydrogenPromise = this.hydrogenCallbackWrapper();
    if (!hydrogenPromise) {
      console.log(
          'Papyrus-sedge couldn’t get a Promise from Hydrogen. Try again?',
          this.hydrogenCallbackWrapper());
      e.setCursorBufferPosition(curr);
      return Promise.resolve(undefined);
    }

    return hydrogenPromise.then(hydrogenResponse => {
      // Debug
      console.log(
          'kono Hydrogen said:', hydrogenResponse,
          JSON.stringify(hydrogenResponse));

      // Move the cursor to the very bottom of the fenced code block.
      e.setCursorBufferPosition(last);
      // If Jupyter/Hydrogen ran into an error (syntax error, etc.), bail.
      if (hydrogenResponse.texts.filter(o => o.stream === 'error').length) {
        e.setCursorBufferPosition(curr);
        return Promise.resolve(undefined);
      }
      // If all is well, generate the text to insert.
      const hydrogenOutput =
          hydrogenResponse.texts
              .map(o => {
                const s = o.data['text/plain'];
                return s ? `> ${s.replace(/\n/g, '\n>')}` : s;
              })
              .join('\n');
      // Insert it and comment it out.
      e.insertText(hydrogenOutput, {select: true});
      e.toggleLineCommentsInSelection();

      e.setCursorBufferPosition(curr);
      return Promise.resolve(undefined);
    });
  },

  hydrogenAllCodeblocks() {
    const e = atom.workspace.getActiveTextEditor();
    const curr = e.getCursorBufferPosition();

    const that = this;
    const end = () => e.getBuffer().getEndPosition().toArray();

    function scanFile(start) {
      e.scanInBufferRange(
          /(~~~|```)js.*?\n([\s\S]*?)\1$/, [start, end()], obj => {
            const newStart = [obj.range.start.row + 1, 0];
            e.setCursorBufferPosition(newStart);

            return that.hydrogenThisCodeblock().then(_ => scanFile(newStart));
          });
    }
    scanFile([0, 0]);

    e.setCursorBufferPosition(curr);
  }
};
