'use babel';

import {CompositeDisposable} from 'atom';

export default {

  subscriptions: null,
  hydrogenCallback: null,

  hydrogenConsumer(hydrogenProvider) {
    console.log('Getting Hydrogen provider', hydrogenProvider);
    this.hydrogenCallback = hydrogenProvider;
  },

  hydrogenCallbackWrapper() {
    console.log(
        'Hydrogen said:', this.hydrogenCallback ? this.hydrogenCallback() :
                                                  '¡callback not available!');
  },

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a
    // CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add(
        'atom-workspace', {'papyrus-sedge:toggle': () => this.toggle()}));
  },

  deactivate() { this.subscriptions.dispose();},

  serialize() { return {};},

  toggle() {
    console.log('PapyrusSedge was toggled!', this.hydrogenCallback ? 1 : 0);
    this.hydrogenCallbackWrapper();
    return 0;
  }

};
