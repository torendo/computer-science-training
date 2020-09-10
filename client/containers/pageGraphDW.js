import {html} from 'lit-element';
import {PageGraphN} from './pageGraphN';
import {Edge} from '../classes/edge';

export class PageGraphDW extends PageGraphN {

  render() {
    return html`
      <h4>Directed, Weighted Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPath)}>Path</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
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
      <table class="shortestPathTable">
        <tr>
          ${shortestPath.map(edge => html`<th class=${edge.dest.isInTree ? 'marked' : ''}>${edge.dest.value}</th>`)}
        </tr>
        <tr>
          ${shortestPath.map(edge => html`<td>${edge.titleFrom}</td>`)}
        </tr>
      </table>
    `);
  }

  * adjustShortestPath(shortestPath, lastEdge) {
    for (let i = 0; i < shortestPath.length; i++) {
      if (shortestPath[i].dest.isInTree) continue;
      yield `Will compare distances for column ${shortestPath[i].dest.value}`;
      const destV = shortestPath[i].dest.value;
      yield `To ${destV}: `; //todo : ...
    }
  }

  //minimal spanning tree (MST)
  * iteratorPath() {
    let startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    yield `Starting from vertex ${startItem.value}`;

    startItem.mark = true;
    startItem.isInTree = true;
    yield `Added vertex ${startItem.value} to tree`;

    const shortestPath = this.connections[startItem.index].map((weight, index) => {
      return new Edge({weight, src: startItem, dest: this.items[index]});
    });
    this.setStats(shortestPath);
    yield `Copied row ${startItem.value} from adjacency matrix to shortest path array`;

    let counter = 0;
    while(counter < this.items.length) {

      const minPathEdge = shortestPath.reduce((min, cur) => {
        return (min && min.weight < cur.weight) ? min : cur;
      });

      if (!minPathEdge) {
        //todo: say something
        break;
      }
      counter++;

      yield `Minimum distance from ${minPathEdge.src.value} is ${minPathEdge.weight}, to vertex ${minPathEdge.dest.value}`;

      minPathEdge.dest.mark = true;
      minPathEdge.dest.isInTree = true;
      this.markedConnections[minPathEdge.src.index][minPathEdge.dest.index] = minPathEdge.weight;
      yield `Added vertex ${minPathEdge.dest.value} to tree`;

      yield 'Will adjust values in shortest-path array';
      yield* this.adjustShortestPath(shortestPath, minPathEdge);

    }
    yield `All shortest paths from ${startItem.value} found. Distances in array`;
    yield 'Press again to reset paths';
    this.items.forEach(item => {
      delete item.isInTree;
      item.mark = false;
    });
    this.markedConnections = [];
  }
}

customElements.define('page-graph-dw', PageGraphDW);