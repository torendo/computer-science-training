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
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${item => this.marker.position = item.index}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.dialog = this.querySelector('x-dialog');
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
    let bottom = this.items[this.length].setValue(key);
    this.marker.position = this.length;
    yield 'Placed node in first empty cell';
    let index = this.length;
    let parent = Math.floor((this.length - 1) / 2);
    bottom.setValue('');
    bottom.color = '#ffffff';
    yield 'Saved new node; will trickle up';
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
    yield 'Inserted new node in empty node';
    this.marker.position = 0;
    this.length++;
  }

  * iteratorRem() {

  }

  * iteratorChng() {

  }
}

customElements.define('page-heap', PageHeap);