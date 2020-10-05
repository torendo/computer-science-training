import {html} from 'lit-element';
import {Item} from '../classes/item';
import {getUniqueRandomArray} from '../utils';
import {PageArray} from './pageArray';

export class PageOrderedArray extends PageArray {
  constructor() {
    super();
    this.title = 'Ordered Array';
    this.info = html`
      <p><b>New</b> creates array with N cells (60 max)</p>
      <p><b>Fill</b> inserts N items into array</p>
      <p><b>Ins</b> inserts new item with value N</p>
      <p><b>Find</b> finds item with value N</p>
      <p><b>Del</b> deletes item with value N</p>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" checked>Linear</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_binary">Binary</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.binary = this.querySelector('.algorithm_binary');
    this.linear = this.querySelector('.algorithm_linear');
  }

  toggleButtonsActivity(btn, status) {
    super.toggleButtonsActivity(btn, status);
    this.querySelectorAll('.algorithm').forEach(el => {
      el.disabled = status;
    });
    this.items.forEach(item => {
      item.mark = false;
    });
  }

  markItems(range) {
    this.items.forEach((item, i) => {
      item.mark = i >= range.start && i <= range.end;
    });
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => a - b);
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(arrValues[i]);
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  * iteratorNew() {
    let length;
    yield 'Enter size of array to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length == null) {
      return 'ERROR: Input cancelled';
    }
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.items = arr;
    this.length = 0;
    return 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length == null) {
      return 'ERROR: Input cancelled';
    }
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    const arrValues = getUniqueRandomArray(length, 1000);
    arrValues.sort((a, b) => a - b);
    arrValues.forEach((value, i) => {
      this.items[i].setValue(value);
    });
    this.length = length;
    return `Fill completed; total items = ${length}`;
  }

  * linearSearch(key, isInsertion) {
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key || isInsertion && this.items[i].value > key) {
        return i;
      }
      if (i !== this.length - 1) {
        yield `Checking at index = ${i + 1}`;
      }
    }
  }

  * binarySearch(key, isInsertion) {
    let range = {start: 0, end: this.length - 1};
    let i;
    while (true) {
      i = Math.floor((range.end + range.start) / 2);
      if (range.end < range.start) {
        return isInsertion ? i + 1 : null;
      }
      this.markers[0].position = i;
      this.markItems(range);
      if (this.items[i].value === key) {
        return i;
      } else {
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
      }
      if (this.items[i].value > key) {
        range.end = i - 1;
      } else {
        range.start = i + 1;
      }
    }
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, array is full';
    }
    let key;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key == null) {
      return 'ERROR: Input cancelled';
    }
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    if (this.items.find(i => i.value === key)) {
      return 'ERROR: can\'t insert, duplicate found';
    }
    yield `Will insert item with key ${key}`;
    let insertAt = yield* (this.linear.checked ? this.linearSearch(key, true) : this.binarySearch(key, true));
    insertAt = insertAt != null ? insertAt : this.length;
    yield `Will insert at index ${insertAt}${insertAt !== this.length ? ', following shift' : ''}`;
    this.markers[0].position = this.length;
    if (insertAt !== this.length) {
      yield 'Will shift cells to make room';
    }
    for (let i = this.length; i > insertAt; i--) {
      this.items[i].moveFrom(this.items[i - 1]);
      this.markers[0].position = i - 1;
      yield `Shifted item from index ${i - 1}`;
    }
    this.items[insertAt].setValue(key);
    yield `Have inserted item ${key} at index ${insertAt}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
  }

  * iteratorFind() {
    let key;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key == null) {
      return 'ERROR: Input cancelled';
    }
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* (this.linear.checked ? this.linearSearch(key) : this.binarySearch(key));
    this.markers[0].position = 0;
    if (foundAt == null) {
      return `No items with key ${key}`;
    } else {
      return `Have found item at index = ${foundAt}`;
    }
  }

  * iteratorDel() {
    let key;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key == null) {
      return 'ERROR: Input cancelled';
    }
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* (this.linear.checked ? this.linearSearch(key) : this.binarySearch(key));
    if (foundAt == null) {
      this.markers[0].position = 0;
      return `No items with key ${key}`;
    }
    this.items[foundAt].clear();
    yield `Have found and deleted item at index = ${foundAt}`;
    if (foundAt !== this.length - 1) {
      this.markers[0].position = foundAt;
      yield 'Will shift items';
    }
    for (let i = foundAt + 1; i < this.length; i++) {
      this.markers[0].position = i;
      this.items[i - 1].moveFrom(this.items[i]);
      yield `Shifted item from index ${i}`;
    }
    this.length--;
    this.markers[0].position = 0;
    return `${foundAt !== this.length ? 'Shift completed' : 'Completed'}; total items ${this.length}`;
  }
}

customElements.define('page-ordered-array', PageOrderedArray);