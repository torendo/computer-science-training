import {LitElement, html, css} from 'lit-element';

export class XItemsVertical extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      markers: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.markers = [];
  }

  render() {
    return html`
      ${this.items.map((item, i) => html`
        <div class="item">
          <div class="data_container">
            <div class="data" style="${item.color ? 'background-color:' + item.color + ';' : ''} ${item.data ? 'height:' + item.data + '%;' : ''}">
            </div>
          </div>
          <div class="index">
            ${item.index}
          </div>
          <div class="marker_container">
            ${this.drawMarker(i)}
          </div>
        </div>
      `)}      
    `;
  }

  drawMarker(i) {
    const marker = this.markers.find(marker => marker.position === i);
    if (marker) {
      return html`<div class="marker size_${marker.size} ${marker.color ? 'color_' + marker.color : ''}">${marker.text}</div>`;
    }
  }
}

XItemsVertical.styles = css`
  :host {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    max-width: 600px;
  }
  .item {
    display: flex;
    flex-direction: column;
  }
  .index, .data, .state {
    width: auto;
    text-align: center;
  }
  .index {
    padding-right: 4px;
  }
  .data_container {
    display: flex;
    flex-direction: column-reverse;
    height: 400px;
  }
  .data {
    min-width: 1.7em;
    min-height: 1.7em;
    padding: 0;
    margin: 0;
    border: 1px solid lightgray;
  }
  .marker_container {
    position: relative;
    height: 100px;
  }
  .marker {
    position: relative;
    padding-top: 1em; /*configurable*/
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: -2px;
    left: 50%;
    transform: rotate(-45deg) translate(-50%);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
    border-color: red; /*configurable*/
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    height: 1em; /*configurable*/
    top: 0;
    left: 50%;
    background-color: red; /*configurable*/
  }
`;

customElements.define('x-items-vertical', XItemsVertical);