import {PageBase} from './pageBase';
import {html} from 'lit-element';
import {Vertex} from '../classes/vertex';

export class PageGraphD extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.tree = [];
    this.connections = [];
    this.renewConfirmed = false;
    this.clickFn = null;
  }
  render() {
    return html`
      <h4>Directed Non-Weighted Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTopo)}>Topo</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.tree}
        .tree=${this.tree}
        .clickFn=${this.clickFn}
        directed
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
    this.statConsole = this.querySelector('.console-stats');
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
      this.connections = [];
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

  //topological sort
  * iteratorTopo() {
    yield 'Will perform topological sort';
    const connectionsCache = this.connections.map(row => [...row]);
    const itemsCache = this.items.map(item => new Vertex(item));
    const result = [];
    for (let i = 0; i < connectionsCache.length; i++) {
      const curItem = this.getNoSuccessorVertex();
      if (!curItem) {
        yield 'ERROR: Cannot sort graph with cycles';
        return;
      }
      yield `Will remove vertex ${curItem.value}`;
      result.push(curItem.value);
      this.statConsole.setMessage(`List: ${result.join(' ')}`);

      //remove item (vertex) and its connections
      this.connections.splice(curItem.index, 1);
      this.connections.forEach(row => row.splice(curItem.index, 1));
      this.items.splice(curItem.index, 1);
      this.items.forEach((item, i) => item.index = i);

      yield `Added vertex ${curItem.value} at start of sorted list`;
    }
    yield 'Sort is complete. Will restore graph';
    this.connections = connectionsCache;
    this.items = itemsCache;
    yield 'Will reset sort';
    this.statConsole.setMessage();
  }

  getNoSuccessorVertex() {
    const index = this.connections.findIndex(row => row.reduce((acc, i) => acc + i) === 0);
    return index != null ? this.items[index] : false;
  }
}

customElements.define('page-graph-d', PageGraphD);