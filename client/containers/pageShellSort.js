import {Marker} from '../classes/marker';
import {Item} from '../classes/item';
import {PageBaseSort} from './pageBaseSort';

export class PageShellSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Shell Sort';
  }

  /*
  * algorithm:


  * */

  initItems() {
    super.initItems();
    this.temp = new Item({data: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: -1, size: 1, color: 'red', text: 'outer'}),
      new Marker({position: -1, size: 2, color: 'blue', text: 'inner'}),
      new Marker({position: -1, size: 3, color: 'blue', text: 'inner-h'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparisons = 0, h = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}, h=${h}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({data: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparisons = 0;
    let h = 0;

    //algorithm goes here
    /*
    int inner, outer;
    long temp;
    int h = 1; // Вычисление исходного значения h
    while(h <= nElems/3)
      h = h*3 + 1; // (1, 4, 13, 40, 121, ...)
    while(h>0) // Последовательное уменьшение h до 1
    {
      // h-сортировка файла
      for(outer=h; outer<nElems; outer++)
      {
        temp = theArray[outer];
        inner = outer;
        // Первый подмассив (0, 4, 8)
        while(inner > h-1 && theArray[inner-h] >= temp)
        {
          theArray[inner] = theArray[inner-h];
          inner -= h;
        }
        theArray[inner] = temp;
      }
      h =(h-1) / 3; // Уменьшение h
    }
    * */

    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-shell-sort', PageShellSort);