import {Marker} from '../classes/marker';
import {PageBaseSort} from './pageBaseSort';

export class PageSelectSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Select Sort';
  }

  /*
  * algorithm:

    for (let outer = 0; outer < items.length - 1; outer++) {
      min = outer;
      for (let inner = outer + 1; inner < items.length; inner++) {
        if (items[inner] < items[min]) {
          min = inner;
        }
      }
      swap(items[outer], items[min]);
    }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 0, size: 2, color: 'red', text: 'outer'}),
      new Marker({position: 0, size: 3, color: 'purple', text: 'min'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    let swaps = 0;
    let comparisons = 0;
    let min = 0;
    for (let outer = 0; outer < this.items.length - 1; outer++) {
      min = outer;
      for (let inner = outer + 1; inner < this.items.length; inner++) {
        yield 'Searching for minimum';
        if (this.items[inner].data < this.items[min].data) {
          min = inner;
          this.markers[2].position = min;
        }
        this.markers[0].position++;
        this.updateStats(swaps, ++comparisons);
      }
      if (min !== outer) {
        yield 'Will swap outer & min';
        this.items[outer].switchDataWith(this.items[min]);
        this.updateStats(++swaps, comparisons);
      } else {
        yield 'Will not be swapped';
      }
      this.markers[0].position = outer + 2;
      this.markers[1].position++;
      this.markers[2].position = outer + 1;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-select-sort', PageSelectSort);