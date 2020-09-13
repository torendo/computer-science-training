import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import {getUniqueRandomArray} from '../utils';
import '../components/button';
import '../components/console';
import '../components/dialog';
import '../components/itemsHorizontalLinked';

export class PageLinkList extends PageBase {
  constructor() {
    super();
    this.initItems(13);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
      </div>
      <x-console></x-console>
      <x-items-horizontal-linked .items=${this.items} .marker=${this.marker}></x-items-horizontal-linked>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input class="sorted" type="checkbox" disabled>Sorted</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.sorted = this.querySelector('.sorted');
  }

  initItems(length, sorted) {
    const arrValues = getUniqueRandomArray(length, 1000);
    if (sorted) arrValues.sort((a, b) => a - b);
    this.items = arrValues.map(value => (new Item({})).setValue(value));
  }

  initMarkers() {
    this.marker = new Marker({position: 0});
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of linked list to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 56 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create list with ${length} links`;
    this.sorted.disabled = false;
    yield 'Select: Sorted or not';
    this.sorted.disabled = true;
    this.initItems(length, this.sorted.checked);
  }

  * search(key, isInsertion) {
    for (let i = 0; i < this.items.length; i++) {
      this.marker.position = i;
      if (this.items[i].value === key || isInsertion && this.items[i].value > key) {
        return i;
      }
      if (i !== this.length - 1) {
        yield `Searching for ${isInsertion ? 'insertion point' : `item with key ${key}`}`;
      }
    }
  }

  * iteratorIns() {
    if (this.items.length === 56) {
      return 'ERROR: can\'t insert, list is full';
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
    const item = (new Item({mark: true})).setValue(key);
    let foundAt = 0;
    if (this.sorted.checked) {
      yield 'Will search insertion point';
      foundAt = yield* this.search(key, true);
      yield 'Have found insertion point';
      if (foundAt != null) {
        const part = this.items.splice(foundAt, this.items.length - foundAt, item);
        this.items = this.items.concat(part);
      } else {
        this.items.push(item);
      }
    } else {
      yield `Will insert item with key ${key}`;
      this.items.unshift(item);
    }
    this.marker.position = -1;
    yield 'Item inserted. Will redraw the list';
    item.mark = false;
    this.marker.position = foundAt;
    yield `Inserted item with key ${key}`;
    this.marker.position = 0;
    return `Insertion completed. Total items = ${this.items.length}`;
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
    let foundAt = yield* this.search(key);
    this.marker.position = 0;
    return `${foundAt == null ? 'No' : 'Have found'} items with key ${key}`;
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
    let foundAt = yield* this.search(key);
    if (foundAt == null) {
      this.marker.position = 0;
      return `No items with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
      this.items[foundAt].clear();
      yield 'Deleted item. Will redraw the list';
      this.items.splice(foundAt, 1);
      this.marker.position = 0;
      return `Deleted item with key ${key}. Total items = ${this.items.length}`;
    }
  }
}

customElements.define('page-link-list', PageLinkList);