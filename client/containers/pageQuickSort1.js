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
      const pivot = this.items[right].value;
      partition(left, right, pivot);
      quickSort(left, pivot - 1);
      quickSort(pivot + 1, right);
    };
    quickSort(0, this.items.length - 1);

  * */

  initMarkers() {
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
      while (leftPtr < right && this.items[++leftPtr].value < pivot) {
        this.comparisons++;
      }
      this.comparisons++;
      while (rightPtr > left && this.items[--rightPtr].value > pivot) {
        this.comparisons++;
      }
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= rightPtr) {
        yield 'Scans have met. Will swap pivot and leftScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[pivot]);
        yield `Array partitioned: left (${left}-${leftPtr - 1}), right (${leftPtr + 1}-${right}) `;
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
  }

  * iteratorStep() {
    this.beforeSort();
    this.swaps = 0;
    this.comparisons = 0;

    let left = 0;
    let right = this.items.length - 1;
    let pivot;
    let useStack = false;
    const stack = [];
    while (true) {
      if (right - left < 1) {
        //operations.push({type: 'quickSortEnd', left, right});
        useStack = true;
        return;
      }
      pivot = right;
      // operations.push({type: 'quickSortStart', left, right, pivot});
      // operations.push({type: 'partition', left, right, pivot});
      if (useStack) {
        // operations.push({type: 'quickSortRight', left: pivot + 1, right});
        // quickSort(pivot + 1, right);
        const borders = stack.unshift();
        left = borders.left;
        right = borders.right;
      } else {
        // operations.push({type: 'quickSortLeft', left, right: pivot - 1});
        // quickSort(left, pivot - 1);
        right = pivot - 1;
        stack.push({left: pivot + 1, right});
      }
    }

    const operations = [];
    const quickSort = (left, right) => {
      if (right - left < 1) {
        operations.push({type: 'quickSortEnd', left, right});
        return;
      }
      const pivot = right;
      operations.push({type: 'quickSortStart', left, right, pivot});
      operations.push({type: 'partition', left, right, pivot});

      operations.push({type: 'quickSortLeft', left, right: pivot - 1});
      quickSort(left, pivot - 1);
      operations.push({type: 'quickSortRight', left: pivot + 1, right});
      quickSort(pivot + 1, right);
    };
    quickSort(0, this.items.length - 1);

    yield 'Initial call to quickSort';
    for (let i = 0; i < operations.length; i++) {
      switch (operations[i].type) {
        case 'quickSortStart': {
          this.pivots.push({
            start: operations[i].left,
            end: operations[i].right,
            value: this.items[operations[i].pivot].value
          });
          yield `Entering quickSort; Will partition (${operations[i].left}-${operations[i].right})`;
          break;
        }
        case 'quickSortEnd': {
          yield `Entering quickSort; Partition (${operations[i].left}-${operations[i].right}) is too small to sort`;
          break;
        }
        case 'quickSortLeft': {
          this.markers[0].position = operations[i].left;
          this.markers[1].position = operations[i].left;
          this.markers[2].position = operations[i].right;
          this.markers[3].position = operations[i].right - 1;
          this.markers[4].position = operations[i].right;
          yield `Will sort left partition (${operations[i].left}-${operations[i].right})`;
          break;
        }
        case 'quickSortRight': {
          this.markers[0].position = operations[i].left;
          this.markers[1].position = operations[i].left;
          this.markers[2].position = operations[i].right;
          this.markers[3].position = operations[i].right - 1;
          this.markers[4].position = operations[i].right;
          yield `Will sort right partition (${operations[i].left}-${operations[i].right})`;
          break;
        }
        case 'partition': {
          const iterator = this.partition(operations[i].left, operations[i].pivot, operations[i].right);
          while (true) {
            const iteration = iterator.next();
            if (iteration.done) break;
            yield iteration.value;
          }
        }
      }
    }

    this.afterSort();
    return 'Sort completed';
  }
}

customElements.define('page-quick-sort-1', PageQuickSort1);