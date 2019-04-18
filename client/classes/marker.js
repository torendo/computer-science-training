export class Marker {
  constructor({position, text, color = 'red', size = 1}) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.text = text;
  }
}