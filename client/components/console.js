import {LitElement, html, css} from 'lit-element';

export class XConsole extends LitElement {
  constructor() {
    super();
    this.default = 'Press any key';
  }

  render() {
    return html`
      <p class="message">${this.default}</p>
    `;
  }

  firstUpdated() {
    this.container = this.shadowRoot.querySelector('.message');
  }

  setMessage(text) {
    this.container.innerText = text != null ? text : this.default;
    this.requestUpdate();
  }
}

XConsole.styles = css`
  .message {
    padding: 10px;
    margin: 10px;
    background: aliceblue;
    font-family: monospace;
  }
`;

customElements.define('x-console', XConsole);