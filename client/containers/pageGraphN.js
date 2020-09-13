import {PageBase} from './pageBase';
import {html} from 'lit-element';
import '../components/button';
import '../components/console';
import '../components/itemsGraph';
import '../components/itemsTable';

export class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.markedConnections = [];
    this.connections = [];
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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorMST)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.markedConnections}
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

  reset() {
    this.items.forEach(item => item.mark = false);
    this.statConsole.setMessage();
  }

  * iteratorStartSearch() {
    let startItem;
    this.clickFn = item => {
      startItem = item;
      this.iterate();
    };
    yield 'Single-click on vertex from which to start';
    this.clickFn = null;
    if (startItem == null) {
      return 'ERROR: Item\'s not clicked.';
    }
    yield `You clicked on ${startItem.value}`;
    return startItem;
  }

  //DFS - Depth-first search
  * iteratorDFS(isTree) {
    const startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    const visits = [startItem];
    const stack = [startItem];
    startItem.mark = true;
    this.setStats(visits, stack);
    yield `Start search from vertex ${startItem.value}`;

    while (stack.length > 0) {
      const prevItem = stack[stack.length - 1];
      const item = this.getAdjUnvisitedVertex(prevItem);
      if (item == null) {
        stack.pop();
        this.setStats(visits, stack);
        if (stack.length > 0) {
          yield `Will check vertices adjacent to ${stack[stack.length - 1].value}`;
        } else {
          yield 'No more vertices with unvisited neighbors';
        }
      } else {
        if (stack.length > 0 && isTree === true) {
          this.markedConnections[prevItem.index][item.index] = 1;
          this.markedConnections[item.index][prevItem.index] = 1;
        }
        stack.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, stack);
        yield `Visited vertex ${item.value}`;
      }
    }
    if (isTree !== true) {
      yield 'Press again to reset search';
      this.reset();
    }
  }

  getAdjUnvisitedVertex(item) {
    const connectedItems = this.connections[item.index];
    let found = null;
    if (connectedItems.length > 0) {
      found = this.items.find(item => {
        return !item.mark && connectedItems[item.index] === 1;
      });
    }
    return found;
  }

  setStats(visits, stack, queue) {
    if (stack)
      this.statConsole.setMessage(`Visits: ${visits.map(i => i.value).join(' ')}. Stack: (b->t): ${stack.map(i => i.value).join(' ')}`);
    if (queue)
      this.statConsole.setMessage(`Visits: ${visits.map(i => i.value).join(' ')}. Queue: (f->r): ${queue.map(i => i.value).join(' ')}`);
  }

  //BFS - Breadth-first search
  * iteratorBFS() {
    const startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    const visits = [startItem];
    const queue = [startItem];
    startItem.mark = true;
    this.setStats(visits, null, queue);
    yield `Start search from vertex ${startItem.value}`;

    let currentItem = queue.shift();
    this.setStats(visits, null, queue);
    yield `Will check vertices adjacent to ${startItem.value}`;

    while (currentItem != null) {
      const item = this.getAdjUnvisitedVertex(currentItem);
      if (item == null) {
        yield `No more unvisited vertices adjacent to ${currentItem.value}`;
        currentItem = queue.shift();
        if (currentItem != null) {
          this.setStats(visits, null, queue);
          yield `Will check vertices adjacent to ${currentItem.value}`;
        }
      } else {
        queue.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, null, queue);
        yield `Visited vertex ${item.value}`;
      }
    }
    yield 'Press again to reset search';
    this.reset();
  }

  //MST - Minimum Spanning Tree
  * iteratorMST() {
    this.markedConnections = this.connections.map(() => new Array(this.connections.length).fill(this.graph.getNoConnectionValue()));
    yield* this.iteratorDFS(true);
    yield 'Press again to hide unmarked edges';
    const connections = this.connections;
    this.connections = this.markedConnections;
    this.markedConnections = [];
    yield 'Minimum spanning tree; Press again to reset tree';
    this.connections = connections;
    this.reset();
  }
}

customElements.define('page-graph-n', PageGraphN);