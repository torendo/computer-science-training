import {getRandomColor100} from '../utils';

export class Item {
  constructor({index, data, color, state = false, marker = false}) {
    this.index = index;
    this.data = data;
    this.color = color;
    this.state = state;
    this.marker = marker;
  }

  clear() {
    this.data = null;
    this.color = null;
    return this;
  }

  unmark() {
    this.state = false;
    this.marker = false;
    return this;
  }

  setState(state = true) {
    this.state = state;
    return this;
  }

  setMarker(marker = true) {
    this.marker = marker;
    return this;
  }

  setData(value, color = getRandomColor100()) {
    this.data = value;
    this.color = color;
    return this;
  }

  moveDataFrom(item) {
    this.data = item.data;
    this.color = item.color;
    item.data = null;
    item.color = null;
    return this;
  }
}