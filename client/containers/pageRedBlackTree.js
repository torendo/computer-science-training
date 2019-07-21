import {PageBase} from './pageBase';
import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBinaryTree} from './pageBinaryTree';

export class PageRedBlackTree extends PageBase {
  constructor() {
    super();
    this.init();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.init.bind(this)}>Start</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFlip)}>Flip</x-button>
        
        <x-button .callback=${this.rotateRoL.bind(this)}>RoL</x-button>
        
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRoR)}>RoR</x-button>
        
        <x-button .callback=${this.swichRB.bind(this)}>R/B</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${item => this.marker.position = item.index}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.correctnessConsole = this.querySelector('.console-stats');
    this.dialog = this.querySelector('x-dialog');
  }

  handleClick() {
    const result = super.handleClick(...arguments);
    this.checkRules();
    return result;
  }

  init() {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    arr[0].setValue(50);
    this.items = arr;
    this.marker = new Marker({position: 0});
    if (this.console) {
      this.checkRules();
    }
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
    let i = 0;
    let isLeft = false;
    while(this.items[i] && this.items[i].value != null) {
      isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
    }
    if (this.items[i]) {
      const parentI = Math.floor((i - 1) / 2);
      const grandParentI = Math.floor((parentI - 1) / 2);
      //if parent is red, grandParent is black and second child of grandParent is red
      if (this.items[parentI].mark && this.items[grandParentI] && !this.items[grandParentI].mark && this.items[2 * grandParentI + (isLeft ? 2 : 1)].mark) {
        this.marker.position = grandParentI;
        return 'CAN\'T INSERT: Needs color flip';
      } else {
        this.marker.position = i;
        this.items[i].setValue(key);
        this.items[i].mark = true;
      }
    } else {
      return 'CAN\'T INSERT: Level is too great';
    }
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of node to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      if (this.items[i].value === key) break;
      i = 2 * i + (this.items[i].value > key ? 1 : 2);
    }
    if (!this.items[i] || this.items[i].value == null) {
      return 'Can\'t find node to delete';
    }

    const current = this.items[i];
    const leftChild = this.items[2 * i + 1];
    const rightChild = this.items[2 * i + 2];
    //if node has no children
    if ((!leftChild || leftChild.value == null) && (!rightChild || rightChild.value == null)) {
      this.items[i].mark = false;
      current.clear();
    } else if (!rightChild || rightChild.value == null) { //if node has no right child
      PageBinaryTree.moveSubtree(leftChild.index, current.index, this.items);
    } else if (!leftChild || leftChild.value == null) { //if node has no left child
      PageBinaryTree.moveSubtree(rightChild.index, current.index, this.items);
    } else { //node has two children, find successor
      const successor = PageBinaryTree.getSuccessor(current.index, this.items);
      const hasRightChild = this.items[2 * successor + 2] && this.items[2 * successor + 2].value != null;
      current.moveFrom(this.items[successor]);
      if (hasRightChild) {
        PageBinaryTree.moveSubtree(2 * successor + 2, successor, this.items);
      }
    }
  }

  checkRules() {
    let error = null;
    //1. Each node is red or black
    //2. Root node is always black
    if (this.items[0].mark) {
      error = 'ERROR: Root must be black';
    }
    //3. Red node has black children
    this.items.forEach((item, i) => {
      const leftChild = this.items[2 * i + 1];
      const rightChild = this.items[2 * i + 2];
      if (leftChild == null) return;
      if (item.mark && (leftChild.mark || rightChild.mark)) {
        error = 'ERROR: Parent and child are both red!';
        this.marker.position = item.index;
      }
    });
    //4. All routes from root to node or empty child have same black height
    let counter = 1;
    let cur = null;
    function traverse(i, items) {
      if (!items[i] || items[i].value == null) return;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      //left
      if (items[left] && !items[left].mark && items[left].value != null) counter++;
      traverse(left, items);
      //self, leaf
      if ((!items[left] || items[left].value == null) && (!items[right] || items[right].value == null)) {
        if (cur != null && counter !== cur) {
          error = 'ERROR: Black counts differ!';
        } else {
          cur = counter;
        }
      }
      //right
      if (items[right] && !items[right].mark && items[right].value != null) counter++;
      traverse(right, items);
      //self, exit
      if (!items[i].mark) counter--;
    }
    if (error == null) {
      traverse(0, this.items);
    }

    this.correctnessConsole.setMessage(error || 'Tree is red-black correct');
    this.requestUpdate();
  }

  * iteratorFlip() {
    const parent = this.items[this.marker.position];
    const leftChild = this.items[2 * this.marker.position + 1];
    const rightChild = this.items[2 * this.marker.position + 2];
    if (!leftChild || !rightChild || leftChild.value == null || rightChild.value == null) {
      return 'Node has no children';
    } else if (parent.index === 0 && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
    } else if (parent.mark !== leftChild.mark && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
      parent.mark = !parent.mark;
    } else {
      return 'Can\'t flip this color arrangement';
    }
  }

  rotateRoL() {

  }

  * iteratorRoR() {
    const top = this.marker.position;
    const left = 2 * top + 1;
    const right = 2 * top + 2;
    if (!this.items[left] || this.items[left].value == null) {
      return 'Can\'t rotate';
    }
    if (this.items[right] && this.items[right].value != null) {
      PageBinaryTree.moveSubtree(right, 2 * right + 2, this.items);
    }
    this.items[right].moveFrom(this.items[top]);
    this.items[top].moveFrom(this.items[left]);
    const leftGrandRight = 2 * left + 2;
    if (this.items[leftGrandRight] && this.items[leftGrandRight].value != null) {
      PageBinaryTree.moveSubtree(leftGrandRight, 2 * right + 1, this.items);
    }
    const leftGrandLeft = 2 * left + 1;
    if (this.items[leftGrandLeft] && this.items[leftGrandLeft].value != null) {
      PageBinaryTree.moveSubtree(leftGrandLeft, left, this.items);
    }
  }

  swichRB() {
    this.items[this.marker.position].mark = !this.items[this.marker.position].mark;
    this.checkRules();
  }
}

customElements.define('page-redblack-tree', PageRedBlackTree);