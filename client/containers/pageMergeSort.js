import {Marker} from '../classes/marker';
import {Item} from '../classes/item';
import {PageBaseSort} from './pageBaseSort';

export class PageMergeSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Merge Sort';
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

  mergeSort(lower, upper) {
    if (lower !== upper) {
      let mid = Math.floor((lower + upper) / 2);
      this.mergeSort(lower, mid);
      this.mergeSort(mid + 1, upper);
      this.merge(lower, mid + 1, upper);
    }
  }

  merge(lower, mid, upper) {
    let lowerBound = lower;
    let midBound = mid - 1;
    let workSpace = [];
    while (lower <= midBound && mid <= upper) {
      if (this.items[lower].value < this.items[mid].value) {
        workSpace.push(new Item(this.items[lower++]));
      } else {
        workSpace.push(new Item(this.items[mid++]));
      }
    }
    while (lower <= midBound) {
      workSpace.push(new Item(this.items[lower++]));
    }
    while (mid <= upper) {
      workSpace.push(new Item(this.items[mid++]));
    }
    workSpace.forEach((item, i) => {
      this.items[lowerBound + i].copyFrom(item);
    });
  }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'lower'}),
      new Marker({position: 0, size: 2, color: 'red', text: 'upper'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'mid'}),
      new Marker({position: -1, size: 3, color: 'purple', text: 'ptr'}),
    ];
  }

  updateStats(copies = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}`);
  }

  * merge(lower, mid, upper) {
    let lowerBound = lower;
    let midBound = mid - 1;
    let workSpace = [];
    while (lower <= midBound && mid <= upper) {
      this.comparisons++;
      if (this.items[lower].value < this.items[mid].value) {
        workSpace.push(new Item(this.items[lower++]));
      } else {
        workSpace.push(new Item(this.items[mid++]));
      }
    }
    while (lower <= midBound) {
      workSpace.push(new Item(this.items[lower++]));
    }
    while (mid <= upper) {
      workSpace.push(new Item(this.items[mid++]));
    }
    this.markers[2].position = -1;
    this.markers[3].position = lowerBound;
    this.copies += workSpace.length;
    this.updateStats(this.copies, this.comparisons);
    yield `Merged ${lowerBound}-${midBound} and ${midBound + 1}-${upper} into workSpace`;
    for (let i = 0; i < workSpace.length; i++) {
      this.items[lowerBound + i].copyFrom(workSpace[i]);
      this.markers[3].position = lowerBound + i;
      this.updateStats(++this.copies, this.comparisons);
      yield `Copied workspace into ${lowerBound + i}`;
    }
  }

  * iteratorStep() {
    this.beforeSort();
    this.copies = 0;
    this.comparisons = 0;

    const operations = [];
    const mergeSort = (lower, upper) => {
      operations.push({type: 'mergeSortStart', lower: lower, upper: upper});
      if (lower !== upper) {
        let mid = Math.floor((lower + upper) / 2);
        operations.push({type: 'mergeSortLower', lower: lower, upper: mid});
        mergeSort(lower, mid);
        operations.push({type: 'mergeSortUpper', lower: mid + 1, upper: upper});
        mergeSort(mid + 1, upper);
        operations.push({type: 'merge', lower: lower, mid: mid + 1, upper: upper});
      } else {
        operations.push({type: 'mergeSortEnd', lower: lower, upper: upper});
      }
    };
    mergeSort(0, this.items.length - 1);

    yield 'Initial call to mergeSort';
    for (let i = 0; i < operations.length; i++) {
      switch (operations[i].type) {
        case 'mergeSortStart': {
          this.markers[0].position = operations[i].lower;
          this.markers[1].position = operations[i].upper;
          yield `Entering mergeSort: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortEnd': {
          yield `Exiting mergeSort: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortLower': {
          this.markers[2].position =  operations[i].upper;
          yield `Will sort lower half: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortUpper': {
          this.markers[1].position = operations[i].upper;
          this.markers[2].position = operations[i].lower;
          yield `Will sort upper half: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'merge': {
          yield 'Will merge ranges';
          this.markers[0].position = operations[i].lower;
          this.markers[1].position = operations[i].upper;
          const iterator = this.merge(operations[i].lower, operations[i].mid, operations[i].upper);
          while (true) {
            const iteration = iterator.next();
            if (iteration.done) break;
            yield iteration.value;
          }
          this.markers[3].position = -1;
        }
      }
    }

    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-merge-sort', PageMergeSort);