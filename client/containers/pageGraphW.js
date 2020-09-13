import {html} from 'lit-element';
import {PageGraphN} from './pageGraphN';
import {Edge} from '../classes/edge';
import '../components/button';
import '../components/console';
import '../components/itemsGraph';
import '../components/itemsTable';

export class PageGraphW extends PageGraphN {

  render() {
    return html`
      <h4>Weighted, Undirected Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
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
        weighted
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

  setStats(tree, pq) {
    this.statConsole.setMessage(`Tree: ${tree.map(i => i.value).join(' ')}. PQ: ${pq.map(i => i.title).join(' ')}`);
  }

  //minimal spanning tree (MST)
  * iteratorDFS() {
    let currentItem = yield* this.iteratorStartSearch();
    yield `Starting tree from vertex ${currentItem.value}`;
    if (currentItem == null) return;
    const tree = [];
    const pq = [];
    let countItems = 0;
    while(true) {
      tree.push(currentItem);
      this.setStats(tree, pq);
      currentItem.mark = true;
      currentItem.isInTree = true;
      countItems++;
      yield `Placed vertex ${currentItem.value} in tree`;

      if (countItems === this.items.length) break;

      //insertion in PQ vertices, adjacent current
      this.items.forEach(item => {
        const weight = this.connections[currentItem.index][item.index];
        if (item !== currentItem && !item.isInTree && typeof weight === 'number') {
          this.putInPQ(pq, currentItem, item, weight);
        }
      });

      this.setStats(tree, pq);
      yield `Placed vertices adjacent to ${currentItem.value} in priority queue`;

      if (pq.length === 0) {
        yield 'Graph not connected';
        this.reset();
        return;
      }

      //removing min edge from pq
      const edge = pq.pop();
      currentItem = edge.dest;
      yield `Removed minimum-distance edge ${edge.title} from priority queue`;
      this.markedConnections[edge.src.index][edge.dest.index] = edge.weight;
    }
    this.items.forEach(item => delete item.isInTree);
  }

  putInPQ(pq, currentItem, item, weight) {
    const index = pq.findIndex(edge => edge.dest === item);
    let shouldAdd = false;
    if (index === -1) {
      shouldAdd = true;
    } else if (pq[index].weight > weight) {
      pq.splice(index, 1);
      shouldAdd = true;
    }
    if (shouldAdd) {
      const indexPriority = pq.findIndex(edge => edge.weight < weight);
      pq.splice(indexPriority < 0 ? pq.length : indexPriority, 0, new Edge({src: currentItem, dest: item, weight}));
    }
  }
}

customElements.define('page-graph-w', PageGraphW);