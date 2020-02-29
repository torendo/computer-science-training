import {PageBase} from './pageBase';
import {html} from 'lit-element';

export class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.connections = new Map();
    this.markEdges = false;
    this.renewConfirmed = false;
  }
  render() {
    return html`
      <h4>Heap</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDFS)}>DFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorBFS)}>BFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTree)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markEdges=${this.markEdges}
        .clickFn=${item => this.marker.position = item.index}
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.table = this.querySelector('x-items-table');
    this.graph = this.querySelector('x-items-graph');
  }

  changedHandler() {
    this.table.requestUpdate();
  }

  toggleView() {
    this.table.toggleAttribute('hidden');
    this.graph.toggleAttribute('hidden');
  }

  newGraph() {
    if (this.renewConfirmed) {
      this.initItems();
      this.connections = new Map();
      this.console.setMessage();
      this.renewConfirmed = false;
    } else {
      this.console.setMessage('ARE YOU SURE? Press again to clear old graph');
      this.renewConfirmed = true;
    }
    this.requestUpdate();
  }

  handleClick() {
    super.handleClick(...arguments);
    this.renewConfirmed = false;
  }

  * iteratorDFS() {

  }

  * iteratorBFS() {

  }

  * iteratorTree() {

  }
}

customElements.define('page-graph-n', PageGraphN);