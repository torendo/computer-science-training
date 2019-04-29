import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {getUniqueRandomArray} from '../utils';
import {PageQueue} from './pageQueue';

export class PagePriorityQueue extends PageQueue {
  initItems() {
    const length = 10;
    const lengthFill = 4;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => b - a);
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setData(arrValues[i]);
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 3, size: 1, color: 'red', text: 'front'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'rear'}),
      new Marker({position: -1, size: 1, color: 'black'})
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
    this.markers[3].position = this.markers[0].position;
    yield `Will insert item with key ${key}`;

    //todo:modify it
    this.items[1].setData(key);

    this.markers[0].position++;
    this.length++;
    yield `Inserted item with key ${key}`;
  }

  * iteratorRem() {
    if (this.length === 0) {
      return 'ERROR: can\'t remove. Queue is empty';
    }
    yield 'Will remove item from front of queue';
    const item = this.items[this.markers[0].position];
    const value = item.data;
    item.clear();
    this.markers[0].position--;
    this.length--;
    yield `Item removed; Returned value is ${value}`;
  }
}

customElements.define('page-priority-queue', PagePriorityQueue);