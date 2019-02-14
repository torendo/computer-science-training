import {LitElement, html} from 'lit-element';

export class XSomething extends LitElement {
  render() {
    return html`
      <p>something <b>bold</b></p>
    `;
  }
}

customElements.define('x-something', XSomething);