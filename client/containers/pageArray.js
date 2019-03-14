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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Del</x-button>
        <label><input class="dups" type="checkbox" checked disabled>Dups OK</label>
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
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
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
    this.length = 0;
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    yield 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
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
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
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
    this.resetItemsState(true);
    yield `Insertion completed item; total items ${this.length}`;
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    yield `Looking for item with key ${key}`;
    let foundAt = 0;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.resetItemsState();
      this.items[i].state = true;
      this.items = [...this.items];
      this.requestUpdate();
      if (this.items[i].data === key) {
        foundAt = i;
        yield `Have found ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) {
          isAdditional = true;
        } else {
          break;
        }
      }
      yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
    }
    if (isAdditional) {
      yield `No additional items with key ${key}`;
    } else {
      yield `Have found item at index = ${foundAt}`;
    }
    this.resetItemsState(true);
  }
}

customElements.define('page-array', PageArray);