import {LitElement, html, css} from 'lit-element';

export class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Array}
    };
  }

  render() {
    return html`
      <table>
        ${this.renderHeader()}
        ${this.items.map(item => this.renderRow(item.value, this.connections[item.index]))}
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
    if (this.connections.length > 0) {
      return html`
        <tr>
          <td>${value}</td>
          ${this.items.map(item => {
            const weight = connections[item.index].toString().slice(0,3);
            return html`<td>${weight}</td>`;
          })}
        </tr>
      `;
    }
  }
}

XItemsTable.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    background: papayawhip;
    margin: 10px;
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
      text-align: center;
  }
  tr td:first-child,
  tr th:first-child {
    border-right: 1px solid black;
    font-family: sans-serif;
    font-weight: bold;
  }
`;

customElements.define('x-items-table', XItemsTable);