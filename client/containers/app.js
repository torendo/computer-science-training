import {LitElement, html} from 'lit-element';

export class XApp extends LitElement {
  render() {
    return html`
      <p>A paragraph</p>
      <x-something></x-something>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);