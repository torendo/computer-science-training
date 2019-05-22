import {LitElement, html, css} from 'lit-element';
import {Item} from '../classes/item';

export class XItemsVertical extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      temp: {type: Object},
      markers: {type: Array},
      pivots: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.pivots = [];
  }

  render() {
    return html`
      ${this.items.map(item => html`
        <div class="item">
          <div class="value_container">
            <div class="value" style="${item.color ? 'background-color:' + item.color + ';' : ''} ${item.value ? 'height:' + item.value + '%;' : ''}">
            </div>
          </div>
          <div class="index" style="${this.items.length > 20 ? 'display:none;' : ''}">
            ${item.index}
          </div>
          <div class="marker_container">
            ${this.renderMarker(item.index)}
          </div>
          ${this.renderPivots(item)}
        </div>
      `)}      
      ${this.renderTemp()}
    `;
  }

  renderPivots(item) {
    let result = '';
    this.pivots.forEach((pivot, i) => {
      if (pivot.start <= item.index && pivot.end >= item.index) {
        const isDimmed = this.pivots.length > 1 && this.pivots.length !== i + 1;
        result = html`
          ${result}
          <div class="pivot ${isDimmed ? 'dimmed' : ''}" style="height: ${400 * (1 - pivot.value / 100) - 2}px"></div>
        `;
      }
    });
    return result;
  }

  renderTemp() {
    if (this.temp instanceof Item) {
      return html`
        <div class="item temp">
          <div class="value_container">
            <div class="value" style="${this.temp.color ? 'background-color:' + this.temp.color + ';' : ''} ${this.temp.value ? 'height:' + this.temp.value + '%;' : ''}">
            </div>
          </div>
          <div class="marker_container">
            ${this.renderMarker('temp')}
          </div>
        </div>
      `;
    }
  }
  renderMarker(i) {
    let result = '';
    this.markers.forEach(marker => {
      if (marker.position === i) {
        result = html`
          ${result}
          <div class="marker size_${marker.size} ${marker.color ? 'color_' + marker.color : ''}">
            <span>${this.items.length > 20 ? '' : marker.text}</span>
          </div>
        `;
      }
    });
    return result;
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
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 5px;
    flex-grow: 1;
    flex-basis: 0;
  }
  .temp {
    margin-left: 2em;
  }
  .index {
    text-align: center;
    margin-bottom: 5px;
  }
  .value_container {
    display: flex;
    flex-direction: column-reverse;
    height: 400px;
    margin-bottom: 5px;
  }
  .value {
    border: 1px solid lightgray;
  }
  .pivot {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    border-bottom: 1px solid black;
  }
  .pivot.dimmed {
    border-bottom-style: dotted;
  }
  .marker_container {
    position: relative;
    height: 6em;
  }
  .marker {
    position: absolute;
    top: 0;
    width: 100%;
    font-size: .8em;
    text-align: center;
  }
  .marker span {
    position: absolute;
    min-width: 5em;
    transform: translateX(-50%);
    text-shadow: white 1px 1px 0;
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
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    top: 0;
    left: 50%;
  }
  .size_1.marker {
    z-index: 3;
    padding-top: 1em;
  }
  .size_1.marker:after {
    height: 1em;
  }
  .size_2.marker {
    z-index: 2;
    padding-top: 3em;
  }
  .size_2.marker:after {
    height: 3em;
  }
  .size_3.marker {
    z-index: 1;
    padding-top: 5em;
  }
  .size_3.marker:after {
    height: 5em;
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

customElements.define('x-items-vertical', XItemsVertical);