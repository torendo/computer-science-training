import {Marker} from '../classes/marker';
import {PageBaseSort} from './pageBaseSort';

export class PagePartition extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Partition';
  }

  /*
  * algorithm:



  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner+1'}),
      new Marker({position: this.items.length - 1, size: 2, color: 'red', text: 'outer'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    let swaps = 0;
    let comparisons = 0;

    this.pivot = 40 + Math.floor(Math.random() * 20);
    yield `Pivot value is ${this.pivot}`;



    this.afterSort();
    return 'Partition is complete';
  }
}

customElements.define('page-partition', PagePartition);