import {LitElement, html} from 'lit-element';

export class PageList extends LitElement {
  render() {
    return html`
      <p>List Page</p>
    `;
  }
}

customElements.define('page-list', PageList);