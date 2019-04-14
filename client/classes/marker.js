export class Marker {
  constructor({position, color = 'red', size = 1, text}) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.text = text;
  }
}