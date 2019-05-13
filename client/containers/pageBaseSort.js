import {html} from 'lit-element';
import {Item} from '../classes/item';
import {getColor100} from '../utils';
import {PageBase} from './pageBase';

export class PageBaseSort extends PageBase {
  constructor() {
    super();
    this.length = 10;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h4>${this.title}</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorStep)}>Step</x-button>
        <x-button .callback=${this.handleAbort.bind(this)} class="btn_abort hidden">Abort</x-button>
      </div>
      <x-console class="console_verbose"></x-console>
      <x-console class="console_stats" defaultMessage="—"></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers} .temp=${this.temp}></x-items-vertical>
    `;
  }

  firstUpdated() {
    this.consoleStats = this.querySelector('.console_stats');
    this.console = this.querySelector('.console_verbose');
    this.btnStop = this.querySelector('.btn_abort');
  }

  handleAbort() {
    clearInterval(this.interval);
    this.afterSort();
    this.iterator = (function *() {
      yield 'Aborted';
    })();
    this.iterate();
  }

  initItems(length = this.length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      const value = this.isReverseOrder ? (length - i) * (100 / length) : Math.floor(Math.random() * 100);
      item.setData(value, getColor100(value));
      arr.push(item);
    }
    this.items = arr;
  }

  initMarkers() {
    this.markers = [];
  }

  updateStats(swaps = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Swaps: ${swaps}, Comparisons: ${comparisons}`);
  }

  beforeSort() {
    this.updateStats();
    this.btnStop.classList.remove('hidden');
    this.btnStop.disabled = false;
  }

  afterSort() {
    this.initMarkers();
    this.btnStop.classList.add('hidden');
  }

  * iteratorNew() {
    this.isReverseOrder = !this.isReverseOrder;
    this.initItems();
    this.initMarkers();
    yield `Created ${this.isReverseOrder ? 'reverse' : 'unordered'} array`;
  }

  * iteratorSize() {
    const length = this.items.length === this.length ? 100 : this.length;
    this.initItems(length);
    this.initMarkers();
    yield `Created ${length} elements array`;
  }

  * iteratorStep() {
    this.beforeSort();

    //sort algorithm goes here

    this.afterSort();
    yield 'Sort is complete';
  }

  * iteratorRun() {
    this.beforeSort();
    let iterator;
    let isDone = false;
    while(true) {
      yield 'Press Next to start';
      this.interval = setInterval(() => {
        if (!iterator) {
          iterator = this.iteratorStep();
        }
        if (iterator.next().done) {
          isDone = true;
          this.iterate();
        }
        this.items = [...this.items];
        this.requestUpdate();
      }, this.items.length === this.length ? 200 : 40);
      yield 'Press Next to pause';
      clearInterval(this.interval);
      if (isDone) break;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}