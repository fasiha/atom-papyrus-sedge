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
      'papyrus-sedge:select-code-block': () => this.selectFencedCodeBlock()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'papyrus-sedge:hydrogen-code-block': () => this.runHydrogenCodeBlock()
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

  toggle() {
    console.log('PapyrusSedge was toggled!', this.hydrogenCallback ? 1 : 0);
    this.hydrogenCallbackWrapper();
    return 0;
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

  runHydrogenCodeBlock() {
    const e = atom.workspace.getActiveTextEditor();

    const {curr, first, last} = this.selectFencedCodeBlock();
    this.dispatchEditorCommand('hydrogen:run');

    // SUPER FUGLY HACK FIXME!
    // Problem is, it takes time for Jupyter to evaluate code and to get results
    // back to Hydrogen. So this has to be delayed somehow.
    setTimeout(() => {
      const hydrogenResponse = this.hydrogenCallbackWrapper();
      if (hydrogenResponse) {
        console.log(
            'kono Hydrogen said:', hydrogenResponse,
            JSON.stringify(hydrogenResponse));
        e.setCursorBufferPosition(last);
        const hydrogenOutput = hydrogenResponse.texts
                                   .map(o => {
                                     const s = o.data['text/plain'];
                                     return s ? `> ${s}` : s;
                                   })
                                   .join('\n');
        e.insertText(hydrogenOutput, {select: true});
        e.toggleLineCommentsInSelection();
      }

      e.setCursorBufferPosition(curr);
    }, 1000);

  }
};
