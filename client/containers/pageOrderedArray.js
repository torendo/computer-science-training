import {LitElement, html} from 'lit-element';
import {getRandomColor100} from '../utils/colors';

export class PageOrderedArray extends LitElement {
  constructor() {
    super();
    this.items = [];
    this.length = 0;
    this.initItems();
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Del</x-button>
        <label><input class="dups" type="radio" name="alg" checked disabled>Linear</label>
        <label><input class="dups" type="radio" name="alg" disabled>Ordered</label>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items}></x-items-horizontal>
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
    this.dups = this.querySelector('.dups');
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
    this.items.forEach(item => item.state = false);
    if (isFinish) {
      this.items[0].state = true;
      this.items = [...this.items];
    }
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = {
        index: i,
        data: i < lengthFill ? Math.floor(Math.random() * 1000) : null,
        state: i === 0,
        color: i < lengthFill ? getRandomColor100() : null,
      };
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
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = {
        index: i,
        data: null,
        state: i === 0
      };
    }
    this.items = arr;
    this.length = 0;
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    yield 'New array created; total items = 0';
  }
}

customElements.define('page-ordered-array', PageOrderedArray);