import {Marker} from '../classes/marker';
import {PageBaseSort} from './pageBaseSort';

export class PageBubbleSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Bubble Sort';
  }

  /*
  * algorithm:

    for (let outer = items.length - 1; outer > 0; outer--) {
      for (let inner = 0; inner < outer; inner++) {
        if (items[inner] > items[inner + 1]) {
          swap(items[inner], items[inner + 1]);
        }
      }
    }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner+1'}),
      new Marker({position: this.length - 1, size: 2, color: 'red', text: 'outer'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    let swaps = 0;
    let comparisons = 0;
    for (let outer = this.length - 1; outer > 0; outer--) {
      for (let inner = 0; inner < outer; inner++) {
        if (this.items[inner].data > this.items[inner + 1].data) {
          yield 'Will be swapped';
          this.items[inner].switchDataWith(this.items[inner + 1]);
          swaps++;
        } else {
          yield 'Will not be swapped';
        }
        this.updateStats(swaps, ++comparisons);
        this.markers[0].position++;
        this.markers[1].position++;
      }
      this.markers[0].position = 0;
      this.markers[1].position = 1;
      this.markers[2].position--;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-bubble-sort', PageBubbleSort);