import {LitElement, html, css} from 'lit-element';

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
    return html`
      ${this.items.map(item => html`
        <div class="item">
          <div class="index">
            ${item.index}
          </div>
          <div class="data" style="${item.color ? 'background-color:' + item.color : ''}">
            ${item.data}
          </div>
          <div class="state_container ${item.state ? 'state' : ''} ${item.marker ? 'marker' : ''}">
            ${item.state != null && typeof item.state !== 'boolean' ? item.state : ''}
          </div>
        </div>
      `)}      
    `;
  }
}

XItemsHorizontal.styles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    height: 19em;
    max-width: 600px;
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
    min-width: 1.7em;
    min-height: 1.7em;
    padding: 0 10px;
    margin: 0;
    line-height: 1.7em;
    border: 1px solid lightgray;
  }
  .state_container {
    position: relative;
    min-height: 1.7em;
    padding-left: 3em;
    line-height: 1.7em;
  }
  .marker:after {
    content: '';
    width: 4px;
    height: 1.9em;
    position: absolute;
    left: 0;
    margin-top: -1px;
    background-color: royalblue;
  }
  .state:before {
    content: '←';
    position: absolute;  
    left: 0;
    margin-top: -.1em;
    padding-left: 6px;
    font-size: 2em;
    color: crimson;
  }
`;

customElements.define('x-items-horizontal', XItemsHorizontal);