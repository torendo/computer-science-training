import {PageBubbleSort} from './pageBubbleSort';
import {Marker} from '../classes/marker';
import {Item} from '../classes/item';

export class PageMergeSort extends PageBubbleSort {
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

  initItems() {
    super.initItems();
    this.temp = new Item({data: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 2, color: 'red', text: 'outer'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparsions = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparsions: ${comparsions}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({data: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparsions = 0;
    this.updateStats(copies, comparsions);
    loopOuter:
    for (let inner, outer = 1; outer < this.length; outer++) {
      yield 'Will copy outer to temp';
      this.items[outer].switchDataWith(this.temp);
      copies++;
      for (inner = outer; inner > 0; inner--) {
        comparsions++;
        if (this.temp.data >= this.items[inner - 1].data) {
          yield 'Have compared inner-1 and temp: no copy necessary';
          this.updateStats(copies, comparsions);
          break;
        }
        yield 'Have compared inner-1 and temp: will copy inner to inner-1';
        this.items[inner].switchDataWith(this.items[inner - 1]);
        copies++;
        this.updateStats(copies, comparsions);
        this.markers[0].position--;
        if (this.isAborted) break loopOuter;
      }
      yield 'Will copy temp to inner';
      this.temp.switchDataWith(this.items[inner]);
      this.markers[0].position = outer + 1;
      this.markers[1].position++;
      if (this.isAborted) break;
    }
    this.afterSort();
    return `Sort is ${this.isAborted ? 'aborted' : 'complete'}`;
  }
}

customElements.define('page-merge-sort', PageMergeSort);