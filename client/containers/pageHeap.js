import {PageBase} from './pageBase';
import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';

export class PageHeap extends PageBase {
  constructor() {
    super();
    this.initItems(10);
    this.initMarker();
  }

  render() {
    return html`
      <h4>Heap</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorChng)}>Chng</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  /*
      arr[curLength].setValue(value);
      //trickle up
      let index = curLength;
      let parent = Math.floor((curLength - 1) / 2);
      while(index >= 0 && arr[parent] && arr[parent].value < value) {
        arr[parent].swapWith(arr[index]);
        index = parent;
        parent = Math.floor((parent - 1) / 2);
      }
  * */

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.dialog = this.querySelector('x-dialog');
    this.tree = this.querySelector('x-items-tree');
  }

  initItems(length) {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    for (let curLength = 0; curLength <= length - 1; curLength++) {
      const value = Math.floor(Math.random() * 100);
      arr[curLength].setValue(value);
      //trickle up
      let index = curLength;
      let parent = Math.floor((curLength - 1) / 2);
      while(index >= 0 && arr[parent] && arr[parent].value < value) {
        arr[parent].swapWith(arr[index]);
        index = parent;
        parent = Math.floor((parent - 1) / 2);
      }
    }
    this.items = arr;
    this.length = length;
  }

  initMarker() {
    this.marker = new Marker({position: 0});
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of nodes (1 to 31)';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 31 || length < 1) {
      return 'ERROR: use size between 1 and 31';
    }
    yield `Will create tree with ${length} nodes`;
    this.initItems(length);
  }

  * trickleUp(key, index) {
    this.items[index].setValue('', '#ffffff');
    yield 'Saved new node; will trickle up';
    let parent = Math.floor((index - 1) / 2);
    while(index >= 0 && this.items[parent] && this.items[parent].value < key) {
      this.items[parent].swapWith(this.items[index]);
      this.marker.position = parent;
      yield 'Moved empty node up';
      index = parent;
      parent = Math.floor((parent - 1) / 2);
    }
    yield 'Trickle up completed';
    this.items[index].setValue(key);
    this.marker.position = index;
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, no room in display';
    }
    let key = 0;
    yield 'Enter key of node to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert node with key ${key}`;
    let index = this.length;
    this.items[index].setValue(key);
    this.marker.position = index;
    yield 'Placed node in first empty cell';
    yield* this.trickleUp(key, index);
    yield 'Inserted new node in empty node';
    this.marker.position = 0;
    this.length++;
  }

  * trickleDown(index, isChg) {
    const rootNode = new Item(this.items[index]);
    this.items[index].setValue('', '#ffffff');
    yield `Saved ${isChg ? 'changed' : 'root'} node (${rootNode.value})`;
    while(index < Math.floor(this.length / 2)) { //node has at least one child
      let largerChild;
      const leftChild = index * 2 + 1;
      const rightChild = leftChild + 1;
      if (rightChild < this.length && this.items[leftChild].value < this.items[rightChild].value) {
        largerChild = rightChild;
      } else {
        largerChild = leftChild;
      }
      yield `Key ${this.items[largerChild].value} is larger child`;
      if (this.items[largerChild].value < rootNode.value) {
        yield `${isChg ? 'Changed' : '"Last"'} node larger; will insert it`;
        break;
      }
      this.items[largerChild].swapWith(this.items[index]);
      index = largerChild;
      this.marker.position = index;
      yield 'Moved empty node down';
    }
    if (Math.floor(Math.log2(this.length)) === Math.floor(Math.log2(index + 1))) {
      yield 'Reached bottom row, so done';
    } else if (index >= Math.floor(this.length / 2)) {
      yield 'Node has no children, so done';
    }
    this.items[index] = rootNode;
    yield `Inserted ${isChg ? 'changed' : '"last"'} node`;
  }

  * iteratorRem() {
    let index = 0;
    const removedKey = this.items[index].value;
    yield `Will remove largest node (${removedKey})`;
    this.items[index].setValue('', '#ffffff');
    const lastNode = this.items[this.length - 1];
    yield `Will replace with "last" node (${lastNode.value})`;
    this.items[index].moveFrom(lastNode);
    this.length--;
    yield 'Will trickle down';
    yield* this.trickleDown(index);
    yield `Finished deleting largest node (${removedKey})`;
    this.marker.position = 0;
  }

  * iteratorChng() {
    this.tree.clickFn = item => this.marker.position = item.index;
    yield 'Click on node to be changed';
    this.tree.clickFn = null;
    const top = this.marker.position;
    const changingKey = this.items[top].value;
    yield 'Type node\'s new value';
    let key = 0;
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will change node from ${changingKey} to ${key}`;
    if (this.items[top].value > key) {
      this.items[top].setValue(key);
      yield 'Key decreased; will trickle down';
      yield* this.trickleDown(top, true);
    } else {
      this.items[top].setValue(key);
      yield 'Key increased; will trickle up';
      yield* this.trickleUp(key, top);
    }
    yield `Finished changing node (${changingKey})`;
    this.marker.position = 0;
  }
}

customElements.define('page-heap', PageHeap);