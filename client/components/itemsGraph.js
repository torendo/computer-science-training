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
      marker: {type: Object},
      clickFn: {type: Function}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.dragPositions = null;
  }

  render() {
    const items = this.items.map(item => svg`
      <g fill="${item.color}">
        ${this.drawConnectionLines(item)}
        <g
          @click=${this.clickHandler.bind(this, item)}"
          @mousedown="${(e) => this.dragstartHandler(e, item)}"
          @mouseup="${(e) => this.dragendHandler(e, item)}"
        >
          <circle class="item ${item.mark ? 'marked' : ''}" cx="${item.x}" cy="${item.y}" r="12"></circle>
          <text class="value" x="${item.x}" y="${item.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
        </g>
      </g>
    `);
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
        @dblclick=${this.dblclickHandler}
        @mousedown="${(e) => e.preventDefault()}"
        @mousemove="${this.dragHandler}"
      >
        ${this.dragPositions != null ? svg`
          <line class="line" x1="${this.dragPositions.dragItem.x}" y1="${this.dragPositions.dragItem.y}" x2="${this.dragPositions.x}" y2="${this.dragPositions.y}">
        ` : ''}
        ${items}
      </svg>
    `;
  }


  drawConnectionLines(item) {
    return svg`
    
    `;
  }

  dblclickHandler(e) {
    if (this.dragPositions != null) return;
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
    this.dragPositions = {
      initialX: e.clientX,
      initialY: e.clientY,
      dragItem: item
    };
  }

  dragHandler(e) {
    if (this.dragPositions == null) return;
    this.dragPositions.x = e.offsetX;
    this.dragPositions.y = e.offsetY;
    this.requestUpdate();
  }

  dragendHandler(e, item) {
    this.dragPositions = null;
    this.requestUpdate();
  }

  clickHandler(item) {
    if (this.clickFn != null) {

      //l

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
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .line {
    stroke: black;
  }
  .marker line {
    stroke: red;
    stroke-width: 2px;
  }
`;

customElements.define('x-items-graph', XItemsGraph);