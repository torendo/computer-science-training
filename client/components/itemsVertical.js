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
          <div class="index">
            ${item.index}
          </div>
          <div class="data" style="${item.color ? 'background-color:' + item.color : ''}">
            ${item.data}
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
  .marker_container {
    position: relative;
    min-height: 1.7em;
    padding-left: 3em;
    line-height: 1.7em;
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

customElements.define('x-items-vertical', XItemsVertical);