import {LitElement, html} from 'lit-element';
import {getRandomColor100} from "../utils/colors";

export class PageArray extends LitElement {
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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Del</x-button>
        <label><input class="dups" type="checkbox" disabled>Dups OK</label>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items}></x-items-horizontal>
      <x-dialog>
        <form>
          <label>Number: <input name="number" type="number"></label>
        </form>
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
    return iteration;
  }

  resetItemsState() {
    this.items.forEach(item => item.state = false);
  }

  initItems() {
    const length = Math.ceil(Math.random() * 60);
    const lengthFill = Math.ceil(Math.random() * length);
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = {
        index: i,
        data: i < lengthFill ? Math.ceil(Math.random() * 1000) : null,
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
    this.dialog.open().then(nodes => {
      const form = nodes.find(node => node.tagName === 'FORM');
      length = Number((new FormData(form)).get('number'));
      this.iterate();
    });
    yield 'Dialog opened'; //skip in promise
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
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    yield 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(nodes => {
      const form = nodes.find(node => node.tagName === 'FORM');
      length = Number((new FormData(form)).get('number'));
      this.iterate();
    });
    yield 'Dialog opened'; //skip in promise
    yield `Will fill in ${length} items`;
    for (let i = 0; i < length; i++) {
      this.items[i].data = Math.ceil(Math.random() * 1000);
      this.items[i].color = getRandomColor100();
    }
    this.items = [...this.items];
    this.length = length;
    yield `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(nodes => {
      const form = nodes.find(node => node.tagName === 'FORM');
      key = Number((new FormData(form)).get('number'));
      this.iterate();
    });
    yield 'Dialog opened'; //skip in promise
    yield `Will insert item with key ${key}`;
    this.resetItemsState();
    this.items[this.length] = {
      index: this.length,
      data: key,
      state: true,
      color: getRandomColor100()
    };
    this.items = [...this.items];
    this.requestUpdate();
    yield `Inserted item with key ${key} at index ${this.length}`;
    this.length++;
    this.resetItemsState();
    this.items = [...this.items];
    yield `Insertion completed item; total items ${this.length}`;
  }
}

customElements.define('page-array', PageArray);