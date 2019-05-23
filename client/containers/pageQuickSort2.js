import {PageQuickSort1} from './pageQuickSort1';

export class PageQuickSort2 extends PageQuickSort1 {
  constructor() {
    super();
    this.title = 'Quick Sort 2';
  }

  /*
  * algorithm:

    const quickSort = (left, right) => {
    int size = right-left+1;
    if(size <= 3) // Ручная сортировка при малом размере
    manualSort(left, right);
    else // Быстрая сортировка при большом размере
    {
    long median = medianOf3(left, right);
    int partition = partitionIt(left, right, median);
    recQuickSort(left, partition-1);
    recQuickSort(partition+1, right);
    }
    }
    };
    quickSort(0, this.items.length - 1);

  * */

  * partition(left, right, pivot) {
    let leftPtr = left;
    let rightPtr = right - 1;
    while (true) {
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr > left) {
        yield 'Will scan again';
      } else {
        yield `Will scan (${leftPtr + 1}-${rightPtr - 1})`;
      }
      this.comparisons++;
      while (this.items[++leftPtr].value < this.items[pivot].value) {
        if (leftPtr < right) this.comparisons++;
      }
      this.comparisons++;
      while (this.items[--rightPtr].value > this.items[pivot].value) {
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
    return leftPtr;
  }

  leftCenterRightSort(left, center, right) {
    if(this.items[left].value > this.items[center].value) {
      this.swaps++;
      this.items[left].swapWith(this.items[center]);
    }
    if(this.items[left].value > this.items[right].value) {
      this.swaps++;
      this.items[left].swapWith(this.items[right]);
    }
    if(this.items[center].value > this.items[right].value) {
      this.swaps++;
      this.items[center].swapWith(this.items[right]);
    }
  }

  manualSort(left, right) {
    const size = right - left + 1;
    if (size === 2) {
      if(this.items[left].value > this.items[right].value) {
        this.swaps++;
        this.items[left].swapWith(this.items[right]);
      }
    } else if (size === 3) {
      this.leftCenterRightSort(left, right -1, right);
    }
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
      const size = right - left + 1;
      if (size <= 3) {
        if (size === 1) yield `quickSort entry; Array of 1 (${left}-${right}) always sorted`;
        else if (size === 2) yield `quickSort entry; Will sort 2-elements array (${left}-${right})`;
        else if (size === 3) yield `quickSort entry; Will sort left, center, right (${left}-${right - 1}-${right})`;
        this.manualSort(left, right);
        this.updateStats(this.swaps, this.comparisons);
        if (size === 1) yield 'No actions necessary';
        else if (size === 2) yield 'Done 2-element sort';
        else if (size === 3) yield 'Done left-center-right sort';
      } else {
        const median = Math.floor((left + right) / 2);
        yield `quickSort entry; Will sort left, center, right (${left}-${median}-${right})`;
        this.leftCenterRightSort(left, median, right);
        this.updateStats(this.swaps, this.comparisons);
        this.markers[4].position = median;
        yield `Will partition (${left}-${right}); pivot will be ${median}`;
        this.pivots.push({
          start: left,
          end: right,
          value: this.items[median].value
        });
        yield 'Will swap pivot and right-1';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[median].swapWith(this.items[right - 1]);
        this.markers[4].position = right - 1;
        const iterator = this.partition(left, right, right - 1);
        let partition;
        while (true) {
          const iteration = iterator.next();
          if (iteration.done) {
            partition = iteration.value;
            break;
          }
          yield iteration.value;
        }
        callStack.push({state: 'right', left: partition + 1, right: right});
        callStack.push({state: 'left', left: left, right: partition - 1});
      }
    }

    this.afterSort();
    return 'Sort completed';
  }
}

customElements.define('page-quick-sort-2', PageQuickSort2);