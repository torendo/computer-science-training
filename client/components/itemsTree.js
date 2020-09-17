import {LitElement, svg, css} from 'lit-element';
import {Marker} from '../classes/marker';

export class XItemsTree extends LitElement {
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
  }

  getCoords(i) {
    const level = Math.floor(Math.log2(i + 1));
    const part = 600 / (2 ** (level + 1));
    const y = (level + 1) * 60;
    const x = 2 * part * (i + 1 - 2 ** level) + part;
    return {x, y};
  }

  render() {
    const items = this.items.map((item, i) => {
      const coords = this.getCoords(i);
      const iL = 2 * i + 1;
      const iR = iL + 1;
      const coordsL = this.getCoords(iL);
      const coordsR = this.getCoords(iR);
      return item.value != null ? svg`
        <g fill="${item.color}">
          ${this.items[iL] && this.items[iL].value != null ? svg`
            <line class="line" x1="${coords.x}" y1="${coords.y}" x2="${coordsL.x}" y2="${coordsL.y}">
          ` : ''}
          ${this.items[iR] && this.items[iR].value != null ? svg`
            <line class="line" x1="${coords.x}" y1="${coords.y}" x2="${coordsR.x}" y2="${coordsR.y}">
          ` : ''}
          <g @click=${this.clickHandler.bind(this, item)} class="${this.clickFn != null ? 'clickable' : ''}">
            <circle class="item ${item.mark ? 'marked' : ''}" cx="${coords.x}" cy="${coords.y}" r="12"></circle>
            <text class="value" x="${coords.x}" y="${coords.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
          </g>
        </g>
        ${this.renderMarker(i, coords)}
      ` : '';
    });
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
        ${items}
      </svg>
    `;
  }

  clickHandler(item) {
    if (this.clickFn != null) {
      this.marker = new Marker({position: item.index});
      return this.clickFn(item);
    }
  }

  renderMarker(i ,coords) {
    let result = '';
    if (this.marker && this.marker.position === i) {
      result = svg`
        <g class="marker">
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x}" y2="${coords.y - 35}"></line>        
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x - 4}" y2="${coords.y - 20}"></line>       
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x + 4}" y2="${coords.y - 20}"></line>        
        </g>
      `;
    }
    return result;
  }
}

XItemsTree.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    margin: 10px;
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
  .clickable {
    cursor: pointer;
    stroke-width: 2px;
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

customElements.define('x-items-tree', XItemsTree);