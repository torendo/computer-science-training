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
            ${item.index}
          </div>
          <div class="data" style="${item.data ? 'background-color:' + rnd() : ''}">
            ${item.data}
          </div>
          <div class="state ${item.state != null && item.state !== false ? '' : 'hidden'}">
            ${item.state != null && typeof item.state !== 'boolean' ? item.state : ''}
          </div>
        </div>
      `)}      
    `;
  }
}

//add css with columns
XItemsHorizontal.styles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    height: 20.5em;
  }
  .item {
    display: flex;
  }
  .index, .data, .state {
    align-self: center;
  }
  .index {
    width: 1.5em;
    padding-right: 4px;
    text-align: right;
  }
  .data {
    padding: 0 10px;
    line-height: 1.7em;
    margin: 0;
    border: 1px solid lightgray;
    min-width: 1.7em;
    min-height: 1.7em;
  }
  .state:before {
    content: '<—';
    padding-left: 4px;
    color: crimson;    
  }
  .hidden {
    display: none;
  }
`;

customElements.define('x-items-horizontal', XItemsHorizontal);