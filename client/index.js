import {LitElement, html} from 'lit-element';
import './components/routerA';
import './components/router';
import './containers/footer';

import './containers/pageArray';
import './containers/pageOrderedArray';
import './containers/pageBubbleSort';
import './containers/pageSelectSort';
import './containers/pageInsertionSort';
import './containers/pageStack';
import './containers/pageQueue';
import './containers/pagePriorityQueue';
import './containers/pageLinkList';
import './containers/pageMergeSort';
import './containers/pageShellSort';
import './containers/pagePartition';
import './containers/pageQuickSort1';
import './containers/pageQuickSort2';
import './containers/pageBinaryTree';
import './containers/pageRedBlackTree';
import './containers/pageHashTable';
import './containers/pageHashChain';
import './containers/pageHeap';
import './containers/pageGraphN';
import './containers/pageGraphD';
import './containers/pageGraphW';
import './containers/pageGraphDW';

const routes = [
  {path: '/array', component: 'page-array', title: 'Array'},
  {path: '/orderedArray', component: 'page-ordered-array', title: 'Ordered Array'},
  {path: '/bubbleSort', component: 'page-bubble-sort', title: 'Bubble Sort'},
  {path: '/selectSort', component: 'page-select-sort', title: 'Select Sort'},
  {path: '/insertionSort', component: 'page-insertion-sort', title: 'Insertion Sort'},
  {path: '/stack', component: 'page-stack', title: 'Stack'},
  {path: '/queue', component: 'page-queue', title: 'Queue'},
  {path: '/priorityQueue', component: 'page-priority-queue', title: 'Prioriy Queue'},
  {path: '/linkList', component: 'page-link-list', title: 'Link List'},
  {path: '/mergeSort', component: 'page-merge-sort', title: 'Merge Sort'},
  {path: '/shellSort', component: 'page-shell-sort', title: 'Shell Sort'},
  {path: '/partition', component: 'page-partition', title: 'Partition'},
  {path: '/quickSort1', component: 'page-quick-sort-1', title: 'Quick Sort 1'},
  {path: '/quickSort2', component: 'page-quick-sort-2', title: 'Quick Sort 2'},
  {path: '/binaryTree', component: 'page-binary-tree', title: 'Binary Tree'},
  {path: '/redBlackTree', component: 'page-redblack-tree', title: 'Red-Black Tree'},
  {path: '/hashTable', component: 'page-hash-table', title: 'Hash Table'},
  {path: '/hashChain', component: 'page-hash-chain', title: 'Hash Chain'},
  {path: '/heap', component: 'page-heap', title: 'Heap'},
  {path: '/graphN', component: 'page-graph-n', title: 'Non-Directed Non-Weighted Graph'},
  {path: '/graphD', component: 'page-graph-d', title: 'Directed Non-Weighted Graph'},
  {path: '/graphW', component: 'page-graph-w', title: 'Weighted, Undirected Graph'},
  {path: '/graphDW', component: 'page-graph-dw', title: 'Directed, Weighted Graph'}
];

class XApp extends LitElement {
  render() {
    return html`
      <h3>Workshop applications</h3>
      <nav>
        ${routes.map(route => html`<div class="nav-item"><a href="${route.path}" is="x-router-a">${route.title}</a></div>`)}
      </nav>
      <x-router .routes=${routes}></x-router>      
      <x-footer></x-footer>
    `;
    //TODO: add buttons description from Java applets
    //TODO: add short version of provided algorithms on the same page
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);