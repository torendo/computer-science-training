import {LitElement, html} from 'lit-element';

export class XDialog extends LitElement {
  render() {
    return html`
      <dialog>
        <form method="dialog">
          <p class="slotCnt">
            <slot></slot>
          </p>
          <button value="default">Confirm</button>
          <button value="cancel">Cancel</button>
        </form>
      </dialog>
    `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('dialog');
    this.form = this.shadowRoot.querySelector('form');
    //move slotted nodes into dialog's form directly for proper work FormData
    //TODO: find a better way to beat this problem
    const slot = this.shadowRoot.querySelector('slot');
    this.shadowRoot.querySelector('.slotCnt').append(...slot.assignedNodes());
    slot.remove();
  }

  open() {
    return new Promise((resolve, reject) => {
      this.dialog.showModal();
      const onClose = () => {
        this.dialog.removeEventListener('close', onClose);
        if (this.dialog.returnValue === 'default') {
          resolve(new FormData(this.form));
        } else {
          reject();
        }
      };
      this.dialog.addEventListener('close', onClose);
    });
  }
}

customElements.define('x-dialog', XDialog);