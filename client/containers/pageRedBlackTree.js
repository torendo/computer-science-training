import {PageBase} from './pageBase';
import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';

export class PageRedBlackTree extends PageBase {
  constructor() {
    super();
    this.init();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.init)}>Start</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="trav-console" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${(e) => {console.log(e)}}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.travConsole = this.querySelector('.trav-console');
    this.dialog = this.querySelector('x-dialog');
  }

  init() {
    const value = (new Item({index: 0})).setValue(Math.floor(Math.random() * 100));
    this.items = [value];
    this.marker = new Marker({position: 0});
  }

}

customElements.define('page-redblack-tree', PageRedBlackTree);