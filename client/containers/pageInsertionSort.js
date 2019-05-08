import {PageBubbleSort} from './pageBubbleSort';
import {Marker} from '../classes/marker';

export class PageInsertionSort extends PageBubbleSort {
  constructor() {
    super();
    this.title = 'Merge Sort';
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

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'lower'}),
      new Marker({position: 0, size: 2, color: 'red', text: 'upper'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'mid'}),
      new Marker({position: -1, size: 3, color: 'purple', text: 'xz'})
    ];
  }

  updateStats(copies = 0, comparsions = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparsions: ${comparsions}`);
  }

  afterSort() {
    super.afterSort();

  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparsions = 0;
    this.updateStats(copies, comparsions);





    //magic



    this.afterSort();
    return `Sort is ${this.isAborted ? 'aborted' : 'complete'}`;
  }
}

customElements.define('page-insertion-sort', PageInsertionSort);