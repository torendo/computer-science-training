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

class XApp extends LitElement {
  render() {
    return html`
      <nav>
        <h1>List of Applets</h1>
        <h2>Chapter 1 — Overview</h2>
        <div class="nav-item">(No applets)</div>
        
        <h2>Chapter 2 — Arrays</h2>
        <div class="nav-item"><a href="#array">1) Array</a></div>
        <div class="nav-item"><a href="#ordered-array">2) OrderedArray</a></div>
        
        <h2>Chapter 3 — Simple Sorting</h2>
        <div class="nav-item"><a href="#bubble-sort">3) Bubble</a></div>
        <div class="nav-item"><a href="#insertion-sort">4) Insertion</a></div>
        <div class="nav-item"><a href="#select-sort">5) Selection</a></div>
        
        <h2>Chapter 4 — Stacks and Queues</h2>
        <div class="nav-item"><a href="#stack">6) Stack</a></div>
        <div class="nav-item"><a href="#queue">7) Queue</a></div>
        <div class="nav-item"><a href="#priority-queue">8) PriorityQ</a></div>
        
        <h2>Chapter 5 — Linked Lists</h2>
        <div class="nav-item"><a href="#link-list">9) LinkList</a></div>
        
        <h2>Chapter 6 — Recursion</h2>
        <div class="nav-item" title="In progress">10) Towers</div>
        <div class="nav-item"><a href="#merge-sort">11) mergeSort</a></div>
        
        <h2>Chapter 7 — Advanced Sorting</h2>
        <div class="nav-item"><a href="#shell-sort">12) shellSort</a></div>
        <div class="nav-item"><a href="#partition">13) partition</a></div>
        <div class="nav-item"><a href="#quick-sort-1">14) quickSort1</a></div>
        <div class="nav-item"><a href="#quick-sort-2">15) quickSort2</a></div>
        
        <h2>Chapter 8 — Binary Trees</h2>
        <div class="nav-item"><a href="#binary-tree">16) Tree</a></div>
        
        <h2>Chapter 9 — Red-black Trees</h2>
        <div class="nav-item"><a href="#redblack-tree">17) RBTree</a></div>
        
        <h2>Chapter 10 — 2-3-4 Trees</h2>
        <div class="nav-item" title="In progress">18) Tree234</div>
        
        <h2>Chapter 11 — Hash Tables</h2>
        <div class="nav-item"><a href="#hash-table">19-20) Hash/HashDouble</a></div>
        <div class="nav-item"><a href="#hash-chain">21) HashChain</a></div>
        
        <h2>Chapter 12 — Heaps</h2>
        <div class="nav-item"><a href="#heap">22) Heap</a></div>
        
        <h2>Chapter 13 — Graphs</h2>
        <div class="nav-item"><a href="#graph-n">23) GraphN</a></div>
        <div class="nav-item"><a href="#graph-d">24) GraphD</a></div>
        
        <h2>Chapter 14 — Weighted Graphs</h2>
        <div class="nav-item"><a href="#graph-w">25) GraphW</a></div>
        <div class="nav-item"><a href="#graph-dw">26) GraphDW</a></div>
      </nav>
      <x-view component="page-start"></x-view>      
      <footer>Built by Stanislav Proshkin with ❤ and WebComponents</footer>
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.view = this.querySelector('x-view');
    this.loadView();
    this.hashChangeCallback = this.loadView.bind(this);
    window.addEventListener('hashchange', this.hashChangeCallback, false);
  }
  
  disconnectedCallback() {
    window.removeEventListener('hashchange', this.hashChangeCallback);
  }

  loadView() {
    const hash = location.hash.substring(1);
    if (hash !== '' && customElements.get('page-' + hash) != null) {
      this.view.component = 'page-' + hash;
      this.view.scrollIntoView();
    }
  }
}

customElements.define('x-app', XApp);