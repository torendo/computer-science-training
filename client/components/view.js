import {LitElement, html} from 'lit-element';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

export class XView extends LitElement {
  static get properties() {
    return {
      component: {type: String}
    };
  }

  render() {
    let template = (this.component != null && this.component !== '') ? `<${this.component}></${this.component}>` : '';
    return html`${unsafeHTML(template)}`;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-view', XView);
