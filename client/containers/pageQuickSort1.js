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

  //TODO: take this from Partition class
  * partition(left, right, pivot) {
    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      yield `Will scan ${leftPtr > -1 ? 'again' : ''} from left`;
      this.markers[0].position = leftPtr + 1;
      this.updateStats(this.swaps, ++this.comparisons);
      while (leftPtr < right && this.items[++leftPtr].value < pivot) {
        if (leftPtr < right) {
          yield 'Continue left scan';
          this.markers[0].position = leftPtr + 1;
        }
        this.updateStats(this.swaps, ++this.comparisons);
      }
      yield 'Will scan from right';
      this.markers[1].position = rightPtr - 1;
      this.updateStats(this.swaps, ++this.comparisons);
      while (rightPtr > left && this.items[--rightPtr].value > pivot) {
        if (rightPtr > left) {
          yield 'Continue right scan';
          this.markers[1].position = rightPtr - 1;
        }
        this.updateStats(this.swaps, ++this.comparisons);
      }
      if (leftPtr >= rightPtr) {
        yield 'Scans have met';
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
    this.markers[2].position = -1;
    this.swaps = 0;
    this.comparisons = 0;

    const operations = [];
    const quickSort = (left, right) => {
      operations.push({type: 'quickSortStart', left, right});
      if (right - left < 1) return;
      const pivot = this.items[right].value;
      operations.push({type: 'partition', left, right, pivot});
      quickSort(left, pivot - 1);
      quickSort(pivot + 1, right);
    };
    quickSort(0, this.items.length - 1);

    yield 'Initial call to quickSort';
    for (let i = 0; i < operations.length; i++) {
      switch (operations[i].type) {
        case 'quickSortStart': {
          yield `Entering quickSort; Will partition (${operations[i].left}-${operations[i].right})`;
          break;
        }
        case 'mergeSortEnd': {
          yield `Exiting mergeSort: ${operations[i].left}-${operations[i].right}`;
          break;
        }
        case 'mergeSortLower': {
          yield `Will sort lower half: ${operations[i].left}-${operations[i].right}`;
          break;
        }
        case 'mergeSortUpper': {
          yield `Will sort upper half: ${operations[i].left}-${operations[i].right}`;
          break;
        }
        case 'partition': {
          const iterator = this.merge(operations[i].left, operations[i].pivot, operations[i].right);
          while (true) {
            const iteration = iterator.next();
            if (iteration.done) break;
            yield iteration.value;
          }
        }
      }
    }

    this.afterSort();
    return 'Arrow shows partition';
  }
}

customElements.define('page-quick-sort-1', PageQuickSort1);