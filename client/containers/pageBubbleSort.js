import {LitElement, html} from 'lit-element';
import {Item} from '../classes/item';

export class PageBubbleSort extends LitElement {
  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Draw</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Step</x-button>
        <label><input class="dups" type="checkbox" checked disabled>Dups OK</label>
      </div>
      <x-console></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers}></x-items-vertical>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
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

  resetItemsState(isFinish) {
    this.items.forEach(item => item.setState(false));
    if (isFinish) {
      this.items[0].setState();
    }
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i, state: i === 0});
      if (i < lengthFill) item.setData(Math.floor(Math.random() * 1000));
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 60 && length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i, state: i === 0}));
    }
    this.items = arr;
    this.length = 0;
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    yield 'New array created; total items = 0';
  }

}

customElements.define('page-bubble-sort', PageBubbleSort);