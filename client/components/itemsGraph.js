import {LitElement, svg, css} from 'lit-element';

export class XItemsTree extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      marker: {type: Object},
      clickFn: {type: Function}
    };
  }

  constructor() {
    super();
    this.items = [];
  }

  render() {
    const items = this.items.map((item, i) => {

      return item.value != null ? svg`
      
      ` : '';

    });
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" @dblclick=${this.dblclickHandler}>
        ${items}
      </svg>
    `;
  }

  dblclickHandler(e) {
    debugger;
  }

  clickHandler(item) {
    if (this.clickFn != null) {

      //l

      return this.clickFn(item);
    }
  }
}

XItemsTree.styles = css`
  :host {
    display: block;
    height: 400px;
    width: 600px;    
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .item {
    stroke: black;
  }
  .item.marked {
    stroke: red;
  }
  .clickable {
    cursor: pointer;
    stroke-width: 2px;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .line {
    stroke: black;
  }
  .marker line {
    stroke: red;
    stroke-width: 2px;
  }
`;

customElements.define('x-items-tree', XItemsTree);