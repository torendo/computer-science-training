import {LitElement, html} from 'lit-element';

export class XFooter extends LitElement {
  render() {
    return html`
      <p>Built with ❤ and Webcomponents</p>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-footer', XFooter);