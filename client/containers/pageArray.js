import {html} from 'lit-element';
import {getUniqueRandomNumber} from '../utils';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';

export class PageArray extends PageBase {
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
      <label><input class="dups" type="checkbox" checked disabled>Dups OK</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.dups = this.querySelector('.dups');
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(Math.floor(Math.random() * 1000));
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [new Marker({position: 0})];
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
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
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
    for (let i = 0; i < length; i++) {
      if (this.dups.checked) {
        this.items[i].setValue(Math.floor(Math.random() * 1000));
      } else {
        this.items[i].setValue(getUniqueRandomNumber(this.items, 1000));
      }
    }
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
    if (!this.dups.checked) {
      const found =  this.items.find(i => i.value === key);
      if (found) yield `ERROR: you already have item with key ${key} at index ${found.index}`;
    }
    yield `Will insert item with key ${key}`;
    this.items[this.length].setValue(key);
    this.markers[0].position = this.length;
    yield `Inserted item with key ${key} at index ${this.length}`;
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
    yield `Looking for item with key ${key}`;
    let foundAt;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key) {
        foundAt = i;
        yield `Have found ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) {
          isAdditional = true;
          foundAt = null;
        } else {
          break;
        }
      }
      if (i !== this.length - 1) {
        yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
      }
    }
    if (foundAt == null) {
      yield `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
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

customElements.define('page-array', PageArray);