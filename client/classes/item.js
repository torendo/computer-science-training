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
    this.mark = false;
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
    this.mark = item.mark;
    return this;
  }

  moveFrom(item) {
    this.value = item.value;
    this.color = item.color;
    this.mark = item.mark;
    item.value = null;
    item.color = null;
    item.mark = false;
    return this;
  }

  swapWith(item) {
    const cacheValue = this.value;
    const cacheColor = this.color;
    const cacheMark = this.mark;
    this.value = item.value;
    this.color = item.color;
    this.mark = item.mark;
    item.value = cacheValue;
    item.color = cacheColor;
    item.mark = cacheMark;
    return this;
  }
}