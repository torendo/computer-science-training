export class Edge {
  constructor({src, dest, weight}) {
    this.src = src;
    this.dest = dest;
    this.weight = weight;
  }
  get title() {
    return `${this.src.value}${this.dest.value}(${this.weight.toString().slice(0, 3)})`;
  }
}