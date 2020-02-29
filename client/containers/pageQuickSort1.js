import {Marker} from '../classes/marker';
import {PageBaseSort} from './pageBaseSort';

export class PageQuickSort1 extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Quick Sort 1';
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

    const quickSort = (left, right) => {
      if (right - left < 1) return;
      const pivot = right;
      partition(left, right, pivot);
      quickSort(left, pivot - 1);
      quickSort(pivot + 1, right);
    };
    quickSort(0, this.items.length - 1);

  * */

  initMarkers() {
    this.pivots = [];
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'left'}),
      new Marker({position: 0, size: 2, color: 'blue', text: 'leftScan'}),
      new Marker({position: this.items.length - 1, size: 1, color: 'red', text: 'right'}),
      new Marker({position: this.items.length - 2, size: 2, color: 'blue', text: 'rightScan'}),
      new Marker({position: this.items.length - 1, size: 3, color: 'purple', text: 'pivot'}),
    ];
  }

  * partition(left, right, pivot) {
    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= left) {
        yield 'Will scan again';
      } else {
        yield `leftScan = ${leftPtr}, rightScan = ${rightPtr}; Will scan`;
      }
      this.comparisons++;
      while (this.items[++leftPtr].value < this.items[pivot].value) {
        if (leftPtr < right) this.comparisons++;
      }
      this.comparisons++;
      while (rightPtr > 0 && this.items[--rightPtr].value > this.items[pivot].value) {
        this.comparisons++;
      }
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= rightPtr) {
        yield 'Scans have met. Will swap pivot and leftScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[pivot]);
        yield `Array partitioned: left (${left}-${leftPtr - 1}), right (${leftPtr + 1}-${right + 1}) `;
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
    return leftPtr;
  }

  * iteratorStep() {
    this.beforeSort();
    this.swaps = 0;
    this.comparisons = 0;

    const callStack = [{state: 'initial', left: 0, right: this.items.length - 1}];
    while (callStack.length > 0) {
      let {state, left, right} = callStack.pop();
      if (state !== 'initial') {
        this.markers[0].position = left;
        this.markers[1].position = left;
        this.markers[2].position = right;
        this.markers[3].position = right - 1;
        this.markers[4].position = right;
        yield `Will sort ${state} partition (${left}-${right})`;
      }
      if (right - left < 1) {
        yield `Entering quickSort; Partition (${left}-${right}) is too small to sort`;
      } else {
        this.pivots.push({
          start: left,
          end: right,
          value: this.items[right].value
        });
        yield `Entering quickSort; Will partition (${left}-${right})`;
        let pivot = yield* this.partition(left, right - 1, right);
        callStack.push({state: 'right', left: pivot + 1, right: right});
        callStack.push({state: 'left', left: left, right: pivot - 1});
      }
    }

    this.afterSort();
    return 'Sort completed';
  }
}

customElements.define('page-quick-sort-1', PageQuickSort1);