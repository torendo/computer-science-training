import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';
import {getUniqueRandomArray} from '../utils';

export class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(10);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
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

  initItems(length, sorted) {
    const arr = [];
    const arrValues = getUniqueRandomArray(length, 1000);
    if (sorted) arrValues.sort((a, b) => a - b);
    for (let i = 0; i < length; i++) {
      arr.push((new Item({})).setValue(arrValues[i]));
    }
    this.items = arr;
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
    this.initItems(length, this.sorted.checked);
  }
}

customElements.define('page-binary-tree', PageBinaryTree);