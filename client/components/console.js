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
  
  .message table th {
      border-bottom: 1px solid black;
  }
  .message .marked {
      color: crimson;
  }
`;

customElements.define('x-console', XConsole);