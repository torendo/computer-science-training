import {LitElement, html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {getColor100} from '../utils';

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
        <x-button .callback=${this.handleAbort.bind(this)} class="btn_abort hidden">Abort</x-button>
      </div>
      <x-console class="console_verbose"></x-console>
      <x-console class="console_stats" defaultMessage="—"></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers}></x-items-vertical>
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.consoleStats = this.querySelector('.console_stats');
    this.console = this.querySelector('.console_verbose');
    this.btnStop = this.querySelector('.btn_abort');
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

  handleAbort() {
    this.isAborted = true;
    this.iterate();
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
      const item = new Item({index: i});
      const value = this.isReverseOrder ? (this.length - i) * (this.length === 10 ? 10 : 1) : Math.floor(Math.random() * 100);
      item.setData(value, getColor100(value));
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

  beforeSort() {
    this.btnStop.classList.remove('hidden');
    this.btnStop.disabled = false;
    this.isAborted = false;
  }

  afterSort() {
    this.markers[0].position = 0;
    this.markers[1].position = 1;
    this.markers[2].position = this.length - 1;
    this.btnStop.classList.add('hidden');
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
    this.beforeSort();
    let swaps = 0;
    let comparsions = 0;
    this.updateStats(swaps, comparsions);
    loopOuter:
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
        if (this.isAborted) break loopOuter;
      }
      this.markers[0].position = 0;
      this.markers[1].position = 1;
      this.markers[2].position--;
    }
    this.afterSort();
    return `Sort is ${this.isAborted ? 'aborted' : 'complete'}`;
  }

  * iteratorRun() {
    this.beforeSort();
    let iterator;
    let isDone = false;
    while(true) {
      yield 'Press Next to start';
      if (isDone || this.isAborted) break;
      const interval = setInterval(() => {
        if (!iterator) {
          iterator = this.iteratorStep();
        }
        if (iterator.next().done) {
          isDone = true;
          this.iterate();
        }
        this.items = [...this.items];
        this.requestUpdate();
      }, this.length === 10 ? 200 : 40);
      yield 'Press Next to pause';
      clearInterval(interval);
      if (isDone || this.isAborted) break;
    }
    this.afterSort();
    return `Sort is ${this.isAborted ? 'aborted' : 'complete'}`;
  }
}

customElements.define('page-bubble-sort', PageBubbleSort);