import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';

export class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(20);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTrav)}>Trav</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems(length) {
    const arr = (new Array(length)).fill().map((_, i) => new Item({index: i}));
    for (let i = 0; i <= length; i++) {
      let i = 0;
      const value = Math.floor(Math.random() * 100);
      while(arr[i] && arr[i].value != null) {
        i = 2 * i + (arr[i].value > value ? 1 : 2);
      }
      if(arr[i]) arr[i].setValue(value);
    }
    this.items = arr;
  }

  initMarkers() {
    this.marker = new Marker({position: 0});
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter size of linked list to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 31 || length < 1) {
      return 'ERROR: use size between 1 and 31';
    }
    yield `Will create list with ${length} links`;
    this.initItems(length);
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
      return 'ERROR: use key between 0 and 99';
    }
    yield `Looking for item with key ${key}`;
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      yield 'Search in progress';
      if (this.items[i].value === key) {
        yield 'Found!';
        break;
      }
      i = 2 * i + (this.items[i].value > key ? 1 : 2);
    }
    this.initMarkers();
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert item with key ${key}`;
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      yield 'Search in progress';
      if (this.items[i].value === key) {
        yield 'Found!';
        break;
      }
      i = 2 * i + (this.items[i].value > key ? 1 : 2);
    }
    this.initMarkers();
  }

  * iteratorTrav() {

  }

  * iteratorDel() {

  }
}

customElements.define('page-binary-tree', PageBinaryTree);