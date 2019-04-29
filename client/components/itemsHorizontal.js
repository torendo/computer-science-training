import {LitElement, html, css} from 'lit-element';

export class XItemsHorizontal extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      markers: {type: Array},
      reverse: {type: Boolean},
    };
  }

  constructor() {
    super();
    this.items = [];
    this.markers = [];
  }

  render() {
    const items = this.items.map(item => html`
      <div class="item">
        <div class="index">
          ${item.index}
        </div>
        <div class="data" style="${item.color ? 'background-color:' + item.color : ''}">
          ${item.data}
        </div>
        <div class="marker_container ${item.mark ? 'mark' : ''}">
          ${this.drawMarker(item.index)}
        </div>
      </div>
    `);
    return html`
      ${this.reverse ? items.reverse() : items}      
    `;
  }

  drawMarker(i) {
    let result = '';
    this.markers.forEach(marker => {
      if (marker.position === i) {
        result = html`
          ${result}
          <div class="marker size_${marker.size} ${marker.color ? 'color_' + marker.color : ''}">
            <span>${marker.text}</span>
          </div>
        `;
      }
    });
    return result;
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
  .marker_container {
    position: relative;
    min-height: 1.7em;
    padding-left: 3em;
    line-height: 1.7em;
  }
  .mark:before {
    content: '';
    width: 4px;
    height: 1.9em;
    position: absolute;
    left: 0;
    margin-top: -1px;
    background-color: royalblue;
  }
  .marker {
    position: absolute;
    left: 0;
    height: 100%;
    font-size: .8em;
    text-align: center;
  }
  .marker span {
    text-shadow: 1px 1px 2px white;
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 50%;
    left: 6px;
    transform: rotate(-135deg) translate(50%, 50%);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    height: 2px;
    top: 50%;
    left: 6px;
    margin-top: -2px;
  }
  .size_1.marker {
    z-index: 3;
    padding-left: 2em;
  }
  .size_1.marker:after {
    width: 1em;
  }
  .size_2.marker {
    z-index: 2;
    padding-left: 4em;
  }
  .size_2.marker:after {
    width: 3em;
  }
  .size_3.marker {
    z-index: 1;
    padding-left: 6em;
  }
  .size_3.marker:after {
    width: 5em;
  }
  .color_red.marker {
    color: red;
  }
  .color_red.marker:before {
    border-color: red;
  }
  .color_red.marker:after {
    background-color: red;
  }
  .color_blue.marker {
    color: blue;
  }
  .color_blue.marker:before {
    border-color: blue;
  }
  .color_blue.marker:after {
    background-color: blue;
  }
  .color_purple.marker {
    color: purple;
  }
  .color_purple.marker:before {
    border-color: purple;
  }
  .color_purple.marker:after {
    background-color: purple;
  }
`;

customElements.define('x-items-horizontal', XItemsHorizontal);