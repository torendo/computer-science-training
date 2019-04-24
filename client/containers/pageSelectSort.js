import {PageBubbleSort} from './pageBubbleSort';
import {Marker} from '../classes/marker';

export class PageSelectSort extends PageBubbleSort {
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
    let comparsions = 0;
    let min = 0;
    this.updateStats(swaps, comparsions);
    loopOuter:
    for (let outer = 0; outer < this.length - 1; outer++) {
      min = outer;
      for (let inner = outer + 1; inner < this.length; inner++) {
        yield 'Searching for minimum';
        comparsions++;
        if (this.items[inner].data < this.items[min].data) {
          min = inner;
          this.markers[2].position = min;
        }
        this.markers[0].position++;
        this.updateStats(swaps, comparsions);
        if (this.isAborted) break loopOuter;
      }
      if (min !== outer) {
        yield 'Will swap outer & min';
        this.items[outer].switchDataWith(this.items[min]);
        swaps++;
      } else {
        yield 'Will not be swapped';
        min++;
      }
      this.markers[0].position = outer + 2;
      this.markers[1].position++;
      this.markers[2].position = outer + 1;
      this.updateStats(swaps, comparsions);
    }
    this.afterSort();
    return `Sort is ${this.isAborted ? 'aborted' : 'complete'}`;
  }
}

customElements.define('page-select-sort', PageSelectSort);