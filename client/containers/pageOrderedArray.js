import {html} from 'lit-element';
import {Item} from '../classes/item';
import {getUniqueRandomArray} from '../utils';
import {PageArray} from './pageArray';

export class PageOrderedArray extends PageArray {
  drawAdditionalControl() {
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
      const item = new Item({index: i, state: i === 0});
      if (i < lengthFill) item.setData(arrValues[i]);
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
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({
        index: i,
        data: null,
        state: i === 0
      }));
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
      this.items[i].setData(value);
    });
    this.length = length;
    yield `Fill completed; total items = ${length}`;
  }

  * linearSearch(key, isInsertion) {
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].data === key || isInsertion && this.items[i].data > key) {
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
      if (this.items[i].data === key) {
        return i;
      } else {
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
      }
      if (this.items[i].data > key) {
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
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 999 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    if (this.items.find(i => i.data === key)) {
      return 'ERROR: can\'t insert, duplicate found';
    }
    yield `Will insert item with key ${key}`;
    let insertAt;
    const iterator = this.linear.checked ? this.linearSearch(key, true) : this.binarySearch(key, true);
    while (true) {
      const iteration = iterator.next();
      if (iteration.done) {
        insertAt = iteration.value != null ? iteration.value : this.length;
        break;
      }
      yield iteration.value;
    }
    yield `Will insert at index ${insertAt}${insertAt !== this.length ? ', following shift' : ''}`;
    this.markers[0].position = this.length;
    if (insertAt !== this.length) {
      yield 'Will shift cells to make room';
    }
    for (let i = this.length; i > insertAt; i--) {
      this.items[i].moveDataFrom(this.items[i - 1]);
      this.markers[0].position = i - 1;
      yield `Shifted item from index ${i - 1}`;
    }
    this.items[insertAt].setData(key);
    yield `Have inserted item ${key} at index ${insertAt}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
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
    const iterator = this.linear.checked ? this.linearSearch(key) : this.binarySearch(key);
    while (true) {
      const iteration = iterator.next();
      if (iteration.done) {
        foundAt = iteration.value;
        break;
      }
      yield iteration.value;
    }
    if (foundAt == null) {
      yield `No items with key ${key}`;
    } else {
      yield `Have found item at index = ${foundAt}`;
    }
    this.markers[0].position = 0;
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
    const iterator = this.linear.checked ? this.linearSearch(key) : this.binarySearch(key);
    while (true) {
      const iteration = iterator.next();
      if (iteration.done) {
        foundAt = iteration.value;
        break;
      }
      yield iteration.value;
    }
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
      this.items[i - 1].moveDataFrom(this.items[i]);
      yield `Shifted item from index ${i}`;
    }
    this.length--;
    this.markers[0].position = 0;
    return `${foundAt !== this.length ? 'Shift completed' : 'Completed'}; total items ${this.length}`;
  }
}

customElements.define('page-ordered-array', PageOrderedArray);