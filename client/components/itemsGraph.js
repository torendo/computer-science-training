import {LitElement, svg, css} from 'lit-element';
import {Item} from '../classes/item';

class PlacedItem extends Item {
  constructor(options) {
    super(options);
    this.x = options.x;
    this.y = options.y;
  }
}

export class XItemsGraph extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Array},
      clickFn: {type: Function},
      markEdges: {type: Boolean}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.connections = new Map();
    this.dragOpts = null;
  }

  render() {
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
        @dblclick=${this.dblclickHandler}
        @mousedown="${(e) => e.preventDefault()}"
        @mouseup="${this.dragendHandler}"
        @mousemove="${this.dragHandler}"
      >
        ${this.dragOpts != null ? svg`
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}">
        ` : ''}
        ${this.drawConnections()}
        ${this.drawItems()}
      </svg>
    `;
  }

  drawItems() {
    return this.items.map(item => svg`
      <g fill="${item.color}">
        <g
          class="clickable"
          @click=${this.clickHandler.bind(this, item)}"
          @mousedown="${(e) => this.dragstartHandler(e, item)}"
          @mouseup="${(e) => this.dragendHandler(e, item)}"
        >
          <circle class="item ${item.mark ? 'marked' : ''}" cx="${item.x}" cy="${item.y}" r="12"></circle>
          <text class="value" x="${item.x}" y="${item.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
        </g>
      </g>
    `);
  }

  drawConnections() {
    const lines = [];
    this.connections.forEach((connections, item) => {
      for (let connection of connections) {
        const markLine = this.markEdges && connection.mark && item.mark;
        lines.push(svg`
          <line class="line ${markLine ? 'marked' : ''}" x1="${item.x}" y1="${item.y}" x2="${connection.x}" y2="${connection.y}">
        `);
      }
    });
    return lines;
  }

  dblclickHandler(e) {
    if (this.dragOpts != null) return;
    const index = this.items.length;
    const item = new PlacedItem({
      index,
      x: e.offsetX,
      y: e.offsetY
    });
    item.setValue(String.fromCharCode(65 + index));
    this.items = [...this.items, item];
  }

  dragstartHandler(e, item) {
    this.dragOpts = {
      initialX: e.clientX,
      initialY: e.clientY,
      dragItem: item
    };
  }

  dragHandler(e) {
    if (this.dragOpts == null) return;
    this.dragOpts.x = e.offsetX;
    this.dragOpts.y = e.offsetY;
    this.requestUpdate();
  }

  dragendHandler(e, item) {
    if (this.dragOpts && item && item !== this.dragOpts.dragItem) {
      const dragItem = this.dragOpts.dragItem;
      if (this.connections.has(dragItem)) {
        this.connections.get(dragItem).add(item);
      } else {
        const value = new Set();
        value.add(item);
        this.connections.set(dragItem, value);
      }
    }
    this.dragOpts = null;
    this.requestUpdate();
  }

  clickHandler(item) {
    if (this.clickFn != null) {
      return this.clickFn(item);
    }
  }
}

XItemsGraph.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;    
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .item {
    stroke: black;
  }
  .item.marked {
    stroke: red;
    stroke-width: 2px;
  }
  .clickable {
    cursor: pointer;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .line {
    stroke: black;
  }
  .line.marked {
    stroke-width: 2px;
  }
`;

customElements.define('x-items-graph', XItemsGraph);