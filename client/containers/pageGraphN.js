import {PageBase} from './pageBase';
import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';

export class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.initMarker();
  }
  render() {
    return html`
      <h4>Heap</h4>
      <div class="controlpanel">
        <x-button .callback=${() => {}}>New</x-button>
        <x-button .callback=${() => {}}>DFS</x-button>
        <x-button .callback=${() => {}}>BFS</x-button>
        <x-button .callback=${() => {}}>Tree</x-button>
        <x-button .callback=${() => {}}>View</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-items-graph .items=${this.items} .marker=${this.marker} .clickFn=${item => this.marker.position = item.index}></x-items-graph>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  initMarker() {
    this.marker = new Marker({position: 0});
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.dialog = this.querySelector('x-dialog');
  }

  * iteratorFill() {

  }
}

customElements.define('page-graph-n', PageGraphN);