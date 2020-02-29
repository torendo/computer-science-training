import {LitElement, html, css} from 'lit-element';

export class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Map}
    };
  }

  render() {
    return html`
      <table>
        ${this.renderHeader()}
        ${this.items.map(item => this.renderRow(item.value, this.connections.get(item)))}
      </table>
    `;
  }

  renderHeader() {
    return html`
      <tr>
        <th></th>
        ${this.items.map(item => html`<th>${item.value}</th>`)}
      </tr>
    `;
  }
  
  renderRow(value, connections) {
    return html`
      <tr>
        <td>${value}</td>
        ${this.items.map(item => html`<td>${connections.has(item) ? 1 : 0}</td>`)}      
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
  table {
    font-size: 14px;
    border-collapse: collapse;
  }
  th, td {
    padding: 2px 5px;
  }
  th {
    font-weight: bold;
    border-bottom: 1px solid black;
  }
  td {
      font-family: monospace;
  }
  tr td:first-child,
  tr th:first-child {
    border-right: 1px solid black;
    font-family: sans-serif;
    font-weight: bold;
  }
`;

customElements.define('x-items-table', XItemsTable);