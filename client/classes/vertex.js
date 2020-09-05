import {Item} from './item';

export class Vertex extends Item {
  constructor(options) {
    super(options);
    this.x = options.x;
    this.y = options.y;
  }
}