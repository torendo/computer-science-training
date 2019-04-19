import {LitElement, html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';

export class PageBubbleSort extends LitElement {
  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.isReverseOrder = false;
    this.length = 10;
    this.initItems();
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorStep)}>Step</x-button>
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
    const arr = [];
    for (let i = 0; i < this.length; i++) {
      const item = new Item({index: i, state: i === 0});
      const value = this.isReverseOrder ? (this.length - i) * (this.length === 10 ? 10 : 1) : Math.floor(Math.random() * 100);
      item.setData(value);
      arr.push(item);
    }
    this.items = arr;
    this.markers = [
      new Marker({position: 0, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner+1'}),
      new Marker({position: this.length - 1, size: 2, color: 'red', text: 'outer'})
    ];
  }

  * iteratorNew() {
    this.isReverseOrder = !this.isReverseOrder;
    this.initItems(this.isReverseOrder);
    yield `Created ${this.isReverseOrder ? 'reverse' : 'ordered'} array`;
  }

  * iteratorSize() {
    this.length = this.length === 10 ? 100 : 10;
    this.initItems();
    yield `Created ${this.length} elements array`;
  }

  * iteratorStep() {
    for (let i = 0; i < this.length; i++) {

      yield 'Created ' + this.length + ' elements array';
    }
  }

  * iteratorRun() {
    this.length = this.length === 10 ? 100 : 10;
    this.initItems();
    yield 'Created ' + this.length + ' elements array';
  }

}

customElements.define('page-bubble-sort', PageBubbleSort);