import {LitElement, html} from 'lit-element';

export class PageArray extends LitElement {
  constructor() {
    super();
    this.items = [];
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <button @click="${this.handleClickNew}">New</button>      
        <button @click="${this.handleClickFill}">Fill</button>      
        <button @click="${this.handleClickIns}">Ins</button>      
        <button @click="${this.handleClickFind}">Find</button>      
        <button @click="${this.handleClickDel}">Del</button>
        <label><input type="checkbox">Dups OK</label>    
        <label>Number: <input type="number"></label>    
      </div>
      <x-console></x-console>
      <x-items-horizontal .items="${this.items}"></x-items-horizontal>
    `;
  }

  handleClickNew() {
    const arrLength = Math.ceil(Math.random() * 59);
    const arr = new Array(arrLength);
    for (let i = 0; i < arrLength; i++) {
      arr[i] = {
        index: i,
        data: null,
        state: null
      };
    }
    this.items = arr;
    this.requestUpdate();
  }

  handleClickFill() {
    const maxFilledElements = Math.ceil(Math.random() * this.items.length);
    for (let i = 0; i < maxFilledElements; i++) {
      this.items[i].data = Math.ceil(Math.random() * 1000);
    }
    this.items = [...this.items];
    this.requestUpdate();
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('page-array', PageArray);