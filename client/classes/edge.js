export class Edge {
  constructor({src, dest, distance}) {
    this.src = src;
    this.dest = dest;
    this.distance = distance;
  }
  get title() {
    return this.src.value + this.dest.value + this.distance;
  }
}