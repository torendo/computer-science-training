import {LitElement, html, css} from 'lit-element';

export class XButton extends LitElement {
  static get properties() {
    return {
      callback: {type: Function},
      disabled: {type: Boolean},
      activated: {type: Boolean}
    };
  }

  render() {
    return html`
      <button @click=${this.handleClick} ?disabled=${this.disabled}>
        <slot class=${this.activated ? 'hidden' : ''}></slot>      
        <span class=${this.activated ? '' : 'hidden'}>Next</span>
      </button>
    `;
  }

  createRenderRoot() {
    return this.attachShadow({mode: 'open', delegatesFocus: true});
  }

  updated() {
    this.classList.toggle('activated', this.activated);
  }

  handleClick() {
    this.callback(this);
  }
}

XButton.styles = css`
  .hidden {
    display: none;
  }
`;

customElements.define('x-button', XButton);