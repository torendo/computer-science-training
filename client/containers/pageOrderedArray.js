import {LitElement, html} from 'lit-element';
import {getRandomColor100, getUniqueRandomArray} from '../utils';

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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        <label><input type="radio" name="algorythm" class="algorythm algorythm_linear" checked>Linear</label>
        <label><input type="radio" name="algorythm" class="algorythm algorythm_binary">Binary</label>
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
    this.binary = this.querySelector('.algorythm_binary');
    this.linear = this.querySelector('.algorythm_linear');
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
    this.querySelectorAll('.algorythm').forEach(el => {
      el.disabled = status;
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
    this.items.forEach(item => {
      item.state = false;
      item.marker = false;
    });
    if (isFinish) {
      this.items[0].state = true;
      this.items = [...this.items];
    }
  }

  markItems(range) {
    for (let i = range.start; i <= range.end; i++) {
      this.items[i].marker = true;
    }
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => a - b);
    for (let i = 0; i < length; i++) {
      arr.push({
        index: i,
        data: i < lengthFill ? arrValues[i] : null,
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
    const arrValues = getUniqueRandomArray(length, 1000);
    arrValues.sort((a, b) => a - b);
    arrValues.forEach((value, i) => {
      this.items[i].data = value;
      this.items[i].color = getRandomColor100();
    });
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
      return 'ERROR: use key between 0 and 999';
    }
    if (this.items.find(i => i.data === key)) {
      return 'ERROR: can\'t insert, duplicate found';
    }
    yield `Will insert item with key ${key}`;
    let insertAt = this.length;
    if (this.linear.checked) {
      for (let i = 0; i < this.length; i++) {
        this.resetItemsState();
        this.items[i].state = true;
        this.items = [...this.items];
        if (this.items[i].data > key) {
          insertAt = i;
          yield `Will insert at index ${insertAt}, following shift`;
          break;
        }
        if (i !== this.length - 1) {
          yield `Checking at index = ${i + 1}`;
        }
      }
    }
    if (this.binary.checked) {
      let range = {start: 0, end: this.length - 1};
      let i;
      while (true) {
        i = range.start + Math.floor((range.end - range.start) / 2);
        this.resetItemsState();
        this.items[i].state = true;
        this.markItems(range);
        this.items = [...this.items];
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
        if (this.items[i].data > key) range = {start: range.start, end: i - 1};
        if (this.items[i].data < key) range = {start: i + 1, end: range.end};
        if (range.end - range.start < 0) break;
      }
      insertAt = (key > this.items[i].data) ? i + 1 : i;
    }
    this.resetItemsState();
    this.items[this.length].state = true;
    this.items = [...this.items];
    if (insertAt !== this.length) {
      yield 'Will shift cells to make room';
    }
    for (let i = this.length; i > insertAt; i--) {
      this.items[i].data = this.items[i - 1].data;
      this.items[i].color = this.items[i - 1].color;
      this.items[i - 1].data = null;
      this.items[i - 1].color = null;
      this.resetItemsState();
      this.items[i - 1].state = true;
      this.items = [...this.items];
      yield `Shifted item from index ${i - 1}`;
    }
    this.items[insertAt].data = key;
    this.items[insertAt].color = getRandomColor100();
    this.items = [...this.items];
    yield `Have inserted item ${key} at index ${insertAt}`;
    this.length++;
    this.resetItemsState(true);
    yield `Insertion completed; total items ${this.length}`;
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
    if (this.linear.checked) {
      for (let i = 0; i < this.length; i++) {
        this.resetItemsState();
        this.items[i].state = true;
        this.items = [...this.items];
        if (this.items[i].data === key) {
          foundAt = i;
          break;
        }
        if (i !== this.length - 1) {
          yield `Checking at index = ${i + 1}`;
        }
      }
    }
    if (this.binary.checked) {
      let range = {start: 0, end: this.length - 1};
      let i;
      while (true) {
        i = range.start + Math.floor((range.end - range.start) / 2);
        this.resetItemsState();
        this.items[i].state = true;
        this.markItems(range);
        this.items = [...this.items];
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
        if (this.items[i].data === key) {
          foundAt = i;
          break;
        }
        if (this.items[i].data > key) range = {start: range.start, end: i - 1};
        if (this.items[i].data < key) range = {start: i + 1, end: range.end};
        if (range.end - range.start < 0) break;
      }
    }
    if (foundAt == null) {
      yield `No items with key ${key}`;
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
    if (this.linear.checked) {
      for (let i = 0; i < this.length; i++) {
        this.resetItemsState();
        this.items[i].state = true;
        this.items = [...this.items];
        if (this.items[i].data === key) {
          foundAt = i;
          break;
        }
        if (i !== this.length - 1) {
          yield `Checking at index = ${i + 1}`;
        }
      }
    }
    if (this.binary.checked) {
      let range = {start: 0, end: this.length - 1};
      let i;
      while (true) {
        i = range.start + Math.floor((range.end - range.start) / 2);
        this.resetItemsState();
        this.items[i].state = true;
        this.markItems(range);
        this.items = [...this.items];
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
        if (this.items[i].data === key) {
          foundAt = i;
          break;
        }
        if (this.items[i].data > key) range = {start: range.start, end: i - 1};
        if (this.items[i].data < key) range = {start: i + 1, end: range.end};
        if (range.end - range.start < 0) break;
      }
    }
    if (foundAt == null) {
      this.resetItemsState(true);
      return `No items with key ${key}`;
    }
    this.resetItemsState();
    this.items[foundAt].state = true;
    this.items[foundAt].data = null;
    this.items[foundAt].color = null;
    this.items = [...this.items];
    yield `Have found and deleted item at index = ${foundAt}`;
    if (foundAt !== this.length - 1) {
      yield 'Will shift items';
    }
    for (let i = foundAt + 1; i < this.length; i++) {
      this.resetItemsState();
      this.items[i].state = true;
      this.items[i - 1].data = this.items[i].data;
      this.items[i - 1].color = this.items[i].color;
      this.items[i].data = null;
      this.items[i].color = null;
      this.items = [...this.items];
      yield `Shifted item from index ${i}`;
    }
    this.length--;
    this.resetItemsState(true);
    yield `${foundAt !== this.length - 1 ? 'Shift completed' : 'Completed'}; total items ${this.length}`;
  }
}

customElements.define('page-ordered-array', PageOrderedArray);