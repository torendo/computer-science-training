import {LitElement, html} from 'lit-element';

export class PageArray extends LitElement {
  constructor() {
    super();
    this.items = [];
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>Del</x-button>
        <label><input class="dups" type="checkbox" disabled>Dups OK</label>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items}></x-items-horizontal>
      <x-dialog>
        <form>
          <label>Number: <input name="length" type="number"></label>
        </form>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.dups = this.querySelector('.dups');
  }

  handleClick(iterator, btn) {
    if (!this.iterator) {
      this.iterator = this.iteratorNew();
      this.toggleButtonsActivity(btn, true);
    }
    const iteration = this.iterate();
    if (iteration.done) {
      this.iterator = null;
      this.toggleButtonsActivity(btn, false);
    }
    this.requestUpdate();
  }

  iterate() {
    const iteration = this.iterator.next();
    this.console.setMessage(iteration.value);
    return iteration;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create';
    this.dialog.open().then(nodes => {
      const form = nodes.find(node => node.tagName === 'FORM');
      length = Number((new FormData(form)).get('length'));
      this.iterate();
    });
    yield 'Dialog opened'; //skipped in promise
    yield `Will create empty array with ${length} cells`;
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = {
        index: i,
        data: null,
        state: null
      };
    }
    this.items = arr;
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    yield 'New array created; total items = 0';
  }

  handleClickFill(e, btn) {
    const maxFilledElements = Math.ceil(Math.random() * this.items.length);
    for (let i = 0; i < maxFilledElements; i++) {
      this.items[i].data = Math.ceil(Math.random() * 1000);
    }
    this.items = [...this.items];
    this.toggleButtonsActivity(btn, true);
    this.requestUpdate();
  }

  handleClickIns() {

  }

  handleClickFind() {

  }

  handleClickDel() {

  }

  toggleButtonsActivity(btn, status) {
    this.querySelectorAll('x-button').forEach(el => {
      if (el !== btn) el.disabled = status;
    });
    btn.activated = status;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('page-array', PageArray);