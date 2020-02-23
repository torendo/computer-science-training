import {LitElement, html, css} from 'lit-element';

export class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
  }

  render() {
    return html`
    `;
  }
}

XItemsGraph.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;    
  }
`;

customElements.define('x-items-table', XItemsTable);