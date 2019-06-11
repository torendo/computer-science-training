import {html} from 'lit-element';
import {Item} from '../classes/item';
import {Marker} from '../classes/marker';
import {PageBase} from './pageBase';

export class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(20);
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
    const arr = (new Array(length)).fill().map((_, i) => new Item({index: i}));
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

  // Метод возвращает узел со следующим значением после delNode.
  // Для этого он сначала переходит к правому потомку, а затем
  // отслеживает цепочку левых потомков этого узла.
  getSuccessor(delNode)
  {
    let successorParent = delNode;
    let successor = delNode;
    let current = delNode.rightChild; // Переход к правому потомку
    while(current != null) // Пока остаются левые потомки
    {
      successorParent = successor;
      successor = current;
      current = current.leftChild; // Переход к левому потомку
    }
    // Если преемник не является
    if(successor != delNode.rightChild) // правым потомком,
    { // создать связи между узлами
      successorParent.leftChild = successor.rightChild;
      successor.rightChild = delNode.rightChild;
    }
    return successor;
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
    if (isFound) {
      yield 'Have found node to delete';
    } else {
      return 'Can\'t find node to delete';
    }



    function del(key) // Удаление узла с заданным ключом
    { // (предполагается, что дерево не пусто)
      let current = root;
      let parent = root;
      let isLeftChild = true;
      while(current.iData != key) // Поиск узла
      {
        parent = current;
        if(key < current.iData) // Двигаться налево?
        {
          isLeftChild = true;
          current = current.leftChild;
        }
        else // Или направо?
        {
          isLeftChild = false;
          current = current.rightChild;
        }
        if(current == null) // Конец цепочки
          return false; // Узел не найден
      }
      // Удаляемый узел найден
      // Если узел не имеет потомков, он просто удаляется.
      if(current.leftChild==null &&
        current.rightChild==null)
      {
        if(current == root) // Если узел является корневым,
          root = null; // дерево очищается
        else if(isLeftChild)
          parent.leftChild = null; // Узел отсоединяется
        else // от родителя
          parent.rightChild = null;
      }
      // Если нет правого потомка, узел заменяется левым поддеревом
      else if(current.rightChild==null)
        if(current == root)
          root = current.leftChild;
        else if(isLeftChild)
          parent.leftChild = current.leftChild;
        else
          parent.rightChild = current.leftChild;
      // Если нет левого потомка, узел заменяется правым поддеревом
      else if(current.leftChild==null)
        if(current == root)
          root = current.rightChild;
        else if(isLeftChild)
          parent.leftChild = current.rightChild;
        else
          parent.rightChild = current.rightChild;
      else // Два потомка, узел заменяется преемником
      {
        // Поиск преемника для удаляемого узла (current)
        let successor = getSuccessor(current);
        // Родитель current связывается с посредником
        if(current == root)
          root = successor;
        else if(isLeftChild)
          parent.leftChild = successor;
        else
          parent.rightChild = successor;
        // Преемник связывается с левым потомком current
        return true; // Признак успешного завершения
      }

  }
}

customElements.define('page-binary-tree', PageBinaryTree);