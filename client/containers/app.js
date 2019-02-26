import {LitElement, html} from 'lit-element';

export class XApp extends LitElement {
  render() {
    const routes = [
      {path: '/array', component: 'page-array', title: 'Array'},
      {path: '/list', component: 'page-list', title: 'List'}
    ];
    return html`
      <h3>Workshop applications</h3>
      <ul>
        ${routes.map(route => html`<li><a href="${route.path}" is="x-router-a">${route.title}</a></li>`)}
      </ul>
      <x-router .routes=${routes}></x-router>      
      <x-footer></x-footer>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);