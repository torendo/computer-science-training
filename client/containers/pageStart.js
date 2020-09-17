import {LitElement, html} from 'lit-element';

export class PageStart extends LitElement {
  render() {
    return html`
      <p>These are the applets that accompany your text book <strong>"Data Structures and Algorithms in Java"</strong>, Second Edition. Robert Lafore, 2002</p>
      <p>The applets are little demonstration programs that clarify the topics in the book. <br>
      For example, to demonstrate sorting algorithms, a bar chart is displayed and, each time the user pushes a button on the applet, another step of the algorithm is carried out. The user can see how the bars move, and annotations within the applet explain what's going on.</p>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('page-start', PageStart);