import {html} from 'lit-element';
import {getUniqueRandomArray} from '../utils';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import '../components/button';
import '../components/console';
import '../components/dialog';

export class PageHashChain extends PageBase {
  constructor() {
    super();
    this.initItems(25);
    this.fillValues(this.items.length);
    this.initMarkers();
  }

  render() {
    return html`
      <h1>Hash Table Chain</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console></x-console>
      <ol start="0" style="height: 30em; overflow-y: scroll;">${this.renderLines()}</ol>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderLines() {
    return this.items.map((list, i) => html`
      <li><x-items-horizontal-linked .items=${list.items} .marker=${list.marker} narrow class="list-${i}"></x-items-horizontal-linked></li>
    `);
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems(length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push({items: [new Item({})], marker: {}});
    }
    this.items = arr;
    this.length = 0;
  }

  fillValues(length) {
    getUniqueRandomArray(length, 1000).forEach(value => {
      const list = this.items[this.hashFn(value)];
      if (list.items[0].value == null) {
        list.items[0].setValue(value);
      } else {
        list.items.push((new Item({})).setValue(value));
      }
    });
    this.length = length;
  }

  initMarkers() {
    this.items[0].marker = new Marker({position: 0});
  }

  clearInitialMarker() {
    this.items[0].marker = {};
  }

  hashFn(value) {
    return value % this.items.length;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of table to create.';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 100 || length < 0) {
      return 'ERROR: use size between 0 and 100';
    }
    yield `Will create empty table with ${length} lists`;
    this.initItems(length);
    return 'New table created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    this.fillValues(length);
    return `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
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
    this.clearInitialMarker();
    let index = this.hashFn(key);
    const list = this.items[index];
    list.marker = new Marker({position: 0});
    this.querySelector(`.list-${index}`).scrollIntoViewIfNeeded();
    yield `Will insert in list ${index}`;
    if (list.items[0].value == null) {
      list.items[0].setValue(key);
    } else {
      list.items.push((new Item({})).setValue(key));
    }
    yield `Inserted item with key ${key} in list ${index}`;
    list.marker = {};
    this.initMarkers();
    this.length++;
    return `Insertion completed. Total items = ${this.length}`;
  }

  * iteratorFind(isInternal) {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Will try to find item with key ${key}`;
    this.clearInitialMarker();
    let index = this.hashFn(key);
    const list = this.items[index];
    list.marker = new Marker({position: 0});
    this.querySelector(`.list-${index}`).scrollIntoViewIfNeeded();
    yield `Item with key ${key} should be in list ${index}`;
    let i = 0;
    let foundAt;
    while (list.items[i] && list.items[i].value != null) {
      list.marker = new Marker({position: i});
      yield `Looking for item with key ${key} at link ${i}`;
      if (list.items[i].value === key) {
        foundAt = i;
        break;
      }
      i++;
    }
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
    }
    list.marker = {};
    this.initMarkers();
    if (isInternal && foundAt != null) {
      return key;
    }
  }

  * iteratorDel() {
    let key = yield* this.iteratorFind(true);
    if (key != null) {
      this.clearInitialMarker();
      const list = this.items[this.hashFn(key)];
      const index = list.items.findIndex(item => item.value === key);
      if (index === 0) {
        list.marker.position = index;
        list.items[index].clear();
      } else {
        list.marker.position = index - 1;
        list.items.splice(index, 1);
      }
      this.length--;
      yield `Deleted item with key ${key}. Total items = ${this.length}`;
      list.marker = {};
      this.initMarkers();
    }
  }
}

customElements.define('page-hash-chain', PageHashChain);