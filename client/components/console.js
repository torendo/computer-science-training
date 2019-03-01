import {LitElement, html} from 'lit-element';

export class XConsole extends LitElement {
  render() {
    return html`
      <p>Built with ❤ and Webcomponents</p>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-console', XConsole);