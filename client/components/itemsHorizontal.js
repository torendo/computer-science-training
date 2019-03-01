import {LitElement, html, css} from 'lit-element';
import {colors100} from '../utils/colors';

export class XItemsHorizontal extends LitElement {
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
    const rnd = () => colors100[Math.ceil(Math.random() * colors100.length)];
    return html`
      ${this.items.map(item => html`
        <div class="item">
          <div class="index">
            ${item.index != null ? item.index : ''}
          </div>
          <div class="data" style="background-color: ${rnd()}">
            ${item.data != null ? item.data : ''}
          </div>
          <div class="state ${item.state != null ? '' : 'hidden'}">
            ${item.state != null ? item.state : ''}
          </div>
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