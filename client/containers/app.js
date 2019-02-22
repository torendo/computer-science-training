import {LitElement, html} from 'lit-element';

export class XApp extends LitElement {
  render() {
    const routes = [
      {path: '/array', component: 'page-array'},
      {path: '/list', component: 'page-list'}
    ];
    return html`
      <p>A paragraph</p>
      <x-something/>
      ---
      <x-router routes=${JSON.stringify(routes)} />
      ---
      <page-array></page-array>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);