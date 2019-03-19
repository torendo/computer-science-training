import {LitElement, html} from 'lit-element';

export class XFooter extends LitElement {
  render() {
    return html`
      <p class="credits">These are the applets that accompany your text book <strong>"Data Structures and Algorithms in Java"</strong>, Second Edition. Robert Lafore, 2002</p>
      <p class="credits">The applets are little demonstration programs that clarify the topics in the book. <br>
      For example, to demonstrate sorting algorithms, a bar chart is displayed and, each time the user pushes a button on the applet, another step of the algorithm is carried out. Oner can see how the bars move, and annotations within the applet explain what's going on.</p>
      <p class="credits-my">Built by Stanislav Proshkin with ❤ and WebComponents</p>
    `;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-footer', XFooter);