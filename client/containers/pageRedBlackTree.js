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
        <x-button .callback=${this.flip.bind(this)}>Flip</x-button>
        
        <x-button .callback=${this.swichRB.bind(this)}>RoL</x-button>
        <x-button .callback=${this.swichRB.bind(this)}>RoR</x-button>
        
        <x-button .callback=${this.swichRB.bind(this)}>R/B</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${item => this.marker.position = item.index}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
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
      this.requestUpdate();
    }
  }

  * iteratorIns() {
    if (this.isColorRuleFail) return;
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
    while(this.items[i] && this.items[i].value != null) {
      i = 2 * i + (this.items[i].value > key ? 1 : 2);
    }
    if (this.items[i]) {
      this.marker.position = i;
      this.items[i].setValue(key);
      this.items[i].mark = true;
    } else {
      yield 'Can\'t insert: Level is too great';
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
    let error = 'Tree is red-black correct';
    if (this.items[0].mark) {
      error = 'ERROR: Root must be black';
    }
    this.isColorRuleFail = false;
    this.items.forEach((item, i) => {
      const leftChild = this.items[2 * i + 1];
      const rightChild = this.items[2 * i + 2];
      if (leftChild == null) return;
      if (item.mark && (leftChild.mark || rightChild.mark)) {
        error = 'ERROR: Parent and child are both red!';
        this.marker.position = item.index;
        this.isColorRuleFail = true;
        //TODO: something
        // } else if (...) {
        //   this.marker.position = item.index;
        //   error = 'ERROR: Black counts differ!';
      }
    });
    this.console.setMessage(error);
  }

  //TODO switch to generator
  flip() {
    const parent = this.items[this.marker.position];
    const leftChild = this.items[2 * this.marker.position + 1];
    const rightChild = this.items[2 * this.marker.position + 2];
    if (!leftChild || !rightChild || leftChild.value == null || rightChild.value == null) {
      this.console.setMessage('Node has no children');
    } else if (parent.index === 0 && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
    } else if (parent.mark !== leftChild.mark && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
      parent.mark = !parent.mark;
    } else {
      this.console.setMessage('Can\'t flip this color arrangement');
    }
    this.checkRules();
    this.requestUpdate();
  }

  swichRB() {
    this.items[this.marker.position].mark = !this.items[this.marker.position].mark;
    this.checkRules();
    this.requestUpdate();
  }
}

customElements.define('page-redblack-tree', PageRedBlackTree);