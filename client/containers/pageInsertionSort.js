import {PageBubbleSort} from './pageBubbleSort';
import {Marker} from '../classes/marker';
import {Item} from '../classes/item';

export class PageInsertionSort extends PageBubbleSort {
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
}

customElements.define('page-insertion-sort', PageInsertionSort);