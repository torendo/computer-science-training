import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import '../components/button';
import '../components/console';
import '../components/dialog';
import '../components/itemsHorizontal';

export class PageStack extends PageBase {
  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Stack</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPush)}>Push</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPop)}>Pop</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
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
    const length = 10;
    const lengthFill = 4;
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
    this.markers = [
      new Marker({position: 3, size: 1, color: 'red', text: 'top'})
    ];
  }

  * iteratorNew() {
    yield 'Will create new empty stack';
    const length = 10;
    this.items = [];
    for (let i = 0; i < length; i++) {
      this.items.push(new Item({index: i}));
    }
    this.length = 0;
    this.markers[0].position = -1;
  }

  * iteratorPush() {
    if (this.length === this.items.length) {
      return 'ERROR: can\'t push. Stack is full';
    }
    let key = 0;
    yield 'Enter key of item to push';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t push. Need key between 0 and 999';
    }
    yield `Will push item with key ${key}`;
    this.markers[0].position++;
    yield 'Incremented top';
    this.items[this.length].setValue(key);
    this.length++;
    return `Inserted item with key ${key}`;
  }

  * iteratorPop() {
    if (this.length === 0) {
      return 'ERROR: can\'t pop. Stack is empty';
    }
    yield 'Will pop item from top of stack';
    const item = this.items[this.length - 1];
    const value = item.value;
    item.clear();
    yield `Item removed; Returned value is ${value}`;
    this.markers[0].position--;
    this.length--;
    return 'Decremented top';
  }

  * iteratorPeek() {
    if (this.length === 0) {
      return 'ERROR: can\'t peek. Stack is empty';
    }
    yield 'Will peek at item at top of stack';
    return `Returned value is ${this.items[this.length - 1].value}`;
  }
}

customElements.define('page-stack', PageStack);