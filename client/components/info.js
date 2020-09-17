import {LitElement, html, css} from 'lit-element';

export class XInfo extends LitElement {
  render() {
    return html`
      <button type="button" title="" @click=${() => this.info.classList.toggle('show')}>?</button>
      <div>
        <slot></slot>
      </div>
    `;
  }

  firstUpdated() {
    this.info = this.shadowRoot.querySelector('div');
  }
}

XInfo.styles = css`
  :host {
    position: relative;
  }
  button {
    width: 1.68em;
    height: 1.6em;
    padding: 0;
    margin: 0 0 0 .5em;
    border-radius: 50%;
    border: 1px solid gray;
    background: whitesmoke;
    font-weight: bold;
  }
  div {
    z-index: 10;
    display: none;
    position: absolute;
    top: .5em;
    left: 2em;
    width: 250px;
    padding: 0 15px;
    border: 1px solid gray;
    background: whitesmoke;
  }
  button:hover + div {
    display: block;
  }
  .show {
    display: block;
  }
`;

customElements.define('x-info', XInfo);