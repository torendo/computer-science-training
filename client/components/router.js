import {LitElement, html} from 'lit-element';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

/**
 * routes [
   {path: '/', component: 'x-user-list'},
   {path: '/user', component: 'x-user-profile'}
 ]
 */

export class XRouter extends LitElement {
  static get properties() {
    return {
      routes: {type: Array}
    };
  }

  render() {
    let template;
    if (this.routes) {
      const route = this.routes.find(route => {
        return route.path === decodeURIComponent(location.pathname);
      });
      if (route) {
        template = `<${route.component} />`;
      } else {
        template = '';
      }
    } else {
      template = '';
    }

    // return html`${template}`;
    return html`${unsafeHTML(template)}`;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-router', XRouter);
