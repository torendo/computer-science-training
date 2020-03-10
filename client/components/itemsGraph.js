import {LitElement, svg, css} from 'lit-element';
import {Vertex} from '../classes/vertex';

export class XItemsGraph extends LitElement {
  static get properties() {
    return {
      limit: {type: Number},
      items: {type: Array},
      connections: {type: Array},
      markedConnections: {type: Array},
      clickFn: {type: Function}
    };
  }

  render() {
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
        @dblclick=${this.dblclickHandler}
        @mousedown=${(e) => e.preventDefault()}
        @mouseup=${this.dragendHandler}
        @mousemove=${this.dragHandler}
      >
        ${this.dragOpts != null && this.dragOpts.isConnection ? svg`
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}">
        ` : ''}
        ${this.drawConnections(false)}
        ${this.drawConnections(true)}
        ${this.drawItems()}
      </svg>
    `;
  }

  drawItems() {
    return this.items.map(item => svg`
      <g fill="${item.color}">
        <g
          class="itemGroup ${this.clickFn != null ? 'clickable' : ''}"
          @click=${this.clickHandler.bind(this, item)}
          @mousedown=${(e) => this.dragstartHandler(e, item)}
          @mouseup=${(e) => this.dragendHandler(e, item)}
          @mousemove=${this.itemHoverHandler}
          @mouseleave=${this.itemLeaveHandler}
        >
          <circle class="item ${item.mark ? 'marked' : ''}" cx="${item.x}" cy="${item.y}" r="12"></circle>
          <text class="value ${item.mark ? 'marked' : ''}" x="${item.x}" y="${item.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
        </g>
      </g>
    `);
  }

  drawConnections(isMarked) {
    const lines = [];
    const connections = isMarked ? this.markedConnections : this.connections;
    connections.forEach((row, i) => {
      for (let j = 0; j < row.length; j++) {
        if (row[j] !== 0) {
          lines.push(svg`
            <line
              class="line ${isMarked ? 'marked' : ''}"
              x1="${this.items[i].x}"
              y1="${this.items[i].y}"
              x2="${this.items[j].x}"
              y2="${this.items[j].y}"
            >
          `);
        }
      }
    });
    return lines;
  }

  dblclickHandler(e) {
    if (this.dragOpts != null || this.limit === this.items.length) return;
    const index = this.items.length;
    const item = new Vertex({
      index,
      x: e.offsetX,
      y: e.offsetY
    });
    item.setValue(String.fromCharCode(65 + index));
    this.items.push(item);

    this.connections.push(new Array(this.connections.length).fill(0));
    this.connections.forEach(c => c.push(0));

    this.dispatchEvent(new Event('changed'));
    this.requestUpdate();
  }

  dragstartHandler(e, item) {
    this.dragOpts = {
      initialX: e.clientX,
      initialY: e.clientY,
      dragItem: item,
      isConnection: !e.ctrlKey
    };
  }

  dragHandler(e) {
    if (this.dragOpts == null) return;
    if (this.dragOpts.isConnection) {
      this.dragOpts.x = e.offsetX;
      this.dragOpts.y = e.offsetY;
    } else {
      this.dragOpts.dragItem.x = e.offsetX;
      this.dragOpts.dragItem.y = e.offsetY;
    }
    this.requestUpdate();
  }

  dragendHandler(e, item) {
    if (this.dragOpts == null) return;
    if (this.dragOpts && item && item !== this.dragOpts.dragItem && this.dragOpts.isConnection) {
      const dragItem = this.dragOpts.dragItem;

      this.connections[dragItem.index][item.index] = 1;
      this.connections[item.index][dragItem.index] = 1;

    }
    this.dragOpts = null;
    this.dispatchEvent(new Event('changed'));
    this.requestUpdate();
  }

  clickHandler(item) {
    if (this.clickFn != null) {
      return this.clickFn(item);
    }
  }

  itemHoverHandler(e) {
    if (e.ctrlKey) {
      e.currentTarget.classList.add('draggable');
    } else {
      e.currentTarget.classList.remove('draggable');
    }
  }
  itemLeaveHandler(e) {
    e.target.classList.remove('draggable');
  }
}

XItemsGraph.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    border: 1px gray solid;
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .itemGroup {
    cursor: pointer;
  }
  .item {
    stroke: black;
  }
  .item.marked {
    stroke: red;
    stroke-width: 2px;
  }
  .clickable {
    stroke-width: 2px;
  }
  .draggable {
    cursor: grab;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .value.marked {
    fill: red;
  }
  .line {
    stroke: black;
  }
  .line.marked {
    stroke-width: 3px;
  }
`;

customElements.define('x-items-graph', XItemsGraph);