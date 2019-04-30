import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';

export class PageLinkList extends PageBase {
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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Push</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Pop</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Peek</x-button>
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
      if (i < lengthFill) item.setData(Math.floor(Math.random() * 1000));
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

  }
}

customElements.define('page-link-list', PageLinkList);