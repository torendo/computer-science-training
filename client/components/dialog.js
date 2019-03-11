import {LitElement, html} from 'lit-element';

export class XDialog extends LitElement {
  render() {
    return html`
      <dialog>
        <p>
          <slot></slot>
        </p>
        <form method="dialog">
          <button value="cancel">Cancel</button>
          <button value="confirm">Confirm</button>
        </form>
      </dialog>
    `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('dialog');
  }

  open() {
    return new Promise((resolve, reject) => {
      this.dialog.showModal();
      const onClose = () => {
        this.dialog.removeEventListener('close', onClose);
        if (this.dialog.returnValue === 'confirm') {
          resolve(this.shadowRoot.querySelector('slot').assignedNodes());
        } else {
          reject();
        }
      };
      this.dialog.addEventListener('close', onClose);
    });
  }
}

customElements.define('x-dialog', XDialog);