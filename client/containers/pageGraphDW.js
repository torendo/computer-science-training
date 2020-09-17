import {html} from 'lit-element';
import {PageGraphN} from './pageGraphN';
import {Edge} from '../classes/edge';
import '../components/button';
import '../components/console';
import '../components/info';
import '../components/itemsGraph';
import '../components/itemsTable';

export class PageGraphDW extends PageGraphN {

  render() {
    return html`
      <h1>Directed, Weighted Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPath)}>Path</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
        <x-info>
          <p><b>Double-click</b> to create new vertex</p>
          <p><b>Drag</b> from vertex to vertex to create edge</p>
          <p><b>Drag + Ctrl</b> moves vertex</p>
          <p><b>New</b> clears an old graph</p>
          <p><b>Path</b> finds all Shortest Paths from a vertex</p>
          <p><b>View</b> toggles between graph and adjacency matrix</p>
        </x-info>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—" allowHtml></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.markedConnections}
        .clickFn=${this.clickFn}
        directed
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

  setStats(shortestPath) {
    this.statConsole.setMessage(html`
      <table>
        <tr>
          ${shortestPath.map(edge => html`<th class=${edge.dest.isInTree ? 'marked' : ''}>${edge.dest.value}</th>`)}
        </tr>
        <tr>
          ${shortestPath.map(edge => html`<td>${edge.weight.toString().slice(0, 3)}(${edge.src.value})</td>`)}
        </tr>
      </table>
    `);
  }

  * adjustShortestPath(shortestPath, startItem, lastEdge) {
    const lastItem = lastEdge.dest;
    const startToLastWeight = lastEdge.weight;
    let i = 0;
    while (true) {
      if (i >= shortestPath.length) break;
      if (shortestPath[i].dest.isInTree) {
        i++;
        continue;
      }

      const startToCurWeight = shortestPath[i].weight;
      const curItem = shortestPath[i].dest;
      yield `Will compare distances for column ${curItem.value}`;

      const lastToCurWeight = this.connections[lastItem.index][curItem.index];
      const isNeedToReplace = (startToLastWeight + lastToCurWeight) < startToCurWeight;
      yield `To ${curItem.value}: ${startItem.value} to ${lastItem.value} (${startToLastWeight.toString().slice(0, 3)})
        plus edge ${lastItem.value}${curItem.value}(${lastToCurWeight.toString().slice(0, 3)})
        ${isNeedToReplace ? 'less than' : 'greater than or equal to'} ${startItem.value} to ${curItem.value} (${startToCurWeight.toString().slice(0, 3)})`;

      if (isNeedToReplace) {
        shortestPath[i].src = lastItem;
        shortestPath[i].weight = startToLastWeight + lastToCurWeight;
        this.setStats(shortestPath);
        yield `Updated array column ${curItem.value}`;
      } else {
        yield `No need to update array column ${curItem.value}`;
      }

      if (i < shortestPath.length) {
        yield 'Will examine next non-tree column';
        i++;
      } else {
        break;
      }
    }
    yield 'Done all entries in shortest-path array';
  }

  //minimal spanning tree (MST)
  * iteratorPath() {
    let startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    yield `Starting from vertex ${startItem.value}`;

    startItem.mark = true;
    startItem.isInTree = true;
    yield `Added vertex ${startItem.value} to tree`;

    this.markedConnections = this.connections.map(() => new Array(this.connections.length).fill(this.graph.getNoConnectionValue()));

    const shortestPath = this.connections[startItem.index].map((weight, index) => {
      return new Edge({src: startItem, dest: this.items[index], weight});
    });
    this.setStats(shortestPath);
    yield `Copied row ${startItem.value} from adjacency matrix to shortest path array`;

    let counter = 1;
    while(counter < this.items.length) {
      counter++;

      const minPathEdge = shortestPath.reduce((min, cur) => {
        return (min && min.weight < cur.weight || cur.dest.isInTree) ? min : cur;
      });

      if (!minPathEdge || minPathEdge.weight === Infinity) {
        yield 'One or more vertices are UNREACHABLE';
        break;
      }

      yield `Minimum distance from ${startItem.value} is ${minPathEdge.weight}, to vertex ${minPathEdge.dest.value}`;

      minPathEdge.dest.mark = true;
      minPathEdge.dest.isInTree = true;
      this.markedConnections[minPathEdge.src.index][minPathEdge.dest.index] = this.connections[minPathEdge.src.index][minPathEdge.dest.index];
      this.setStats(shortestPath);
      yield `Added vertex ${minPathEdge.dest.value} to tree`;

      yield 'Will adjust values in shortest-path array';
      yield* this.adjustShortestPath(shortestPath, startItem, minPathEdge);

    }
    yield `All shortest paths from ${startItem.value} found. Distances in array`;
    yield 'Press again to reset paths';
    this.items.forEach(item => {
      delete item.isInTree;
      item.mark = false;
    });
    this.markedConnections = [];
    this.statConsole.setMessage();
  }
}

customElements.define('page-graph-dw', PageGraphDW);