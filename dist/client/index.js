!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t():"function"==typeof define&&define.amd?define(t):t()}(0,function(){"use strict";const e=new WeakMap,t=t=>"function"==typeof t&&e.has(t),i=void 0!==window.customElements&&void 0!==window.customElements.polyfillWrapFlushCallback,s=(e,t,i=null,s=null)=>{let r=t;for(;r!==i;){const t=r.nextSibling;e.insertBefore(r,s),r=t}},r=(e,t,i=null)=>{let s=t;for(;s!==i;){const t=s.nextSibling;e.removeChild(s),s=t}},n={},o={},a=`{{lit-${String(Math.random()).slice(2)}}}`,l=`\x3c!--${a}--\x3e`,h=new RegExp(`${a}|${l}`),d="$lit$";class c{constructor(e,t){this.parts=[],this.element=t;let i=-1,s=0;const r=[],n=t=>{const o=t.content,l=document.createTreeWalker(o,133,null,!1);let c=0;for(;l.nextNode();){i++;const t=l.currentNode;if(1===t.nodeType){if(t.hasAttributes()){const r=t.attributes;let n=0;for(let e=0;e<r.length;e++)r[e].value.indexOf(a)>=0&&n++;for(;n-- >0;){const r=e.strings[s],n=p.exec(r)[2],o=n.toLowerCase()+d,a=t.getAttribute(o).split(h);this.parts.push({type:"attribute",index:i,name:n,strings:a}),t.removeAttribute(o),s+=a.length-1}}"TEMPLATE"===t.tagName&&n(t)}else if(3===t.nodeType){const e=t.data;if(e.indexOf(a)>=0){const n=t.parentNode,o=e.split(h),a=o.length-1;for(let e=0;e<a;e++)n.insertBefore(""===o[e]?u():document.createTextNode(o[e]),t),this.parts.push({type:"node",index:++i});""===o[a]?(n.insertBefore(u(),t),r.push(t)):t.data=o[a],s+=a}}else if(8===t.nodeType)if(t.data===a){const e=t.parentNode;null!==t.previousSibling&&i!==c||(i++,e.insertBefore(u(),t)),c=i,this.parts.push({type:"node",index:i}),null===t.nextSibling?t.data="":(r.push(t),i--),s++}else{let e=-1;for(;-1!==(e=t.data.indexOf(a,e+1));)this.parts.push({type:"node",index:-1})}}};n(t);for(const e of r)e.parentNode.removeChild(e)}}const m=e=>-1!==e.index,u=()=>document.createComment(""),p=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=\/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;class g{constructor(e,t,i){this._parts=[],this.template=e,this.processor=t,this.options=i}update(e){let t=0;for(const i of this._parts)void 0!==i&&i.setValue(e[t]),t++;for(const e of this._parts)void 0!==e&&e.commit()}_clone(){const e=i?this.template.element.content.cloneNode(!0):document.importNode(this.template.element.content,!0),t=this.template.parts;let s=0,r=0;const n=e=>{const i=document.createTreeWalker(e,133,null,!1);let o=i.nextNode();for(;s<t.length&&null!==o;){const e=t[s];if(m(e))if(r===e.index){if("node"===e.type){const e=this.processor.handleTextExpression(this.options);e.insertAfterNode(o.previousSibling),this._parts.push(e)}else this._parts.push(...this.processor.handleAttributeExpressions(o,e.name,e.strings,this.options));s++}else r++,"TEMPLATE"===o.nodeName&&n(o.content),o=i.nextNode();else this._parts.push(void 0),s++}};return n(e),i&&(document.adoptNode(e),customElements.upgrade(e)),e}}class b{constructor(e,t,i,s){this.strings=e,this.values=t,this.type=i,this.processor=s}getHTML(){const e=this.strings.length-1;let t="";for(let i=0;i<e;i++){const e=this.strings[i],s=p.exec(e);t+=s?e.substr(0,s.index)+s[1]+s[2]+d+s[3]+a:e+l}return t+this.strings[e]}getTemplateElement(){const e=document.createElement("template");return e.innerHTML=this.getHTML(),e}}class f extends b{getHTML(){return`<svg>${super.getHTML()}</svg>`}getTemplateElement(){const e=super.getTemplateElement(),t=e.content,i=t.firstChild;return t.removeChild(i),s(t,i.firstChild),e}}const y=e=>null===e||!("object"==typeof e||"function"==typeof e);class k{constructor(e,t,i){this.dirty=!0,this.element=e,this.name=t,this.strings=i,this.parts=[];for(let e=0;e<i.length-1;e++)this.parts[e]=this._createPart()}_createPart(){return new x(this)}_getValue(){const e=this.strings,t=e.length-1;let i="";for(let s=0;s<t;s++){i+=e[s];const t=this.parts[s];if(void 0!==t){const e=t.value;if(null!=e&&(Array.isArray(e)||"string"!=typeof e&&e[Symbol.iterator]))for(const t of e)i+="string"==typeof t?t:String(t);else i+="string"==typeof e?e:String(e)}}return i+=e[t]}commit(){this.dirty&&(this.dirty=!1,this.element.setAttribute(this.name,this._getValue()))}}class x{constructor(e){this.value=void 0,this.committer=e}setValue(e){e===n||y(e)&&e===this.value||(this.value=e,t(e)||(this.committer.dirty=!0))}commit(){for(;t(this.value);){const e=this.value;this.value=n,e(this)}this.value!==n&&this.committer.commit()}}class v{constructor(e){this.value=void 0,this._pendingValue=void 0,this.options=e}appendInto(e){this.startNode=e.appendChild(u()),this.endNode=e.appendChild(u())}insertAfterNode(e){this.startNode=e,this.endNode=e.nextSibling}appendIntoPart(e){e._insert(this.startNode=u()),e._insert(this.endNode=u())}insertAfterPart(e){e._insert(this.startNode=u()),this.endNode=e.endNode,e.endNode=this.startNode}setValue(e){this._pendingValue=e}commit(){for(;t(this._pendingValue);){const e=this._pendingValue;this._pendingValue=n,e(this)}const e=this._pendingValue;e!==n&&(y(e)?e!==this.value&&this._commitText(e):e instanceof b?this._commitTemplateResult(e):e instanceof Node?this._commitNode(e):Array.isArray(e)||e[Symbol.iterator]?this._commitIterable(e):e===o?(this.value=o,this.clear()):this._commitText(e))}_insert(e){this.endNode.parentNode.insertBefore(e,this.endNode)}_commitNode(e){this.value!==e&&(this.clear(),this._insert(e),this.value=e)}_commitText(e){const t=this.startNode.nextSibling;e=null==e?"":e,t===this.endNode.previousSibling&&3===t.nodeType?t.data=e:this._commitNode(document.createTextNode("string"==typeof e?e:String(e))),this.value=e}_commitTemplateResult(e){const t=this.options.templateFactory(e);if(this.value instanceof g&&this.value.template===t)this.value.update(e.values);else{const i=new g(t,e.processor,this.options),s=i._clone();i.update(e.values),this._commitNode(s),this.value=i}}_commitIterable(e){Array.isArray(this.value)||(this.value=[],this.clear());const t=this.value;let i,s=0;for(const r of e)void 0===(i=t[s])&&(i=new v(this.options),t.push(i),0===s?i.appendIntoPart(this):i.insertAfterPart(t[s-1])),i.setValue(r),i.commit(),s++;s<t.length&&(t.length=s,this.clear(i&&i.endNode))}clear(e=this.startNode){r(this.startNode.parentNode,e.nextSibling,this.endNode)}}class w{constructor(e,t,i){if(this.value=void 0,this._pendingValue=void 0,2!==i.length||""!==i[0]||""!==i[1])throw new Error("Boolean attributes can only contain a single expression");this.element=e,this.name=t,this.strings=i}setValue(e){this._pendingValue=e}commit(){for(;t(this._pendingValue);){const e=this._pendingValue;this._pendingValue=n,e(this)}if(this._pendingValue===n)return;const e=!!this._pendingValue;this.value!==e&&(e?this.element.setAttribute(this.name,""):this.element.removeAttribute(this.name)),this.value=e,this._pendingValue=n}}class $ extends k{constructor(e,t,i){super(e,t,i),this.single=2===i.length&&""===i[0]&&""===i[1]}_createPart(){return new S(this)}_getValue(){return this.single?this.parts[0].value:super._getValue()}commit(){this.dirty&&(this.dirty=!1,this.element[this.name]=this._getValue())}}class S extends x{}let C=!1;try{const e={get capture(){return C=!0,!1}};window.addEventListener("test",e,e),window.removeEventListener("test",e,e)}catch(e){}class R{constructor(e,t,i){this.value=void 0,this._pendingValue=void 0,this.element=e,this.eventName=t,this.eventContext=i,this._boundHandleEvent=(e=>this.handleEvent(e))}setValue(e){this._pendingValue=e}commit(){for(;t(this._pendingValue);){const e=this._pendingValue;this._pendingValue=n,e(this)}if(this._pendingValue===n)return;const e=this._pendingValue,i=this.value,s=null==e||null!=i&&(e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive),r=null!=e&&(null==i||s);s&&this.element.removeEventListener(this.eventName,this._boundHandleEvent,this._options),r&&(this._options=N(e),this.element.addEventListener(this.eventName,this._boundHandleEvent,this._options)),this.value=e,this._pendingValue=n}handleEvent(e){"function"==typeof this.value?this.value.call(this.eventContext||this.element,e):this.value.handleEvent(e)}}const N=e=>e&&(C?{capture:e.capture,passive:e.passive,once:e.once}:e.capture);const E=new class{handleAttributeExpressions(e,t,i,s){const r=t[0];return"."===r?new $(e,t.slice(1),i).parts:"@"===r?[new R(e,t.slice(1),s.eventContext)]:"?"===r?[new w(e,t.slice(1),i)]:new k(e,t,i).parts}handleTextExpression(e){return new v(e)}};function _(e){let t=M.get(e.type);void 0===t&&(t={stringsArray:new WeakMap,keyString:new Map},M.set(e.type,t));let i=t.stringsArray.get(e.strings);if(void 0!==i)return i;const s=e.strings.join(a);return void 0===(i=t.keyString.get(s))&&(i=new c(e,e.getTemplateElement()),t.keyString.set(s,i)),t.stringsArray.set(e.strings,i),i}const M=new Map,F=new WeakMap;(window.litHtmlVersions||(window.litHtmlVersions=[])).push("1.0.0");const I=(e,...t)=>new b(e,t,"html",E),D=(e,...t)=>new f(e,t,"svg",E),W=133;function P(e,t){const{element:{content:i},parts:s}=e,r=document.createTreeWalker(i,W,null,!1);let n=T(s),o=s[n],a=-1,l=0;const h=[];let d=null;for(;r.nextNode();){a++;const e=r.currentNode;for(e.previousSibling===d&&(d=null),t.has(e)&&(h.push(e),null===d&&(d=e)),null!==d&&l++;void 0!==o&&o.index===a;)o.index=null!==d?-1:o.index-l,o=s[n=T(s,n)]}h.forEach(e=>e.parentNode.removeChild(e))}const q=e=>{let t=11===e.nodeType?0:1;const i=document.createTreeWalker(e,W,null,!1);for(;i.nextNode();)t++;return t},T=(e,t=-1)=>{for(let i=t+1;i<e.length;i++){const t=e[i];if(m(t))return i}return-1};const V=(e,t)=>`${e}--${t}`;let A=!0;void 0===window.ShadyCSS?A=!1:void 0===window.ShadyCSS.prepareTemplateDom&&(console.warn("Incompatible ShadyCSS version detected.Please update to at least @webcomponents/webcomponentsjs@2.0.2 and@webcomponents/shadycss@1.3.1."),A=!1);const O=e=>t=>{const i=V(t.type,e);let s=M.get(i);void 0===s&&(s={stringsArray:new WeakMap,keyString:new Map},M.set(i,s));let r=s.stringsArray.get(t.strings);if(void 0!==r)return r;const n=t.strings.join(a);if(void 0===(r=s.keyString.get(n))){const i=t.getTemplateElement();A&&window.ShadyCSS.prepareTemplateDom(i,e),r=new c(t,i),s.keyString.set(n,r)}return s.stringsArray.set(t.strings,r),r},z=["html","svg"],H=new Set,L=(e,t,i)=>{H.add(i);const s=e.querySelectorAll("style");if(0===s.length)return void window.ShadyCSS.prepareTemplateStyles(t.element,i);const r=document.createElement("style");for(let e=0;e<s.length;e++){const t=s[e];t.parentNode.removeChild(t),r.textContent+=t.textContent}if((e=>{z.forEach(t=>{const i=M.get(V(t,e));void 0!==i&&i.keyString.forEach(e=>{const{element:{content:t}}=e,i=new Set;Array.from(t.querySelectorAll("style")).forEach(e=>{i.add(e)}),P(e,i)})})})(i),function(e,t,i=null){const{element:{content:s},parts:r}=e;if(null==i)return void s.appendChild(t);const n=document.createTreeWalker(s,W,null,!1);let o=T(r),a=0,l=-1;for(;n.nextNode();)for(l++,n.currentNode===i&&(a=q(t),i.parentNode.insertBefore(t,i));-1!==o&&r[o].index===l;){if(a>0){for(;-1!==o;)r[o].index+=a,o=T(r,o);return}o=T(r,o)}}(t,r,t.element.content.firstChild),window.ShadyCSS.prepareTemplateStyles(t.element,i),window.ShadyCSS.nativeShadow){const i=t.element.content.querySelector("style");e.insertBefore(i.cloneNode(!0),e.firstChild)}else{t.element.content.insertBefore(r,t.element.content.firstChild);const e=new Set;e.add(r),P(t,e)}};window.JSCompiler_renameProperty=((e,t)=>e);const U={toAttribute(e,t){switch(t){case Boolean:return e?"":null;case Object:case Array:return null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){switch(t){case Boolean:return null!==e;case Number:return null===e?null:Number(e);case Object:case Array:return JSON.parse(e)}return e}},B=(e,t)=>t!==e&&(t==t||e==e),j={attribute:!0,type:String,converter:U,reflect:!1,hasChanged:B},G=Promise.resolve(!0),Q=1,J=4,Y=8,K=16,X=32;class Z extends HTMLElement{constructor(){super(),this._updateState=0,this._instanceProperties=void 0,this._updatePromise=G,this._hasConnectedResolver=void 0,this._changedProperties=new Map,this._reflectingProperties=void 0,this.initialize()}static get observedAttributes(){this.finalize();const e=[];return this._classProperties.forEach((t,i)=>{const s=this._attributeNameForProperty(i,t);void 0!==s&&(this._attributeToPropertyMap.set(s,i),e.push(s))}),e}static _ensureClassProperties(){if(!this.hasOwnProperty(JSCompiler_renameProperty("_classProperties",this))){this._classProperties=new Map;const e=Object.getPrototypeOf(this)._classProperties;void 0!==e&&e.forEach((e,t)=>this._classProperties.set(t,e))}}static createProperty(e,t=j){if(this._ensureClassProperties(),this._classProperties.set(e,t),t.noAccessor||this.prototype.hasOwnProperty(e))return;const i="symbol"==typeof e?Symbol():`__${e}`;Object.defineProperty(this.prototype,e,{get(){return this[i]},set(t){const s=this[e];this[i]=t,this.requestUpdate(e,s)},configurable:!0,enumerable:!0})}static finalize(){if(this.hasOwnProperty(JSCompiler_renameProperty("finalized",this))&&this.finalized)return;const e=Object.getPrototypeOf(this);if("function"==typeof e.finalize&&e.finalize(),this.finalized=!0,this._ensureClassProperties(),this._attributeToPropertyMap=new Map,this.hasOwnProperty(JSCompiler_renameProperty("properties",this))){const e=this.properties,t=[...Object.getOwnPropertyNames(e),..."function"==typeof Object.getOwnPropertySymbols?Object.getOwnPropertySymbols(e):[]];for(const i of t)this.createProperty(i,e[i])}}static _attributeNameForProperty(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}static _valueHasChanged(e,t,i=B){return i(e,t)}static _propertyValueFromAttribute(e,t){const i=t.type,s=t.converter||U,r="function"==typeof s?s:s.fromAttribute;return r?r(e,i):e}static _propertyValueToAttribute(e,t){if(void 0===t.reflect)return;const i=t.type,s=t.converter;return(s&&s.toAttribute||U.toAttribute)(e,i)}initialize(){this._saveInstanceProperties()}_saveInstanceProperties(){this.constructor._classProperties.forEach((e,t)=>{if(this.hasOwnProperty(t)){const e=this[t];delete this[t],this._instanceProperties||(this._instanceProperties=new Map),this._instanceProperties.set(t,e)}})}_applyInstanceProperties(){this._instanceProperties.forEach((e,t)=>this[t]=e),this._instanceProperties=void 0}connectedCallback(){this._updateState=this._updateState|X,this._hasConnectedResolver?(this._hasConnectedResolver(),this._hasConnectedResolver=void 0):this.requestUpdate()}disconnectedCallback(){}attributeChangedCallback(e,t,i){t!==i&&this._attributeToProperty(e,i)}_propertyToAttribute(e,t,i=j){const s=this.constructor,r=s._attributeNameForProperty(e,i);if(void 0!==r){const e=s._propertyValueToAttribute(t,i);if(void 0===e)return;this._updateState=this._updateState|Y,null==e?this.removeAttribute(r):this.setAttribute(r,e),this._updateState=this._updateState&~Y}}_attributeToProperty(e,t){if(this._updateState&Y)return;const i=this.constructor,s=i._attributeToPropertyMap.get(e);if(void 0!==s){const e=i._classProperties.get(s)||j;this._updateState=this._updateState|K,this[s]=i._propertyValueFromAttribute(t,e),this._updateState=this._updateState&~K}}requestUpdate(e,t){let i=!0;if(void 0!==e&&!this._changedProperties.has(e)){const s=this.constructor,r=s._classProperties.get(e)||j;s._valueHasChanged(this[e],t,r.hasChanged)?(this._changedProperties.set(e,t),!0!==r.reflect||this._updateState&K||(void 0===this._reflectingProperties&&(this._reflectingProperties=new Map),this._reflectingProperties.set(e,r))):i=!1}return!this._hasRequestedUpdate&&i&&this._enqueueUpdate(),this.updateComplete}async _enqueueUpdate(){let e;this._updateState=this._updateState|J;const t=this._updatePromise;this._updatePromise=new Promise(t=>e=t),await t,this._hasConnected||await new Promise(e=>this._hasConnectedResolver=e);const i=this.performUpdate();null!=i&&"function"==typeof i.then&&await i,e(!this._hasRequestedUpdate)}get _hasConnected(){return this._updateState&X}get _hasRequestedUpdate(){return this._updateState&J}get hasUpdated(){return this._updateState&Q}performUpdate(){if(this._instanceProperties&&this._applyInstanceProperties(),this.shouldUpdate(this._changedProperties)){const e=this._changedProperties;this.update(e),this._markUpdated(),this._updateState&Q||(this._updateState=this._updateState|Q,this.firstUpdated(e)),this.updated(e)}else this._markUpdated()}_markUpdated(){this._changedProperties=new Map,this._updateState=this._updateState&~J}get updateComplete(){return this._updatePromise}shouldUpdate(e){return!0}update(e){void 0!==this._reflectingProperties&&this._reflectingProperties.size>0&&(this._reflectingProperties.forEach((e,t)=>this._propertyToAttribute(t,this[t],e)),this._reflectingProperties=void 0)}updated(e){}firstUpdated(e){}}Z.finalized=!0;const ee="adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,te=Symbol();class ie{constructor(e,t){if(t!==te)throw new Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e}get styleSheet(){return void 0===this._styleSheet&&(ee?(this._styleSheet=new CSSStyleSheet,this._styleSheet.replaceSync(this.cssText)):this._styleSheet=null),this._styleSheet}toString(){return this.cssText}}const se=(e,...t)=>{const i=t.reduce((t,i,s)=>t+(e=>{if(e instanceof ie)return e.cssText;throw new Error(`Value passed to 'css' function must be a 'css' function result: ${e}. Use 'unsafeCSS' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+e[s+1],e[0]);return new ie(i,te)};(window.litElementVersions||(window.litElementVersions=[])).push("2.0.1");const re=e=>e.flat?e.flat(1/0):function e(t,i=[]){for(let s=0,r=t.length;s<r;s++){const r=t[s];Array.isArray(r)?e(r,i):i.push(r)}return i}(e);class ne extends Z{static finalize(){super.finalize(),this._styles=this.hasOwnProperty(JSCompiler_renameProperty("styles",this))?this._getUniqueStyles():this._styles||[]}static _getUniqueStyles(){const e=this.styles,t=[];if(Array.isArray(e)){re(e).reduceRight((e,t)=>(e.add(t),e),new Set).forEach(e=>t.unshift(e))}else e&&t.push(e);return t}initialize(){super.initialize(),this.renderRoot=this.createRenderRoot(),window.ShadowRoot&&this.renderRoot instanceof window.ShadowRoot&&this.adoptStyles()}createRenderRoot(){return this.attachShadow({mode:"open"})}adoptStyles(){const e=this.constructor._styles;0!==e.length&&(void 0===window.ShadyCSS||window.ShadyCSS.nativeShadow?ee?this.renderRoot.adoptedStyleSheets=e.map(e=>e.styleSheet):this._needsShimAdoptedStyleSheets=!0:window.ShadyCSS.ScopingShim.prepareAdoptedCssText(e.map(e=>e.cssText),this.localName))}connectedCallback(){super.connectedCallback(),this.hasUpdated&&void 0!==window.ShadyCSS&&window.ShadyCSS.styleElement(this)}update(e){super.update(e);const t=this.render();t instanceof b&&this.constructor.render(t,this.renderRoot,{scopeName:this.localName,eventContext:this}),this._needsShimAdoptedStyleSheets&&(this._needsShimAdoptedStyleSheets=!1,this.constructor._styles.forEach(e=>{const t=document.createElement("style");t.textContent=e.cssText,this.renderRoot.appendChild(t)}))}render(){}}ne.finalized=!0,ne.render=((e,t,i)=>{const s=i.scopeName,n=F.has(t),o=t instanceof ShadowRoot&&A&&e instanceof b,a=o&&!H.has(s),l=a?document.createDocumentFragment():t;if(((e,t,i)=>{let s=F.get(t);void 0===s&&(r(t,t.firstChild),F.set(t,s=new v(Object.assign({templateFactory:_},i))),s.appendInto(t)),s.setValue(e),s.commit()})(e,l,Object.assign({templateFactory:O(s)},i)),a){const e=F.get(l);F.delete(l),e.value instanceof g&&L(l,e.value.template,s),r(t,t.firstChild),t.appendChild(l),F.set(t,e)}!n&&o&&window.ShadyCSS.styleElement(t.host)});const oe=new WeakMap,ae=(t=>(...i)=>{const s=t(...i);return e.set(s,!0),s})(e=>t=>{if(!(t instanceof v))throw new Error("unsafeHTML can only be used in text bindings");const i=oe.get(t);if(void 0!==i&&y(e)&&e===i.value&&t.value===i.fragment)return;const s=document.createElement("template");s.innerHTML=e;const r=document.importNode(s.content,!0);t.setValue(r),oe.set(t,{value:e,fragment:r})});customElements.define("x-view",class extends ne{static get properties(){return{component:{type:String}}}render(){let e=null!=this.component&&""!==this.component?`<${this.component}></${this.component}>`:"";return I`${ae(e)}`}createRenderRoot(){return this}});customElements.define("page-start",class extends ne{render(){return I`
      <p>These are the applets that accompany your text book <strong>"Data Structures and Algorithms in Java"</strong>, Second Edition. Robert Lafore, 2002</p>
      <p>The applets are little demonstration programs that clarify the topics in the book. <br>
      For example, to demonstrate sorting algorithms, a bar chart is displayed and, each time the user pushes a button on the applet, another step of the algorithm is carried out. The user can see how the bars move, and annotations within the applet explain what's going on.</p>
    `}createRenderRoot(){return this}});const le=(e,t)=>{const i=[];for(let s=0;s<e;s++)i.push(he(i,t));return i},he=(e,t)=>{const i=Math.floor(Math.random()*t);return e.find(e=>e===i)?he(e,t):i},de=e=>{for(let t=2,i=Math.sqrt(e);t<=i;t++)if(e%t==0)return!1;return e>1},ce=["#FFCDD2","#F8BBD0","#E1BEE7","#D1C4E9","#C5CAE9","#BBDEFB","#B3E5FC","#B2EBF2","#B2DFDB","#C8E6C9","#DCEDC8","#F0F4C3","#FFF9C4","#FFECB3","#FFE0B2","#FFCCBC","#D7CCC8","#CFD8DC","#F5F5F5"],me=e=>ce[e%ce.length],ue=()=>ce[Math.floor(Math.random()*ce.length)];class pe{constructor({index:e,value:t,color:i,mark:s=!1}){this.index=e,this.value=t,this.color=i,this.mark=s}clear(){return this.value=null,this.color=null,this.mark=!1,this}setValue(e,t=ue()){return this.value=e,this.color=t,this}copyFrom(e){return this.value=e.value,this.color=e.color,this.mark=e.mark,this}moveFrom(e){return this.value=e.value,this.color=e.color,this.mark=e.mark,e.value=null,e.color=null,e.mark=!1,this}swapWith(e){const t=this.value,i=this.color,s=this.mark;return this.value=e.value,this.color=e.color,this.mark=e.mark,e.value=t,e.color=i,e.mark=s,this}}class ge{constructor({position:e,text:t,color:i="red",size:s=1}){this.position=e,this.color=i,this.size=s,this.text=t}}class be extends ne{createRenderRoot(){return this}handleClick(e,t){this.iterator||(this.iterator=e.call(this),this.toggleButtonsActivity(t,!0)),this.iterate().done&&(this.iterator=null,this.toggleButtonsActivity(t,!1)),this.items=[...this.items],this.requestUpdate()}toggleButtonsActivity(e,t){this.querySelectorAll("x-button").forEach(i=>{i!==e&&(i.disabled=t)}),e.activated=t}iterate(){const e=this.iterator.next();this.console.setMessage(e.value);const t=this.querySelector("x-button.activated");return t&&t.focus(),e}initItems(){this.items=[],this.length=0}initMarkers(){this.markers=[]}}class fe extends ne{static get properties(){return{callback:{type:Function},disabled:{type:Boolean},activated:{type:Boolean}}}render(){return I`
      <button type="button" title="" @click=${this.handleClick} ?disabled=${this.disabled}>
        <slot class=${this.activated?"hidden":""}></slot>      
        <span class=${this.activated?"":"hidden"}>Next</span>
      </button>
    `}createRenderRoot(){return this.attachShadow({mode:"open",delegatesFocus:!0})}updated(){this.classList.toggle("activated",this.activated)}handleClick(){this.callback(this)}}fe.styles=se`
  .hidden {
    display: none;
  }
  button {
    height: 1.6em;
    border-radius: 4px;
    border: 1px solid gray;
    background: whitesmoke;
  }
`,customElements.define("x-button",fe);class ye extends ne{static get properties(){return{defaultMessage:{type:String}}}constructor(){super(),this.defaultMessage="Press any button"}render(){return I`
      <p class="message">${this.message||this.defaultMessage}</p>
    `}setMessage(e){this.message=e,this.requestUpdate()}}ye.styles=se`
  :host {
    display: block;
  }
  .message {
    padding: 10px;
    font-family: monospace;
  }

  .message table {
      border-collapse: collapse;
  }
  .message table td,
  .message table th {
      padding: 2px 6px;
  }
  .message table th {
      font-weight: normal;
      border-bottom: 1px solid black;
  }
  .message .marked {
      font-weight: bold;
      color: red;
  }
`,customElements.define("x-console",ye);customElements.define("x-dialog",class extends ne{render(){return I`
      <dialog>
        <form method="dialog">
          <p class="slotCnt">
            <slot></slot>
          </p>
          <button value="default">Confirm</button>
          <button value="cancel">Cancel</button>
        </form>
      </dialog>
    `}firstUpdated(){this.dialog=this.shadowRoot.querySelector("dialog"),this.form=this.shadowRoot.querySelector("form");const e=this.shadowRoot.querySelector("slot");this.shadowRoot.querySelector(".slotCnt").append(...e.assignedNodes()),e.remove()}open(){return new Promise((e,t)=>{this.dialog.showModal();const i=()=>{this.dialog.removeEventListener("close",i),"default"===this.dialog.returnValue?(e(new FormData(this.form)),this.form.reset()):t()};this.dialog.addEventListener("close",i)})}});class ke extends ne{render(){return I`
      <button type="button" title="" @click=${()=>this.info.classList.toggle("show")}>?</button>
      <div>
        <slot></slot>
      </div>
    `}firstUpdated(){this.info=this.shadowRoot.querySelector("div")}}ke.styles=se`
  :host {
    position: relative;
  }
  button {
    width: 1.68em;
    height: 1.6em;
    padding: 0;
    margin: 0 0 0 .5em;
    border-radius: 50%;
    border: 1px solid gray;
    background: whitesmoke;
    font-weight: bold;
  }
  div {
    z-index: 10;
    display: none;
    position: absolute;
    top: .5em;
    left: 2em;
    width: 250px;
    padding: 0 15px;
    border: 1px solid gray;
    background: whitesmoke;
  }
  button:hover + div {
    display: block;
  }
  .show {
    display: block;
  }
`,customElements.define("x-info",ke);class xe extends ne{static get properties(){return{items:{type:Array},markers:{type:Array},reverse:{type:Boolean}}}constructor(){super(),this.items=[],this.markers=[]}render(){const e=this.items.map(e=>I`
      <div class="item">
        <div class="index">
          ${e.index}
        </div>
        <div class="value" style="${e.color?"background-color:"+e.color:""}">
          ${e.value}
        </div>
        <div class="marker_container ${e.mark?"mark":""}">
          ${this.renderMarker(e.index)}
        </div>
      </div>
    `);return I`
      ${this.reverse?e.reverse():e}      
    `}renderMarker(e){let t="";return this.markers.forEach(i=>{i.position===e&&(t=I`
          ${t}
          <div class="marker size_${i.size} ${i.color?"color_"+i.color:""}">
            <span>${i.text}</span>
          </div>
        `)}),t}}xe.styles=se`
  :host {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    height: 19em;
    max-width: 600px;
  }
  .item {
    display: flex;
  }
  .index, .value, .state {
    align-self: center;
  }
  .index {
    width: 1.5em;
    padding-right: 4px;
    text-align: right;
  }
  .value {
    min-width: 1.7em;
    min-height: 1.7em;
    padding: 0 10px;
    margin: 0;
    line-height: 1.7em;
    border: 1px solid lightgray;
  }
  .marker_container {
    position: relative;
    min-height: 1.7em;
    padding-left: 3em;
    line-height: 1.7em;
  }
  .mark:before {
    content: '';
    width: 4px;
    height: 1.9em;
    position: absolute;
    left: 0;
    margin-top: -1px;
    background-color: royalblue;
  }
  .marker {
    position: absolute;
    left: 0;
    height: 100%;
    font-size: .8em;
    text-align: center;
  }
  .marker span {
    text-shadow: white 1px 1px 0;
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 50%;
    left: 6px;
    transform: rotate(-135deg) translate(50%, 50%);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    height: 2px;
    top: 50%;
    left: 6px;
    margin-top: -2px;
  }
  .size_1.marker {
    z-index: 3;
    padding-left: 2em;
  }
  .size_1.marker:after {
    width: 1em;
  }
  .size_2.marker {
    z-index: 2;
    padding-left: 4em;
  }
  .size_2.marker:after {
    width: 3em;
  }
  .size_3.marker {
    z-index: 1;
    padding-left: 6em;
  }
  .size_3.marker:after {
    width: 5em;
  }
  .color_red.marker {
    color: red;
  }
  .color_red.marker:before {
    border-color: red;
  }
  .color_red.marker:after {
    background-color: red;
  }
  .color_blue.marker {
    color: blue;
  }
  .color_blue.marker:before {
    border-color: blue;
  }
  .color_blue.marker:after {
    background-color: blue;
  }
  .color_purple.marker {
    color: purple;
  }
  .color_purple.marker:before {
    border-color: purple;
  }
  .color_purple.marker:after {
    background-color: purple;
  }
`,customElements.define("x-items-horizontal",xe);class ve extends be{constructor(){super(),this.title="Array",this.info=I`
      <p><b>New</b> creates array with N cells (60 max)</p>
      <p><b>Fill</b> inserts N items into array</p>
      <p><b>Ins</b> inserts new item with value N</p>
      <p><b>Find</b> finds item(s) with value N</p>
      <p><b>Del</b> deletes item(s) with value N</p>
    `,this.items=[],this.markers=[],this.length=0,this.initItems(),this.initMarkers()}render(){return I`
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
        <x-info>${this.info}</x-info>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}renderAdditionalControl(){return I`
      <label><input class="dups" type="checkbox" checked disabled>Dups OK</label>
    `}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog"),this.dups=this.querySelector(".dups")}initItems(){const e=[];for(let t=0;t<20;t++){const i=new pe({index:t});t<10&&i.setValue(Math.floor(1e3*Math.random())),e.push(i)}this.items=e,this.length=10}initMarkers(){this.markers=[new ge({position:0})]}*iteratorNew(){let e=0;if(yield"Enter size of array to create",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>60||e<0)return"ERROR: use size between 0 and 60";yield`Will create empty array with ${e} cells`;const t=[];for(let i=0;i<e;i++)t.push(new pe({index:i}));return this.items=t,this.length=0,this.dups.disabled=!1,yield"Select Duplicates Ok or not",this.dups.disabled=!0,"New array created; total items = 0"}*iteratorFill(){let e=0;if(yield"Enter number of items to fill in",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>this.items.length||e<0)return`ERROR: can't fill more than ${this.items.length} items`;yield`Will fill in ${e} items`;for(let t=0;t<e;t++)this.dups.checked?this.items[t].setValue(Math.floor(1e3*Math.random())):this.items[t].setValue(he(this.items,1e3));return this.length=e,`Fill completed; total items = ${e}`}*iteratorIns(){if(this.items.length===this.length)return"ERROR: can't insert, array is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";if(!this.dups.checked){const t=this.items.find(t=>t.value===e);t&&(yield`ERROR: you already have item with key ${e} at index ${t.index}`)}return yield`Will insert item with key ${e}`,this.items[this.length].setValue(e),this.markers[0].position=this.length,yield`Inserted item with key ${e} at index ${this.length}`,this.length++,this.markers[0].position=0,`Insertion completed; total items ${this.length}`}*iteratorFind(){let e,t=0;if(yield"Enter key of item to find",this.dialog.open().then(e=>{t=Number(e.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",t>1e3||t<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${t}`;let i=!1;for(let s=0;s<this.length;s++){if(this.markers[0].position=s,this.items[s].value===t){if(e=s,yield`Have found ${i?"additioal":""} item at index = ${e}`,!this.dups.checked)break;i=!0,e=null}s!==this.length-1&&(yield`Checking ${i?"for additioal matches":"next cell"}; index = ${s+1}`)}null==e&&(yield`No ${i?"additioal":""} items with key ${t}`),this.markers[0].position=0}*iteratorDel(){let e,t=0;if(yield"Enter key of item to delete",this.dialog.open().then(e=>{t=Number(e.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",t>1e3||t<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${t}`;let i=0,s=!1;for(let r=0;r<this.length;r++)this.markers[0].position=r,this.items[r].value===t?(e=r,i++,this.items[r].clear(),yield`Have found and deleted ${s?"additioal":""} item at index = ${e}`,this.dups.checked&&(s=!0)):i>0?(yield`Will shift item ${i} spaces`,this.items[r-i].moveFrom(this.items[r])):yield`Checking ${s?"for additioal matches":"next cell"}; index = ${r+1}`;return this.length-=i,this.markers[0].position=0,i>0?`Shift${i>1?"s":""} complete; no ${s?"more":""} items to delete`:`No ${s?"additioal":""} items with key ${t}`}}customElements.define("page-array",ve);customElements.define("page-ordered-array",class extends ve{constructor(){super(),this.title="Ordered Array",this.info=I`
      <p><b>New</b> creates array with N cells (60 max)</p>
      <p><b>Fill</b> inserts N items into array</p>
      <p><b>Ins</b> inserts new item with value N</p>
      <p><b>Find</b> finds item with value N</p>
      <p><b>Del</b> deletes item with value N</p>
    `}renderAdditionalControl(){return I`
      <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" checked>Linear</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_binary">Binary</label>
    `}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog"),this.binary=this.querySelector(".algorithm_binary"),this.linear=this.querySelector(".algorithm_linear")}toggleButtonsActivity(e,t){super.toggleButtonsActivity(e,t),this.querySelectorAll(".algorithm").forEach(e=>{e.disabled=t}),this.items.forEach(e=>{e.mark=!1})}markItems(e){this.items.forEach((t,i)=>{t.mark=i>=e.start&&i<=e.end})}initItems(){const e=[],t=le(10,1e3);t.sort((e,t)=>e-t);for(let i=0;i<20;i++){const s=new pe({index:i});i<10&&s.setValue(t[i]),e.push(s)}this.items=e,this.length=10}*iteratorNew(){let e=0;if(yield"Enter size of array to create",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>60||e<0)return"ERROR: use size between 0 and 60";yield`Will create empty array with ${e} cells`;const t=[];for(let i=0;i<e;i++)t.push(new pe({index:i}));return this.items=t,this.length=0,"New array created; total items = 0"}*iteratorFill(){let e=0;if(yield"Enter number of items to fill in",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>this.items.length||e<0)return`ERROR: can't fill more than ${this.items.length} items`;yield`Will fill in ${e} items`;const t=le(e,1e3);return t.sort((e,t)=>e-t),t.forEach((e,t)=>{this.items[t].setValue(e)}),this.length=e,`Fill completed; total items = ${e}`}*linearSearch(e,t){for(let i=0;i<this.length;i++){if(this.markers[0].position=i,this.items[i].value===e||t&&this.items[i].value>e)return i;i!==this.length-1&&(yield`Checking at index = ${i+1}`)}}*binarySearch(e,t){let i,s={start:0,end:this.length-1};for(;;){if(i=Math.floor((s.end+s.start)/2),s.end<s.start)return t?i+1:null;if(this.markers[0].position=i,this.markItems(s),this.items[i].value===e)return i;yield`Checking index ${i}; range = ${s.start} to ${s.end}`,this.items[i].value>e?s.end=i-1:s.start=i+1}}*iteratorIns(){if(this.items.length===this.length)return"ERROR: can't insert, array is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";if(this.items.find(t=>t.value===e))return"ERROR: can't insert, duplicate found";yield`Will insert item with key ${e}`;let t=yield*this.linear.checked?this.linearSearch(e,!0):this.binarySearch(e,!0);t=null!=t?t:this.length,yield`Will insert at index ${t}${t!==this.length?", following shift":""}`,this.markers[0].position=this.length,t!==this.length&&(yield"Will shift cells to make room");for(let e=this.length;e>t;e--)this.items[e].moveFrom(this.items[e-1]),this.markers[0].position=e-1,yield`Shifted item from index ${e-1}`;return this.items[t].setValue(e),yield`Have inserted item ${e} at index ${t}`,this.length++,this.markers[0].position=0,`Insertion completed; total items ${this.length}`}*iteratorFind(){let e=0;if(yield"Enter key of item to find",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${e}`;let t=yield*this.linear.checked?this.linearSearch(e):this.binarySearch(e);return this.markers[0].position=0,null==t?`No items with key ${e}`:`Have found item at index = ${t}`}*iteratorDel(){let e=0;if(yield"Enter key of item to delete",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${e}`;let t=yield*this.linear.checked?this.linearSearch(e):this.binarySearch(e);if(null==t)return this.markers[0].position=0,`No items with key ${e}`;this.items[t].clear(),yield`Have found and deleted item at index = ${t}`,t!==this.length-1&&(this.markers[0].position=t,yield"Will shift items");for(let e=t+1;e<this.length;e++)this.markers[0].position=e,this.items[e-1].moveFrom(this.items[e]),yield`Shifted item from index ${e}`;return this.length--,this.markers[0].position=0,`${t!==this.length?"Shift completed":"Completed"}; total items ${this.length}`}});class we extends ne{static get properties(){return{items:{type:Array},temp:{type:Object},markers:{type:Array},pivots:{type:Array}}}constructor(){super(),this.items=[],this.markers=[],this.pivots=[]}render(){return I`
      ${this.items.map(e=>I`
        <div class="item">
          <div class="value_container">
            <div class="value" style="${e.color?"background-color:"+e.color+";":""} ${e.value?"height:"+e.value+"%;":""}">
            </div>
          </div>
          <div class="index" style="${this.items.length>20?"display:none;":""}">
            ${e.index}
          </div>
          <div class="marker_container">
            ${this.renderMarker(e.index)}
          </div>
          ${this.renderPivots(e)}
        </div>
      `)}      
      ${this.renderTemp()}
    `}renderPivots(e){let t="";return this.pivots.forEach((i,s)=>{if(i.start<=e.index&&i.end>=e.index){const e=this.pivots.length>1&&this.pivots.length!==s+1;t=I`
          ${t}
          <div class="pivot ${e?"dimmed":""}" style="height: ${400*(1-i.value/100)-2}px"></div>
        `}}),t}renderTemp(){if(this.temp instanceof pe)return I`
        <div class="item temp">
          <div class="value_container">
            <div class="value" style="${this.temp.color?"background-color:"+this.temp.color+";":""} ${this.temp.value?"height:"+this.temp.value+"%;":""}">
            </div>
          </div>
          <div class="marker_container">
            ${this.renderMarker("temp")}
          </div>
        </div>
      `}renderMarker(e){let t="";return this.markers.forEach(i=>{i.position===e&&(t=I`
          ${t}
          <div class="marker size_${i.size} ${i.color?"color_"+i.color:""}">
            <span>${this.items.length>20?"":i.text}</span>
          </div>
        `)}),t}}we.styles=se`
  :host {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    max-width: 600px;
  }
  .item {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 5px;
    flex-grow: 1;
    flex-basis: 0;
  }
  .temp {
    margin-left: 2em;
  }
  .index {
    text-align: center;
    margin-bottom: 5px;
  }
  .value_container {
    display: flex;
    flex-direction: column-reverse;
    height: 400px;
    margin-bottom: 5px;
  }
  .value {
    border: 1px solid lightgray;
  }
  .pivot {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    border-bottom: 1px solid black;
  }
  .pivot.dimmed {
    border-bottom-style: dotted;
  }
  .marker_container {
    position: relative;
    height: 6em;
  }
  .marker {
    position: absolute;
    top: 0;
    width: 100%;
    font-size: .8em;
    text-align: center;
  }
  .marker span {
    position: absolute;
    min-width: 5em;
    transform: translateX(-50%);
    text-shadow: white 1px 1px 0;
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: -2px;
    left: 50%;
    transform: rotate(-45deg) translate(-50%);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    top: 0;
    left: 50%;
  }
  .size_1.marker {
    z-index: 3;
    padding-top: 1em;
  }
  .size_1.marker:after {
    height: 1em;
  }
  .size_2.marker {
    z-index: 2;
    padding-top: 3em;
  }
  .size_2.marker:after {
    height: 3em;
  }
  .size_3.marker {
    z-index: 1;
    padding-top: 5em;
  }
  .size_3.marker:after {
    height: 5em;
  }
  .color_red.marker {
    color: red;
  }
  .color_red.marker:before {
    border-color: red;
  }
  .color_red.marker:after {
    background-color: red;
  }
  .color_blue.marker {
    color: blue;
  }
  .color_blue.marker:before {
    border-color: blue;
  }
  .color_blue.marker:after {
    background-color: blue;
  }
  .color_purple.marker {
    color: purple;
  }
  .color_purple.marker:before {
    border-color: purple;
  }
  .color_purple.marker:after {
    background-color: purple;
  }
`,customElements.define("x-items-vertical",we);class $e extends be{constructor(){super(),this.length=10,this.initItems(),this.initMarkers(),this.pivots=[]}render(){return I`
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorStep)}>Step</x-button>
        <x-button .callback=${this.handleAbort.bind(this)} class="btn_abort hidden">Abort</x-button>
        <x-info>
          <p><b>New</b> creates new data and initializes sort; toggles between random and inverse order</p>
          <p><b>Size</b> toggles between 10 bars and 100 bars; also creates new data and initializes sort</p> 
          <p><b>Run</b> starts the sorting process running automatically (Next to pause/resume, Abort to stop)</p> 
          <p><b>Step</b> executes one step of sorting process</p> 
        </x-info>
      </div>
      <x-console class="console_verbose"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers} .temp=${this.temp} .pivots=${this.pivots}></x-items-vertical>
    `}firstUpdated(){this.consoleStats=this.querySelector(".console-stats"),this.console=this.querySelector(".console_verbose"),this.btnStop=this.querySelector(".btn_abort")}handleAbort(){clearInterval(this.interval),this.afterSort(),this.iterator=function*(){return"Aborted"}(),this.iterate()}initItems(e=this.length){const t=[];for(let i=0;i<e;i++){const s=new pe({index:i}),r=this.isReverseOrder?100/e*(e-i):Math.floor(100*Math.random());s.setValue(r,me(r)),t.push(s)}this.items=t}initMarkers(){this.markers=[]}updateStats(e=0,t=0){this.consoleStats.setMessage(`Swaps: ${e}, Comparisons: ${t}`)}beforeSort(){this.updateStats(),this.btnStop.classList.remove("hidden"),this.btnStop.disabled=!1}afterSort(){this.initMarkers(),this.btnStop.classList.add("hidden")}*iteratorNew(){return this.isReverseOrder=!this.isReverseOrder,this.initItems(this.items.length),this.initMarkers(),`Created ${this.isReverseOrder?"reverse":"unordered"} array`}*iteratorSize(){const e=this.items.length===this.length?100:this.length;return this.initItems(e),this.initMarkers(),`Created ${e} elements array`}*iteratorStep(){return this.beforeSort(),this.afterSort(),"Sort is complete"}*iteratorRun(){let e;this.beforeSort();let t=!1;for(;yield"Press Next to start",this.interval=setInterval(()=>{e||(e=this.iteratorStep()),e.next().done&&(t=!0,this.iterate()),this.items=[...this.items],this.requestUpdate()},this.items.length===this.length?200:40),yield"Press Next to pause",clearInterval(this.interval),!t;);return this.afterSort(),"Sort is complete"}}customElements.define("page-bubble-sort",class extends $e{constructor(){super(),this.title="Bubble Sort"}initMarkers(){this.markers=[new ge({position:0,size:1,color:"blue",text:"inner"}),new ge({position:1,size:1,color:"blue",text:"inner+1"}),new ge({position:this.items.length-1,size:2,color:"red",text:"outer"})]}*iteratorStep(){this.beforeSort();let e=0,t=0;for(let i=this.items.length-1;i>0;i--){for(let s=0;s<i;s++)this.items[s].value>this.items[s+1].value?(yield"Will be swapped",this.items[s].swapWith(this.items[s+1]),e++):yield"Will not be swapped",this.updateStats(e,++t),this.markers[0].position++,this.markers[1].position++;this.markers[0].position=0,this.markers[1].position=1,this.markers[2].position--}return this.afterSort(),"Sort is complete"}});customElements.define("page-select-sort",class extends $e{constructor(){super(),this.title="Select Sort"}initMarkers(){this.markers=[new ge({position:1,size:1,color:"blue",text:"inner"}),new ge({position:0,size:2,color:"red",text:"outer"}),new ge({position:0,size:3,color:"purple",text:"min"})]}*iteratorStep(){this.beforeSort();let e=0,t=0,i=0;for(let s=0;s<this.items.length-1;s++){i=s;for(let r=s+1;r<this.items.length;r++)yield"Searching for minimum",this.items[r].value<this.items[i].value&&(i=r,this.markers[2].position=i),this.markers[0].position++,this.updateStats(e,++t);i!==s?(yield"Will swap outer & min",this.items[s].swapWith(this.items[i]),this.updateStats(++e,t)):yield"Will not be swapped",this.markers[0].position=s+2,this.markers[1].position++,this.markers[2].position=s+1}return this.afterSort(),"Sort is complete"}});customElements.define("page-insertion-sort",class extends $e{constructor(){super(),this.title="Insertion Sort"}initItems(e){super.initItems(e),this.temp=new pe({value:0})}initMarkers(){this.markers=[new ge({position:1,size:1,color:"blue",text:"inner"}),new ge({position:1,size:2,color:"red",text:"outer"}),new ge({position:"temp",size:1,color:"purple",text:"temp"})]}updateStats(e=0,t=0){this.consoleStats.setMessage(`Copies: ${e}, Comparisons: ${t}`)}afterSort(){super.afterSort(),this.temp=new pe({value:0})}*iteratorStep(){this.beforeSort();let e=0,t=0;for(let i,s=1;s<this.items.length;s++){for(yield"Will copy outer to temp",this.items[s].swapWith(this.temp),e++,i=s;i>0;i--){if(this.updateStats(e,++t),this.temp.value>=this.items[i-1].value){yield"Have compared inner-1 and temp: no copy necessary";break}yield"Have compared inner-1 and temp: will copy inner to inner-1",this.items[i].swapWith(this.items[i-1]),this.updateStats(++e,t),this.markers[0].position--}yield"Will copy temp to inner",this.temp.swapWith(this.items[i]),this.markers[0].position=s+1,this.markers[1].position++}return this.afterSort(),"Sort is complete"}});class Se extends be{constructor(){super(),this.items=[],this.markers=[],this.length=0,this.initItems(),this.initMarkers()}render(){return I`
      <h1>Stack</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorPush)}>Push</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorPop)}>Pop</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorPeek)}>Peek</x-button>
        <x-info>
          <p><b>New</b> creates new stack</p> 
          <p><b>Push</b> inserts item with value N at top of stack</p> 
          <p><b>Pop</b> removes item from top of stack, returns value</p> 
          <p><b>Peek</b> returns value of item at top of stack</p>
        </x-info>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog")}initItems(){const e=[];for(let t=0;t<10;t++){const i=new pe({index:t});t<4&&i.setValue(Math.floor(1e3*Math.random())),e.push(i)}this.items=e,this.length=4}initMarkers(){this.markers=[new ge({position:3,size:1,color:"red",text:"top"})]}*iteratorNew(){yield"Will create new empty stack";this.items=[];for(let e=0;e<10;e++)this.items.push(new pe({index:e}));this.length=0,this.markers[0].position=-1}*iteratorPush(){if(this.length===this.items.length)return"ERROR: can't push. Stack is full";let e=0;return yield"Enter key of item to push",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0?"ERROR: can't push. Need key between 0 and 999":(yield`Will push item with key ${e}`,this.markers[0].position++,yield"Incremented top",this.items[this.length].setValue(e),this.length++,`Inserted item with key ${e}`)}*iteratorPop(){if(0===this.length)return"ERROR: can't pop. Stack is empty";yield"Will pop item from top of stack";const e=this.items[this.length-1],t=e.value;return e.clear(),yield`Item removed; Returned value is ${t}`,this.markers[0].position--,this.length--,"Decremented top"}*iteratorPeek(){return 0===this.length?"ERROR: can't peek. Stack is empty":(yield"Will peek at item at top of stack",`Returned value is ${this.items[this.length-1].value}`)}}customElements.define("page-stack",Se);class Ce extends Se{constructor(){super(),this.title="Queue",this.info=I`
      <p><b>New</b> creates new queue</p> 
      <p><b>Ins</b> inserts item with value N at rear of queue</p> 
      <p><b>Rem</b> removes item from front of queue, returns value</p> 
      <p><b>Peek</b> returns value of item at front of queue</p> 
    `}render(){return I`
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorPeek)}>Peek</x-button>
        <x-info>${this.info}</x-info>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}initMarkers(){this.markers=[new ge({position:0,size:1,color:"red",text:"front"}),new ge({position:this.length-1,size:3,color:"blue",text:"rear"})]}*iteratorNew(){yield"Will create new empty queue";this.items=[];for(let e=0;e<10;e++)this.items.push(new pe({index:e}));this.length=0,this.initMarkers()}getNextIndex(e){return e+1===this.items.length?0:e+1}*iteratorIns(){if(this.length===this.items.length)return"ERROR: can't push. Queue is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will insert item with key ${e}`;const t=this.getNextIndex(this.markers[1].position);return this.items[t].setValue(e),this.markers[1].position=t,this.length++,`Inserted item with key ${e}`}*iteratorRem(){if(0===this.length)return"ERROR: can't remove. Queue is empty";yield"Will remove item from front of queue";const e=this.markers[0].position,t=this.items[e],i=t.value;return t.clear(),this.markers[0].position=this.getNextIndex(e),this.length--,`Item removed; Returned value is ${i}`}*iteratorPeek(){return 0===this.length?"ERROR: can't peek. Queue is empty":(yield"Will peek at front of queue",`Returned value is ${this.items[this.markers[0].position].value}`)}}customElements.define("page-queue",Ce);customElements.define("page-priority-queue",class extends Ce{constructor(){super(),this.title="Priority Queue",this.info=I`
      <p><b>New</b> creates new empty priority queue</p> 
      <p><b>Ins</b> inserts item with value N</p>
      <p><b>Rem</b> removes item from front of queue, returns value</p> 
      <p><b>Peek</b> returns value of item at front of queue</p>
    `}initItems(){const e=[],t=le(4,1e3);t.sort((e,t)=>t-e);for(let i=0;i<10;i++){const s=new pe({index:i});i<4&&s.setValue(t[i]),e.push(s)}this.items=e,this.length=4}initMarkers(){this.markers=[new ge({position:this.length-1,size:1,color:"red",text:"front"}),new ge({position:0,size:3,color:"blue",text:"rear"}),new ge({position:-1,size:1,color:"purple"})]}*iteratorIns(){if(this.length===this.items.length)return"ERROR: can't push. Queue is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";this.markers[2].position=this.markers[0].position,yield`Will insert item with key ${e}`;for(let t=this.markers[0].position;t>=-1;t--){if(-1===t||e<=this.items[t].value){this.markers[2].position++,yield"Found place to insert",this.items[t+1].setValue(e),this.markers[0].position++;break}this.items[t+1].moveFrom(this.items[t]),yield"Searching for place to insert",this.markers[2].position--}return this.markers[2].position=-1,this.length++,`Inserted item with key ${e}`}*iteratorRem(){if(0===this.length)return"ERROR: can't remove. Queue is empty";yield"Will remove item from front of queue";const e=this.items[this.markers[0].position],t=e.value;return e.clear(),this.markers[0].position--,this.length--,`Item removed; Returned value is ${t}`}});class Re extends ne{static get properties(){return{items:{type:Array},marker:{type:Object},narrow:{type:Boolean}}}constructor(){super(),this.items=[],this.marker={}}render(){return I`
      ${this.items.map((e,t)=>I`
        <div class="item ${e.mark?"mark":""} ${null==e.value?"no-data":""}">
          <div class="value" style="${e.color?"background-color:"+e.color:""}">
            ${null!=e.value?e.value:I`&nbsp;`}
          </div>
          <div class="marker_container">
            ${this.marker.position===(null!=e.index?e.index:t)?I`<div class="marker"></div>`:""}
          </div>
        </div>
      `)}
    `}}Re.styles=se`
  :host {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    height: 19em;
    max-width: 600px;
  }
  :host([narrow]),
  :host([narrow]) .item {
    height: 3em;
  }
  :host([narrow]) .item:first-child {
    margin-left: 0.6em;
  }
  :host([narrow]) .item:first-child:after {
    display: none;
  }
  :host([narrow]) .marker:after {
    height: 10px;
  }
  .item {
    display: flex;
    flex-direction: column;
    position: relative;
    margin-left: 2em;
    height: 4.5em;
  }
  .item.no-data:before,
  .item:first-child:before {
    display: none;  
  }
  .item.mark:first-child:after {
    border-left: none;
  }
  .item:first-child:after {
    left: 2em;
    width: 3em;
  }
  .item:last-child:after {
    width: 5em;
  }
  .item.mark:last-child:after {
    border-right: none;
  }
  .item:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 0.85em;
    left: -1px;
    transform: translate(-100%, -50%) rotate(45deg);
    transform-origin: center;
    border: 2px solid;
    border-left: none;
    border-bottom: none;
    border-color: gray;
  }
  .item:after {
    content: '';
    display: block;
    position: absolute;
    height: 2px;
    width: 7em;
    top: 0.85em;
    left: -2em;
    margin-top: -1px;
    background-color: gray;
  }
  .item.mark {
    top: 1.5em;
    height: 3em;
    left: 1em;
    margin: 0;
  }
  .item.mark:before {
    top: -1px;
    left: 1em;
    margin-left: -1px;
    transform: translate(-50%, -100%) rotate(135deg);
  }
  .item.mark:after {
    height: .75em;
    width: 1em;
    top: -.75em;
    left: 1em;
    border: 2px solid gray;
    border-top: none;
    border-bottom: none;
    transform: translate(-2px, 2px);
    background-color: transparent;
  }
  .value {
    z-index: 1;
    min-width: 1.7em;
    min-height: 1.7em;
    padding: 0 10px;
    margin: 0;
    line-height: 1.7em;
    border: 1px solid lightgray;
    align-self: center;
  }
  .marker {
    position: relative;
  }
  .marker:before {
    content: '';
    display: block;
    position: absolute;
    width: 5px;
    height: 5px;
    top: 2px;
    left: 50%;
    transform: rotate(-45deg) translate(-50%, -50%);
    border: 2px solid;
    border-left: none;
    border-bottom: none;
    border-color: red;
  }
  .marker:after {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    height: 1em;
    top: 1px;
    left: 50%;
    margin-left: -2px;
    background-color: red;
  }
`,customElements.define("x-items-horizontal-linked",Re);customElements.define("page-link-list",class extends be{constructor(){super(),this.initItems(13),this.initMarkers()}render(){return I`
      <h1>Link List</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        <label><input class="sorted" type="checkbox" disabled>Sorted</label>
        <x-info>
          <p><b>New</b> creates linked list with N items (28 max)</p> 
          <p><b>Ins</b> inserts new item with value N</p> 
          <p><b>Find</b> finds item with value N</p> 
          <p><b>Del</b> deletes item with value N</p> 
          <p><b>Sorted</b> checkbox is used with New</p> 
        </x-info>
      </div>
      <x-console></x-console>
      <x-items-horizontal-linked .items=${this.items} .marker=${this.marker}></x-items-horizontal-linked>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog"),this.sorted=this.querySelector(".sorted")}initItems(e,t){const i=le(e,1e3);t&&i.sort((e,t)=>e-t),this.items=i.map(e=>new pe({}).setValue(e))}initMarkers(){this.marker=new ge({position:0})}*iteratorNew(){let e=0;if(yield"Enter size of linked list to create",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>56||e<0)return"ERROR: use size between 0 and 60";yield`Will create list with ${e} links`,this.sorted.disabled=!1,yield"Select: Sorted or not",this.sorted.disabled=!0,this.initItems(e,this.sorted.checked)}*search(e,t){for(let i=0;i<this.items.length;i++){if(this.marker.position=i,this.items[i].value===e||t&&this.items[i].value>e)return i;i!==this.length-1&&(yield`Searching for ${t?"insertion point":`item with key ${e}`}`)}}*iteratorIns(){if(56===this.items.length)return"ERROR: can't insert, list is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";const t=new pe({mark:!0}).setValue(e);let i=0;if(this.sorted.checked)if(yield"Will search insertion point",i=yield*this.search(e,!0),yield"Have found insertion point",null!=i){const e=this.items.splice(i,this.items.length-i,t);this.items=this.items.concat(e)}else this.items.push(t);else yield`Will insert item with key ${e}`,this.items.unshift(t);return this.marker.position=-1,yield"Item inserted. Will redraw the list",t.mark=!1,this.marker.position=i,yield`Inserted item with key ${e}`,this.marker.position=0,`Insertion completed. Total items = ${this.items.length}`}*iteratorFind(){let e=0;if(yield"Enter key of item to find",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${e}`;let t=yield*this.search(e);return this.marker.position=0,`${null==t?"No":"Have found"} items with key ${e}`}*iteratorDel(){let e=0;if(yield"Enter key of item to delete",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${e}`;let t=yield*this.search(e);return null==t?(this.marker.position=0,`No items with key ${e}`):(yield`Have found item with key ${e}`,this.items[t].clear(),yield"Deleted item. Will redraw the list",this.items.splice(t,1),this.marker.position=0,`Deleted item with key ${e}. Total items = ${this.items.length}`)}});customElements.define("page-merge-sort",class extends $e{constructor(){super(),this.title="Merge Sort",this.length=12,this.initItems(),this.initMarkers()}initMarkers(){this.markers=[new ge({position:0,size:1,color:"red",text:"lower"}),new ge({position:0,size:2,color:"red",text:"upper"}),new ge({position:0,size:3,color:"blue",text:"mid"}),new ge({position:-1,size:3,color:"purple",text:"ptr"})]}updateStats(e=0,t=0){this.consoleStats.setMessage(`Copies: ${e}, Comparisons: ${t}`)}*merge(e,t,i){let s=e,r=t-1,n=[];for(;e<=r&&t<=i;)this.comparisons++,this.items[e].value<this.items[t].value?n.push(new pe(this.items[e++])):n.push(new pe(this.items[t++]));for(;e<=r;)n.push(new pe(this.items[e++]));for(;t<=i;)n.push(new pe(this.items[t++]));this.markers[2].position=-1,this.markers[3].position=s,this.copies+=n.length,this.updateStats(this.copies,this.comparisons),yield`Merged ${s}-${r} and ${r+1}-${i} into workSpace`;for(let e=0;e<n.length;e++)this.items[s+e].copyFrom(n[e]),this.markers[3].position=s+e,this.updateStats(++this.copies,this.comparisons),yield`Copied workspace into ${s+e}`}*iteratorStep(){this.beforeSort(),this.copies=0,this.comparisons=0;const e=[],t=(i,s)=>{if(e.push({type:"mergeSortStart",lower:i,upper:s}),i!==s){let r=Math.floor((i+s)/2);e.push({type:"mergeSortLower",lower:i,upper:r}),t(i,r),e.push({type:"mergeSortUpper",lower:r+1,upper:s}),t(r+1,s),e.push({type:"merge",lower:i,mid:r+1,upper:s})}else e.push({type:"mergeSortEnd",lower:i,upper:s})};t(0,this.items.length-1),yield"Initial call to mergeSort";for(let t=0;t<e.length;t++)switch(e[t].type){case"mergeSortStart":this.markers[0].position=e[t].lower,this.markers[1].position=e[t].upper,yield`Entering mergeSort: ${e[t].lower}-${e[t].upper}`;break;case"mergeSortEnd":yield`Exiting mergeSort: ${e[t].lower}-${e[t].upper}`;break;case"mergeSortLower":this.markers[2].position=e[t].upper,yield`Will sort lower half: ${e[t].lower}-${e[t].upper}`;break;case"mergeSortUpper":this.markers[1].position=e[t].upper,this.markers[2].position=e[t].lower,yield`Will sort upper half: ${e[t].lower}-${e[t].upper}`;break;case"merge":yield"Will merge ranges",this.markers[0].position=e[t].lower,this.markers[1].position=e[t].upper,yield*this.merge(e[t].lower,e[t].mid,e[t].upper),this.markers[3].position=-1}return this.afterSort(),"Sort is complete"}});customElements.define("page-shell-sort",class extends $e{constructor(){super(),this.title="Shell Sort"}initItems(e){super.initItems(e),this.temp=new pe({value:0})}initMarkers(){this.markers=[new ge({position:-1,size:1,color:"red",text:"outer"}),new ge({position:-1,size:2,color:"blue",text:"inner"}),new ge({position:-1,size:3,color:"blue",text:"inner-h"}),new ge({position:"temp",size:1,color:"purple",text:"temp"})]}updateStats(e=0,t=0,i=1){this.consoleStats.setMessage(`Copies: ${e}, Comparisons: ${t}, h=${i}`)}afterSort(){super.afterSort(),this.temp=new pe({value:0})}*iteratorStep(){this.beforeSort();let e=0,t=0,i=1;for(;i<=(this.items.length-1)/3;)i=3*i+1;for(;i>0;){this.updateStats(e,t,i);for(let s=i;s<this.items.length;s++){let r=s;for(this.markers[0].position=s,this.markers[1].position=r,this.markers[2].position=r-i,yield`${i}-sorting array. Will copy outer to temp`,this.updateStats(++e,t,i),this.items[s].swapWith(this.temp),yield"Will compare inner-h and temp",this.updateStats(e,++t,i);r>i-1&&this.temp.value<=this.items[r-i].value;)yield"inner-h >= temp; Will copy inner-h to inner",this.updateStats(++e,t,i),this.items[r].swapWith(this.items[r-i]),r-=i,this.markers[1].position=r,this.markers[2].position=r-i,r<=i-1?yield"There is no inner-h":(yield"Will compare inner-h and temp",this.updateStats(e,++t,i));yield`${r<=i-1?"":"inner-h < temp; "}Will copy temp to inner`,this.updateStats(++e,t,i),this.temp.swapWith(this.items[r])}i=(i-1)/3}return this.afterSort(),"Sort is complete"}});customElements.define("page-partition",class extends $e{constructor(){super(),this.title="Partition",this.partition=-1,this.length=12,this.initItems(),this.initMarkers()}afterSort(){super.afterSort(),this.pivots=[]}initMarkers(){this.markers=[new ge({position:-1,size:1,color:"blue",text:"leftScan"}),new ge({position:-1,size:1,color:"blue",text:"rightScan"}),new ge({position:this.partition,size:2,color:"purple",text:"partition"})]}*iteratorStep(){this.beforeSort(),this.markers[2].position=-1;let e=0,t=0,i=this.items.length-1;this.pivots=[{start:0,end:i,value:40+Math.floor(20*Math.random())}],yield`Pivot value is ${this.pivots[0].value}`;let s=-1,r=i+1;for(;;){for(yield`Will scan ${s>-1?"again":""} from left`,this.markers[0].position=s+1,this.updateStats(e,++t);s<i&&this.items[++s].value<this.pivots[0].value;)s<i&&(yield"Continue left scan",this.markers[0].position=s+1),this.updateStats(e,++t);for(yield"Will scan from right",this.markers[1].position=r-1,this.updateStats(e,++t);r>0&&this.items[--r].value>this.pivots[0].value;)r>0&&(yield"Continue right scan",this.markers[1].position=r-1),this.updateStats(e,++t);if(s>=r){yield"Scans have met";break}yield"Will swap leftScan and rightScan",this.updateStats(++e,t),this.items[s].swapWith(this.items[r])}return this.partition=s,this.afterSort(),"Arrow shows partition"}});class Ne extends $e{constructor(){super(),this.title="Quick Sort 1",this.length=12,this.initItems(),this.initMarkers()}initMarkers(){this.pivots=[],this.markers=[new ge({position:0,size:1,color:"red",text:"left"}),new ge({position:0,size:2,color:"blue",text:"leftScan"}),new ge({position:this.items.length-1,size:1,color:"red",text:"right"}),new ge({position:this.items.length-2,size:2,color:"blue",text:"rightScan"}),new ge({position:this.items.length-1,size:3,color:"purple",text:"pivot"})]}*partition(e,t,i){let s=e-1,r=t+1;for(;;){for(this.markers[1].position=s,this.markers[3].position=r,s>=e?yield"Will scan again":yield`leftScan = ${s}, rightScan = ${r}; Will scan`,this.comparisons++;this.items[++s].value<this.items[i].value;)s<t&&this.comparisons++;for(this.comparisons++;r>0&&this.items[--r].value>this.items[i].value;)this.comparisons++;if(this.markers[1].position=s,this.markers[3].position=r,s>=r){yield"Scans have met. Will swap pivot and leftScan",this.updateStats(++this.swaps,this.comparisons),this.items[s].swapWith(this.items[i]),yield`Array partitioned: left (${e}-${s-1}), right (${s+1}-${t+1}) `;break}yield"Will swap leftScan and rightScan",this.updateStats(++this.swaps,this.comparisons),this.items[s].swapWith(this.items[r])}return s}*iteratorStep(){this.beforeSort(),this.swaps=0,this.comparisons=0;const e=[{state:"initial",left:0,right:this.items.length-1}];for(;e.length>0;){let{state:t,left:i,right:s}=e.pop();if("initial"!==t&&(this.markers[0].position=i,this.markers[1].position=i,this.markers[2].position=s,this.markers[3].position=s-1,this.markers[4].position=s,yield`Will sort ${t} partition (${i}-${s})`),s-i<1)yield`Entering quickSort; Partition (${i}-${s}) is too small to sort`;else{this.pivots.push({start:i,end:s,value:this.items[s].value}),yield`Entering quickSort; Will partition (${i}-${s})`;let t=yield*this.partition(i,s-1,s);e.push({state:"right",left:t+1,right:s}),e.push({state:"left",left:i,right:t-1})}}return this.afterSort(),"Sort completed"}}customElements.define("page-quick-sort-1",Ne);customElements.define("page-quick-sort-2",class extends Ne{constructor(){super(),this.title="Quick Sort 2"}*partition(e,t,i){let s=e,r=t-1;for(;;){for(this.markers[1].position=s,this.markers[3].position=r,s>e?yield"Will scan again":yield`Will scan (${s+1}-${r-1})`,this.comparisons++;this.items[++s].value<this.items[i].value;)s<t&&this.comparisons++;for(this.comparisons++;this.items[--r].value>this.items[i].value;)this.comparisons++;if(this.markers[1].position=s,this.markers[3].position=r,s>=r){yield"Scans have met. Will swap pivot and leftScan",this.updateStats(++this.swaps,this.comparisons),this.items[s].swapWith(this.items[i]),yield`Array partitioned: left (${e}-${s-1}), right (${s+1}-${t}) `;break}yield"Will swap leftScan and rightScan",this.updateStats(++this.swaps,this.comparisons),this.items[s].swapWith(this.items[r])}return s}leftCenterRightSort(e,t,i){this.items[e].value>this.items[t].value&&(this.swaps++,this.items[e].swapWith(this.items[t])),this.items[e].value>this.items[i].value&&(this.swaps++,this.items[e].swapWith(this.items[i])),this.items[t].value>this.items[i].value&&(this.swaps++,this.items[t].swapWith(this.items[i]))}manualSort(e,t){const i=t-e+1;2===i?this.items[e].value>this.items[t].value&&(this.swaps++,this.items[e].swapWith(this.items[t])):3===i&&this.leftCenterRightSort(e,t-1,t)}*iteratorStep(){this.beforeSort(),this.swaps=0,this.comparisons=0;const e=[{state:"initial",left:0,right:this.items.length-1}];for(;e.length>0;){let{state:t,left:i,right:s}=e.pop();"initial"!==t&&(this.markers[0].position=i,this.markers[1].position=i,this.markers[2].position=s,this.markers[3].position=s-1,this.markers[4].position=s,yield`Will sort ${t} partition (${i}-${s})`);const r=s-i+1;if(r<=3)1===r?yield`quickSort entry; Array of 1 (${i}-${s}) always sorted`:2===r?yield`quickSort entry; Will sort 2-elements array (${i}-${s})`:3===r&&(yield`quickSort entry; Will sort left, center, right (${i}-${s-1}-${s})`),this.manualSort(i,s),this.updateStats(this.swaps,this.comparisons),1===r?yield"No actions necessary":2===r?yield"Done 2-element sort":3===r&&(yield"Done left-center-right sort");else{const t=Math.floor((i+s)/2);yield`quickSort entry; Will sort left, center, right (${i}-${t}-${s})`,this.leftCenterRightSort(i,t,s),this.updateStats(this.swaps,this.comparisons),this.markers[4].position=t,yield`Will partition (${i}-${s}); pivot will be ${t}`,this.pivots.push({start:i,end:s,value:this.items[t].value}),yield"Will swap pivot and right-1",this.updateStats(++this.swaps,this.comparisons),this.items[t].swapWith(this.items[s-1]),this.markers[4].position=s-1;let r=yield*this.partition(i,s,s-1);e.push({state:"right",left:r+1,right:s}),e.push({state:"left",left:i,right:r-1})}}return this.afterSort(),"Sort completed"}});class Ee extends ne{static get properties(){return{items:{type:Array},marker:{type:Object},clickFn:{type:Function}}}constructor(){super(),this.items=[]}getCoords(e){const t=Math.floor(Math.log2(e+1)),i=600/2**(t+1);return{x:2*i*(e+1-2**t)+i,y:60*(t+1)}}render(){const e=this.items.map((e,t)=>{const i=this.getCoords(t),s=2*t+1,r=s+1,n=this.getCoords(s),o=this.getCoords(r);return null!=e.value?D`
        <g fill="${e.color}">
          ${this.items[s]&&null!=this.items[s].value?D`
            <line class="line" x1="${i.x}" y1="${i.y}" x2="${n.x}" y2="${n.y}">
          `:""}
          ${this.items[r]&&null!=this.items[r].value?D`
            <line class="line" x1="${i.x}" y1="${i.y}" x2="${o.x}" y2="${o.y}">
          `:""}
          <g @click=${this.clickHandler.bind(this,e)} class="${null!=this.clickFn?"clickable":""}">
            <circle class="item ${e.mark?"marked":""}" cx="${i.x}" cy="${i.y}" r="12"></circle>
            <text class="value" x="${i.x}" y="${i.y+2}" text-anchor="middle" alignment-baseline="middle">${e.value}</text>
          </g>
        </g>
        ${this.renderMarker(t,i)}
      `:""});return D`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
        ${e}
      </svg>
    `}clickHandler(e){if(null!=this.clickFn)return this.marker=new ge({position:e.index}),this.clickFn(e)}renderMarker(e,t){let i="";return this.marker&&this.marker.position===e&&(i=D`
        <g class="marker">
          <line x1="${t.x}" y1="${t.y-13}" x2="${t.x}" y2="${t.y-35}"></line>        
          <line x1="${t.x}" y1="${t.y-13}" x2="${t.x-4}" y2="${t.y-20}"></line>       
          <line x1="${t.x}" y1="${t.y-13}" x2="${t.x+4}" y2="${t.y-20}"></line>        
        </g>
      `),i}}Ee.styles=se`
  :host {
    display: block;
    height: 400px;
    width: 600px;    
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .item {
    stroke: black;
  }
  .item.marked {
    stroke: red;
  }
  .clickable {
    cursor: pointer;
    stroke-width: 2px;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .line {
    stroke: black;
  }
  .marker line {
    stroke: red;
    stroke-width: 2px;
  }
`,customElements.define("x-items-tree",Ee);class _e extends be{constructor(){super(),this.initItems(29),this.initMarker()}render(){return I`
      <h1>Binary Tree</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorTrav)}>Trav</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        <x-info>
          <p><b>Fill</b> creates a new tree with N nodes</p> 
          <p><b>Find</b> searches for a node with value N</p>
          <p><b>Ins</b> inserts a new node with value N</p>
          <p><b>Trav</b> traverses the tree in ascending order</p> 
          <p><b>Del</b> deletes the node with value N</p>
        </x-info>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector(".main-console"),this.travConsole=this.querySelector(".console-stats"),this.dialog=this.querySelector("x-dialog")}initItems(e){const t=new Array(31).fill().map((e,t)=>new pe({index:t}));for(let i=0;i<=e-1;i++){let e=0;const i=Math.floor(100*Math.random());for(;t[e]&&null!=t[e].value;)e=2*e+(t[e].value>i?1:2);t[e]&&t[e].setValue(i)}this.items=t}initMarker(){this.marker=new ge({position:0})}*iteratorFill(){let e=0;if(yield"Enter number of nodes (1 to 31)",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>31||e<1)return"ERROR: use size between 1 and 31";yield`Will create tree with ${e} nodes`,this.initItems(e)}*iteratorFind(){let e=0;if(yield"Enter key of node to find",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 99";yield`Will try to find node with key ${e}`;let t=0,i=!1;for(;this.items[t]&&null!=this.items[t].value;){if(this.marker.position=t,this.items[t].value===e){i=!0;break}const s=this.items[t].value>e;t=2*t+(s?1:2),yield`Going to ${s?"left":"right"} child`}yield`${i?"Have found":"Can't find"} node ${e}`,yield"Search is complete",this.initMarker()}*iteratorIns(){let e=0;if(yield"Enter key of node to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>99||e<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will insert node with key ${e}`;let t=0;for(;this.items[t]&&null!=this.items[t].value;){this.marker.position=t;const i=this.items[t].value>e;t=2*t+(i?1:2),yield`Going to ${i?"left":"right"} child`}this.items[t]?(this.marker.position=t,this.items[t].setValue(e),yield`Have inserted node with key ${e}`,yield"Insertion completed"):yield"Can't insert: Level is too great",this.initMarker()}*iteratorTrav(){yield'Will traverse tree in "inorder"',this.travConsole.setMessage("");const e=[];for(!function t(i,s){if(!s[i]||null==s[i].value)return;const r=2*i+1,n=2*i+2;e.push({type:"left",index:r}),t(r,s),e.push({type:"self",index:i,value:s[i].value}),e.push({type:"right",index:n}),t(n,s),e.push({type:"exit",index:i})}(0,this.items);e.length>0;){const t=e.shift();switch(this.items[t.index]&&null!=this.items[t.index].value&&(this.marker.position=t.index),t.type){case"self":yield"Will visit this node",this.travConsole.setMessage(this.travConsole.message+" "+t.value);break;case"left":yield"Will check for left child";break;case"right":yield"Will check for right child";break;case"exit":yield"Will go to root of last subtree"}}yield"Finish traverse",this.travConsole.setMessage("")}*iteratorDel(){let e=0;if(yield"Enter key of node to delete",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 99";yield`Will try to find node with key ${e}`;let t=0,i=!1;for(;this.items[t]&&null!=this.items[t].value;){if(this.marker.position=t,this.items[t].value===e){i=!0;break}const s=this.items[t].value>e;t=2*t+(s?1:2),yield`Going to ${s?"left":"right"} child`}if(!i)return"Can't find node to delete";yield"Have found node to delete";const s=this.items[t],r=this.items[2*t+1],n=this.items[2*t+2];if(r&&null!=r.value||n&&null!=n.value)if(n&&null!=n.value)if(r&&null!=r.value){const e=_e.getSuccessor(s.index,this.items);yield`Will replace node with ${this.items[e].value}`;const t=this.items[2*e+2]&&null!=this.items[2*e+2].value;t&&(yield`and replace ${this.items[e].value} with its right subtree`),s.moveFrom(this.items[e]),t?(_e.moveSubtree(2*e+2,e,this.items),yield"Removed node in 2-step process"):yield"Node was replaced by successor"}else yield"Will replace node with its right subtree",_e.moveSubtree(n.index,s.index,this.items),yield"Node was replaced by its right subtree";else yield"Will replace node with its left subtree",_e.moveSubtree(r.index,s.index,this.items),yield"Node was replaced by its left subtree";else s.clear(),yield"Node was deleted";this.initMarker()}static getSuccessor(e,t){let i=e,s=2*e+2;for(;t[s]&&null!=t[s].value;)i=s,s=2*s+1;return i}static moveSubtree(e,t,i){const s=[];!function e(t,r){i[t]&&null!=i[t].value&&(s[r]=new pe(i[t]),i[t].clear(),e(2*t+1,2*r+1),e(2*t+2,2*r+2))}(e,t),s.forEach((e,t)=>{i[t].moveFrom(e)})}}customElements.define("page-binary-tree",_e);customElements.define("page-redblack-tree",class extends be{constructor(){super(),this.init()}render(){return I`
      <h1>Red-Black Tree</h1>
      <div class="controlpanel">
        <x-button .callback=${this.init.bind(this)}>Start</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFlip)}>Flip</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorRoL)}>RoL</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorRoR)}>RoR</x-button>
        <x-button .callback=${this.swichRB.bind(this)}>R/B</x-button>
        <x-info>
          <p><b>Click on node</b> to move arrow to it</p> 
          <p><b>Start</b> makes a new tree with one node</p> 
          <p><b>Ins</b> inserts a new node with value N</p> 
          <p><b>Del</b> deletes the node with value N</p> 
          <p><b>Flip</b> swaps colors between black parent (arrow) and two red children</p> 
          <p><b>RoL</b> rotates left around node with arrow</p> 
          <p><b>RoR</b> rotates right around node with arrow</p> 
          <p><b>R/B</b> toggles color of node with arrow</p> 
        </x-info>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${e=>this.marker.position=e.index}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector(".main-console"),this.correctnessConsole=this.querySelector(".console-stats"),this.dialog=this.querySelector("x-dialog")}handleClick(){const e=super.handleClick(...arguments);return this.checkRules(),e}init(){const e=new Array(31).fill().map((e,t)=>new pe({index:t}));e[0].setValue(50),this.items=e,this.marker=new ge({position:0}),this.console&&this.checkRules()}*iteratorIns(){let e=0;if(yield"Enter key of node to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>99||e<0)return"ERROR: can't insert. Need key between 0 and 999";let t=0,i=!1;for(;this.items[t]&&null!=this.items[t].value;)t=2*t+((i=this.items[t].value>e)?1:2);if(!this.items[t])return"CAN'T INSERT: Level is too great";{const s=Math.floor((t-1)/2),r=Math.floor((s-1)/2);if(this.items[s].mark&&this.items[r]&&!this.items[r].mark&&this.items[2*r+(i?2:1)].mark)return this.marker.position=r,"CAN'T INSERT: Needs color flip";this.marker.position=t,this.items[t].setValue(e),this.items[t].mark=!0}}*iteratorDel(){let e=0;if(yield"Enter key of node to delete",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>99||e<0)return"ERROR: can't insert. Need key between 0 and 999";let t=0;for(;this.items[t]&&null!=this.items[t].value&&this.items[t].value!==e;)t=2*t+(this.items[t].value>e?1:2);if(!this.items[t]||null==this.items[t].value)return"Can't find node to delete";const i=this.items[t],s=this.items[2*t+1],r=this.items[2*t+2];if(s&&null!=s.value||r&&null!=r.value)if(r&&null!=r.value)if(s&&null!=s.value){const e=_e.getSuccessor(i.index,this.items),t=this.items[2*e+2]&&null!=this.items[2*e+2].value;i.moveFrom(this.items[e]),t&&_e.moveSubtree(2*e+2,e,this.items)}else _e.moveSubtree(r.index,i.index,this.items);else _e.moveSubtree(s.index,i.index,this.items);else this.items[t].mark=!1,i.clear()}checkRules(){let e=null;this.items[0].mark&&(e="ERROR: Root must be black"),this.items.forEach((t,i)=>{const s=this.items[2*i+1],r=this.items[2*i+2];null!=s&&t.mark&&(s.mark||r.mark)&&(e="ERROR: Parent and child are both red!",this.marker.position=t.index)});let t=1,i=null;null==e&&function s(r,n){if(!n[r]||null==n[r].value)return void(null!=i&&t!==i?e="ERROR: Black counts differ!":i=t);const o=2*r+1,a=2*r+2;n[o]&&!n[o].mark&&null!=n[o].value&&t++,s(o,n),n[o]&&null!=n[o].value||n[a]&&null!=n[a].value||(null!=i&&t!==i?e="ERROR: Black counts differ!":i=t),n[a]&&!n[a].mark&&null!=n[a].value&&t++,s(a,n),n[r].mark||t--}(0,this.items),this.correctnessConsole.setMessage(e||"Tree is red-black correct"),this.requestUpdate()}*iteratorFlip(){const e=this.items[this.marker.position],t=this.items[2*this.marker.position+1],i=this.items[2*this.marker.position+2];if(!t||!i||null==t.value||null==i.value)return"Node has no children";if(0===e.index&&t.mark===i.mark)t.mark=!t.mark,i.mark=!i.mark;else{if(e.mark===t.mark||t.mark!==i.mark)return"Can't flip this color arrangement";t.mark=!t.mark,i.mark=!i.mark,e.mark=!e.mark}}*iteratorRoL(){const e=this.marker.position,t=2*e+1,i=2*e+2;if(!this.items[i]||null==this.items[i].value)return"Can't rotate";this.items[t]&&null!=this.items[t].value&&_e.moveSubtree(t,2*t+1,this.items),this.items[t].moveFrom(this.items[e]),this.items[e].moveFrom(this.items[i]);const s=2*i+1;this.items[s]&&null!=this.items[s].value&&_e.moveSubtree(s,2*t+2,this.items);const r=2*i+2;this.items[r]&&null!=this.items[r].value&&_e.moveSubtree(r,i,this.items)}*iteratorRoR(){const e=this.marker.position,t=2*e+1,i=2*e+2;if(!this.items[t]||null==this.items[t].value)return"Can't rotate";this.items[i]&&null!=this.items[i].value&&_e.moveSubtree(i,2*i+2,this.items),this.items[i].moveFrom(this.items[e]),this.items[e].moveFrom(this.items[t]);const s=2*t+2;this.items[s]&&null!=this.items[s].value&&_e.moveSubtree(s,2*i+1,this.items);const r=2*t+1;this.items[r]&&null!=this.items[r].value&&_e.moveSubtree(r,t,this.items)}swichRB(){this.items[this.marker.position].mark=!this.items[this.marker.position].mark,this.checkRules()}});customElements.define("page-hash-table",class extends be{constructor(){super(),this.initItems(),this.initMarkers(),this.DELETED="Del"}render(){return I`
      <h1>Hash Table (linear/quad/double)</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" disabled checked>Linear</label>
        <label><input type="radio" name="algorithm" class="algorithm algorithm_quad" disabled>Quad</label>
        <label><input type="radio" name="algorithm" class="algorithm algorithm_double" disabled>Double</label>
        <x-info>
          <p><b>New</b> creates hash table with N cells (60 max)</p> 
          <p><b>Fill</b> inserts N items into table</p> 
          <p><b>Ins</b> inserts new item with value N</p> 
          <p><b>Find</b> finds item with value N</p> 
          <p><b>Linear/Quad/Double</b> selects probe method</p> 
        </x-info>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog"),this.double=this.querySelector(".algorithm_double"),this.quad=this.querySelector(".algorithm_quad"),this.linear=this.querySelector(".algorithm_linear")}initItems(){const e=[];for(let t=0;t<59;t++)e.push(new pe({index:t}));this.length=30,this.items=e,le(30,1e3).forEach(t=>{e[this.probeIndex(t)].setValue(t)})}initMarkers(){this.markers=[new ge({position:0})]}hashFn(e){return e%this.items.length}doubleHashFn(e){return 5-e%5}probeIndex(e){let t=this.hashFn(e),i=1,s=0;for(;null!=this.items[t].value;)s++,this.double&&this.double.checked&&(i=this.doubleHashFn(e)),this.quad&&this.quad.checked&&(i=s**2),(t+=i)>=this.items.length&&(t-=this.items.length);return t}*iteratorNew(){let e=0;if(yield"Enter size of array to create. Closest prime number will be selected",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>60||e<0)return"ERROR: use size between 0 and 60";for(;!de(e);)e--;this.double.disabled=!1,this.quad.disabled=!1,this.linear.disabled=!1,yield"Please, select probe method",this.double.disabled=!0,this.quad.disabled=!0,this.linear.disabled=!0,yield`Will create empty array with ${e} cells`;const t=[];for(let i=0;i<e;i++)t.push(new pe({index:i}));return this.items=t,this.length=0,"New array created; total items = 0"}*iteratorFill(){let e=0;return yield"Enter number of items to fill in",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>this.items.length||e<0?`ERROR: can't fill more than ${this.items.length} items`:(yield`Will fill in ${e} items`,le(e,1e3).forEach(e=>{this.items[this.probeIndex(e)].setValue(e)}),this.length=e,`Fill completed; total items = ${e}`)}*iteratorIns(){if(this.items.length===this.length)return"ERROR: can't insert, array is full";let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will insert item with key ${e}`;let t=this.hashFn(e),i=1,s=0;for(this.markers[0].position=t;null!=this.items[t].value&&this.items[t].value!==this.DELETED;)yield`Cell ${t} occupied; going to next cell`,s++,this.double.checked&&(i=this.doubleHashFn(e)),this.quad.checked&&(i=s**2),(t+=i)>=this.items.length&&(t-=this.items.length),this.markers[0].position=t,yield`Searching for unoccupied cell; step was ${i}`;return this.items[t].setValue(e),yield`Inserted item with key ${e} at index ${t}`,this.length++,this.markers[0].position=0,`Insertion completed; total items ${this.length}`}*iteratorProbe(e){let t,i=this.hashFn(e);if(this.markers[0].position=i,yield`Looking for item with key ${e} at index ${i}`,this.items[i].value===e)t=i;else if(null!=this.items[i].value){yield"No match; will start probe";let s=1,r=0;for(;null==t&&++r!==this.items.length&&(this.double.checked&&(s=this.doubleHashFn(e)),this.quad.checked&&(s=r**2),(i+=s)>=this.items.length&&(i-=this.items.length),null!=this.items[i].value);)this.markers[0].position=i,this.items[i].value===e?t=i:yield`Checking next cell; step was ${s}`}return t}*iteratorFind(){let e=0;if(yield"Enter key of item to find",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";null==(yield*this.iteratorProbe(e,!1))?yield`Can't locate item with key ${e}`:yield`Have found item with key ${e}`,this.markers[0].position=0}*iteratorDel(){let e=0;if(yield"Enter key of item to delete",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: use key between 0 and 999";yield`Looking for item with key ${e}`;let t=yield*this.iteratorProbe(e,!0);null==t?yield`Can't locate item with key ${e}`:(this.items[t].value=this.DELETED,this.items[t].color=null,this.length--,yield`Deleted item with key ${e}; total items ${this.length}`),this.markers[0].position=0}});customElements.define("page-hash-chain",class extends be{constructor(){super(),this.initItems(25),this.fillValues(this.items.length),this.initMarkers()}render(){return I`
      <h1>Hash Table Chain</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDel)}>Del</x-button>
        <x-info>
          <p><b>New</b> creates new hash table containing N linked lists</p>
          <p><b>Fill</b> inserts N items into table</p>
          <p><b>Ins</b> inserts new item with value N</p>
          <p><b>Find</b> finds item with value N</p>
          <p><b>Del</b> deletes item with value N</p>
        </x-info>
      </div>
      <x-console></x-console>
      <ol start="0" style="height: 30em; overflow-y: scroll;">${this.renderLines()}</ol>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}renderLines(){return this.items.map((e,t)=>I`
      <li><x-items-horizontal-linked .items=${e.items} .marker=${e.marker} narrow class="list-${t}"></x-items-horizontal-linked></li>
    `)}firstUpdated(){this.console=this.querySelector("x-console"),this.dialog=this.querySelector("x-dialog")}initItems(e){const t=[];for(let i=0;i<e;i++)t.push({items:[new pe({})],marker:{}});this.items=t,this.length=0}fillValues(e){le(e,1e3).forEach(e=>{const t=this.items[this.hashFn(e)];null==t.items[0].value?t.items[0].setValue(e):t.items.push(new pe({}).setValue(e))}),this.length=e}initMarkers(){this.items[0].marker=new ge({position:0})}clearInitialMarker(){this.items[0].marker={}}hashFn(e){return e%this.items.length}*iteratorNew(){let e=0;return yield"Enter size of table to create.",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>100||e<0?"ERROR: use size between 0 and 100":(yield`Will create empty table with ${e} lists`,this.initItems(e),"New table created; total items = 0")}*iteratorFill(){let e=0;return yield"Enter number of items to fill in",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>this.items.length||e<0?`ERROR: can't fill more than ${this.items.length} items`:(yield`Will fill in ${e} items`,this.fillValues(e),`Fill completed; total items = ${e}`)}*iteratorIns(){let e=0;if(yield"Enter key of item to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>1e3||e<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will insert item with key ${e}`,this.clearInitialMarker();let t=this.hashFn(e);const i=this.items[t];return i.marker=new ge({position:0}),this.querySelector(`.list-${t}`).scrollIntoViewIfNeeded(),yield`Will insert in list ${t}`,null==i.items[0].value?i.items[0].setValue(e):i.items.push(new pe({}).setValue(e)),yield`Inserted item with key ${e} in list ${t}`,i.marker={},this.initMarkers(),this.length++,`Insertion completed. Total items = ${this.length}`}*iteratorFind(e){let t=0;if(yield"Enter key of item to find",this.dialog.open().then(e=>{t=Number(e.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",t>1e3||t<0)return"ERROR: use key between 0 and 999";yield`Will try to find item with key ${t}`,this.clearInitialMarker();let i=this.hashFn(t);const s=this.items[i];s.marker=new ge({position:0}),this.querySelector(`.list-${i}`).scrollIntoViewIfNeeded(),yield`Item with key ${t} should be in list ${i}`;let r,n=0;for(;s.items[n]&&null!=s.items[n].value;){if(s.marker=new ge({position:n}),yield`Looking for item with key ${t} at link ${n}`,s.items[n].value===t){r=n;break}n++}return null==r?yield`Can't locate item with key ${t}`:yield`Have found item with key ${t}`,s.marker={},this.initMarkers(),e&&null!=r?t:void 0}*iteratorDel(){let e=yield*this.iteratorFind(!0);if(null!=e){this.clearInitialMarker();const t=this.items[this.hashFn(e)],i=t.items.findIndex(t=>t.value===e);0===i?(t.marker.position=i,t.items[i].clear()):(t.marker.position=i-1,t.items.splice(i,1)),this.length--,yield`Deleted item with key ${e}. Total items = ${this.length}`,t.marker={},this.initMarkers()}}});customElements.define("page-heap",class extends be{constructor(){super(),this.initItems(10),this.initMarker()}render(){return I`
      <h1>Heap</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this,this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorChng)}>Chng</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorIns)}>Ins</x-button>
        <x-info>
          <p><b>Fill</b> creates new heap with N nodes</p>
          <p><b>Chng</b> changes selected node to value N</p>
          <p><b>Click on node</b> to select it</p>
          <p><b>Rem</b> removes node with highest key</p>
          <p><b>Ins</b> inserts new node with value N</p>
        </x-info>
      </div>
      <x-console class="main-console"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `}firstUpdated(){this.console=this.querySelector(".main-console"),this.dialog=this.querySelector("x-dialog"),this.tree=this.querySelector("x-items-tree")}initItems(e){const t=new Array(31).fill().map((e,t)=>new pe({index:t}));for(let i=0;i<=e-1;i++){const e=Math.floor(100*Math.random());t[i].setValue(e);let s=i,r=Math.floor((i-1)/2);for(;s>=0&&t[r]&&t[r].value<e;)t[r].swapWith(t[s]),s=r,r=Math.floor((r-1)/2)}this.items=t,this.length=e}initMarker(){this.marker=new ge({position:0})}*iteratorFill(){let e=0;if(yield"Enter number of nodes (1 to 31)",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>31||e<1)return"ERROR: use size between 1 and 31";yield`Will create tree with ${e} nodes`,this.initItems(e)}*trickleUp(e,t){this.items[t].setValue("","#ffffff"),yield"Saved new node; will trickle up";let i=Math.floor((t-1)/2);for(;t>=0&&this.items[i]&&this.items[i].value<e;)this.items[i].swapWith(this.items[t]),this.marker.position=i,yield"Moved empty node up",t=i,i=Math.floor((i-1)/2);yield"Trickle up completed",this.items[t].setValue(e),this.marker.position=t}*iteratorIns(){if(this.items.length===this.length)return"ERROR: can't insert, no room in display";let e=0;if(yield"Enter key of node to insert",this.dialog.open().then(t=>{e=Number(t.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",e>99||e<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will insert node with key ${e}`;let t=this.length;this.items[t].setValue(e),this.marker.position=t,yield"Placed node in first empty cell",yield*this.trickleUp(e,t),yield"Inserted new node in empty node",this.marker.position=0,this.length++}*trickleDown(e,t){const i=new pe(this.items[e]);for(this.items[e].setValue("","#ffffff"),yield`Saved ${t?"changed":"root"} node (${i.value})`;e<Math.floor(this.length/2);){let s;const r=2*e+1,n=r+1;if(s=n<this.length&&this.items[r].value<this.items[n].value?n:r,yield`Key ${this.items[s].value} is larger child`,this.items[s].value<i.value){yield`${t?"Changed":'"Last"'} node larger; will insert it`;break}this.items[s].swapWith(this.items[e]),e=s,this.marker.position=e,yield"Moved empty node down"}Math.floor(Math.log2(this.length))===Math.floor(Math.log2(e+1))?yield"Reached bottom row, so done":e>=Math.floor(this.length/2)&&(yield"Node has no children, so done"),this.items[e]=i,yield`Inserted ${t?"changed":'"last"'} node`}*iteratorRem(){const e=this.items[0].value;yield`Will remove largest node (${e})`,this.items[0].setValue("","#ffffff");const t=this.items[this.length-1];yield`Will replace with "last" node (${t.value})`,this.items[0].moveFrom(t),this.length--,yield"Will trickle down",yield*this.trickleDown(0),yield`Finished deleting largest node (${e})`,this.marker.position=0}*iteratorChng(){this.tree.clickFn=(e=>this.marker.position=e.index),yield"Click on node to be changed",this.tree.clickFn=null;const e=this.marker.position,t=this.items[e].value;yield"Type node's new value";let i=0;if(this.dialog.open().then(e=>{i=Number(e.get("number")),this.iterate()},()=>this.iterate()),yield"Dialog opened",i>99||i<0)return"ERROR: can't insert. Need key between 0 and 999";yield`Will change node from ${t} to ${i}`,this.items[e].value>i?(this.items[e].setValue(i),yield"Key decreased; will trickle down",yield*this.trickleDown(e,!0)):(this.items[e].setValue(i),yield"Key increased; will trickle up",yield*this.trickleUp(i,e)),yield`Finished changing node (${t})`,this.marker.position=0}});class Me extends pe{constructor(e){super(e),this.x=e.x,this.y=e.y}}class Fe extends ne{static get properties(){return{limit:{type:Number},items:{type:Array},connections:{type:Array},markedConnections:{type:Array},clickFn:{type:Function},directed:{type:Boolean},weighted:{type:Boolean}}}getNoConnectionValue(){return this.weighted?1/0:0}render(){return D`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
        @dblclick=${this.dblclickHandler}
        @mousedown=${e=>e.preventDefault()}
        @mouseup=${this.dragendHandler}
        @mousemove=${this.dragHandler}
      >
        ${null!=this.dragOpts&&this.dragOpts.isConnection?D`
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}"></line>
        `:""}
        ${this.drawConnections(!1)}
        ${this.drawConnections(!0)}
        ${this.drawItems()}
      </svg>
      ${I`
        <x-dialog>
          <label>Weight (0—99): <input name="number" type="number" min="0" max="99" step="1"></label>
        </x-dialog>`}
      `}firstUpdated(){this.dialog=this.shadowRoot.querySelector("x-dialog")}drawItems(){return this.items.map(e=>D`
      <g fill="${e.color}">
        <g
          class="itemGroup ${null!=this.clickFn?"clickable":""}"
          @click=${this.clickHandler.bind(this,e)}
          @mousedown=${t=>this.dragstartHandler(t,e)}
          @mouseup=${t=>this.dragendHandler(t,e)}
          @mousemove=${this.itemHoverHandler}
          @mouseleave=${this.itemLeaveHandler}
        >
          <circle class="item ${e.mark?"marked":""}" cx="${e.x}" cy="${e.y}" r="12"></circle>
          <text class="value ${e.mark?"marked":""}" x="${e.x}" y="${e.y+2}" text-anchor="middle" alignment-baseline="middle">${e.value}</text>
        </g>
      </g>
    `)}drawConnections(e){const t=[],i=e?this.markedConnections:this.connections;if(i)return i.forEach((i,s)=>{i.forEach((i,r)=>{i!==this.getNoConnectionValue()&&t.push(D`
            <line
              class="line ${e?"marked":""}"
              x1="${this.items[s].x}"
              y1="${this.items[s].y}"
              x2="${this.items[r].x}"
              y2="${this.items[r].y}"
            ></line>
            ${this.directed?this.drawDirectionMarker(this.items[s],this.items[r]):""}
            ${this.weighted?this.drawWeightMarker(this.items[s],this.items[r],i):""}
          `)})}),t}drawDirectionMarker(e,t){const i=e.x-t.x,s=e.y-t.y;let r=-Math.atan(s/i)-Math.PI*(i>=0?1.5:.5);const n=t.x+20*Math.sin(r),o=t.y+20*Math.cos(r);return D`
      <circle class="directionMarker" cx="${n}" cy="${o}" r="3"></circle>
    `}drawWeightMarker(e,t,i){const s=(e.x+t.x)/2,r=(e.y+t.y)/2;return D`
      <rect class="weightRect" x="${s-9}" y="${r-9}" width="18" height="18"/>
      <text class="weightText" x="${s}" y="${r+1}" text-anchor="middle" alignment-baseline="middle">${i}</text>
    `}dblclickHandler(e){if(null!=this.dragOpts||this.limit===this.items.length)return;const t=this.items.length,i=new Me({index:t,x:e.offsetX,y:e.offsetY});i.setValue(String.fromCharCode(65+t)),this.items.push(i),this.connections.push(new Array(this.connections.length).fill(this.getNoConnectionValue())),this.connections.forEach(e=>e.push(this.getNoConnectionValue())),this.dispatchEvent(new Event("changed")),this.requestUpdate()}dragstartHandler(e,t){this.dragOpts={initialX:e.clientX,initialY:e.clientY,dragItem:t,isConnection:!e.ctrlKey}}dragHandler(e){null!=this.dragOpts&&(this.dragOpts.isConnection?(this.dragOpts.x=e.offsetX,this.dragOpts.y=e.offsetY):(this.dragOpts.dragItem.x=e.offsetX,this.dragOpts.dragItem.y=e.offsetY),this.requestUpdate())}dragendHandler(e,t){if(null!=this.dragOpts){if(this.dragOpts&&t&&t!==this.dragOpts.dragItem&&this.dragOpts.isConnection){const e=this.dragOpts.dragItem;this.weighted?this.dialog.open().then(i=>{this.createConnection(e,t,Number(i.get("number"))),this.requestUpdate()},()=>this.requestUpdate()):this.createConnection(e,t)}this.dragOpts=null,this.requestUpdate()}}createConnection(e,t,i=1){this.connections[e.index][t.index]=i,this.directed||(this.connections[t.index][e.index]=i),this.dispatchEvent(new Event("changed"))}clickHandler(e){if(null!=this.clickFn)return this.clickFn(e)}itemHoverHandler(e){e.ctrlKey?e.currentTarget.classList.add("draggable"):e.currentTarget.classList.remove("draggable")}itemLeaveHandler(e){e.target.classList.remove("draggable")}}Fe.styles=se`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    border: 1px gray solid;
  }
  svg {
    width: 100%;
    height: 100%;
  }
  .itemGroup {
    cursor: pointer;
  }
  .item {
    stroke: black;
  }
  .item.marked {
    stroke: red;
    stroke-width: 3px;
  }
  .clickable {
    stroke-width: 3px;
  }
  .draggable {
    cursor: grab;
  }
  .value {
    font: normal 13px sans-serif;
    fill: black;
    stroke: none;
  }
  .value.marked {
    fill: red;
  }
  .line {
    stroke: black;
  }
  .line.marked {
    stroke-width: 3px;
  }
  .directionMarker {
    stroke: black;
    stroke-width: 2px;
    fill: black;
  }
  .weightRect {
    stroke: black;
    stroke-width: 1px;
    fill: bisque;
  }
  .weightText {
    font: normal 12px sans-serif;
    fill: black;
    stroke: none;
  }
`,customElements.define("x-items-graph",Fe);class Ie extends ne{static get properties(){return{items:{type:Array},connections:{type:Array}}}render(){return I`
      <table>
        ${this.renderHeader()}
        ${this.items.map(e=>this.renderRow(e.value,this.connections[e.index]))}
      </table>
    `}renderHeader(){return I`
      <tr>
        <th></th>
        ${this.items.map(e=>I`<th>${e.value}</th>`)}
      </tr>
    `}renderRow(e,t){if(this.connections.length>0)return I`
        <tr>
          <td>${e}</td>
          ${this.items.map(e=>{const i=t[e.index].toString().slice(0,3);return I`<td>${i}</td>`})}
        </tr>
      `}}Ie.styles=se`
  :host {
    display: block;
    height: 400px;
    width: 600px;
    background: papayawhip;
  }
  table {
    font-size: 14px;
    border-collapse: collapse;
  }
  th, td {
    padding: 2px 5px;
  }
  th {
    font-weight: bold;
    border-bottom: 1px solid black;
  }
  td {
      font-family: monospace;
      text-align: center;
  }
  tr td:first-child,
  tr th:first-child {
    border-right: 1px solid black;
    font-family: sans-serif;
    font-weight: bold;
  }
`,customElements.define("x-items-table",Ie);class De extends be{constructor(){super(),this.initItems(),this.markedConnections=[],this.connections=[],this.renewConfirmed=!1,this.clickFn=null}render(){return I`
      <h4>Non-Directed Non-Weighted Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorDFS)}>DFS</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorBFS)}>BFS</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorMST)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
        <x-info>
          <p><b>Double-click</b> to create new vertex</p>
          <p><b>Drag</b> from vertex to vertex to create edge</p>
          <p><b>Drag + Ctrl</b> moves vertex</p>
          <p><b>New</b> clears an old graph</p>
          <p><b>DFS</b> carries out Depth First Search</p>
          <p><b>BFS</b> carries out Breadth First Search</p>
          <p><b>Tree</b> creates minimum spanning tree</p>
          <p><b>View</b> toggles between graph and adjacency matrix</p>
        </x-info>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.markedConnections}
        .clickFn=${this.clickFn}
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `}firstUpdated(){this.console=this.querySelector(".main-console"),this.statConsole=this.querySelector(".console-stats"),this.table=this.querySelector("x-items-table"),this.graph=this.querySelector("x-items-graph")}changedHandler(){this.table.requestUpdate()}toggleView(){this.table.toggleAttribute("hidden"),this.graph.toggleAttribute("hidden")}newGraph(){this.renewConfirmed?(this.initItems(),this.connections=[],this.console.setMessage(),this.renewConfirmed=!1):(this.console.setMessage("ARE YOU SURE? Press again to clear old graph"),this.renewConfirmed=!0),this.requestUpdate()}handleClick(){super.handleClick(...arguments),this.renewConfirmed=!1}reset(){this.items.forEach(e=>e.mark=!1),this.statConsole.setMessage()}*iteratorStartSearch(){let e;if(this.clickFn=(t=>{e=t,this.iterate()}),yield"Single-click on vertex from which to start",this.clickFn=null,null!=e)return yield`You clicked on ${e.value}`,e;yield"ERROR: Item's not clicked."}*iteratorDFS(e){const t=yield*this.iteratorStartSearch();if(null==t)return;const i=[t],s=[t];for(t.mark=!0,this.setStats(i,s),yield`Start search from vertex ${t.value}`;s.length>0;){const t=s[s.length-1],r=this.getAdjUnvisitedVertex(t);null==r?(s.pop(),this.setStats(i,s),s.length>0?yield`Will check vertices adjacent to ${s[s.length-1].value}`:yield"No more vertices with unvisited neighbors"):(s.length>0&&!0===e&&(this.markedConnections[t.index][r.index]=1,this.markedConnections[r.index][t.index]=1),s.push(r),i.push(r),r.mark=!0,this.setStats(i,s),yield`Visited vertex ${r.value}`)}!0!==e&&(yield"Press again to reset search",this.reset())}getAdjUnvisitedVertex(e){const t=this.connections[e.index];let i=null;return t.length>0&&(i=this.items.find(e=>!e.mark&&1===t[e.index])),i}setStats(e,t,i){t&&this.statConsole.setMessage(`Visits: ${e.map(e=>e.value).join(" ")}. Stack: (b->t): ${t.map(e=>e.value).join(" ")}`),i&&this.statConsole.setMessage(`Visits: ${e.map(e=>e.value).join(" ")}. Queue: (f->r): ${i.map(e=>e.value).join(" ")}`)}*iteratorBFS(){const e=yield*this.iteratorStartSearch();if(null==e)return;const t=[e],i=[e];e.mark=!0,this.setStats(t,null,i),yield`Start search from vertex ${e.value}`;let s=i.shift();for(this.setStats(t,null,i),yield`Will check vertices adjacent to ${e.value}`;null!=s;){const e=this.getAdjUnvisitedVertex(s);null==e?(yield`No more unvisited vertices adjacent to ${s.value}`,null!=(s=i.shift())&&(this.setStats(t,null,i),yield`Will check vertices adjacent to ${s.value}`)):(i.push(e),t.push(e),e.mark=!0,this.setStats(t,null,i),yield`Visited vertex ${e.value}`)}yield"Press again to reset search",this.reset()}*iteratorMST(){this.markedConnections=this.connections.map(()=>new Array(this.connections.length).fill(this.graph.getNoConnectionValue())),yield*this.iteratorDFS(!0),yield"Press again to hide unmarked edges";const e=this.connections;this.connections=this.markedConnections,this.markedConnections=[],yield"Minimum spanning tree; Press again to reset tree",this.connections=e,this.reset()}}customElements.define("page-graph-n",De);customElements.define("page-graph-d",class extends be{constructor(){super(),this.initItems(),this.connections=[],this.renewConfirmed=!1,this.clickFn=null}render(){return I`
      <h1>Directed Non-Weighted Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorTopo)}>Topo</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
        <x-info>
          <p><b>Double-click</b> to create new vertex</p>
          <p><b>Drag</b> from vertex to vertex to create edge</p>
          <p><b>Drag + Ctrl</b> moves vertex</p>
          <p><b>New</b> clears an old graph</p>
          <p><b>Topo</b> carries out topological sort</p>
          <p><b>View</b> toggles between graph and adjacency matrix</p>
        </x-info>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .clickFn=${this.clickFn}
        directed
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `}firstUpdated(){this.console=this.querySelector(".main-console"),this.statConsole=this.querySelector(".console-stats"),this.table=this.querySelector("x-items-table"),this.graph=this.querySelector("x-items-graph")}changedHandler(){this.table.requestUpdate()}toggleView(){this.table.toggleAttribute("hidden"),this.graph.toggleAttribute("hidden")}newGraph(){this.renewConfirmed?(this.initItems(),this.connections=[],this.console.setMessage(),this.renewConfirmed=!1):(this.console.setMessage("ARE YOU SURE? Press again to clear old graph"),this.renewConfirmed=!0),this.requestUpdate()}handleClick(){super.handleClick(...arguments),this.renewConfirmed=!1}*iteratorTopo(){yield"Will perform topological sort";const e=this.connections.map(e=>[...e]),t=this.items.map(e=>new Me(e)),i=[];for(let s=0;s<e.length;s++){const s=this.getNoSuccessorVertex();if(!s)return yield"ERROR: Cannot sort graph with cycles",this.connections=e,this.items=t,void this.statConsole.setMessage();yield`Will remove vertex ${s.value}`,i.push(s.value),this.statConsole.setMessage(`List: ${i.join(" ")}`),this.connections.splice(s.index,1),this.connections.forEach(e=>e.splice(s.index,1)),this.items.splice(s.index,1),this.items.forEach((e,t)=>e.index=t),yield`Added vertex ${s.value} at start of sorted list`}yield"Sort is complete. Will restore graph",this.connections=e,this.items=t,yield"Will reset sort",this.statConsole.setMessage()}getNoSuccessorVertex(){const e=this.connections.findIndex(e=>0===e.reduce((e,t)=>e+t));return null!=e&&this.items[e]}});class We{constructor({src:e,dest:t,weight:i}){this.src=e,this.dest=t,this.weight=i}get title(){return`${this.src.value}${this.dest.value}(${this.weight.toString().slice(0,3)})`}}customElements.define("page-graph-w",class extends De{render(){return I`
      <h1>Weighted, Undirected Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorMST)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
        <x-info>
          <p><b>Double-click</b> to create new vertex</p>
          <p><b>Drag</b> from vertex to vertex to create edge</p>
          <p><b>Drag + Ctrl</b> moves vertex</p>
          <p><b>New</b> clears an old graph</p>
          <p><b>Tree</b> creates minimum spanning tree</p>
          <p><b>View</b> toggles between graph and adjacency matrix</p>
        </x-info>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.markedConnections}
        .clickFn=${this.clickFn}
        weighted
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `}setStats(e,t){this.statConsole.setMessage(`Tree: ${e.map(e=>e.value).join(" ")}. PQ: ${t.map(e=>e.title).join(" ")}`)}*iteratorDFS(){let e=yield*this.iteratorStartSearch();if(yield`Starting tree from vertex ${e.value}`,null==e)return;const t=[],i=[];let s=0;for(;t.push(e),this.setStats(t,i),e.mark=!0,e.isInTree=!0,s++,yield`Placed vertex ${e.value} in tree`,s!==this.items.length;){if(this.items.forEach(t=>{const s=this.connections[e.index][t.index];t===e||t.isInTree||"number"!=typeof s||this.putInPQ(i,e,t,s)}),this.setStats(t,i),yield`Placed vertices adjacent to ${e.value} in priority queue`,0===i.length)return yield"Graph not connected",void this.reset();const s=i.pop();e=s.dest,yield`Removed minimum-distance edge ${s.title} from priority queue`,this.markedConnections[s.src.index][s.dest.index]=s.weight}this.items.forEach(e=>delete e.isInTree)}putInPQ(e,t,i,s){const r=e.findIndex(e=>e.dest===i);let n=!1;if(-1===r?n=!0:e[r].weight>s&&(e.splice(r,1),n=!0),n){const r=e.findIndex(e=>e.weight<s);e.splice(r<0?e.length:r,0,new We({src:t,dest:i,weight:s}))}}});let Pe;customElements.define("page-graph-dw",class extends De{render(){return I`
      <h1>Directed, Weighted Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this,this.iteratorPath)}>Path</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
        <x-info>
          <p><b>Double-click</b> to create new vertex</p>
          <p><b>Drag</b> from vertex to vertex to create edge</p>
          <p><b>Drag + Ctrl</b> moves vertex</p>
          <p><b>New</b> clears an old graph</p>
          <p><b>Path</b> finds all Shortest Paths from a vertex</p>
          <p><b>View</b> toggles between graph and adjacency matrix</p>
        </x-info>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—" allowHtml></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.markedConnections}
        .clickFn=${this.clickFn}
        directed
        weighted
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `}setStats(e){this.statConsole.setMessage(I`
      <table>
        <tr>
          ${e.map(e=>I`<th class=${e.dest.isInTree?"marked":""}>${e.dest.value}</th>`)}
        </tr>
        <tr>
          ${e.map(e=>I`<td>${e.weight.toString().slice(0,3)}(${e.src.value})</td>`)}
        </tr>
      </table>
    `)}*adjustShortestPath(e,t,i){const s=i.dest,r=i.weight;let n=0;for(;!(n>=e.length);){if(e[n].dest.isInTree){n++;continue}const i=e[n].weight,o=e[n].dest;yield`Will compare distances for column ${o.value}`;const a=this.connections[s.index][o.index],l=r+a<i;if(yield`To ${o.value}: ${t.value} to ${s.value} (${r.toString().slice(0,3)})\n        plus edge ${s.value}${o.value}(${a.toString().slice(0,3)})\n        ${l?"less than":"greater than or equal to"} ${t.value} to ${o.value} (${i.toString().slice(0,3)})`,l?(e[n].src=s,e[n].weight=r+a,this.setStats(e),yield`Updated array column ${o.value}`):yield`No need to update array column ${o.value}`,!(n<e.length))break;yield"Will examine next non-tree column",n++}yield"Done all entries in shortest-path array"}*iteratorPath(){let e=yield*this.iteratorStartSearch();if(null==e)return;yield`Starting from vertex ${e.value}`,e.mark=!0,e.isInTree=!0,yield`Added vertex ${e.value} to tree`,this.markedConnections=this.connections.map(()=>new Array(this.connections.length).fill(this.graph.getNoConnectionValue()));const t=this.connections[e.index].map((t,i)=>new We({src:e,dest:this.items[i],weight:t}));this.setStats(t),yield`Copied row ${e.value} from adjacency matrix to shortest path array`;let i=1;for(;i<this.items.length;){i++;const s=t.reduce((e,t)=>e&&e.weight<t.weight||t.dest.isInTree?e:t);if(!s||s.weight===1/0){yield"One or more vertices are UNREACHABLE";break}yield`Minimum distance from ${e.value} is ${s.weight}, to vertex ${s.dest.value}`,s.dest.mark=!0,s.dest.isInTree=!0,this.markedConnections[s.src.index][s.dest.index]=this.connections[s.src.index][s.dest.index],this.setStats(t),yield`Added vertex ${s.dest.value} to tree`,yield"Will adjust values in shortest-path array",yield*this.adjustShortestPath(t,e,s)}yield`All shortest paths from ${e.value} found. Distances in array`,yield"Press again to reset paths",this.items.forEach(e=>{delete e.isInTree,e.mark=!1}),this.markedConnections=[],this.statConsole.setMessage()}});const qe={"#array":"page-array","#orderedArray":"page-ordered-array","#bubbleSort":"page-bubble-sort","#selectSort":"page-select-sort","#insertionSort":"page-insertion-sort","#stack":"page-stack","#queue":"page-queue","#priorityQueue":"page-priority-queue","#linkList":"page-link-list","#mergeSort":"page-merge-sort","#shellSort":"page-shell-sort","#partition":"page-partition","#quickSort1":"page-quick-sort-1","#quickSort2":"page-quick-sort-2","#binaryTree":"page-binary-tree","#redBlackTree":"page-redblack-tree","#hashTable":"page-hash-table","#hashChain":"page-hash-chain","#heap":"page-heap","#graphN":"page-graph-n","#graphD":"page-graph-d","#graphW":"page-graph-w","#graphDW":"page-graph-dw"};customElements.define("x-app",class extends ne{render(){return I`
      <nav>
        <h1>List of Applets</h1>
        <h2>Chapter 1 — Overview</h2>
        <div class="nav-item">(No applets)</div>
        
        <h2>Chapter 2 — Arrays</h2>
        <div class="nav-item"><a href="#array">1) Array</a></div>
        <div class="nav-item"><a href="#orderedArray">2) OrderedArray</a></div>
        
        <h2>Chapter 3 — Simple Sorting</h2>
        <div class="nav-item"><a href="#bubbleSort">3) Bubble</a></div>
        <div class="nav-item"><a href="#insertionSort">4) Insertion</a></div>
        <div class="nav-item"><a href="#selectSort">5) Selection</a></div>
        
        <h2>Chapter 4 — Stacks and Queues</h2>
        <div class="nav-item"><a href="#stack">6) Stack</a></div>
        <div class="nav-item"><a href="#queue">7) Queue</a></div>
        <div class="nav-item"><a href="#priorityQueue">8) PriorityQ</a></div>
        
        <h2>Chapter 5 — Linked Lists</h2>
        <div class="nav-item"><a href="#linkList">9) LinkList</a></div>
        
        <h2>Chapter 6 — Recursion</h2>
        <div class="nav-item" title="In progress">10) Towers</div>
        <div class="nav-item"><a href="#mergeSort">11) mergeSort</a></div>
        
        <h2>Chapter 7 — Advanced Sorting</h2>
        <div class="nav-item"><a href="#shellSort">12) shellSort</a></div>
        <div class="nav-item"><a href="#partition">13) partition</a></div>
        <div class="nav-item"><a href="#quickSort1">14) quickSort1</a></div>
        <div class="nav-item"><a href="#quickSort2">15) quickSort2</a></div>
        
        <h2>Chapter 8 — Binary Trees</h2>
        <div class="nav-item"><a href="#binaryTree">16) Tree</a></div>
        
        <h2>Chapter 9 — Red-black Trees</h2>
        <div class="nav-item"><a href="#redBlackTree">17) RBTree</a></div>
        
        <h2>Chapter 10 — 2-3-4 Trees</h2>
        <div class="nav-item" title="In progress">18) Tree234</div>
        
        <h2>Chapter 11 — Hash Tables</h2>
        <div class="nav-item"><a href="#hashTable">19-20) Hash/HashDouble</a></div>
        <div class="nav-item"><a href="#hashChain">21) HashChain</a></div>
        
        <h2>Chapter 12 — Heaps</h2>
        <div class="nav-item"><a href="#heap">22) Heap</a></div>
        
        <h2>Chapter 13 — Graphs</h2>
        <div class="nav-item"><a href="#graphN">23) GraphN</a></div>
        <div class="nav-item"><a href="#graphD">24) GraphD</a></div>
        
        <h2>Chapter 14 — Weighted Graphs</h2>
        <div class="nav-item"><a href="#graphW">25) GraphW</a></div>
        <div class="nav-item"><a href="#graphDW">26) GraphDW</a></div>
      </nav>
      <x-view component="page-start"></x-view>      
      <footer>Built by Stanislav Proshkin with ❤ and WebComponents</footer>
    `}createRenderRoot(){return this}firstUpdated(){Pe=this.querySelector("x-view"),this.loadView(),window.addEventListener("hashchange",this.loadView,!1)}disconnectedCallback(){window.removeEventListener("hashchange",this.loadView)}loadView(){const e=location.hash;""!==e&&(Pe.component=qe[e],Pe.scrollIntoView())}})});