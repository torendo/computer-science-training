import {Marker} from '../classes/marker';
import {PageBaseSort} from './pageBaseSort';

export class PagePartition extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Partition';
    this.partition = -1;
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

    let pivot = 50;
    let left = 0;
    let right = this.items.length - 1;

    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      //search greater than pivot
      while (leftPtr < right && this.items[++leftPtr].value < pivot) {
      }
      //search less than pivot
      while (rightPtr > left && this.items[--rightPtr].value > pivot) {
      }
      if (leftPtr >= rightPtr) {
        break;
      } else {
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
    this.partition = leftPtr;

  * */

  afterSort() {
    super.afterSort();
    this.pivots = [];
  }

  initMarkers() {
    this.markers = [
      new Marker({position: -1, size: 1, color: 'blue', text: 'leftScan'}),
      new Marker({position: -1, size: 1, color: 'blue', text: 'rightScan'}),
      new Marker({position: this.partition, size: 2, color: 'purple', text: 'partition'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    this.markers[2].position = -1;
    let swaps = 0;
    let comparisons = 0;

    let left = 0;
    let right = this.items.length - 1;
    this.pivots = [{
      start: left,
      end: right,
      value: 40 + Math.floor(Math.random() * 20)
    }];
    yield `Pivot value is ${this.pivots[0].value}`;

    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      yield `Will scan ${leftPtr > -1 ? 'again' : ''} from left`;
      this.markers[0].position = leftPtr + 1;
      this.updateStats(swaps, ++comparisons);
      while (leftPtr < right && this.items[++leftPtr].value < this.pivots[0].value) {
        if (leftPtr < right) {
          yield 'Continue left scan';
          this.markers[0].position = leftPtr + 1;
        }
        this.updateStats(swaps, ++comparisons);
      }
      yield 'Will scan from right';
      this.markers[1].position = rightPtr - 1;
      this.updateStats(swaps, ++comparisons);
      while (rightPtr > left && this.items[--rightPtr].value > this.pivots[0].value) {
        if (rightPtr > left) {
          yield 'Continue right scan';
          this.markers[1].position = rightPtr - 1;
        }
        this.updateStats(swaps, ++comparisons);
      }
      if (leftPtr >= rightPtr) {
        yield 'Scans have met';
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++swaps, comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }

    this.partition = leftPtr;
    this.afterSort();
    return 'Arrow shows partition';
  }
}

customElements.define('page-partition', PagePartition);