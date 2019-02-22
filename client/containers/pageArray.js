import {LitElement, html} from 'lit-element';

export class PageArray extends LitElement {
  render() {
    return html`
      <p>Array Page</p>
    `;
  }
}

customElements.define('page-array', PageArray);