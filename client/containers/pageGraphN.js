import {PageBase} from './pageBase';
import {html} from 'lit-element';

export class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.connections = new Map();
    this.markEdges = false;
    this.renewConfirmed = false;
    this.clickFn = null;
  }
  render() {
    return html`
      <h4>Non-Directed Non-Weighted Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDFS)}>DFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorBFS)}>BFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTree)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markEdges=${this.markEdges}
        .clickFn=${this.clickFn}
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
    let startItem;
    this.clickFn = item => {
      startItem = item;
      this.iterate();
    };
    yield 'Single-click on vertex from which to start search';
    this.clickFn = null;
    yield `You clicked on ${startItem.value}`;

    this.statConsole.setMessage('Visits: A. Stack: (b->t): A') ; //TODO: setting stats as a method
    startItem.mark = true;
    yield `Start search from vertex ${startItem.value}`;

    //TODO: cycle

    this.items.forEach(item => item.mark = false);
    this.statConsole.setMessage();
  }

  * iteratorBFS() {

  }

  * iteratorTree() {

  }
}

customElements.define('page-graph-n', PageGraphN);