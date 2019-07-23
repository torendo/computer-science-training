import {LitElement} from 'lit-element';

export class PageBase extends LitElement {
  createRenderRoot() {
    return this;
  }

  handleClick(iterator, btn) {
    if (!this.iterator) {
      this.iterator = iterator.call(this);
      this.toggleButtonsActivity(btn, true);
    }
    const iteration = this.iterate();
    if (iteration.done) {
      this.iterator = null;
      this.toggleButtonsActivity(btn, false);
    }
    this.items = [...this.items];
    this.requestUpdate();
  }

  toggleButtonsActivity(btn, status) {
    this.querySelectorAll('x-button').forEach(el => {
      if (el !== btn) el.disabled = status;
    });
    btn.activated = status;
  }

  iterate() {
    const iteration = this.iterator.next();
    this.console.setMessage(iteration.value);
    const activatedBtn = this.querySelector('x-button.activated');
    if (activatedBtn) activatedBtn.focus();
    return iteration;
  }

  initItems() {
    this.items = [];
    this.length = 0;
  }

  initMarkers() {
    this.markers = [];
  }
}