import {getRandomColor100} from '../utils';

export class Item {
  constructor({index, data, color, mark = false}) {
    this.index = index;
    this.data = data;
    this.color = color;
    this.mark = mark;
  }

  clear() {
    this.data = null;
    this.color = null;
    return this;
  }

  setData(value, color = getRandomColor100()) {
    this.data = value;
    this.color = color;
    return this;
  }

  copyDataFrom(item) {
    this.data = item.data;
    this.color = item.color;
    return this;
  }

  moveDataFrom(item) {
    this.data = item.data;
    this.color = item.color;
    item.data = null;
    item.color = null;
    return this;
  }

  switchDataWith(item) {
    const cacheData = this.data;
    const cacheColor = this.color;
    this.data = item.data;
    this.color = item.color;
    item.data = cacheData;
    item.color = cacheColor;
    return this;
  }
}