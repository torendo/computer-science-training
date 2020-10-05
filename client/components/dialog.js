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
    this.inputs = this.shadowRoot.querySelector('slot')
      .assignedElements()
      .reduce((res, el) => [...res, ...el.querySelectorAll('input')], []);
  }

  open() {
    return new Promise((resolve, reject) => {
      this.dialog.showModal();
      this.dialog.addEventListener('close',  () => {
        if (this.dialog.returnValue === 'default') {
          const formData = new FormData();
          this.inputs.forEach(input => {
            formData.append(input.name, input.value);
            input.value = null;
          });
          resolve(formData);
        } else {
          reject();
        }
      }, {
        once: true
      });
    });
  }
}

customElements.define('x-dialog', XDialog);