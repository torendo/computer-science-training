import {LitElement, html} from 'lit-element';
import {getRandomColor100, getUniqueRandomNumber} from '../utils';

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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
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
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push({
        index: i,
        data: i < lengthFill ? Math.floor(Math.random() * 1000) : null,
        state: i === 0,
        color: i < lengthFill ? getRandomColor100() : null,
      });
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
      arr.push({
        index: i,
        data: null,
        state: i === 0
      });
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
    if (length > this.items.length && length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    for (let i = 0; i < length; i++) {
      if (this.dups.checked) {
        this.items[i].data = Math.floor(Math.random() * 1000);
      } else {
        this.items[i].data = getUniqueRandomNumber(this.items, 1000);
      }
      this.items[i].color = getRandomColor100();
    }
    this.items = [...this.items];
    this.length = length;
    yield `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, array is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 999 && key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    if (!this.dups.checked) {
      const found =  this.items.find(i => i.data === key);
      if (found) yield `ERROR: you already have item with key ${key} at index ${found.index}`;
    }
    yield `Will insert item with key ${key}`;
    this.resetItemsState();
    this.items[this.length] = {
      index: this.length,
      data: key,
      state: true,
      color: getRandomColor100()
    };
    this.items = [...this.items];
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
    if (key > 999 && key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.resetItemsState();
      this.items[i].state = true;
      this.items = [...this.items];
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
      yield `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
    } else {
      yield `Have found item at index = ${foundAt}`;
    }
    this.resetItemsState(true);
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 999 && key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt;
    let deletedCount = 0;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.resetItemsState();
      this.items[i].state = true;
      if (this.items[i].data === key) {
        foundAt = i;
        deletedCount++;
        this.items[i].data = null;
        this.items[i].color = null;
        yield `Have found and deleted ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) isAdditional = true;
      } else if (deletedCount > 0) {
        yield `Will shift item ${deletedCount} spaces`;
        this.items[i - deletedCount].data = this.items[i].data;
        this.items[i - deletedCount].color = this.items[i].color;
        this.items[i].data = null;
        this.items[i].color = null;
      } else {
        yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
      }
      this.items = [...this.items];
    }
    this.length -= deletedCount;
    this.resetItemsState(true);
    if (deletedCount > 0) {
      yield `Shift${deletedCount > 1 ? 's' : ''} complete; no ${isAdditional ? 'more' : ''} items to delete`;
    } else {
      yield `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
    }
  }
}

customElements.define('page-array', PageArray);