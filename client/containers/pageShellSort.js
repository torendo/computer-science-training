import {Marker} from '../classes/marker';
import {Item} from '../classes/item';
import {PageBaseSort} from './pageBaseSort';

export class PageShellSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Shell Sort';
  }

  /*
  * algorithm:

    let h = 1;
    //calculate maximum possible h
    while (h <= (this.items.length - 1) / 3) {
      h = h * 3 + 1;
    }
    //consistent reduce h
    while (h > 0) {
      //h-sort
      for (let outer = h; outer < this.items.length; outer++) {
        this.items[outer].swapWith(this.temp);
        let inner = outer;
        while (inner > h - 1 && this.temp.value <= this.items[inner - h].value) {
          this.items[inner].swapWith(this.items[inner - h]);
          inner -= h;
        }
        this.temp.swapWith(this.items[inner]);
      }
      //reduce h
      h = (h - 1) / 3;
    }

  * */

  initItems(length) {
    super.initItems(length);
    this.temp = new Item({value: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: -1, size: 1, color: 'red', text: 'outer'}),
      new Marker({position: -1, size: 2, color: 'blue', text: 'inner'}),
      new Marker({position: -1, size: 3, color: 'blue', text: 'inner-h'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparisons = 0, h = 1) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}, h=${h}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({value: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparisons = 0;
    let h = 1;
    //calculate maximum possible h
    while (h <= (this.items.length - 1) / 3) {
      h = h * 3 + 1;
    }
    //consistent reduce h
    while (h > 0) {
      //h-sort
      this.updateStats(copies, comparisons, h);
      for (let outer = h; outer < this.items.length; outer++) {
        let inner = outer;
        this.markers[0].position = outer;
        this.markers[1].position = inner;
        this.markers[2].position = inner - h;
        yield `${h}-sorting array. Will copy outer to temp`;
        this.updateStats(++copies, comparisons, h);
        this.items[outer].swapWith(this.temp);
        yield 'Will compare inner-h and temp';
        this.updateStats(copies, ++comparisons, h);
        while (inner > h - 1 && this.temp.value <= this.items[inner - h].value) {
          yield 'inner-h >= temp; Will copy inner-h to inner';
          this.updateStats(++copies, comparisons, h);
          this.items[inner].swapWith(this.items[inner - h]);
          inner -= h;
          this.markers[1].position = inner;
          this.markers[2].position = inner - h;
          if (inner <= h - 1) {
            yield 'There is no inner-h';
          } else {
            yield 'Will compare inner-h and temp';
            this.updateStats(copies, ++comparisons, h);
          }
        }
        yield `${inner <= h - 1 ? '' : 'inner-h < temp; '}Will copy temp to inner`;
        this.updateStats(++copies, comparisons, h);
        this.temp.swapWith(this.items[inner]);
      }
      //reduce h
      h = (h - 1) / 3;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-shell-sort', PageShellSort);