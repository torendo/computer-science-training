import {LitElement, html} from 'lit-element';

export class XApp extends LitElement {
  render() {
    const routes = [
      {path: '/array', component: 'page-array', title: 'Array'},
      {path: '/orderedArray', component: 'page-ordered-array', title: 'Ordered Array'},
      {path: '/bubbleSort', component: 'page-bubble-sort', title: 'Bubble Sort'},
      {path: '/selectSort', component: 'page-select-sort', title: 'Select Sort'},
      {path: '/insertionSort', component: 'page-insertion-sort', title: 'Insertion Sort'},
      {path: '/stack', component: 'page-stack', title: 'Stack'},
      {path: '/list', component: 'page-list', title: 'List'}
    ];
    return html`
      <h3>Workshop applications</h3>
      <nav>
        ${routes.map(route => html`<div class="nav-item"><a href="${route.path}" is="x-router-a">${route.title}</a></div>`)}
      </nav>
      <x-router .routes=${routes}></x-router>      
      <x-footer></x-footer>
    `;
    //TODO: add buttons description from Java applets
    //TODO: add short version of provided algorithms on the same page
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);