import {LitElement, html} from 'lit-element';

export class XDialog extends LitElement {
  render() {
    return html`
      <dialog>
        <form method="dialog">
          <p>
            <input type="number">
          </p>
          <menu>
            <button value="cancel">Cancel</button>
            <button id="confirmBtn" value="default">Confirm</button>
          </menu>
        </form>
      </dialog>
    `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('dialog');
  }

  open() {
    return new Promise(resolve => {
      this.dialog.showModal();
      const onClose = () => {
        resolve(this.dialog.returnValue);
        this.dialog.removeEventListener('close', onClose);
      };
      this.dialog.addEventListener('close', onClose);
    });
  }
}

customElements.define('x-dialog', XDialog);