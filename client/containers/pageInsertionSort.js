import {Marker} from '../classes/marker';
import {Item} from '../classes/item';
import {PageBaseSort} from './pageBaseSort';

export class PageInsertionSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Insertion Sort';
  }

  /*
  * algorithm:

    for (let inner, outer = 1; outer < items.length; outer++) {
      temp = items[outer];
      for (inner = outer; inner > 0 && temp >= items[inner - 1]; inner--) {
        items[inner] = items[inner - 1];
      }
      items[inner] = temp;
    }

  * */

  initItems(length) {
    super.initItems(length);
    this.temp = new Item({value: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 2, color: 'red', text: 'outer'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({value: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparisons = 0;
    for (let inner, outer = 1; outer < this.items.length; outer++) {
      yield 'Will copy outer to temp';
      this.items[outer].swapWith(this.temp);
      copies++;
      for (inner = outer; inner > 0; inner--) {
        this.updateStats(copies, ++comparisons);
        if (this.temp.value >= this.items[inner - 1].value) {
          yield 'Have compared inner-1 and temp: no copy necessary';
          break;
        }
        yield 'Have compared inner-1 and temp: will copy inner to inner-1';
        this.items[inner].swapWith(this.items[inner - 1]);
        this.updateStats(++copies, comparisons);
        this.markers[0].position--;
      }
      yield 'Will copy temp to inner';
      this.temp.swapWith(this.items[inner]);
      this.markers[0].position = outer + 1;
      this.markers[1].position++;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-insertion-sort', PageInsertionSort);