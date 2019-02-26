import {LitElement, html} from 'lit-element';

export class PageArray extends LitElement {
  render() {
    return html`
      <h4>Array</h4>
      <div>
        <button>New</button>      
        <button>Fill</button>      
        <button>Ins</button>      
        <button>Find</button>      
        <button>Del</button>
        <label><input type="checkbox">Dups OK</label>    
        <label>Number: <input type="number"></label>    
      </div>
      <div>
        <x-items-horizontal></x-items-horizontal>
      </div>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('page-array', PageArray);