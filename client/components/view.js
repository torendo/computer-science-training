import {LitElement, html} from 'lit-element';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

export class XView extends LitElement {
  static get properties() {
    return {
      component: {type: String}
    };
  }

  render() {
    let exist = this.component != null && this.component !== '' && customElements.get(this.component) != null;
    return exist ? html`${unsafeHTML(`<${this.component}></${this.component}>`)}` : '';
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-view', XView);
