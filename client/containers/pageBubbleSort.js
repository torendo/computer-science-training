import {LitElement, html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';

export class PageBubbleSort extends LitElement {
  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.isReverseOrder = false;
    this.length = 10;
    this.initItems();
  }

  render() {
    return html`
      <h4>Array</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorStep)}>Step</x-button>
      </div>
      <x-console class="console_stats" defaultMessage="-"></x-console>
      <x-console class="console_verbose"></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers}></x-items-vertical>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.consoleStats = this.querySelector('.console_stats');
    this.console = this.querySelector('.console_verbose');
    this.dialog = this.querySelector('x-dialog');
  }

  handleClick(iterator, btn) {
    if (!this.iterator) {
      this.iterator = iterator.call(this);
      this.toggleButtonsActivity(btn, true);
    }
    const iteration = this.iterate();
    if (iteration.done) {
      this.iterator = null;
      this.toggleButtonsActivity(btn, false);
    }
    this.items = [...this.items];
    this.requestUpdate();
  }

  toggleButtonsActivity(btn, status) {
    this.querySelectorAll('x-button').forEach(el => {
      if (el !== btn) el.disabled = status;
    });
    btn.activated = status;
  }

  iterate() {
    const iteration = this.iterator.next();
    this.console.setMessage(iteration.value);
    const activatedBtn = this.querySelector('x-button.activated');
    if (activatedBtn) activatedBtn.focus();
    return iteration;
  }

  initItems() {
    const arr = [];
    for (let i = 0; i < this.length; i++) {
      const item = new Item({index: i, state: i === 0});
      const value = this.isReverseOrder ? (this.length - i) * (this.length === 10 ? 10 : 1) : Math.floor(Math.random() * 100);
      item.setData(value);
      arr.push(item);
    }
    this.items = arr;
    this.markers = [
      new Marker({position: 0, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner+1'}),
      new Marker({position: this.length - 1, size: 2, color: 'red', text: 'outer'})
    ];
  }

  updateStats(swaps = 0, comparsions = 0) {
    this.consoleStats.setMessage(`Swaps: ${swaps}, Comparsions: ${comparsions}`);
  }

  * iteratorNew() {
    this.isReverseOrder = !this.isReverseOrder;
    this.initItems();
    yield `Created ${this.isReverseOrder ? 'reverse' : 'ordered'} array`;
  }

  * iteratorSize() {
    this.length = this.length === 10 ? 100 : 10;
    this.initItems();
    yield `Created ${this.length} elements array`;
  }

  * iteratorStep() {
    let swaps = 0;
    let comparsions = 0;
    this.updateStats(swaps, comparsions);
    for (let outer = this.length - 1; outer > 0; outer--) {
      for (let inner = 0; inner < outer; inner++) {
        comparsions++;
        if (this.items[inner].data > this.items[inner + 1].data) {
          yield 'Will be swapped';
          this.items[inner].switchDataWith(this.items[inner + 1]);
          swaps++;
        } else {
          yield 'Will not be swapped';
        }
        this.updateStats(swaps, comparsions);
        this.markers[0].position++;
        this.markers[1].position++;
      }
      this.markers[0].position = 0;
      this.markers[1].position = 1;
      this.markers[2].position--;
    }
    this.markers[0].position = 0;
    this.markers[1].position = 1;
    this.markers[2].position = this.length - 1;
    return 'Sort is complete';
  }

  * iteratorRun() {
    let iterator;
    let isFinish;
    while(true) {
      const interval = setInterval(() => {
        if (!iterator) {
          iterator = this.iteratorStep();
        }
        const iteration = iterator.next();
        this.console.setMessage(iteration.value);
        if (iteration.done) {
          iterator = null;
          clearInterval(interval);
          isFinish = true;
        }
        this.items = [...this.items];
        this.requestUpdate();

      }, 200);
      if (isFinish) break;
      yield 'Press to pause';
      clearInterval(interval);
      yield 'Press to start';
    }
    return ';';
  }

}

customElements.define('page-bubble-sort', PageBubbleSort);