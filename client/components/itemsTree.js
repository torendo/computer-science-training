import {LitElement, html, svg, css} from 'lit-element';

export class XItemsTree extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      marker: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
  }

  getCoords(i) {
    const level = Math.floor(Math.log2(i + 1));
    const part = 600 / (2 ** (level + 1));
    const y = (level + 1) * 50;
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
          <circle class="item" cx="${coords.x}" cy="${coords.y}" r="12"></circle>
          <text class="value" x="${coords.x}" y="${coords.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
        </g>
      ` : '';
    });
    return svg`
      <svg viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
        ${items}
      </svg>
    `;
  }

  renderMarker(i) {
    let result = '';
    if (this.marker && this.marker.position === i) {
      result = html`
        <div class="marker"></div>
      `;
    }
    return result;
  }
}

XItemsTree.styles = css`
  :host {
    display: block;
    height: 500px;
    width: 600px;    
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .item {
    stroke: black;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .line {
    stroke: black;
  }
`;

customElements.define('x-items-tree', XItemsTree);