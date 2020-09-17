import {LitElement, html} from 'lit-element';
import './components/view';

import './containers/pageStart';
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

let view;
const routes = {
  '#array': 'page-array',
  '#orderedArray': 'page-ordered-array',
  '#bubbleSort': 'page-bubble-sort',
  '#selectSort': 'page-select-sort',
  '#insertionSort': 'page-insertion-sort',
  '#stack': 'page-stack',
  '#queue': 'page-queue',
  '#priorityQueue': 'page-priority-queue',
  '#linkList': 'page-link-list',
  '#mergeSort': 'page-merge-sort',
  '#shellSort': 'page-shell-sort',
  '#partition': 'page-partition',
  '#quickSort1': 'page-quick-sort-1',
  '#quickSort2': 'page-quick-sort-2',
  '#binaryTree': 'page-binary-tree',
  '#redBlackTree': 'page-redblack-tree',
  '#hashTable': 'page-hash-table',
  '#hashChain': 'page-hash-chain',
  '#heap': 'page-heap',
  '#graphN': 'page-graph-n',
  '#graphD': 'page-graph-d',
  '#graphW': 'page-graph-w',
  '#graphDW': 'page-graph-dw'
};

class XApp extends LitElement {
  render() {
    return html`
      <nav>
        <h1>List of Applets</h1>
        <h2>Chapter 1 — Overview</h2>
        <div class="nav-item">(No applets)</div>
        
        <h2>Chapter 2 — Arrays</h2>
        <div class="nav-item"><a href="#array">1) Array</a></div>
        <div class="nav-item"><a href="#orderedArray">2) OrderedArray</a></div>
        
        <h2>Chapter 3 — Simple Sorting</h2>
        <div class="nav-item"><a href="#bubbleSort">3) Bubble</a></div>
        <div class="nav-item"><a href="#insertionSort">4) Insertion</a></div>
        <div class="nav-item"><a href="#selectSort">5) Selection</a></div>
        
        <h2>Chapter 4 — Stacks and Queues</h2>
        <div class="nav-item"><a href="#stack">6) Stack</a></div>
        <div class="nav-item"><a href="#queue">7) Queue</a></div>
        <div class="nav-item"><a href="#priorityQueue">8) PriorityQ</a></div>
        
        <h2>Chapter 5 — Linked Lists</h2>
        <div class="nav-item"><a href="#linkList">9) LinkList</a></div>
        
        <h2>Chapter 6 — Recursion</h2>
        <div class="nav-item" title="In progress">10) Towers</div>
        <div class="nav-item"><a href="#mergeSort">11) mergeSort</a></div>
        
        <h2>Chapter 7 — Advanced Sorting</h2>
        <div class="nav-item"><a href="#shellSort">12) shellSort</a></div>
        <div class="nav-item"><a href="#partition">13) partition</a></div>
        <div class="nav-item"><a href="#quickSort1">14) quickSort1</a></div>
        <div class="nav-item"><a href="#quickSort2">15) quickSort2</a></div>
        
        <h2>Chapter 8 — Binary Trees</h2>
        <div class="nav-item"><a href="#binaryTree">16) Tree</a></div>
        
        <h2>Chapter 9 — Red-black Trees</h2>
        <div class="nav-item"><a href="#redBlackTree">17) RBTree</a></div>
        
        <h2>Chapter 10 — 2-3-4 Trees</h2>
        <div class="nav-item" title="In progress">18) Tree234</div>
        
        <h2>Chapter 11 — Hash Tables</h2>
        <div class="nav-item"><a href="#hashTable">19-20) Hash/HashDouble</a></div>
        <div class="nav-item"><a href="#hashChain">21) HashChain</a></div>
        
        <h2>Chapter 12 — Heaps</h2>
        <div class="nav-item"><a href="#heap">22) Heap</a></div>
        
        <h2>Chapter 13 — Graphs</h2>
        <div class="nav-item"><a href="#graphN">23) GraphN</a></div>
        <div class="nav-item"><a href="#graphD">24) GraphD</a></div>
        
        <h2>Chapter 14 — Weighted Graphs</h2>
        <div class="nav-item"><a href="#graphW">25) GraphW</a></div>
        <div class="nav-item"><a href="#graphDW">26) GraphDW</a></div>
      </nav>
      <x-view component="page-start"></x-view>      
      <footer>Built by Stanislav Proshkin with ❤ and WebComponents</footer>
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    view = this.querySelector('x-view');
    this.loadView();
    window.addEventListener('hashchange', this.loadView, false);
  }
  
  disconnectedCallback() {
    window.removeEventListener('hashchange', this.loadView);
  }

  loadView() {
    const hash = location.hash;
    if (hash !== '') {
      view.component = routes[hash];
      view.scrollIntoView();
    }
  }
}

customElements.define('x-app', XApp);