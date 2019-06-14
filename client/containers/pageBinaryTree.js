import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';

export class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(29);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTrav)}>Trav</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="trav-console" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.travConsole = this.querySelector('.trav-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems(length) {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    for (let i = 0; i <= length; i++) {
      let i = 0;
      const value = Math.floor(Math.random() * 100);
      while(arr[i] && arr[i].value != null) {
        i = 2 * i + (arr[i].value > value ? 1 : 2);
      }
      if(arr[i]) arr[i].setValue(value);
    }
    this.items = arr;
  }

  initMarkers() {
    this.marker = new Marker({position: 0});
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of nodes (1 to 31)';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 31 || length < 1) {
      return 'ERROR: use size between 1 and 31';
    }
    yield `Will create tree with ${length} nodes`;
    this.initItems(length);
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of node to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 99';
    }
    yield `Will try to find node with key ${key}`;
    let i = 0;
    let isFound = false;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      if (this.items[i].value === key) {
        isFound = true;
        break;
      }
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    yield `${isFound ? 'Have found' : 'Can\'t find'} node ${key}`;
    yield 'Search is complete';
    this.initMarkers();
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of node to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert node with key ${key}`;
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    if (this.items[i]) {
      this.marker.position = i;
      this.items[i].setValue(key);
      yield `Have inserted node with key ${key}`;
      yield 'Insertion completed';
    } else {
      yield 'Can\'t insert: Level is too great';
    }
    this.initMarkers();
  }

  * iteratorTrav() {
    yield 'Will traverse tree in "inorder"';
    this.travConsole.setMessage('');
    const operations = [];
    function traverse(i, items) {
      if (!items[i] || items[i].value == null) return;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      operations.push({type: 'left', index: left});
      traverse(left, items);
      operations.push({type: 'self', index: i, value: items[i].value});
      operations.push({type: 'right', index: right});
      traverse(right, items);
      operations.push({type: 'exit', index: i});
    }
    traverse(0, this.items);
    while (operations.length > 0) {
      const operation = operations.shift();
      if (this.items[operation.index] && this.items[operation.index].value != null) {
        this.marker.position = operation.index;
      }
      switch (operation.type) {
        case 'self': {
          yield 'Will visit this node';
          this.travConsole.setMessage(this.travConsole.message + ' ' + operation.value);
          break;
        }
        case 'left': {
          yield 'Will check for left child';
          break;
        }
        case 'right': {
          yield 'Will check for right child';
          break;
        }
        case 'exit': {
          yield 'Will go to root of last subtree';
          break;
        }
      }
    }
    yield 'Finish traverse';
    this.travConsole.setMessage('');
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of node to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 99';
    }
    yield `Will try to find node with key ${key}`;
    let i = 0;
    let isFound = false;
    while (this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      if (this.items[i].value === key) {
        isFound = true;
        break;
      }
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    if (isFound) {
      yield 'Have found node to delete';
    } else {
      return 'Can\'t find node to delete';
    }

    const current = this.items[i];
    const leftChild = this.items[2 * i + 1];
    const rightChild = this.items[2 * i + 2];
    //if node has no children
    if ((!leftChild || leftChild.value == null) && (!rightChild || rightChild.value == null)) {
      current.clear();
      yield 'Node was deleted';
    } else if (!rightChild || rightChild.value == null) { //if node has no right child
      yield 'Will replace node with its left subtree';
      this.moveSubtree(leftChild.index, current.index);
      yield 'Node was replaced by its left subtree';
    } else if (!leftChild || leftChild.value == null) { //if node has no left child
      yield 'Will replace node with its right subtree';
      this.moveSubtree(rightChild.index, current.index);
      yield 'Node was replaced by its right subtree';
    } else { //node has two children, find successor
      const successor = this.getSuccessor(current.index);
      yield `Will replace node with ${this.items[successor].value}`;
      const hasRightChild = this.items[2 * successor + 2] && this.items[2 * successor + 2].value != null;
      if (hasRightChild) {
        yield `and replace ${this.items[successor].value} with its right subtree`;
      }
      current.moveFrom(this.items[successor]);
      if (hasRightChild) {
        this.moveSubtree(2 * successor + 2, successor);
        yield 'Removed node in 2-step process';
      } else {
        yield 'Node was replaced by successor';
      }
    }
    this.initMarkers();
  }

  getSuccessor(index) {
    let successor = index;
    let current = 2 * index + 2; //right child
    while(this.items[current] && this.items[current].value != null) {
      successor = current;
      current = 2 * current + 1; //left child
    }
    return successor;
  }

  moveSubtree(from, to) {
    const tempItems = [];
    const items = this.items;
    function recursiveMoveToTemp(from, to) {
      if (!items[from] || items[from].value == null) return;
      tempItems[to] = new Item(items[from]);
      items[from].clear();
      recursiveMoveToTemp(2 * from + 1, 2 * to + 1); //left
      recursiveMoveToTemp(2 * from + 2, 2 * to + 2); //right
    }
    recursiveMoveToTemp(from, to);
    tempItems.forEach((item, index) => { //restore from temp
      this.items[index].moveFrom(item);
    });
  }
}

customElements.define('page-binary-tree', PageBinaryTree);