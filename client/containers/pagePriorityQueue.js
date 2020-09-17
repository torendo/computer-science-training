import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {getUniqueRandomArray} from '../utils';
import {PageQueue} from './pageQueue';
import {html} from 'lit-element';

export class PagePriorityQueue extends PageQueue {
  constructor() {
    super();
    this.title = 'Priority Queue';
    this.info = html`
      <p><b>New</b> creates new empty priority queue</p> 
      <p><b>Ins</b> inserts item with value N</p>
      <p><b>Rem</b> removes item from front of queue, returns value</p> 
      <p><b>Peek</b> returns value of item at front of queue</p>
    `;
  }

  initItems() {
    const length = 10;
    const lengthFill = 4;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => b - a);
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(arrValues[i]);
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: this.length - 1, size: 1, color: 'red', text: 'front'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'rear'}),
      new Marker({position: -1, size: 1, color: 'purple'})
    ];
  }

  * iteratorIns() {
    if (this.length === this.items.length) {
      return 'ERROR: can\'t push. Queue is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    this.markers[2].position = this.markers[0].position;
    yield `Will insert item with key ${key}`;
    for (let i = this.markers[0].position; i >= -1; i--) {
      if (i === -1 || key <= this.items[i].value) {
        this.markers[2].position++;
        yield 'Found place to insert';
        this.items[i + 1].setValue(key);
        this.markers[0].position++;
        break;
      } else {
        this.items[i + 1].moveFrom(this.items[i]);
        yield 'Searching for place to insert';
        this.markers[2].position--;
      }
    }
    this.markers[2].position = -1;
    this.length++;
    return `Inserted item with key ${key}`;
  }

  * iteratorRem() {
    if (this.length === 0) {
      return 'ERROR: can\'t remove. Queue is empty';
    }
    yield 'Will remove item from front of queue';
    const item = this.items[this.markers[0].position];
    const value = item.value;
    item.clear();
    this.markers[0].position--;
    this.length--;
    return `Item removed; Returned value is ${value}`;
  }
}

customElements.define('page-priority-queue', PagePriorityQueue);