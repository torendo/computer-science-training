import {LitElement, svg, html, css} from 'lit-element';
import {Vertex} from '../classes/vertex';
import './dialog';

export class XItemsGraph extends LitElement {
  static get properties() {
    return {
      limit: {type: Number},
      items: {type: Array},
      connections: {type: Array},
      markedConnections: {type: Array},
      clickFn: {type: Function},
      directed: {type: Boolean},
      weighted: {type: Boolean}
    };
  }

  getNoConnectionValue() {
    return this.weighted ? Infinity : 0;
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
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}"></line>
        ` : ''}
        ${this.drawConnections(false)}
        ${this.drawConnections(true)}
        ${this.drawItems()}
      </svg>
      ${html`
        <x-dialog>
          <label>Weight (0—99): <input name="number" type="number" min="0" max="99" step="1"></label>
        </x-dialog>`}
      `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('x-dialog');
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
    if (!connections) return;
    connections.forEach((row, i) => {
      row.forEach((val, j) => {
        if (val !== this.getNoConnectionValue()) {
          lines.push(svg`
            <line
              class="line ${isMarked ? 'marked' : ''}"
              x1="${this.items[i].x}"
              y1="${this.items[i].y}"
              x2="${this.items[j].x}"
              y2="${this.items[j].y}"
            ></line>
            ${this.directed ? this.drawDirectionMarker(this.items[i], this.items[j]) : ''}
            ${this.weighted ? this.drawWeightMarker(this.items[i], this.items[j], val) : ''}
          `);
        }
      });
    });
    return lines;
  }

  drawDirectionMarker(p1, p2) {
    const step = 20;
    const px = p1.x - p2.x;
    const py = p1.y - p2.y;
    let angle = - Math.atan(py / px) - Math.PI * (px >= 0 ? 1.5 : 0.5);
    const x = p2.x + step * Math.sin(angle);
    const y = p2.y + step * Math.cos(angle);
    return svg`
      <circle class="directionMarker" cx="${x}" cy="${y}" r="3"></circle>
    `;
  }

  drawWeightMarker(p1, p2, w) {
    const x = (p1.x + p2.x) / 2;
    const y =  (p1.y + p2.y) / 2;
    return svg`
      <rect class="weightRect" x="${x - 9}" y="${y - 9}" width="18" height="18"/>
      <text class="weightText" x="${x}" y="${y + 1}" text-anchor="middle" alignment-baseline="middle">${w}</text>
    `;
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

    this.connections.push(new Array(this.connections.length).fill(this.getNoConnectionValue()));
    this.connections.forEach(c => c.push(this.getNoConnectionValue()));

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
      if (this.weighted) {
        this.dialog.open().then(formData => {
          this.createConnection(dragItem, item, Number(formData.get('number')));
          this.requestUpdate();
        }, () => this.requestUpdate());
      } else {
        this.createConnection(dragItem, item);
      }
    }
    this.dragOpts = null;
    this.requestUpdate();
  }

  createConnection(item1, item2, weight = 1) {
    this.connections[item1.index][item2.index] = weight;
    if (!this.directed) {
      this.connections[item2.index][item1.index] = weight;
    }
    this.dispatchEvent(new Event('changed'));
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
    stroke-width: 3px;
  }
  .clickable {
    stroke-width: 3px;
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
  .directionMarker {
    stroke: black;
    stroke-width: 2px;
    fill: black;
  }
  .weightRect {
    stroke: black;
    stroke-width: 1px;
    fill: bisque;
  }
  .weightText {
    font: normal 12px sans-serif;
    fill: black;
    stroke: none;
  }
`;

customElements.define('x-items-graph', XItemsGraph);