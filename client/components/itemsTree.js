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

  render() {
    const items = this.items.map((item, i) => {
      const level = Math.floor(Math.log2(i + 1));
      const y = (level + 1) * 50;
      const part = 600 / (2 ** (level + 1));
      const x = 2 * part * (i + 1 - 2 ** level) + part;
      return item.value != null ? svg`
        <circle class="item" cx="${x}" cy="${y}" r="12"></circle>
        <text class="value" x="${x}" y="${y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
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
    fill: white;
    stroke: black;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
`;

customElements.define('x-items-tree', XItemsTree);