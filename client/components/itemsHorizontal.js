import {LitElement, html, css} from 'lit-element';



export class XItemsHorizontal extends LitElement {
  static get properties() {
    return {
      data: {type: Array}
    };
  }
  constructor() {
    super();
    this.data = [];
  }
  render() {
    return html`
      ${this.data.map(item => html`
        <div class="item">
          <div class="index">${item.index != null ? item.index : ''}</div>
          <div class="data">${item.data != null ? item.data : ''}</div>
          <div class="state ${item.state != null ? '' : 'hidden'}">${item.state != null ? item.state : ''}</div>
        </div>
      `)}      
    `;
  }
}
//add css with columns
XItemsHorizontal.styles = css`
  :host {
    display: block;
  }
  .index, .data, .state {
    display: inline-block;
  }
  .hidden {
    display: none;
  }
`;

customElements.define('x-items-horizontal', XItemsHorizontal);