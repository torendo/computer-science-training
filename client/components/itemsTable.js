import {LitElement, html, css} from 'lit-element';

export class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Map}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.connections = new Map();
  }

  render() {
    return html`
      <table>
        ${this.renderHeader()}
        ${this.items.map(item => this.renderRow(this.connections.get(item)))}
      </table>
    `;
  }

  renderHeader() {
    return html`
      <tr>
        ${this.items.map(item => html`<th>${item.value}</th>`)}
      </tr>
    `;
  }
  
  renderRow(connections) {
    const arr = Array.from(connections);
    return html`
      <tr>
        ${arr.map(item => html`<td>${}</td>`)}      
      </tr>
    `;
  }
}

XItemsTable.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    background: papayawhip;
  }
`;

customElements.define('x-items-table', XItemsTable);