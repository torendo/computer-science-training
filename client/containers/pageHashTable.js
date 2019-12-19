import {html} from 'lit-element';
import {getUniqueRandomNumber, getUniqueRandomArray} from '../utils';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import {PageOrderedArray} from './pageOrderedArray';

export class PageHashTable extends PageBase {
  constructor() {
    super();
    this.title = 'Array';
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h4>${this.title}</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems() {
    const length = 60;
    const lengthFill = 30;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.length = lengthFill;
    this.items = arr;
    getUniqueRandomArray(lengthFill, 1000).forEach(value => {
      arr[this.getIndexLinearProbe(value)].setValue(value);
    });
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red'})
    ];
  }

  hashFn(value) {
    return value % this.items.length;
  }

  getIndexLinearProbe(value) {
    let index = this.hashFn(value);
    while (this.items[index].value != null) {
      index++;
      if (index === this.items.length) index = 0;
    }
    return index;
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
      this.items[this.getIndexLinearProbe(value)].setValue(value);
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
    let counter = 1;
    this.markers[0].position = index;
    while (this.items[index].value != null) {
      yield `Cell ${index} occupied; going to next cell`;
      index++;
      if (index === this.items.length) {
        index = 0;
      }
      this.markers[0].position = index;
      yield `Searching for unoccupied cell; step was ${counter++}`;
    }
    this.items[index].setValue(key);
    yield `Inserted item with key ${key} at index ${index}`;
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
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    let index = this.hashFn(key);
    let foundAt;
    this.markers[0].position = index;
    yield `Looking for item with key ${key} at index ${index}`;
    if (this.items[index].value === key) {
      foundAt = index;
    } else if (this.items[index].value != null) {
      yield 'No match; will start probe';


      //TODO: move to separated iterator iteratorLinearProbe
      //and use it in delete iterator
      let counter = 1;
      while (foundAt == null) {
        index++;
        if (index === this.items.length) {
          index = 0;
        }
        if (this.items[index].value == null  || counter === this.items.length) {
          break;
        }
        this.markers[0].position = index;
        if (this.items[index].value === key) {
          foundAt = index;
        } else {
          yield `Checking next cell; step was ${counter++}`;
        }
      }


    }
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
    let foundAt;
    let deletedCount = 0;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key) {
        foundAt = i;
        deletedCount++;
        this.items[i].clear();
        yield `Have found and deleted ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) isAdditional = true;
      } else if (deletedCount > 0) {
        yield `Will shift item ${deletedCount} spaces`;
        this.items[i - deletedCount].moveFrom(this.items[i]);
      } else {
        yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
      }
    }
    this.length -= deletedCount;
    this.markers[0].position = 0;
    if (deletedCount > 0) {
      return `Shift${deletedCount > 1 ? 's' : ''} complete; no ${isAdditional ? 'more' : ''} items to delete`;
    } else {
      return `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
    }
  }
}

customElements.define('page-hash-table', PageHashTable);