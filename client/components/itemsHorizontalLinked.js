import {LitElement, html, css} from 'lit-element';

export class XItemsHorizontalLinked extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      marker: {type: Object}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.marker = {};
  }

  render() {
    return html`
      ${this.items.map((item, i) => html`
        <div class="item ${item.mark ? 'mark' : ''} ${item.data == null ? 'no-data': ''}">
          <div class="data" style="${item.color ? 'background-color:' + item.color : ''}">
            ${item.data}
          </div>
          <div class="marker_container">
            ${this.marker.position === (item.index != null ? item.index : i) ? html`<div class="marker"></div>` : ''}
          </div>
        </div>
      `)}
    `;
  }
}

XItemsHorizontalLinked.styles = css`
  :host {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    height: 19em;
    max-width: 600px;
  }
  .item {
    display: flex;
    flex-direction: column;
    position: relative;
    margin-left: 2em;
    height: 4.5em;
  }
  .item.no-data:before,
  .item:first-child:before {
    display: none;  
  }
  .item.mark:first-child:after {
    border-left: none;
  }
  .item:first-child:after {
    left: 2em;
    width: 3em;
  }
  .item:last-child:after {
    width: 5em;
  }
  .item.mark:last-child:after {
    border-right: none;
  }
  .item:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 0.85em;
    left: -1px;
    transform: translate(-100%, -50%) rotate(45deg);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
    border-color: gray;
  }
  .item:after {
    content: '';
    display: block;
    position: absolute;
    height: 2px;
    width: 7em;
    top: 0.85em;
    left: -2em;
    margin-top: -1px;
    background-color: gray;
  }
  .item.mark {
    top: 1.5em;
    height: 3em;
    left: 1em;
    margin: 0;
  }
  .item.mark:before {
    top: -1px;
    left: 1em;
    margin-left: -1px;
    transform: translate(-50%, -100%) rotate(135deg);
  }
  .item.mark:after {
    height: .75em;
    width: 1em;
    top: -.75em;
    left: 1em;
    border: 2px solid gray;
    border-top: none;
    border-bottom: none;
    transform: translate(-2px, 2px);
    background-color: transparent;
  }
  .data {
    z-index: 1;
    min-width: 1.7em;
    min-height: 1.7em;
    padding: 0 10px;
    margin: 0;
    line-height: 1.7em;
    border: 1px solid lightgray;
    align-self: center;
  }
  .marker {
    position: relative;
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 2px;
    left: 50%;
    transform: rotate(-45deg) translate(-50%, -50%);
    border: 2px solid;
    border-left: none;
    border-bottom: none;
    border-color: red;
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    height: 1em;
    top: 1px;
    left: 50%;
    margin-left: -2px;
    background-color: red;
  }
`;

customElements.define('x-items-horizontal-linked', XItemsHorizontalLinked);