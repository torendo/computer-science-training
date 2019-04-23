import {LitElement, html, css} from 'lit-element';

export class XConsole extends LitElement {
  static get properties() {
    return {
      defaultMessage: {type: String}
    };
  }

  constructor() {
    super();
    this.defaultMessage = 'Press any key';
  }

  render() {
    return html`
      <p class="message">${this.message || this.defaultMessage}</p>
    `;
  }

  setMessage(text) {
    this.message = text;
    this.requestUpdate();
  }
}

XConsole.styles = css`
  :host {
    display: block;
  }
  .message {
    padding: 10px;
    font-family: monospace;
  }
`;

customElements.define('x-console', XConsole);