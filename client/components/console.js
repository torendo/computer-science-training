import {LitElement, html, css} from 'lit-element';

export class XConsole extends LitElement {
  static get properties() {
    return {
      defaultMessage: {type: String}
    };
  }

  constructor() {
    super();
    this.defaultMessage = 'Press any button';
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

  .message table {
      border-collapse: collapse;
  }
  .message table td,
  .message table th {
      padding: 2px 6px;
  }
  .message table th {
      font-weight: normal;
      border-bottom: 1px solid black;
  }
  .message .marked {
      font-weight: bold;
      color: red;
  }
`;

customElements.define('x-console', XConsole);