import {LitElement, html, css} from 'lit-element';

export class XItemsTree extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      markers: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
  }

  render() {
    return this.items.map(item => html`
      <div class="item">
        ${item.data}
      </div>
    `);
  }

  renderMarker(i) {
    let result = '';
    if (this.marker && this.marker.position === i) {
      result = html`
        <div class="marker ${this.marker.color ? 'color_' + this.marker.color : ''}"></div>
      `;
    }
    return result;
  }
}

XItemsTree.styles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    height: 19em;
    max-width: 600px;
  }
`;

customElements.define('x-items-tree', XItemsTree);