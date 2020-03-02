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

  * iteratorStartSearch() {
    let startItem;
    this.clickFn = item => {
      startItem = item;
      this.iterate();
    };
    yield 'Single-click on vertex from which to start search';
    this.clickFn = null;
    if (startItem == null) {
      return 'ERROR: Item\'s not clicked.';
    }
    yield `You clicked on ${startItem.value}`;
    return startItem;
  }

  * iteratorClear() {
    yield 'Press again to reset search';
    this.items.forEach(item => item.mark = false);
    this.statConsole.setMessage();
  }

  //Depth-first search
  * iteratorDFS() {
    const startItem = yield* this.iteratorStartSearch();
    const visits = [startItem];
    const stack = [startItem];
    startItem.mark = true;
    this.setStats(visits, stack);
    yield `Start search from vertex ${startItem.value}`;

    while (stack.length > 0) {
      const item = this.getAdjUnvisitedVertex(stack[stack.length - 1]);
      if (item == null) {
        stack.pop();
        this.setStats(visits, stack);
        if (stack.length > 0) {
          yield `Will check vertices adjacent to ${stack[stack.length - 1].value}`;
        } else {
          yield 'No more vertices with unvisited neighbors';
        }
      } else {
        stack.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, stack);
        yield `Visited vertex ${item.value}`;
      }
    }
    yield* this.iteratorClear();
  }

  getAdjUnvisitedVertex(item) {
    const connectedItems = this.connections.get(item);
    let found = null;
    if (connectedItems.size > 0) {
      found = this.items.find(item => {
        return connectedItems.has(item) && !item.mark;
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

  //Breadth-first search
  * iteratorBFS() {
    const startItem = yield* this.iteratorStartSearch();
    const visits = [startItem];
    const queue = [startItem];
    startItem.mark = true;
    this.setStats(visits, null, queue);
    yield `Start search from vertex ${startItem.value}`;

    while (queue.length > 0) {
      const item = this.getAdjUnvisitedVertex(queue[queue.length - 1]);
      //TODO: ...

      if (item == null) {
        queue.pop();
        this.setStats(visits, null, queue);
        if (queue.length > 0) {
          yield `Will check vertices adjacent to ${queue[queue.length - 1].value}`;
        } else {
          yield 'No more vertices with unvisited neighbors';
        }
      } else {
        queue.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, null, queue);
        yield `Visited vertex ${item.value}`;
      }
    }
    yield* this.iteratorClear();
  }

  * iteratorTree() {

  }
}

customElements.define('page-graph-n', PageGraphN);