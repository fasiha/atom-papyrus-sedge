'use babel';

import PapyrusSedgeView from './papyrus-sedge-view';
import { CompositeDisposable } from 'atom';

export default {

  papyrusSedgeView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.papyrusSedgeView = new PapyrusSedgeView(state.papyrusSedgeViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.papyrusSedgeView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'papyrus-sedge:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.papyrusSedgeView.destroy();
  },

  serialize() {
    return {
      papyrusSedgeViewState: this.papyrusSedgeView.serialize()
    };
  },

  toggle() {
    console.log('PapyrusSedge was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
