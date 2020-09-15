import {html} from 'lit-element';
import {getUniqueRandomArray, isPrime} from '../utils';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import '../components/button';
import '../components/console';
import '../components/dialog';
import '../components/itemsHorizontal';

export class PageHashTable extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.initMarkers();
    this.DELETED = 'Del';
  }

  render() {
    return html`
      <h1>Hash Table (linear/quad/double)</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" disabled checked>Linear</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_quad" disabled>Quad</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_double" disabled>Double</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.double = this.querySelector('.algorithm_double');
    this.quad = this.querySelector('.algorithm_quad');
    this.linear = this.querySelector('.algorithm_linear');
  }

  initItems() {
    const length = 59;
    const lengthFill = 30;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.length = lengthFill;
    this.items = arr;
    getUniqueRandomArray(lengthFill, 1000).forEach(value => {
      arr[this.probeIndex(value)].setValue(value);
    });
  }

  initMarkers() {
    this.markers = [new Marker({position: 0})];
  }

  hashFn(value) {
    return value % this.items.length;
  }

  doubleHashFn(value) {
    return 5 - value % 5;
  }

  probeIndex(value) {
    let index = this.hashFn(value);
    let step = 1;
    let counter = 0;
    while (this.items[index].value != null) {
      counter++;
      if (this.double && this.double.checked) step = this.doubleHashFn(value);
      if (this.quad && this.quad.checked) step = counter**2;
      index += step;
      if (index >= this.items.length) index -= this.items.length;
    }
    return index;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create. Closest prime number will be selected';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    while (!isPrime(length)) {
      length--;
    }
    this.double.disabled = false;
    this.quad.disabled = false;
    this.linear.disabled = false;
    yield 'Please, select probe method';
    this.double.disabled = true;
    this.quad.disabled = true;
    this.linear.disabled = true;
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
    getUniqueRandomArray(length, 1000).forEach(value => {
      this.items[this.probeIndex(value)].setValue(value);
    });
    this.length = length;
    return `Fill completed; total items = ${length}`;
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
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert item with key ${key}`;
    let index = this.hashFn(key);
    let step = 1;
    let counter = 0;
    this.markers[0].position = index;
    while (this.items[index].value != null && this.items[index].value !== this.DELETED) {
      yield `Cell ${index} occupied; going to next cell`;
      counter++;
      if (this.double.checked) step = this.doubleHashFn(key);
      if (this.quad.checked) step = counter**2;
      index += step;
      if (index >= this.items.length) index -= this.items.length;
      this.markers[0].position = index;
      yield `Searching for unoccupied cell; step was ${step}`;
    }
    this.items[index].setValue(key);
    yield `Inserted item with key ${key} at index ${index}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
  }

  * iteratorProbe(key) {
    let index = this.hashFn(key);
    let foundAt;
    this.markers[0].position = index;
    yield `Looking for item with key ${key} at index ${index}`;
    if (this.items[index].value === key) {
      foundAt = index;
    } else if (this.items[index].value != null) {
      yield 'No match; will start probe';
      let step = 1;
      let counter = 0;
      while (foundAt == null) {
        if (++counter === this.items.length) break;
        if (this.double.checked) step = this.doubleHashFn(key);
        if (this.quad.checked) step = counter**2;
        index += step;
        if (index >= this.items.length) index -= this.items.length;
        if (this.items[index].value == null) break;
        this.markers[0].position = index;
        if (this.items[index].value === key) {
          foundAt = index;
        } else {
          yield `Checking next cell; step was ${step}`;
        }
      }
    }
    return foundAt;
  }

  * iteratorFind() {
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
    let foundAt = yield* this.iteratorProbe(key, false);
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
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
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* this.iteratorProbe(key, true);
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      this.items[foundAt].value = this.DELETED;
      this.items[foundAt].color = null;
      this.length--;
      yield `Deleted item with key ${key}; total items ${this.length}`;
    }
    this.markers[0].position = 0;
  }
}

customElements.define('page-hash-table', PageHashTable);