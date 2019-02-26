export class XRouterA extends HTMLAnchorElement {
  connectedCallback() {
    this.xRouterListener = this.addEventListener('click', e => {
      e.preventDefault();
      history.pushState({}, '', this.attributes.href.nodeValue);
      document.querySelectorAll('x-router').forEach(xRouter => {
        xRouter.requestUpdate();
      });
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.xRouterListener);
  }
}

customElements.define('x-router-a', XRouterA, {extends: 'a'});