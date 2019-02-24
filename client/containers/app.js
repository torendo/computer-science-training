import {LitElement, html} from 'lit-element';

export class XApp extends LitElement {
  render() {
    const routes = [
      {path: '/array', component: 'page-array'},
      {path: '/list', component: 'page-list'}
    ];
    return html`
      <p>A paragraph</p>
      <x-something></x-something>
      <p>---</p>
      <a href="/array">array</a>
      <a href="/list">list</a>
      <p>---</p>
      <x-router .routes=${routes}></x-router>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);