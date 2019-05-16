import {getRandomColor100} from '../utils';

export class Item {
  constructor({index, value, color, mark = false}) {
    this.index = index;
    this.value = value;
    this.color = color;
    this.mark = mark;
  }

  clear() {
    this.value = null;
    this.color = null;
    return this;
  }

  setValue(value, color = getRandomColor100()) {
    this.value = value;
    this.color = color;
    return this;
  }

  copyFrom(item) {
    this.value = item.value;
    this.color = item.color;
    return this;
  }

  moveFrom(item) {
    this.value = item.value;
    this.color = item.color;
    item.value = null;
    item.color = null;
    return this;
  }

  swapWith(item) {
    const cacheValue = this.value;
    const cacheColor = this.color;
    this.value = item.value;
    this.color = item.color;
    item.value = cacheValue;
    item.color = cacheColor;
    return this;
  }
}