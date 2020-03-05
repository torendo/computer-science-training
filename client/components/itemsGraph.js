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
      limit: {type: Number},
      items: {type: Array},
      connections: {type: Map},
      markedConnections: {type: Map},
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
        ${this.drawConnections()}
        ${this.drawMarkedConnections()}
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

  drawConnections() {
    const lines = [];
    this.connections.forEach((connections, item) => {
      for (let connection of connections) {
        lines.push(svg`
          <line class="line" x1="${item.x}" y1="${item.y}" x2="${connection.x}" y2="${connection.y}">
        `);
      }
    });
    return lines;
  }

  drawMarkedConnections() {
    const lines = [];
    this.markedConnections.forEach((connections, item) => {
      for (let connection of connections) {
        lines.push(svg`
          <line class="line marked" x1="${item.x}" y1="${item.y}" x2="${connection.x}" y2="${connection.y}">
        `);
      }
    });
    return lines;
  }

  dblclickHandler(e) {
    if (this.dragOpts != null || this.limit === this.items.length) return;
    const index = this.items.length;
    const item = new PlacedItem({
      index,
      x: e.offsetX,
      y: e.offsetY
    });
    item.setValue(String.fromCharCode(65 + index));
    this.items.push(item);
    this.connections.set(item, new Set());
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
      this.connections.get(dragItem).add(item);
      this.connections.get(item).add(dragItem);
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