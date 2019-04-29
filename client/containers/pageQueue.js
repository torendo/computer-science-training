import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageStack} from './pageStack';

export class PageQueue extends PageStack {
  render() {
    return html`
      <h4>Queue</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'front'}),
      new Marker({position: 3, size: 3, color: 'blue', text: 'rear'})
    ];
  }

  * iteratorNew() {
    yield 'Will create new empty queue';
    const length = 10;
    this.items = [];
    for (let i = 0; i < length; i++) {
      this.items.push(new Item({index: i}));
    }
    this.length = 0;
    this.markers[0].position = 0;
    this.markers[1].position = -1;
  }

  getNextIndex(index) {
    return index + 1 === this.items.length ? 0 : index + 1;
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
    yield `Will insert item with key ${key}`;
    const newIndex = this.getNextIndex(this.markers[1].position);
    this.items[newIndex].setData(key);
    this.markers[1].position = newIndex;
    this.length++;
    yield `Inserted item with key ${key}`;
  }

  * iteratorRem() {
    if (this.length === 0) {
      return 'ERROR: can\'t remove. Queue is empty';
    }
    yield 'Will remove item from front of queue';
    const curIndex = this.markers[0].position;
    const item = this.items[curIndex];
    const value = item.data;
    item.clear();
    this.markers[0].position = this.getNextIndex(curIndex);
    this.length--;
    yield `Item removed; Returned value is ${value}`;
  }

  * iteratorPeek() {
    if (this.length === 0) {
      return 'ERROR: can\'t peek. Queue is empty';
    }
    yield 'Will peek at front of queue';
    yield `Returned value is ${this.items[this.markers[0].position].data}`;
  }
}

customElements.define('page-queue', PageQueue);