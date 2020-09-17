(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive so that lit-html will call the function
 * during template rendering, rather than passing as a value.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object
 *
 * @example
 *
 * ```
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 * ```
 */
// tslint:disable-next-line:no-any
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = window.customElements !== undefined &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Reparents nodes, starting from `startNode` (inclusive) to `endNode`
 * (exclusive), into another container (could be the same container), before
 * `beforeNode`. If `beforeNode` is null, it appends the nodes to the
 * container.
 */
const reparentNodes = (container, start, end = null, before = null) => {
    let node = start;
    while (node !== end) {
        const n = node.nextSibling;
        container.insertBefore(node, before);
        node = n;
    }
};
/**
 * Removes nodes, starting from `startNode` (inclusive) to `endNode`
 * (exclusive), from `container`.
 */
const removeNodes = (container, startNode, endNode = null) => {
    let node = startNode;
    while (node !== endNode) {
        const n = node.nextSibling;
        container.removeChild(node);
        node = n;
    }
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updateable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        let index = -1;
        let partIndex = 0;
        const nodesToRemove = [];
        const _prepareTemplate = (template) => {
            const content = template.content;
            // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
            // null
            const walker = document.createTreeWalker(content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
            // Keeps track of the last index associated with a part. We try to delete
            // unnecessary nodes, but we never want to associate two different parts
            // to the same index. They must have a constant node between.
            let lastPartIndex = 0;
            while (walker.nextNode()) {
                index++;
                const node = walker.currentNode;
                if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                    if (node.hasAttributes()) {
                        const attributes = node.attributes;
                        // Per
                        // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                        // attributes are not guaranteed to be returned in document order.
                        // In particular, Edge/IE can return them out of order, so we cannot
                        // assume a correspondance between part index and attribute index.
                        let count = 0;
                        for (let i = 0; i < attributes.length; i++) {
                            if (attributes[i].value.indexOf(marker) >= 0) {
                                count++;
                            }
                        }
                        while (count-- > 0) {
                            // Get the template literal section leading up to the first
                            // expression in this attribute
                            const stringForPart = result.strings[partIndex];
                            // Find the attribute name
                            const name = lastAttributeNameRegex.exec(stringForPart)[2];
                            // Find the corresponding attribute
                            // All bound attributes have had a suffix added in
                            // TemplateResult#getHTML to opt out of special attribute
                            // handling. To look up the attribute value we also need to add
                            // the suffix.
                            const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                            const attributeValue = node.getAttribute(attributeLookupName);
                            const strings = attributeValue.split(markerRegex);
                            this.parts.push({ type: 'attribute', index, name, strings });
                            node.removeAttribute(attributeLookupName);
                            partIndex += strings.length - 1;
                        }
                    }
                    if (node.tagName === 'TEMPLATE') {
                        _prepareTemplate(node);
                    }
                }
                else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                    const data = node.data;
                    if (data.indexOf(marker) >= 0) {
                        const parent = node.parentNode;
                        const strings = data.split(markerRegex);
                        const lastIndex = strings.length - 1;
                        // Generate a new text node for each literal section
                        // These nodes are also used as the markers for node parts
                        for (let i = 0; i < lastIndex; i++) {
                            parent.insertBefore((strings[i] === '') ? createMarker() :
                                document.createTextNode(strings[i]), node);
                            this.parts.push({ type: 'node', index: ++index });
                        }
                        // If there's no text, we must insert a comment to mark our place.
                        // Else, we can trust it will stick around after cloning.
                        if (strings[lastIndex] === '') {
                            parent.insertBefore(createMarker(), node);
                            nodesToRemove.push(node);
                        }
                        else {
                            node.data = strings[lastIndex];
                        }
                        // We have a part for each match found
                        partIndex += lastIndex;
                    }
                }
                else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                    if (node.data === marker) {
                        const parent = node.parentNode;
                        // Add a new marker node to be the startNode of the Part if any of
                        // the following are true:
                        //  * We don't have a previousSibling
                        //  * The previousSibling is already the start of a previous part
                        if (node.previousSibling === null || index === lastPartIndex) {
                            index++;
                            parent.insertBefore(createMarker(), node);
                        }
                        lastPartIndex = index;
                        this.parts.push({ type: 'node', index });
                        // If we don't have a nextSibling, keep this node so we have an end.
                        // Else, we can remove it to save future costs.
                        if (node.nextSibling === null) {
                            node.data = '';
                        }
                        else {
                            nodesToRemove.push(node);
                            index--;
                        }
                        partIndex++;
                    }
                    else {
                        let i = -1;
                        while ((i = node.data.indexOf(marker, i + 1)) !==
                            -1) {
                            // Comment node has a binding marker inside, make an inactive part
                            // The binding won't work, but subsequent bindings will
                            // TODO (justinfagnani): consider whether it's even worth it to
                            // make bindings in comments work
                            this.parts.push({ type: 'node', index: -1 });
                        }
                    }
                }
            }
        };
        _prepareTemplate(element);
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#attributes-0
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-character
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * @module lit-html
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this._parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this._parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this._parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // When using the Custom Elements polyfill, clone the node, rather than
        // importing it, to keep the fragment in the template's document. This
        // leaves the fragment inert so custom elements won't upgrade and
        // potentially modify their contents by creating a polyfilled ShadowRoot
        // while we traverse the tree.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const parts = this.template.parts;
        let partIndex = 0;
        let nodeIndex = 0;
        const _prepareInstance = (fragment) => {
            // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
            // null
            const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
            let node = walker.nextNode();
            // Loop through all the nodes and parts of a template
            while (partIndex < parts.length && node !== null) {
                const part = parts[partIndex];
                // Consecutive Parts may have the same node index, in the case of
                // multiple bound attributes on an element. So each iteration we either
                // increment the nodeIndex, if we aren't on a node with a part, or the
                // partIndex if we are. By not incrementing the nodeIndex when we find a
                // part, we allow for the next part to be associated with the current
                // node if neccessasry.
                if (!isTemplatePartActive(part)) {
                    this._parts.push(undefined);
                    partIndex++;
                }
                else if (nodeIndex === part.index) {
                    if (part.type === 'node') {
                        const part = this.processor.handleTextExpression(this.options);
                        part.insertAfterNode(node.previousSibling);
                        this._parts.push(part);
                    }
                    else {
                        this._parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
                    }
                    partIndex++;
                }
                else {
                    nodeIndex++;
                    if (node.nodeName === 'TEMPLATE') {
                        _prepareInstance(node.content);
                    }
                    node = walker.nextNode();
                }
            }
        };
        _prepareInstance(fragment);
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * @module lit-html
 */
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const endIndex = this.strings.length - 1;
        let html = '';
        for (let i = 0; i < endIndex; i++) {
            const s = this.strings[i];
            // This exec() call does two things:
            // 1) Appends a suffix to the bound attribute name to opt out of special
            // attribute value parsing that IE11 and Edge do, like for style and
            // many SVG attributes. The Template class also appends the same suffix
            // when looking up attributes to create Parts.
            // 2) Adds an unquoted-attribute-safe marker for the first expression in
            // an attribute. Subsequent attribute expressions will use node markers,
            // and this is safe since attributes with multiple expressions are
            // guaranteed to be quoted.
            const match = lastAttributeNameRegex.exec(s);
            if (match) {
                // We're starting a new bound attribute.
                // Add the safe attribute suffix, and use unquoted-attribute-safe
                // marker.
                html += s.substr(0, match.index) + match[1] + match[2] +
                    boundAttributeSuffix + match[3] + marker;
            }
            else {
                // We're either in a bound node, or trailing bound attribute.
                // Either way, nodeMarker is safe to use.
                html += s + nodeMarker;
            }
        }
        return html + this.strings[endIndex];
    }
    getTemplateElement() {
        const template = document.createElement('template');
        template.innerHTML = this.getHTML();
        return template;
    }
}
/**
 * A TemplateResult for SVG fragments.
 *
 * This class wraps HTMl in an `<svg>` tag in order to parse its contents in the
 * SVG namespace, then modifies the template to remove the `<svg>` tag so that
 * clones only container the original fragment.
 */
class SVGTemplateResult extends TemplateResult {
    getHTML() {
        return `<svg>${super.getHTML()}</svg>`;
    }
    getTemplateElement() {
        const template = super.getTemplateElement();
        const content = template.content;
        const svgElement = content.firstChild;
        content.removeChild(svgElement);
        reparentNodes(content, svgElement.firstChild);
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * @module lit-html
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
/**
 * Sets attribute values for AttributeParts, so that the value is only set once
 * even if there are multiple parts for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = this.parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (v != null &&
                    (Array.isArray(v) ||
                        // tslint:disable-next-line:no-any
                        typeof v !== 'string' && v[Symbol.iterator])) {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
                else {
                    text += typeof v === 'string' ? v : String(v);
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
class AttributePart {
    constructor(comitter) {
        this.value = undefined;
        this.committer = comitter;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive$$1 = this.value;
            this.value = noChange;
            directive$$1(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
class NodePart {
    constructor(options) {
        this.value = undefined;
        this._pendingValue = undefined;
        this.options = options;
    }
    /**
     * Inserts this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part between `ref` and `ref`'s next sibling. Both `ref` and
     * its next sibling must be static, unchanging nodes such as those that appear
     * in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part._insert(this.startNode = createMarker());
        part._insert(this.endNode = createMarker());
    }
    /**
     * Appends this part after `ref`
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref._insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive$$1 = this._pendingValue;
            this._pendingValue = noChange;
            directive$$1(this);
        }
        const value = this._pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this._commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this._commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this._commitNode(value);
        }
        else if (Array.isArray(value) ||
            // tslint:disable-next-line:no-any
            value[Symbol.iterator]) {
            this._commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this._commitText(value);
        }
    }
    _insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    _commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this._insert(value);
        this.value = value;
    }
    _commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = value;
        }
        else {
            this._commitNode(document.createTextNode(typeof value === 'string' ? value : String(value)));
        }
        this.value = value;
    }
    _commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this._commitNode(fragment);
            this.value = instance;
        }
    }
    _commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this._pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive$$1 = this._pendingValue;
            this._pendingValue = noChange;
            directive$$1(this);
        }
        if (this._pendingValue === noChange) {
            return;
        }
        const value = !!this._pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
        }
        this.value = value;
        this._pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // tslint:disable-next-line:no-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the thrid
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
try {
    const options = {
        get capture() {
            eventOptionsSupported = true;
            return false;
        }
    };
    // tslint:disable-next-line:no-any
    window.addEventListener('test', options, options);
    // tslint:disable-next-line:no-any
    window.removeEventListener('test', options, options);
}
catch (_e) {
}
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this._pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this._boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive$$1 = this._pendingValue;
            this._pendingValue = noChange;
            directive$$1(this);
        }
        if (this._pendingValue === noChange) {
            return;
        }
        const newListener = this._pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this._boundHandleEvent, this._options);
        }
        if (shouldAddListener) {
            this._options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this._boundHandleEvent, this._options);
        }
        this.value = newListener;
        this._pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const comitter = new PropertyCommitter(element, name.slice(1), strings);
            return comitter.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const comitter = new AttributeCommitter(element, name, strings);
        return comitter.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * @module lit-html
 */
const parts = new WeakMap();
/**
 * Renders a template to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result a TemplateResult created by evaluating a template tag like
 *     `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 *
 * Main lit-html module.
 *
 * Main exports:
 *
 * -  [[html]]
 * -  [[svg]]
 * -  [[render]]
 *
 * @module lit-html
 * @preferred
 */
/**
 * Do not remove this comment; it keeps typedoc from misplacing the module
 * docs.
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
(window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.0.0');
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);
/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 */
const svg = (strings, ...values) => new SVGTemplateResult(strings, values, 'svg', defaultTemplateProcessor);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * @module shady-render
 */
const walkerNodeFilter = 133;
/**
 * Removes the list of nodes from a Template safely. In addition to removing
 * nodes from the Template, the Template part indices are updated to match
 * the mutated Template DOM.
 *
 * As the template is walked the removal state is tracked and
 * part indices are adjusted as needed.
 *
 * div
 *   div#1 (remove) <-- start removing (removing node is div#1)
 *     div
 *       div#2 (remove)  <-- continue removing (removing node is still div#1)
 *         div
 * div <-- stop removing since previous sibling is the removing node (div#1,
 * removed 4 nodes)
 */
function removeNodesFromTemplate(template, nodesToRemove) {
    const { element: { content }, parts } = template;
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let part = parts[partIndex];
    let nodeIndex = -1;
    let removeCount = 0;
    const nodesToRemoveInTemplate = [];
    let currentRemovingNode = null;
    while (walker.nextNode()) {
        nodeIndex++;
        const node = walker.currentNode;
        // End removal if stepped past the removing node
        if (node.previousSibling === currentRemovingNode) {
            currentRemovingNode = null;
        }
        // A node to remove was found in the template
        if (nodesToRemove.has(node)) {
            nodesToRemoveInTemplate.push(node);
            // Track node we're removing
            if (currentRemovingNode === null) {
                currentRemovingNode = node;
            }
        }
        // When removing, increment count by which to adjust subsequent part indices
        if (currentRemovingNode !== null) {
            removeCount++;
        }
        while (part !== undefined && part.index === nodeIndex) {
            // If part is in a removed node deactivate it by setting index to -1 or
            // adjust the index as needed.
            part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
            // go to the next active part.
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
            part = parts[partIndex];
        }
    }
    nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
}
const countNodes = (node) => {
    let count = (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) ? 0 : 1;
    const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
    while (walker.nextNode()) {
        count++;
    }
    return count;
};
const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
    for (let i = startIndex + 1; i < parts.length; i++) {
        const part = parts[i];
        if (isTemplatePartActive(part)) {
            return i;
        }
    }
    return -1;
};
/**
 * Inserts the given node into the Template, optionally before the given
 * refNode. In addition to inserting the node into the Template, the Template
 * part indices are updated to match the mutated Template DOM.
 */
function insertNodeIntoTemplate(template, node, refNode = null) {
    const { element: { content }, parts } = template;
    // If there's no refNode, then put node at end of template.
    // No part indices need to be shifted in this case.
    if (refNode === null || refNode === undefined) {
        content.appendChild(node);
        return;
    }
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let insertCount = 0;
    let walkerIndex = -1;
    while (walker.nextNode()) {
        walkerIndex++;
        const walkerNode = walker.currentNode;
        if (walkerNode === refNode) {
            insertCount = countNodes(node);
            refNode.parentNode.insertBefore(node, refNode);
        }
        while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
            // If we've inserted the node, simply adjust all subsequent parts
            if (insertCount > 0) {
                while (partIndex !== -1) {
                    parts[partIndex].index += insertCount;
                    partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                }
                return;
            }
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
        }
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Module to add shady DOM/shady CSS polyfill support to lit-html template
 * rendering. See the [[render]] method for details.
 *
 * @module shady-render
 * @preferred
 */
/**
 * Do not remove this comment; it keeps typedoc from misplacing the module
 * docs.
 */
// Get a key to lookup in `templateCaches`.
const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
let compatibleShadyCSSVersion = true;
if (typeof window.ShadyCSS === 'undefined') {
    compatibleShadyCSSVersion = false;
}
else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
    console.warn(`Incompatible ShadyCSS version detected.` +
        `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and` +
        `@webcomponents/shadycss@1.3.1.`);
    compatibleShadyCSSVersion = false;
}
/**
 * Template factory which scopes template DOM using ShadyCSS.
 * @param scopeName {string}
 */
const shadyTemplateFactory = (scopeName) => (result) => {
    const cacheKey = getTemplateCacheKey(result.type, scopeName);
    let templateCache = templateCaches.get(cacheKey);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(cacheKey, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    const key = result.strings.join(marker);
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        const element = result.getTemplateElement();
        if (compatibleShadyCSSVersion) {
            window.ShadyCSS.prepareTemplateDom(element, scopeName);
        }
        template = new Template(result, element);
        templateCache.keyString.set(key, template);
    }
    templateCache.stringsArray.set(result.strings, template);
    return template;
};
const TEMPLATE_TYPES = ['html', 'svg'];
/**
 * Removes all style elements from Templates for the given scopeName.
 */
const removeStylesFromLitTemplates = (scopeName) => {
    TEMPLATE_TYPES.forEach((type) => {
        const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
        if (templates !== undefined) {
            templates.keyString.forEach((template) => {
                const { element: { content } } = template;
                // IE 11 doesn't support the iterable param Set constructor
                const styles = new Set();
                Array.from(content.querySelectorAll('style')).forEach((s) => {
                    styles.add(s);
                });
                removeNodesFromTemplate(template, styles);
            });
        }
    });
};
const shadyRenderSet = new Set();
/**
 * For the given scope name, ensures that ShadyCSS style scoping is performed.
 * This is done just once per scope name so the fragment and template cannot
 * be modified.
 * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
 * to be scoped and appended to the document
 * (2) removes style elements from all lit-html Templates for this scope name.
 *
 * Note, <style> elements can only be placed into templates for the
 * initial rendering of the scope. If <style> elements are included in templates
 * dynamically rendered to the scope (after the first scope render), they will
 * not be scoped and the <style> will be left in the template and rendered
 * output.
 */
const prepareTemplateStyles = (renderedDOM, template, scopeName) => {
    shadyRenderSet.add(scopeName);
    // Move styles out of rendered DOM and store.
    const styles = renderedDOM.querySelectorAll('style');
    // If there are no styles, skip unnecessary work
    if (styles.length === 0) {
        // Ensure prepareTemplateStyles is called to support adding
        // styles via `prepareAdoptedCssText` since that requires that
        // `prepareTemplateStyles` is called.
        window.ShadyCSS.prepareTemplateStyles(template.element, scopeName);
        return;
    }
    const condensedStyle = document.createElement('style');
    // Collect styles into a single style. This helps us make sure ShadyCSS
    // manipulations will not prevent us from being able to fix up template
    // part indices.
    // NOTE: collecting styles is inefficient for browsers but ShadyCSS
    // currently does this anyway. When it does not, this should be changed.
    for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        style.parentNode.removeChild(style);
        condensedStyle.textContent += style.textContent;
    }
    // Remove styles from nested templates in this scope.
    removeStylesFromLitTemplates(scopeName);
    // And then put the condensed style into the "root" template passed in as
    // `template`.
    insertNodeIntoTemplate(template, condensedStyle, template.element.content.firstChild);
    // Note, it's important that ShadyCSS gets the template that `lit-html`
    // will actually render so that it can update the style inside when
    // needed (e.g. @apply native Shadow DOM case).
    window.ShadyCSS.prepareTemplateStyles(template.element, scopeName);
    if (window.ShadyCSS.nativeShadow) {
        // When in native Shadow DOM, re-add styling to rendered content using
        // the style ShadyCSS produced.
        const style = template.element.content.querySelector('style');
        renderedDOM.insertBefore(style.cloneNode(true), renderedDOM.firstChild);
    }
    else {
        // When not in native Shadow DOM, at this point ShadyCSS will have
        // removed the style from the lit template and parts will be broken as a
        // result. To fix this, we put back the style node ShadyCSS removed
        // and then tell lit to remove that node from the template.
        // NOTE, ShadyCSS creates its own style so we can safely add/remove
        // `condensedStyle` here.
        template.element.content.insertBefore(condensedStyle, template.element.content.firstChild);
        const removes = new Set();
        removes.add(condensedStyle);
        removeNodesFromTemplate(template, removes);
    }
};
/**
 * Extension to the standard `render` method which supports rendering
 * to ShadowRoots when the ShadyDOM (https://github.com/webcomponents/shadydom)
 * and ShadyCSS (https://github.com/webcomponents/shadycss) polyfills are used
 * or when the webcomponentsjs
 * (https://github.com/webcomponents/webcomponentsjs) polyfill is used.
 *
 * Adds a `scopeName` option which is used to scope element DOM and stylesheets
 * when native ShadowDOM is unavailable. The `scopeName` will be added to
 * the class attribute of all rendered DOM. In addition, any style elements will
 * be automatically re-written with this `scopeName` selector and moved out
 * of the rendered DOM and into the document `<head>`.
 *
 * It is common to use this render method in conjunction with a custom element
 * which renders a shadowRoot. When this is done, typically the element's
 * `localName` should be used as the `scopeName`.
 *
 * In addition to DOM scoping, ShadyCSS also supports a basic shim for css
 * custom properties (needed only on older browsers like IE11) and a shim for
 * a deprecated feature called `@apply` that supports applying a set of css
 * custom properties to a given location.
 *
 * Usage considerations:
 *
 * * Part values in `<style>` elements are only applied the first time a given
 * `scopeName` renders. Subsequent changes to parts in style elements will have
 * no effect. Because of this, parts in style elements should only be used for
 * values that will never change, for example parts that set scope-wide theme
 * values or parts which render shared style elements.
 *
 * * Note, due to a limitation of the ShadyDOM polyfill, rendering in a
 * custom element's `constructor` is not supported. Instead rendering should
 * either done asynchronously, for example at microtask timing (for example
 * `Promise.resolve()`), or be deferred until the first time the element's
 * `connectedCallback` runs.
 *
 * Usage considerations when using shimmed custom properties or `@apply`:
 *
 * * Whenever any dynamic changes are made which affect
 * css custom properties, `ShadyCSS.styleElement(element)` must be called
 * to update the element. There are two cases when this is needed:
 * (1) the element is connected to a new parent, (2) a class is added to the
 * element that causes it to match different custom properties.
 * To address the first case when rendering a custom element, `styleElement`
 * should be called in the element's `connectedCallback`.
 *
 * * Shimmed custom properties may only be defined either for an entire
 * shadowRoot (for example, in a `:host` rule) or via a rule that directly
 * matches an element with a shadowRoot. In other words, instead of flowing from
 * parent to child as do native css custom properties, shimmed custom properties
 * flow only from shadowRoots to nested shadowRoots.
 *
 * * When using `@apply` mixing css shorthand property names with
 * non-shorthand names (for example `border` and `border-width`) is not
 * supported.
 */
const render$1 = (result, container, options) => {
    const scopeName = options.scopeName;
    const hasRendered = parts.has(container);
    const needsScoping = container instanceof ShadowRoot &&
        compatibleShadyCSSVersion && result instanceof TemplateResult;
    // Handle first render to a scope specially...
    const firstScopeRender = needsScoping && !shadyRenderSet.has(scopeName);
    // On first scope render, render into a fragment; this cannot be a single
    // fragment that is reused since nested renders can occur synchronously.
    const renderContainer = firstScopeRender ? document.createDocumentFragment() : container;
    render(result, renderContainer, Object.assign({ templateFactory: shadyTemplateFactory(scopeName) }, options));
    // When performing first scope render,
    // (1) We've rendered into a fragment so that there's a chance to
    // `prepareTemplateStyles` before sub-elements hit the DOM
    // (which might cause them to render based on a common pattern of
    // rendering in a custom element's `connectedCallback`);
    // (2) Scope the template with ShadyCSS one time only for this scope.
    // (3) Render the fragment into the container and make sure the
    // container knows its `part` is the one we just rendered. This ensures
    // DOM will be re-used on subsequent renders.
    if (firstScopeRender) {
        const part = parts.get(renderContainer);
        parts.delete(renderContainer);
        if (part.value instanceof TemplateInstance) {
            prepareTemplateStyles(renderContainer, part.value.template, scopeName);
        }
        removeNodes(container, container.firstChild);
        container.appendChild(renderContainer);
        parts.set(container, part);
    }
    // After elements have hit the DOM, update styling if this is the
    // initial render to this container.
    // This is needed whenever dynamic changes are made so it would be
    // safest to do every render; however, this would regress performance
    // so we leave it up to the user to call `ShadyCSSS.styleElement`
    // for dynamic changes.
    if (!hasRendered && needsScoping) {
        window.ShadyCSS.styleElement(container.host);
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */
window.JSCompiler_renameProperty =
    (prop, _obj) => prop;
const defaultConverter = {
    toAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value ? '' : null;
            case Object:
            case Array:
                // if the value is `null` or `undefined` pass this through
                // to allow removing/no change behavior.
                return value == null ? value : JSON.stringify(value);
        }
        return value;
    },
    fromAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value !== null;
            case Number:
                return value === null ? null : Number(value);
            case Object:
            case Array:
                return JSON.parse(value);
        }
        return value;
    }
};
/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */
const notEqual = (value, old) => {
    // This ensures (old==NaN, value==NaN) always returns false
    return old !== value && (old === old || value === value);
};
const defaultPropertyDeclaration = {
    attribute: true,
    type: String,
    converter: defaultConverter,
    reflect: false,
    hasChanged: notEqual
};
const microtaskPromise = Promise.resolve(true);
const STATE_HAS_UPDATED = 1;
const STATE_UPDATE_REQUESTED = 1 << 2;
const STATE_IS_REFLECTING_TO_ATTRIBUTE = 1 << 3;
const STATE_IS_REFLECTING_TO_PROPERTY = 1 << 4;
const STATE_HAS_CONNECTED = 1 << 5;
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclassers to render updates as desired.
 */
class UpdatingElement extends HTMLElement {
    constructor() {
        super();
        this._updateState = 0;
        this._instanceProperties = undefined;
        this._updatePromise = microtaskPromise;
        this._hasConnectedResolver = undefined;
        /**
         * Map with keys for any properties that have changed since the last
         * update cycle with previous values.
         */
        this._changedProperties = new Map();
        /**
         * Map with keys of properties that should be reflected when updated.
         */
        this._reflectingProperties = undefined;
        this.initialize();
    }
    /**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     */
    static get observedAttributes() {
        // note: piggy backing on this to ensure we're finalized.
        this.finalize();
        const attributes = [];
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this._classProperties.forEach((v, p) => {
            const attr = this._attributeNameForProperty(p, v);
            if (attr !== undefined) {
                this._attributeToPropertyMap.set(attr, p);
                attributes.push(attr);
            }
        });
        return attributes;
    }
    /**
     * Ensures the private `_classProperties` property metadata is created.
     * In addition to `finalize` this is also called in `createProperty` to
     * ensure the `@property` decorator can add property metadata.
     */
    /** @nocollapse */
    static _ensureClassProperties() {
        // ensure private storage for property declarations.
        if (!this.hasOwnProperty(JSCompiler_renameProperty('_classProperties', this))) {
            this._classProperties = new Map();
            // NOTE: Workaround IE11 not supporting Map constructor argument.
            const superProperties = Object.getPrototypeOf(this)._classProperties;
            if (superProperties !== undefined) {
                superProperties.forEach((v, k) => this._classProperties.set(k, v));
            }
        }
    }
    /**
     * Creates a property accessor on the element prototype if one does not exist.
     * The property setter calls the property's `hasChanged` property option
     * or uses a strict identity check to determine whether or not to request
     * an update.
     * @nocollapse
     */
    static createProperty(name, options = defaultPropertyDeclaration) {
        // Note, since this can be called by the `@property` decorator which
        // is called before `finalize`, we ensure storage exists for property
        // metadata.
        this._ensureClassProperties();
        this._classProperties.set(name, options);
        // Do not generate an accessor if the prototype already has one, since
        // it would be lost otherwise and that would never be the user's intention;
        // Instead, we expect users to call `requestUpdate` themselves from
        // user-defined accessors. Note that if the super has an accessor we will
        // still overwrite it
        if (options.noAccessor || this.prototype.hasOwnProperty(name)) {
            return;
        }
        const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
        Object.defineProperty(this.prototype, name, {
            // tslint:disable-next-line:no-any no symbol in index
            get() {
                // tslint:disable-next-line:no-any no symbol in index
                return this[key];
            },
            set(value) {
                // tslint:disable-next-line:no-any no symbol in index
                const oldValue = this[name];
                // tslint:disable-next-line:no-any no symbol in index
                this[key] = value;
                this.requestUpdate(name, oldValue);
            },
            configurable: true,
            enumerable: true
        });
    }
    /**
     * Creates property accessors for registered properties and ensures
     * any superclasses are also finalized.
     * @nocollapse
     */
    static finalize() {
        if (this.hasOwnProperty(JSCompiler_renameProperty('finalized', this)) &&
            this.finalized) {
            return;
        }
        // finalize any superclasses
        const superCtor = Object.getPrototypeOf(this);
        if (typeof superCtor.finalize === 'function') {
            superCtor.finalize();
        }
        this.finalized = true;
        this._ensureClassProperties();
        // initialize Map populated in observedAttributes
        this._attributeToPropertyMap = new Map();
        // make any properties
        // Note, only process "own" properties since this element will inherit
        // any properties defined on the superClass, and finalization ensures
        // the entire prototype chain is finalized.
        if (this.hasOwnProperty(JSCompiler_renameProperty('properties', this))) {
            const props = this.properties;
            // support symbols in properties (IE11 does not support this)
            const propKeys = [
                ...Object.getOwnPropertyNames(props),
                ...(typeof Object.getOwnPropertySymbols === 'function') ?
                    Object.getOwnPropertySymbols(props) :
                    []
            ];
            // This for/of is ok because propKeys is an array
            for (const p of propKeys) {
                // note, use of `any` is due to TypeSript lack of support for symbol in
                // index types
                // tslint:disable-next-line:no-any no symbol in index
                this.createProperty(p, props[p]);
            }
        }
    }
    /**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */
    static _attributeNameForProperty(name, options) {
        const attribute = options.attribute;
        return attribute === false ?
            undefined :
            (typeof attribute === 'string' ?
                attribute :
                (typeof name === 'string' ? name.toLowerCase() : undefined));
    }
    /**
     * Returns true if a property should request an update.
     * Called when a property value is set and uses the `hasChanged`
     * option for the property if present or a strict identity check.
     * @nocollapse
     */
    static _valueHasChanged(value, old, hasChanged = notEqual) {
        return hasChanged(value, old);
    }
    /**
     * Returns the property value for the given attribute value.
     * Called via the `attributeChangedCallback` and uses the property's
     * `converter` or `converter.fromAttribute` property option.
     * @nocollapse
     */
    static _propertyValueFromAttribute(value, options) {
        const type = options.type;
        const converter = options.converter || defaultConverter;
        const fromAttribute = (typeof converter === 'function' ? converter : converter.fromAttribute);
        return fromAttribute ? fromAttribute(value, type) : value;
    }
    /**
     * Returns the attribute value for the given property value. If this
     * returns undefined, the property will *not* be reflected to an attribute.
     * If this returns null, the attribute will be removed, otherwise the
     * attribute will be set to the value.
     * This uses the property's `reflect` and `type.toAttribute` property options.
     * @nocollapse
     */
    static _propertyValueToAttribute(value, options) {
        if (options.reflect === undefined) {
            return;
        }
        const type = options.type;
        const converter = options.converter;
        const toAttribute = converter && converter.toAttribute ||
            defaultConverter.toAttribute;
        return toAttribute(value, type);
    }
    /**
     * Performs element initialization. By default captures any pre-set values for
     * registered properties.
     */
    initialize() {
        this._saveInstanceProperties();
    }
    /**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */
    _saveInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this.constructor
            ._classProperties.forEach((_v, p) => {
            if (this.hasOwnProperty(p)) {
                const value = this[p];
                delete this[p];
                if (!this._instanceProperties) {
                    this._instanceProperties = new Map();
                }
                this._instanceProperties.set(p, value);
            }
        });
    }
    /**
     * Applies previously saved instance properties.
     */
    _applyInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        // tslint:disable-next-line:no-any
        this._instanceProperties.forEach((v, p) => this[p] = v);
        this._instanceProperties = undefined;
    }
    connectedCallback() {
        this._updateState = this._updateState | STATE_HAS_CONNECTED;
        // Ensure connection triggers an update. Updates cannot complete before
        // connection and if one is pending connection the `_hasConnectionResolver`
        // will exist. If so, resolve it to complete the update, otherwise
        // requestUpdate.
        if (this._hasConnectedResolver) {
            this._hasConnectedResolver();
            this._hasConnectedResolver = undefined;
        }
        else {
            this.requestUpdate();
        }
    }
    /**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     */
    disconnectedCallback() {
    }
    /**
     * Synchronizes property values when attributes change.
     */
    attributeChangedCallback(name, old, value) {
        if (old !== value) {
            this._attributeToProperty(name, value);
        }
    }
    _propertyToAttribute(name, value, options = defaultPropertyDeclaration) {
        const ctor = this.constructor;
        const attr = ctor._attributeNameForProperty(name, options);
        if (attr !== undefined) {
            const attrValue = ctor._propertyValueToAttribute(value, options);
            // an undefined value does not change the attribute.
            if (attrValue === undefined) {
                return;
            }
            // Track if the property is being reflected to avoid
            // setting the property again via `attributeChangedCallback`. Note:
            // 1. this takes advantage of the fact that the callback is synchronous.
            // 2. will behave incorrectly if multiple attributes are in the reaction
            // stack at time of calling. However, since we process attributes
            // in `update` this should not be possible (or an extreme corner case
            // that we'd like to discover).
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_ATTRIBUTE;
            if (attrValue == null) {
                this.removeAttribute(attr);
            }
            else {
                this.setAttribute(attr, attrValue);
            }
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_ATTRIBUTE;
        }
    }
    _attributeToProperty(name, value) {
        // Use tracking info to avoid deserializing attribute value if it was
        // just set from a property setter.
        if (this._updateState & STATE_IS_REFLECTING_TO_ATTRIBUTE) {
            return;
        }
        const ctor = this.constructor;
        const propName = ctor._attributeToPropertyMap.get(name);
        if (propName !== undefined) {
            const options = ctor._classProperties.get(propName) || defaultPropertyDeclaration;
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_PROPERTY;
            this[propName] =
                // tslint:disable-next-line:no-any
                ctor._propertyValueFromAttribute(value, options);
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_PROPERTY;
        }
    }
    /**
     * Requests an update which is processed asynchronously. This should
     * be called when an element should update based on some state not triggered
     * by setting a property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored. Returns the `updateComplete` Promise which is resolved
     * when the update completes.
     *
     * @param name {PropertyKey} (optional) name of requesting property
     * @param oldValue {any} (optional) old value of requesting property
     * @returns {Promise} A Promise that is resolved when the update completes.
     */
    requestUpdate(name, oldValue) {
        let shouldRequestUpdate = true;
        // if we have a property key, perform property update steps.
        if (name !== undefined && !this._changedProperties.has(name)) {
            const ctor = this.constructor;
            const options = ctor._classProperties.get(name) || defaultPropertyDeclaration;
            if (ctor._valueHasChanged(this[name], oldValue, options.hasChanged)) {
                // track old value when changing.
                this._changedProperties.set(name, oldValue);
                // add to reflecting properties set
                if (options.reflect === true &&
                    !(this._updateState & STATE_IS_REFLECTING_TO_PROPERTY)) {
                    if (this._reflectingProperties === undefined) {
                        this._reflectingProperties = new Map();
                    }
                    this._reflectingProperties.set(name, options);
                }
                // abort the request if the property should not be considered changed.
            }
            else {
                shouldRequestUpdate = false;
            }
        }
        if (!this._hasRequestedUpdate && shouldRequestUpdate) {
            this._enqueueUpdate();
        }
        return this.updateComplete;
    }
    /**
     * Sets up the element to asynchronously update.
     */
    async _enqueueUpdate() {
        // Mark state updating...
        this._updateState = this._updateState | STATE_UPDATE_REQUESTED;
        let resolve;
        const previousUpdatePromise = this._updatePromise;
        this._updatePromise = new Promise((res) => resolve = res);
        // Ensure any previous update has resolved before updating.
        // This `await` also ensures that property changes are batched.
        await previousUpdatePromise;
        // Make sure the element has connected before updating.
        if (!this._hasConnected) {
            await new Promise((res) => this._hasConnectedResolver = res);
        }
        // Allow `performUpdate` to be asynchronous to enable scheduling of updates.
        const result = this.performUpdate();
        // Note, this is to avoid delaying an additional microtask unless we need
        // to.
        if (result != null &&
            typeof result.then === 'function') {
            await result;
        }
        resolve(!this._hasRequestedUpdate);
    }
    get _hasConnected() {
        return (this._updateState & STATE_HAS_CONNECTED);
    }
    get _hasRequestedUpdate() {
        return (this._updateState & STATE_UPDATE_REQUESTED);
    }
    get hasUpdated() {
        return (this._updateState & STATE_HAS_UPDATED);
    }
    /**
     * Performs an element update.
     *
     * You can override this method to change the timing of updates. For instance,
     * to schedule updates to occur just before the next frame:
     *
     * ```
     * protected async performUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.performUpdate();
     * }
     * ```
     */
    performUpdate() {
        // Mixin instance properties once, if they exist.
        if (this._instanceProperties) {
            this._applyInstanceProperties();
        }
        if (this.shouldUpdate(this._changedProperties)) {
            const changedProperties = this._changedProperties;
            this.update(changedProperties);
            this._markUpdated();
            if (!(this._updateState & STATE_HAS_UPDATED)) {
                this._updateState = this._updateState | STATE_HAS_UPDATED;
                this.firstUpdated(changedProperties);
            }
            this.updated(changedProperties);
        }
        else {
            this._markUpdated();
        }
    }
    _markUpdated() {
        this._changedProperties = new Map();
        this._updateState = this._updateState & ~STATE_UPDATE_REQUESTED;
    }
    /**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. This getter can be implemented to
     * await additional state. For example, it is sometimes useful to await a
     * rendered element before fulfilling this Promise. To do this, first await
     * `super.updateComplete` then any subsequent state.
     *
     * @returns {Promise} The Promise returns a boolean that indicates if the
     * update resolved without triggering another update.
     */
    get updateComplete() {
        return this._updatePromise;
    }
    /**
     * Controls whether or not `update` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * * @param _changedProperties Map of changed properties with old values
     */
    shouldUpdate(_changedProperties) {
        return true;
    }
    /**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * * @param _changedProperties Map of changed properties with old values
     */
    update(_changedProperties) {
        if (this._reflectingProperties !== undefined &&
            this._reflectingProperties.size > 0) {
            // Use forEach so this works even if for/of loops are compiled to for
            // loops expecting arrays
            this._reflectingProperties.forEach((v, k) => this._propertyToAttribute(k, this[k], v));
            this._reflectingProperties = undefined;
        }
    }
    /**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * * @param _changedProperties Map of changed properties with old values
     */
    updated(_changedProperties) {
    }
    /**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * * @param _changedProperties Map of changed properties with old values
     */
    firstUpdated(_changedProperties) {
    }
}
/**
 * Marks class as having finished creating properties.
 */
UpdatingElement.finalized = true;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * @param tagName the name of the custom element to define
 */

/**
 * A property decorator which creates a LitElement property which reflects a
 * corresponding attribute value. A `PropertyDeclaration` may optionally be
 * supplied to configure property features.
 *
 * @ExportDecoratedItems
 */

/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 */

/**
 * A property decorator that converts a class property into a getter
 * that executes a querySelectorAll on the element's renderRoot.
 */

/**
 * Adds event listener options to a method used as an event listener in a
 * lit-html template.
 *
 * @param options An object that specifis event listener options as accepted by
 * `EventTarget#addEventListener` and `EventTarget#removeEventListener`.
 *
 * Current browsers support the `capture`, `passive`, and `once` options. See:
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters
 *
 * @example
 *
 *     class MyElement {
 *
 *       clicked = false;
 *
 *       render() {
 *         return html`<div @click=${this._onClick}`><button></button></div>`;
 *       }
 *
 *       @eventOptions({capture: true})
 *       _onClick(e) {
 *         this.clicked = true;
 *       }
 *     }
 */

/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
const supportsAdoptingStyleSheets = ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);
const constructionToken = Symbol();
class CSSResult {
    constructor(cssText, safeToken) {
        if (safeToken !== constructionToken) {
            throw new Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
        }
        this.cssText = cssText;
    }
    // Note, this is a getter so that it's lazy. In practice, this means
    // stylesheets are not created until the first element instance is made.
    get styleSheet() {
        if (this._styleSheet === undefined) {
            // Note, if `adoptedStyleSheets` is supported then we assume CSSStyleSheet
            // is constructable.
            if (supportsAdoptingStyleSheets) {
                this._styleSheet = new CSSStyleSheet();
                this._styleSheet.replaceSync(this.cssText);
            }
            else {
                this._styleSheet = null;
            }
        }
        return this._styleSheet;
    }
    toString() {
        return this.cssText;
    }
}
/**
 * Wrap a value for interpolation in a css tagged template literal.
 *
 * This is unsafe because untrusted CSS text can be used to phone home
 * or exfiltrate data to an attacker controlled site. Take care to only use
 * this with trusted input.
 */

const textFromCSSResult = (value) => {
    if (value instanceof CSSResult) {
        return value.cssText;
    }
    else {
        throw new Error(`Value passed to 'css' function must be a 'css' function result: ${value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
    }
};
/**
 * Template tag which which can be used with LitElement's `style` property to
 * set element styles. For security reasons, only literal string values may be
 * used. To incorporate non-literal values `unsafeCSS` may be used inside a
 * template string part.
 */
const css = (strings, ...values) => {
    const cssText = values.reduce((acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1], strings[0]);
    return new CSSResult(cssText, constructionToken);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for LitElement usage.
// TODO(justinfagnani): inject version number at build time
(window['litElementVersions'] || (window['litElementVersions'] = []))
    .push('2.0.1');
/**
 * Minimal implementation of Array.prototype.flat
 * @param arr the array to flatten
 * @param result the accumlated result
 */
function arrayFlat(styles, result = []) {
    for (let i = 0, length = styles.length; i < length; i++) {
        const value = styles[i];
        if (Array.isArray(value)) {
            arrayFlat(value, result);
        }
        else {
            result.push(value);
        }
    }
    return result;
}
/** Deeply flattens styles array. Uses native flat if available. */
const flattenStyles = (styles) => styles.flat ? styles.flat(Infinity) : arrayFlat(styles);
class LitElement extends UpdatingElement {
    /** @nocollapse */
    static finalize() {
        super.finalize();
        // Prepare styling that is stamped at first render time. Styling
        // is built from user provided `styles` or is inherited from the superclass.
        this._styles =
            this.hasOwnProperty(JSCompiler_renameProperty('styles', this)) ?
                this._getUniqueStyles() :
                this._styles || [];
    }
    /** @nocollapse */
    static _getUniqueStyles() {
        // Take care not to call `this.styles` multiple times since this generates
        // new CSSResults each time.
        // TODO(sorvell): Since we do not cache CSSResults by input, any
        // shared styles will generate new stylesheet objects, which is wasteful.
        // This should be addressed when a browser ships constructable
        // stylesheets.
        const userStyles = this.styles;
        const styles = [];
        if (Array.isArray(userStyles)) {
            const flatStyles = flattenStyles(userStyles);
            // As a performance optimization to avoid duplicated styling that can
            // occur especially when composing via subclassing, de-duplicate styles
            // preserving the last item in the list. The last item is kept to
            // try to preserve cascade order with the assumption that it's most
            // important that last added styles override previous styles.
            const styleSet = flatStyles.reduceRight((set, s) => {
                set.add(s);
                // on IE set.add does not return the set.
                return set;
            }, new Set());
            // Array.from does not work on Set in IE
            styleSet.forEach((v) => styles.unshift(v));
        }
        else if (userStyles) {
            styles.push(userStyles);
        }
        return styles;
    }
    /**
     * Performs element initialization. By default this calls `createRenderRoot`
     * to create the element `renderRoot` node and captures any pre-set values for
     * registered properties.
     */
    initialize() {
        super.initialize();
        this.renderRoot = this.createRenderRoot();
        // Note, if renderRoot is not a shadowRoot, styles would/could apply to the
        // element's getRootNode(). While this could be done, we're choosing not to
        // support this now since it would require different logic around de-duping.
        if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
            this.adoptStyles();
        }
    }
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */
    createRenderRoot() {
        return this.attachShadow({ mode: 'open' });
    }
    /**
     * Applies styling to the element shadowRoot using the `static get styles`
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */
    adoptStyles() {
        const styles = this.constructor._styles;
        if (styles.length === 0) {
            return;
        }
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it.
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
            window.ShadyCSS.ScopingShim.prepareAdoptedCssText(styles.map((s) => s.cssText), this.localName);
        }
        else if (supportsAdoptingStyleSheets) {
            this.renderRoot.adoptedStyleSheets =
                styles.map((s) => s.styleSheet);
        }
        else {
            // This must be done after rendering so the actual style insertion is done
            // in `update`.
            this._needsShimAdoptedStyleSheets = true;
        }
    }
    connectedCallback() {
        super.connectedCallback();
        // Note, first update/render handles styleElement so we only call this if
        // connected after first update.
        if (this.hasUpdated && window.ShadyCSS !== undefined) {
            window.ShadyCSS.styleElement(this);
        }
    }
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * * @param _changedProperties Map of changed properties with old values
     */
    update(changedProperties) {
        super.update(changedProperties);
        const templateResult = this.render();
        if (templateResult instanceof TemplateResult) {
            this.constructor
                .render(templateResult, this.renderRoot, { scopeName: this.localName, eventContext: this });
        }
        // When native Shadow DOM is used but adoptedStyles are not supported,
        // insert styling after rendering to ensure adoptedStyles have highest
        // priority.
        if (this._needsShimAdoptedStyleSheets) {
            this._needsShimAdoptedStyleSheets = false;
            this.constructor._styles.forEach((s) => {
                const style = document.createElement('style');
                style.textContent = s.cssText;
                this.renderRoot.appendChild(style);
            });
        }
    }
    /**
     * Invoked on each update to perform rendering tasks. This method must return
     * a lit-html TemplateResult. Setting properties inside this method will *not*
     * trigger the element to update.
     */
    render() {
    }
}
/**
 * Ensure this class is marked as `finalized` as an optimization ensuring
 * it will not needlessly try to `finalize`.
 */
LitElement.finalized = true;
/**
 * Render method used to render the lit-html TemplateResult to the element's
 * DOM.
 * @param {TemplateResult} Template to render.
 * @param {Element|DocumentFragment} Node into which to render.
 * @param {String} Element name.
 * @nocollapse
 */
LitElement.render = render$1;

const getUniqueRandomArray = (length, max) => {
  const array = [];
  for (let i = 0; i < length; i++) {
    array.push(getUniqueRandomNumber(array, max));
  }
  return array;
};

const getUniqueRandomNumber = (items, max) => {
  const num = Math.floor(Math.random() * max);
  return items.find(i => i === num) ? getUniqueRandomNumber(items, max) : num;
};

const isPrime = (num) => {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++)
    if (num % i === 0) return false;
  return num > 1;
};

const colors100 = [
  '#FFCDD2',
  '#F8BBD0',
  '#E1BEE7',
  '#D1C4E9',
  '#C5CAE9',
  '#BBDEFB',
  '#B3E5FC',
  '#B2EBF2',
  '#B2DFDB',
  '#C8E6C9',
  '#DCEDC8',
  '#F0F4C3',
  '#FFF9C4',
  '#FFECB3',
  '#FFE0B2',
  '#FFCCBC',
  '#D7CCC8',
  '#CFD8DC',
  '#F5F5F5',
];

const getColor100 = (i) => {
  return colors100[i % colors100.length];
};

const getRandomColor100 = () => {
  return colors100[Math.floor(Math.random() * colors100.length)];
};

class Item {
  constructor({index, value, color, mark = false}) {
    this.index = index;
    this.value = value;
    this.color = color;
    this.mark = mark;
  }

  clear() {
    this.value = null;
    this.color = null;
    this.mark = false;
    return this;
  }

  setValue(value, color = getRandomColor100()) {
    this.value = value;
    this.color = color;
    return this;
  }

  copyFrom(item) {
    this.value = item.value;
    this.color = item.color;
    this.mark = item.mark;
    return this;
  }

  moveFrom(item) {
    this.value = item.value;
    this.color = item.color;
    this.mark = item.mark;
    item.value = null;
    item.color = null;
    item.mark = false;
    return this;
  }

  swapWith(item) {
    const cacheValue = this.value;
    const cacheColor = this.color;
    const cacheMark = this.mark;
    this.value = item.value;
    this.color = item.color;
    this.mark = item.mark;
    item.value = cacheValue;
    item.color = cacheColor;
    item.mark = cacheMark;
    return this;
  }
}

class PlacedItem extends Item {
  constructor(options) {
    super(options);
    this.x = options.x;
    this.y = options.y;
  }
}

class XItemsGraph extends LitElement {
  static get properties() {
    return {
      limit: {type: Number},
      items: {type: Array},
      connections: {type: Map},
      markedConnections: {type: Map},
      clickFn: {type: Function}
    };
  }

  render() {
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"
        @dblclick=${this.dblclickHandler}
        @mousedown=${(e) => e.preventDefault()}
        @mouseup=${this.dragendHandler}
        @mousemove=${this.dragHandler}
      >
        ${this.dragOpts != null && this.dragOpts.isConnection ? svg`
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}">
        ` : ''}
        ${this.drawConnections()}
        ${this.drawMarkedConnections()}
        ${this.drawItems()}
      </svg>
    `;
  }

  drawItems() {
    return this.items.map(item => svg`
      <g fill="${item.color}">
        <g
          class="itemGroup ${this.clickFn != null ? 'clickable' : ''}"
          @click=${this.clickHandler.bind(this, item)}
          @mousedown=${(e) => this.dragstartHandler(e, item)}
          @mouseup=${(e) => this.dragendHandler(e, item)}
          @mousemove=${this.itemHoverHandler}
          @mouseleave=${this.itemLeaveHandler}
        >
          <circle class="item ${item.mark ? 'marked' : ''}" cx="${item.x}" cy="${item.y}" r="12"></circle>
          <text class="value ${item.mark ? 'marked' : ''}" x="${item.x}" y="${item.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
        </g>
      </g>
    `);
  }

  drawConnections() {
    const lines = [];
    this.connections.forEach((connections, item) => {
      for (let connection of connections) {
        lines.push(svg`
          <line class="line" x1="${item.x}" y1="${item.y}" x2="${connection.x}" y2="${connection.y}">
        `);
      }
    });
    return lines;
  }

  drawMarkedConnections() {
    const lines = [];
    this.markedConnections.forEach((connections, item) => {
      for (let connection of connections) {
        lines.push(svg`
          <line class="line marked" x1="${item.x}" y1="${item.y}" x2="${connection.x}" y2="${connection.y}">
        `);
      }
    });
    return lines;
  }

  dblclickHandler(e) {
    if (this.dragOpts != null || this.limit === this.items.length) return;
    const index = this.items.length;
    const item = new PlacedItem({
      index,
      x: e.offsetX,
      y: e.offsetY
    });
    item.setValue(String.fromCharCode(65 + index));
    this.items.push(item);
    this.connections.set(item, new Set());
    this.dispatchEvent(new Event('changed'));
    this.requestUpdate();
  }

  dragstartHandler(e, item) {
    this.dragOpts = {
      initialX: e.clientX,
      initialY: e.clientY,
      dragItem: item,
      isConnection: !e.ctrlKey
    };
  }

  dragHandler(e) {
    if (this.dragOpts == null) return;
    if (this.dragOpts.isConnection) {
      this.dragOpts.x = e.offsetX;
      this.dragOpts.y = e.offsetY;
    } else {
      this.dragOpts.dragItem.x = e.offsetX;
      this.dragOpts.dragItem.y = e.offsetY;
    }
    this.requestUpdate();
  }

  dragendHandler(e, item) {
    if (this.dragOpts == null) return;
    if (this.dragOpts && item && item !== this.dragOpts.dragItem && this.dragOpts.isConnection) {
      const dragItem = this.dragOpts.dragItem;
      this.connections.get(dragItem).add(item);
      this.connections.get(item).add(dragItem);
    }
    this.dragOpts = null;
    this.dispatchEvent(new Event('changed'));
    this.requestUpdate();
  }

  clickHandler(item) {
    if (this.clickFn != null) {
      return this.clickFn(item);
    }
  }

  itemHoverHandler(e) {
    if (e.ctrlKey) {
      e.currentTarget.classList.add('draggable');
    } else {
      e.currentTarget.classList.remove('draggable');
    }
  }
  itemLeaveHandler(e) {
    e.target.classList.remove('draggable');
  }
}

XItemsGraph.styles = css`
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
    stroke-width: 2px;
  }
  .clickable {
    stroke-width: 2px;
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
`;

customElements.define('x-items-graph', XItemsGraph);

class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Map}
    };
  }

  render() {
    return html`
      <table>
        ${this.renderHeader()}
        ${this.items.map(item => this.renderRow(item.value, this.connections.get(item)))}
      </table>
    `;
  }

  renderHeader() {
    return html`
      <tr>
        <th></th>
        ${this.items.map(item => html`<th>${item.value}</th>`)}
      </tr>
    `;
  }
  
  renderRow(value, connections) {
    if (this.connections.size > 0) {
      return html`
        <tr>
          <td>${value}</td>
          ${this.items.map(item => html`<td>${connections.has(item) ? 1 : 0}</td>`)}      
        </tr>
      `;
    }
  }
}

XItemsTable.styles = css`
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
  }
  tr td:first-child,
  tr th:first-child {
    border-right: 1px solid black;
    font-family: sans-serif;
    font-weight: bold;
  }
`;

customElements.define('x-items-table', XItemsTable);

class Marker {
  constructor({position, text, color = 'red', size = 1}) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.text = text;
  }
}

class XItemsTree extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      marker: {type: Object},
      clickFn: {type: Function}
    };
  }

  constructor() {
    super();
    this.items = [];
  }

  getCoords(i) {
    const level = Math.floor(Math.log2(i + 1));
    const part = 600 / (2 ** (level + 1));
    const y = (level + 1) * 60;
    const x = 2 * part * (i + 1 - 2 ** level) + part;
    return {x, y};
  }

  render() {
    const items = this.items.map((item, i) => {
      const coords = this.getCoords(i);
      const iL = 2 * i + 1;
      const iR = iL + 1;
      const coordsL = this.getCoords(iL);
      const coordsR = this.getCoords(iR);
      return item.value != null ? svg`
        <g fill="${item.color}">
          ${this.items[iL] && this.items[iL].value != null ? svg`
            <line class="line" x1="${coords.x}" y1="${coords.y}" x2="${coordsL.x}" y2="${coordsL.y}">
          ` : ''}
          ${this.items[iR] && this.items[iR].value != null ? svg`
            <line class="line" x1="${coords.x}" y1="${coords.y}" x2="${coordsR.x}" y2="${coordsR.y}">
          ` : ''}
          <g @click=${this.clickHandler.bind(this, item)} class="${this.clickFn != null ? 'clickable' : ''}">
            <circle class="item ${item.mark ? 'marked' : ''}" cx="${coords.x}" cy="${coords.y}" r="12"></circle>
            <text class="value" x="${coords.x}" y="${coords.y + 2}" text-anchor="middle" alignment-baseline="middle">${item.value}</text>
          </g>
        </g>
        ${this.renderMarker(i, coords)}
      ` : '';
    });
    return svg`
      <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
        ${items}
      </svg>
    `;
  }

  clickHandler(item) {
    if (this.clickFn != null) {
      this.marker = new Marker({position: item.index});
      return this.clickFn(item);
    }
  }

  renderMarker(i ,coords) {
    let result = '';
    if (this.marker && this.marker.position === i) {
      result = svg`
        <g class="marker">
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x}" y2="${coords.y - 35}"></line>        
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x - 4}" y2="${coords.y - 20}"></line>       
          <line x1="${coords.x}" y1="${coords.y - 13}" x2="${coords.x + 4}" y2="${coords.y - 20}"></line>        
        </g>
      `;
    }
    return result;
  }
}

XItemsTree.styles = css`
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
`;

customElements.define('x-items-tree', XItemsTree);

class XItemsVertical extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      temp: {type: Object},
      markers: {type: Array},
      pivots: {type: Array}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.pivots = [];
  }

  render() {
    return html`
      ${this.items.map(item => html`
        <div class="item">
          <div class="value_container">
            <div class="value" style="${item.color ? 'background-color:' + item.color + ';' : ''} ${item.value ? 'height:' + item.value + '%;' : ''}">
            </div>
          </div>
          <div class="index" style="${this.items.length > 20 ? 'display:none;' : ''}">
            ${item.index}
          </div>
          <div class="marker_container">
            ${this.renderMarker(item.index)}
          </div>
          ${this.renderPivots(item)}
        </div>
      `)}      
      ${this.renderTemp()}
    `;
  }

  renderPivots(item) {
    let result = '';
    this.pivots.forEach((pivot, i) => {
      if (pivot.start <= item.index && pivot.end >= item.index) {
        const isDimmed = this.pivots.length > 1 && this.pivots.length !== i + 1;
        result = html`
          ${result}
          <div class="pivot ${isDimmed ? 'dimmed' : ''}" style="height: ${400 * (1 - pivot.value / 100) - 2}px"></div>
        `;
      }
    });
    return result;
  }

  renderTemp() {
    if (this.temp instanceof Item) {
      return html`
        <div class="item temp">
          <div class="value_container">
            <div class="value" style="${this.temp.color ? 'background-color:' + this.temp.color + ';' : ''} ${this.temp.value ? 'height:' + this.temp.value + '%;' : ''}">
            </div>
          </div>
          <div class="marker_container">
            ${this.renderMarker('temp')}
          </div>
        </div>
      `;
    }
  }
  renderMarker(i) {
    let result = '';
    this.markers.forEach(marker => {
      if (marker.position === i) {
        result = html`
          ${result}
          <div class="marker size_${marker.size} ${marker.color ? 'color_' + marker.color : ''}">
            <span>${this.items.length > 20 ? '' : marker.text}</span>
          </div>
        `;
      }
    });
    return result;
  }
}

XItemsVertical.styles = css`
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
`;

customElements.define('x-items-vertical', XItemsVertical);

class XItemsHorizontal extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      markers: {type: Array},
      reverse: {type: Boolean},
    };
  }

  constructor() {
    super();
    this.items = [];
    this.markers = [];
  }

  render() {
    const items = this.items.map(item => html`
      <div class="item">
        <div class="index">
          ${item.index}
        </div>
        <div class="value" style="${item.color ? 'background-color:' + item.color : ''}">
          ${item.value}
        </div>
        <div class="marker_container ${item.mark ? 'mark' : ''}">
          ${this.renderMarker(item.index)}
        </div>
      </div>
    `);
    return html`
      ${this.reverse ? items.reverse() : items}      
    `;
  }

  renderMarker(i) {
    let result = '';
    this.markers.forEach(marker => {
      if (marker.position === i) {
        result = html`
          ${result}
          <div class="marker size_${marker.size} ${marker.color ? 'color_' + marker.color : ''}">
            <span>${marker.text}</span>
          </div>
        `;
      }
    });
    return result;
  }
}

XItemsHorizontal.styles = css`
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
`;

customElements.define('x-items-horizontal', XItemsHorizontal);

class XItemsHorizontalLinked extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      marker: {type: Object},
      narrow: {type: Boolean}
    };
  }

  constructor() {
    super();
    this.items = [];
    this.marker = {};
  }

  render() {
    return html`
      ${this.items.map((item, i) => html`
        <div class="item ${item.mark ? 'mark' : ''} ${item.value == null ? 'no-data': ''}">
          <div class="value" style="${item.color ? 'background-color:' + item.color : ''}">
            ${item.value != null ? item.value : html`&nbsp;`}
          </div>
          <div class="marker_container">
            ${this.marker.position === (item.index != null ? item.index : i) ? html`<div class="marker"></div>` : ''}
          </div>
        </div>
      `)}
    `;
  }
}

XItemsHorizontalLinked.styles = css`
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
`;

customElements.define('x-items-horizontal-linked', XItemsHorizontalLinked);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// For each part, remember the value that was last rendered to the part by the
// unsafeHTML directive, and the DocumentFragment that was last set as a value.
// The DocumentFragment is used as a unique key to check if the last value
// rendered to the part was with unsafeHTML. If not, we'll always re-render the
// value passed to unsafeHTML.
const previousValues = new WeakMap();
/**
 * Renders the result as HTML, rather than text.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
const unsafeHTML = directive((value) => (part) => {
    if (!(part instanceof NodePart)) {
        throw new Error('unsafeHTML can only be used in text bindings');
    }
    const previousValue = previousValues.get(part);
    if (previousValue !== undefined && isPrimitive(value) &&
        value === previousValue.value && part.value === previousValue.fragment) {
        return;
    }
    const template = document.createElement('template');
    template.innerHTML = value; // innerHTML casts to string internally
    const fragment = document.importNode(template.content, true);
    part.setValue(fragment);
    previousValues.set(part, { value, fragment });
});

/**
 * routes [
   {path: '/', component: 'x-user-list'},
   {path: '/user', component: 'x-user-profile'}
 ]
 */

class XRouter extends LitElement {
  static get properties() {
    return {
      routes: {type: Array}
    };
  }

  render() {
    let template = '';
    if (this.routes) {
      const route = this.routes.find(route => {
        return route.path === decodeURIComponent(location.pathname);
      });
      if (route) {
        template = `<${route.component}></${route.component}>`;
      }
    }
    return html`${unsafeHTML(template)}`;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-router', XRouter);

class XRouterA extends HTMLAnchorElement {
  connectedCallback() {
    this.addEventListener('click', e => {
      e.preventDefault();
      history.pushState({}, '', this.attributes.href.nodeValue);
      document.querySelectorAll('x-router').forEach(xRouter => xRouter.requestUpdate());
    });
  }
}

customElements.define('x-router-a', XRouterA, {extends: 'a'});

class XConsole extends LitElement {
  static get properties() {
    return {
      defaultMessage: {type: String}
    };
  }

  constructor() {
    super();
    this.defaultMessage = 'Press any button';
  }

  render() {
    return html`
      <p class="message">${this.message || this.defaultMessage}</p>
    `;
  }

  setMessage(text) {
    this.message = text;
    this.requestUpdate();
  }
}

XConsole.styles = css`
  :host {
    display: block;
  }
  .message {
    padding: 10px;
    font-family: monospace;
  }
`;

customElements.define('x-console', XConsole);

class XDialog extends LitElement {
  render() {
    return html`
      <dialog>
        <form method="dialog">
          <p class="slotCnt">
            <slot></slot>
          </p>
          <button value="default">Confirm</button>
          <button value="cancel">Cancel</button>
        </form>
      </dialog>
    `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('dialog');
    this.form = this.shadowRoot.querySelector('form');
    //move slotted nodes into dialog's form directly for proper work FormData
    //TODO: find a better way to beat this problem
    const slot = this.shadowRoot.querySelector('slot');
    this.shadowRoot.querySelector('.slotCnt').append(...slot.assignedNodes());
    slot.remove();
  }

  open() {
    return new Promise((resolve, reject) => {
      this.dialog.showModal();
      const onClose = () => {
        this.dialog.removeEventListener('close', onClose);
        if (this.dialog.returnValue === 'default') {
          resolve(new FormData(this.form));
          this.form.reset();
        } else {
          reject();
        }
      };
      this.dialog.addEventListener('close', onClose);
    });
  }
}

customElements.define('x-dialog', XDialog);

class XButton extends LitElement {
  static get properties() {
    return {
      callback: {type: Function},
      disabled: {type: Boolean},
      activated: {type: Boolean}
    };
  }

  render() {
    return html`
      <button @click=${this.handleClick} ?disabled=${this.disabled}>
        <slot class=${this.activated ? 'hidden' : ''}></slot>      
        <span class=${this.activated ? '' : 'hidden'}>Next</span>
      </button>
    `;
  }

  createRenderRoot() {
    return this.attachShadow({mode: 'open', delegatesFocus: true});
  }

  updated() {
    if (this.activated) {
      this.classList.add('activated');
    } else {
      this.classList.remove('activated');
    }
  }

  handleClick() {
    this.callback(this);
  }
}

XButton.styles = css`
  .hidden {
    display: none;
  }
`;

customElements.define('x-button', XButton);

class XApp extends LitElement {
  render() {
    const routes = [
      {path: '/array', component: 'page-array', title: 'Array'},
      {path: '/orderedArray', component: 'page-ordered-array', title: 'Ordered Array'},
      {path: '/bubbleSort', component: 'page-bubble-sort', title: 'Bubble Sort'},
      {path: '/selectSort', component: 'page-select-sort', title: 'Select Sort'},
      {path: '/insertionSort', component: 'page-insertion-sort', title: 'Insertion Sort'},
      {path: '/stack', component: 'page-stack', title: 'Stack'},
      {path: '/queue', component: 'page-queue', title: 'Queue'},
      {path: '/priorityQueue', component: 'page-priority-queue', title: 'Prioriy Queue'},
      {path: '/linkList', component: 'page-link-list', title: 'Link List'},
      {path: '/mergeSort', component: 'page-merge-sort', title: 'Merge Sort'},
      {path: '/shellSort', component: 'page-shell-sort', title: 'Shell Sort'},
      {path: '/partition', component: 'page-partition', title: 'Partition'},
      {path: '/quickSort1', component: 'page-quick-sort-1', title: 'Quick Sort 1'},
      {path: '/quickSort2', component: 'page-quick-sort-2', title: 'Quick Sort 2'},
      {path: '/binaryTree', component: 'page-binary-tree', title: 'Binary Tree'},
      {path: '/redBlackTree', component: 'page-redblack-tree', title: 'Red-Black Tree'},
      {path: '/hashTable', component: 'page-hash-table', title: 'Hash Table'},
      {path: '/hashChain', component: 'page-hash-chain', title: 'Hash Chain'},
      {path: '/heap', component: 'page-heap', title: 'Heap'},
      {path: '/graphN', component: 'page-graph-n', title: 'Non-Directed Non-Weighted Graph '}
    ];
    return html`
      <h3>Workshop applications</h3>
      <nav>
        ${routes.map(route => html`<div class="nav-item"><a href="${route.path}" is="x-router-a">${route.title}</a></div>`)}
      </nav>
      <x-router .routes=${routes}></x-router>      
      <x-footer></x-footer>
    `;
    //TODO: add buttons description from Java applets
    //TODO: add short version of provided algorithms on the same page
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-app', XApp);

class PageBase extends LitElement {
  createRenderRoot() {
    return this;
  }

  handleClick(iterator, btn) {
    if (!this.iterator) {
      this.iterator = iterator.call(this);
      this.toggleButtonsActivity(btn, true);
    }
    const iteration = this.iterate();
    if (iteration.done) {
      this.iterator = null;
      this.toggleButtonsActivity(btn, false);
    }
    this.items = [...this.items];
    this.requestUpdate();
  }

  toggleButtonsActivity(btn, status) {
    this.querySelectorAll('x-button').forEach(el => {
      if (el !== btn) el.disabled = status;
    });
    btn.activated = status;
  }

  iterate() {
    const iteration = this.iterator.next();
    this.console.setMessage(iteration.value);
    const activatedBtn = this.querySelector('x-button.activated');
    if (activatedBtn) activatedBtn.focus();
    return iteration;
  }

  initItems() {
    this.items = [];
    this.length = 0;
  }

  initMarkers() {
    this.markers = [];
  }
}

class PageArray extends PageBase {
  constructor() {
    super();
    this.title = 'Array';
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h4>${this.title}</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input class="dups" type="checkbox" checked disabled>Dups OK</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.dups = this.querySelector('.dups');
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(Math.floor(Math.random() * 1000));
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [new Marker({position: 0})];
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.items = arr;
    this.length = 0;
    this.dups.disabled = false;
    yield 'Select Duplicates Ok or not';
    this.dups.disabled = true;
    return 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    for (let i = 0; i < length; i++) {
      if (this.dups.checked) {
        this.items[i].setValue(Math.floor(Math.random() * 1000));
      } else {
        this.items[i].setValue(getUniqueRandomNumber(this.items, 1000));
      }
    }
    this.length = length;
    return `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, array is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    if (!this.dups.checked) {
      const found =  this.items.find(i => i.value === key);
      if (found) yield `ERROR: you already have item with key ${key} at index ${found.index}`;
    }
    yield `Will insert item with key ${key}`;
    this.items[this.length].setValue(key);
    this.markers[0].position = this.length;
    yield `Inserted item with key ${key} at index ${this.length}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key) {
        foundAt = i;
        yield `Have found ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) {
          isAdditional = true;
          foundAt = null;
        } else {
          break;
        }
      }
      if (i !== this.length - 1) {
        yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
      }
    }
    if (foundAt == null) {
      yield `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
    }
    this.markers[0].position = 0;
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt;
    let deletedCount = 0;
    let isAdditional = false;
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key) {
        foundAt = i;
        deletedCount++;
        this.items[i].clear();
        yield `Have found and deleted ${isAdditional ? 'additioal' : ''} item at index = ${foundAt}`;
        if (this.dups.checked) isAdditional = true;
      } else if (deletedCount > 0) {
        yield `Will shift item ${deletedCount} spaces`;
        this.items[i - deletedCount].moveFrom(this.items[i]);
      } else {
        yield `Checking ${isAdditional ? 'for additioal matches' : 'next cell'}; index = ${i + 1}`;
      }
    }
    this.length -= deletedCount;
    this.markers[0].position = 0;
    if (deletedCount > 0) {
      return `Shift${deletedCount > 1 ? 's' : ''} complete; no ${isAdditional ? 'more' : ''} items to delete`;
    } else {
      return `No ${isAdditional ? 'additioal' : ''} items with key ${key}`;
    }
  }
}

customElements.define('page-array', PageArray);

class PageOrderedArray extends PageArray {
  constructor() {
    super();
    this.title = 'Ordered Array';
  }

  renderAdditionalControl() {
    return html`
      <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" checked>Linear</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_binary">Binary</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.binary = this.querySelector('.algorithm_binary');
    this.linear = this.querySelector('.algorithm_linear');
  }

  toggleButtonsActivity(btn, status) {
    super.toggleButtonsActivity(btn, status);
    this.querySelectorAll('.algorithm').forEach(el => {
      el.disabled = status;
    });
    this.items.forEach(item => {
      item.mark = false;
    });
  }

  markItems(range) {
    this.items.forEach((item, i) => {
      item.mark = i >= range.start && i <= range.end;
    });
  }

  initItems() {
    const length = 20;
    const lengthFill = 10;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => a - b);
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(arrValues[i]);
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.items = arr;
    this.length = 0;
    return 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    const arrValues = getUniqueRandomArray(length, 1000);
    arrValues.sort((a, b) => a - b);
    arrValues.forEach((value, i) => {
      this.items[i].setValue(value);
    });
    this.length = length;
    return `Fill completed; total items = ${length}`;
  }

  * linearSearch(key, isInsertion) {
    for (let i = 0; i < this.length; i++) {
      this.markers[0].position = i;
      if (this.items[i].value === key || isInsertion && this.items[i].value > key) {
        return i;
      }
      if (i !== this.length - 1) {
        yield `Checking at index = ${i + 1}`;
      }
    }
  }

  * binarySearch(key, isInsertion) {
    let range = {start: 0, end: this.length - 1};
    let i;
    while (true) {
      i = Math.floor((range.end + range.start) / 2);
      if (range.end < range.start) {
        return isInsertion ? i + 1 : null;
      }
      this.markers[0].position = i;
      this.markItems(range);
      if (this.items[i].value === key) {
        return i;
      } else {
        yield `Checking index ${i}; range = ${range.start} to ${range.end}`;
      }
      if (this.items[i].value > key) {
        range.end = i - 1;
      } else {
        range.start = i + 1;
      }
    }
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, array is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    if (this.items.find(i => i.value === key)) {
      return 'ERROR: can\'t insert, duplicate found';
    }
    yield `Will insert item with key ${key}`;
    let insertAt = yield* (this.linear.checked ? this.linearSearch(key, true) : this.binarySearch(key, true));
    insertAt = insertAt != null ? insertAt : this.length;
    yield `Will insert at index ${insertAt}${insertAt !== this.length ? ', following shift' : ''}`;
    this.markers[0].position = this.length;
    if (insertAt !== this.length) {
      yield 'Will shift cells to make room';
    }
    for (let i = this.length; i > insertAt; i--) {
      this.items[i].moveFrom(this.items[i - 1]);
      this.markers[0].position = i - 1;
      yield `Shifted item from index ${i - 1}`;
    }
    this.items[insertAt].setValue(key);
    yield `Have inserted item ${key} at index ${insertAt}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* (this.linear.checked ? this.linearSearch(key) : this.binarySearch(key));
    this.markers[0].position = 0;
    if (foundAt == null) {
      return `No items with key ${key}`;
    } else {
      return `Have found item at index = ${foundAt}`;
    }
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* (this.linear.checked ? this.linearSearch(key) : this.binarySearch(key));
    if (foundAt == null) {
      this.markers[0].position = 0;
      return `No items with key ${key}`;
    }
    this.items[foundAt].clear();
    yield `Have found and deleted item at index = ${foundAt}`;
    if (foundAt !== this.length - 1) {
      this.markers[0].position = foundAt;
      yield 'Will shift items';
    }
    for (let i = foundAt + 1; i < this.length; i++) {
      this.markers[0].position = i;
      this.items[i - 1].moveFrom(this.items[i]);
      yield `Shifted item from index ${i}`;
    }
    this.length--;
    this.markers[0].position = 0;
    return `${foundAt !== this.length ? 'Shift completed' : 'Completed'}; total items ${this.length}`;
  }
}

customElements.define('page-ordered-array', PageOrderedArray);

class PageBaseSort extends PageBase {
  constructor() {
    super();
    this.length = 10;
    this.initItems();
    this.initMarkers();
    this.pivots = [];
  }

  render() {
    return html`
      <h4>${this.title}</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorStep)}>Step</x-button>
        <x-button .callback=${this.handleAbort.bind(this)} class="btn_abort hidden">Abort</x-button>
      </div>
      <x-console class="console_verbose"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-vertical .items=${this.items} .markers=${this.markers} .temp=${this.temp} .pivots=${this.pivots}></x-items-vertical>
    `;
  }

  firstUpdated() {
    this.consoleStats = this.querySelector('.console-stats');
    this.console = this.querySelector('.console_verbose');
    this.btnStop = this.querySelector('.btn_abort');
  }

  handleAbort() {
    clearInterval(this.interval);
    this.afterSort();
    this.iterator = (function *() {
      return 'Aborted';
    })();
    this.iterate();
  }

  initItems(length = this.length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      const value = this.isReverseOrder ? (length - i) * (100 / length) : Math.floor(Math.random() * 100);
      item.setValue(value, getColor100(value));
      arr.push(item);
    }
    this.items = arr;
  }

  initMarkers() {
    this.markers = [];
  }

  updateStats(swaps = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Swaps: ${swaps}, Comparisons: ${comparisons}`);
  }

  beforeSort() {
    this.updateStats();
    this.btnStop.classList.remove('hidden');
    this.btnStop.disabled = false;
  }

  afterSort() {
    this.initMarkers();
    this.btnStop.classList.add('hidden');
  }

  * iteratorNew() {
    this.isReverseOrder = !this.isReverseOrder;
    this.initItems(this.items.length);
    this.initMarkers();
    return `Created ${this.isReverseOrder ? 'reverse' : 'unordered'} array`;
  }

  * iteratorSize() {
    const length = this.items.length === this.length ? 100 : this.length;
    this.initItems(length);
    this.initMarkers();
    return `Created ${length} elements array`;
  }

  * iteratorStep() {
    this.beforeSort();

    //sort algorithm goes here

    this.afterSort();
    return 'Sort is complete';
  }

  * iteratorRun() {
    this.beforeSort();
    let iterator;
    let isDone = false;
    while(true) {
      yield 'Press Next to start';
      this.interval = setInterval(() => {
        if (!iterator) {
          iterator = this.iteratorStep();
        }
        if (iterator.next().done) {
          isDone = true;
          this.iterate();
        }
        this.items = [...this.items];
        this.requestUpdate();
      }, this.items.length === this.length ? 200 : 40);
      yield 'Press Next to pause';
      clearInterval(this.interval);
      if (isDone) break;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

class PageBubbleSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Bubble Sort';
  }

  /*
  * algorithm:

    for (let outer = items.length - 1; outer > 0; outer--) {
      for (let inner = 0; inner < outer; inner++) {
        if (items[inner] > items[inner + 1]) {
          swap(items[inner], items[inner + 1]);
        }
      }
    }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner+1'}),
      new Marker({position: this.items.length - 1, size: 2, color: 'red', text: 'outer'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    let swaps = 0;
    let comparisons = 0;
    for (let outer = this.items.length - 1; outer > 0; outer--) {
      for (let inner = 0; inner < outer; inner++) {
        if (this.items[inner].value > this.items[inner + 1].value) {
          yield 'Will be swapped';
          this.items[inner].swapWith(this.items[inner + 1]);
          swaps++;
        } else {
          yield 'Will not be swapped';
        }
        this.updateStats(swaps, ++comparisons);
        this.markers[0].position++;
        this.markers[1].position++;
      }
      this.markers[0].position = 0;
      this.markers[1].position = 1;
      this.markers[2].position--;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-bubble-sort', PageBubbleSort);

class PageSelectSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Select Sort';
  }

  /*
  * algorithm:

    for (let outer = 0; outer < items.length - 1; outer++) {
      min = outer;
      for (let inner = outer + 1; inner < items.length; inner++) {
        if (items[inner] < items[min]) {
          min = inner;
        }
      }
      swap(items[outer], items[min]);
    }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 0, size: 2, color: 'red', text: 'outer'}),
      new Marker({position: 0, size: 3, color: 'purple', text: 'min'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    let swaps = 0;
    let comparisons = 0;
    let min = 0;
    for (let outer = 0; outer < this.items.length - 1; outer++) {
      min = outer;
      for (let inner = outer + 1; inner < this.items.length; inner++) {
        yield 'Searching for minimum';
        if (this.items[inner].value < this.items[min].value) {
          min = inner;
          this.markers[2].position = min;
        }
        this.markers[0].position++;
        this.updateStats(swaps, ++comparisons);
      }
      if (min !== outer) {
        yield 'Will swap outer & min';
        this.items[outer].swapWith(this.items[min]);
        this.updateStats(++swaps, comparisons);
      } else {
        yield 'Will not be swapped';
      }
      this.markers[0].position = outer + 2;
      this.markers[1].position++;
      this.markers[2].position = outer + 1;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-select-sort', PageSelectSort);

class PageInsertionSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Insertion Sort';
  }

  /*
  * algorithm:

    for (let inner, outer = 1; outer < items.length; outer++) {
      temp = items[outer];
      for (inner = outer; inner > 0 && temp >= items[inner - 1]; inner--) {
        items[inner] = items[inner - 1];
      }
      items[inner] = temp;
    }

  * */

  initItems(length) {
    super.initItems(length);
    this.temp = new Item({value: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 1, size: 1, color: 'blue', text: 'inner'}),
      new Marker({position: 1, size: 2, color: 'red', text: 'outer'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({value: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparisons = 0;
    for (let inner, outer = 1; outer < this.items.length; outer++) {
      yield 'Will copy outer to temp';
      this.items[outer].swapWith(this.temp);
      copies++;
      for (inner = outer; inner > 0; inner--) {
        this.updateStats(copies, ++comparisons);
        if (this.temp.value >= this.items[inner - 1].value) {
          yield 'Have compared inner-1 and temp: no copy necessary';
          break;
        }
        yield 'Have compared inner-1 and temp: will copy inner to inner-1';
        this.items[inner].swapWith(this.items[inner - 1]);
        this.updateStats(++copies, comparisons);
        this.markers[0].position--;
      }
      yield 'Will copy temp to inner';
      this.temp.swapWith(this.items[inner]);
      this.markers[0].position = outer + 1;
      this.markers[1].position++;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-insertion-sort', PageInsertionSort);

class PageStack extends PageBase {
  constructor() {
    super();
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Stack</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPush)}>Push</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPop)}>Pop</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems() {
    const length = 10;
    const lengthFill = 4;
    const arr = [];
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(Math.floor(Math.random() * 1000));
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 3, size: 1, color: 'red', text: 'top'})
    ];
  }

  * iteratorNew() {
    yield 'Will create new empty stack';
    const length = 10;
    this.items = [];
    for (let i = 0; i < length; i++) {
      this.items.push(new Item({index: i}));
    }
    this.length = 0;
    this.markers[0].position = -1;
  }

  * iteratorPush() {
    if (this.length === this.items.length) {
      return 'ERROR: can\'t push. Stack is full';
    }
    let key = 0;
    yield 'Enter key of item to push';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t push. Need key between 0 and 999';
    }
    yield `Will push item with key ${key}`;
    this.markers[0].position++;
    yield 'Incremented top';
    this.items[this.length].setValue(key);
    this.length++;
    return `Inserted item with key ${key}`;
  }

  * iteratorPop() {
    if (this.length === 0) {
      return 'ERROR: can\'t pop. Stack is empty';
    }
    yield 'Will pop item from top of stack';
    const item = this.items[this.length - 1];
    const value = item.value;
    item.clear();
    yield `Item removed; Returned value is ${value}`;
    this.markers[0].position--;
    this.length--;
    return 'Decremented top';
  }

  * iteratorPeek() {
    if (this.length === 0) {
      return 'ERROR: can\'t peek. Stack is empty';
    }
    yield 'Will peek at item at top of stack';
    return `Returned value is ${this.items[this.length - 1].value}`;
  }
}

customElements.define('page-stack', PageStack);

class PageQueue extends PageStack {
  render() {
    return html`
      <h4>Queue</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers} reverse></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'front'}),
      new Marker({position: this.length - 1, size: 3, color: 'blue', text: 'rear'})
    ];
  }

  * iteratorNew() {
    yield 'Will create new empty queue';
    const length = 10;
    this.items = [];
    for (let i = 0; i < length; i++) {
      this.items.push(new Item({index: i}));
    }
    this.length = 0;
    this.initMarkers();
  }

  getNextIndex(index) {
    return index + 1 === this.items.length ? 0 : index + 1;
  }

  * iteratorIns() {
    if (this.length === this.items.length) {
      return 'ERROR: can\'t push. Queue is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert item with key ${key}`;
    const newIndex = this.getNextIndex(this.markers[1].position);
    this.items[newIndex].setValue(key);
    this.markers[1].position = newIndex;
    this.length++;
    return `Inserted item with key ${key}`;
  }

  * iteratorRem() {
    if (this.length === 0) {
      return 'ERROR: can\'t remove. Queue is empty';
    }
    yield 'Will remove item from front of queue';
    const curIndex = this.markers[0].position;
    const item = this.items[curIndex];
    const value = item.value;
    item.clear();
    this.markers[0].position = this.getNextIndex(curIndex);
    this.length--;
    return `Item removed; Returned value is ${value}`;
  }

  * iteratorPeek() {
    if (this.length === 0) {
      return 'ERROR: can\'t peek. Queue is empty';
    }
    yield 'Will peek at front of queue';
    return `Returned value is ${this.items[this.markers[0].position].value}`;
  }
}

customElements.define('page-queue', PageQueue);

class PagePriorityQueue extends PageQueue {
  initItems() {
    const length = 10;
    const lengthFill = 4;
    const arr = [];
    const arrValues = getUniqueRandomArray(lengthFill, 1000);
    arrValues.sort((a, b) => b - a);
    for (let i = 0; i < length; i++) {
      const item = new Item({index: i});
      if (i < lengthFill) item.setValue(arrValues[i]);
      arr.push(item);
    }
    this.items = arr;
    this.length = lengthFill;
  }

  initMarkers() {
    this.markers = [
      new Marker({position: this.length - 1, size: 1, color: 'red', text: 'front'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'rear'}),
      new Marker({position: -1, size: 1, color: 'purple'})
    ];
  }

  * iteratorIns() {
    if (this.length === this.items.length) {
      return 'ERROR: can\'t push. Queue is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    this.markers[2].position = this.markers[0].position;
    yield `Will insert item with key ${key}`;
    for (let i = this.markers[0].position; i >= -1; i--) {
      if (i === -1 || key <= this.items[i].value) {
        this.markers[2].position++;
        yield 'Found place to insert';
        this.items[i + 1].setValue(key);
        this.markers[0].position++;
        break;
      } else {
        this.items[i + 1].moveFrom(this.items[i]);
        yield 'Searching for place to insert';
        this.markers[2].position--;
      }
    }
    this.markers[2].position = -1;
    this.length++;
    return `Inserted item with key ${key}`;
  }

  * iteratorRem() {
    if (this.length === 0) {
      return 'ERROR: can\'t remove. Queue is empty';
    }
    yield 'Will remove item from front of queue';
    const item = this.items[this.markers[0].position];
    const value = item.value;
    item.clear();
    this.markers[0].position--;
    this.length--;
    return `Item removed; Returned value is ${value}`;
  }
}

customElements.define('page-priority-queue', PagePriorityQueue);

class PageLinkList extends PageBase {
  constructor() {
    super();
    this.initItems(13);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Link List</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
      </div>
      <x-console></x-console>
      <x-items-horizontal-linked .items=${this.items} .marker=${this.marker}></x-items-horizontal-linked>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input class="sorted" type="checkbox" disabled>Sorted</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.sorted = this.querySelector('.sorted');
  }

  initItems(length, sorted) {
    const arrValues = getUniqueRandomArray(length, 1000);
    if (sorted) arrValues.sort((a, b) => a - b);
    this.items = arrValues.map(value => (new Item({})).setValue(value));
  }

  initMarkers() {
    this.marker = new Marker({position: 0});
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of linked list to create';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 56 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    yield `Will create list with ${length} links`;
    this.sorted.disabled = false;
    yield 'Select: Sorted or not';
    this.sorted.disabled = true;
    this.initItems(length, this.sorted.checked);
  }

  * search(key, isInsertion) {
    for (let i = 0; i < this.items.length; i++) {
      this.marker.position = i;
      if (this.items[i].value === key || isInsertion && this.items[i].value > key) {
        return i;
      }
      if (i !== this.length - 1) {
        yield `Searching for ${isInsertion ? 'insertion point' : `item with key ${key}`}`;
      }
    }
  }

  * iteratorIns() {
    if (this.items.length === 56) {
      return 'ERROR: can\'t insert, list is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    const item = (new Item({mark: true})).setValue(key);
    let foundAt = 0;
    if (this.sorted.checked) {
      yield 'Will search insertion point';
      foundAt = yield* this.search(key, true);
      yield 'Have found insertion point';
      if (foundAt != null) {
        const part = this.items.splice(foundAt, this.items.length - foundAt, item);
        this.items = this.items.concat(part);
      } else {
        this.items.push(item);
      }
    } else {
      yield `Will insert item with key ${key}`;
      this.items.unshift(item);
    }
    this.marker.position = -1;
    yield 'Item inserted. Will redraw the list';
    item.mark = false;
    this.marker.position = foundAt;
    yield `Inserted item with key ${key}`;
    this.marker.position = 0;
    return `Insertion completed. Total items = ${this.items.length}`;
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* this.search(key);
    this.marker.position = 0;
    return `${foundAt == null ? 'No' : 'Have found'} items with key ${key}`;
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* this.search(key);
    if (foundAt == null) {
      this.marker.position = 0;
      return `No items with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
      this.items[foundAt].clear();
      yield 'Deleted item. Will redraw the list';
      this.items.splice(foundAt, 1);
      this.marker.position = 0;
      return `Deleted item with key ${key}. Total items = ${this.items.length}`;
    }
  }
}

customElements.define('page-link-list', PageLinkList);

class PageMergeSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Merge Sort';
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

  mergeSort(lower, upper) {
    if (lower !== upper) {
      let mid = Math.floor((lower + upper) / 2);
      this.mergeSort(lower, mid);
      this.mergeSort(mid + 1, upper);
      this.merge(lower, mid + 1, upper);
    }
  }

  merge(lower, mid, upper) {
    let lowerBound = lower;
    let midBound = mid - 1;
    let workSpace = [];
    while (lower <= midBound && mid <= upper) {
      if (this.items[lower].value < this.items[mid].value) {
        workSpace.push(new Item(this.items[lower++]));
      } else {
        workSpace.push(new Item(this.items[mid++]));
      }
    }
    while (lower <= midBound) {
      workSpace.push(new Item(this.items[lower++]));
    }
    while (mid <= upper) {
      workSpace.push(new Item(this.items[mid++]));
    }
    workSpace.forEach((item, i) => {
      this.items[lowerBound + i].copyFrom(item);
    });
  }

  * */

  initMarkers() {
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'lower'}),
      new Marker({position: 0, size: 2, color: 'red', text: 'upper'}),
      new Marker({position: 0, size: 3, color: 'blue', text: 'mid'}),
      new Marker({position: -1, size: 3, color: 'purple', text: 'ptr'}),
    ];
  }

  updateStats(copies = 0, comparisons = 0) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}`);
  }

  * merge(lower, mid, upper) {
    let lowerBound = lower;
    let midBound = mid - 1;
    let workSpace = [];
    while (lower <= midBound && mid <= upper) {
      this.comparisons++;
      if (this.items[lower].value < this.items[mid].value) {
        workSpace.push(new Item(this.items[lower++]));
      } else {
        workSpace.push(new Item(this.items[mid++]));
      }
    }
    while (lower <= midBound) {
      workSpace.push(new Item(this.items[lower++]));
    }
    while (mid <= upper) {
      workSpace.push(new Item(this.items[mid++]));
    }
    this.markers[2].position = -1;
    this.markers[3].position = lowerBound;
    this.copies += workSpace.length;
    this.updateStats(this.copies, this.comparisons);
    yield `Merged ${lowerBound}-${midBound} and ${midBound + 1}-${upper} into workSpace`;
    for (let i = 0; i < workSpace.length; i++) {
      this.items[lowerBound + i].copyFrom(workSpace[i]);
      this.markers[3].position = lowerBound + i;
      this.updateStats(++this.copies, this.comparisons);
      yield `Copied workspace into ${lowerBound + i}`;
    }
  }

  * iteratorStep() {
    this.beforeSort();
    this.copies = 0;
    this.comparisons = 0;

    const operations = [];
    const mergeSort = (lower, upper) => {
      operations.push({type: 'mergeSortStart', lower: lower, upper: upper});
      if (lower !== upper) {
        let mid = Math.floor((lower + upper) / 2);
        operations.push({type: 'mergeSortLower', lower: lower, upper: mid});
        mergeSort(lower, mid);
        operations.push({type: 'mergeSortUpper', lower: mid + 1, upper: upper});
        mergeSort(mid + 1, upper);
        operations.push({type: 'merge', lower: lower, mid: mid + 1, upper: upper});
      } else {
        operations.push({type: 'mergeSortEnd', lower: lower, upper: upper});
      }
    };
    mergeSort(0, this.items.length - 1);

    yield 'Initial call to mergeSort';
    for (let i = 0; i < operations.length; i++) {
      switch (operations[i].type) {
        case 'mergeSortStart': {
          this.markers[0].position = operations[i].lower;
          this.markers[1].position = operations[i].upper;
          yield `Entering mergeSort: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortEnd': {
          yield `Exiting mergeSort: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortLower': {
          this.markers[2].position =  operations[i].upper;
          yield `Will sort lower half: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'mergeSortUpper': {
          this.markers[1].position = operations[i].upper;
          this.markers[2].position = operations[i].lower;
          yield `Will sort upper half: ${operations[i].lower}-${operations[i].upper}`;
          break;
        }
        case 'merge': {
          yield 'Will merge ranges';
          this.markers[0].position = operations[i].lower;
          this.markers[1].position = operations[i].upper;
          yield* this.merge(operations[i].lower, operations[i].mid, operations[i].upper);
          this.markers[3].position = -1;
        }
      }
    }

    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-merge-sort', PageMergeSort);

class PageShellSort extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Shell Sort';
  }

  /*
  * algorithm:

    let h = 1;
    //calculate maximum possible h
    while (h <= (this.items.length - 1) / 3) {
      h = h * 3 + 1;
    }
    //consistent reduce h
    while (h > 0) {
      //h-sort
      for (let outer = h; outer < this.items.length; outer++) {
        this.items[outer].swapWith(this.temp);
        let inner = outer;
        while (inner > h - 1 && this.temp.value <= this.items[inner - h].value) {
          this.items[inner].swapWith(this.items[inner - h]);
          inner -= h;
        }
        this.temp.swapWith(this.items[inner]);
      }
      //reduce h
      h = (h - 1) / 3;
    }

  * */

  initItems(length) {
    super.initItems(length);
    this.temp = new Item({value: 0});
  }

  initMarkers() {
    this.markers = [
      new Marker({position: -1, size: 1, color: 'red', text: 'outer'}),
      new Marker({position: -1, size: 2, color: 'blue', text: 'inner'}),
      new Marker({position: -1, size: 3, color: 'blue', text: 'inner-h'}),
      new Marker({position: 'temp', size: 1, color: 'purple', text: 'temp'})
    ];
  }

  updateStats(copies = 0, comparisons = 0, h = 1) {
    this.consoleStats.setMessage(`Copies: ${copies}, Comparisons: ${comparisons}, h=${h}`);
  }

  afterSort() {
    super.afterSort();
    this.temp = new Item({value: 0});
  }

  * iteratorStep() {
    this.beforeSort();
    let copies = 0;
    let comparisons = 0;
    let h = 1;
    //calculate maximum possible h
    while (h <= (this.items.length - 1) / 3) {
      h = h * 3 + 1;
    }
    //consistent reduce h
    while (h > 0) {
      //h-sort
      this.updateStats(copies, comparisons, h);
      for (let outer = h; outer < this.items.length; outer++) {
        let inner = outer;
        this.markers[0].position = outer;
        this.markers[1].position = inner;
        this.markers[2].position = inner - h;
        yield `${h}-sorting array. Will copy outer to temp`;
        this.updateStats(++copies, comparisons, h);
        this.items[outer].swapWith(this.temp);
        yield 'Will compare inner-h and temp';
        this.updateStats(copies, ++comparisons, h);
        while (inner > h - 1 && this.temp.value <= this.items[inner - h].value) {
          yield 'inner-h >= temp; Will copy inner-h to inner';
          this.updateStats(++copies, comparisons, h);
          this.items[inner].swapWith(this.items[inner - h]);
          inner -= h;
          this.markers[1].position = inner;
          this.markers[2].position = inner - h;
          if (inner <= h - 1) {
            yield 'There is no inner-h';
          } else {
            yield 'Will compare inner-h and temp';
            this.updateStats(copies, ++comparisons, h);
          }
        }
        yield `${inner <= h - 1 ? '' : 'inner-h < temp; '}Will copy temp to inner`;
        this.updateStats(++copies, comparisons, h);
        this.temp.swapWith(this.items[inner]);
      }
      //reduce h
      h = (h - 1) / 3;
    }
    this.afterSort();
    return 'Sort is complete';
  }
}

customElements.define('page-shell-sort', PageShellSort);

class PagePartition extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Partition';
    this.partition = -1;
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

    let pivot = 50;
    let left = 0;
    let right = this.items.length - 1;

    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      //search greater than pivot
      while (leftPtr < right && this.items[++leftPtr].value < pivot) {
      }
      //search less than pivot
      while (rightPtr > left && this.items[--rightPtr].value > pivot) {
      }
      if (leftPtr >= rightPtr) {
        break;
      } else {
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
    this.partition = leftPtr;

  * */

  afterSort() {
    super.afterSort();
    this.pivots = [];
  }

  initMarkers() {
    this.markers = [
      new Marker({position: -1, size: 1, color: 'blue', text: 'leftScan'}),
      new Marker({position: -1, size: 1, color: 'blue', text: 'rightScan'}),
      new Marker({position: this.partition, size: 2, color: 'purple', text: 'partition'})
    ];
  }

  * iteratorStep() {
    this.beforeSort();
    this.markers[2].position = -1;
    let swaps = 0;
    let comparisons = 0;

    let left = 0;
    let right = this.items.length - 1;
    this.pivots = [{
      start: left,
      end: right,
      value: 40 + Math.floor(Math.random() * 20)
    }];
    yield `Pivot value is ${this.pivots[0].value}`;

    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      yield `Will scan ${leftPtr > -1 ? 'again' : ''} from left`;
      this.markers[0].position = leftPtr + 1;
      this.updateStats(swaps, ++comparisons);
      while (leftPtr < right && this.items[++leftPtr].value < this.pivots[0].value) {
        if (leftPtr < right) {
          yield 'Continue left scan';
          this.markers[0].position = leftPtr + 1;
        }
        this.updateStats(swaps, ++comparisons);
      }
      yield 'Will scan from right';
      this.markers[1].position = rightPtr - 1;
      this.updateStats(swaps, ++comparisons);
      while (rightPtr > left && this.items[--rightPtr].value > this.pivots[0].value) {
        if (rightPtr > left) {
          yield 'Continue right scan';
          this.markers[1].position = rightPtr - 1;
        }
        this.updateStats(swaps, ++comparisons);
      }
      if (leftPtr >= rightPtr) {
        yield 'Scans have met';
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++swaps, comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }

    this.partition = leftPtr;
    this.afterSort();
    return 'Arrow shows partition';
  }
}

customElements.define('page-partition', PagePartition);

class PageQuickSort1 extends PageBaseSort {
  constructor() {
    super();
    this.title = 'Quick Sort 1';
    this.length = 12;
    this.initItems();
    this.initMarkers();
  }

  /*
  * algorithm:

    const quickSort = (left, right) => {
      if (right - left < 1) return;
      const pivot = right;
      partition(left, right, pivot);
      quickSort(left, pivot - 1);
      quickSort(pivot + 1, right);
    };
    quickSort(0, this.items.length - 1);

  * */

  initMarkers() {
    this.pivots = [];
    this.markers = [
      new Marker({position: 0, size: 1, color: 'red', text: 'left'}),
      new Marker({position: 0, size: 2, color: 'blue', text: 'leftScan'}),
      new Marker({position: this.items.length - 1, size: 1, color: 'red', text: 'right'}),
      new Marker({position: this.items.length - 2, size: 2, color: 'blue', text: 'rightScan'}),
      new Marker({position: this.items.length - 1, size: 3, color: 'purple', text: 'pivot'}),
    ];
  }

  * partition(left, right, pivot) {
    let leftPtr = left - 1;
    let rightPtr = right + 1;
    while (true) {
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= left) {
        yield 'Will scan again';
      } else {
        yield `leftScan = ${leftPtr}, rightScan = ${rightPtr}; Will scan`;
      }
      this.comparisons++;
      while (this.items[++leftPtr].value < this.items[pivot].value) {
        if (leftPtr < right) this.comparisons++;
      }
      this.comparisons++;
      while (rightPtr > 0 && this.items[--rightPtr].value > this.items[pivot].value) {
        this.comparisons++;
      }
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= rightPtr) {
        yield 'Scans have met. Will swap pivot and leftScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[pivot]);
        yield `Array partitioned: left (${left}-${leftPtr - 1}), right (${leftPtr + 1}-${right + 1}) `;
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
    return leftPtr;
  }

  * iteratorStep() {
    this.beforeSort();
    this.swaps = 0;
    this.comparisons = 0;

    const callStack = [{state: 'initial', left: 0, right: this.items.length - 1}];
    while (callStack.length > 0) {
      let {state, left, right} = callStack.pop();
      if (state !== 'initial') {
        this.markers[0].position = left;
        this.markers[1].position = left;
        this.markers[2].position = right;
        this.markers[3].position = right - 1;
        this.markers[4].position = right;
        yield `Will sort ${state} partition (${left}-${right})`;
      }
      if (right - left < 1) {
        yield `Entering quickSort; Partition (${left}-${right}) is too small to sort`;
      } else {
        this.pivots.push({
          start: left,
          end: right,
          value: this.items[right].value
        });
        yield `Entering quickSort; Will partition (${left}-${right})`;
        let pivot = yield* this.partition(left, right - 1, right);
        callStack.push({state: 'right', left: pivot + 1, right: right});
        callStack.push({state: 'left', left: left, right: pivot - 1});
      }
    }

    this.afterSort();
    return 'Sort completed';
  }
}

customElements.define('page-quick-sort-1', PageQuickSort1);

class PageQuickSort2 extends PageQuickSort1 {
  constructor() {
    super();
    this.title = 'Quick Sort 2';
  }

  /*
  * algorithm:

    const quickSort = (left, right) => {
    int size = right-left+1;
    if(size <= 3) // Ручная сортировка при малом размере
    manualSort(left, right);
    else // Быстрая сортировка при большом размере
    {
    long median = medianOf3(left, right);
    int partition = partitionIt(left, right, median);
    recQuickSort(left, partition-1);
    recQuickSort(partition+1, right);
    }
    }
    };
    quickSort(0, this.items.length - 1);

  * */

  * partition(left, right, pivot) {
    let leftPtr = left;
    let rightPtr = right - 1;
    while (true) {
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr > left) {
        yield 'Will scan again';
      } else {
        yield `Will scan (${leftPtr + 1}-${rightPtr - 1})`;
      }
      this.comparisons++;
      while (this.items[++leftPtr].value < this.items[pivot].value) {
        if (leftPtr < right) this.comparisons++;
      }
      this.comparisons++;
      while (this.items[--rightPtr].value > this.items[pivot].value) {
        this.comparisons++;
      }
      this.markers[1].position = leftPtr;
      this.markers[3].position = rightPtr;
      if (leftPtr >= rightPtr) {
        yield 'Scans have met. Will swap pivot and leftScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[pivot]);
        yield `Array partitioned: left (${left}-${leftPtr - 1}), right (${leftPtr + 1}-${right}) `;
        break;
      } else {
        yield 'Will swap leftScan and rightScan';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[leftPtr].swapWith(this.items[rightPtr]);
      }
    }
    return leftPtr;
  }

  leftCenterRightSort(left, center, right) {
    if(this.items[left].value > this.items[center].value) {
      this.swaps++;
      this.items[left].swapWith(this.items[center]);
    }
    if(this.items[left].value > this.items[right].value) {
      this.swaps++;
      this.items[left].swapWith(this.items[right]);
    }
    if(this.items[center].value > this.items[right].value) {
      this.swaps++;
      this.items[center].swapWith(this.items[right]);
    }
  }

  manualSort(left, right) {
    const size = right - left + 1;
    if (size === 2) {
      if(this.items[left].value > this.items[right].value) {
        this.swaps++;
        this.items[left].swapWith(this.items[right]);
      }
    } else if (size === 3) {
      this.leftCenterRightSort(left, right -1, right);
    }
  }

  * iteratorStep() {
    this.beforeSort();
    this.swaps = 0;
    this.comparisons = 0;

    const callStack = [{state: 'initial', left: 0, right: this.items.length - 1}];
    while (callStack.length > 0) {
      let {state, left, right} = callStack.pop();
      if (state !== 'initial') {
        this.markers[0].position = left;
        this.markers[1].position = left;
        this.markers[2].position = right;
        this.markers[3].position = right - 1;
        this.markers[4].position = right;
        yield `Will sort ${state} partition (${left}-${right})`;
      }
      const size = right - left + 1;
      if (size <= 3) {
        if (size === 1) yield `quickSort entry; Array of 1 (${left}-${right}) always sorted`;
        else if (size === 2) yield `quickSort entry; Will sort 2-elements array (${left}-${right})`;
        else if (size === 3) yield `quickSort entry; Will sort left, center, right (${left}-${right - 1}-${right})`;
        this.manualSort(left, right);
        this.updateStats(this.swaps, this.comparisons);
        if (size === 1) yield 'No actions necessary';
        else if (size === 2) yield 'Done 2-element sort';
        else if (size === 3) yield 'Done left-center-right sort';
      } else {
        const median = Math.floor((left + right) / 2);
        yield `quickSort entry; Will sort left, center, right (${left}-${median}-${right})`;
        this.leftCenterRightSort(left, median, right);
        this.updateStats(this.swaps, this.comparisons);
        this.markers[4].position = median;
        yield `Will partition (${left}-${right}); pivot will be ${median}`;
        this.pivots.push({
          start: left,
          end: right,
          value: this.items[median].value
        });
        yield 'Will swap pivot and right-1';
        this.updateStats(++this.swaps, this.comparisons);
        this.items[median].swapWith(this.items[right - 1]);
        this.markers[4].position = right - 1;
        let partition = yield* this.partition(left, right, right - 1);
        callStack.push({state: 'right', left: partition + 1, right: right});
        callStack.push({state: 'left', left: left, right: partition - 1});
      }
    }

    this.afterSort();
    return 'Sort completed';
  }
}

customElements.define('page-quick-sort-2', PageQuickSort2);

class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(29);
    this.initMarker();
  }

  render() {
    return html`
      <h4>Binary Tree</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTrav)}>Trav</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.travConsole = this.querySelector('.console-stats');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems(length) {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    for (let i = 0; i <= length - 1; i++) {
      let i = 0;
      const value = Math.floor(Math.random() * 100);
      while(arr[i] && arr[i].value != null) {
        i = 2 * i + (arr[i].value > value ? 1 : 2);
      }
      if(arr[i]) arr[i].setValue(value);
    }
    this.items = arr;
  }

  initMarker() {
    this.marker = new Marker({position: 0});
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of nodes (1 to 31)';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 31 || length < 1) {
      return 'ERROR: use size between 1 and 31';
    }
    yield `Will create tree with ${length} nodes`;
    this.initItems(length);
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of node to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 99';
    }
    yield `Will try to find node with key ${key}`;
    let i = 0;
    let isFound = false;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      if (this.items[i].value === key) {
        isFound = true;
        break;
      }
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    yield `${isFound ? 'Have found' : 'Can\'t find'} node ${key}`;
    yield 'Search is complete';
    this.initMarker();
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of node to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert node with key ${key}`;
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    if (this.items[i]) {
      this.marker.position = i;
      this.items[i].setValue(key);
      yield `Have inserted node with key ${key}`;
      yield 'Insertion completed';
    } else {
      yield 'Can\'t insert: Level is too great';
    }
    this.initMarker();
  }

  * iteratorTrav() {
    yield 'Will traverse tree in "inorder"';
    this.travConsole.setMessage('');
    const operations = [];
    function traverse(i, items) {
      if (!items[i] || items[i].value == null) return;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      operations.push({type: 'left', index: left});
      traverse(left, items);
      operations.push({type: 'self', index: i, value: items[i].value});
      operations.push({type: 'right', index: right});
      traverse(right, items);
      operations.push({type: 'exit', index: i});
    }
    traverse(0, this.items);
    while (operations.length > 0) {
      const operation = operations.shift();
      if (this.items[operation.index] && this.items[operation.index].value != null) {
        this.marker.position = operation.index;
      }
      switch (operation.type) {
        case 'self': {
          yield 'Will visit this node';
          this.travConsole.setMessage(this.travConsole.message + ' ' + operation.value);
          break;
        }
        case 'left': {
          yield 'Will check for left child';
          break;
        }
        case 'right': {
          yield 'Will check for right child';
          break;
        }
        case 'exit': {
          yield 'Will go to root of last subtree';
          break;
        }
      }
    }
    yield 'Finish traverse';
    this.travConsole.setMessage('');
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of node to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 99';
    }
    yield `Will try to find node with key ${key}`;
    let i = 0;
    let isFound = false;
    while (this.items[i] && this.items[i].value != null) {
      this.marker.position = i;
      if (this.items[i].value === key) {
        isFound = true;
        break;
      }
      const isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
      yield `Going to ${isLeft ? 'left' : 'right'} child`;
    }
    if (isFound) {
      yield 'Have found node to delete';
    } else {
      return 'Can\'t find node to delete';
    }

    const current = this.items[i];
    const leftChild = this.items[2 * i + 1];
    const rightChild = this.items[2 * i + 2];
    //if node has no children
    if ((!leftChild || leftChild.value == null) && (!rightChild || rightChild.value == null)) {
      current.clear();
      yield 'Node was deleted';
    } else if (!rightChild || rightChild.value == null) { //if node has no right child
      yield 'Will replace node with its left subtree';
      PageBinaryTree.moveSubtree(leftChild.index, current.index, this.items);
      yield 'Node was replaced by its left subtree';
    } else if (!leftChild || leftChild.value == null) { //if node has no left child
      yield 'Will replace node with its right subtree';
      PageBinaryTree.moveSubtree(rightChild.index, current.index, this.items);
      yield 'Node was replaced by its right subtree';
    } else { //node has two children, find successor
      const successor = PageBinaryTree.getSuccessor(current.index, this.items);
      yield `Will replace node with ${this.items[successor].value}`;
      const hasRightChild = this.items[2 * successor + 2] && this.items[2 * successor + 2].value != null;
      if (hasRightChild) {
        yield `and replace ${this.items[successor].value} with its right subtree`;
      }
      current.moveFrom(this.items[successor]);
      if (hasRightChild) {
        PageBinaryTree.moveSubtree(2 * successor + 2, successor, this.items);
        yield 'Removed node in 2-step process';
      } else {
        yield 'Node was replaced by successor';
      }
    }
    this.initMarker();
  }

  static getSuccessor(index, items) {
    let successor = index;
    let current = 2 * index + 2; //right child
    while(items[current] && items[current].value != null) {
      successor = current;
      current = 2 * current + 1; //left child
    }
    return successor;
  }

  static moveSubtree(from, to, items) {
    const tempItems = [];
    function recursiveMoveToTemp(from, to) {
      if (!items[from] || items[from].value == null) return;
      tempItems[to] = new Item(items[from]);
      items[from].clear();
      recursiveMoveToTemp(2 * from + 1, 2 * to + 1); //left
      recursiveMoveToTemp(2 * from + 2, 2 * to + 2); //right
    }
    recursiveMoveToTemp(from, to);
    tempItems.forEach((item, index) => { //restore from temp
      items[index].moveFrom(item);
    });
  }
}

customElements.define('page-binary-tree', PageBinaryTree);

class PageRedBlackTree extends PageBase {
  constructor() {
    super();
    this.init();
  }

  render() {
    return html`
      <h4>Red-Black Tree</h4>
      <div class="controlpanel">
        <x-button .callback=${this.init.bind(this)}>Start</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFlip)}>Flip</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRoL)}>RoL</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRoR)}>RoR</x-button>
        <x-button .callback=${this.swichRB.bind(this)}>R/B</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker} .clickFn=${item => this.marker.position = item.index}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.correctnessConsole = this.querySelector('.console-stats');
    this.dialog = this.querySelector('x-dialog');
  }

  handleClick() {
    const result = super.handleClick(...arguments);
    this.checkRules();
    return result;
  }

  init() {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    arr[0].setValue(50);
    this.items = arr;
    this.marker = new Marker({position: 0});
    if (this.console) {
      this.checkRules();
    }
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of node to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    let i = 0;
    let isLeft = false;
    while(this.items[i] && this.items[i].value != null) {
      isLeft = this.items[i].value > key;
      i = 2 * i + (isLeft ? 1 : 2);
    }
    if (this.items[i]) {
      const parentI = Math.floor((i - 1) / 2);
      const grandParentI = Math.floor((parentI - 1) / 2);
      //if parent is red, grandParent is black and second child of grandParent is red
      if (this.items[parentI].mark && this.items[grandParentI] && !this.items[grandParentI].mark && this.items[2 * grandParentI + (isLeft ? 2 : 1)].mark) {
        this.marker.position = grandParentI;
        return 'CAN\'T INSERT: Needs color flip';
      } else {
        this.marker.position = i;
        this.items[i].setValue(key);
        this.items[i].mark = true;
      }
    } else {
      return 'CAN\'T INSERT: Level is too great';
    }
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of node to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    let i = 0;
    while(this.items[i] && this.items[i].value != null) {
      if (this.items[i].value === key) break;
      i = 2 * i + (this.items[i].value > key ? 1 : 2);
    }
    if (!this.items[i] || this.items[i].value == null) {
      return 'Can\'t find node to delete';
    }

    const current = this.items[i];
    const leftChild = this.items[2 * i + 1];
    const rightChild = this.items[2 * i + 2];
    //if node has no children
    if ((!leftChild || leftChild.value == null) && (!rightChild || rightChild.value == null)) {
      this.items[i].mark = false;
      current.clear();
    } else if (!rightChild || rightChild.value == null) { //if node has no right child
      PageBinaryTree.moveSubtree(leftChild.index, current.index, this.items);
    } else if (!leftChild || leftChild.value == null) { //if node has no left child
      PageBinaryTree.moveSubtree(rightChild.index, current.index, this.items);
    } else { //node has two children, find successor
      const successor = PageBinaryTree.getSuccessor(current.index, this.items);
      const hasRightChild = this.items[2 * successor + 2] && this.items[2 * successor + 2].value != null;
      current.moveFrom(this.items[successor]);
      if (hasRightChild) {
        PageBinaryTree.moveSubtree(2 * successor + 2, successor, this.items);
      }
    }
  }

  checkRules() {
    let error = null;
    //1. Each node is red or black
    //2. Root node is always black
    if (this.items[0].mark) {
      error = 'ERROR: Root must be black';
    }
    //3. Red node has black children
    this.items.forEach((item, i) => {
      const leftChild = this.items[2 * i + 1];
      const rightChild = this.items[2 * i + 2];
      if (leftChild == null) return;
      if (item.mark && (leftChild.mark || rightChild.mark)) {
        error = 'ERROR: Parent and child are both red!';
        this.marker.position = item.index;
      }
    });
    //4. All routes from root to node or empty child have same black height
    let counter = 1;
    let cur = null;
    function traverse(i, items) {
      if (!items[i] || items[i].value == null) {
        if (cur != null && counter !== cur) {
          error = 'ERROR: Black counts differ!';
        } else {
          cur = counter;
        }
        return;
      }
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      //left
      if (items[left] && !items[left].mark && items[left].value != null) counter++;
      traverse(left, items);
      //self, leaf
      if ((!items[left] || items[left].value == null) && (!items[right] || items[right].value == null)) {
        if (cur != null && counter !== cur) {
          error = 'ERROR: Black counts differ!';
        } else {
          cur = counter;
        }
      }
      //right
      if (items[right] && !items[right].mark && items[right].value != null) counter++;
      traverse(right, items);
      //self, exit
      if (!items[i].mark) counter--;
    }
    if (error == null) {
      traverse(0, this.items);
    }

    this.correctnessConsole.setMessage(error || 'Tree is red-black correct');
    this.requestUpdate();
  }

  * iteratorFlip() {
    const parent = this.items[this.marker.position];
    const leftChild = this.items[2 * this.marker.position + 1];
    const rightChild = this.items[2 * this.marker.position + 2];
    if (!leftChild || !rightChild || leftChild.value == null || rightChild.value == null) {
      return 'Node has no children';
    } else if (parent.index === 0 && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
    } else if (parent.mark !== leftChild.mark && leftChild.mark === rightChild.mark) {
      leftChild.mark = !leftChild.mark;
      rightChild.mark = !rightChild.mark;
      parent.mark = !parent.mark;
    } else {
      return 'Can\'t flip this color arrangement';
    }
  }

  * iteratorRoL() {
    const top = this.marker.position;
    const left = 2 * top + 1;
    const right = 2 * top + 2;
    if (!this.items[right] || this.items[right].value == null) {
      return 'Can\'t rotate';
    }
    if (this.items[left] && this.items[left].value != null) {
      PageBinaryTree.moveSubtree(left, 2 * left + 1, this.items);
    }
    this.items[left].moveFrom(this.items[top]);
    this.items[top].moveFrom(this.items[right]);
    const rightGrandLeft = 2 * right + 1;
    if (this.items[rightGrandLeft] && this.items[rightGrandLeft].value != null) {
      PageBinaryTree.moveSubtree(rightGrandLeft, 2 * left + 2, this.items);
    }
    const rightGrandRight = 2 * right + 2;
    if (this.items[rightGrandRight] && this.items[rightGrandRight].value != null) {
      PageBinaryTree.moveSubtree(rightGrandRight, right, this.items);
    }
  }

  * iteratorRoR() {
    const top = this.marker.position;
    const left = 2 * top + 1;
    const right = 2 * top + 2;
    if (!this.items[left] || this.items[left].value == null) {
      return 'Can\'t rotate';
    }
    if (this.items[right] && this.items[right].value != null) {
      PageBinaryTree.moveSubtree(right, 2 * right + 2, this.items);
    }
    this.items[right].moveFrom(this.items[top]);
    this.items[top].moveFrom(this.items[left]);
    const leftGrandRight = 2 * left + 2;
    if (this.items[leftGrandRight] && this.items[leftGrandRight].value != null) {
      PageBinaryTree.moveSubtree(leftGrandRight, 2 * right + 1, this.items);
    }
    const leftGrandLeft = 2 * left + 1;
    if (this.items[leftGrandLeft] && this.items[leftGrandLeft].value != null) {
      PageBinaryTree.moveSubtree(leftGrandLeft, left, this.items);
    }
  }

  swichRB() {
    this.items[this.marker.position].mark = !this.items[this.marker.position].mark;
    this.checkRules();
  }
}

customElements.define('page-redblack-tree', PageRedBlackTree);

class PageHashTable extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.initMarkers();
    this.DELETED = 'Del';
  }

  render() {
    return html`
      <h4>Hash Table (linear/quad/double)</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
      </div>
      <x-console></x-console>
      <x-items-horizontal .items=${this.items} .markers=${this.markers}></x-items-horizontal>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderAdditionalControl() {
    return html`
      <label><input type="radio" name="algorithm" class="algorithm algorithm_linear" disabled checked>Linear</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_quad" disabled>Quad</label>
      <label><input type="radio" name="algorithm" class="algorithm algorithm_double" disabled>Double</label>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
    this.double = this.querySelector('.algorithm_double');
    this.quad = this.querySelector('.algorithm_quad');
    this.linear = this.querySelector('.algorithm_linear');
  }

  initItems() {
    const length = 59;
    const lengthFill = 30;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.length = lengthFill;
    this.items = arr;
    getUniqueRandomArray(lengthFill, 1000).forEach(value => {
      arr[this.probeIndex(value)].setValue(value);
    });
  }

  initMarkers() {
    this.markers = [new Marker({position: 0})];
  }

  hashFn(value) {
    return value % this.items.length;
  }

  doubleHashFn(value) {
    return 5 - value % 5;
  }

  probeIndex(value) {
    let index = this.hashFn(value);
    let step = 1;
    let counter = 0;
    while (this.items[index].value != null) {
      counter++;
      if (this.double && this.double.checked) step = this.doubleHashFn(value);
      if (this.quad && this.quad.checked) step = counter**2;
      index += step;
      if (index >= this.items.length) index -= this.items.length;
    }
    return index;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of array to create. Closest prime number will be selected';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 60 || length < 0) {
      return 'ERROR: use size between 0 and 60';
    }
    while (!isPrime(length)) {
      length--;
    }
    this.double.disabled = false;
    this.quad.disabled = false;
    this.linear.disabled = false;
    yield 'Please, select probe method';
    this.double.disabled = true;
    this.quad.disabled = true;
    this.linear.disabled = true;
    yield `Will create empty array with ${length} cells`;
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(new Item({index: i}));
    }
    this.items = arr;
    this.length = 0;
    return 'New array created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    getUniqueRandomArray(length, 1000).forEach(value => {
      this.items[this.probeIndex(value)].setValue(value);
    });
    this.length = length;
    return `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, array is full';
    }
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert item with key ${key}`;
    let index = this.hashFn(key);
    let step = 1;
    let counter = 0;
    this.markers[0].position = index;
    while (this.items[index].value != null && this.items[index].value !== this.DELETED) {
      yield `Cell ${index} occupied; going to next cell`;
      counter++;
      if (this.double.checked) step = this.doubleHashFn(key);
      if (this.quad.checked) step = counter**2;
      index += step;
      if (index >= this.items.length) index -= this.items.length;
      this.markers[0].position = index;
      yield `Searching for unoccupied cell; step was ${step}`;
    }
    this.items[index].setValue(key);
    yield `Inserted item with key ${key} at index ${index}`;
    this.length++;
    this.markers[0].position = 0;
    return `Insertion completed; total items ${this.length}`;
  }

  * iteratorProbe(key) {
    let index = this.hashFn(key);
    let foundAt;
    this.markers[0].position = index;
    yield `Looking for item with key ${key} at index ${index}`;
    if (this.items[index].value === key) {
      foundAt = index;
    } else if (this.items[index].value != null) {
      yield 'No match; will start probe';
      let step = 1;
      let counter = 0;
      while (foundAt == null) {
        if (++counter === this.items.length) break;
        if (this.double.checked) step = this.doubleHashFn(key);
        if (this.quad.checked) step = counter**2;
        index += step;
        if (index >= this.items.length) index -= this.items.length;
        if (this.items[index].value == null) break;
        this.markers[0].position = index;
        if (this.items[index].value === key) {
          foundAt = index;
        } else {
          yield `Checking next cell; step was ${step}`;
        }
      }
    }
    return foundAt;
  }

  * iteratorFind() {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    let foundAt = yield* this.iteratorProbe(key, false);
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
    }
    this.markers[0].position = 0;
  }

  * iteratorDel() {
    let key = 0;
    yield 'Enter key of item to delete';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Looking for item with key ${key}`;
    let foundAt = yield* this.iteratorProbe(key, true);
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      this.items[foundAt].value = this.DELETED;
      this.items[foundAt].color = null;
      this.length--;
      yield `Deleted item with key ${key}; total items ${this.length}`;
    }
    this.markers[0].position = 0;
  }
}

customElements.define('page-hash-table', PageHashTable);

class PageHashChain extends PageBase {
  constructor() {
    super();
    this.initItems(25);
    this.fillValues(this.items.length);
    this.initMarkers();
  }

  render() {
    return html`
      <h4>Hash Table Chain</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
      </div>
      <x-console></x-console>
      <ol start="0" style="height: 30em; overflow-y: scroll;">${this.renderLines()}</ol>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  renderLines() {
    return this.items.map((list, i) => html`
      <li><x-items-horizontal-linked .items=${list.items} .marker=${list.marker} narrow class="list-${i}"></x-items-horizontal-linked></li>
    `);
  }

  firstUpdated() {
    this.console = this.querySelector('x-console');
    this.dialog = this.querySelector('x-dialog');
  }

  initItems(length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push({items: [new Item({})], marker: {}});
    }
    this.items = arr;
    this.length = 0;
  }

  fillValues(length) {
    getUniqueRandomArray(length, 1000).forEach(value => {
      const list = this.items[this.hashFn(value)];
      if (list.items[0].value == null) {
        list.items[0].setValue(value);
      } else {
        list.items.push((new Item({})).setValue(value));
      }
    });
    this.length = length;
  }

  initMarkers() {
    this.items[0].marker = new Marker({position: 0});
  }

  clearInitialMarker() {
    this.items[0].marker = {};
  }

  hashFn(value) {
    return value % this.items.length;
  }

  * iteratorNew() {
    let length = 0;
    yield 'Enter size of table to create.';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 100 || length < 0) {
      return 'ERROR: use size between 0 and 100';
    }
    yield `Will create empty table with ${length} lists`;
    this.initItems(length);
    return 'New table created; total items = 0';
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of items to fill in';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > this.items.length || length < 0) {
      return `ERROR: can't fill more than ${this.items.length} items`;
    }
    yield `Will fill in ${length} items`;
    this.fillValues(length);
    return `Fill completed; total items = ${length}`;
  }

  * iteratorIns() {
    let key = 0;
    yield 'Enter key of item to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert item with key ${key}`;
    this.clearInitialMarker();
    let index = this.hashFn(key);
    const list = this.items[index];
    list.marker = new Marker({position: 0});
    this.querySelector(`.list-${index}`).scrollIntoViewIfNeeded();
    yield `Will insert in list ${index}`;
    if (list.items[0].value == null) {
      list.items[0].setValue(key);
    } else {
      list.items.push((new Item({})).setValue(key));
    }
    yield `Inserted item with key ${key} in list ${index}`;
    list.marker = {};
    this.initMarkers();
    this.length++;
    return `Insertion completed. Total items = ${this.length}`;
  }

  * iteratorFind(isInternal) {
    let key = 0;
    yield 'Enter key of item to find';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 1000 || key < 0) {
      return 'ERROR: use key between 0 and 999';
    }
    yield `Will try to find item with key ${key}`;
    this.clearInitialMarker();
    let index = this.hashFn(key);
    const list = this.items[index];
    list.marker = new Marker({position: 0});
    this.querySelector(`.list-${index}`).scrollIntoViewIfNeeded();
    yield `Item with key ${key} should be in list ${index}`;
    let i = 0;
    let foundAt;
    while (list.items[i] && list.items[i].value != null) {
      list.marker = new Marker({position: i});
      yield `Looking for item with key ${key} at link ${i}`;
      if (list.items[i].value === key) {
        foundAt = i;
        break;
      }
      i++;
    }
    if (foundAt == null) {
      yield `Can't locate item with key ${key}`;
    } else {
      yield `Have found item with key ${key}`;
    }
    list.marker = {};
    this.initMarkers();
    if (isInternal && foundAt != null) {
      return key;
    }
  }

  * iteratorDel() {
    let key = yield* this.iteratorFind(true);
    if (key != null) {
      this.clearInitialMarker();
      const list = this.items[this.hashFn(key)];
      const index = list.items.findIndex(item => item.value === key);
      if (index === 0) {
        list.marker.position = index;
        list.items[index].clear();
      } else {
        list.marker.position = index - 1;
        list.items.splice(index, 1);
      }
      this.length--;
      yield `Deleted item with key ${key}. Total items = ${this.length}`;
      list.marker = {};
      this.initMarkers();
    }
  }
}

customElements.define('page-hash-chain', PageHashChain);

class PageHeap extends PageBase {
  constructor() {
    super();
    this.initItems(10);
    this.initMarker();
  }

  render() {
    return html`
      <h4>Heap</h4>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorChng)}>Chng</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
      </div>
      <x-console class="main-console"></x-console>
      <x-items-tree .items=${this.items} .marker=${this.marker}></x-items-tree>
      <x-dialog>
        <label>Number: <input name="number" type="number"></label>
      </x-dialog>
    `;
  }

  /*
      arr[curLength].setValue(value);
      //trickle up
      let index = curLength;
      let parent = Math.floor((curLength - 1) / 2);
      while(index >= 0 && arr[parent] && arr[parent].value < value) {
        arr[parent].swapWith(arr[index]);
        index = parent;
        parent = Math.floor((parent - 1) / 2);
      }
  * */

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.dialog = this.querySelector('x-dialog');
    this.tree = this.querySelector('x-items-tree');
  }

  initItems(length) {
    const arr = (new Array(31)).fill().map((_, i) => new Item({index: i}));
    for (let curLength = 0; curLength <= length - 1; curLength++) {
      const value = Math.floor(Math.random() * 100);
      arr[curLength].setValue(value);
      //trickle up
      let index = curLength;
      let parent = Math.floor((curLength - 1) / 2);
      while(index >= 0 && arr[parent] && arr[parent].value < value) {
        arr[parent].swapWith(arr[index]);
        index = parent;
        parent = Math.floor((parent - 1) / 2);
      }
    }
    this.items = arr;
    this.length = length;
  }

  initMarker() {
    this.marker = new Marker({position: 0});
  }

  * iteratorFill() {
    let length = 0;
    yield 'Enter number of nodes (1 to 31)';
    this.dialog.open().then(formData => {
      length = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (length > 31 || length < 1) {
      return 'ERROR: use size between 1 and 31';
    }
    yield `Will create tree with ${length} nodes`;
    this.initItems(length);
  }

  * trickleUp(key, index) {
    this.items[index].setValue('', '#ffffff');
    yield 'Saved new node; will trickle up';
    let parent = Math.floor((index - 1) / 2);
    while(index >= 0 && this.items[parent] && this.items[parent].value < key) {
      this.items[parent].swapWith(this.items[index]);
      this.marker.position = parent;
      yield 'Moved empty node up';
      index = parent;
      parent = Math.floor((parent - 1) / 2);
    }
    yield 'Trickle up completed';
    this.items[index].setValue(key);
    this.marker.position = index;
  }

  * iteratorIns() {
    if (this.items.length === this.length) {
      return 'ERROR: can\'t insert, no room in display';
    }
    let key = 0;
    yield 'Enter key of node to insert';
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will insert node with key ${key}`;
    let index = this.length;
    this.items[index].setValue(key);
    this.marker.position = index;
    yield 'Placed node in first empty cell';
    yield* this.trickleUp(key, index);
    yield 'Inserted new node in empty node';
    this.marker.position = 0;
    this.length++;
  }

  * trickleDown(index, isChg) {
    const rootNode = new Item(this.items[index]);
    this.items[index].setValue('', '#ffffff');
    yield `Saved ${isChg ? 'changed' : 'root'} node (${rootNode.value})`;
    while(index < Math.floor(this.length / 2)) { //node has at least one child
      let largerChild;
      const leftChild = index * 2 + 1;
      const rightChild = leftChild + 1;
      if (rightChild < this.length && this.items[leftChild].value < this.items[rightChild].value) {
        largerChild = rightChild;
      } else {
        largerChild = leftChild;
      }
      yield `Key ${this.items[largerChild].value} is larger child`;
      if (this.items[largerChild].value < rootNode.value) {
        yield `${isChg ? 'Changed' : '"Last"'} node larger; will insert it`;
        break;
      }
      this.items[largerChild].swapWith(this.items[index]);
      index = largerChild;
      this.marker.position = index;
      yield 'Moved empty node down';
    }
    if (Math.floor(Math.log2(this.length)) === Math.floor(Math.log2(index + 1))) {
      yield 'Reached bottom row, so done';
    } else if (index >= Math.floor(this.length / 2)) {
      yield 'Node has no children, so done';
    }
    this.items[index] = rootNode;
    yield `Inserted ${isChg ? 'changed' : '"last"'} node`;
  }

  * iteratorRem() {
    let index = 0;
    const removedKey = this.items[index].value;
    yield `Will remove largest node (${removedKey})`;
    this.items[index].setValue('', '#ffffff');
    const lastNode = this.items[this.length - 1];
    yield `Will replace with "last" node (${lastNode.value})`;
    this.items[index].moveFrom(lastNode);
    this.length--;
    yield 'Will trickle down';
    yield* this.trickleDown(index);
    yield `Finished deleting largest node (${removedKey})`;
    this.marker.position = 0;
  }

  * iteratorChng() {
    this.tree.clickFn = item => this.marker.position = item.index;
    yield 'Click on node to be changed';
    this.tree.clickFn = null;
    const top = this.marker.position;
    const changingKey = this.items[top].value;
    yield 'Type node\'s new value';
    let key = 0;
    this.dialog.open().then(formData => {
      key = Number(formData.get('number'));
      this.iterate();
    }, () => this.iterate());
    yield 'Dialog opened'; //skip in promise
    if (key > 99 || key < 0) {
      return 'ERROR: can\'t insert. Need key between 0 and 999';
    }
    yield `Will change node from ${changingKey} to ${key}`;
    if (this.items[top].value > key) {
      this.items[top].setValue(key);
      yield 'Key decreased; will trickle down';
      yield* this.trickleDown(top, true);
    } else {
      this.items[top].setValue(key);
      yield 'Key increased; will trickle up';
      yield* this.trickleUp(key, top);
    }
    yield `Finished changing node (${changingKey})`;
    this.marker.position = 0;
  }
}

customElements.define('page-heap', PageHeap);

class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.tree = new Map();
    this.connections = new Map();
    this.renewConfirmed = false;
    this.clickFn = null;
  }
  render() {
    return html`
      <h4>Non-Directed Non-Weighted Graph</h4>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDFS)}>DFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorBFS)}>BFS</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTree)}>Tree</x-button>
        <x-button .callback=${this.toggleView.bind(this)}>View</x-button>
      </div>
      <x-console class="main-console" defaultMessage="Double-click mouse to make vertex. Drag to make an edge. Drag + Ctrl to move vertex."></x-console>
      <x-console class="console-stats" defaultMessage="—"></x-console>
      <x-items-graph
        .items=${this.items}
        .connections=${this.connections}
        .markedConnections=${this.tree}
        .tree=${this.tree}
        .clickFn=${this.clickFn}
        limit="18"
        @changed=${this.changedHandler}
      ></x-items-graph>
      <x-items-table
        .items=${this.items}
        .connections=${this.connections}
        hidden
      ></x-items-table>
    `;
  }

  firstUpdated() {
    this.console = this.querySelector('.main-console');
    this.statConsole = this.querySelector('.console-stats');
    this.table = this.querySelector('x-items-table');
    this.graph = this.querySelector('x-items-graph');
  }

  changedHandler() {
    this.table.requestUpdate();
  }

  toggleView() {
    this.table.toggleAttribute('hidden');
    this.graph.toggleAttribute('hidden');
  }

  newGraph() {
    if (this.renewConfirmed) {
      this.initItems();
      this.connections = new Map();
      this.console.setMessage();
      this.renewConfirmed = false;
    } else {
      this.console.setMessage('ARE YOU SURE? Press again to clear old graph');
      this.renewConfirmed = true;
    }
    this.requestUpdate();
  }

  handleClick() {
    super.handleClick(...arguments);
    this.renewConfirmed = false;
  }

  reset() {
    this.items.forEach(item => item.mark = false);
    this.statConsole.setMessage();
    this.markEdges = false;
  }

  * iteratorStartSearch() {
    let startItem;
    this.clickFn = item => {
      startItem = item;
      this.iterate();
    };
    yield 'Single-click on vertex from which to start';
    this.clickFn = null;
    if (startItem == null) {
      return 'ERROR: Item\'s not clicked.';
    }
    yield `You clicked on ${startItem.value}`;
    return startItem;
  }

  //Depth-first search
  * iteratorDFS(isTree) {
    const startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    const visits = [startItem];
    const stack = [startItem];
    startItem.mark = true;
    this.setStats(visits, stack);
    yield `Start search from vertex ${startItem.value}`;

    while (stack.length > 0) {
      const item = this.getAdjUnvisitedVertex(stack[stack.length - 1]);
      if (item == null) {
        stack.pop();
        this.setStats(visits, stack);
        if (stack.length > 0) {
          yield `Will check vertices adjacent to ${stack[stack.length - 1].value}`;
        } else {
          yield 'No more vertices with unvisited neighbors';
        }
      } else {
        if (stack.length > 0 && isTree === true) {
          this.tree.get(stack[stack.length - 1]).add(item);
        }
        stack.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, stack);
        yield `Visited vertex ${item.value}`;
      }
    }
    if (isTree !== true) {
      yield 'Press again to reset search';
      this.reset();
    }
  }

  getAdjUnvisitedVertex(item) {
    const connectedItems = this.connections.get(item);
    let found = null;
    if (connectedItems.size > 0) {
      found = this.items.find(item => {
        return connectedItems.has(item) && !item.mark;
      });
    }
    return found;
  }

  setStats(visits, stack, queue) {
    if (stack)
      this.statConsole.setMessage(`Visits: ${visits.map(i => i.value).join(' ')}. Stack: (b->t): ${stack.map(i => i.value).join(' ')}`);
    if (queue)
      this.statConsole.setMessage(`Visits: ${visits.map(i => i.value).join(' ')}. Queue: (f->r): ${queue.map(i => i.value).join(' ')}`);
  }

  //Breadth-first search
  * iteratorBFS() {
    const startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    const visits = [startItem];
    const queue = [startItem];
    startItem.mark = true;
    this.setStats(visits, null, queue);
    yield `Start search from vertex ${startItem.value}`;

    let currentItem = queue.shift();
    this.setStats(visits, null, queue);
    yield `Will check vertices adjacent to ${startItem.value}`;

    while (currentItem != null) {
      const item = this.getAdjUnvisitedVertex(currentItem);
      if (item == null) {
        yield `No more unvisited vertices adjacent to ${currentItem.value}`;
        currentItem = queue.shift();
        if (currentItem != null) {
          this.setStats(visits, null, queue);
          yield `Will check vertices adjacent to ${currentItem.value}`;
        }
      } else {
        queue.push(item);
        visits.push(item);
        item.mark = true;
        this.setStats(visits, null, queue);
        yield `Visited vertex ${item.value}`;
      }
    }
    yield 'Press again to reset search';
    this.reset();
  }

  * iteratorTree() {
    this.items.forEach(item => this.tree.set(item, new Set()));
    yield* this.iteratorDFS(true);
    yield 'Press again to hide unmarked edges';
    const connections = this.connections;
    this.connections = new Map();
    yield 'Minimum spanning tree; Press again to reset tree';
    this.connections = connections;
    this.tree = new Map();
    this.reset();
  }
}

customElements.define('page-graph-n', PageGraphN);

class XFooter extends LitElement {
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

//TODO: move code from app here and imports spread to all files, where using some component, should be exact import

})));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1odG1sL2xpYi9kaXJlY3RpdmUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvZG9tLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3BhcnQuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUtaW5zdGFuY2UuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUtcmVzdWx0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3BhcnRzLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL2RlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3RlbXBsYXRlLWZhY3RvcnkuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvcmVuZGVyLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGl0LWh0bWwuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvbW9kaWZ5LXRlbXBsYXRlLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3NoYWR5LXJlbmRlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1lbGVtZW50L2xpYi91cGRhdGluZy1lbGVtZW50LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWVsZW1lbnQvbGliL2RlY29yYXRvcnMuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtZWxlbWVudC9saWIvY3NzLXRhZy5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1lbGVtZW50L2xpdC1lbGVtZW50LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvdXRpbHMuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jbGFzc2VzL2l0ZW0uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zR3JhcGguanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zVGFibGUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jbGFzc2VzL21hcmtlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvaXRlbXNUcmVlLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29tcG9uZW50cy9pdGVtc1ZlcnRpY2FsLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29tcG9uZW50cy9pdGVtc0hvcml6b250YWwuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zSG9yaXpvbnRhbExpbmtlZC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL3JvdXRlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvcm91dGVyQS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvY29uc29sZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvZGlhbG9nLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29tcG9uZW50cy9idXR0b24uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL2FwcC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUJhc2UuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VBcnJheS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZU9yZGVyZWRBcnJheS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUJhc2VTb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlQnViYmxlU29ydC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVNlbGVjdFNvcnQuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VJbnNlcnRpb25Tb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlU3RhY2suanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VRdWV1ZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVByaW9yaXR5UXVldWUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VMaW5rTGlzdC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZU1lcmdlU29ydC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVNoZWxsU29ydC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVBhcnRpdGlvbi5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVF1aWNrU29ydDEuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VRdWlja1NvcnQyLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlQmluYXJ5VHJlZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVJlZEJsYWNrVHJlZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUhhc2hUYWJsZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUhhc2hDaGFpbi5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUhlYXAuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VHcmFwaE4uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL2Zvb3Rlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbmNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgV2Vha01hcCgpO1xuLyoqXG4gKiBCcmFuZHMgYSBmdW5jdGlvbiBhcyBhIGRpcmVjdGl2ZSBzbyB0aGF0IGxpdC1odG1sIHdpbGwgY2FsbCB0aGUgZnVuY3Rpb25cbiAqIGR1cmluZyB0ZW1wbGF0ZSByZW5kZXJpbmcsIHJhdGhlciB0aGFuIHBhc3NpbmcgYXMgYSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gZiBUaGUgZGlyZWN0aXZlIGZhY3RvcnkgZnVuY3Rpb24uIE11c3QgYmUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYVxuICogZnVuY3Rpb24gb2YgdGhlIHNpZ25hdHVyZSBgKHBhcnQ6IFBhcnQpID0+IHZvaWRgLiBUaGUgcmV0dXJuZWQgZnVuY3Rpb24gd2lsbFxuICogYmUgY2FsbGVkIHdpdGggdGhlIHBhcnQgb2JqZWN0XG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCB7ZGlyZWN0aXZlLCBodG1sfSBmcm9tICdsaXQtaHRtbCc7XG4gKlxuICogY29uc3QgaW1tdXRhYmxlID0gZGlyZWN0aXZlKCh2KSA9PiAocGFydCkgPT4ge1xuICogICBpZiAocGFydC52YWx1ZSAhPT0gdikge1xuICogICAgIHBhcnQuc2V0VmFsdWUodilcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9IChmKSA9PiAoKC4uLmFyZ3MpID0+IHtcbiAgICBjb25zdCBkID0gZiguLi5hcmdzKTtcbiAgICBkaXJlY3RpdmVzLnNldChkLCB0cnVlKTtcbiAgICByZXR1cm4gZDtcbn0pO1xuZXhwb3J0IGNvbnN0IGlzRGlyZWN0aXZlID0gKG8pID0+IHtcbiAgICByZXR1cm4gdHlwZW9mIG8gPT09ICdmdW5jdGlvbicgJiYgZGlyZWN0aXZlcy5oYXMobyk7XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGlyZWN0aXZlLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogVHJ1ZSBpZiB0aGUgY3VzdG9tIGVsZW1lbnRzIHBvbHlmaWxsIGlzIGluIHVzZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzQ0VQb2x5ZmlsbCA9IHdpbmRvdy5jdXN0b21FbGVtZW50cyAhPT0gdW5kZWZpbmVkICYmXG4gICAgd2luZG93LmN1c3RvbUVsZW1lbnRzLnBvbHlmaWxsV3JhcEZsdXNoQ2FsbGJhY2sgIT09XG4gICAgICAgIHVuZGVmaW5lZDtcbi8qKlxuICogUmVwYXJlbnRzIG5vZGVzLCBzdGFydGluZyBmcm9tIGBzdGFydE5vZGVgIChpbmNsdXNpdmUpIHRvIGBlbmROb2RlYFxuICogKGV4Y2x1c2l2ZSksIGludG8gYW5vdGhlciBjb250YWluZXIgKGNvdWxkIGJlIHRoZSBzYW1lIGNvbnRhaW5lciksIGJlZm9yZVxuICogYGJlZm9yZU5vZGVgLiBJZiBgYmVmb3JlTm9kZWAgaXMgbnVsbCwgaXQgYXBwZW5kcyB0aGUgbm9kZXMgdG8gdGhlXG4gKiBjb250YWluZXIuXG4gKi9cbmV4cG9ydCBjb25zdCByZXBhcmVudE5vZGVzID0gKGNvbnRhaW5lciwgc3RhcnQsIGVuZCA9IG51bGwsIGJlZm9yZSA9IG51bGwpID0+IHtcbiAgICBsZXQgbm9kZSA9IHN0YXJ0O1xuICAgIHdoaWxlIChub2RlICE9PSBlbmQpIHtcbiAgICAgICAgY29uc3QgbiA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUobm9kZSwgYmVmb3JlKTtcbiAgICAgICAgbm9kZSA9IG47XG4gICAgfVxufTtcbi8qKlxuICogUmVtb3ZlcyBub2Rlcywgc3RhcnRpbmcgZnJvbSBgc3RhcnROb2RlYCAoaW5jbHVzaXZlKSB0byBgZW5kTm9kZWBcbiAqIChleGNsdXNpdmUpLCBmcm9tIGBjb250YWluZXJgLlxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlTm9kZXMgPSAoY29udGFpbmVyLCBzdGFydE5vZGUsIGVuZE5vZGUgPSBudWxsKSA9PiB7XG4gICAgbGV0IG5vZGUgPSBzdGFydE5vZGU7XG4gICAgd2hpbGUgKG5vZGUgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbiA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgbm9kZSA9IG47XG4gICAgfVxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRvbS5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIHRoYXQgYSB2YWx1ZSB3YXMgaGFuZGxlZCBieSBhIGRpcmVjdGl2ZSBhbmRcbiAqIHNob3VsZCBub3QgYmUgd3JpdHRlbiB0byB0aGUgRE9NLlxuICovXG5leHBvcnQgY29uc3Qgbm9DaGFuZ2UgPSB7fTtcbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgYSBOb2RlUGFydCB0byBmdWxseSBjbGVhciBpdHMgY29udGVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGhpbmcgPSB7fTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXBhcnQuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBBbiBleHByZXNzaW9uIG1hcmtlciB3aXRoIGVtYmVkZGVkIHVuaXF1ZSBrZXkgdG8gYXZvaWQgY29sbGlzaW9uIHdpdGhcbiAqIHBvc3NpYmxlIHRleHQgaW4gdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY29uc3QgbWFya2VyID0gYHt7bGl0LSR7U3RyaW5nKE1hdGgucmFuZG9tKCkpLnNsaWNlKDIpfX19YDtcbi8qKlxuICogQW4gZXhwcmVzc2lvbiBtYXJrZXIgdXNlZCB0ZXh0LXBvc2l0aW9ucywgbXVsdGktYmluZGluZyBhdHRyaWJ1dGVzLCBhbmRcbiAqIGF0dHJpYnV0ZXMgd2l0aCBtYXJrdXAtbGlrZSB0ZXh0IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vZGVNYXJrZXIgPSBgPCEtLSR7bWFya2VyfS0tPmA7XG5leHBvcnQgY29uc3QgbWFya2VyUmVnZXggPSBuZXcgUmVnRXhwKGAke21hcmtlcn18JHtub2RlTWFya2VyfWApO1xuLyoqXG4gKiBTdWZmaXggYXBwZW5kZWQgdG8gYWxsIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGJvdW5kQXR0cmlidXRlU3VmZml4ID0gJyRsaXQkJztcbi8qKlxuICogQW4gdXBkYXRlYWJsZSBUZW1wbGF0ZSB0aGF0IHRyYWNrcyB0aGUgbG9jYXRpb24gb2YgZHluYW1pYyBwYXJ0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlIHtcbiAgICBjb25zdHJ1Y3RvcihyZXN1bHQsIGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5wYXJ0cyA9IFtdO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICBsZXQgaW5kZXggPSAtMTtcbiAgICAgICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgICAgIGNvbnN0IG5vZGVzVG9SZW1vdmUgPSBbXTtcbiAgICAgICAgY29uc3QgX3ByZXBhcmVUZW1wbGF0ZSA9ICh0ZW1wbGF0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgICAgICAgICAvLyBFZGdlIG5lZWRzIGFsbCA0IHBhcmFtZXRlcnMgcHJlc2VudDsgSUUxMSBuZWVkcyAzcmQgcGFyYW1ldGVyIHRvIGJlXG4gICAgICAgICAgICAvLyBudWxsXG4gICAgICAgICAgICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGNvbnRlbnQsIDEzMyAvKiBOb2RlRmlsdGVyLlNIT1dfe0VMRU1FTlR8Q09NTUVOVHxURVhUfSAqLywgbnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGxhc3QgaW5kZXggYXNzb2NpYXRlZCB3aXRoIGEgcGFydC4gV2UgdHJ5IHRvIGRlbGV0ZVxuICAgICAgICAgICAgLy8gdW5uZWNlc3Nhcnkgbm9kZXMsIGJ1dCB3ZSBuZXZlciB3YW50IHRvIGFzc29jaWF0ZSB0d28gZGlmZmVyZW50IHBhcnRzXG4gICAgICAgICAgICAvLyB0byB0aGUgc2FtZSBpbmRleC4gVGhleSBtdXN0IGhhdmUgYSBjb25zdGFudCBub2RlIGJldHdlZW4uXG4gICAgICAgICAgICBsZXQgbGFzdFBhcnRJbmRleCA9IDA7XG4gICAgICAgICAgICB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIuY3VycmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEgLyogTm9kZS5FTEVNRU5UX05PREUgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzID0gbm9kZS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvTmFtZWROb2RlTWFwLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXR0cmlidXRlcyBhcmUgbm90IGd1YXJhbnRlZWQgdG8gYmUgcmV0dXJuZWQgaW4gZG9jdW1lbnQgb3JkZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBwYXJ0aWN1bGFyLCBFZGdlL0lFIGNhbiByZXR1cm4gdGhlbSBvdXQgb2Ygb3JkZXIsIHNvIHdlIGNhbm5vdFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNzdW1lIGEgY29ycmVzcG9uZGFuY2UgYmV0d2VlbiBwYXJ0IGluZGV4IGFuZCBhdHRyaWJ1dGUgaW5kZXguXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXNbaV0udmFsdWUuaW5kZXhPZihtYXJrZXIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY291bnQtLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHRlbXBsYXRlIGxpdGVyYWwgc2VjdGlvbiBsZWFkaW5nIHVwIHRvIHRoZSBmaXJzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4cHJlc3Npb24gaW4gdGhpcyBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJpbmdGb3JQYXJ0ID0gcmVzdWx0LnN0cmluZ3NbcGFydEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBhdHRyaWJ1dGUgbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBsYXN0QXR0cmlidXRlTmFtZVJlZ2V4LmV4ZWMoc3RyaW5nRm9yUGFydClbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbGwgYm91bmQgYXR0cmlidXRlcyBoYXZlIGhhZCBhIHN1ZmZpeCBhZGRlZCBpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRlbXBsYXRlUmVzdWx0I2dldEhUTUwgdG8gb3B0IG91dCBvZiBzcGVjaWFsIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsaW5nLiBUbyBsb29rIHVwIHRoZSBhdHRyaWJ1dGUgdmFsdWUgd2UgYWxzbyBuZWVkIHRvIGFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzdWZmaXguXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlTG9va3VwTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKSArIGJvdW5kQXR0cmlidXRlU3VmZml4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVZhbHVlID0gbm9kZS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlTG9va3VwTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5ncyA9IGF0dHJpYnV0ZVZhbHVlLnNwbGl0KG1hcmtlclJlZ2V4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcnRzLnB1c2goeyB0eXBlOiAnYXR0cmlidXRlJywgaW5kZXgsIG5hbWUsIHN0cmluZ3MgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlTG9va3VwTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydEluZGV4ICs9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfcHJlcGFyZVRlbXBsYXRlKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMgLyogTm9kZS5URVhUX05PREUgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG5vZGUuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaW5kZXhPZihtYXJrZXIpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0cmluZ3MgPSBkYXRhLnNwbGl0KG1hcmtlclJlZ2V4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhc3RJbmRleCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXNlIG5vZGVzIGFyZSBhbHNvIHVzZWQgYXMgdGhlIG1hcmtlcnMgZm9yIG5vZGUgcGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKChzdHJpbmdzW2ldID09PSAnJykgPyBjcmVhdGVNYXJrZXIoKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZ3NbaV0pLCBub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcnRzLnB1c2goeyB0eXBlOiAnbm9kZScsIGluZGV4OiArK2luZGV4IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUncyBubyB0ZXh0LCB3ZSBtdXN0IGluc2VydCBhIGNvbW1lbnQgdG8gbWFyayBvdXIgcGxhY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbHNlLCB3ZSBjYW4gdHJ1c3QgaXQgd2lsbCBzdGljayBhcm91bmQgYWZ0ZXIgY2xvbmluZy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdHJpbmdzW2xhc3RJbmRleF0gPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNUb1JlbW92ZS5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5kYXRhID0gc3RyaW5nc1tsYXN0SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHBhcnQgZm9yIGVhY2ggbWF0Y2ggZm91bmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRJbmRleCArPSBsYXN0SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCAvKiBOb2RlLkNPTU1FTlRfTk9ERSAqLykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5kYXRhID09PSBtYXJrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBhIG5ldyBtYXJrZXIgbm9kZSB0byBiZSB0aGUgc3RhcnROb2RlIG9mIHRoZSBQYXJ0IGlmIGFueSBvZlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBhcmUgdHJ1ZTpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAqIFdlIGRvbid0IGhhdmUgYSBwcmV2aW91c1NpYmxpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAqIFRoZSBwcmV2aW91c1NpYmxpbmcgaXMgYWxyZWFkeSB0aGUgc3RhcnQgb2YgYSBwcmV2aW91cyBwYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5wcmV2aW91c1NpYmxpbmcgPT09IG51bGwgfHwgaW5kZXggPT09IGxhc3RQYXJ0SW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFBhcnRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHsgdHlwZTogJ25vZGUnLCBpbmRleCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgYSBuZXh0U2libGluZywga2VlcCB0aGlzIG5vZGUgc28gd2UgaGF2ZSBhbiBlbmQuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbHNlLCB3ZSBjYW4gcmVtb3ZlIGl0IHRvIHNhdmUgZnV0dXJlIGNvc3RzLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubmV4dFNpYmxpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmRhdGEgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVzVG9SZW1vdmUucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChpID0gbm9kZS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGJpbmRpbmcgd29uJ3Qgd29yaywgYnV0IHN1YnNlcXVlbnQgYmluZGluZ3Mgd2lsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBjb25zaWRlciB3aGV0aGVyIGl0J3MgZXZlbiB3b3J0aCBpdCB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2UgYmluZGluZ3MgaW4gY29tbWVudHMgd29ya1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFydHMucHVzaCh7IHR5cGU6ICdub2RlJywgaW5kZXg6IC0xIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBfcHJlcGFyZVRlbXBsYXRlKGVsZW1lbnQpO1xuICAgICAgICAvLyBSZW1vdmUgdGV4dCBiaW5kaW5nIG5vZGVzIGFmdGVyIHRoZSB3YWxrIHRvIG5vdCBkaXN0dXJiIHRoZSBUcmVlV2Fsa2VyXG4gICAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlc1RvUmVtb3ZlKSB7XG4gICAgICAgICAgICBuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobik7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnQgY29uc3QgaXNUZW1wbGF0ZVBhcnRBY3RpdmUgPSAocGFydCkgPT4gcGFydC5pbmRleCAhPT0gLTE7XG4vLyBBbGxvd3MgYGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpYCB0byBiZSByZW5hbWVkIGZvciBhXG4vLyBzbWFsbCBtYW51YWwgc2l6ZS1zYXZpbmdzLlxuZXhwb3J0IGNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuLyoqXG4gKiBUaGlzIHJlZ2V4IGV4dHJhY3RzIHRoZSBhdHRyaWJ1dGUgbmFtZSBwcmVjZWRpbmcgYW4gYXR0cmlidXRlLXBvc2l0aW9uXG4gKiBleHByZXNzaW9uLiBJdCBkb2VzIHRoaXMgYnkgbWF0Y2hpbmcgdGhlIHN5bnRheCBhbGxvd2VkIGZvciBhdHRyaWJ1dGVzXG4gKiBhZ2FpbnN0IHRoZSBzdHJpbmcgbGl0ZXJhbCBkaXJlY3RseSBwcmVjZWRpbmcgdGhlIGV4cHJlc3Npb24sIGFzc3VtaW5nIHRoYXRcbiAqIHRoZSBleHByZXNzaW9uIGlzIGluIGFuIGF0dHJpYnV0ZS12YWx1ZSBwb3NpdGlvbi5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2F0dHJpYnV0ZXMtMFxuICpcbiAqIFwiXFwwLVxceDFGXFx4N0YtXFx4OUZcIiBhcmUgVW5pY29kZSBjb250cm9sIGNoYXJhY3RlcnNcbiAqXG4gKiBcIiBcXHgwOVxceDBhXFx4MGNcXHgwZFwiIGFyZSBIVE1MIHNwYWNlIGNoYXJhY3RlcnM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvaW5mcmFzdHJ1Y3R1cmUuaHRtbCNzcGFjZS1jaGFyYWN0ZXJcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSBjb250cm9sIGNoYXJhY3Rlciwgc3BhY2UgY2hhcmFjdGVyLCAoJyksXG4gKiAgICAoXCIpLCBcIj5cIiwgXCI9XCIsIG9yIFwiL1wiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnkgXCI9XCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieTpcbiAqICAgICogQW55IGNoYXJhY3RlciBleGNlcHQgc3BhY2UsICgnKSwgKFwiKSwgXCI8XCIsIFwiPlwiLCBcIj1cIiwgKGApLCBvclxuICogICAgKiAoXCIpIHRoZW4gYW55IG5vbi0oXCIpLCBvclxuICogICAgKiAoJykgdGhlbiBhbnkgbm9uLSgnKVxuICovXG5leHBvcnQgY29uc3QgbGFzdEF0dHJpYnV0ZU5hbWVSZWdleCA9IC8oWyBcXHgwOVxceDBhXFx4MGNcXHgwZF0pKFteXFwwLVxceDFGXFx4N0YtXFx4OUYgXFx4MDlcXHgwYVxceDBjXFx4MGRcIic+PS9dKykoWyBcXHgwOVxceDBhXFx4MGNcXHgwZF0qPVsgXFx4MDlcXHgwYVxceDBjXFx4MGRdKig/OlteIFxceDA5XFx4MGFcXHgwY1xceDBkXCInYDw+PV0qfFwiW15cIl0qfCdbXiddKikpJC87XG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZW1wbGF0ZS5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuaW1wb3J0IHsgaXNDRVBvbHlmaWxsIH0gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHsgaXNUZW1wbGF0ZVBhcnRBY3RpdmUgfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcbi8qKlxuICogQW4gaW5zdGFuY2Ugb2YgYSBgVGVtcGxhdGVgIHRoYXQgY2FuIGJlIGF0dGFjaGVkIHRvIHRoZSBET00gYW5kIHVwZGF0ZWRcbiAqIHdpdGggbmV3IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlSW5zdGFuY2Uge1xuICAgIGNvbnN0cnVjdG9yKHRlbXBsYXRlLCBwcm9jZXNzb3IsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fcGFydHMgPSBbXTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgICAgICB0aGlzLnByb2Nlc3NvciA9IHByb2Nlc3NvcjtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9XG4gICAgdXBkYXRlKHZhbHVlcykge1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLl9wYXJ0cykge1xuICAgICAgICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnQuc2V0VmFsdWUodmFsdWVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fcGFydHMpIHtcbiAgICAgICAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJ0LmNvbW1pdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9jbG9uZSgpIHtcbiAgICAgICAgLy8gV2hlbiB1c2luZyB0aGUgQ3VzdG9tIEVsZW1lbnRzIHBvbHlmaWxsLCBjbG9uZSB0aGUgbm9kZSwgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gaW1wb3J0aW5nIGl0LCB0byBrZWVwIHRoZSBmcmFnbWVudCBpbiB0aGUgdGVtcGxhdGUncyBkb2N1bWVudC4gVGhpc1xuICAgICAgICAvLyBsZWF2ZXMgdGhlIGZyYWdtZW50IGluZXJ0IHNvIGN1c3RvbSBlbGVtZW50cyB3b24ndCB1cGdyYWRlIGFuZFxuICAgICAgICAvLyBwb3RlbnRpYWxseSBtb2RpZnkgdGhlaXIgY29udGVudHMgYnkgY3JlYXRpbmcgYSBwb2x5ZmlsbGVkIFNoYWRvd1Jvb3RcbiAgICAgICAgLy8gd2hpbGUgd2UgdHJhdmVyc2UgdGhlIHRyZWUuXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gaXNDRVBvbHlmaWxsID9cbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGUuZWxlbWVudC5jb250ZW50LmNsb25lTm9kZSh0cnVlKSA6XG4gICAgICAgICAgICBkb2N1bWVudC5pbXBvcnROb2RlKHRoaXMudGVtcGxhdGUuZWxlbWVudC5jb250ZW50LCB0cnVlKTtcbiAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLnRlbXBsYXRlLnBhcnRzO1xuICAgICAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICAgICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgICAgIGNvbnN0IF9wcmVwYXJlSW5zdGFuY2UgPSAoZnJhZ21lbnQpID0+IHtcbiAgICAgICAgICAgIC8vIEVkZ2UgbmVlZHMgYWxsIDQgcGFyYW1ldGVycyBwcmVzZW50OyBJRTExIG5lZWRzIDNyZCBwYXJhbWV0ZXIgdG8gYmVcbiAgICAgICAgICAgIC8vIG51bGxcbiAgICAgICAgICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoZnJhZ21lbnQsIDEzMyAvKiBOb2RlRmlsdGVyLlNIT1dfe0VMRU1FTlR8Q09NTUVOVHxURVhUfSAqLywgbnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgdGhlIG5vZGVzIGFuZCBwYXJ0cyBvZiBhIHRlbXBsYXRlXG4gICAgICAgICAgICB3aGlsZSAocGFydEluZGV4IDwgcGFydHMubGVuZ3RoICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJ0ID0gcGFydHNbcGFydEluZGV4XTtcbiAgICAgICAgICAgICAgICAvLyBDb25zZWN1dGl2ZSBQYXJ0cyBtYXkgaGF2ZSB0aGUgc2FtZSBub2RlIGluZGV4LCBpbiB0aGUgY2FzZSBvZlxuICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlIGJvdW5kIGF0dHJpYnV0ZXMgb24gYW4gZWxlbWVudC4gU28gZWFjaCBpdGVyYXRpb24gd2UgZWl0aGVyXG4gICAgICAgICAgICAgICAgLy8gaW5jcmVtZW50IHRoZSBub2RlSW5kZXgsIGlmIHdlIGFyZW4ndCBvbiBhIG5vZGUgd2l0aCBhIHBhcnQsIG9yIHRoZVxuICAgICAgICAgICAgICAgIC8vIHBhcnRJbmRleCBpZiB3ZSBhcmUuIEJ5IG5vdCBpbmNyZW1lbnRpbmcgdGhlIG5vZGVJbmRleCB3aGVuIHdlIGZpbmQgYVxuICAgICAgICAgICAgICAgIC8vIHBhcnQsIHdlIGFsbG93IGZvciB0aGUgbmV4dCBwYXJ0IHRvIGJlIGFzc29jaWF0ZWQgd2l0aCB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgIC8vIG5vZGUgaWYgbmVjY2Vzc2FzcnkuXG4gICAgICAgICAgICAgICAgaWYgKCFpc1RlbXBsYXRlUGFydEFjdGl2ZShwYXJ0KSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXJ0cy5wdXNoKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnRJbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChub2RlSW5kZXggPT09IHBhcnQuaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnQudHlwZSA9PT0gJ25vZGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wcm9jZXNzb3IuaGFuZGxlVGV4dEV4cHJlc3Npb24odGhpcy5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnQuaW5zZXJ0QWZ0ZXJOb2RlKG5vZGUucHJldmlvdXNTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcnRzLnB1c2gocGFydCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXJ0cy5wdXNoKC4uLnRoaXMucHJvY2Vzc29yLmhhbmRsZUF0dHJpYnV0ZUV4cHJlc3Npb25zKG5vZGUsIHBhcnQubmFtZSwgcGFydC5zdHJpbmdzLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwYXJ0SW5kZXgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3ByZXBhcmVJbnN0YW5jZShub2RlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIF9wcmVwYXJlSW5zdGFuY2UoZnJhZ21lbnQpO1xuICAgICAgICBpZiAoaXNDRVBvbHlmaWxsKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5hZG9wdE5vZGUoZnJhZ21lbnQpO1xuICAgICAgICAgICAgY3VzdG9tRWxlbWVudHMudXBncmFkZShmcmFnbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRlbXBsYXRlLWluc3RhbmNlLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5pbXBvcnQgeyByZXBhcmVudE5vZGVzIH0gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHsgYm91bmRBdHRyaWJ1dGVTdWZmaXgsIGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXgsIG1hcmtlciwgbm9kZU1hcmtlciB9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuLyoqXG4gKiBUaGUgcmV0dXJuIHR5cGUgb2YgYGh0bWxgLCB3aGljaCBob2xkcyBhIFRlbXBsYXRlIGFuZCB0aGUgdmFsdWVzIGZyb21cbiAqIGludGVycG9sYXRlZCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3RvcihzdHJpbmdzLCB2YWx1ZXMsIHR5cGUsIHByb2Nlc3Nvcikge1xuICAgICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wcm9jZXNzb3IgPSBwcm9jZXNzb3I7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzdHJpbmcgb2YgSFRNTCB1c2VkIHRvIGNyZWF0ZSBhIGA8dGVtcGxhdGU+YCBlbGVtZW50LlxuICAgICAqL1xuICAgIGdldEhUTUwoKSB7XG4gICAgICAgIGNvbnN0IGVuZEluZGV4ID0gdGhpcy5zdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcyA9IHRoaXMuc3RyaW5nc1tpXTtcbiAgICAgICAgICAgIC8vIFRoaXMgZXhlYygpIGNhbGwgZG9lcyB0d28gdGhpbmdzOlxuICAgICAgICAgICAgLy8gMSkgQXBwZW5kcyBhIHN1ZmZpeCB0byB0aGUgYm91bmQgYXR0cmlidXRlIG5hbWUgdG8gb3B0IG91dCBvZiBzcGVjaWFsXG4gICAgICAgICAgICAvLyBhdHRyaWJ1dGUgdmFsdWUgcGFyc2luZyB0aGF0IElFMTEgYW5kIEVkZ2UgZG8sIGxpa2UgZm9yIHN0eWxlIGFuZFxuICAgICAgICAgICAgLy8gbWFueSBTVkcgYXR0cmlidXRlcy4gVGhlIFRlbXBsYXRlIGNsYXNzIGFsc28gYXBwZW5kcyB0aGUgc2FtZSBzdWZmaXhcbiAgICAgICAgICAgIC8vIHdoZW4gbG9va2luZyB1cCBhdHRyaWJ1dGVzIHRvIGNyZWF0ZSBQYXJ0cy5cbiAgICAgICAgICAgIC8vIDIpIEFkZHMgYW4gdW5xdW90ZWQtYXR0cmlidXRlLXNhZmUgbWFya2VyIGZvciB0aGUgZmlyc3QgZXhwcmVzc2lvbiBpblxuICAgICAgICAgICAgLy8gYW4gYXR0cmlidXRlLiBTdWJzZXF1ZW50IGF0dHJpYnV0ZSBleHByZXNzaW9ucyB3aWxsIHVzZSBub2RlIG1hcmtlcnMsXG4gICAgICAgICAgICAvLyBhbmQgdGhpcyBpcyBzYWZlIHNpbmNlIGF0dHJpYnV0ZXMgd2l0aCBtdWx0aXBsZSBleHByZXNzaW9ucyBhcmVcbiAgICAgICAgICAgIC8vIGd1YXJhbnRlZWQgdG8gYmUgcXVvdGVkLlxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBsYXN0QXR0cmlidXRlTmFtZVJlZ2V4LmV4ZWMocyk7XG4gICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSdyZSBzdGFydGluZyBhIG5ldyBib3VuZCBhdHRyaWJ1dGUuXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBzYWZlIGF0dHJpYnV0ZSBzdWZmaXgsIGFuZCB1c2UgdW5xdW90ZWQtYXR0cmlidXRlLXNhZmVcbiAgICAgICAgICAgICAgICAvLyBtYXJrZXIuXG4gICAgICAgICAgICAgICAgaHRtbCArPSBzLnN1YnN0cigwLCBtYXRjaC5pbmRleCkgKyBtYXRjaFsxXSArIG1hdGNoWzJdICtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRBdHRyaWJ1dGVTdWZmaXggKyBtYXRjaFszXSArIG1hcmtlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFdlJ3JlIGVpdGhlciBpbiBhIGJvdW5kIG5vZGUsIG9yIHRyYWlsaW5nIGJvdW5kIGF0dHJpYnV0ZS5cbiAgICAgICAgICAgICAgICAvLyBFaXRoZXIgd2F5LCBub2RlTWFya2VyIGlzIHNhZmUgdG8gdXNlLlxuICAgICAgICAgICAgICAgIGh0bWwgKz0gcyArIG5vZGVNYXJrZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0bWwgKyB0aGlzLnN0cmluZ3NbZW5kSW5kZXhdO1xuICAgIH1cbiAgICBnZXRUZW1wbGF0ZUVsZW1lbnQoKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gdGhpcy5nZXRIVE1MKCk7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9XG59XG4vKipcbiAqIEEgVGVtcGxhdGVSZXN1bHQgZm9yIFNWRyBmcmFnbWVudHMuXG4gKlxuICogVGhpcyBjbGFzcyB3cmFwcyBIVE1sIGluIGFuIGA8c3ZnPmAgdGFnIGluIG9yZGVyIHRvIHBhcnNlIGl0cyBjb250ZW50cyBpbiB0aGVcbiAqIFNWRyBuYW1lc3BhY2UsIHRoZW4gbW9kaWZpZXMgdGhlIHRlbXBsYXRlIHRvIHJlbW92ZSB0aGUgYDxzdmc+YCB0YWcgc28gdGhhdFxuICogY2xvbmVzIG9ubHkgY29udGFpbmVyIHRoZSBvcmlnaW5hbCBmcmFnbWVudC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNWR1RlbXBsYXRlUmVzdWx0IGV4dGVuZHMgVGVtcGxhdGVSZXN1bHQge1xuICAgIGdldEhUTUwoKSB7XG4gICAgICAgIHJldHVybiBgPHN2Zz4ke3N1cGVyLmdldEhUTUwoKX08L3N2Zz5gO1xuICAgIH1cbiAgICBnZXRUZW1wbGF0ZUVsZW1lbnQoKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gc3VwZXIuZ2V0VGVtcGxhdGVFbGVtZW50KCk7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0ZW1wbGF0ZS5jb250ZW50O1xuICAgICAgICBjb25zdCBzdmdFbGVtZW50ID0gY29udGVudC5maXJzdENoaWxkO1xuICAgICAgICBjb250ZW50LnJlbW92ZUNoaWxkKHN2Z0VsZW1lbnQpO1xuICAgICAgICByZXBhcmVudE5vZGVzKGNvbnRlbnQsIHN2Z0VsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZW1wbGF0ZS1yZXN1bHQuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cbmltcG9ydCB7IGlzRGlyZWN0aXZlIH0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHsgcmVtb3ZlTm9kZXMgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyBub0NoYW5nZSwgbm90aGluZyB9IGZyb20gJy4vcGFydC5qcyc7XG5pbXBvcnQgeyBUZW1wbGF0ZUluc3RhbmNlIH0gZnJvbSAnLi90ZW1wbGF0ZS1pbnN0YW5jZS5qcyc7XG5pbXBvcnQgeyBUZW1wbGF0ZVJlc3VsdCB9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcbmltcG9ydCB7IGNyZWF0ZU1hcmtlciB9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuZXhwb3J0IGNvbnN0IGlzUHJpbWl0aXZlID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuICh2YWx1ZSA9PT0gbnVsbCB8fFxuICAgICAgICAhKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSk7XG59O1xuLyoqXG4gKiBTZXRzIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIEF0dHJpYnV0ZVBhcnRzLCBzbyB0aGF0IHRoZSB2YWx1ZSBpcyBvbmx5IHNldCBvbmNlXG4gKiBldmVuIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBwYXJ0cyBmb3IgYW4gYXR0cmlidXRlLlxuICovXG5leHBvcnQgY2xhc3MgQXR0cmlidXRlQ29tbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzKSB7XG4gICAgICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgICAgICB0aGlzLnBhcnRzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucGFydHNbaV0gPSB0aGlzLl9jcmVhdGVQYXJ0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHNpbmdsZSBwYXJ0LiBPdmVycmlkZSB0aGlzIHRvIGNyZWF0ZSBhIGRpZmZlcm50IHR5cGUgb2YgcGFydC5cbiAgICAgKi9cbiAgICBfY3JlYXRlUGFydCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVQYXJ0KHRoaXMpO1xuICAgIH1cbiAgICBfZ2V0VmFsdWUoKSB7XG4gICAgICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLnN0cmluZ3M7XG4gICAgICAgIGNvbnN0IGwgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgIGxldCB0ZXh0ID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB0ZXh0ICs9IHN0cmluZ3NbaV07XG4gICAgICAgICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wYXJ0c1tpXTtcbiAgICAgICAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2ID0gcGFydC52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodiAhPSBudWxsICYmXG4gICAgICAgICAgICAgICAgICAgIChBcnJheS5pc0FycmF5KHYpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdiAhPT0gJ3N0cmluZycgJiYgdltTeW1ib2wuaXRlcmF0b3JdKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2Ygdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCArPSB0eXBlb2YgdCA9PT0gJ3N0cmluZycgPyB0IDogU3RyaW5nKHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IHR5cGVvZiB2ID09PSAnc3RyaW5nJyA/IHYgOiBTdHJpbmcodik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRleHQgKz0gc3RyaW5nc1tsXTtcbiAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuICAgIGNvbW1pdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgICAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB0aGlzLl9nZXRWYWx1ZSgpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgICBjb25zdHJ1Y3Rvcihjb21pdHRlcikge1xuICAgICAgICB0aGlzLnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmNvbW1pdHRlciA9IGNvbWl0dGVyO1xuICAgIH1cbiAgICBzZXRWYWx1ZSh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IG5vQ2hhbmdlICYmICghaXNQcmltaXRpdmUodmFsdWUpIHx8IHZhbHVlICE9PSB0aGlzLnZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIGEgbm90IGEgZGlyZWN0aXZlLCBkaXJ0eSB0aGUgY29tbWl0dGVyIHNvIHRoYXQgaXQnbGxcbiAgICAgICAgICAgIC8vIGNhbGwgc2V0QXR0cmlidXRlLiBJZiB0aGUgdmFsdWUgaXMgYSBkaXJlY3RpdmUsIGl0J2xsIGRpcnR5IHRoZVxuICAgICAgICAgICAgLy8gY29tbWl0dGVyIGlmIGl0IGNhbGxzIHNldFZhbHVlKCkuXG4gICAgICAgICAgICBpZiAoIWlzRGlyZWN0aXZlKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tbWl0dGVyLmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBjb21taXQoKSB7XG4gICAgICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLnZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBub0NoYW5nZTtcbiAgICAgICAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbW1pdHRlci5jb21taXQoKTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgTm9kZVBhcnQge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIHRoaXMgcGFydCBpbnRvIGEgY29udGFpbmVyLlxuICAgICAqXG4gICAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAgICovXG4gICAgYXBwZW5kSW50byhjb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5zdGFydE5vZGUgPSBjb250YWluZXIuYXBwZW5kQ2hpbGQoY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICB0aGlzLmVuZE5vZGUgPSBjb250YWluZXIuYXBwZW5kQ2hpbGQoY3JlYXRlTWFya2VyKCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIHRoaXMgcGFydCBiZXR3ZWVuIGByZWZgIGFuZCBgcmVmYCdzIG5leHQgc2libGluZy4gQm90aCBgcmVmYCBhbmRcbiAgICAgKiBpdHMgbmV4dCBzaWJsaW5nIG11c3QgYmUgc3RhdGljLCB1bmNoYW5naW5nIG5vZGVzIHN1Y2ggYXMgdGhvc2UgdGhhdCBhcHBlYXJcbiAgICAgKiBpbiBhIGxpdGVyYWwgc2VjdGlvbiBvZiBhIHRlbXBsYXRlLlxuICAgICAqXG4gICAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAgICovXG4gICAgaW5zZXJ0QWZ0ZXJOb2RlKHJlZikge1xuICAgICAgICB0aGlzLnN0YXJ0Tm9kZSA9IHJlZjtcbiAgICAgICAgdGhpcy5lbmROb2RlID0gcmVmLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIHRoaXMgcGFydCBpbnRvIGEgcGFyZW50IHBhcnQuXG4gICAgICpcbiAgICAgKiBUaGlzIHBhcnQgbXVzdCBiZSBlbXB0eSwgYXMgaXRzIGNvbnRlbnRzIGFyZSBub3QgYXV0b21hdGljYWxseSBtb3ZlZC5cbiAgICAgKi9cbiAgICBhcHBlbmRJbnRvUGFydChwYXJ0KSB7XG4gICAgICAgIHBhcnQuX2luc2VydCh0aGlzLnN0YXJ0Tm9kZSA9IGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgcGFydC5faW5zZXJ0KHRoaXMuZW5kTm9kZSA9IGNyZWF0ZU1hcmtlcigpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXBwZW5kcyB0aGlzIHBhcnQgYWZ0ZXIgYHJlZmBcbiAgICAgKlxuICAgICAqIFRoaXMgcGFydCBtdXN0IGJlIGVtcHR5LCBhcyBpdHMgY29udGVudHMgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IG1vdmVkLlxuICAgICAqL1xuICAgIGluc2VydEFmdGVyUGFydChyZWYpIHtcbiAgICAgICAgcmVmLl9pbnNlcnQodGhpcy5zdGFydE5vZGUgPSBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgIHRoaXMuZW5kTm9kZSA9IHJlZi5lbmROb2RlO1xuICAgICAgICByZWYuZW5kTm9kZSA9IHRoaXMuc3RhcnROb2RlO1xuICAgIH1cbiAgICBzZXRWYWx1ZSh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgY29tbWl0KCkge1xuICAgICAgICB3aGlsZSAoaXNEaXJlY3RpdmUodGhpcy5fcGVuZGluZ1ZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5fcGVuZGluZ1ZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2U7XG4gICAgICAgICAgICBkaXJlY3RpdmUodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9wZW5kaW5nVmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNQcmltaXRpdmUodmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHRoaXMudmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlUmVzdWx0KSB7XG4gICAgICAgICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9jb21taXROb2RlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fFxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgdmFsdWVbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgICAgICAgdGhpcy5fY29tbWl0SXRlcmFibGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gbm90aGluZztcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfaW5zZXJ0KG5vZGUpIHtcbiAgICAgICAgdGhpcy5lbmROb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIHRoaXMuZW5kTm9kZSk7XG4gICAgfVxuICAgIF9jb21taXROb2RlKHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5faW5zZXJ0KHZhbHVlKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBfY29tbWl0VGV4dCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBub2RlID0gdGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIHZhbHVlID0gdmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWU7XG4gICAgICAgIGlmIChub2RlID09PSB0aGlzLmVuZE5vZGUucHJldmlvdXNTaWJsaW5nICYmXG4gICAgICAgICAgICBub2RlLm5vZGVUeXBlID09PSAzIC8qIE5vZGUuVEVYVF9OT0RFICovKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBvbmx5IGhhdmUgYSBzaW5nbGUgdGV4dCBub2RlIGJldHdlZW4gdGhlIG1hcmtlcnMsIHdlIGNhbiBqdXN0XG4gICAgICAgICAgICAvLyBzZXQgaXRzIHZhbHVlLCByYXRoZXIgdGhhbiByZXBsYWNpbmcgaXQuXG4gICAgICAgICAgICAvLyBUT0RPKGp1c3RpbmZhZ25hbmkpOiBDYW4gd2UganVzdCBjaGVjayBpZiB0aGlzLnZhbHVlIGlzIHByaW1pdGl2ZT9cbiAgICAgICAgICAgIG5vZGUuZGF0YSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY29tbWl0Tm9kZShkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBfY29tbWl0VGVtcGxhdGVSZXN1bHQodmFsdWUpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLm9wdGlvbnMudGVtcGxhdGVGYWN0b3J5KHZhbHVlKTtcbiAgICAgICAgaWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUZW1wbGF0ZUluc3RhbmNlICYmXG4gICAgICAgICAgICB0aGlzLnZhbHVlLnRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZS51cGRhdGUodmFsdWUudmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBwcm9wYWdhdGUgdGhlIHRlbXBsYXRlIHByb2Nlc3NvciBmcm9tIHRoZSBUZW1wbGF0ZVJlc3VsdFxuICAgICAgICAgICAgLy8gc28gdGhhdCB3ZSB1c2UgaXRzIHN5bnRheCBleHRlbnNpb24sIGV0Yy4gVGhlIHRlbXBsYXRlIGZhY3RvcnkgY29tZXNcbiAgICAgICAgICAgIC8vIGZyb20gdGhlIHJlbmRlciBmdW5jdGlvbiBvcHRpb25zIHNvIHRoYXQgaXQgY2FuIGNvbnRyb2wgdGVtcGxhdGVcbiAgICAgICAgICAgIC8vIGNhY2hpbmcgYW5kIHByZXByb2Nlc3NpbmcuXG4gICAgICAgICAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyBUZW1wbGF0ZUluc3RhbmNlKHRlbXBsYXRlLCB2YWx1ZS5wcm9jZXNzb3IsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSgpO1xuICAgICAgICAgICAgaW5zdGFuY2UudXBkYXRlKHZhbHVlLnZhbHVlcyk7XG4gICAgICAgICAgICB0aGlzLl9jb21taXROb2RlKGZyYWdtZW50KTtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBpbnN0YW5jZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfY29tbWl0SXRlcmFibGUodmFsdWUpIHtcbiAgICAgICAgLy8gRm9yIGFuIEl0ZXJhYmxlLCB3ZSBjcmVhdGUgYSBuZXcgSW5zdGFuY2VQYXJ0IHBlciBpdGVtLCB0aGVuIHNldCBpdHNcbiAgICAgICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgICAgIC8vIGFuIEl0ZXJhYmxlLCBidXQgaXQgbGV0cyB1cyByZWN1cnNlIGVhc2lseSBhbmQgZWZmaWNpZW50bHkgdXBkYXRlIEFycmF5c1xuICAgICAgICAvLyBvZiBUZW1wbGF0ZVJlc3VsdHMgdGhhdCB3aWxsIGJlIGNvbW1vbmx5IHJldHVybmVkIGZyb20gZXhwcmVzc2lvbnMgbGlrZTpcbiAgICAgICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cbiAgICAgICAgLy8gSWYgX3ZhbHVlIGlzIGFuIGFycmF5LCB0aGVuIHRoZSBwcmV2aW91cyByZW5kZXIgd2FzIG9mIGFuXG4gICAgICAgIC8vIGl0ZXJhYmxlIGFuZCBfdmFsdWUgd2lsbCBjb250YWluIHRoZSBOb2RlUGFydHMgZnJvbSB0aGUgcHJldmlvdXNcbiAgICAgICAgLy8gcmVuZGVyLiBJZiBfdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAgICAgLy8gYXJyYXkgZm9yIE5vZGVQYXJ0cy5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHRoaXMudmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gW107XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTGV0cyB1cyBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGl0ZW1zIHdlIHN0YW1wZWQgc28gd2UgY2FuIGNsZWFyIGxlZnRvdmVyXG4gICAgICAgIC8vIGl0ZW1zIGZyb20gYSBwcmV2aW91cyByZW5kZXJcbiAgICAgICAgY29uc3QgaXRlbVBhcnRzID0gdGhpcy52YWx1ZTtcbiAgICAgICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgICAgIGxldCBpdGVtUGFydDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gcmV1c2UgYW4gZXhpc3RpbmcgcGFydFxuICAgICAgICAgICAgaXRlbVBhcnQgPSBpdGVtUGFydHNbcGFydEluZGV4XTtcbiAgICAgICAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgICAgIGlmIChpdGVtUGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaXRlbVBhcnQgPSBuZXcgTm9kZVBhcnQodGhpcy5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICBpdGVtUGFydHMucHVzaChpdGVtUGFydCk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRJbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtUGFydC5hcHBlbmRJbnRvUGFydCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1QYXJ0Lmluc2VydEFmdGVyUGFydChpdGVtUGFydHNbcGFydEluZGV4IC0gMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW1QYXJ0LnNldFZhbHVlKGl0ZW0pO1xuICAgICAgICAgICAgaXRlbVBhcnQuY29tbWl0KCk7XG4gICAgICAgICAgICBwYXJ0SW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydEluZGV4IDwgaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gVHJ1bmNhdGUgdGhlIHBhcnRzIGFycmF5IHNvIF92YWx1ZSByZWZsZWN0cyB0aGUgY3VycmVudCBzdGF0ZVxuICAgICAgICAgICAgaXRlbVBhcnRzLmxlbmd0aCA9IHBhcnRJbmRleDtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoaXRlbVBhcnQgJiYgaXRlbVBhcnQuZW5kTm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2xlYXIoc3RhcnROb2RlID0gdGhpcy5zdGFydE5vZGUpIHtcbiAgICAgICAgcmVtb3ZlTm9kZXModGhpcy5zdGFydE5vZGUucGFyZW50Tm9kZSwgc3RhcnROb2RlLm5leHRTaWJsaW5nLCB0aGlzLmVuZE5vZGUpO1xuICAgIH1cbn1cbi8qKlxuICogSW1wbGVtZW50cyBhIGJvb2xlYW4gYXR0cmlidXRlLCByb3VnaGx5IGFzIGRlZmluZWQgaW4gdGhlIEhUTUxcbiAqIHNwZWNpZmljYXRpb24uXG4gKlxuICogSWYgdGhlIHZhbHVlIGlzIHRydXRoeSwgdGhlbiB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQgd2l0aCBhIHZhbHVlIG9mXG4gKiAnJy4gSWYgdGhlIHZhbHVlIGlzIGZhbHNleSwgdGhlIGF0dHJpYnV0ZSBpcyByZW1vdmVkLlxuICovXG5leHBvcnQgY2xhc3MgQm9vbGVhbkF0dHJpYnV0ZVBhcnQge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoc3RyaW5ncy5sZW5ndGggIT09IDIgfHwgc3RyaW5nc1swXSAhPT0gJycgfHwgc3RyaW5nc1sxXSAhPT0gJycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQm9vbGVhbiBhdHRyaWJ1dGVzIGNhbiBvbmx5IGNvbnRhaW4gYSBzaW5nbGUgZXhwcmVzc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuc3RyaW5ncyA9IHN0cmluZ3M7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBjb21taXQoKSB7XG4gICAgICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLl9wZW5kaW5nVmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9wZW5kaW5nVmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSBub0NoYW5nZTtcbiAgICAgICAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fcGVuZGluZ1ZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHZhbHVlID0gISF0aGlzLl9wZW5kaW5nVmFsdWU7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICAgIH1cbn1cbi8qKlxuICogU2V0cyBhdHRyaWJ1dGUgdmFsdWVzIGZvciBQcm9wZXJ0eVBhcnRzLCBzbyB0aGF0IHRoZSB2YWx1ZSBpcyBvbmx5IHNldCBvbmNlXG4gKiBldmVuIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBwYXJ0cyBmb3IgYSBwcm9wZXJ0eS5cbiAqXG4gKiBJZiBhbiBleHByZXNzaW9uIGNvbnRyb2xzIHRoZSB3aG9sZSBwcm9wZXJ0eSB2YWx1ZSwgdGhlbiB0aGUgdmFsdWUgaXMgc2ltcGx5XG4gKiBhc3NpZ25lZCB0byB0aGUgcHJvcGVydHkgdW5kZXIgY29udHJvbC4gSWYgdGhlcmUgYXJlIHN0cmluZyBsaXRlcmFscyBvclxuICogbXVsdGlwbGUgZXhwcmVzc2lvbnMsIHRoZW4gdGhlIHN0cmluZ3MgYXJlIGV4cHJlc3Npb25zIGFyZSBpbnRlcnBvbGF0ZWQgaW50b1xuICogYSBzdHJpbmcgZmlyc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9wZXJ0eUNvbW1pdHRlciBleHRlbmRzIEF0dHJpYnV0ZUNvbW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IoZWxlbWVudCwgbmFtZSwgc3RyaW5ncykge1xuICAgICAgICBzdXBlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzKTtcbiAgICAgICAgdGhpcy5zaW5nbGUgPVxuICAgICAgICAgICAgKHN0cmluZ3MubGVuZ3RoID09PSAyICYmIHN0cmluZ3NbMF0gPT09ICcnICYmIHN0cmluZ3NbMV0gPT09ICcnKTtcbiAgICB9XG4gICAgX2NyZWF0ZVBhcnQoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcGVydHlQYXJ0KHRoaXMpO1xuICAgIH1cbiAgICBfZ2V0VmFsdWUoKSB7XG4gICAgICAgIGlmICh0aGlzLnNpbmdsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFydHNbMF0udmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLl9nZXRWYWx1ZSgpO1xuICAgIH1cbiAgICBjb21taXQoKSB7XG4gICAgICAgIGlmICh0aGlzLmRpcnR5KSB7XG4gICAgICAgICAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRbdGhpcy5uYW1lXSA9IHRoaXMuX2dldFZhbHVlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnQgY2xhc3MgUHJvcGVydHlQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG59XG4vLyBEZXRlY3QgZXZlbnQgbGlzdGVuZXIgb3B0aW9ucyBzdXBwb3J0LiBJZiB0aGUgYGNhcHR1cmVgIHByb3BlcnR5IGlzIHJlYWRcbi8vIGZyb20gdGhlIG9wdGlvbnMgb2JqZWN0LCB0aGVuIG9wdGlvbnMgYXJlIHN1cHBvcnRlZC4gSWYgbm90LCB0aGVuIHRoZSB0aHJpZFxuLy8gYXJndW1lbnQgdG8gYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIgaXMgaW50ZXJwcmV0ZWQgYXMgdGhlIGJvb2xlYW4gY2FwdHVyZVxuLy8gdmFsdWUgc28gd2Ugc2hvdWxkIG9ubHkgcGFzcyB0aGUgYGNhcHR1cmVgIHByb3BlcnR5LlxubGV0IGV2ZW50T3B0aW9uc1N1cHBvcnRlZCA9IGZhbHNlO1xudHJ5IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBnZXQgY2FwdHVyZSgpIHtcbiAgICAgICAgICAgIGV2ZW50T3B0aW9uc1N1cHBvcnRlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndGVzdCcsIG9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGVzdCcsIG9wdGlvbnMsIG9wdGlvbnMpO1xufVxuY2F0Y2ggKF9lKSB7XG59XG5leHBvcnQgY2xhc3MgRXZlbnRQYXJ0IHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50LCBldmVudE5hbWUsIGV2ZW50Q29udGV4dCkge1xuICAgICAgICB0aGlzLnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xuICAgICAgICB0aGlzLmV2ZW50Q29udGV4dCA9IGV2ZW50Q29udGV4dDtcbiAgICAgICAgdGhpcy5fYm91bmRIYW5kbGVFdmVudCA9IChlKSA9PiB0aGlzLmhhbmRsZUV2ZW50KGUpO1xuICAgIH1cbiAgICBzZXRWYWx1ZSh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgY29tbWl0KCkge1xuICAgICAgICB3aGlsZSAoaXNEaXJlY3RpdmUodGhpcy5fcGVuZGluZ1ZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5fcGVuZGluZ1ZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2U7XG4gICAgICAgICAgICBkaXJlY3RpdmUodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdWYWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdMaXN0ZW5lciA9IHRoaXMuX3BlbmRpbmdWYWx1ZTtcbiAgICAgICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLnZhbHVlO1xuICAgICAgICBjb25zdCBzaG91bGRSZW1vdmVMaXN0ZW5lciA9IG5ld0xpc3RlbmVyID09IG51bGwgfHxcbiAgICAgICAgICAgIG9sZExpc3RlbmVyICE9IG51bGwgJiZcbiAgICAgICAgICAgICAgICAobmV3TGlzdGVuZXIuY2FwdHVyZSAhPT0gb2xkTGlzdGVuZXIuY2FwdHVyZSB8fFxuICAgICAgICAgICAgICAgICAgICBuZXdMaXN0ZW5lci5vbmNlICE9PSBvbGRMaXN0ZW5lci5vbmNlIHx8XG4gICAgICAgICAgICAgICAgICAgIG5ld0xpc3RlbmVyLnBhc3NpdmUgIT09IG9sZExpc3RlbmVyLnBhc3NpdmUpO1xuICAgICAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9IG5ld0xpc3RlbmVyICE9IG51bGwgJiYgKG9sZExpc3RlbmVyID09IG51bGwgfHwgc2hvdWxkUmVtb3ZlTGlzdGVuZXIpO1xuICAgICAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuZXZlbnROYW1lLCB0aGlzLl9ib3VuZEhhbmRsZUV2ZW50LCB0aGlzLl9vcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hvdWxkQWRkTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSBnZXRPcHRpb25zKG5ld0xpc3RlbmVyKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHRoaXMuZXZlbnROYW1lLCB0aGlzLl9ib3VuZEhhbmRsZUV2ZW50LCB0aGlzLl9vcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbHVlID0gbmV3TGlzdGVuZXI7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICAgIH1cbiAgICBoYW5kbGVFdmVudChldmVudCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMudmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUuY2FsbCh0aGlzLmV2ZW50Q29udGV4dCB8fCB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUuaGFuZGxlRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gV2UgY29weSBvcHRpb25zIGJlY2F1c2Ugb2YgdGhlIGluY29uc2lzdGVudCBiZWhhdmlvciBvZiBicm93c2VycyB3aGVuIHJlYWRpbmdcbi8vIHRoZSB0aGlyZCBhcmd1bWVudCBvZiBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lci4gSUUxMSBkb2Vzbid0IHN1cHBvcnQgb3B0aW9uc1xuLy8gYXQgYWxsLiBDaHJvbWUgNDEgb25seSByZWFkcyBgY2FwdHVyZWAgaWYgdGhlIGFyZ3VtZW50IGlzIGFuIG9iamVjdC5cbmNvbnN0IGdldE9wdGlvbnMgPSAobykgPT4gbyAmJlxuICAgIChldmVudE9wdGlvbnNTdXBwb3J0ZWQgP1xuICAgICAgICB7IGNhcHR1cmU6IG8uY2FwdHVyZSwgcGFzc2l2ZTogby5wYXNzaXZlLCBvbmNlOiBvLm9uY2UgfSA6XG4gICAgICAgIG8uY2FwdHVyZSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXJ0cy5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5pbXBvcnQgeyBBdHRyaWJ1dGVDb21taXR0ZXIsIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LCBFdmVudFBhcnQsIE5vZGVQYXJ0LCBQcm9wZXJ0eUNvbW1pdHRlciB9IGZyb20gJy4vcGFydHMuanMnO1xuLyoqXG4gKiBDcmVhdGVzIFBhcnRzIHdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3Ige1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwYXJ0cyBmb3IgYW4gYXR0cmlidXRlLXBvc2l0aW9uIGJpbmRpbmcsIGdpdmVuIHRoZSBldmVudCwgYXR0cmlidXRlXG4gICAgICogbmFtZSwgYW5kIHN0cmluZyBsaXRlcmFscy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbGVtZW50IFRoZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIGJpbmRpbmdcbiAgICAgKiBAcGFyYW0gbmFtZSAgVGhlIGF0dHJpYnV0ZSBuYW1lXG4gICAgICogQHBhcmFtIHN0cmluZ3MgVGhlIHN0cmluZyBsaXRlcmFscy4gVGhlcmUgYXJlIGFsd2F5cyBhdCBsZWFzdCB0d28gc3RyaW5ncyxcbiAgICAgKiAgIGV2ZW50IGZvciBmdWxseS1jb250cm9sbGVkIGJpbmRpbmdzIHdpdGggYSBzaW5nbGUgZXhwcmVzc2lvbi5cbiAgICAgKi9cbiAgICBoYW5kbGVBdHRyaWJ1dGVFeHByZXNzaW9ucyhlbGVtZW50LCBuYW1lLCBzdHJpbmdzLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IHByZWZpeCA9IG5hbWVbMF07XG4gICAgICAgIGlmIChwcmVmaXggPT09ICcuJykge1xuICAgICAgICAgICAgY29uc3QgY29taXR0ZXIgPSBuZXcgUHJvcGVydHlDb21taXR0ZXIoZWxlbWVudCwgbmFtZS5zbGljZSgxKSwgc3RyaW5ncyk7XG4gICAgICAgICAgICByZXR1cm4gY29taXR0ZXIucGFydHM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZWZpeCA9PT0gJ0AnKSB7XG4gICAgICAgICAgICByZXR1cm4gW25ldyBFdmVudFBhcnQoZWxlbWVudCwgbmFtZS5zbGljZSgxKSwgb3B0aW9ucy5ldmVudENvbnRleHQpXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlZml4ID09PSAnPycpIHtcbiAgICAgICAgICAgIHJldHVybiBbbmV3IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0KGVsZW1lbnQsIG5hbWUuc2xpY2UoMSksIHN0cmluZ3MpXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb21pdHRlciA9IG5ldyBBdHRyaWJ1dGVDb21taXR0ZXIoZWxlbWVudCwgbmFtZSwgc3RyaW5ncyk7XG4gICAgICAgIHJldHVybiBjb21pdHRlci5wYXJ0cztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBhcnRzIGZvciBhIHRleHQtcG9zaXRpb24gYmluZGluZy5cbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVGYWN0b3J5XG4gICAgICovXG4gICAgaGFuZGxlVGV4dEV4cHJlc3Npb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGVQYXJ0KG9wdGlvbnMpO1xuICAgIH1cbn1cbmV4cG9ydCBjb25zdCBkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IgPSBuZXcgRGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yKCk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5pbXBvcnQgeyBtYXJrZXIsIFRlbXBsYXRlIH0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG4vKipcbiAqIFRoZSBkZWZhdWx0IFRlbXBsYXRlRmFjdG9yeSB3aGljaCBjYWNoZXMgVGVtcGxhdGVzIGtleWVkIG9uXG4gKiByZXN1bHQudHlwZSBhbmQgcmVzdWx0LnN0cmluZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZW1wbGF0ZUZhY3RvcnkocmVzdWx0KSB7XG4gICAgbGV0IHRlbXBsYXRlQ2FjaGUgPSB0ZW1wbGF0ZUNhY2hlcy5nZXQocmVzdWx0LnR5cGUpO1xuICAgIGlmICh0ZW1wbGF0ZUNhY2hlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGVtcGxhdGVDYWNoZSA9IHtcbiAgICAgICAgICAgIHN0cmluZ3NBcnJheTogbmV3IFdlYWtNYXAoKSxcbiAgICAgICAgICAgIGtleVN0cmluZzogbmV3IE1hcCgpXG4gICAgICAgIH07XG4gICAgICAgIHRlbXBsYXRlQ2FjaGVzLnNldChyZXN1bHQudHlwZSwgdGVtcGxhdGVDYWNoZSk7XG4gICAgfVxuICAgIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuc3RyaW5nc0FycmF5LmdldChyZXN1bHQuc3RyaW5ncyk7XG4gICAgaWYgKHRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgVGVtcGxhdGVTdHJpbmdzQXJyYXkgaXMgbmV3LCBnZW5lcmF0ZSBhIGtleSBmcm9tIHRoZSBzdHJpbmdzXG4gICAgLy8gVGhpcyBrZXkgaXMgc2hhcmVkIGJldHdlZW4gYWxsIHRlbXBsYXRlcyB3aXRoIGlkZW50aWNhbCBjb250ZW50XG4gICAgY29uc3Qga2V5ID0gcmVzdWx0LnN0cmluZ3Muam9pbihtYXJrZXIpO1xuICAgIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhIFRlbXBsYXRlIGZvciB0aGlzIGtleVxuICAgIHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5rZXlTdHJpbmcuZ2V0KGtleSk7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBub3Qgc2VlbiB0aGlzIGtleSBiZWZvcmUsIGNyZWF0ZSBhIG5ldyBUZW1wbGF0ZVxuICAgICAgICB0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQsIHJlc3VsdC5nZXRUZW1wbGF0ZUVsZW1lbnQoKSk7XG4gICAgICAgIC8vIENhY2hlIHRoZSBUZW1wbGF0ZSBmb3IgdGhpcyBrZXlcbiAgICAgICAgdGVtcGxhdGVDYWNoZS5rZXlTdHJpbmcuc2V0KGtleSwgdGVtcGxhdGUpO1xuICAgIH1cbiAgICAvLyBDYWNoZSBhbGwgZnV0dXJlIHF1ZXJpZXMgZm9yIHRoaXMgVGVtcGxhdGVTdHJpbmdzQXJyYXlcbiAgICB0ZW1wbGF0ZUNhY2hlLnN0cmluZ3NBcnJheS5zZXQocmVzdWx0LnN0cmluZ3MsIHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG59XG5leHBvcnQgY29uc3QgdGVtcGxhdGVDYWNoZXMgPSBuZXcgTWFwKCk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZW1wbGF0ZS1mYWN0b3J5LmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5pbXBvcnQgeyByZW1vdmVOb2RlcyB9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7IE5vZGVQYXJ0IH0gZnJvbSAnLi9wYXJ0cy5qcyc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUZhY3RvcnkgfSBmcm9tICcuL3RlbXBsYXRlLWZhY3RvcnkuanMnO1xuZXhwb3J0IGNvbnN0IHBhcnRzID0gbmV3IFdlYWtNYXAoKTtcbi8qKlxuICogUmVuZGVycyBhIHRlbXBsYXRlIHRvIGEgY29udGFpbmVyLlxuICpcbiAqIFRvIHVwZGF0ZSBhIGNvbnRhaW5lciB3aXRoIG5ldyB2YWx1ZXMsIHJlZXZhbHVhdGUgdGhlIHRlbXBsYXRlIGxpdGVyYWwgYW5kXG4gKiBjYWxsIGByZW5kZXJgIHdpdGggdGhlIG5ldyByZXN1bHQuXG4gKlxuICogQHBhcmFtIHJlc3VsdCBhIFRlbXBsYXRlUmVzdWx0IGNyZWF0ZWQgYnkgZXZhbHVhdGluZyBhIHRlbXBsYXRlIHRhZyBsaWtlXG4gKiAgICAgYGh0bWxgIG9yIGBzdmdgLlxuICogQHBhcmFtIGNvbnRhaW5lciBBIERPTSBwYXJlbnQgdG8gcmVuZGVyIHRvLiBUaGUgZW50aXJlIGNvbnRlbnRzIGFyZSBlaXRoZXJcbiAqICAgICByZXBsYWNlZCwgb3IgZWZmaWNpZW50bHkgdXBkYXRlZCBpZiB0aGUgc2FtZSByZXN1bHQgdHlwZSB3YXMgcHJldmlvdXNcbiAqICAgICByZW5kZXJlZCB0aGVyZS5cbiAqIEBwYXJhbSBvcHRpb25zIFJlbmRlck9wdGlvbnMgZm9yIHRoZSBlbnRpcmUgcmVuZGVyIHRyZWUgcmVuZGVyZWQgdG8gdGhpc1xuICogICAgIGNvbnRhaW5lci4gUmVuZGVyIG9wdGlvbnMgbXVzdCAqbm90KiBjaGFuZ2UgYmV0d2VlbiByZW5kZXJzIHRvIHRoZSBzYW1lXG4gKiAgICAgY29udGFpbmVyLCBhcyB0aG9zZSBjaGFuZ2VzIHdpbGwgbm90IGVmZmVjdCBwcmV2aW91c2x5IHJlbmRlcmVkIERPTS5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlbmRlciA9IChyZXN1bHQsIGNvbnRhaW5lciwgb3B0aW9ucykgPT4ge1xuICAgIGxldCBwYXJ0ID0gcGFydHMuZ2V0KGNvbnRhaW5lcik7XG4gICAgaWYgKHBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZW1vdmVOb2Rlcyhjb250YWluZXIsIGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgcGFydHMuc2V0KGNvbnRhaW5lciwgcGFydCA9IG5ldyBOb2RlUGFydChPYmplY3QuYXNzaWduKHsgdGVtcGxhdGVGYWN0b3J5IH0sIG9wdGlvbnMpKSk7XG4gICAgICAgIHBhcnQuYXBwZW5kSW50byhjb250YWluZXIpO1xuICAgIH1cbiAgICBwYXJ0LnNldFZhbHVlKHJlc3VsdCk7XG4gICAgcGFydC5jb21taXQoKTtcbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1yZW5kZXIuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKlxuICogTWFpbiBsaXQtaHRtbCBtb2R1bGUuXG4gKlxuICogTWFpbiBleHBvcnRzOlxuICpcbiAqIC0gIFtbaHRtbF1dXG4gKiAtICBbW3N2Z11dXG4gKiAtICBbW3JlbmRlcl1dXG4gKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICogQHByZWZlcnJlZFxuICovXG4vKipcbiAqIERvIG5vdCByZW1vdmUgdGhpcyBjb21tZW50OyBpdCBrZWVwcyB0eXBlZG9jIGZyb20gbWlzcGxhY2luZyB0aGUgbW9kdWxlXG4gKiBkb2NzLlxuICovXG5pbXBvcnQgeyBkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IgfSBmcm9tICcuL2xpYi9kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBTVkdUZW1wbGF0ZVJlc3VsdCwgVGVtcGxhdGVSZXN1bHQgfSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuZXhwb3J0IHsgRGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yLCBkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IgfSBmcm9tICcuL2xpYi9kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5leHBvcnQgeyBkaXJlY3RpdmUsIGlzRGlyZWN0aXZlIH0gZnJvbSAnLi9saWIvZGlyZWN0aXZlLmpzJztcbi8vIFRPRE8oanVzdGluZmFnbmFuaSk6IHJlbW92ZSBsaW5lIHdoZW4gd2UgZ2V0IE5vZGVQYXJ0IG1vdmluZyBtZXRob2RzXG5leHBvcnQgeyByZW1vdmVOb2RlcywgcmVwYXJlbnROb2RlcyB9IGZyb20gJy4vbGliL2RvbS5qcyc7XG5leHBvcnQgeyBub0NoYW5nZSwgbm90aGluZyB9IGZyb20gJy4vbGliL3BhcnQuanMnO1xuZXhwb3J0IHsgQXR0cmlidXRlQ29tbWl0dGVyLCBBdHRyaWJ1dGVQYXJ0LCBCb29sZWFuQXR0cmlidXRlUGFydCwgRXZlbnRQYXJ0LCBpc1ByaW1pdGl2ZSwgTm9kZVBhcnQsIFByb3BlcnR5Q29tbWl0dGVyLCBQcm9wZXJ0eVBhcnQgfSBmcm9tICcuL2xpYi9wYXJ0cy5qcyc7XG5leHBvcnQgeyBwYXJ0cywgcmVuZGVyIH0gZnJvbSAnLi9saWIvcmVuZGVyLmpzJztcbmV4cG9ydCB7IHRlbXBsYXRlQ2FjaGVzLCB0ZW1wbGF0ZUZhY3RvcnkgfSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1mYWN0b3J5LmpzJztcbmV4cG9ydCB7IFRlbXBsYXRlSW5zdGFuY2UgfSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1pbnN0YW5jZS5qcyc7XG5leHBvcnQgeyBTVkdUZW1wbGF0ZVJlc3VsdCwgVGVtcGxhdGVSZXN1bHQgfSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuZXhwb3J0IHsgY3JlYXRlTWFya2VyLCBpc1RlbXBsYXRlUGFydEFjdGl2ZSwgVGVtcGxhdGUgfSBmcm9tICcuL2xpYi90ZW1wbGF0ZS5qcyc7XG4vLyBJTVBPUlRBTlQ6IGRvIG5vdCBjaGFuZ2UgdGhlIHByb3BlcnR5IG5hbWUgb3IgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi5cbi8vIFRoaXMgbGluZSB3aWxsIGJlIHVzZWQgaW4gcmVnZXhlcyB0byBzZWFyY2ggZm9yIGxpdC1odG1sIHVzYWdlLlxuLy8gVE9ETyhqdXN0aW5mYWduYW5pKTogaW5qZWN0IHZlcnNpb24gbnVtYmVyIGF0IGJ1aWxkIHRpbWVcbih3aW5kb3dbJ2xpdEh0bWxWZXJzaW9ucyddIHx8ICh3aW5kb3dbJ2xpdEh0bWxWZXJzaW9ucyddID0gW10pKS5wdXNoKCcxLjAuMCcpO1xuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IGh0bWwgPSAoc3RyaW5ncywgLi4udmFsdWVzKSA9PiBuZXcgVGVtcGxhdGVSZXN1bHQoc3RyaW5ncywgdmFsdWVzLCAnaHRtbCcsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcik7XG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIFNWRyB0ZW1wbGF0ZSB0aGF0IGNhbiBlZmZpY2llbnRseVxuICogcmVuZGVyIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBzdmcgPSAoc3RyaW5ncywgLi4udmFsdWVzKSA9PiBuZXcgU1ZHVGVtcGxhdGVSZXN1bHQoc3RyaW5ncywgdmFsdWVzLCAnc3ZnJywgZGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxpdC1odG1sLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogQG1vZHVsZSBzaGFkeS1yZW5kZXJcbiAqL1xuaW1wb3J0IHsgaXNUZW1wbGF0ZVBhcnRBY3RpdmUgfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcbmNvbnN0IHdhbGtlck5vZGVGaWx0ZXIgPSAxMzMgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR8VEVYVH0gKi87XG4vKipcbiAqIFJlbW92ZXMgdGhlIGxpc3Qgb2Ygbm9kZXMgZnJvbSBhIFRlbXBsYXRlIHNhZmVseS4gSW4gYWRkaXRpb24gdG8gcmVtb3ZpbmdcbiAqIG5vZGVzIGZyb20gdGhlIFRlbXBsYXRlLCB0aGUgVGVtcGxhdGUgcGFydCBpbmRpY2VzIGFyZSB1cGRhdGVkIHRvIG1hdGNoXG4gKiB0aGUgbXV0YXRlZCBUZW1wbGF0ZSBET00uXG4gKlxuICogQXMgdGhlIHRlbXBsYXRlIGlzIHdhbGtlZCB0aGUgcmVtb3ZhbCBzdGF0ZSBpcyB0cmFja2VkIGFuZFxuICogcGFydCBpbmRpY2VzIGFyZSBhZGp1c3RlZCBhcyBuZWVkZWQuXG4gKlxuICogZGl2XG4gKiAgIGRpdiMxIChyZW1vdmUpIDwtLSBzdGFydCByZW1vdmluZyAocmVtb3Zpbmcgbm9kZSBpcyBkaXYjMSlcbiAqICAgICBkaXZcbiAqICAgICAgIGRpdiMyIChyZW1vdmUpICA8LS0gY29udGludWUgcmVtb3ZpbmcgKHJlbW92aW5nIG5vZGUgaXMgc3RpbGwgZGl2IzEpXG4gKiAgICAgICAgIGRpdlxuICogZGl2IDwtLSBzdG9wIHJlbW92aW5nIHNpbmNlIHByZXZpb3VzIHNpYmxpbmcgaXMgdGhlIHJlbW92aW5nIG5vZGUgKGRpdiMxLFxuICogcmVtb3ZlZCA0IG5vZGVzKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlTm9kZXNGcm9tVGVtcGxhdGUodGVtcGxhdGUsIG5vZGVzVG9SZW1vdmUpIHtcbiAgICBjb25zdCB7IGVsZW1lbnQ6IHsgY29udGVudCB9LCBwYXJ0cyB9ID0gdGVtcGxhdGU7XG4gICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihjb250ZW50LCB3YWxrZXJOb2RlRmlsdGVyLCBudWxsLCBmYWxzZSk7XG4gICAgbGV0IHBhcnRJbmRleCA9IG5leHRBY3RpdmVJbmRleEluVGVtcGxhdGVQYXJ0cyhwYXJ0cyk7XG4gICAgbGV0IHBhcnQgPSBwYXJ0c1twYXJ0SW5kZXhdO1xuICAgIGxldCBub2RlSW5kZXggPSAtMTtcbiAgICBsZXQgcmVtb3ZlQ291bnQgPSAwO1xuICAgIGNvbnN0IG5vZGVzVG9SZW1vdmVJblRlbXBsYXRlID0gW107XG4gICAgbGV0IGN1cnJlbnRSZW1vdmluZ05vZGUgPSBudWxsO1xuICAgIHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgICBub2RlSW5kZXgrKztcbiAgICAgICAgY29uc3Qgbm9kZSA9IHdhbGtlci5jdXJyZW50Tm9kZTtcbiAgICAgICAgLy8gRW5kIHJlbW92YWwgaWYgc3RlcHBlZCBwYXN0IHRoZSByZW1vdmluZyBub2RlXG4gICAgICAgIGlmIChub2RlLnByZXZpb3VzU2libGluZyA9PT0gY3VycmVudFJlbW92aW5nTm9kZSkge1xuICAgICAgICAgICAgY3VycmVudFJlbW92aW5nTm9kZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQSBub2RlIHRvIHJlbW92ZSB3YXMgZm91bmQgaW4gdGhlIHRlbXBsYXRlXG4gICAgICAgIGlmIChub2Rlc1RvUmVtb3ZlLmhhcyhub2RlKSkge1xuICAgICAgICAgICAgbm9kZXNUb1JlbW92ZUluVGVtcGxhdGUucHVzaChub2RlKTtcbiAgICAgICAgICAgIC8vIFRyYWNrIG5vZGUgd2UncmUgcmVtb3ZpbmdcbiAgICAgICAgICAgIGlmIChjdXJyZW50UmVtb3ZpbmdOb2RlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFJlbW92aW5nTm9kZSA9IG5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2hlbiByZW1vdmluZywgaW5jcmVtZW50IGNvdW50IGJ5IHdoaWNoIHRvIGFkanVzdCBzdWJzZXF1ZW50IHBhcnQgaW5kaWNlc1xuICAgICAgICBpZiAoY3VycmVudFJlbW92aW5nTm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVtb3ZlQ291bnQrKztcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAocGFydCAhPT0gdW5kZWZpbmVkICYmIHBhcnQuaW5kZXggPT09IG5vZGVJbmRleCkge1xuICAgICAgICAgICAgLy8gSWYgcGFydCBpcyBpbiBhIHJlbW92ZWQgbm9kZSBkZWFjdGl2YXRlIGl0IGJ5IHNldHRpbmcgaW5kZXggdG8gLTEgb3JcbiAgICAgICAgICAgIC8vIGFkanVzdCB0aGUgaW5kZXggYXMgbmVlZGVkLlxuICAgICAgICAgICAgcGFydC5pbmRleCA9IGN1cnJlbnRSZW1vdmluZ05vZGUgIT09IG51bGwgPyAtMSA6IHBhcnQuaW5kZXggLSByZW1vdmVDb3VudDtcbiAgICAgICAgICAgIC8vIGdvIHRvIHRoZSBuZXh0IGFjdGl2ZSBwYXJ0LlxuICAgICAgICAgICAgcGFydEluZGV4ID0gbmV4dEFjdGl2ZUluZGV4SW5UZW1wbGF0ZVBhcnRzKHBhcnRzLCBwYXJ0SW5kZXgpO1xuICAgICAgICAgICAgcGFydCA9IHBhcnRzW3BhcnRJbmRleF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgbm9kZXNUb1JlbW92ZUluVGVtcGxhdGUuZm9yRWFjaCgobikgPT4gbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG4pKTtcbn1cbmNvbnN0IGNvdW50Tm9kZXMgPSAobm9kZSkgPT4ge1xuICAgIGxldCBjb3VudCA9IChub2RlLm5vZGVUeXBlID09PSAxMSAvKiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgKi8pID8gMCA6IDE7XG4gICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihub2RlLCB3YWxrZXJOb2RlRmlsdGVyLCBudWxsLCBmYWxzZSk7XG4gICAgd2hpbGUgKHdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbn07XG5jb25zdCBuZXh0QWN0aXZlSW5kZXhJblRlbXBsYXRlUGFydHMgPSAocGFydHMsIHN0YXJ0SW5kZXggPSAtMSkgPT4ge1xuICAgIGZvciAobGV0IGkgPSBzdGFydEluZGV4ICsgMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgaWYgKGlzVGVtcGxhdGVQYXJ0QWN0aXZlKHBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuLyoqXG4gKiBJbnNlcnRzIHRoZSBnaXZlbiBub2RlIGludG8gdGhlIFRlbXBsYXRlLCBvcHRpb25hbGx5IGJlZm9yZSB0aGUgZ2l2ZW5cbiAqIHJlZk5vZGUuIEluIGFkZGl0aW9uIHRvIGluc2VydGluZyB0aGUgbm9kZSBpbnRvIHRoZSBUZW1wbGF0ZSwgdGhlIFRlbXBsYXRlXG4gKiBwYXJ0IGluZGljZXMgYXJlIHVwZGF0ZWQgdG8gbWF0Y2ggdGhlIG11dGF0ZWQgVGVtcGxhdGUgRE9NLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0Tm9kZUludG9UZW1wbGF0ZSh0ZW1wbGF0ZSwgbm9kZSwgcmVmTm9kZSA9IG51bGwpIHtcbiAgICBjb25zdCB7IGVsZW1lbnQ6IHsgY29udGVudCB9LCBwYXJ0cyB9ID0gdGVtcGxhdGU7XG4gICAgLy8gSWYgdGhlcmUncyBubyByZWZOb2RlLCB0aGVuIHB1dCBub2RlIGF0IGVuZCBvZiB0ZW1wbGF0ZS5cbiAgICAvLyBObyBwYXJ0IGluZGljZXMgbmVlZCB0byBiZSBzaGlmdGVkIGluIHRoaXMgY2FzZS5cbiAgICBpZiAocmVmTm9kZSA9PT0gbnVsbCB8fCByZWZOb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGVudC5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGNvbnRlbnQsIHdhbGtlck5vZGVGaWx0ZXIsIG51bGwsIGZhbHNlKTtcbiAgICBsZXQgcGFydEluZGV4ID0gbmV4dEFjdGl2ZUluZGV4SW5UZW1wbGF0ZVBhcnRzKHBhcnRzKTtcbiAgICBsZXQgaW5zZXJ0Q291bnQgPSAwO1xuICAgIGxldCB3YWxrZXJJbmRleCA9IC0xO1xuICAgIHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgICB3YWxrZXJJbmRleCsrO1xuICAgICAgICBjb25zdCB3YWxrZXJOb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgICAgICBpZiAod2Fsa2VyTm9kZSA9PT0gcmVmTm9kZSkge1xuICAgICAgICAgICAgaW5zZXJ0Q291bnQgPSBjb3VudE5vZGVzKG5vZGUpO1xuICAgICAgICAgICAgcmVmTm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCByZWZOb2RlKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAocGFydEluZGV4ICE9PSAtMSAmJiBwYXJ0c1twYXJ0SW5kZXhdLmluZGV4ID09PSB3YWxrZXJJbmRleCkge1xuICAgICAgICAgICAgLy8gSWYgd2UndmUgaW5zZXJ0ZWQgdGhlIG5vZGUsIHNpbXBseSBhZGp1c3QgYWxsIHN1YnNlcXVlbnQgcGFydHNcbiAgICAgICAgICAgIGlmIChpbnNlcnRDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFydEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJ0c1twYXJ0SW5kZXhdLmluZGV4ICs9IGluc2VydENvdW50O1xuICAgICAgICAgICAgICAgICAgICBwYXJ0SW5kZXggPSBuZXh0QWN0aXZlSW5kZXhJblRlbXBsYXRlUGFydHMocGFydHMsIHBhcnRJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcnRJbmRleCA9IG5leHRBY3RpdmVJbmRleEluVGVtcGxhdGVQYXJ0cyhwYXJ0cywgcGFydEluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1vZGlmeS10ZW1wbGF0ZS5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIE1vZHVsZSB0byBhZGQgc2hhZHkgRE9NL3NoYWR5IENTUyBwb2x5ZmlsbCBzdXBwb3J0IHRvIGxpdC1odG1sIHRlbXBsYXRlXG4gKiByZW5kZXJpbmcuIFNlZSB0aGUgW1tyZW5kZXJdXSBtZXRob2QgZm9yIGRldGFpbHMuXG4gKlxuICogQG1vZHVsZSBzaGFkeS1yZW5kZXJcbiAqIEBwcmVmZXJyZWRcbiAqL1xuLyoqXG4gKiBEbyBub3QgcmVtb3ZlIHRoaXMgY29tbWVudDsgaXQga2VlcHMgdHlwZWRvYyBmcm9tIG1pc3BsYWNpbmcgdGhlIG1vZHVsZVxuICogZG9jcy5cbiAqL1xuaW1wb3J0IHsgcmVtb3ZlTm9kZXMgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyBpbnNlcnROb2RlSW50b1RlbXBsYXRlLCByZW1vdmVOb2Rlc0Zyb21UZW1wbGF0ZSB9IGZyb20gJy4vbW9kaWZ5LXRlbXBsYXRlLmpzJztcbmltcG9ydCB7IHBhcnRzLCByZW5kZXIgYXMgbGl0UmVuZGVyIH0gZnJvbSAnLi9yZW5kZXIuanMnO1xuaW1wb3J0IHsgdGVtcGxhdGVDYWNoZXMgfSBmcm9tICcuL3RlbXBsYXRlLWZhY3RvcnkuanMnO1xuaW1wb3J0IHsgVGVtcGxhdGVJbnN0YW5jZSB9IGZyb20gJy4vdGVtcGxhdGUtaW5zdGFuY2UuanMnO1xuaW1wb3J0IHsgVGVtcGxhdGVSZXN1bHQgfSBmcm9tICcuL3RlbXBsYXRlLXJlc3VsdC5qcyc7XG5pbXBvcnQgeyBtYXJrZXIsIFRlbXBsYXRlIH0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG5leHBvcnQgeyBodG1sLCBzdmcsIFRlbXBsYXRlUmVzdWx0IH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuLy8gR2V0IGEga2V5IHRvIGxvb2t1cCBpbiBgdGVtcGxhdGVDYWNoZXNgLlxuY29uc3QgZ2V0VGVtcGxhdGVDYWNoZUtleSA9ICh0eXBlLCBzY29wZU5hbWUpID0+IGAke3R5cGV9LS0ke3Njb3BlTmFtZX1gO1xubGV0IGNvbXBhdGlibGVTaGFkeUNTU1ZlcnNpb24gPSB0cnVlO1xuaWYgKHR5cGVvZiB3aW5kb3cuU2hhZHlDU1MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29tcGF0aWJsZVNoYWR5Q1NTVmVyc2lvbiA9IGZhbHNlO1xufVxuZWxzZSBpZiAodHlwZW9mIHdpbmRvdy5TaGFkeUNTUy5wcmVwYXJlVGVtcGxhdGVEb20gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc29sZS53YXJuKGBJbmNvbXBhdGlibGUgU2hhZHlDU1MgdmVyc2lvbiBkZXRlY3RlZC5gICtcbiAgICAgICAgYFBsZWFzZSB1cGRhdGUgdG8gYXQgbGVhc3QgQHdlYmNvbXBvbmVudHMvd2ViY29tcG9uZW50c2pzQDIuMC4yIGFuZGAgK1xuICAgICAgICBgQHdlYmNvbXBvbmVudHMvc2hhZHljc3NAMS4zLjEuYCk7XG4gICAgY29tcGF0aWJsZVNoYWR5Q1NTVmVyc2lvbiA9IGZhbHNlO1xufVxuLyoqXG4gKiBUZW1wbGF0ZSBmYWN0b3J5IHdoaWNoIHNjb3BlcyB0ZW1wbGF0ZSBET00gdXNpbmcgU2hhZHlDU1MuXG4gKiBAcGFyYW0gc2NvcGVOYW1lIHtzdHJpbmd9XG4gKi9cbmNvbnN0IHNoYWR5VGVtcGxhdGVGYWN0b3J5ID0gKHNjb3BlTmFtZSkgPT4gKHJlc3VsdCkgPT4ge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gZ2V0VGVtcGxhdGVDYWNoZUtleShyZXN1bHQudHlwZSwgc2NvcGVOYW1lKTtcbiAgICBsZXQgdGVtcGxhdGVDYWNoZSA9IHRlbXBsYXRlQ2FjaGVzLmdldChjYWNoZUtleSk7XG4gICAgaWYgKHRlbXBsYXRlQ2FjaGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0ZW1wbGF0ZUNhY2hlID0ge1xuICAgICAgICAgICAgc3RyaW5nc0FycmF5OiBuZXcgV2Vha01hcCgpLFxuICAgICAgICAgICAga2V5U3RyaW5nOiBuZXcgTWFwKClcbiAgICAgICAgfTtcbiAgICAgICAgdGVtcGxhdGVDYWNoZXMuc2V0KGNhY2hlS2V5LCB0ZW1wbGF0ZUNhY2hlKTtcbiAgICB9XG4gICAgbGV0IHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5zdHJpbmdzQXJyYXkuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IHJlc3VsdC5zdHJpbmdzLmpvaW4obWFya2VyKTtcbiAgICB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUua2V5U3RyaW5nLmdldChrZXkpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSByZXN1bHQuZ2V0VGVtcGxhdGVFbGVtZW50KCk7XG4gICAgICAgIGlmIChjb21wYXRpYmxlU2hhZHlDU1NWZXJzaW9uKSB7XG4gICAgICAgICAgICB3aW5kb3cuU2hhZHlDU1MucHJlcGFyZVRlbXBsYXRlRG9tKGVsZW1lbnQsIHNjb3BlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUocmVzdWx0LCBlbGVtZW50KTtcbiAgICAgICAgdGVtcGxhdGVDYWNoZS5rZXlTdHJpbmcuc2V0KGtleSwgdGVtcGxhdGUpO1xuICAgIH1cbiAgICB0ZW1wbGF0ZUNhY2hlLnN0cmluZ3NBcnJheS5zZXQocmVzdWx0LnN0cmluZ3MsIHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG59O1xuY29uc3QgVEVNUExBVEVfVFlQRVMgPSBbJ2h0bWwnLCAnc3ZnJ107XG4vKipcbiAqIFJlbW92ZXMgYWxsIHN0eWxlIGVsZW1lbnRzIGZyb20gVGVtcGxhdGVzIGZvciB0aGUgZ2l2ZW4gc2NvcGVOYW1lLlxuICovXG5jb25zdCByZW1vdmVTdHlsZXNGcm9tTGl0VGVtcGxhdGVzID0gKHNjb3BlTmFtZSkgPT4ge1xuICAgIFRFTVBMQVRFX1RZUEVTLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVzID0gdGVtcGxhdGVDYWNoZXMuZ2V0KGdldFRlbXBsYXRlQ2FjaGVLZXkodHlwZSwgc2NvcGVOYW1lKSk7XG4gICAgICAgIGlmICh0ZW1wbGF0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGVtcGxhdGVzLmtleVN0cmluZy5mb3JFYWNoKCh0ZW1wbGF0ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZWxlbWVudDogeyBjb250ZW50IH0gfSA9IHRlbXBsYXRlO1xuICAgICAgICAgICAgICAgIC8vIElFIDExIGRvZXNuJ3Qgc3VwcG9ydCB0aGUgaXRlcmFibGUgcGFyYW0gU2V0IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGVzID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgICAgIEFycmF5LmZyb20oY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKCdzdHlsZScpKS5mb3JFYWNoKChzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlcy5hZGQocyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVtb3ZlTm9kZXNGcm9tVGVtcGxhdGUodGVtcGxhdGUsIHN0eWxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbmNvbnN0IHNoYWR5UmVuZGVyU2V0ID0gbmV3IFNldCgpO1xuLyoqXG4gKiBGb3IgdGhlIGdpdmVuIHNjb3BlIG5hbWUsIGVuc3VyZXMgdGhhdCBTaGFkeUNTUyBzdHlsZSBzY29waW5nIGlzIHBlcmZvcm1lZC5cbiAqIFRoaXMgaXMgZG9uZSBqdXN0IG9uY2UgcGVyIHNjb3BlIG5hbWUgc28gdGhlIGZyYWdtZW50IGFuZCB0ZW1wbGF0ZSBjYW5ub3RcbiAqIGJlIG1vZGlmaWVkLlxuICogKDEpIGV4dHJhY3RzIHN0eWxlcyBmcm9tIHRoZSByZW5kZXJlZCBmcmFnbWVudCBhbmQgaGFuZHMgdGhlbSB0byBTaGFkeUNTU1xuICogdG8gYmUgc2NvcGVkIGFuZCBhcHBlbmRlZCB0byB0aGUgZG9jdW1lbnRcbiAqICgyKSByZW1vdmVzIHN0eWxlIGVsZW1lbnRzIGZyb20gYWxsIGxpdC1odG1sIFRlbXBsYXRlcyBmb3IgdGhpcyBzY29wZSBuYW1lLlxuICpcbiAqIE5vdGUsIDxzdHlsZT4gZWxlbWVudHMgY2FuIG9ubHkgYmUgcGxhY2VkIGludG8gdGVtcGxhdGVzIGZvciB0aGVcbiAqIGluaXRpYWwgcmVuZGVyaW5nIG9mIHRoZSBzY29wZS4gSWYgPHN0eWxlPiBlbGVtZW50cyBhcmUgaW5jbHVkZWQgaW4gdGVtcGxhdGVzXG4gKiBkeW5hbWljYWxseSByZW5kZXJlZCB0byB0aGUgc2NvcGUgKGFmdGVyIHRoZSBmaXJzdCBzY29wZSByZW5kZXIpLCB0aGV5IHdpbGxcbiAqIG5vdCBiZSBzY29wZWQgYW5kIHRoZSA8c3R5bGU+IHdpbGwgYmUgbGVmdCBpbiB0aGUgdGVtcGxhdGUgYW5kIHJlbmRlcmVkXG4gKiBvdXRwdXQuXG4gKi9cbmNvbnN0IHByZXBhcmVUZW1wbGF0ZVN0eWxlcyA9IChyZW5kZXJlZERPTSwgdGVtcGxhdGUsIHNjb3BlTmFtZSkgPT4ge1xuICAgIHNoYWR5UmVuZGVyU2V0LmFkZChzY29wZU5hbWUpO1xuICAgIC8vIE1vdmUgc3R5bGVzIG91dCBvZiByZW5kZXJlZCBET00gYW5kIHN0b3JlLlxuICAgIGNvbnN0IHN0eWxlcyA9IHJlbmRlcmVkRE9NLnF1ZXJ5U2VsZWN0b3JBbGwoJ3N0eWxlJyk7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIHN0eWxlcywgc2tpcCB1bm5lY2Vzc2FyeSB3b3JrXG4gICAgaWYgKHN0eWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gRW5zdXJlIHByZXBhcmVUZW1wbGF0ZVN0eWxlcyBpcyBjYWxsZWQgdG8gc3VwcG9ydCBhZGRpbmdcbiAgICAgICAgLy8gc3R5bGVzIHZpYSBgcHJlcGFyZUFkb3B0ZWRDc3NUZXh0YCBzaW5jZSB0aGF0IHJlcXVpcmVzIHRoYXRcbiAgICAgICAgLy8gYHByZXBhcmVUZW1wbGF0ZVN0eWxlc2AgaXMgY2FsbGVkLlxuICAgICAgICB3aW5kb3cuU2hhZHlDU1MucHJlcGFyZVRlbXBsYXRlU3R5bGVzKHRlbXBsYXRlLmVsZW1lbnQsIHNjb3BlTmFtZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY29uZGVuc2VkU3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIC8vIENvbGxlY3Qgc3R5bGVzIGludG8gYSBzaW5nbGUgc3R5bGUuIFRoaXMgaGVscHMgdXMgbWFrZSBzdXJlIFNoYWR5Q1NTXG4gICAgLy8gbWFuaXB1bGF0aW9ucyB3aWxsIG5vdCBwcmV2ZW50IHVzIGZyb20gYmVpbmcgYWJsZSB0byBmaXggdXAgdGVtcGxhdGVcbiAgICAvLyBwYXJ0IGluZGljZXMuXG4gICAgLy8gTk9URTogY29sbGVjdGluZyBzdHlsZXMgaXMgaW5lZmZpY2llbnQgZm9yIGJyb3dzZXJzIGJ1dCBTaGFkeUNTU1xuICAgIC8vIGN1cnJlbnRseSBkb2VzIHRoaXMgYW55d2F5LiBXaGVuIGl0IGRvZXMgbm90LCB0aGlzIHNob3VsZCBiZSBjaGFuZ2VkLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gc3R5bGVzW2ldO1xuICAgICAgICBzdHlsZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlKTtcbiAgICAgICAgY29uZGVuc2VkU3R5bGUudGV4dENvbnRlbnQgKz0gc3R5bGUudGV4dENvbnRlbnQ7XG4gICAgfVxuICAgIC8vIFJlbW92ZSBzdHlsZXMgZnJvbSBuZXN0ZWQgdGVtcGxhdGVzIGluIHRoaXMgc2NvcGUuXG4gICAgcmVtb3ZlU3R5bGVzRnJvbUxpdFRlbXBsYXRlcyhzY29wZU5hbWUpO1xuICAgIC8vIEFuZCB0aGVuIHB1dCB0aGUgY29uZGVuc2VkIHN0eWxlIGludG8gdGhlIFwicm9vdFwiIHRlbXBsYXRlIHBhc3NlZCBpbiBhc1xuICAgIC8vIGB0ZW1wbGF0ZWAuXG4gICAgaW5zZXJ0Tm9kZUludG9UZW1wbGF0ZSh0ZW1wbGF0ZSwgY29uZGVuc2VkU3R5bGUsIHRlbXBsYXRlLmVsZW1lbnQuY29udGVudC5maXJzdENoaWxkKTtcbiAgICAvLyBOb3RlLCBpdCdzIGltcG9ydGFudCB0aGF0IFNoYWR5Q1NTIGdldHMgdGhlIHRlbXBsYXRlIHRoYXQgYGxpdC1odG1sYFxuICAgIC8vIHdpbGwgYWN0dWFsbHkgcmVuZGVyIHNvIHRoYXQgaXQgY2FuIHVwZGF0ZSB0aGUgc3R5bGUgaW5zaWRlIHdoZW5cbiAgICAvLyBuZWVkZWQgKGUuZy4gQGFwcGx5IG5hdGl2ZSBTaGFkb3cgRE9NIGNhc2UpLlxuICAgIHdpbmRvdy5TaGFkeUNTUy5wcmVwYXJlVGVtcGxhdGVTdHlsZXModGVtcGxhdGUuZWxlbWVudCwgc2NvcGVOYW1lKTtcbiAgICBpZiAod2luZG93LlNoYWR5Q1NTLm5hdGl2ZVNoYWRvdykge1xuICAgICAgICAvLyBXaGVuIGluIG5hdGl2ZSBTaGFkb3cgRE9NLCByZS1hZGQgc3R5bGluZyB0byByZW5kZXJlZCBjb250ZW50IHVzaW5nXG4gICAgICAgIC8vIHRoZSBzdHlsZSBTaGFkeUNTUyBwcm9kdWNlZC5cbiAgICAgICAgY29uc3Qgc3R5bGUgPSB0ZW1wbGF0ZS5lbGVtZW50LmNvbnRlbnQucXVlcnlTZWxlY3Rvcignc3R5bGUnKTtcbiAgICAgICAgcmVuZGVyZWRET00uaW5zZXJ0QmVmb3JlKHN0eWxlLmNsb25lTm9kZSh0cnVlKSwgcmVuZGVyZWRET00uZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBXaGVuIG5vdCBpbiBuYXRpdmUgU2hhZG93IERPTSwgYXQgdGhpcyBwb2ludCBTaGFkeUNTUyB3aWxsIGhhdmVcbiAgICAgICAgLy8gcmVtb3ZlZCB0aGUgc3R5bGUgZnJvbSB0aGUgbGl0IHRlbXBsYXRlIGFuZCBwYXJ0cyB3aWxsIGJlIGJyb2tlbiBhcyBhXG4gICAgICAgIC8vIHJlc3VsdC4gVG8gZml4IHRoaXMsIHdlIHB1dCBiYWNrIHRoZSBzdHlsZSBub2RlIFNoYWR5Q1NTIHJlbW92ZWRcbiAgICAgICAgLy8gYW5kIHRoZW4gdGVsbCBsaXQgdG8gcmVtb3ZlIHRoYXQgbm9kZSBmcm9tIHRoZSB0ZW1wbGF0ZS5cbiAgICAgICAgLy8gTk9URSwgU2hhZHlDU1MgY3JlYXRlcyBpdHMgb3duIHN0eWxlIHNvIHdlIGNhbiBzYWZlbHkgYWRkL3JlbW92ZVxuICAgICAgICAvLyBgY29uZGVuc2VkU3R5bGVgIGhlcmUuXG4gICAgICAgIHRlbXBsYXRlLmVsZW1lbnQuY29udGVudC5pbnNlcnRCZWZvcmUoY29uZGVuc2VkU3R5bGUsIHRlbXBsYXRlLmVsZW1lbnQuY29udGVudC5maXJzdENoaWxkKTtcbiAgICAgICAgY29uc3QgcmVtb3ZlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgcmVtb3Zlcy5hZGQoY29uZGVuc2VkU3R5bGUpO1xuICAgICAgICByZW1vdmVOb2Rlc0Zyb21UZW1wbGF0ZSh0ZW1wbGF0ZSwgcmVtb3Zlcyk7XG4gICAgfVxufTtcbi8qKlxuICogRXh0ZW5zaW9uIHRvIHRoZSBzdGFuZGFyZCBgcmVuZGVyYCBtZXRob2Qgd2hpY2ggc3VwcG9ydHMgcmVuZGVyaW5nXG4gKiB0byBTaGFkb3dSb290cyB3aGVuIHRoZSBTaGFkeURPTSAoaHR0cHM6Ly9naXRodWIuY29tL3dlYmNvbXBvbmVudHMvc2hhZHlkb20pXG4gKiBhbmQgU2hhZHlDU1MgKGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJjb21wb25lbnRzL3NoYWR5Y3NzKSBwb2x5ZmlsbHMgYXJlIHVzZWRcbiAqIG9yIHdoZW4gdGhlIHdlYmNvbXBvbmVudHNqc1xuICogKGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJjb21wb25lbnRzL3dlYmNvbXBvbmVudHNqcykgcG9seWZpbGwgaXMgdXNlZC5cbiAqXG4gKiBBZGRzIGEgYHNjb3BlTmFtZWAgb3B0aW9uIHdoaWNoIGlzIHVzZWQgdG8gc2NvcGUgZWxlbWVudCBET00gYW5kIHN0eWxlc2hlZXRzXG4gKiB3aGVuIG5hdGl2ZSBTaGFkb3dET00gaXMgdW5hdmFpbGFibGUuIFRoZSBgc2NvcGVOYW1lYCB3aWxsIGJlIGFkZGVkIHRvXG4gKiB0aGUgY2xhc3MgYXR0cmlidXRlIG9mIGFsbCByZW5kZXJlZCBET00uIEluIGFkZGl0aW9uLCBhbnkgc3R5bGUgZWxlbWVudHMgd2lsbFxuICogYmUgYXV0b21hdGljYWxseSByZS13cml0dGVuIHdpdGggdGhpcyBgc2NvcGVOYW1lYCBzZWxlY3RvciBhbmQgbW92ZWQgb3V0XG4gKiBvZiB0aGUgcmVuZGVyZWQgRE9NIGFuZCBpbnRvIHRoZSBkb2N1bWVudCBgPGhlYWQ+YC5cbiAqXG4gKiBJdCBpcyBjb21tb24gdG8gdXNlIHRoaXMgcmVuZGVyIG1ldGhvZCBpbiBjb25qdW5jdGlvbiB3aXRoIGEgY3VzdG9tIGVsZW1lbnRcbiAqIHdoaWNoIHJlbmRlcnMgYSBzaGFkb3dSb290LiBXaGVuIHRoaXMgaXMgZG9uZSwgdHlwaWNhbGx5IHRoZSBlbGVtZW50J3NcbiAqIGBsb2NhbE5hbWVgIHNob3VsZCBiZSB1c2VkIGFzIHRoZSBgc2NvcGVOYW1lYC5cbiAqXG4gKiBJbiBhZGRpdGlvbiB0byBET00gc2NvcGluZywgU2hhZHlDU1MgYWxzbyBzdXBwb3J0cyBhIGJhc2ljIHNoaW0gZm9yIGNzc1xuICogY3VzdG9tIHByb3BlcnRpZXMgKG5lZWRlZCBvbmx5IG9uIG9sZGVyIGJyb3dzZXJzIGxpa2UgSUUxMSkgYW5kIGEgc2hpbSBmb3JcbiAqIGEgZGVwcmVjYXRlZCBmZWF0dXJlIGNhbGxlZCBgQGFwcGx5YCB0aGF0IHN1cHBvcnRzIGFwcGx5aW5nIGEgc2V0IG9mIGNzc1xuICogY3VzdG9tIHByb3BlcnRpZXMgdG8gYSBnaXZlbiBsb2NhdGlvbi5cbiAqXG4gKiBVc2FnZSBjb25zaWRlcmF0aW9uczpcbiAqXG4gKiAqIFBhcnQgdmFsdWVzIGluIGA8c3R5bGU+YCBlbGVtZW50cyBhcmUgb25seSBhcHBsaWVkIHRoZSBmaXJzdCB0aW1lIGEgZ2l2ZW5cbiAqIGBzY29wZU5hbWVgIHJlbmRlcnMuIFN1YnNlcXVlbnQgY2hhbmdlcyB0byBwYXJ0cyBpbiBzdHlsZSBlbGVtZW50cyB3aWxsIGhhdmVcbiAqIG5vIGVmZmVjdC4gQmVjYXVzZSBvZiB0aGlzLCBwYXJ0cyBpbiBzdHlsZSBlbGVtZW50cyBzaG91bGQgb25seSBiZSB1c2VkIGZvclxuICogdmFsdWVzIHRoYXQgd2lsbCBuZXZlciBjaGFuZ2UsIGZvciBleGFtcGxlIHBhcnRzIHRoYXQgc2V0IHNjb3BlLXdpZGUgdGhlbWVcbiAqIHZhbHVlcyBvciBwYXJ0cyB3aGljaCByZW5kZXIgc2hhcmVkIHN0eWxlIGVsZW1lbnRzLlxuICpcbiAqICogTm90ZSwgZHVlIHRvIGEgbGltaXRhdGlvbiBvZiB0aGUgU2hhZHlET00gcG9seWZpbGwsIHJlbmRlcmluZyBpbiBhXG4gKiBjdXN0b20gZWxlbWVudCdzIGBjb25zdHJ1Y3RvcmAgaXMgbm90IHN1cHBvcnRlZC4gSW5zdGVhZCByZW5kZXJpbmcgc2hvdWxkXG4gKiBlaXRoZXIgZG9uZSBhc3luY2hyb25vdXNseSwgZm9yIGV4YW1wbGUgYXQgbWljcm90YXNrIHRpbWluZyAoZm9yIGV4YW1wbGVcbiAqIGBQcm9taXNlLnJlc29sdmUoKWApLCBvciBiZSBkZWZlcnJlZCB1bnRpbCB0aGUgZmlyc3QgdGltZSB0aGUgZWxlbWVudCdzXG4gKiBgY29ubmVjdGVkQ2FsbGJhY2tgIHJ1bnMuXG4gKlxuICogVXNhZ2UgY29uc2lkZXJhdGlvbnMgd2hlbiB1c2luZyBzaGltbWVkIGN1c3RvbSBwcm9wZXJ0aWVzIG9yIGBAYXBwbHlgOlxuICpcbiAqICogV2hlbmV2ZXIgYW55IGR5bmFtaWMgY2hhbmdlcyBhcmUgbWFkZSB3aGljaCBhZmZlY3RcbiAqIGNzcyBjdXN0b20gcHJvcGVydGllcywgYFNoYWR5Q1NTLnN0eWxlRWxlbWVudChlbGVtZW50KWAgbXVzdCBiZSBjYWxsZWRcbiAqIHRvIHVwZGF0ZSB0aGUgZWxlbWVudC4gVGhlcmUgYXJlIHR3byBjYXNlcyB3aGVuIHRoaXMgaXMgbmVlZGVkOlxuICogKDEpIHRoZSBlbGVtZW50IGlzIGNvbm5lY3RlZCB0byBhIG5ldyBwYXJlbnQsICgyKSBhIGNsYXNzIGlzIGFkZGVkIHRvIHRoZVxuICogZWxlbWVudCB0aGF0IGNhdXNlcyBpdCB0byBtYXRjaCBkaWZmZXJlbnQgY3VzdG9tIHByb3BlcnRpZXMuXG4gKiBUbyBhZGRyZXNzIHRoZSBmaXJzdCBjYXNlIHdoZW4gcmVuZGVyaW5nIGEgY3VzdG9tIGVsZW1lbnQsIGBzdHlsZUVsZW1lbnRgXG4gKiBzaG91bGQgYmUgY2FsbGVkIGluIHRoZSBlbGVtZW50J3MgYGNvbm5lY3RlZENhbGxiYWNrYC5cbiAqXG4gKiAqIFNoaW1tZWQgY3VzdG9tIHByb3BlcnRpZXMgbWF5IG9ubHkgYmUgZGVmaW5lZCBlaXRoZXIgZm9yIGFuIGVudGlyZVxuICogc2hhZG93Um9vdCAoZm9yIGV4YW1wbGUsIGluIGEgYDpob3N0YCBydWxlKSBvciB2aWEgYSBydWxlIHRoYXQgZGlyZWN0bHlcbiAqIG1hdGNoZXMgYW4gZWxlbWVudCB3aXRoIGEgc2hhZG93Um9vdC4gSW4gb3RoZXIgd29yZHMsIGluc3RlYWQgb2YgZmxvd2luZyBmcm9tXG4gKiBwYXJlbnQgdG8gY2hpbGQgYXMgZG8gbmF0aXZlIGNzcyBjdXN0b20gcHJvcGVydGllcywgc2hpbW1lZCBjdXN0b20gcHJvcGVydGllc1xuICogZmxvdyBvbmx5IGZyb20gc2hhZG93Um9vdHMgdG8gbmVzdGVkIHNoYWRvd1Jvb3RzLlxuICpcbiAqICogV2hlbiB1c2luZyBgQGFwcGx5YCBtaXhpbmcgY3NzIHNob3J0aGFuZCBwcm9wZXJ0eSBuYW1lcyB3aXRoXG4gKiBub24tc2hvcnRoYW5kIG5hbWVzIChmb3IgZXhhbXBsZSBgYm9yZGVyYCBhbmQgYGJvcmRlci13aWR0aGApIGlzIG5vdFxuICogc3VwcG9ydGVkLlxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKHJlc3VsdCwgY29udGFpbmVyLCBvcHRpb25zKSA9PiB7XG4gICAgY29uc3Qgc2NvcGVOYW1lID0gb3B0aW9ucy5zY29wZU5hbWU7XG4gICAgY29uc3QgaGFzUmVuZGVyZWQgPSBwYXJ0cy5oYXMoY29udGFpbmVyKTtcbiAgICBjb25zdCBuZWVkc1Njb3BpbmcgPSBjb250YWluZXIgaW5zdGFuY2VvZiBTaGFkb3dSb290ICYmXG4gICAgICAgIGNvbXBhdGlibGVTaGFkeUNTU1ZlcnNpb24gJiYgcmVzdWx0IGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQ7XG4gICAgLy8gSGFuZGxlIGZpcnN0IHJlbmRlciB0byBhIHNjb3BlIHNwZWNpYWxseS4uLlxuICAgIGNvbnN0IGZpcnN0U2NvcGVSZW5kZXIgPSBuZWVkc1Njb3BpbmcgJiYgIXNoYWR5UmVuZGVyU2V0LmhhcyhzY29wZU5hbWUpO1xuICAgIC8vIE9uIGZpcnN0IHNjb3BlIHJlbmRlciwgcmVuZGVyIGludG8gYSBmcmFnbWVudDsgdGhpcyBjYW5ub3QgYmUgYSBzaW5nbGVcbiAgICAvLyBmcmFnbWVudCB0aGF0IGlzIHJldXNlZCBzaW5jZSBuZXN0ZWQgcmVuZGVycyBjYW4gb2NjdXIgc3luY2hyb25vdXNseS5cbiAgICBjb25zdCByZW5kZXJDb250YWluZXIgPSBmaXJzdFNjb3BlUmVuZGVyID8gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpIDogY29udGFpbmVyO1xuICAgIGxpdFJlbmRlcihyZXN1bHQsIHJlbmRlckNvbnRhaW5lciwgT2JqZWN0LmFzc2lnbih7IHRlbXBsYXRlRmFjdG9yeTogc2hhZHlUZW1wbGF0ZUZhY3Rvcnkoc2NvcGVOYW1lKSB9LCBvcHRpb25zKSk7XG4gICAgLy8gV2hlbiBwZXJmb3JtaW5nIGZpcnN0IHNjb3BlIHJlbmRlcixcbiAgICAvLyAoMSkgV2UndmUgcmVuZGVyZWQgaW50byBhIGZyYWdtZW50IHNvIHRoYXQgdGhlcmUncyBhIGNoYW5jZSB0b1xuICAgIC8vIGBwcmVwYXJlVGVtcGxhdGVTdHlsZXNgIGJlZm9yZSBzdWItZWxlbWVudHMgaGl0IHRoZSBET01cbiAgICAvLyAod2hpY2ggbWlnaHQgY2F1c2UgdGhlbSB0byByZW5kZXIgYmFzZWQgb24gYSBjb21tb24gcGF0dGVybiBvZlxuICAgIC8vIHJlbmRlcmluZyBpbiBhIGN1c3RvbSBlbGVtZW50J3MgYGNvbm5lY3RlZENhbGxiYWNrYCk7XG4gICAgLy8gKDIpIFNjb3BlIHRoZSB0ZW1wbGF0ZSB3aXRoIFNoYWR5Q1NTIG9uZSB0aW1lIG9ubHkgZm9yIHRoaXMgc2NvcGUuXG4gICAgLy8gKDMpIFJlbmRlciB0aGUgZnJhZ21lbnQgaW50byB0aGUgY29udGFpbmVyIGFuZCBtYWtlIHN1cmUgdGhlXG4gICAgLy8gY29udGFpbmVyIGtub3dzIGl0cyBgcGFydGAgaXMgdGhlIG9uZSB3ZSBqdXN0IHJlbmRlcmVkLiBUaGlzIGVuc3VyZXNcbiAgICAvLyBET00gd2lsbCBiZSByZS11c2VkIG9uIHN1YnNlcXVlbnQgcmVuZGVycy5cbiAgICBpZiAoZmlyc3RTY29wZVJlbmRlcikge1xuICAgICAgICBjb25zdCBwYXJ0ID0gcGFydHMuZ2V0KHJlbmRlckNvbnRhaW5lcik7XG4gICAgICAgIHBhcnRzLmRlbGV0ZShyZW5kZXJDb250YWluZXIpO1xuICAgICAgICBpZiAocGFydC52YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHByZXBhcmVUZW1wbGF0ZVN0eWxlcyhyZW5kZXJDb250YWluZXIsIHBhcnQudmFsdWUudGVtcGxhdGUsIHNjb3BlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVtb3ZlTm9kZXMoY29udGFpbmVyLCBjb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyZW5kZXJDb250YWluZXIpO1xuICAgICAgICBwYXJ0cy5zZXQoY29udGFpbmVyLCBwYXJ0KTtcbiAgICB9XG4gICAgLy8gQWZ0ZXIgZWxlbWVudHMgaGF2ZSBoaXQgdGhlIERPTSwgdXBkYXRlIHN0eWxpbmcgaWYgdGhpcyBpcyB0aGVcbiAgICAvLyBpbml0aWFsIHJlbmRlciB0byB0aGlzIGNvbnRhaW5lci5cbiAgICAvLyBUaGlzIGlzIG5lZWRlZCB3aGVuZXZlciBkeW5hbWljIGNoYW5nZXMgYXJlIG1hZGUgc28gaXQgd291bGQgYmVcbiAgICAvLyBzYWZlc3QgdG8gZG8gZXZlcnkgcmVuZGVyOyBob3dldmVyLCB0aGlzIHdvdWxkIHJlZ3Jlc3MgcGVyZm9ybWFuY2VcbiAgICAvLyBzbyB3ZSBsZWF2ZSBpdCB1cCB0byB0aGUgdXNlciB0byBjYWxsIGBTaGFkeUNTU1Muc3R5bGVFbGVtZW50YFxuICAgIC8vIGZvciBkeW5hbWljIGNoYW5nZXMuXG4gICAgaWYgKCFoYXNSZW5kZXJlZCAmJiBuZWVkc1Njb3BpbmcpIHtcbiAgICAgICAgd2luZG93LlNoYWR5Q1NTLnN0eWxlRWxlbWVudChjb250YWluZXIuaG9zdCk7XG4gICAgfVxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNoYWR5LXJlbmRlci5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIFdoZW4gdXNpbmcgQ2xvc3VyZSBDb21waWxlciwgSlNDb21waWxlcl9yZW5hbWVQcm9wZXJ0eShwcm9wZXJ0eSwgb2JqZWN0KSBpc1xuICogcmVwbGFjZWQgYXQgY29tcGlsZSB0aW1lIGJ5IHRoZSBtdW5nZWQgbmFtZSBmb3Igb2JqZWN0W3Byb3BlcnR5XS4gV2UgY2Fubm90XG4gKiBhbGlhcyB0aGlzIGZ1bmN0aW9uLCBzbyB3ZSBoYXZlIHRvIHVzZSBhIHNtYWxsIHNoaW0gdGhhdCBoYXMgdGhlIHNhbWVcbiAqIGJlaGF2aW9yIHdoZW4gbm90IGNvbXBpbGluZy5cbiAqL1xud2luZG93LkpTQ29tcGlsZXJfcmVuYW1lUHJvcGVydHkgPVxuICAgIChwcm9wLCBfb2JqKSA9PiBwcm9wO1xuZXhwb3J0IGNvbnN0IGRlZmF1bHRDb252ZXJ0ZXIgPSB7XG4gICAgdG9BdHRyaWJ1dGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIEJvb2xlYW46XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID8gJycgOiBudWxsO1xuICAgICAgICAgICAgY2FzZSBPYmplY3Q6XG4gICAgICAgICAgICBjYXNlIEFycmF5OlxuICAgICAgICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBpcyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgcGFzcyB0aGlzIHRocm91Z2hcbiAgICAgICAgICAgICAgICAvLyB0byBhbGxvdyByZW1vdmluZy9ubyBjaGFuZ2UgYmVoYXZpb3IuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyB2YWx1ZSA6IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICBmcm9tQXR0cmlidXRlKHZhbHVlLCB0eXBlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBCb29sZWFuOlxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAhPT0gbnVsbDtcbiAgICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IG51bGwgOiBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgY2FzZSBPYmplY3Q6XG4gICAgICAgICAgICBjYXNlIEFycmF5OlxuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufTtcbi8qKlxuICogQ2hhbmdlIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0cnVlIGlmIGB2YWx1ZWAgaXMgZGlmZmVyZW50IGZyb20gYG9sZFZhbHVlYC5cbiAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgYXMgdGhlIGRlZmF1bHQgZm9yIGEgcHJvcGVydHkncyBgaGFzQ2hhbmdlZGAgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBjb25zdCBub3RFcXVhbCA9ICh2YWx1ZSwgb2xkKSA9PiB7XG4gICAgLy8gVGhpcyBlbnN1cmVzIChvbGQ9PU5hTiwgdmFsdWU9PU5hTikgYWx3YXlzIHJldHVybnMgZmFsc2VcbiAgICByZXR1cm4gb2xkICE9PSB2YWx1ZSAmJiAob2xkID09PSBvbGQgfHwgdmFsdWUgPT09IHZhbHVlKTtcbn07XG5jb25zdCBkZWZhdWx0UHJvcGVydHlEZWNsYXJhdGlvbiA9IHtcbiAgICBhdHRyaWJ1dGU6IHRydWUsXG4gICAgdHlwZTogU3RyaW5nLFxuICAgIGNvbnZlcnRlcjogZGVmYXVsdENvbnZlcnRlcixcbiAgICByZWZsZWN0OiBmYWxzZSxcbiAgICBoYXNDaGFuZ2VkOiBub3RFcXVhbFxufTtcbmNvbnN0IG1pY3JvdGFza1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG5jb25zdCBTVEFURV9IQVNfVVBEQVRFRCA9IDE7XG5jb25zdCBTVEFURV9VUERBVEVfUkVRVUVTVEVEID0gMSA8PCAyO1xuY29uc3QgU1RBVEVfSVNfUkVGTEVDVElOR19UT19BVFRSSUJVVEUgPSAxIDw8IDM7XG5jb25zdCBTVEFURV9JU19SRUZMRUNUSU5HX1RPX1BST1BFUlRZID0gMSA8PCA0O1xuY29uc3QgU1RBVEVfSEFTX0NPTk5FQ1RFRCA9IDEgPDwgNTtcbi8qKlxuICogQmFzZSBlbGVtZW50IGNsYXNzIHdoaWNoIG1hbmFnZXMgZWxlbWVudCBwcm9wZXJ0aWVzIGFuZCBhdHRyaWJ1dGVzLiBXaGVuXG4gKiBwcm9wZXJ0aWVzIGNoYW5nZSwgdGhlIGB1cGRhdGVgIG1ldGhvZCBpcyBhc3luY2hyb25vdXNseSBjYWxsZWQuIFRoaXMgbWV0aG9kXG4gKiBzaG91bGQgYmUgc3VwcGxpZWQgYnkgc3ViY2xhc3NlcnMgdG8gcmVuZGVyIHVwZGF0ZXMgYXMgZGVzaXJlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFVwZGF0aW5nRWxlbWVudCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSAwO1xuICAgICAgICB0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3VwZGF0ZVByb21pc2UgPSBtaWNyb3Rhc2tQcm9taXNlO1xuICAgICAgICB0aGlzLl9oYXNDb25uZWN0ZWRSZXNvbHZlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1hcCB3aXRoIGtleXMgZm9yIGFueSBwcm9wZXJ0aWVzIHRoYXQgaGF2ZSBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0XG4gICAgICAgICAqIHVwZGF0ZSBjeWNsZSB3aXRoIHByZXZpb3VzIHZhbHVlcy5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2NoYW5nZWRQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFwIHdpdGgga2V5cyBvZiBwcm9wZXJ0aWVzIHRoYXQgc2hvdWxkIGJlIHJlZmxlY3RlZCB3aGVuIHVwZGF0ZWQuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsaXN0IG9mIGF0dHJpYnV0ZXMgY29ycmVzcG9uZGluZyB0byB0aGUgcmVnaXN0ZXJlZCBwcm9wZXJ0aWVzLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7XG4gICAgICAgIC8vIG5vdGU6IHBpZ2d5IGJhY2tpbmcgb24gdGhpcyB0byBlbnN1cmUgd2UncmUgZmluYWxpemVkLlxuICAgICAgICB0aGlzLmZpbmFsaXplKCk7XG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBbXTtcbiAgICAgICAgLy8gVXNlIGZvckVhY2ggc28gdGhpcyB3b3JrcyBldmVuIGlmIGZvci9vZiBsb29wcyBhcmUgY29tcGlsZWQgdG8gZm9yIGxvb3BzXG4gICAgICAgIC8vIGV4cGVjdGluZyBhcnJheXNcbiAgICAgICAgdGhpcy5fY2xhc3NQcm9wZXJ0aWVzLmZvckVhY2goKHYsIHApID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzLl9hdHRyaWJ1dGVOYW1lRm9yUHJvcGVydHkocCwgdik7XG4gICAgICAgICAgICBpZiAoYXR0ciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cmlidXRlVG9Qcm9wZXJ0eU1hcC5zZXQoYXR0ciwgcCk7XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlcy5wdXNoKGF0dHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZXMgdGhlIHByaXZhdGUgYF9jbGFzc1Byb3BlcnRpZXNgIHByb3BlcnR5IG1ldGFkYXRhIGlzIGNyZWF0ZWQuXG4gICAgICogSW4gYWRkaXRpb24gdG8gYGZpbmFsaXplYCB0aGlzIGlzIGFsc28gY2FsbGVkIGluIGBjcmVhdGVQcm9wZXJ0eWAgdG9cbiAgICAgKiBlbnN1cmUgdGhlIGBAcHJvcGVydHlgIGRlY29yYXRvciBjYW4gYWRkIHByb3BlcnR5IG1ldGFkYXRhLlxuICAgICAqL1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHN0YXRpYyBfZW5zdXJlQ2xhc3NQcm9wZXJ0aWVzKCkge1xuICAgICAgICAvLyBlbnN1cmUgcHJpdmF0ZSBzdG9yYWdlIGZvciBwcm9wZXJ0eSBkZWNsYXJhdGlvbnMuXG4gICAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShKU0NvbXBpbGVyX3JlbmFtZVByb3BlcnR5KCdfY2xhc3NQcm9wZXJ0aWVzJywgdGhpcykpKSB7XG4gICAgICAgICAgICB0aGlzLl9jbGFzc1Byb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICAvLyBOT1RFOiBXb3JrYXJvdW5kIElFMTEgbm90IHN1cHBvcnRpbmcgTWFwIGNvbnN0cnVjdG9yIGFyZ3VtZW50LlxuICAgICAgICAgICAgY29uc3Qgc3VwZXJQcm9wZXJ0aWVzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLl9jbGFzc1Byb3BlcnRpZXM7XG4gICAgICAgICAgICBpZiAoc3VwZXJQcm9wZXJ0aWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBzdXBlclByb3BlcnRpZXMuZm9yRWFjaCgodiwgaykgPT4gdGhpcy5fY2xhc3NQcm9wZXJ0aWVzLnNldChrLCB2KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHByb3BlcnR5IGFjY2Vzc29yIG9uIHRoZSBlbGVtZW50IHByb3RvdHlwZSBpZiBvbmUgZG9lcyBub3QgZXhpc3QuXG4gICAgICogVGhlIHByb3BlcnR5IHNldHRlciBjYWxscyB0aGUgcHJvcGVydHkncyBgaGFzQ2hhbmdlZGAgcHJvcGVydHkgb3B0aW9uXG4gICAgICogb3IgdXNlcyBhIHN0cmljdCBpZGVudGl0eSBjaGVjayB0byBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgdG8gcmVxdWVzdFxuICAgICAqIGFuIHVwZGF0ZS5cbiAgICAgKiBAbm9jb2xsYXBzZVxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVQcm9wZXJ0eShuYW1lLCBvcHRpb25zID0gZGVmYXVsdFByb3BlcnR5RGVjbGFyYXRpb24pIHtcbiAgICAgICAgLy8gTm90ZSwgc2luY2UgdGhpcyBjYW4gYmUgY2FsbGVkIGJ5IHRoZSBgQHByb3BlcnR5YCBkZWNvcmF0b3Igd2hpY2hcbiAgICAgICAgLy8gaXMgY2FsbGVkIGJlZm9yZSBgZmluYWxpemVgLCB3ZSBlbnN1cmUgc3RvcmFnZSBleGlzdHMgZm9yIHByb3BlcnR5XG4gICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICB0aGlzLl9lbnN1cmVDbGFzc1Byb3BlcnRpZXMoKTtcbiAgICAgICAgdGhpcy5fY2xhc3NQcm9wZXJ0aWVzLnNldChuYW1lLCBvcHRpb25zKTtcbiAgICAgICAgLy8gRG8gbm90IGdlbmVyYXRlIGFuIGFjY2Vzc29yIGlmIHRoZSBwcm90b3R5cGUgYWxyZWFkeSBoYXMgb25lLCBzaW5jZVxuICAgICAgICAvLyBpdCB3b3VsZCBiZSBsb3N0IG90aGVyd2lzZSBhbmQgdGhhdCB3b3VsZCBuZXZlciBiZSB0aGUgdXNlcidzIGludGVudGlvbjtcbiAgICAgICAgLy8gSW5zdGVhZCwgd2UgZXhwZWN0IHVzZXJzIHRvIGNhbGwgYHJlcXVlc3RVcGRhdGVgIHRoZW1zZWx2ZXMgZnJvbVxuICAgICAgICAvLyB1c2VyLWRlZmluZWQgYWNjZXNzb3JzLiBOb3RlIHRoYXQgaWYgdGhlIHN1cGVyIGhhcyBhbiBhY2Nlc3NvciB3ZSB3aWxsXG4gICAgICAgIC8vIHN0aWxsIG92ZXJ3cml0ZSBpdFxuICAgICAgICBpZiAob3B0aW9ucy5ub0FjY2Vzc29yIHx8IHRoaXMucHJvdG90eXBlLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5ID0gdHlwZW9mIG5hbWUgPT09ICdzeW1ib2wnID8gU3ltYm9sKCkgOiBgX18ke25hbWV9YDtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMucHJvdG90eXBlLCBuYW1lLCB7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55IG5vIHN5bWJvbCBpbiBpbmRleFxuICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgbm8gc3ltYm9sIGluIGluZGV4XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55IG5vIHN5bWJvbCBpbiBpbmRleFxuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55IG5vIHN5bWJvbCBpbiBpbmRleFxuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdFVwZGF0ZShuYW1lLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBwcm9wZXJ0eSBhY2Nlc3NvcnMgZm9yIHJlZ2lzdGVyZWQgcHJvcGVydGllcyBhbmQgZW5zdXJlc1xuICAgICAqIGFueSBzdXBlcmNsYXNzZXMgYXJlIGFsc28gZmluYWxpemVkLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIGZpbmFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShKU0NvbXBpbGVyX3JlbmFtZVByb3BlcnR5KCdmaW5hbGl6ZWQnLCB0aGlzKSkgJiZcbiAgICAgICAgICAgIHRoaXMuZmluYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluYWxpemUgYW55IHN1cGVyY2xhc3Nlc1xuICAgICAgICBjb25zdCBzdXBlckN0b3IgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG4gICAgICAgIGlmICh0eXBlb2Ygc3VwZXJDdG9yLmZpbmFsaXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBzdXBlckN0b3IuZmluYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2Vuc3VyZUNsYXNzUHJvcGVydGllcygpO1xuICAgICAgICAvLyBpbml0aWFsaXplIE1hcCBwb3B1bGF0ZWQgaW4gb2JzZXJ2ZWRBdHRyaWJ1dGVzXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZVRvUHJvcGVydHlNYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgIC8vIG1ha2UgYW55IHByb3BlcnRpZXNcbiAgICAgICAgLy8gTm90ZSwgb25seSBwcm9jZXNzIFwib3duXCIgcHJvcGVydGllcyBzaW5jZSB0aGlzIGVsZW1lbnQgd2lsbCBpbmhlcml0XG4gICAgICAgIC8vIGFueSBwcm9wZXJ0aWVzIGRlZmluZWQgb24gdGhlIHN1cGVyQ2xhc3MsIGFuZCBmaW5hbGl6YXRpb24gZW5zdXJlc1xuICAgICAgICAvLyB0aGUgZW50aXJlIHByb3RvdHlwZSBjaGFpbiBpcyBmaW5hbGl6ZWQuXG4gICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KEpTQ29tcGlsZXJfcmVuYW1lUHJvcGVydHkoJ3Byb3BlcnRpZXMnLCB0aGlzKSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wZXJ0aWVzO1xuICAgICAgICAgICAgLy8gc3VwcG9ydCBzeW1ib2xzIGluIHByb3BlcnRpZXMgKElFMTEgZG9lcyBub3Qgc3VwcG9ydCB0aGlzKVxuICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBbXG4gICAgICAgICAgICAgICAgLi4uT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvcHMpLFxuICAgICAgICAgICAgICAgIC4uLih0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHByb3BzKSA6XG4gICAgICAgICAgICAgICAgICAgIFtdXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgLy8gVGhpcyBmb3Ivb2YgaXMgb2sgYmVjYXVzZSBwcm9wS2V5cyBpcyBhbiBhcnJheVxuICAgICAgICAgICAgZm9yIChjb25zdCBwIG9mIHByb3BLZXlzKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90ZSwgdXNlIG9mIGBhbnlgIGlzIGR1ZSB0byBUeXBlU3JpcHQgbGFjayBvZiBzdXBwb3J0IGZvciBzeW1ib2wgaW5cbiAgICAgICAgICAgICAgICAvLyBpbmRleCB0eXBlc1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgbm8gc3ltYm9sIGluIGluZGV4XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVQcm9wZXJ0eShwLCBwcm9wc1twXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJvcGVydHkgbmFtZSBmb3IgdGhlIGdpdmVuIGF0dHJpYnV0ZSBgbmFtZWAuXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgX2F0dHJpYnV0ZU5hbWVGb3JQcm9wZXJ0eShuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZSA9IG9wdGlvbnMuYXR0cmlidXRlO1xuICAgICAgICByZXR1cm4gYXR0cmlidXRlID09PSBmYWxzZSA/XG4gICAgICAgICAgICB1bmRlZmluZWQgOlxuICAgICAgICAgICAgKHR5cGVvZiBhdHRyaWJ1dGUgPT09ICdzdHJpbmcnID9cbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgOlxuICAgICAgICAgICAgICAgICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgPyBuYW1lLnRvTG93ZXJDYXNlKCkgOiB1bmRlZmluZWQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGEgcHJvcGVydHkgc2hvdWxkIHJlcXVlc3QgYW4gdXBkYXRlLlxuICAgICAqIENhbGxlZCB3aGVuIGEgcHJvcGVydHkgdmFsdWUgaXMgc2V0IGFuZCB1c2VzIHRoZSBgaGFzQ2hhbmdlZGBcbiAgICAgKiBvcHRpb24gZm9yIHRoZSBwcm9wZXJ0eSBpZiBwcmVzZW50IG9yIGEgc3RyaWN0IGlkZW50aXR5IGNoZWNrLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIF92YWx1ZUhhc0NoYW5nZWQodmFsdWUsIG9sZCwgaGFzQ2hhbmdlZCA9IG5vdEVxdWFsKSB7XG4gICAgICAgIHJldHVybiBoYXNDaGFuZ2VkKHZhbHVlLCBvbGQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAgKiBDYWxsZWQgdmlhIHRoZSBgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrYCBhbmQgdXNlcyB0aGUgcHJvcGVydHknc1xuICAgICAqIGBjb252ZXJ0ZXJgIG9yIGBjb252ZXJ0ZXIuZnJvbUF0dHJpYnV0ZWAgcHJvcGVydHkgb3B0aW9uLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIF9wcm9wZXJ0eVZhbHVlRnJvbUF0dHJpYnV0ZSh2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCB0eXBlID0gb3B0aW9ucy50eXBlO1xuICAgICAgICBjb25zdCBjb252ZXJ0ZXIgPSBvcHRpb25zLmNvbnZlcnRlciB8fCBkZWZhdWx0Q29udmVydGVyO1xuICAgICAgICBjb25zdCBmcm9tQXR0cmlidXRlID0gKHR5cGVvZiBjb252ZXJ0ZXIgPT09ICdmdW5jdGlvbicgPyBjb252ZXJ0ZXIgOiBjb252ZXJ0ZXIuZnJvbUF0dHJpYnV0ZSk7XG4gICAgICAgIHJldHVybiBmcm9tQXR0cmlidXRlID8gZnJvbUF0dHJpYnV0ZSh2YWx1ZSwgdHlwZSkgOiB2YWx1ZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciB0aGUgZ2l2ZW4gcHJvcGVydHkgdmFsdWUuIElmIHRoaXNcbiAgICAgKiByZXR1cm5zIHVuZGVmaW5lZCwgdGhlIHByb3BlcnR5IHdpbGwgKm5vdCogYmUgcmVmbGVjdGVkIHRvIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBJZiB0aGlzIHJldHVybnMgbnVsbCwgdGhlIGF0dHJpYnV0ZSB3aWxsIGJlIHJlbW92ZWQsIG90aGVyd2lzZSB0aGVcbiAgICAgKiBhdHRyaWJ1dGUgd2lsbCBiZSBzZXQgdG8gdGhlIHZhbHVlLlxuICAgICAqIFRoaXMgdXNlcyB0aGUgcHJvcGVydHkncyBgcmVmbGVjdGAgYW5kIGB0eXBlLnRvQXR0cmlidXRlYCBwcm9wZXJ0eSBvcHRpb25zLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIF9wcm9wZXJ0eVZhbHVlVG9BdHRyaWJ1dGUodmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMucmVmbGVjdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHlwZSA9IG9wdGlvbnMudHlwZTtcbiAgICAgICAgY29uc3QgY29udmVydGVyID0gb3B0aW9ucy5jb252ZXJ0ZXI7XG4gICAgICAgIGNvbnN0IHRvQXR0cmlidXRlID0gY29udmVydGVyICYmIGNvbnZlcnRlci50b0F0dHJpYnV0ZSB8fFxuICAgICAgICAgICAgZGVmYXVsdENvbnZlcnRlci50b0F0dHJpYnV0ZTtcbiAgICAgICAgcmV0dXJuIHRvQXR0cmlidXRlKHZhbHVlLCB0eXBlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgZWxlbWVudCBpbml0aWFsaXphdGlvbi4gQnkgZGVmYXVsdCBjYXB0dXJlcyBhbnkgcHJlLXNldCB2YWx1ZXMgZm9yXG4gICAgICogcmVnaXN0ZXJlZCBwcm9wZXJ0aWVzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMuX3NhdmVJbnN0YW5jZVByb3BlcnRpZXMoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRml4ZXMgYW55IHByb3BlcnRpZXMgc2V0IG9uIHRoZSBpbnN0YW5jZSBiZWZvcmUgdXBncmFkZSB0aW1lLlxuICAgICAqIE90aGVyd2lzZSB0aGVzZSB3b3VsZCBzaGFkb3cgdGhlIGFjY2Vzc29yIGFuZCBicmVhayB0aGVzZSBwcm9wZXJ0aWVzLlxuICAgICAqIFRoZSBwcm9wZXJ0aWVzIGFyZSBzdG9yZWQgaW4gYSBNYXAgd2hpY2ggaXMgcGxheWVkIGJhY2sgYWZ0ZXIgdGhlXG4gICAgICogY29uc3RydWN0b3IgcnVucy4gTm90ZSwgb24gdmVyeSBvbGQgdmVyc2lvbnMgb2YgU2FmYXJpICg8PTkpIG9yIENocm9tZVxuICAgICAqICg8PTQxKSwgcHJvcGVydGllcyBjcmVhdGVkIGZvciBuYXRpdmUgcGxhdGZvcm0gcHJvcGVydGllcyBsaWtlIChgaWRgIG9yXG4gICAgICogYG5hbWVgKSBtYXkgbm90IGhhdmUgZGVmYXVsdCB2YWx1ZXMgc2V0IGluIHRoZSBlbGVtZW50IGNvbnN0cnVjdG9yLiBPblxuICAgICAqIHRoZXNlIGJyb3dzZXJzIG5hdGl2ZSBwcm9wZXJ0aWVzIGFwcGVhciBvbiBpbnN0YW5jZXMgYW5kIHRoZXJlZm9yZSB0aGVpclxuICAgICAqIGRlZmF1bHQgdmFsdWUgd2lsbCBvdmVyd3JpdGUgYW55IGVsZW1lbnQgZGVmYXVsdCAoZS5nLiBpZiB0aGUgZWxlbWVudCBzZXRzXG4gICAgICogdGhpcy5pZCA9ICdpZCcgaW4gdGhlIGNvbnN0cnVjdG9yLCB0aGUgJ2lkJyB3aWxsIGJlY29tZSAnJyBzaW5jZSB0aGlzIGlzXG4gICAgICogdGhlIG5hdGl2ZSBwbGF0Zm9ybSBkZWZhdWx0KS5cbiAgICAgKi9cbiAgICBfc2F2ZUluc3RhbmNlUHJvcGVydGllcygpIHtcbiAgICAgICAgLy8gVXNlIGZvckVhY2ggc28gdGhpcyB3b3JrcyBldmVuIGlmIGZvci9vZiBsb29wcyBhcmUgY29tcGlsZWQgdG8gZm9yIGxvb3BzXG4gICAgICAgIC8vIGV4cGVjdGluZyBhcnJheXNcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclxuICAgICAgICAgICAgLl9jbGFzc1Byb3BlcnRpZXMuZm9yRWFjaCgoX3YsIHApID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzW3BdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW3BdO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlUHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzLnNldChwLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHByZXZpb3VzbHkgc2F2ZWQgaW5zdGFuY2UgcHJvcGVydGllcy5cbiAgICAgKi9cbiAgICBfYXBwbHlJbnN0YW5jZVByb3BlcnRpZXMoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JFYWNoIHNvIHRoaXMgd29ya3MgZXZlbiBpZiBmb3Ivb2YgbG9vcHMgYXJlIGNvbXBpbGVkIHRvIGZvciBsb29wc1xuICAgICAgICAvLyBleHBlY3RpbmcgYXJyYXlzXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgdGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzLmZvckVhY2goKHYsIHApID0+IHRoaXNbcF0gPSB2KTtcbiAgICAgICAgdGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSB8IFNUQVRFX0hBU19DT05ORUNURUQ7XG4gICAgICAgIC8vIEVuc3VyZSBjb25uZWN0aW9uIHRyaWdnZXJzIGFuIHVwZGF0ZS4gVXBkYXRlcyBjYW5ub3QgY29tcGxldGUgYmVmb3JlXG4gICAgICAgIC8vIGNvbm5lY3Rpb24gYW5kIGlmIG9uZSBpcyBwZW5kaW5nIGNvbm5lY3Rpb24gdGhlIGBfaGFzQ29ubmVjdGlvblJlc29sdmVyYFxuICAgICAgICAvLyB3aWxsIGV4aXN0LiBJZiBzbywgcmVzb2x2ZSBpdCB0byBjb21wbGV0ZSB0aGUgdXBkYXRlLCBvdGhlcndpc2VcbiAgICAgICAgLy8gcmVxdWVzdFVwZGF0ZS5cbiAgICAgICAgaWYgKHRoaXMuX2hhc0Nvbm5lY3RlZFJlc29sdmVyKSB7XG4gICAgICAgICAgICB0aGlzLl9oYXNDb25uZWN0ZWRSZXNvbHZlcigpO1xuICAgICAgICAgICAgdGhpcy5faGFzQ29ubmVjdGVkUmVzb2x2ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbGxvd3MgZm9yIGBzdXBlci5kaXNjb25uZWN0ZWRDYWxsYmFjaygpYCBpbiBleHRlbnNpb25zIHdoaWxlXG4gICAgICogcmVzZXJ2aW5nIHRoZSBwb3NzaWJpbGl0eSBvZiBtYWtpbmcgbm9uLWJyZWFraW5nIGZlYXR1cmUgYWRkaXRpb25zXG4gICAgICogd2hlbiBkaXNjb25uZWN0aW5nIGF0IHNvbWUgcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAgICAgKi9cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3luY2hyb25pemVzIHByb3BlcnR5IHZhbHVlcyB3aGVuIGF0dHJpYnV0ZXMgY2hhbmdlLlxuICAgICAqL1xuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGQsIHZhbHVlKSB7XG4gICAgICAgIGlmIChvbGQgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9hdHRyaWJ1dGVUb1Byb3BlcnR5KG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfcHJvcGVydHlUb0F0dHJpYnV0ZShuYW1lLCB2YWx1ZSwgb3B0aW9ucyA9IGRlZmF1bHRQcm9wZXJ0eURlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgICBjb25zdCBhdHRyID0gY3Rvci5fYXR0cmlidXRlTmFtZUZvclByb3BlcnR5KG5hbWUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoYXR0ciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRyVmFsdWUgPSBjdG9yLl9wcm9wZXJ0eVZhbHVlVG9BdHRyaWJ1dGUodmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgLy8gYW4gdW5kZWZpbmVkIHZhbHVlIGRvZXMgbm90IGNoYW5nZSB0aGUgYXR0cmlidXRlLlxuICAgICAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVHJhY2sgaWYgdGhlIHByb3BlcnR5IGlzIGJlaW5nIHJlZmxlY3RlZCB0byBhdm9pZFxuICAgICAgICAgICAgLy8gc2V0dGluZyB0aGUgcHJvcGVydHkgYWdhaW4gdmlhIGBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2tgLiBOb3RlOlxuICAgICAgICAgICAgLy8gMS4gdGhpcyB0YWtlcyBhZHZhbnRhZ2Ugb2YgdGhlIGZhY3QgdGhhdCB0aGUgY2FsbGJhY2sgaXMgc3luY2hyb25vdXMuXG4gICAgICAgICAgICAvLyAyLiB3aWxsIGJlaGF2ZSBpbmNvcnJlY3RseSBpZiBtdWx0aXBsZSBhdHRyaWJ1dGVzIGFyZSBpbiB0aGUgcmVhY3Rpb25cbiAgICAgICAgICAgIC8vIHN0YWNrIGF0IHRpbWUgb2YgY2FsbGluZy4gSG93ZXZlciwgc2luY2Ugd2UgcHJvY2VzcyBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAvLyBpbiBgdXBkYXRlYCB0aGlzIHNob3VsZCBub3QgYmUgcG9zc2libGUgKG9yIGFuIGV4dHJlbWUgY29ybmVyIGNhc2VcbiAgICAgICAgICAgIC8vIHRoYXQgd2UnZCBsaWtlIHRvIGRpc2NvdmVyKS5cbiAgICAgICAgICAgIC8vIG1hcmsgc3RhdGUgcmVmbGVjdGluZ1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSB8IFNUQVRFX0lTX1JFRkxFQ1RJTkdfVE9fQVRUUklCVVRFO1xuICAgICAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZShhdHRyLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gbWFyayBzdGF0ZSBub3QgcmVmbGVjdGluZ1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSAmIH5TVEFURV9JU19SRUZMRUNUSU5HX1RPX0FUVFJJQlVURTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfYXR0cmlidXRlVG9Qcm9wZXJ0eShuYW1lLCB2YWx1ZSkge1xuICAgICAgICAvLyBVc2UgdHJhY2tpbmcgaW5mbyB0byBhdm9pZCBkZXNlcmlhbGl6aW5nIGF0dHJpYnV0ZSB2YWx1ZSBpZiBpdCB3YXNcbiAgICAgICAgLy8ganVzdCBzZXQgZnJvbSBhIHByb3BlcnR5IHNldHRlci5cbiAgICAgICAgaWYgKHRoaXMuX3VwZGF0ZVN0YXRlICYgU1RBVEVfSVNfUkVGTEVDVElOR19UT19BVFRSSUJVVEUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjdG9yID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBjdG9yLl9hdHRyaWJ1dGVUb1Byb3BlcnR5TWFwLmdldChuYW1lKTtcbiAgICAgICAgaWYgKHByb3BOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBjdG9yLl9jbGFzc1Byb3BlcnRpZXMuZ2V0KHByb3BOYW1lKSB8fCBkZWZhdWx0UHJvcGVydHlEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIC8vIG1hcmsgc3RhdGUgcmVmbGVjdGluZ1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSB8IFNUQVRFX0lTX1JFRkxFQ1RJTkdfVE9fUFJPUEVSVFk7XG4gICAgICAgICAgICB0aGlzW3Byb3BOYW1lXSA9XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgICAgIGN0b3IuX3Byb3BlcnR5VmFsdWVGcm9tQXR0cmlidXRlKHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgICAgIC8vIG1hcmsgc3RhdGUgbm90IHJlZmxlY3RpbmdcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXRlID0gdGhpcy5fdXBkYXRlU3RhdGUgJiB+U1RBVEVfSVNfUkVGTEVDVElOR19UT19QUk9QRVJUWTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0cyBhbiB1cGRhdGUgd2hpY2ggaXMgcHJvY2Vzc2VkIGFzeW5jaHJvbm91c2x5LiBUaGlzIHNob3VsZFxuICAgICAqIGJlIGNhbGxlZCB3aGVuIGFuIGVsZW1lbnQgc2hvdWxkIHVwZGF0ZSBiYXNlZCBvbiBzb21lIHN0YXRlIG5vdCB0cmlnZ2VyZWRcbiAgICAgKiBieSBzZXR0aW5nIGEgcHJvcGVydHkuIEluIHRoaXMgY2FzZSwgcGFzcyBubyBhcmd1bWVudHMuIEl0IHNob3VsZCBhbHNvIGJlXG4gICAgICogY2FsbGVkIHdoZW4gbWFudWFsbHkgaW1wbGVtZW50aW5nIGEgcHJvcGVydHkgc2V0dGVyLiBJbiB0aGlzIGNhc2UsIHBhc3MgdGhlXG4gICAgICogcHJvcGVydHkgYG5hbWVgIGFuZCBgb2xkVmFsdWVgIHRvIGVuc3VyZSB0aGF0IGFueSBjb25maWd1cmVkIHByb3BlcnR5XG4gICAgICogb3B0aW9ucyBhcmUgaG9ub3JlZC4gUmV0dXJucyB0aGUgYHVwZGF0ZUNvbXBsZXRlYCBQcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkXG4gICAgICogd2hlbiB0aGUgdXBkYXRlIGNvbXBsZXRlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lIHtQcm9wZXJ0eUtleX0gKG9wdGlvbmFsKSBuYW1lIG9mIHJlcXVlc3RpbmcgcHJvcGVydHlcbiAgICAgKiBAcGFyYW0gb2xkVmFsdWUge2FueX0gKG9wdGlvbmFsKSBvbGQgdmFsdWUgb2YgcmVxdWVzdGluZyBwcm9wZXJ0eVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBBIFByb21pc2UgdGhhdCBpcyByZXNvbHZlZCB3aGVuIHRoZSB1cGRhdGUgY29tcGxldGVzLlxuICAgICAqL1xuICAgIHJlcXVlc3RVcGRhdGUobmFtZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgbGV0IHNob3VsZFJlcXVlc3RVcGRhdGUgPSB0cnVlO1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgcHJvcGVydHkga2V5LCBwZXJmb3JtIHByb3BlcnR5IHVwZGF0ZSBzdGVwcy5cbiAgICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy5fY2hhbmdlZFByb3BlcnRpZXMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBjdG9yLl9jbGFzc1Byb3BlcnRpZXMuZ2V0KG5hbWUpIHx8IGRlZmF1bHRQcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgaWYgKGN0b3IuX3ZhbHVlSGFzQ2hhbmdlZCh0aGlzW25hbWVdLCBvbGRWYWx1ZSwgb3B0aW9ucy5oYXNDaGFuZ2VkKSkge1xuICAgICAgICAgICAgICAgIC8vIHRyYWNrIG9sZCB2YWx1ZSB3aGVuIGNoYW5naW5nLlxuICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZWRQcm9wZXJ0aWVzLnNldChuYW1lLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gYWRkIHRvIHJlZmxlY3RpbmcgcHJvcGVydGllcyBzZXRcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5yZWZsZWN0ID09PSB0cnVlICYmXG4gICAgICAgICAgICAgICAgICAgICEodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9JU19SRUZMRUNUSU5HX1RPX1BST1BFUlRZKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMuc2V0KG5hbWUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBhYm9ydCB0aGUgcmVxdWVzdCBpZiB0aGUgcHJvcGVydHkgc2hvdWxkIG5vdCBiZSBjb25zaWRlcmVkIGNoYW5nZWQuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaG91bGRSZXF1ZXN0VXBkYXRlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9oYXNSZXF1ZXN0ZWRVcGRhdGUgJiYgc2hvdWxkUmVxdWVzdFVwZGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5fZW5xdWV1ZVVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUNvbXBsZXRlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIHRoZSBlbGVtZW50IHRvIGFzeW5jaHJvbm91c2x5IHVwZGF0ZS5cbiAgICAgKi9cbiAgICBhc3luYyBfZW5xdWV1ZVVwZGF0ZSgpIHtcbiAgICAgICAgLy8gTWFyayBzdGF0ZSB1cGRhdGluZy4uLlxuICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlIHwgU1RBVEVfVVBEQVRFX1JFUVVFU1RFRDtcbiAgICAgICAgbGV0IHJlc29sdmU7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzVXBkYXRlUHJvbWlzZSA9IHRoaXMuX3VwZGF0ZVByb21pc2U7XG4gICAgICAgIHRoaXMuX3VwZGF0ZVByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzKSA9PiByZXNvbHZlID0gcmVzKTtcbiAgICAgICAgLy8gRW5zdXJlIGFueSBwcmV2aW91cyB1cGRhdGUgaGFzIHJlc29sdmVkIGJlZm9yZSB1cGRhdGluZy5cbiAgICAgICAgLy8gVGhpcyBgYXdhaXRgIGFsc28gZW5zdXJlcyB0aGF0IHByb3BlcnR5IGNoYW5nZXMgYXJlIGJhdGNoZWQuXG4gICAgICAgIGF3YWl0IHByZXZpb3VzVXBkYXRlUHJvbWlzZTtcbiAgICAgICAgLy8gTWFrZSBzdXJlIHRoZSBlbGVtZW50IGhhcyBjb25uZWN0ZWQgYmVmb3JlIHVwZGF0aW5nLlxuICAgICAgICBpZiAoIXRoaXMuX2hhc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlcykgPT4gdGhpcy5faGFzQ29ubmVjdGVkUmVzb2x2ZXIgPSByZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFsbG93IGBwZXJmb3JtVXBkYXRlYCB0byBiZSBhc3luY2hyb25vdXMgdG8gZW5hYmxlIHNjaGVkdWxpbmcgb2YgdXBkYXRlcy5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wZXJmb3JtVXBkYXRlKCk7XG4gICAgICAgIC8vIE5vdGUsIHRoaXMgaXMgdG8gYXZvaWQgZGVsYXlpbmcgYW4gYWRkaXRpb25hbCBtaWNyb3Rhc2sgdW5sZXNzIHdlIG5lZWRcbiAgICAgICAgLy8gdG8uXG4gICAgICAgIGlmIChyZXN1bHQgIT0gbnVsbCAmJlxuICAgICAgICAgICAgdHlwZW9mIHJlc3VsdC50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhd2FpdCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZSghdGhpcy5faGFzUmVxdWVzdGVkVXBkYXRlKTtcbiAgICB9XG4gICAgZ2V0IF9oYXNDb25uZWN0ZWQoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9IQVNfQ09OTkVDVEVEKTtcbiAgICB9XG4gICAgZ2V0IF9oYXNSZXF1ZXN0ZWRVcGRhdGUoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9VUERBVEVfUkVRVUVTVEVEKTtcbiAgICB9XG4gICAgZ2V0IGhhc1VwZGF0ZWQoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9IQVNfVVBEQVRFRCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGFuIGVsZW1lbnQgdXBkYXRlLlxuICAgICAqXG4gICAgICogWW91IGNhbiBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBjaGFuZ2UgdGhlIHRpbWluZyBvZiB1cGRhdGVzLiBGb3IgaW5zdGFuY2UsXG4gICAgICogdG8gc2NoZWR1bGUgdXBkYXRlcyB0byBvY2N1ciBqdXN0IGJlZm9yZSB0aGUgbmV4dCBmcmFtZTpcbiAgICAgKlxuICAgICAqIGBgYFxuICAgICAqIHByb3RlY3RlZCBhc3luYyBwZXJmb3JtVXBkYXRlKCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAqICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiByZXNvbHZlKCkpKTtcbiAgICAgKiAgIHN1cGVyLnBlcmZvcm1VcGRhdGUoKTtcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgcGVyZm9ybVVwZGF0ZSgpIHtcbiAgICAgICAgLy8gTWl4aW4gaW5zdGFuY2UgcHJvcGVydGllcyBvbmNlLCBpZiB0aGV5IGV4aXN0LlxuICAgICAgICBpZiAodGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB0aGlzLl9hcHBseUluc3RhbmNlUHJvcGVydGllcygpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNob3VsZFVwZGF0ZSh0aGlzLl9jaGFuZ2VkUHJvcGVydGllcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWRQcm9wZXJ0aWVzID0gdGhpcy5fY2hhbmdlZFByb3BlcnRpZXM7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZShjaGFuZ2VkUHJvcGVydGllcyk7XG4gICAgICAgICAgICB0aGlzLl9tYXJrVXBkYXRlZCgpO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9IQVNfVVBEQVRFRCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlIHwgU1RBVEVfSEFTX1VQREFURUQ7XG4gICAgICAgICAgICAgICAgdGhpcy5maXJzdFVwZGF0ZWQoY2hhbmdlZFByb3BlcnRpZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy51cGRhdGVkKGNoYW5nZWRQcm9wZXJ0aWVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX21hcmtVcGRhdGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX21hcmtVcGRhdGVkKCkge1xuICAgICAgICB0aGlzLl9jaGFuZ2VkUHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSAmIH5TVEFURV9VUERBVEVfUkVRVUVTVEVEO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGVsZW1lbnQgaGFzIGNvbXBsZXRlZCB1cGRhdGluZy5cbiAgICAgKiBUaGUgUHJvbWlzZSB2YWx1ZSBpcyBhIGJvb2xlYW4gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGVsZW1lbnQgY29tcGxldGVkIHRoZVxuICAgICAqIHVwZGF0ZSB3aXRob3V0IHRyaWdnZXJpbmcgYW5vdGhlciB1cGRhdGUuIFRoZSBQcm9taXNlIHJlc3VsdCBpcyBgZmFsc2VgIGlmXG4gICAgICogYSBwcm9wZXJ0eSB3YXMgc2V0IGluc2lkZSBgdXBkYXRlZCgpYC4gVGhpcyBnZXR0ZXIgY2FuIGJlIGltcGxlbWVudGVkIHRvXG4gICAgICogYXdhaXQgYWRkaXRpb25hbCBzdGF0ZS4gRm9yIGV4YW1wbGUsIGl0IGlzIHNvbWV0aW1lcyB1c2VmdWwgdG8gYXdhaXQgYVxuICAgICAqIHJlbmRlcmVkIGVsZW1lbnQgYmVmb3JlIGZ1bGZpbGxpbmcgdGhpcyBQcm9taXNlLiBUbyBkbyB0aGlzLCBmaXJzdCBhd2FpdFxuICAgICAqIGBzdXBlci51cGRhdGVDb21wbGV0ZWAgdGhlbiBhbnkgc3Vic2VxdWVudCBzdGF0ZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSByZXR1cm5zIGEgYm9vbGVhbiB0aGF0IGluZGljYXRlcyBpZiB0aGVcbiAgICAgKiB1cGRhdGUgcmVzb2x2ZWQgd2l0aG91dCB0cmlnZ2VyaW5nIGFub3RoZXIgdXBkYXRlLlxuICAgICAqL1xuICAgIGdldCB1cGRhdGVDb21wbGV0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3VwZGF0ZVByb21pc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbnRyb2xzIHdoZXRoZXIgb3Igbm90IGB1cGRhdGVgIHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgZWxlbWVudCByZXF1ZXN0c1xuICAgICAqIGFuIHVwZGF0ZS4gQnkgZGVmYXVsdCwgdGhpcyBtZXRob2QgYWx3YXlzIHJldHVybnMgYHRydWVgLCBidXQgdGhpcyBjYW4gYmVcbiAgICAgKiBjdXN0b21pemVkIHRvIGNvbnRyb2wgd2hlbiB0byB1cGRhdGUuXG4gICAgICpcbiAgICAgKiAqIEBwYXJhbSBfY2hhbmdlZFByb3BlcnRpZXMgTWFwIG9mIGNoYW5nZWQgcHJvcGVydGllcyB3aXRoIG9sZCB2YWx1ZXNcbiAgICAgKi9cbiAgICBzaG91bGRVcGRhdGUoX2NoYW5nZWRQcm9wZXJ0aWVzKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBlbGVtZW50LiBUaGlzIG1ldGhvZCByZWZsZWN0cyBwcm9wZXJ0eSB2YWx1ZXMgdG8gYXR0cmlidXRlcy5cbiAgICAgKiBJdCBjYW4gYmUgb3ZlcnJpZGRlbiB0byByZW5kZXIgYW5kIGtlZXAgdXBkYXRlZCBlbGVtZW50IERPTS5cbiAgICAgKiBTZXR0aW5nIHByb3BlcnRpZXMgaW5zaWRlIHRoaXMgbWV0aG9kIHdpbGwgKm5vdCogdHJpZ2dlclxuICAgICAqIGFub3RoZXIgdXBkYXRlLlxuICAgICAqXG4gICAgICogKiBAcGFyYW0gX2NoYW5nZWRQcm9wZXJ0aWVzIE1hcCBvZiBjaGFuZ2VkIHByb3BlcnRpZXMgd2l0aCBvbGQgdmFsdWVzXG4gICAgICovXG4gICAgdXBkYXRlKF9jaGFuZ2VkUHJvcGVydGllcykge1xuICAgICAgICBpZiAodGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIC8vIFVzZSBmb3JFYWNoIHNvIHRoaXMgd29ya3MgZXZlbiBpZiBmb3Ivb2YgbG9vcHMgYXJlIGNvbXBpbGVkIHRvIGZvclxuICAgICAgICAgICAgLy8gbG9vcHMgZXhwZWN0aW5nIGFycmF5c1xuICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGluZ1Byb3BlcnRpZXMuZm9yRWFjaCgodiwgaykgPT4gdGhpcy5fcHJvcGVydHlUb0F0dHJpYnV0ZShrLCB0aGlzW2tdLCB2KSk7XG4gICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbnZva2VkIHdoZW5ldmVyIHRoZSBlbGVtZW50IGlzIHVwZGF0ZWQuIEltcGxlbWVudCB0byBwZXJmb3JtXG4gICAgICogcG9zdC11cGRhdGluZyB0YXNrcyB2aWEgRE9NIEFQSXMsIGZvciBleGFtcGxlLCBmb2N1c2luZyBhbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogU2V0dGluZyBwcm9wZXJ0aWVzIGluc2lkZSB0aGlzIG1ldGhvZCB3aWxsIHRyaWdnZXIgdGhlIGVsZW1lbnQgdG8gdXBkYXRlXG4gICAgICogYWdhaW4gYWZ0ZXIgdGhpcyB1cGRhdGUgY3ljbGUgY29tcGxldGVzLlxuICAgICAqXG4gICAgICogKiBAcGFyYW0gX2NoYW5nZWRQcm9wZXJ0aWVzIE1hcCBvZiBjaGFuZ2VkIHByb3BlcnRpZXMgd2l0aCBvbGQgdmFsdWVzXG4gICAgICovXG4gICAgdXBkYXRlZChfY2hhbmdlZFByb3BlcnRpZXMpIHtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW52b2tlZCB3aGVuIHRoZSBlbGVtZW50IGlzIGZpcnN0IHVwZGF0ZWQuIEltcGxlbWVudCB0byBwZXJmb3JtIG9uZSB0aW1lXG4gICAgICogd29yayBvbiB0aGUgZWxlbWVudCBhZnRlciB1cGRhdGUuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHByb3BlcnRpZXMgaW5zaWRlIHRoaXMgbWV0aG9kIHdpbGwgdHJpZ2dlciB0aGUgZWxlbWVudCB0byB1cGRhdGVcbiAgICAgKiBhZ2FpbiBhZnRlciB0aGlzIHVwZGF0ZSBjeWNsZSBjb21wbGV0ZXMuXG4gICAgICpcbiAgICAgKiAqIEBwYXJhbSBfY2hhbmdlZFByb3BlcnRpZXMgTWFwIG9mIGNoYW5nZWQgcHJvcGVydGllcyB3aXRoIG9sZCB2YWx1ZXNcbiAgICAgKi9cbiAgICBmaXJzdFVwZGF0ZWQoX2NoYW5nZWRQcm9wZXJ0aWVzKSB7XG4gICAgfVxufVxuLyoqXG4gKiBNYXJrcyBjbGFzcyBhcyBoYXZpbmcgZmluaXNoZWQgY3JlYXRpbmcgcHJvcGVydGllcy5cbiAqL1xuVXBkYXRpbmdFbGVtZW50LmZpbmFsaXplZCA9IHRydWU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD11cGRhdGluZy1lbGVtZW50LmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbmNvbnN0IGxlZ2FjeUN1c3RvbUVsZW1lbnQgPSAodGFnTmFtZSwgY2xhenopID0+IHtcbiAgICB3aW5kb3cuY3VzdG9tRWxlbWVudHMuZGVmaW5lKHRhZ05hbWUsIGNsYXp6KTtcbiAgICAvLyBDYXN0IGFzIGFueSBiZWNhdXNlIFRTIGRvZXNuJ3QgcmVjb2duaXplIHRoZSByZXR1cm4gdHlwZSBhcyBiZWluZyBhXG4gICAgLy8gc3VidHlwZSBvZiB0aGUgZGVjb3JhdGVkIGNsYXNzIHdoZW4gY2xhenogaXMgdHlwZWQgYXNcbiAgICAvLyBgQ29uc3RydWN0b3I8SFRNTEVsZW1lbnQ+YCBmb3Igc29tZSByZWFzb24uXG4gICAgLy8gYENvbnN0cnVjdG9yPEhUTUxFbGVtZW50PmAgaXMgaGVscGZ1bCB0byBtYWtlIHN1cmUgdGhlIGRlY29yYXRvciBpc1xuICAgIC8vIGFwcGxpZWQgdG8gZWxlbWVudHMgaG93ZXZlci5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgcmV0dXJuIGNsYXp6O1xufTtcbmNvbnN0IHN0YW5kYXJkQ3VzdG9tRWxlbWVudCA9ICh0YWdOYW1lLCBkZXNjcmlwdG9yKSA9PiB7XG4gICAgY29uc3QgeyBraW5kLCBlbGVtZW50cyB9ID0gZGVzY3JpcHRvcjtcbiAgICByZXR1cm4ge1xuICAgICAgICBraW5kLFxuICAgICAgICBlbGVtZW50cyxcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgb25jZSB0aGUgY2xhc3MgaXMgb3RoZXJ3aXNlIGZ1bGx5IGRlZmluZWRcbiAgICAgICAgZmluaXNoZXIoY2xhenopIHtcbiAgICAgICAgICAgIHdpbmRvdy5jdXN0b21FbGVtZW50cy5kZWZpbmUodGFnTmFtZSwgY2xhenopO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIENsYXNzIGRlY29yYXRvciBmYWN0b3J5IHRoYXQgZGVmaW5lcyB0aGUgZGVjb3JhdGVkIGNsYXNzIGFzIGEgY3VzdG9tIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHRhZ05hbWUgdGhlIG5hbWUgb2YgdGhlIGN1c3RvbSBlbGVtZW50IHRvIGRlZmluZVxuICovXG5leHBvcnQgY29uc3QgY3VzdG9tRWxlbWVudCA9ICh0YWdOYW1lKSA9PiAoY2xhc3NPckRlc2NyaXB0b3IpID0+ICh0eXBlb2YgY2xhc3NPckRlc2NyaXB0b3IgPT09ICdmdW5jdGlvbicpID9cbiAgICBsZWdhY3lDdXN0b21FbGVtZW50KHRhZ05hbWUsIGNsYXNzT3JEZXNjcmlwdG9yKSA6XG4gICAgc3RhbmRhcmRDdXN0b21FbGVtZW50KHRhZ05hbWUsIGNsYXNzT3JEZXNjcmlwdG9yKTtcbmNvbnN0IHN0YW5kYXJkUHJvcGVydHkgPSAob3B0aW9ucywgZWxlbWVudCkgPT4ge1xuICAgIC8vIFdoZW4gZGVjb3JhdGluZyBhbiBhY2Nlc3NvciwgcGFzcyBpdCB0aHJvdWdoIGFuZCBhZGQgcHJvcGVydHkgbWV0YWRhdGEuXG4gICAgLy8gTm90ZSwgdGhlIGBoYXNPd25Qcm9wZXJ0eWAgY2hlY2sgaW4gYGNyZWF0ZVByb3BlcnR5YCBlbnN1cmVzIHdlIGRvbid0XG4gICAgLy8gc3RvbXAgb3ZlciB0aGUgdXNlcidzIGFjY2Vzc29yLlxuICAgIGlmIChlbGVtZW50LmtpbmQgPT09ICdtZXRob2QnICYmIGVsZW1lbnQuZGVzY3JpcHRvciAmJlxuICAgICAgICAhKCd2YWx1ZScgaW4gZWxlbWVudC5kZXNjcmlwdG9yKSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZWxlbWVudCwgeyBmaW5pc2hlcihjbGF6eikge1xuICAgICAgICAgICAgICAgIGNsYXp6LmNyZWF0ZVByb3BlcnR5KGVsZW1lbnQua2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBjcmVhdGVQcm9wZXJ0eSgpIHRha2VzIGNhcmUgb2YgZGVmaW5pbmcgdGhlIHByb3BlcnR5LCBidXQgd2Ugc3RpbGxcbiAgICAgICAgLy8gbXVzdCByZXR1cm4gc29tZSBraW5kIG9mIGRlc2NyaXB0b3IsIHNvIHJldHVybiBhIGRlc2NyaXB0b3IgZm9yIGFuXG4gICAgICAgIC8vIHVudXNlZCBwcm90b3R5cGUgZmllbGQuIFRoZSBmaW5pc2hlciBjYWxscyBjcmVhdGVQcm9wZXJ0eSgpLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAga2luZDogJ2ZpZWxkJyxcbiAgICAgICAgICAgIGtleTogU3ltYm9sKCksXG4gICAgICAgICAgICBwbGFjZW1lbnQ6ICdvd24nLFxuICAgICAgICAgICAgZGVzY3JpcHRvcjoge30sXG4gICAgICAgICAgICAvLyBXaGVuIEBiYWJlbC9wbHVnaW4tcHJvcG9zYWwtZGVjb3JhdG9ycyBpbXBsZW1lbnRzIGluaXRpYWxpemVycyxcbiAgICAgICAgICAgIC8vIGRvIHRoaXMgaW5zdGVhZCBvZiB0aGUgaW5pdGlhbGl6ZXIgYmVsb3cuIFNlZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iYWJlbC9iYWJlbC9pc3N1ZXMvOTI2MCBleHRyYXM6IFtcbiAgICAgICAgICAgIC8vICAge1xuICAgICAgICAgICAgLy8gICAgIGtpbmQ6ICdpbml0aWFsaXplcicsXG4gICAgICAgICAgICAvLyAgICAgcGxhY2VtZW50OiAnb3duJyxcbiAgICAgICAgICAgIC8vICAgICBpbml0aWFsaXplcjogZGVzY3JpcHRvci5pbml0aWFsaXplcixcbiAgICAgICAgICAgIC8vICAgfVxuICAgICAgICAgICAgLy8gXSxcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgZGVjb3JhdG9yXG4gICAgICAgICAgICBpbml0aWFsaXplcigpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVsZW1lbnQuaW5pdGlhbGl6ZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tlbGVtZW50LmtleV0gPSBlbGVtZW50LmluaXRpYWxpemVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZpbmlzaGVyKGNsYXp6KSB7XG4gICAgICAgICAgICAgICAgY2xhenouY3JlYXRlUHJvcGVydHkoZWxlbWVudC5rZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07XG5jb25zdCBsZWdhY3lQcm9wZXJ0eSA9IChvcHRpb25zLCBwcm90bywgbmFtZSkgPT4ge1xuICAgIHByb3RvLmNvbnN0cnVjdG9yXG4gICAgICAgIC5jcmVhdGVQcm9wZXJ0eShuYW1lLCBvcHRpb25zKTtcbn07XG4vKipcbiAqIEEgcHJvcGVydHkgZGVjb3JhdG9yIHdoaWNoIGNyZWF0ZXMgYSBMaXRFbGVtZW50IHByb3BlcnR5IHdoaWNoIHJlZmxlY3RzIGFcbiAqIGNvcnJlc3BvbmRpbmcgYXR0cmlidXRlIHZhbHVlLiBBIGBQcm9wZXJ0eURlY2xhcmF0aW9uYCBtYXkgb3B0aW9uYWxseSBiZVxuICogc3VwcGxpZWQgdG8gY29uZmlndXJlIHByb3BlcnR5IGZlYXR1cmVzLlxuICpcbiAqIEBFeHBvcnREZWNvcmF0ZWRJdGVtc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcGVydHkob3B0aW9ucykge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgZGVjb3JhdG9yXG4gICAgcmV0dXJuIChwcm90b09yRGVzY3JpcHRvciwgbmFtZSkgPT4gKG5hbWUgIT09IHVuZGVmaW5lZCkgP1xuICAgICAgICBsZWdhY3lQcm9wZXJ0eShvcHRpb25zLCBwcm90b09yRGVzY3JpcHRvciwgbmFtZSkgOlxuICAgICAgICBzdGFuZGFyZFByb3BlcnR5KG9wdGlvbnMsIHByb3RvT3JEZXNjcmlwdG9yKTtcbn1cbi8qKlxuICogQSBwcm9wZXJ0eSBkZWNvcmF0b3IgdGhhdCBjb252ZXJ0cyBhIGNsYXNzIHByb3BlcnR5IGludG8gYSBnZXR0ZXIgdGhhdFxuICogZXhlY3V0ZXMgYSBxdWVyeVNlbGVjdG9yIG9uIHRoZSBlbGVtZW50J3MgcmVuZGVyUm9vdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHF1ZXJ5ID0gX3F1ZXJ5KCh0YXJnZXQsIHNlbGVjdG9yKSA9PiB0YXJnZXQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpO1xuLyoqXG4gKiBBIHByb3BlcnR5IGRlY29yYXRvciB0aGF0IGNvbnZlcnRzIGEgY2xhc3MgcHJvcGVydHkgaW50byBhIGdldHRlclxuICogdGhhdCBleGVjdXRlcyBhIHF1ZXJ5U2VsZWN0b3JBbGwgb24gdGhlIGVsZW1lbnQncyByZW5kZXJSb290LlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlBbGwgPSBfcXVlcnkoKHRhcmdldCwgc2VsZWN0b3IpID0+IHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5jb25zdCBsZWdhY3lRdWVyeSA9IChkZXNjcmlwdG9yLCBwcm90bywgbmFtZSkgPT4ge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgbmFtZSwgZGVzY3JpcHRvcik7XG59O1xuY29uc3Qgc3RhbmRhcmRRdWVyeSA9IChkZXNjcmlwdG9yLCBlbGVtZW50KSA9PiAoe1xuICAgIGtpbmQ6ICdtZXRob2QnLFxuICAgIHBsYWNlbWVudDogJ3Byb3RvdHlwZScsXG4gICAga2V5OiBlbGVtZW50LmtleSxcbiAgICBkZXNjcmlwdG9yLFxufSk7XG4vKipcbiAqIEJhc2UtaW1wbGVtZW50YXRpb24gb2YgYEBxdWVyeWAgYW5kIGBAcXVlcnlBbGxgIGRlY29yYXRvcnMuXG4gKlxuICogQHBhcmFtIHF1ZXJ5Rm4gZXhlY3R1dGUgYSBgc2VsZWN0b3JgIChpZSwgcXVlcnlTZWxlY3RvciBvciBxdWVyeVNlbGVjdG9yQWxsKVxuICogYWdhaW5zdCBgdGFyZ2V0YC5cbiAqIEBzdXBwcmVzcyB7dmlzaWJpbGl0eX0gVGhlIGRlc2NyaXB0b3IgYWNjZXNzZXMgYW4gaW50ZXJuYWwgZmllbGQgb24gdGhlXG4gKiBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBfcXVlcnkocXVlcnlGbikge1xuICAgIHJldHVybiAoc2VsZWN0b3IpID0+IChwcm90b09yRGVzY3JpcHRvciwgXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBkZWNvcmF0b3JcbiAgICBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5Rm4odGhpcy5yZW5kZXJSb290LCBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIChuYW1lICE9PSB1bmRlZmluZWQpID9cbiAgICAgICAgICAgIGxlZ2FjeVF1ZXJ5KGRlc2NyaXB0b3IsIHByb3RvT3JEZXNjcmlwdG9yLCBuYW1lKSA6XG4gICAgICAgICAgICBzdGFuZGFyZFF1ZXJ5KGRlc2NyaXB0b3IsIHByb3RvT3JEZXNjcmlwdG9yKTtcbiAgICB9O1xufVxuY29uc3Qgc3RhbmRhcmRFdmVudE9wdGlvbnMgPSAob3B0aW9ucywgZWxlbWVudCkgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBlbGVtZW50LCB7IGZpbmlzaGVyKGNsYXp6KSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNsYXp6LnByb3RvdHlwZVtlbGVtZW50LmtleV0sIG9wdGlvbnMpO1xuICAgICAgICB9IH0pO1xufTtcbmNvbnN0IGxlZ2FjeUV2ZW50T3B0aW9ucyA9IFxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBsZWdhY3kgZGVjb3JhdG9yXG4ob3B0aW9ucywgcHJvdG8sIG5hbWUpID0+IHtcbiAgICBPYmplY3QuYXNzaWduKHByb3RvW25hbWVdLCBvcHRpb25zKTtcbn07XG4vKipcbiAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgb3B0aW9ucyB0byBhIG1ldGhvZCB1c2VkIGFzIGFuIGV2ZW50IGxpc3RlbmVyIGluIGFcbiAqIGxpdC1odG1sIHRlbXBsYXRlLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIEFuIG9iamVjdCB0aGF0IHNwZWNpZmlzIGV2ZW50IGxpc3RlbmVyIG9wdGlvbnMgYXMgYWNjZXB0ZWQgYnlcbiAqIGBFdmVudFRhcmdldCNhZGRFdmVudExpc3RlbmVyYCBhbmQgYEV2ZW50VGFyZ2V0I3JlbW92ZUV2ZW50TGlzdGVuZXJgLlxuICpcbiAqIEN1cnJlbnQgYnJvd3NlcnMgc3VwcG9ydCB0aGUgYGNhcHR1cmVgLCBgcGFzc2l2ZWAsIGFuZCBgb25jZWAgb3B0aW9ucy4gU2VlOlxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0V2ZW50VGFyZ2V0L2FkZEV2ZW50TGlzdGVuZXIjUGFyYW1ldGVyc1xuICpcbiAqIEBleGFtcGxlXG4gKlxuICogICAgIGNsYXNzIE15RWxlbWVudCB7XG4gKlxuICogICAgICAgY2xpY2tlZCA9IGZhbHNlO1xuICpcbiAqICAgICAgIHJlbmRlcigpIHtcbiAqICAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBAY2xpY2s9JHt0aGlzLl9vbkNsaWNrfWA+PGJ1dHRvbj48L2J1dHRvbj48L2Rpdj5gO1xuICogICAgICAgfVxuICpcbiAqICAgICAgIEBldmVudE9wdGlvbnMoe2NhcHR1cmU6IHRydWV9KVxuICogICAgICAgX29uQ2xpY2soZSkge1xuICogICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xuICogICAgICAgfVxuICogICAgIH1cbiAqL1xuZXhwb3J0IGNvbnN0IGV2ZW50T3B0aW9ucyA9IChvcHRpb25zKSA9PiBcbi8vIFJldHVybiB2YWx1ZSB0eXBlZCBhcyBhbnkgdG8gcHJldmVudCBUeXBlU2NyaXB0IGZyb20gY29tcGxhaW5pbmcgdGhhdFxuLy8gc3RhbmRhcmQgZGVjb3JhdG9yIGZ1bmN0aW9uIHNpZ25hdHVyZSBkb2VzIG5vdCBtYXRjaCBUeXBlU2NyaXB0IGRlY29yYXRvclxuLy8gc2lnbmF0dXJlXG4vLyBUT0RPKGtzY2hhYWYpOiB1bmNsZWFyIHdoeSBpdCB3YXMgb25seSBmYWlsaW5nIG9uIHRoaXMgZGVjb3JhdG9yIGFuZCBub3Rcbi8vIHRoZSBvdGhlcnNcbigocHJvdG9PckRlc2NyaXB0b3IsIG5hbWUpID0+IChuYW1lICE9PSB1bmRlZmluZWQpID9cbiAgICBsZWdhY3lFdmVudE9wdGlvbnMob3B0aW9ucywgcHJvdG9PckRlc2NyaXB0b3IsIG5hbWUpIDpcbiAgICBzdGFuZGFyZEV2ZW50T3B0aW9ucyhvcHRpb25zLCBwcm90b09yRGVzY3JpcHRvcikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGVjb3JhdG9ycy5qcy5tYXAiLCIvKipcbkBsaWNlbnNlXG5Db3B5cmlnaHQgKGMpIDIwMTkgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG5odHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHQgVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0IFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZVxuZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHQgQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXNcbnBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnRcbmZvdW5kIGF0IGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuKi9cbmV4cG9ydCBjb25zdCBzdXBwb3J0c0Fkb3B0aW5nU3R5bGVTaGVldHMgPSAoJ2Fkb3B0ZWRTdHlsZVNoZWV0cycgaW4gRG9jdW1lbnQucHJvdG90eXBlKSAmJlxuICAgICgncmVwbGFjZScgaW4gQ1NTU3R5bGVTaGVldC5wcm90b3R5cGUpO1xuY29uc3QgY29uc3RydWN0aW9uVG9rZW4gPSBTeW1ib2woKTtcbmV4cG9ydCBjbGFzcyBDU1NSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKGNzc1RleHQsIHNhZmVUb2tlbikge1xuICAgICAgICBpZiAoc2FmZVRva2VuICE9PSBjb25zdHJ1Y3Rpb25Ub2tlbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU1NSZXN1bHQgaXMgbm90IGNvbnN0cnVjdGFibGUuIFVzZSBgdW5zYWZlQ1NTYCBvciBgY3NzYCBpbnN0ZWFkLicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3NzVGV4dCA9IGNzc1RleHQ7XG4gICAgfVxuICAgIC8vIE5vdGUsIHRoaXMgaXMgYSBnZXR0ZXIgc28gdGhhdCBpdCdzIGxhenkuIEluIHByYWN0aWNlLCB0aGlzIG1lYW5zXG4gICAgLy8gc3R5bGVzaGVldHMgYXJlIG5vdCBjcmVhdGVkIHVudGlsIHRoZSBmaXJzdCBlbGVtZW50IGluc3RhbmNlIGlzIG1hZGUuXG4gICAgZ2V0IHN0eWxlU2hlZXQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9zdHlsZVNoZWV0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIE5vdGUsIGlmIGBhZG9wdGVkU3R5bGVTaGVldHNgIGlzIHN1cHBvcnRlZCB0aGVuIHdlIGFzc3VtZSBDU1NTdHlsZVNoZWV0XG4gICAgICAgICAgICAvLyBpcyBjb25zdHJ1Y3RhYmxlLlxuICAgICAgICAgICAgaWYgKHN1cHBvcnRzQWRvcHRpbmdTdHlsZVNoZWV0cykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0eWxlU2hlZXQgPSBuZXcgQ1NTU3R5bGVTaGVldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0eWxlU2hlZXQucmVwbGFjZVN5bmModGhpcy5jc3NUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0eWxlU2hlZXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zdHlsZVNoZWV0O1xuICAgIH1cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3NzVGV4dDtcbiAgICB9XG59XG4vKipcbiAqIFdyYXAgYSB2YWx1ZSBmb3IgaW50ZXJwb2xhdGlvbiBpbiBhIGNzcyB0YWdnZWQgdGVtcGxhdGUgbGl0ZXJhbC5cbiAqXG4gKiBUaGlzIGlzIHVuc2FmZSBiZWNhdXNlIHVudHJ1c3RlZCBDU1MgdGV4dCBjYW4gYmUgdXNlZCB0byBwaG9uZSBob21lXG4gKiBvciBleGZpbHRyYXRlIGRhdGEgdG8gYW4gYXR0YWNrZXIgY29udHJvbGxlZCBzaXRlLiBUYWtlIGNhcmUgdG8gb25seSB1c2VcbiAqIHRoaXMgd2l0aCB0cnVzdGVkIGlucHV0LlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlQ1NTID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBDU1NSZXN1bHQoU3RyaW5nKHZhbHVlKSwgY29uc3RydWN0aW9uVG9rZW4pO1xufTtcbmNvbnN0IHRleHRGcm9tQ1NTUmVzdWx0ID0gKHZhbHVlKSA9PiB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQ1NTUmVzdWx0KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jc3NUZXh0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBwYXNzZWQgdG8gJ2NzcycgZnVuY3Rpb24gbXVzdCBiZSBhICdjc3MnIGZ1bmN0aW9uIHJlc3VsdDogJHt2YWx1ZX0uIFVzZSAndW5zYWZlQ1NTJyB0byBwYXNzIG5vbi1saXRlcmFsIHZhbHVlcywgYnV0XG4gICAgICAgICAgICB0YWtlIGNhcmUgdG8gZW5zdXJlIHBhZ2Ugc2VjdXJpdHkuYCk7XG4gICAgfVxufTtcbi8qKlxuICogVGVtcGxhdGUgdGFnIHdoaWNoIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggTGl0RWxlbWVudCdzIGBzdHlsZWAgcHJvcGVydHkgdG9cbiAqIHNldCBlbGVtZW50IHN0eWxlcy4gRm9yIHNlY3VyaXR5IHJlYXNvbnMsIG9ubHkgbGl0ZXJhbCBzdHJpbmcgdmFsdWVzIG1heSBiZVxuICogdXNlZC4gVG8gaW5jb3Jwb3JhdGUgbm9uLWxpdGVyYWwgdmFsdWVzIGB1bnNhZmVDU1NgIG1heSBiZSB1c2VkIGluc2lkZSBhXG4gKiB0ZW1wbGF0ZSBzdHJpbmcgcGFydC5cbiAqL1xuZXhwb3J0IGNvbnN0IGNzcyA9IChzdHJpbmdzLCAuLi52YWx1ZXMpID0+IHtcbiAgICBjb25zdCBjc3NUZXh0ID0gdmFsdWVzLnJlZHVjZSgoYWNjLCB2LCBpZHgpID0+IGFjYyArIHRleHRGcm9tQ1NTUmVzdWx0KHYpICsgc3RyaW5nc1tpZHggKyAxXSwgc3RyaW5nc1swXSk7XG4gICAgcmV0dXJuIG5ldyBDU1NSZXN1bHQoY3NzVGV4dCwgY29uc3RydWN0aW9uVG9rZW4pO1xufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNzcy10YWcuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuaW1wb3J0IHsgVGVtcGxhdGVSZXN1bHQgfSBmcm9tICdsaXQtaHRtbCc7XG5pbXBvcnQgeyByZW5kZXIgfSBmcm9tICdsaXQtaHRtbC9saWIvc2hhZHktcmVuZGVyJztcbmltcG9ydCB7IFVwZGF0aW5nRWxlbWVudCB9IGZyb20gJy4vbGliL3VwZGF0aW5nLWVsZW1lbnQuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9saWIvdXBkYXRpbmctZWxlbWVudC5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2xpYi9kZWNvcmF0b3JzLmpzJztcbmV4cG9ydCB7IGh0bWwsIHN2ZywgVGVtcGxhdGVSZXN1bHQsIFNWR1RlbXBsYXRlUmVzdWx0IH0gZnJvbSAnbGl0LWh0bWwvbGl0LWh0bWwnO1xuaW1wb3J0IHsgc3VwcG9ydHNBZG9wdGluZ1N0eWxlU2hlZXRzIH0gZnJvbSAnLi9saWIvY3NzLXRhZy5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2xpYi9jc3MtdGFnLmpzJztcbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgTGl0RWxlbWVudCB1c2FnZS5cbi8vIFRPRE8oanVzdGluZmFnbmFuaSk6IGluamVjdCB2ZXJzaW9uIG51bWJlciBhdCBidWlsZCB0aW1lXG4od2luZG93WydsaXRFbGVtZW50VmVyc2lvbnMnXSB8fCAod2luZG93WydsaXRFbGVtZW50VmVyc2lvbnMnXSA9IFtdKSlcbiAgICAucHVzaCgnMi4wLjEnKTtcbi8qKlxuICogTWluaW1hbCBpbXBsZW1lbnRhdGlvbiBvZiBBcnJheS5wcm90b3R5cGUuZmxhdFxuICogQHBhcmFtIGFyciB0aGUgYXJyYXkgdG8gZmxhdHRlblxuICogQHBhcmFtIHJlc3VsdCB0aGUgYWNjdW1sYXRlZCByZXN1bHRcbiAqL1xuZnVuY3Rpb24gYXJyYXlGbGF0KHN0eWxlcywgcmVzdWx0ID0gW10pIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gc3R5bGVzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVzW2ldO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGFycmF5RmxhdCh2YWx1ZSwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuLyoqIERlZXBseSBmbGF0dGVucyBzdHlsZXMgYXJyYXkuIFVzZXMgbmF0aXZlIGZsYXQgaWYgYXZhaWxhYmxlLiAqL1xuY29uc3QgZmxhdHRlblN0eWxlcyA9IChzdHlsZXMpID0+IHN0eWxlcy5mbGF0ID8gc3R5bGVzLmZsYXQoSW5maW5pdHkpIDogYXJyYXlGbGF0KHN0eWxlcyk7XG5leHBvcnQgY2xhc3MgTGl0RWxlbWVudCBleHRlbmRzIFVwZGF0aW5nRWxlbWVudCB7XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgc3RhdGljIGZpbmFsaXplKCkge1xuICAgICAgICBzdXBlci5maW5hbGl6ZSgpO1xuICAgICAgICAvLyBQcmVwYXJlIHN0eWxpbmcgdGhhdCBpcyBzdGFtcGVkIGF0IGZpcnN0IHJlbmRlciB0aW1lLiBTdHlsaW5nXG4gICAgICAgIC8vIGlzIGJ1aWx0IGZyb20gdXNlciBwcm92aWRlZCBgc3R5bGVzYCBvciBpcyBpbmhlcml0ZWQgZnJvbSB0aGUgc3VwZXJjbGFzcy5cbiAgICAgICAgdGhpcy5fc3R5bGVzID1cbiAgICAgICAgICAgIHRoaXMuaGFzT3duUHJvcGVydHkoSlNDb21waWxlcl9yZW5hbWVQcm9wZXJ0eSgnc3R5bGVzJywgdGhpcykpID9cbiAgICAgICAgICAgICAgICB0aGlzLl9nZXRVbmlxdWVTdHlsZXMoKSA6XG4gICAgICAgICAgICAgICAgdGhpcy5fc3R5bGVzIHx8IFtdO1xuICAgIH1cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBzdGF0aWMgX2dldFVuaXF1ZVN0eWxlcygpIHtcbiAgICAgICAgLy8gVGFrZSBjYXJlIG5vdCB0byBjYWxsIGB0aGlzLnN0eWxlc2AgbXVsdGlwbGUgdGltZXMgc2luY2UgdGhpcyBnZW5lcmF0ZXNcbiAgICAgICAgLy8gbmV3IENTU1Jlc3VsdHMgZWFjaCB0aW1lLlxuICAgICAgICAvLyBUT0RPKHNvcnZlbGwpOiBTaW5jZSB3ZSBkbyBub3QgY2FjaGUgQ1NTUmVzdWx0cyBieSBpbnB1dCwgYW55XG4gICAgICAgIC8vIHNoYXJlZCBzdHlsZXMgd2lsbCBnZW5lcmF0ZSBuZXcgc3R5bGVzaGVldCBvYmplY3RzLCB3aGljaCBpcyB3YXN0ZWZ1bC5cbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYmUgYWRkcmVzc2VkIHdoZW4gYSBicm93c2VyIHNoaXBzIGNvbnN0cnVjdGFibGVcbiAgICAgICAgLy8gc3R5bGVzaGVldHMuXG4gICAgICAgIGNvbnN0IHVzZXJTdHlsZXMgPSB0aGlzLnN0eWxlcztcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gW107XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHVzZXJTdHlsZXMpKSB7XG4gICAgICAgICAgICBjb25zdCBmbGF0U3R5bGVzID0gZmxhdHRlblN0eWxlcyh1c2VyU3R5bGVzKTtcbiAgICAgICAgICAgIC8vIEFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uIHRvIGF2b2lkIGR1cGxpY2F0ZWQgc3R5bGluZyB0aGF0IGNhblxuICAgICAgICAgICAgLy8gb2NjdXIgZXNwZWNpYWxseSB3aGVuIGNvbXBvc2luZyB2aWEgc3ViY2xhc3NpbmcsIGRlLWR1cGxpY2F0ZSBzdHlsZXNcbiAgICAgICAgICAgIC8vIHByZXNlcnZpbmcgdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdC4gVGhlIGxhc3QgaXRlbSBpcyBrZXB0IHRvXG4gICAgICAgICAgICAvLyB0cnkgdG8gcHJlc2VydmUgY2FzY2FkZSBvcmRlciB3aXRoIHRoZSBhc3N1bXB0aW9uIHRoYXQgaXQncyBtb3N0XG4gICAgICAgICAgICAvLyBpbXBvcnRhbnQgdGhhdCBsYXN0IGFkZGVkIHN0eWxlcyBvdmVycmlkZSBwcmV2aW91cyBzdHlsZXMuXG4gICAgICAgICAgICBjb25zdCBzdHlsZVNldCA9IGZsYXRTdHlsZXMucmVkdWNlUmlnaHQoKHNldCwgcykgPT4ge1xuICAgICAgICAgICAgICAgIHNldC5hZGQocyk7XG4gICAgICAgICAgICAgICAgLy8gb24gSUUgc2V0LmFkZCBkb2VzIG5vdCByZXR1cm4gdGhlIHNldC5cbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0O1xuICAgICAgICAgICAgfSwgbmV3IFNldCgpKTtcbiAgICAgICAgICAgIC8vIEFycmF5LmZyb20gZG9lcyBub3Qgd29yayBvbiBTZXQgaW4gSUVcbiAgICAgICAgICAgIHN0eWxlU2V0LmZvckVhY2goKHYpID0+IHN0eWxlcy51bnNoaWZ0KHYpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh1c2VyU3R5bGVzKSB7XG4gICAgICAgICAgICBzdHlsZXMucHVzaCh1c2VyU3R5bGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBlbGVtZW50IGluaXRpYWxpemF0aW9uLiBCeSBkZWZhdWx0IHRoaXMgY2FsbHMgYGNyZWF0ZVJlbmRlclJvb3RgXG4gICAgICogdG8gY3JlYXRlIHRoZSBlbGVtZW50IGByZW5kZXJSb290YCBub2RlIGFuZCBjYXB0dXJlcyBhbnkgcHJlLXNldCB2YWx1ZXMgZm9yXG4gICAgICogcmVnaXN0ZXJlZCBwcm9wZXJ0aWVzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgdGhpcy5yZW5kZXJSb290ID0gdGhpcy5jcmVhdGVSZW5kZXJSb290KCk7XG4gICAgICAgIC8vIE5vdGUsIGlmIHJlbmRlclJvb3QgaXMgbm90IGEgc2hhZG93Um9vdCwgc3R5bGVzIHdvdWxkL2NvdWxkIGFwcGx5IHRvIHRoZVxuICAgICAgICAvLyBlbGVtZW50J3MgZ2V0Um9vdE5vZGUoKS4gV2hpbGUgdGhpcyBjb3VsZCBiZSBkb25lLCB3ZSdyZSBjaG9vc2luZyBub3QgdG9cbiAgICAgICAgLy8gc3VwcG9ydCB0aGlzIG5vdyBzaW5jZSBpdCB3b3VsZCByZXF1aXJlIGRpZmZlcmVudCBsb2dpYyBhcm91bmQgZGUtZHVwaW5nLlxuICAgICAgICBpZiAod2luZG93LlNoYWRvd1Jvb3QgJiYgdGhpcy5yZW5kZXJSb290IGluc3RhbmNlb2Ygd2luZG93LlNoYWRvd1Jvb3QpIHtcbiAgICAgICAgICAgIHRoaXMuYWRvcHRTdHlsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBub2RlIGludG8gd2hpY2ggdGhlIGVsZW1lbnQgc2hvdWxkIHJlbmRlciBhbmQgYnkgZGVmYXVsdFxuICAgICAqIGNyZWF0ZXMgYW5kIHJldHVybnMgYW4gb3BlbiBzaGFkb3dSb290LiBJbXBsZW1lbnQgdG8gY3VzdG9taXplIHdoZXJlIHRoZVxuICAgICAqIGVsZW1lbnQncyBET00gaXMgcmVuZGVyZWQuIEZvciBleGFtcGxlLCB0byByZW5kZXIgaW50byB0aGUgZWxlbWVudCdzXG4gICAgICogY2hpbGROb2RlcywgcmV0dXJuIGB0aGlzYC5cbiAgICAgKiBAcmV0dXJucyB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBSZXR1cm5zIGEgbm9kZSBpbnRvIHdoaWNoIHRvIHJlbmRlci5cbiAgICAgKi9cbiAgICBjcmVhdGVSZW5kZXJSb290KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgc3R5bGluZyB0byB0aGUgZWxlbWVudCBzaGFkb3dSb290IHVzaW5nIHRoZSBgc3RhdGljIGdldCBzdHlsZXNgXG4gICAgICogcHJvcGVydHkuIFN0eWxpbmcgd2lsbCBhcHBseSB1c2luZyBgc2hhZG93Um9vdC5hZG9wdGVkU3R5bGVTaGVldHNgIHdoZXJlXG4gICAgICogYXZhaWxhYmxlIGFuZCB3aWxsIGZhbGxiYWNrIG90aGVyd2lzZS4gV2hlbiBTaGFkb3cgRE9NIGlzIHBvbHlmaWxsZWQsXG4gICAgICogU2hhZHlDU1Mgc2NvcGVzIHN0eWxlcyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBkb2N1bWVudC4gV2hlbiBTaGFkb3cgRE9NXG4gICAgICogaXMgYXZhaWxhYmxlIGJ1dCBgYWRvcHRlZFN0eWxlU2hlZXRzYCBpcyBub3QsIHN0eWxlcyBhcmUgYXBwZW5kZWQgdG8gdGhlXG4gICAgICogZW5kIG9mIHRoZSBgc2hhZG93Um9vdGAgdG8gW21pbWljIHNwZWNcbiAgICAgKiBiZWhhdmlvcl0oaHR0cHM6Ly93aWNnLmdpdGh1Yi5pby9jb25zdHJ1Y3Qtc3R5bGVzaGVldHMvI3VzaW5nLWNvbnN0cnVjdGVkLXN0eWxlc2hlZXRzKS5cbiAgICAgKi9cbiAgICBhZG9wdFN0eWxlcygpIHtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gdGhpcy5jb25zdHJ1Y3Rvci5fc3R5bGVzO1xuICAgICAgICBpZiAoc3R5bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZXJlIGFyZSB0aHJlZSBzZXBhcmF0ZSBjYXNlcyBoZXJlIGJhc2VkIG9uIFNoYWRvdyBET00gc3VwcG9ydC5cbiAgICAgICAgLy8gKDEpIHNoYWRvd1Jvb3QgcG9seWZpbGxlZDogdXNlIFNoYWR5Q1NTXG4gICAgICAgIC8vICgyKSBzaGFkb3dSb290LmFkb3B0ZWRTdHlsZVNoZWV0cyBhdmFpbGFibGU6IHVzZSBpdC5cbiAgICAgICAgLy8gKDMpIHNoYWRvd1Jvb3QuYWRvcHRlZFN0eWxlU2hlZXRzIHBvbHlmaWxsZWQ6IGFwcGVuZCBzdHlsZXMgYWZ0ZXJcbiAgICAgICAgLy8gcmVuZGVyaW5nXG4gICAgICAgIGlmICh3aW5kb3cuU2hhZHlDU1MgIT09IHVuZGVmaW5lZCAmJiAhd2luZG93LlNoYWR5Q1NTLm5hdGl2ZVNoYWRvdykge1xuICAgICAgICAgICAgd2luZG93LlNoYWR5Q1NTLlNjb3BpbmdTaGltLnByZXBhcmVBZG9wdGVkQ3NzVGV4dChzdHlsZXMubWFwKChzKSA9PiBzLmNzc1RleHQpLCB0aGlzLmxvY2FsTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3VwcG9ydHNBZG9wdGluZ1N0eWxlU2hlZXRzKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJvb3QuYWRvcHRlZFN0eWxlU2hlZXRzID1cbiAgICAgICAgICAgICAgICBzdHlsZXMubWFwKChzKSA9PiBzLnN0eWxlU2hlZXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhpcyBtdXN0IGJlIGRvbmUgYWZ0ZXIgcmVuZGVyaW5nIHNvIHRoZSBhY3R1YWwgc3R5bGUgaW5zZXJ0aW9uIGlzIGRvbmVcbiAgICAgICAgICAgIC8vIGluIGB1cGRhdGVgLlxuICAgICAgICAgICAgdGhpcy5fbmVlZHNTaGltQWRvcHRlZFN0eWxlU2hlZXRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgc3VwZXIuY29ubmVjdGVkQ2FsbGJhY2soKTtcbiAgICAgICAgLy8gTm90ZSwgZmlyc3QgdXBkYXRlL3JlbmRlciBoYW5kbGVzIHN0eWxlRWxlbWVudCBzbyB3ZSBvbmx5IGNhbGwgdGhpcyBpZlxuICAgICAgICAvLyBjb25uZWN0ZWQgYWZ0ZXIgZmlyc3QgdXBkYXRlLlxuICAgICAgICBpZiAodGhpcy5oYXNVcGRhdGVkICYmIHdpbmRvdy5TaGFkeUNTUyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3aW5kb3cuU2hhZHlDU1Muc3R5bGVFbGVtZW50KHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGVsZW1lbnQuIFRoaXMgbWV0aG9kIHJlZmxlY3RzIHByb3BlcnR5IHZhbHVlcyB0byBhdHRyaWJ1dGVzXG4gICAgICogYW5kIGNhbGxzIGByZW5kZXJgIHRvIHJlbmRlciBET00gdmlhIGxpdC1odG1sLiBTZXR0aW5nIHByb3BlcnRpZXMgaW5zaWRlXG4gICAgICogdGhpcyBtZXRob2Qgd2lsbCAqbm90KiB0cmlnZ2VyIGFub3RoZXIgdXBkYXRlLlxuICAgICAqICogQHBhcmFtIF9jaGFuZ2VkUHJvcGVydGllcyBNYXAgb2YgY2hhbmdlZCBwcm9wZXJ0aWVzIHdpdGggb2xkIHZhbHVlc1xuICAgICAqL1xuICAgIHVwZGF0ZShjaGFuZ2VkUHJvcGVydGllcykge1xuICAgICAgICBzdXBlci51cGRhdGUoY2hhbmdlZFByb3BlcnRpZXMpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVJlc3VsdCA9IHRoaXMucmVuZGVyKCk7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVJlc3VsdCBpbnN0YW5jZW9mIFRlbXBsYXRlUmVzdWx0KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgLnJlbmRlcih0ZW1wbGF0ZVJlc3VsdCwgdGhpcy5yZW5kZXJSb290LCB7IHNjb3BlTmFtZTogdGhpcy5sb2NhbE5hbWUsIGV2ZW50Q29udGV4dDogdGhpcyB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXaGVuIG5hdGl2ZSBTaGFkb3cgRE9NIGlzIHVzZWQgYnV0IGFkb3B0ZWRTdHlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQsXG4gICAgICAgIC8vIGluc2VydCBzdHlsaW5nIGFmdGVyIHJlbmRlcmluZyB0byBlbnN1cmUgYWRvcHRlZFN0eWxlcyBoYXZlIGhpZ2hlc3RcbiAgICAgICAgLy8gcHJpb3JpdHkuXG4gICAgICAgIGlmICh0aGlzLl9uZWVkc1NoaW1BZG9wdGVkU3R5bGVTaGVldHMpIHtcbiAgICAgICAgICAgIHRoaXMuX25lZWRzU2hpbUFkb3B0ZWRTdHlsZVNoZWV0cyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5fc3R5bGVzLmZvckVhY2goKHMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICAgICAgc3R5bGUudGV4dENvbnRlbnQgPSBzLmNzc1RleHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSb290LmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEludm9rZWQgb24gZWFjaCB1cGRhdGUgdG8gcGVyZm9ybSByZW5kZXJpbmcgdGFza3MuIFRoaXMgbWV0aG9kIG11c3QgcmV0dXJuXG4gICAgICogYSBsaXQtaHRtbCBUZW1wbGF0ZVJlc3VsdC4gU2V0dGluZyBwcm9wZXJ0aWVzIGluc2lkZSB0aGlzIG1ldGhvZCB3aWxsICpub3QqXG4gICAgICogdHJpZ2dlciB0aGUgZWxlbWVudCB0byB1cGRhdGUuXG4gICAgICovXG4gICAgcmVuZGVyKCkge1xuICAgIH1cbn1cbi8qKlxuICogRW5zdXJlIHRoaXMgY2xhc3MgaXMgbWFya2VkIGFzIGBmaW5hbGl6ZWRgIGFzIGFuIG9wdGltaXphdGlvbiBlbnN1cmluZ1xuICogaXQgd2lsbCBub3QgbmVlZGxlc3NseSB0cnkgdG8gYGZpbmFsaXplYC5cbiAqL1xuTGl0RWxlbWVudC5maW5hbGl6ZWQgPSB0cnVlO1xuLyoqXG4gKiBSZW5kZXIgbWV0aG9kIHVzZWQgdG8gcmVuZGVyIHRoZSBsaXQtaHRtbCBUZW1wbGF0ZVJlc3VsdCB0byB0aGUgZWxlbWVudCdzXG4gKiBET00uXG4gKiBAcGFyYW0ge1RlbXBsYXRlUmVzdWx0fSBUZW1wbGF0ZSB0byByZW5kZXIuXG4gKiBAcGFyYW0ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gTm9kZSBpbnRvIHdoaWNoIHRvIHJlbmRlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBFbGVtZW50IG5hbWUuXG4gKiBAbm9jb2xsYXBzZVxuICovXG5MaXRFbGVtZW50LnJlbmRlciA9IHJlbmRlcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxpdC1lbGVtZW50LmpzLm1hcCIsImV4cG9ydCBjb25zdCBnZXRVbmlxdWVSYW5kb21BcnJheSA9IChsZW5ndGgsIG1heCkgPT4ge1xyXG4gIGNvbnN0IGFycmF5ID0gW107XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgYXJyYXkucHVzaChnZXRVbmlxdWVSYW5kb21OdW1iZXIoYXJyYXksIG1heCkpO1xyXG4gIH1cclxuICByZXR1cm4gYXJyYXk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0VW5pcXVlUmFuZG9tTnVtYmVyID0gKGl0ZW1zLCBtYXgpID0+IHtcclxuICBjb25zdCBudW0gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXgpO1xyXG4gIHJldHVybiBpdGVtcy5maW5kKGkgPT4gaSA9PT0gbnVtKSA/IGdldFVuaXF1ZVJhbmRvbU51bWJlcihpdGVtcywgbWF4KSA6IG51bTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1ByaW1lID0gKG51bSkgPT4ge1xyXG4gIGZvciAobGV0IGkgPSAyLCBzID0gTWF0aC5zcXJ0KG51bSk7IGkgPD0gczsgaSsrKVxyXG4gICAgaWYgKG51bSAlIGkgPT09IDApIHJldHVybiBmYWxzZTtcclxuICByZXR1cm4gbnVtID4gMTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb2xvcnMxMDAgPSBbXHJcbiAgJyNGRkNERDInLFxyXG4gICcjRjhCQkQwJyxcclxuICAnI0UxQkVFNycsXHJcbiAgJyNEMUM0RTknLFxyXG4gICcjQzVDQUU5JyxcclxuICAnI0JCREVGQicsXHJcbiAgJyNCM0U1RkMnLFxyXG4gICcjQjJFQkYyJyxcclxuICAnI0IyREZEQicsXHJcbiAgJyNDOEU2QzknLFxyXG4gICcjRENFREM4JyxcclxuICAnI0YwRjRDMycsXHJcbiAgJyNGRkY5QzQnLFxyXG4gICcjRkZFQ0IzJyxcclxuICAnI0ZGRTBCMicsXHJcbiAgJyNGRkNDQkMnLFxyXG4gICcjRDdDQ0M4JyxcclxuICAnI0NGRDhEQycsXHJcbiAgJyNGNUY1RjUnLFxyXG5dO1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldENvbG9yMTAwID0gKGkpID0+IHtcclxuICByZXR1cm4gY29sb3JzMTAwW2kgJSBjb2xvcnMxMDAubGVuZ3RoXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRSYW5kb21Db2xvcjEwMCA9ICgpID0+IHtcclxuICByZXR1cm4gY29sb3JzMTAwW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9yczEwMC5sZW5ndGgpXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb2xvcnM0MDAgPSBbXHJcbiAgJyNFRjUzNTAnLFxyXG4gICcjRUM0MDdBJyxcclxuICAnI0FCNDdCQycsXHJcbiAgJyM3RTU3QzInLFxyXG4gICcjNUM2QkMwJyxcclxuICAnIzQyQTVGNScsXHJcbiAgJyMyOUI2RjYnLFxyXG4gICcjMjZDNkRBJyxcclxuICAnIzI2QTY5QScsXHJcbiAgJyM2NkJCNkEnLFxyXG4gICcjOUNDQzY1JyxcclxuICAnI0Q0RTE1NycsXHJcbiAgJyNGRkVFNTgnLFxyXG4gICcjRkZDQTI4JyxcclxuICAnI0ZGQTcyNicsXHJcbiAgJyNGRjcwNDMnLFxyXG4gICcjOEQ2RTYzJyxcclxuICAnIzc4OTA5QycsXHJcbiAgJyNCREJEQkQnLFxyXG5dO1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldENvbG9yNDAwID0gKGkpID0+IHtcclxuICByZXR1cm4gY29sb3JzNDAwW2kgJSBjb2xvcnM0MDAubGVuZ3RoXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRSYW5kb21Db2xvcjQwMCA9ICgpID0+IHtcclxuICByZXR1cm4gY29sb3JzNDAwW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9yczQwMC5sZW5ndGgpXTtcclxufTsiLCJpbXBvcnQge2dldFJhbmRvbUNvbG9yMTAwfSBmcm9tICcuLi91dGlscyc7XHJcblxyXG5leHBvcnQgY2xhc3MgSXRlbSB7XHJcbiAgY29uc3RydWN0b3Ioe2luZGV4LCB2YWx1ZSwgY29sb3IsIG1hcmsgPSBmYWxzZX0pIHtcclxuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcclxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBjb2xvcjtcclxuICAgIHRoaXMubWFyayA9IG1hcms7XHJcbiAgfVxyXG5cclxuICBjbGVhcigpIHtcclxuICAgIHRoaXMudmFsdWUgPSBudWxsO1xyXG4gICAgdGhpcy5jb2xvciA9IG51bGw7XHJcbiAgICB0aGlzLm1hcmsgPSBmYWxzZTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgc2V0VmFsdWUodmFsdWUsIGNvbG9yID0gZ2V0UmFuZG9tQ29sb3IxMDAoKSkge1xyXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgdGhpcy5jb2xvciA9IGNvbG9yO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBjb3B5RnJvbShpdGVtKSB7XHJcbiAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBpdGVtLmNvbG9yO1xyXG4gICAgdGhpcy5tYXJrID0gaXRlbS5tYXJrO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBtb3ZlRnJvbShpdGVtKSB7XHJcbiAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBpdGVtLmNvbG9yO1xyXG4gICAgdGhpcy5tYXJrID0gaXRlbS5tYXJrO1xyXG4gICAgaXRlbS52YWx1ZSA9IG51bGw7XHJcbiAgICBpdGVtLmNvbG9yID0gbnVsbDtcclxuICAgIGl0ZW0ubWFyayA9IGZhbHNlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBzd2FwV2l0aChpdGVtKSB7XHJcbiAgICBjb25zdCBjYWNoZVZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgIGNvbnN0IGNhY2hlQ29sb3IgPSB0aGlzLmNvbG9yO1xyXG4gICAgY29uc3QgY2FjaGVNYXJrID0gdGhpcy5tYXJrO1xyXG4gICAgdGhpcy52YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICB0aGlzLmNvbG9yID0gaXRlbS5jb2xvcjtcclxuICAgIHRoaXMubWFyayA9IGl0ZW0ubWFyaztcclxuICAgIGl0ZW0udmFsdWUgPSBjYWNoZVZhbHVlO1xyXG4gICAgaXRlbS5jb2xvciA9IGNhY2hlQ29sb3I7XHJcbiAgICBpdGVtLm1hcmsgPSBjYWNoZU1hcms7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn0iLCJpbXBvcnQge0xpdEVsZW1lbnQsIHN2ZywgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuXHJcbmNsYXNzIFBsYWNlZEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XHJcbiAgICBzdXBlcihvcHRpb25zKTtcclxuICAgIHRoaXMueCA9IG9wdGlvbnMueDtcclxuICAgIHRoaXMueSA9IG9wdGlvbnMueTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBYSXRlbXNHcmFwaCBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGxpbWl0OiB7dHlwZTogTnVtYmVyfSxcclxuICAgICAgaXRlbXM6IHt0eXBlOiBBcnJheX0sXHJcbiAgICAgIGNvbm5lY3Rpb25zOiB7dHlwZTogTWFwfSxcclxuICAgICAgbWFya2VkQ29ubmVjdGlvbnM6IHt0eXBlOiBNYXB9LFxyXG4gICAgICBjbGlja0ZuOiB7dHlwZTogRnVuY3Rpb259XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIHN2Z2BcclxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDYwMCA0MDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcclxuICAgICAgICBAZGJsY2xpY2s9JHt0aGlzLmRibGNsaWNrSGFuZGxlcn1cclxuICAgICAgICBAbW91c2Vkb3duPSR7KGUpID0+IGUucHJldmVudERlZmF1bHQoKX1cclxuICAgICAgICBAbW91c2V1cD0ke3RoaXMuZHJhZ2VuZEhhbmRsZXJ9XHJcbiAgICAgICAgQG1vdXNlbW92ZT0ke3RoaXMuZHJhZ0hhbmRsZXJ9XHJcbiAgICAgID5cclxuICAgICAgICAke3RoaXMuZHJhZ09wdHMgIT0gbnVsbCAmJiB0aGlzLmRyYWdPcHRzLmlzQ29ubmVjdGlvbiA/IHN2Z2BcclxuICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIHgxPVwiJHt0aGlzLmRyYWdPcHRzLmRyYWdJdGVtLnh9XCIgeTE9XCIke3RoaXMuZHJhZ09wdHMuZHJhZ0l0ZW0ueX1cIiB4Mj1cIiR7dGhpcy5kcmFnT3B0cy54fVwiIHkyPVwiJHt0aGlzLmRyYWdPcHRzLnl9XCI+XHJcbiAgICAgICAgYCA6ICcnfVxyXG4gICAgICAgICR7dGhpcy5kcmF3Q29ubmVjdGlvbnMoKX1cclxuICAgICAgICAke3RoaXMuZHJhd01hcmtlZENvbm5lY3Rpb25zKCl9XHJcbiAgICAgICAgJHt0aGlzLmRyYXdJdGVtcygpfVxyXG4gICAgICA8L3N2Zz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBkcmF3SXRlbXMoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pdGVtcy5tYXAoaXRlbSA9PiBzdmdgXHJcbiAgICAgIDxnIGZpbGw9XCIke2l0ZW0uY29sb3J9XCI+XHJcbiAgICAgICAgPGdcclxuICAgICAgICAgIGNsYXNzPVwiaXRlbUdyb3VwICR7dGhpcy5jbGlja0ZuICE9IG51bGwgPyAnY2xpY2thYmxlJyA6ICcnfVwiXHJcbiAgICAgICAgICBAY2xpY2s9JHt0aGlzLmNsaWNrSGFuZGxlci5iaW5kKHRoaXMsIGl0ZW0pfVxyXG4gICAgICAgICAgQG1vdXNlZG93bj0keyhlKSA9PiB0aGlzLmRyYWdzdGFydEhhbmRsZXIoZSwgaXRlbSl9XHJcbiAgICAgICAgICBAbW91c2V1cD0keyhlKSA9PiB0aGlzLmRyYWdlbmRIYW5kbGVyKGUsIGl0ZW0pfVxyXG4gICAgICAgICAgQG1vdXNlbW92ZT0ke3RoaXMuaXRlbUhvdmVySGFuZGxlcn1cclxuICAgICAgICAgIEBtb3VzZWxlYXZlPSR7dGhpcy5pdGVtTGVhdmVIYW5kbGVyfVxyXG4gICAgICAgID5cclxuICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJpdGVtICR7aXRlbS5tYXJrID8gJ21hcmtlZCcgOiAnJ31cIiBjeD1cIiR7aXRlbS54fVwiIGN5PVwiJHtpdGVtLnl9XCIgcj1cIjEyXCI+PC9jaXJjbGU+XHJcbiAgICAgICAgICA8dGV4dCBjbGFzcz1cInZhbHVlICR7aXRlbS5tYXJrID8gJ21hcmtlZCcgOiAnJ31cIiB4PVwiJHtpdGVtLnh9XCIgeT1cIiR7aXRlbS55ICsgMn1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIGFsaWdubWVudC1iYXNlbGluZT1cIm1pZGRsZVwiPiR7aXRlbS52YWx1ZX08L3RleHQ+XHJcbiAgICAgICAgPC9nPlxyXG4gICAgICA8L2c+XHJcbiAgICBgKTtcclxuICB9XHJcblxyXG4gIGRyYXdDb25uZWN0aW9ucygpIHtcclxuICAgIGNvbnN0IGxpbmVzID0gW107XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zLmZvckVhY2goKGNvbm5lY3Rpb25zLCBpdGVtKSA9PiB7XHJcbiAgICAgIGZvciAobGV0IGNvbm5lY3Rpb24gb2YgY29ubmVjdGlvbnMpIHtcclxuICAgICAgICBsaW5lcy5wdXNoKHN2Z2BcclxuICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIHgxPVwiJHtpdGVtLnh9XCIgeTE9XCIke2l0ZW0ueX1cIiB4Mj1cIiR7Y29ubmVjdGlvbi54fVwiIHkyPVwiJHtjb25uZWN0aW9uLnl9XCI+XHJcbiAgICAgICAgYCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGxpbmVzO1xyXG4gIH1cclxuXHJcbiAgZHJhd01hcmtlZENvbm5lY3Rpb25zKCkge1xyXG4gICAgY29uc3QgbGluZXMgPSBbXTtcclxuICAgIHRoaXMubWFya2VkQ29ubmVjdGlvbnMuZm9yRWFjaCgoY29ubmVjdGlvbnMsIGl0ZW0pID0+IHtcclxuICAgICAgZm9yIChsZXQgY29ubmVjdGlvbiBvZiBjb25uZWN0aW9ucykge1xyXG4gICAgICAgIGxpbmVzLnB1c2goc3ZnYFxyXG4gICAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lIG1hcmtlZFwiIHgxPVwiJHtpdGVtLnh9XCIgeTE9XCIke2l0ZW0ueX1cIiB4Mj1cIiR7Y29ubmVjdGlvbi54fVwiIHkyPVwiJHtjb25uZWN0aW9uLnl9XCI+XHJcbiAgICAgICAgYCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGxpbmVzO1xyXG4gIH1cclxuXHJcbiAgZGJsY2xpY2tIYW5kbGVyKGUpIHtcclxuICAgIGlmICh0aGlzLmRyYWdPcHRzICE9IG51bGwgfHwgdGhpcy5saW1pdCA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIHJldHVybjtcclxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pdGVtcy5sZW5ndGg7XHJcbiAgICBjb25zdCBpdGVtID0gbmV3IFBsYWNlZEl0ZW0oe1xyXG4gICAgICBpbmRleCxcclxuICAgICAgeDogZS5vZmZzZXRYLFxyXG4gICAgICB5OiBlLm9mZnNldFlcclxuICAgIH0pO1xyXG4gICAgaXRlbS5zZXRWYWx1ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaW5kZXgpKTtcclxuICAgIHRoaXMuaXRlbXMucHVzaChpdGVtKTtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMuc2V0KGl0ZW0sIG5ldyBTZXQoKSk7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2VkJykpO1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICBkcmFnc3RhcnRIYW5kbGVyKGUsIGl0ZW0pIHtcclxuICAgIHRoaXMuZHJhZ09wdHMgPSB7XHJcbiAgICAgIGluaXRpYWxYOiBlLmNsaWVudFgsXHJcbiAgICAgIGluaXRpYWxZOiBlLmNsaWVudFksXHJcbiAgICAgIGRyYWdJdGVtOiBpdGVtLFxyXG4gICAgICBpc0Nvbm5lY3Rpb246ICFlLmN0cmxLZXlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBkcmFnSGFuZGxlcihlKSB7XHJcbiAgICBpZiAodGhpcy5kcmFnT3B0cyA9PSBudWxsKSByZXR1cm47XHJcbiAgICBpZiAodGhpcy5kcmFnT3B0cy5pc0Nvbm5lY3Rpb24pIHtcclxuICAgICAgdGhpcy5kcmFnT3B0cy54ID0gZS5vZmZzZXRYO1xyXG4gICAgICB0aGlzLmRyYWdPcHRzLnkgPSBlLm9mZnNldFk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmRyYWdPcHRzLmRyYWdJdGVtLnggPSBlLm9mZnNldFg7XHJcbiAgICAgIHRoaXMuZHJhZ09wdHMuZHJhZ0l0ZW0ueSA9IGUub2Zmc2V0WTtcclxuICAgIH1cclxuICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgZHJhZ2VuZEhhbmRsZXIoZSwgaXRlbSkge1xyXG4gICAgaWYgKHRoaXMuZHJhZ09wdHMgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMuZHJhZ09wdHMgJiYgaXRlbSAmJiBpdGVtICE9PSB0aGlzLmRyYWdPcHRzLmRyYWdJdGVtICYmIHRoaXMuZHJhZ09wdHMuaXNDb25uZWN0aW9uKSB7XHJcbiAgICAgIGNvbnN0IGRyYWdJdGVtID0gdGhpcy5kcmFnT3B0cy5kcmFnSXRlbTtcclxuICAgICAgdGhpcy5jb25uZWN0aW9ucy5nZXQoZHJhZ0l0ZW0pLmFkZChpdGVtKTtcclxuICAgICAgdGhpcy5jb25uZWN0aW9ucy5nZXQoaXRlbSkuYWRkKGRyYWdJdGVtKTtcclxuICAgIH1cclxuICAgIHRoaXMuZHJhZ09wdHMgPSBudWxsO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlZCcpKTtcclxuICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgY2xpY2tIYW5kbGVyKGl0ZW0pIHtcclxuICAgIGlmICh0aGlzLmNsaWNrRm4gIT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5jbGlja0ZuKGl0ZW0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaXRlbUhvdmVySGFuZGxlcihlKSB7XHJcbiAgICBpZiAoZS5jdHJsS2V5KSB7XHJcbiAgICAgIGUuY3VycmVudFRhcmdldC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2FibGUnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGUuY3VycmVudFRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnZ2FibGUnKTtcclxuICAgIH1cclxuICB9XHJcbiAgaXRlbUxlYXZlSGFuZGxlcihlKSB7XHJcbiAgICBlLnRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnZ2FibGUnKTtcclxuICB9XHJcbn1cclxuXHJcblhJdGVtc0dyYXBoLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIGhlaWdodDogNDAwcHg7XHJcbiAgICB3aWR0aDogNjAwcHg7XHJcbiAgICBib3JkZXI6IDFweCBncmF5IHNvbGlkO1xyXG4gIH1cclxuICBzdmcge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgfVxyXG4gIC5pdGVtR3JvdXAge1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gIH1cclxuICAuaXRlbSB7XHJcbiAgICBzdHJva2U6IGJsYWNrO1xyXG4gIH1cclxuICAuaXRlbS5tYXJrZWQge1xyXG4gICAgc3Ryb2tlOiByZWQ7XHJcbiAgICBzdHJva2Utd2lkdGg6IDJweDtcclxuICB9XHJcbiAgLmNsaWNrYWJsZSB7XHJcbiAgICBzdHJva2Utd2lkdGg6IDJweDtcclxuICB9XHJcbiAgLmRyYWdnYWJsZSB7XHJcbiAgICBjdXJzb3I6IGdyYWI7XHJcbiAgfVxyXG4gIC52YWx1ZSB7XHJcbiAgICBmb250OiBub3JtYWwgMTNweCBzYW5zLXNlcmlmO1xyXG4gICAgZmlsbDogYmxhY2s7XHJcbiAgICBzdHJva2U6IG5vbmU7XHJcbiAgfVxyXG4gIC52YWx1ZS5tYXJrZWQge1xyXG4gICAgZmlsbDogcmVkO1xyXG4gIH1cclxuICAubGluZSB7XHJcbiAgICBzdHJva2U6IGJsYWNrO1xyXG4gIH1cclxuICAubGluZS5tYXJrZWQge1xyXG4gICAgc3Ryb2tlLXdpZHRoOiAzcHg7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLWdyYXBoJywgWEl0ZW1zR3JhcGgpOyIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zVGFibGUgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgY29ubmVjdGlvbnM6IHt0eXBlOiBNYXB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDx0YWJsZT5cclxuICAgICAgICAke3RoaXMucmVuZGVySGVhZGVyKCl9XHJcbiAgICAgICAgJHt0aGlzLml0ZW1zLm1hcChpdGVtID0+IHRoaXMucmVuZGVyUm93KGl0ZW0udmFsdWUsIHRoaXMuY29ubmVjdGlvbnMuZ2V0KGl0ZW0pKSl9XHJcbiAgICAgIDwvdGFibGU+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVySGVhZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDx0cj5cclxuICAgICAgICA8dGg+PC90aD5cclxuICAgICAgICAke3RoaXMuaXRlbXMubWFwKGl0ZW0gPT4gaHRtbGA8dGg+JHtpdGVtLnZhbHVlfTwvdGg+YCl9XHJcbiAgICAgIDwvdHI+XHJcbiAgICBgO1xyXG4gIH1cclxuICBcclxuICByZW5kZXJSb3codmFsdWUsIGNvbm5lY3Rpb25zKSB7XHJcbiAgICBpZiAodGhpcy5jb25uZWN0aW9ucy5zaXplID4gMCkge1xyXG4gICAgICByZXR1cm4gaHRtbGBcclxuICAgICAgICA8dHI+XHJcbiAgICAgICAgICA8dGQ+JHt2YWx1ZX08L3RkPlxyXG4gICAgICAgICAgJHt0aGlzLml0ZW1zLm1hcChpdGVtID0+IGh0bWxgPHRkPiR7Y29ubmVjdGlvbnMuaGFzKGl0ZW0pID8gMSA6IDB9PC90ZD5gKX0gICAgICBcclxuICAgICAgICA8L3RyPlxyXG4gICAgICBgO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuWEl0ZW1zVGFibGUuc3R5bGVzID0gY3NzYFxyXG4gIDpob3N0IHtcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgaGVpZ2h0OiA0MDBweDtcclxuICAgIHdpZHRoOiA2MDBweDtcclxuICAgIGJhY2tncm91bmQ6IHBhcGF5YXdoaXA7XHJcbiAgfVxyXG4gIHRhYmxlIHtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XHJcbiAgfVxyXG4gIHRoLCB0ZCB7XHJcbiAgICBwYWRkaW5nOiAycHggNXB4O1xyXG4gIH1cclxuICB0aCB7XHJcbiAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCBibGFjaztcclxuICB9XHJcbiAgdGQge1xyXG4gICAgICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xyXG4gIH1cclxuICB0ciB0ZDpmaXJzdC1jaGlsZCxcclxuICB0ciB0aDpmaXJzdC1jaGlsZCB7XHJcbiAgICBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCBibGFjaztcclxuICAgIGZvbnQtZmFtaWx5OiBzYW5zLXNlcmlmO1xyXG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLXRhYmxlJywgWEl0ZW1zVGFibGUpOyIsImV4cG9ydCBjbGFzcyBNYXJrZXIge1xyXG4gIGNvbnN0cnVjdG9yKHtwb3NpdGlvbiwgdGV4dCwgY29sb3IgPSAncmVkJywgc2l6ZSA9IDF9KSB7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICB0aGlzLmNvbG9yID0gY29sb3I7XHJcbiAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcclxuICB9XHJcbn0iLCJpbXBvcnQge0xpdEVsZW1lbnQsIHN2ZywgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zVHJlZSBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiB7dHlwZTogQXJyYXl9LFxyXG4gICAgICBtYXJrZXI6IHt0eXBlOiBPYmplY3R9LFxyXG4gICAgICBjbGlja0ZuOiB7dHlwZTogRnVuY3Rpb259XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q29vcmRzKGkpIHtcclxuICAgIGNvbnN0IGxldmVsID0gTWF0aC5mbG9vcihNYXRoLmxvZzIoaSArIDEpKTtcclxuICAgIGNvbnN0IHBhcnQgPSA2MDAgLyAoMiAqKiAobGV2ZWwgKyAxKSk7XHJcbiAgICBjb25zdCB5ID0gKGxldmVsICsgMSkgKiA2MDtcclxuICAgIGNvbnN0IHggPSAyICogcGFydCAqIChpICsgMSAtIDIgKiogbGV2ZWwpICsgcGFydDtcclxuICAgIHJldHVybiB7eCwgeX07XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICBjb25zdCBpdGVtcyA9IHRoaXMuaXRlbXMubWFwKChpdGVtLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvb3JkcyA9IHRoaXMuZ2V0Q29vcmRzKGkpO1xyXG4gICAgICBjb25zdCBpTCA9IDIgKiBpICsgMTtcclxuICAgICAgY29uc3QgaVIgPSBpTCArIDE7XHJcbiAgICAgIGNvbnN0IGNvb3Jkc0wgPSB0aGlzLmdldENvb3JkcyhpTCk7XHJcbiAgICAgIGNvbnN0IGNvb3Jkc1IgPSB0aGlzLmdldENvb3JkcyhpUik7XHJcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlICE9IG51bGwgPyBzdmdgXHJcbiAgICAgICAgPGcgZmlsbD1cIiR7aXRlbS5jb2xvcn1cIj5cclxuICAgICAgICAgICR7dGhpcy5pdGVtc1tpTF0gJiYgdGhpcy5pdGVtc1tpTF0udmFsdWUgIT0gbnVsbCA/IHN2Z2BcclxuICAgICAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lXCIgeDE9XCIke2Nvb3Jkcy54fVwiIHkxPVwiJHtjb29yZHMueX1cIiB4Mj1cIiR7Y29vcmRzTC54fVwiIHkyPVwiJHtjb29yZHNMLnl9XCI+XHJcbiAgICAgICAgICBgIDogJyd9XHJcbiAgICAgICAgICAke3RoaXMuaXRlbXNbaVJdICYmIHRoaXMuaXRlbXNbaVJdLnZhbHVlICE9IG51bGwgPyBzdmdgXHJcbiAgICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIHgxPVwiJHtjb29yZHMueH1cIiB5MT1cIiR7Y29vcmRzLnl9XCIgeDI9XCIke2Nvb3Jkc1IueH1cIiB5Mj1cIiR7Y29vcmRzUi55fVwiPlxyXG4gICAgICAgICAgYCA6ICcnfVxyXG4gICAgICAgICAgPGcgQGNsaWNrPSR7dGhpcy5jbGlja0hhbmRsZXIuYmluZCh0aGlzLCBpdGVtKX0gY2xhc3M9XCIke3RoaXMuY2xpY2tGbiAhPSBudWxsID8gJ2NsaWNrYWJsZScgOiAnJ31cIj5cclxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cIml0ZW0gJHtpdGVtLm1hcmsgPyAnbWFya2VkJyA6ICcnfVwiIGN4PVwiJHtjb29yZHMueH1cIiBjeT1cIiR7Y29vcmRzLnl9XCIgcj1cIjEyXCI+PC9jaXJjbGU+XHJcbiAgICAgICAgICAgIDx0ZXh0IGNsYXNzPVwidmFsdWVcIiB4PVwiJHtjb29yZHMueH1cIiB5PVwiJHtjb29yZHMueSArIDJ9XCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBhbGlnbm1lbnQtYmFzZWxpbmU9XCJtaWRkbGVcIj4ke2l0ZW0udmFsdWV9PC90ZXh0PlxyXG4gICAgICAgICAgPC9nPlxyXG4gICAgICAgIDwvZz5cclxuICAgICAgICAke3RoaXMucmVuZGVyTWFya2VyKGksIGNvb3Jkcyl9XHJcbiAgICAgIGAgOiAnJztcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHN2Z2BcclxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDYwMCA0MDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XHJcbiAgICAgICAgJHtpdGVtc31cclxuICAgICAgPC9zdmc+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgY2xpY2tIYW5kbGVyKGl0ZW0pIHtcclxuICAgIGlmICh0aGlzLmNsaWNrRm4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLm1hcmtlciA9IG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiBpdGVtLmluZGV4fSk7XHJcbiAgICAgIHJldHVybiB0aGlzLmNsaWNrRm4oaXRlbSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZW5kZXJNYXJrZXIoaSAsY29vcmRzKSB7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICBpZiAodGhpcy5tYXJrZXIgJiYgdGhpcy5tYXJrZXIucG9zaXRpb24gPT09IGkpIHtcclxuICAgICAgcmVzdWx0ID0gc3ZnYFxyXG4gICAgICAgIDxnIGNsYXNzPVwibWFya2VyXCI+XHJcbiAgICAgICAgICA8bGluZSB4MT1cIiR7Y29vcmRzLnh9XCIgeTE9XCIke2Nvb3Jkcy55IC0gMTN9XCIgeDI9XCIke2Nvb3Jkcy54fVwiIHkyPVwiJHtjb29yZHMueSAtIDM1fVwiPjwvbGluZT4gICAgICAgIFxyXG4gICAgICAgICAgPGxpbmUgeDE9XCIke2Nvb3Jkcy54fVwiIHkxPVwiJHtjb29yZHMueSAtIDEzfVwiIHgyPVwiJHtjb29yZHMueCAtIDR9XCIgeTI9XCIke2Nvb3Jkcy55IC0gMjB9XCI+PC9saW5lPiAgICAgICBcclxuICAgICAgICAgIDxsaW5lIHgxPVwiJHtjb29yZHMueH1cIiB5MT1cIiR7Y29vcmRzLnkgLSAxM31cIiB4Mj1cIiR7Y29vcmRzLnggKyA0fVwiIHkyPVwiJHtjb29yZHMueSAtIDIwfVwiPjwvbGluZT4gICAgICAgIFxyXG4gICAgICAgIDwvZz5cclxuICAgICAgYDtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG5YSXRlbXNUcmVlLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIGhlaWdodDogNDAwcHg7XHJcbiAgICB3aWR0aDogNjAwcHg7ICAgIFxyXG4gIH1cclxuICBzdmcge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgfVxyXG4gIC5pdGVtIHtcclxuICAgIHN0cm9rZTogYmxhY2s7XHJcbiAgfVxyXG4gIC5pdGVtLm1hcmtlZCB7XHJcbiAgICBzdHJva2U6IHJlZDtcclxuICB9XHJcbiAgLmNsaWNrYWJsZSB7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBzdHJva2Utd2lkdGg6IDJweDtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIGZvbnQ6IG5vcm1hbCAxM3B4IHNhbnMtc2VyaWY7XHJcbiAgICBmaWxsOiBibGFjaztcclxuICAgIHN0cm9rZTogbm9uZTtcclxuICB9XHJcbiAgLmxpbmUge1xyXG4gICAgc3Ryb2tlOiBibGFjaztcclxuICB9XHJcbiAgLm1hcmtlciBsaW5lIHtcclxuICAgIHN0cm9rZTogcmVkO1xyXG4gICAgc3Ryb2tlLXdpZHRoOiAycHg7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLXRyZWUnLCBYSXRlbXNUcmVlKTsiLCJpbXBvcnQge0xpdEVsZW1lbnQsIGh0bWwsIGNzc30gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zVmVydGljYWwgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgdGVtcDoge3R5cGU6IE9iamVjdH0sXHJcbiAgICAgIG1hcmtlcnM6IHt0eXBlOiBBcnJheX0sXHJcbiAgICAgIHBpdm90czoge3R5cGU6IEFycmF5fVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gICAgdGhpcy5waXZvdHMgPSBbXTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICAke3RoaXMuaXRlbXMubWFwKGl0ZW0gPT4gaHRtbGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlX2NvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIiBzdHlsZT1cIiR7aXRlbS5jb2xvciA/ICdiYWNrZ3JvdW5kLWNvbG9yOicgKyBpdGVtLmNvbG9yICsgJzsnIDogJyd9ICR7aXRlbS52YWx1ZSA/ICdoZWlnaHQ6JyArIGl0ZW0udmFsdWUgKyAnJTsnIDogJyd9XCI+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5kZXhcIiBzdHlsZT1cIiR7dGhpcy5pdGVtcy5sZW5ndGggPiAyMCA/ICdkaXNwbGF5Om5vbmU7JyA6ICcnfVwiPlxyXG4gICAgICAgICAgICAke2l0ZW0uaW5kZXh9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtYXJrZXJfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNYXJrZXIoaXRlbS5pbmRleCl9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICR7dGhpcy5yZW5kZXJQaXZvdHMoaXRlbSl9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIGApfSAgICAgIFxyXG4gICAgICAke3RoaXMucmVuZGVyVGVtcCgpfVxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlclBpdm90cyhpdGVtKSB7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICB0aGlzLnBpdm90cy5mb3JFYWNoKChwaXZvdCwgaSkgPT4ge1xyXG4gICAgICBpZiAocGl2b3Quc3RhcnQgPD0gaXRlbS5pbmRleCAmJiBwaXZvdC5lbmQgPj0gaXRlbS5pbmRleCkge1xyXG4gICAgICAgIGNvbnN0IGlzRGltbWVkID0gdGhpcy5waXZvdHMubGVuZ3RoID4gMSAmJiB0aGlzLnBpdm90cy5sZW5ndGggIT09IGkgKyAxO1xyXG4gICAgICAgIHJlc3VsdCA9IGh0bWxgXHJcbiAgICAgICAgICAke3Jlc3VsdH1cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwaXZvdCAke2lzRGltbWVkID8gJ2RpbW1lZCcgOiAnJ31cIiBzdHlsZT1cImhlaWdodDogJHs0MDAgKiAoMSAtIHBpdm90LnZhbHVlIC8gMTAwKSAtIDJ9cHhcIj48L2Rpdj5cclxuICAgICAgICBgO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICByZW5kZXJUZW1wKCkge1xyXG4gICAgaWYgKHRoaXMudGVtcCBpbnN0YW5jZW9mIEl0ZW0pIHtcclxuICAgICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW0gdGVtcFwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlX2NvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIiBzdHlsZT1cIiR7dGhpcy50ZW1wLmNvbG9yID8gJ2JhY2tncm91bmQtY29sb3I6JyArIHRoaXMudGVtcC5jb2xvciArICc7JyA6ICcnfSAke3RoaXMudGVtcC52YWx1ZSA/ICdoZWlnaHQ6JyArIHRoaXMudGVtcC52YWx1ZSArICclOycgOiAnJ31cIj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtYXJrZXJfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNYXJrZXIoJ3RlbXAnKX1cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICBgO1xyXG4gICAgfVxyXG4gIH1cclxuICByZW5kZXJNYXJrZXIoaSkge1xyXG4gICAgbGV0IHJlc3VsdCA9ICcnO1xyXG4gICAgdGhpcy5tYXJrZXJzLmZvckVhY2gobWFya2VyID0+IHtcclxuICAgICAgaWYgKG1hcmtlci5wb3NpdGlvbiA9PT0gaSkge1xyXG4gICAgICAgIHJlc3VsdCA9IGh0bWxgXHJcbiAgICAgICAgICAke3Jlc3VsdH1cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtYXJrZXIgc2l6ZV8ke21hcmtlci5zaXplfSAke21hcmtlci5jb2xvciA/ICdjb2xvcl8nICsgbWFya2VyLmNvbG9yIDogJyd9XCI+XHJcbiAgICAgICAgICAgIDxzcGFuPiR7dGhpcy5pdGVtcy5sZW5ndGggPiAyMCA/ICcnIDogbWFya2VyLnRleHR9PC9zcGFuPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgYDtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxufVxyXG5cclxuWEl0ZW1zVmVydGljYWwuc3R5bGVzID0gY3NzYFxyXG4gIDpob3N0IHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xyXG4gICAgZmxleC13cmFwOiBub3dyYXA7XHJcbiAgICBtYXgtd2lkdGg6IDYwMHB4O1xyXG4gIH1cclxuICAuaXRlbSB7XHJcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcclxuICAgIG1pbi13aWR0aDogNXB4O1xyXG4gICAgZmxleC1ncm93OiAxO1xyXG4gICAgZmxleC1iYXNpczogMDtcclxuICB9XHJcbiAgLnRlbXAge1xyXG4gICAgbWFyZ2luLWxlZnQ6IDJlbTtcclxuICB9XHJcbiAgLmluZGV4IHtcclxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgIG1hcmdpbi1ib3R0b206IDVweDtcclxuICB9XHJcbiAgLnZhbHVlX2NvbnRhaW5lciB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbi1yZXZlcnNlO1xyXG4gICAgaGVpZ2h0OiA0MDBweDtcclxuICAgIG1hcmdpbi1ib3R0b206IDVweDtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIGJvcmRlcjogMXB4IHNvbGlkIGxpZ2h0Z3JheTtcclxuICB9XHJcbiAgLnBpdm90IHtcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHRvcDogMDtcclxuICAgIGxlZnQ6IDA7XHJcbiAgICB3aWR0aDogMTAwJTtcclxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCBibGFjaztcclxuICB9XHJcbiAgLnBpdm90LmRpbW1lZCB7XHJcbiAgICBib3JkZXItYm90dG9tLXN0eWxlOiBkb3R0ZWQ7XHJcbiAgfVxyXG4gIC5tYXJrZXJfY29udGFpbmVyIHtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgIGhlaWdodDogNmVtO1xyXG4gIH1cclxuICAubWFya2VyIHtcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHRvcDogMDtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgZm9udC1zaXplOiAuOGVtO1xyXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gIH1cclxuICAubWFya2VyIHNwYW4ge1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgbWluLXdpZHRoOiA1ZW07XHJcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoLTUwJSk7XHJcbiAgICB0ZXh0LXNoYWRvdzogd2hpdGUgMXB4IDFweCAwO1xyXG4gIH1cclxuICAubWFya2VyOmJlZm9yZSB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgd2lkdGg6IDVweDtcclxuICAgIGhlaWdodDogNXB4O1xyXG4gICAgdG9wOiAtMnB4O1xyXG4gICAgbGVmdDogNTAlO1xyXG4gICAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKSB0cmFuc2xhdGUoLTUwJSk7XHJcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXI7XHJcbiAgICBib3JkZXI6IDJweCBzb2xpZDtcclxuICAgIGJvcmRlci1sZWZ0OiBub25lO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICB9XHJcbiAgLm1hcmtlcjphZnRlciB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgd2lkdGg6IDJweDtcclxuICAgIHRvcDogMDtcclxuICAgIGxlZnQ6IDUwJTtcclxuICB9XHJcbiAgLnNpemVfMS5tYXJrZXIge1xyXG4gICAgei1pbmRleDogMztcclxuICAgIHBhZGRpbmctdG9wOiAxZW07XHJcbiAgfVxyXG4gIC5zaXplXzEubWFya2VyOmFmdGVyIHtcclxuICAgIGhlaWdodDogMWVtO1xyXG4gIH1cclxuICAuc2l6ZV8yLm1hcmtlciB7XHJcbiAgICB6LWluZGV4OiAyO1xyXG4gICAgcGFkZGluZy10b3A6IDNlbTtcclxuICB9XHJcbiAgLnNpemVfMi5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgaGVpZ2h0OiAzZW07XHJcbiAgfVxyXG4gIC5zaXplXzMubWFya2VyIHtcclxuICAgIHotaW5kZXg6IDE7XHJcbiAgICBwYWRkaW5nLXRvcDogNWVtO1xyXG4gIH1cclxuICAuc2l6ZV8zLm1hcmtlcjphZnRlciB7XHJcbiAgICBoZWlnaHQ6IDVlbTtcclxuICB9XHJcbiAgLmNvbG9yX3JlZC5tYXJrZXIge1xyXG4gICAgY29sb3I6IHJlZDtcclxuICB9XHJcbiAgLmNvbG9yX3JlZC5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGJvcmRlci1jb2xvcjogcmVkO1xyXG4gIH1cclxuICAuY29sb3JfcmVkLm1hcmtlcjphZnRlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XHJcbiAgfVxyXG4gIC5jb2xvcl9ibHVlLm1hcmtlciB7XHJcbiAgICBjb2xvcjogYmx1ZTtcclxuICB9XHJcbiAgLmNvbG9yX2JsdWUubWFya2VyOmJlZm9yZSB7XHJcbiAgICBib3JkZXItY29sb3I6IGJsdWU7XHJcbiAgfVxyXG4gIC5jb2xvcl9ibHVlLm1hcmtlcjphZnRlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBibHVlO1xyXG4gIH1cclxuICAuY29sb3JfcHVycGxlLm1hcmtlciB7XHJcbiAgICBjb2xvcjogcHVycGxlO1xyXG4gIH1cclxuICAuY29sb3JfcHVycGxlLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgYm9yZGVyLWNvbG9yOiBwdXJwbGU7XHJcbiAgfVxyXG4gIC5jb2xvcl9wdXJwbGUubWFya2VyOmFmdGVyIHtcclxuICAgIGJhY2tncm91bmQtY29sb3I6IHB1cnBsZTtcclxuICB9XHJcbmA7XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtaXRlbXMtdmVydGljYWwnLCBYSXRlbXNWZXJ0aWNhbCk7IiwiaW1wb3J0IHtjc3MsIGh0bWwsIExpdEVsZW1lbnR9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuXHJcbmV4cG9ydCBjbGFzcyBYSXRlbXNIb3Jpem9udGFsIGV4dGVuZHMgTGl0RWxlbWVudCB7XHJcbiAgc3RhdGljIGdldCBwcm9wZXJ0aWVzKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXRlbXM6IHt0eXBlOiBBcnJheX0sXHJcbiAgICAgIG1hcmtlcnM6IHt0eXBlOiBBcnJheX0sXHJcbiAgICAgIHJldmVyc2U6IHt0eXBlOiBCb29sZWFufSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5pdGVtcy5tYXAoaXRlbSA9PiBodG1sYFxyXG4gICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJpbmRleFwiPlxyXG4gICAgICAgICAgJHtpdGVtLmluZGV4fVxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiIHN0eWxlPVwiJHtpdGVtLmNvbG9yID8gJ2JhY2tncm91bmQtY29sb3I6JyArIGl0ZW0uY29sb3IgOiAnJ31cIj5cclxuICAgICAgICAgICR7aXRlbS52YWx1ZX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibWFya2VyX2NvbnRhaW5lciAke2l0ZW0ubWFyayA/ICdtYXJrJyA6ICcnfVwiPlxyXG4gICAgICAgICAgJHt0aGlzLnJlbmRlck1hcmtlcihpdGVtLmluZGV4KX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9kaXY+XHJcbiAgICBgKTtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICAke3RoaXMucmV2ZXJzZSA/IGl0ZW1zLnJldmVyc2UoKSA6IGl0ZW1zfSAgICAgIFxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlck1hcmtlcihpKSB7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICB0aGlzLm1hcmtlcnMuZm9yRWFjaChtYXJrZXIgPT4ge1xyXG4gICAgICBpZiAobWFya2VyLnBvc2l0aW9uID09PSBpKSB7XHJcbiAgICAgICAgcmVzdWx0ID0gaHRtbGBcclxuICAgICAgICAgICR7cmVzdWx0fVxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1hcmtlciBzaXplXyR7bWFya2VyLnNpemV9ICR7bWFya2VyLmNvbG9yID8gJ2NvbG9yXycgKyBtYXJrZXIuY29sb3IgOiAnJ31cIj5cclxuICAgICAgICAgICAgPHNwYW4+JHttYXJrZXIudGV4dH08L3NwYW4+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG5YSXRlbXNIb3Jpem9udGFsLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcclxuICAgIGZsZXgtd3JhcDogd3JhcDtcclxuICAgIGhlaWdodDogMTllbTtcclxuICAgIG1heC13aWR0aDogNjAwcHg7XHJcbiAgfVxyXG4gIC5pdGVtIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgfVxyXG4gIC5pbmRleCwgLnZhbHVlLCAuc3RhdGUge1xyXG4gICAgYWxpZ24tc2VsZjogY2VudGVyO1xyXG4gIH1cclxuICAuaW5kZXgge1xyXG4gICAgd2lkdGg6IDEuNWVtO1xyXG4gICAgcGFkZGluZy1yaWdodDogNHB4O1xyXG4gICAgdGV4dC1hbGlnbjogcmlnaHQ7XHJcbiAgfVxyXG4gIC52YWx1ZSB7XHJcbiAgICBtaW4td2lkdGg6IDEuN2VtO1xyXG4gICAgbWluLWhlaWdodDogMS43ZW07XHJcbiAgICBwYWRkaW5nOiAwIDEwcHg7XHJcbiAgICBtYXJnaW46IDA7XHJcbiAgICBsaW5lLWhlaWdodDogMS43ZW07XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XHJcbiAgfVxyXG4gIC5tYXJrZXJfY29udGFpbmVyIHtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgIG1pbi1oZWlnaHQ6IDEuN2VtO1xyXG4gICAgcGFkZGluZy1sZWZ0OiAzZW07XHJcbiAgICBsaW5lLWhlaWdodDogMS43ZW07XHJcbiAgfVxyXG4gIC5tYXJrOmJlZm9yZSB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIHdpZHRoOiA0cHg7XHJcbiAgICBoZWlnaHQ6IDEuOWVtO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgbGVmdDogMDtcclxuICAgIG1hcmdpbi10b3A6IC0xcHg7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByb3lhbGJsdWU7XHJcbiAgfVxyXG4gIC5tYXJrZXIge1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgbGVmdDogMDtcclxuICAgIGhlaWdodDogMTAwJTtcclxuICAgIGZvbnQtc2l6ZTogLjhlbTtcclxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICB9XHJcbiAgLm1hcmtlciBzcGFuIHtcclxuICAgIHRleHQtc2hhZG93OiB3aGl0ZSAxcHggMXB4IDA7XHJcbiAgfVxyXG4gIC5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICB3aWR0aDogNXB4O1xyXG4gICAgaGVpZ2h0OiA1cHg7XHJcbiAgICB0b3A6IDUwJTtcclxuICAgIGxlZnQ6IDZweDtcclxuICAgIHRyYW5zZm9ybTogcm90YXRlKC0xMzVkZWcpIHRyYW5zbGF0ZSg1MCUsIDUwJSk7XHJcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXI7XHJcbiAgICBib3JkZXI6IDJweCBzb2xpZDtcclxuICAgIGJvcmRlci1sZWZ0OiBub25lO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICB9XHJcbiAgLm1hcmtlcjphZnRlciB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgaGVpZ2h0OiAycHg7XHJcbiAgICB0b3A6IDUwJTtcclxuICAgIGxlZnQ6IDZweDtcclxuICAgIG1hcmdpbi10b3A6IC0ycHg7XHJcbiAgfVxyXG4gIC5zaXplXzEubWFya2VyIHtcclxuICAgIHotaW5kZXg6IDM7XHJcbiAgICBwYWRkaW5nLWxlZnQ6IDJlbTtcclxuICB9XHJcbiAgLnNpemVfMS5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgd2lkdGg6IDFlbTtcclxuICB9XHJcbiAgLnNpemVfMi5tYXJrZXIge1xyXG4gICAgei1pbmRleDogMjtcclxuICAgIHBhZGRpbmctbGVmdDogNGVtO1xyXG4gIH1cclxuICAuc2l6ZV8yLm1hcmtlcjphZnRlciB7XHJcbiAgICB3aWR0aDogM2VtO1xyXG4gIH1cclxuICAuc2l6ZV8zLm1hcmtlciB7XHJcbiAgICB6LWluZGV4OiAxO1xyXG4gICAgcGFkZGluZy1sZWZ0OiA2ZW07XHJcbiAgfVxyXG4gIC5zaXplXzMubWFya2VyOmFmdGVyIHtcclxuICAgIHdpZHRoOiA1ZW07XHJcbiAgfVxyXG4gIC5jb2xvcl9yZWQubWFya2VyIHtcclxuICAgIGNvbG9yOiByZWQ7XHJcbiAgfVxyXG4gIC5jb2xvcl9yZWQubWFya2VyOmJlZm9yZSB7XHJcbiAgICBib3JkZXItY29sb3I6IHJlZDtcclxuICB9XHJcbiAgLmNvbG9yX3JlZC5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmVkO1xyXG4gIH1cclxuICAuY29sb3JfYmx1ZS5tYXJrZXIge1xyXG4gICAgY29sb3I6IGJsdWU7XHJcbiAgfVxyXG4gIC5jb2xvcl9ibHVlLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgYm9yZGVyLWNvbG9yOiBibHVlO1xyXG4gIH1cclxuICAuY29sb3JfYmx1ZS5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogYmx1ZTtcclxuICB9XHJcbiAgLmNvbG9yX3B1cnBsZS5tYXJrZXIge1xyXG4gICAgY29sb3I6IHB1cnBsZTtcclxuICB9XHJcbiAgLmNvbG9yX3B1cnBsZS5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGJvcmRlci1jb2xvcjogcHVycGxlO1xyXG4gIH1cclxuICAuY29sb3JfcHVycGxlLm1hcmtlcjphZnRlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBwdXJwbGU7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLWhvcml6b250YWwnLCBYSXRlbXNIb3Jpem9udGFsKTsiLCJpbXBvcnQge0xpdEVsZW1lbnQsIGh0bWwsIGNzc30gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFhJdGVtc0hvcml6b250YWxMaW5rZWQgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgbWFya2VyOiB7dHlwZTogT2JqZWN0fSxcclxuICAgICAgbmFycm93OiB7dHlwZTogQm9vbGVhbn1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLm1hcmtlciA9IHt9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgICR7dGhpcy5pdGVtcy5tYXAoKGl0ZW0sIGkpID0+IGh0bWxgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW0gJHtpdGVtLm1hcmsgPyAnbWFyaycgOiAnJ30gJHtpdGVtLnZhbHVlID09IG51bGwgPyAnbm8tZGF0YSc6ICcnfVwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCIgc3R5bGU9XCIke2l0ZW0uY29sb3IgPyAnYmFja2dyb3VuZC1jb2xvcjonICsgaXRlbS5jb2xvciA6ICcnfVwiPlxyXG4gICAgICAgICAgICAke2l0ZW0udmFsdWUgIT0gbnVsbCA/IGl0ZW0udmFsdWUgOiBodG1sYCZuYnNwO2B9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtYXJrZXJfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICR7dGhpcy5tYXJrZXIucG9zaXRpb24gPT09IChpdGVtLmluZGV4ICE9IG51bGwgPyBpdGVtLmluZGV4IDogaSkgPyBodG1sYDxkaXYgY2xhc3M9XCJtYXJrZXJcIj48L2Rpdj5gIDogJyd9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgYCl9XHJcbiAgICBgO1xyXG4gIH1cclxufVxyXG5cclxuWEl0ZW1zSG9yaXpvbnRhbExpbmtlZC5zdHlsZXMgPSBjc3NgXHJcbiAgOmhvc3Qge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XHJcbiAgICBmbGV4LXdyYXA6IHdyYXA7XHJcbiAgICBhbGlnbi1jb250ZW50OiBmbGV4LXN0YXJ0O1xyXG4gICAgaGVpZ2h0OiAxOWVtO1xyXG4gICAgbWF4LXdpZHRoOiA2MDBweDtcclxuICB9XHJcbiAgOmhvc3QoW25hcnJvd10pLFxyXG4gIDpob3N0KFtuYXJyb3ddKSAuaXRlbSB7XHJcbiAgICBoZWlnaHQ6IDNlbTtcclxuICB9XHJcbiAgOmhvc3QoW25hcnJvd10pIC5pdGVtOmZpcnN0LWNoaWxkIHtcclxuICAgIG1hcmdpbi1sZWZ0OiAwLjZlbTtcclxuICB9XHJcbiAgOmhvc3QoW25hcnJvd10pIC5pdGVtOmZpcnN0LWNoaWxkOmFmdGVyIHtcclxuICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgfVxyXG4gIDpob3N0KFtuYXJyb3ddKSAubWFya2VyOmFmdGVyIHtcclxuICAgIGhlaWdodDogMTBweDtcclxuICB9XHJcbiAgLml0ZW0ge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XHJcbiAgICBtYXJnaW4tbGVmdDogMmVtO1xyXG4gICAgaGVpZ2h0OiA0LjVlbTtcclxuICB9XHJcbiAgLml0ZW0ubm8tZGF0YTpiZWZvcmUsXHJcbiAgLml0ZW06Zmlyc3QtY2hpbGQ6YmVmb3JlIHtcclxuICAgIGRpc3BsYXk6IG5vbmU7ICBcclxuICB9XHJcbiAgLml0ZW0ubWFyazpmaXJzdC1jaGlsZDphZnRlciB7XHJcbiAgICBib3JkZXItbGVmdDogbm9uZTtcclxuICB9XHJcbiAgLml0ZW06Zmlyc3QtY2hpbGQ6YWZ0ZXIge1xyXG4gICAgbGVmdDogMmVtO1xyXG4gICAgd2lkdGg6IDNlbTtcclxuICB9XHJcbiAgLml0ZW06bGFzdC1jaGlsZDphZnRlciB7XHJcbiAgICB3aWR0aDogNWVtO1xyXG4gIH1cclxuICAuaXRlbS5tYXJrOmxhc3QtY2hpbGQ6YWZ0ZXIge1xyXG4gICAgYm9yZGVyLXJpZ2h0OiBub25lO1xyXG4gIH1cclxuICAuaXRlbTpiZWZvcmUge1xyXG4gICAgY29udGVudDogJyc7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHdpZHRoOiA1cHg7XHJcbiAgICBoZWlnaHQ6IDVweDtcclxuICAgIHRvcDogMC44NWVtO1xyXG4gICAgbGVmdDogLTFweDtcclxuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC0xMDAlLCAtNTAlKSByb3RhdGUoNDVkZWcpO1xyXG4gICAgdHJhbnNmb3JtLW9yaWdpbjogY2VudGVyO1xyXG4gICAgYm9yZGVyOiAycHggc29saWQ7XHJcbiAgICBib3JkZXItbGVmdDogbm9uZTtcclxuICAgIGJvcmRlci1ib3R0b206IG5vbmU7XHJcbiAgICBib3JkZXItY29sb3I6IGdyYXk7XHJcbiAgfVxyXG4gIC5pdGVtOmFmdGVyIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICBoZWlnaHQ6IDJweDtcclxuICAgIHdpZHRoOiA3ZW07XHJcbiAgICB0b3A6IDAuODVlbTtcclxuICAgIGxlZnQ6IC0yZW07XHJcbiAgICBtYXJnaW4tdG9wOiAtMXB4O1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogZ3JheTtcclxuICB9XHJcbiAgLml0ZW0ubWFyayB7XHJcbiAgICB0b3A6IDEuNWVtO1xyXG4gICAgaGVpZ2h0OiAzZW07XHJcbiAgICBsZWZ0OiAxZW07XHJcbiAgICBtYXJnaW46IDA7XHJcbiAgfVxyXG4gIC5pdGVtLm1hcms6YmVmb3JlIHtcclxuICAgIHRvcDogLTFweDtcclxuICAgIGxlZnQ6IDFlbTtcclxuICAgIG1hcmdpbi1sZWZ0OiAtMXB4O1xyXG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTEwMCUpIHJvdGF0ZSgxMzVkZWcpO1xyXG4gIH1cclxuICAuaXRlbS5tYXJrOmFmdGVyIHtcclxuICAgIGhlaWdodDogLjc1ZW07XHJcbiAgICB3aWR0aDogMWVtO1xyXG4gICAgdG9wOiAtLjc1ZW07XHJcbiAgICBsZWZ0OiAxZW07XHJcbiAgICBib3JkZXI6IDJweCBzb2xpZCBncmF5O1xyXG4gICAgYm9yZGVyLXRvcDogbm9uZTtcclxuICAgIGJvcmRlci1ib3R0b206IG5vbmU7XHJcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtMnB4LCAycHgpO1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XHJcbiAgfVxyXG4gIC52YWx1ZSB7XHJcbiAgICB6LWluZGV4OiAxO1xyXG4gICAgbWluLXdpZHRoOiAxLjdlbTtcclxuICAgIG1pbi1oZWlnaHQ6IDEuN2VtO1xyXG4gICAgcGFkZGluZzogMCAxMHB4O1xyXG4gICAgbWFyZ2luOiAwO1xyXG4gICAgbGluZS1oZWlnaHQ6IDEuN2VtO1xyXG4gICAgYm9yZGVyOiAxcHggc29saWQgbGlnaHRncmF5O1xyXG4gICAgYWxpZ24tc2VsZjogY2VudGVyO1xyXG4gIH1cclxuICAubWFya2VyIHtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICB9XHJcbiAgLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgY29udGVudDogJyc7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHdpZHRoOiA1cHg7XHJcbiAgICBoZWlnaHQ6IDVweDtcclxuICAgIHRvcDogMnB4O1xyXG4gICAgbGVmdDogNTAlO1xyXG4gICAgdHJhbnNmb3JtOiByb3RhdGUoLTQ1ZGVnKSB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XHJcbiAgICBib3JkZXI6IDJweCBzb2xpZDtcclxuICAgIGJvcmRlci1sZWZ0OiBub25lO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICAgIGJvcmRlci1jb2xvcjogcmVkO1xyXG4gIH1cclxuICAubWFya2VyOmFmdGVyIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICB3aWR0aDogMnB4O1xyXG4gICAgaGVpZ2h0OiAxZW07XHJcbiAgICB0b3A6IDFweDtcclxuICAgIGxlZnQ6IDUwJTtcclxuICAgIG1hcmdpbi1sZWZ0OiAtMnB4O1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmVkO1xyXG4gIH1cclxuYDtcclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgneC1pdGVtcy1ob3Jpem9udGFsLWxpbmtlZCcsIFhJdGVtc0hvcml6b250YWxMaW5rZWQpOyIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbmltcG9ydCB7IGlzUHJpbWl0aXZlIH0gZnJvbSAnLi4vbGliL3BhcnRzLmpzJztcbmltcG9ydCB7IGRpcmVjdGl2ZSwgTm9kZVBhcnQgfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG4vLyBGb3IgZWFjaCBwYXJ0LCByZW1lbWJlciB0aGUgdmFsdWUgdGhhdCB3YXMgbGFzdCByZW5kZXJlZCB0byB0aGUgcGFydCBieSB0aGVcbi8vIHVuc2FmZUhUTUwgZGlyZWN0aXZlLCBhbmQgdGhlIERvY3VtZW50RnJhZ21lbnQgdGhhdCB3YXMgbGFzdCBzZXQgYXMgYSB2YWx1ZS5cbi8vIFRoZSBEb2N1bWVudEZyYWdtZW50IGlzIHVzZWQgYXMgYSB1bmlxdWUga2V5IHRvIGNoZWNrIGlmIHRoZSBsYXN0IHZhbHVlXG4vLyByZW5kZXJlZCB0byB0aGUgcGFydCB3YXMgd2l0aCB1bnNhZmVIVE1MLiBJZiBub3QsIHdlJ2xsIGFsd2F5cyByZS1yZW5kZXIgdGhlXG4vLyB2YWx1ZSBwYXNzZWQgdG8gdW5zYWZlSFRNTC5cbmNvbnN0IHByZXZpb3VzVmFsdWVzID0gbmV3IFdlYWtNYXAoKTtcbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIEhUTUwsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVIVE1MID0gZGlyZWN0aXZlKCh2YWx1ZSkgPT4gKHBhcnQpID0+IHtcbiAgICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zYWZlSFRNTCBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgICB9XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzVmFsdWVzLmdldChwYXJ0KTtcbiAgICBpZiAocHJldmlvdXNWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIGlzUHJpbWl0aXZlKHZhbHVlKSAmJlxuICAgICAgICB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZS52YWx1ZSAmJiBwYXJ0LnZhbHVlID09PSBwcmV2aW91c1ZhbHVlLmZyYWdtZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IHZhbHVlOyAvLyBpbm5lckhUTUwgY2FzdHMgdG8gc3RyaW5nIGludGVybmFsbHlcbiAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gICAgcGFydC5zZXRWYWx1ZShmcmFnbWVudCk7XG4gICAgcHJldmlvdXNWYWx1ZXMuc2V0KHBhcnQsIHsgdmFsdWUsIGZyYWdtZW50IH0pO1xufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD11bnNhZmUtaHRtbC5qcy5tYXAiLCJpbXBvcnQge0xpdEVsZW1lbnQsIGh0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHt1bnNhZmVIVE1MfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLmpzJztcclxuXHJcbi8qKlxyXG4gKiByb3V0ZXMgW1xyXG4gICB7cGF0aDogJy8nLCBjb21wb25lbnQ6ICd4LXVzZXItbGlzdCd9LFxyXG4gICB7cGF0aDogJy91c2VyJywgY29tcG9uZW50OiAneC11c2VyLXByb2ZpbGUnfVxyXG4gXVxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBYUm91dGVyIGV4dGVuZHMgTGl0RWxlbWVudCB7XHJcbiAgc3RhdGljIGdldCBwcm9wZXJ0aWVzKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcm91dGVzOiB7dHlwZTogQXJyYXl9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgbGV0IHRlbXBsYXRlID0gJyc7XHJcbiAgICBpZiAodGhpcy5yb3V0ZXMpIHtcclxuICAgICAgY29uc3Qgcm91dGUgPSB0aGlzLnJvdXRlcy5maW5kKHJvdXRlID0+IHtcclxuICAgICAgICByZXR1cm4gcm91dGUucGF0aCA9PT0gZGVjb2RlVVJJQ29tcG9uZW50KGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmIChyb3V0ZSkge1xyXG4gICAgICAgIHRlbXBsYXRlID0gYDwke3JvdXRlLmNvbXBvbmVudH0+PC8ke3JvdXRlLmNvbXBvbmVudH0+YDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGh0bWxgJHt1bnNhZmVIVE1MKHRlbXBsYXRlKX1gO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUmVuZGVyUm9vdCgpIHtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LXJvdXRlcicsIFhSb3V0ZXIpO1xyXG4iLCJleHBvcnQgY2xhc3MgWFJvdXRlckEgZXh0ZW5kcyBIVE1MQW5jaG9yRWxlbWVudCB7XHJcbiAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XHJcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZSA9PiB7XHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB0aGlzLmF0dHJpYnV0ZXMuaHJlZi5ub2RlVmFsdWUpO1xyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd4LXJvdXRlcicpLmZvckVhY2goeFJvdXRlciA9PiB4Um91dGVyLnJlcXVlc3RVcGRhdGUoKSk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgneC1yb3V0ZXItYScsIFhSb3V0ZXJBLCB7ZXh0ZW5kczogJ2EnfSk7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sLCBjc3N9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuXHJcbmV4cG9ydCBjbGFzcyBYQ29uc29sZSBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRlZmF1bHRNZXNzYWdlOiB7dHlwZTogU3RyaW5nfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuZGVmYXVsdE1lc3NhZ2UgPSAnUHJlc3MgYW55IGJ1dHRvbic7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPHAgY2xhc3M9XCJtZXNzYWdlXCI+JHt0aGlzLm1lc3NhZ2UgfHwgdGhpcy5kZWZhdWx0TWVzc2FnZX08L3A+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgc2V0TWVzc2FnZSh0ZXh0KSB7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSB0ZXh0O1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5YQ29uc29sZS5zdHlsZXMgPSBjc3NgXHJcbiAgOmhvc3Qge1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgfVxyXG4gIC5tZXNzYWdlIHtcclxuICAgIHBhZGRpbmc6IDEwcHg7XHJcbiAgICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xyXG4gIH1cclxuYDtcclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgneC1jb25zb2xlJywgWENvbnNvbGUpOyIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFhEaWFsb2cgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGRpYWxvZz5cclxuICAgICAgICA8Zm9ybSBtZXRob2Q9XCJkaWFsb2dcIj5cclxuICAgICAgICAgIDxwIGNsYXNzPVwic2xvdENudFwiPlxyXG4gICAgICAgICAgICA8c2xvdD48L3Nsb3Q+XHJcbiAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICA8YnV0dG9uIHZhbHVlPVwiZGVmYXVsdFwiPkNvbmZpcm08L2J1dHRvbj5cclxuICAgICAgICAgIDxidXR0b24gdmFsdWU9XCJjYW5jZWxcIj5DYW5jZWw8L2J1dHRvbj5cclxuICAgICAgICA8L2Zvcm0+XHJcbiAgICAgIDwvZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGZpcnN0VXBkYXRlZCgpIHtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoJ2RpYWxvZycpO1xyXG4gICAgdGhpcy5mb3JtID0gdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoJ2Zvcm0nKTtcclxuICAgIC8vbW92ZSBzbG90dGVkIG5vZGVzIGludG8gZGlhbG9nJ3MgZm9ybSBkaXJlY3RseSBmb3IgcHJvcGVyIHdvcmsgRm9ybURhdGFcclxuICAgIC8vVE9ETzogZmluZCBhIGJldHRlciB3YXkgdG8gYmVhdCB0aGlzIHByb2JsZW1cclxuICAgIGNvbnN0IHNsb3QgPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3Rvcignc2xvdCcpO1xyXG4gICAgdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoJy5zbG90Q250JykuYXBwZW5kKC4uLnNsb3QuYXNzaWduZWROb2RlcygpKTtcclxuICAgIHNsb3QucmVtb3ZlKCk7XHJcbiAgfVxyXG5cclxuICBvcGVuKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdGhpcy5kaWFsb2cuc2hvd01vZGFsKCk7XHJcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcclxuICAgICAgICBpZiAodGhpcy5kaWFsb2cucmV0dXJuVmFsdWUgPT09ICdkZWZhdWx0Jykge1xyXG4gICAgICAgICAgcmVzb2x2ZShuZXcgRm9ybURhdGEodGhpcy5mb3JtKSk7XHJcbiAgICAgICAgICB0aGlzLmZvcm0ucmVzZXQoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVqZWN0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICB0aGlzLmRpYWxvZy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtZGlhbG9nJywgWERpYWxvZyk7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sLCBjc3N9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuXHJcbmV4cG9ydCBjbGFzcyBYQnV0dG9uIGV4dGVuZHMgTGl0RWxlbWVudCB7XHJcbiAgc3RhdGljIGdldCBwcm9wZXJ0aWVzKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY2FsbGJhY2s6IHt0eXBlOiBGdW5jdGlvbn0sXHJcbiAgICAgIGRpc2FibGVkOiB7dHlwZTogQm9vbGVhbn0sXHJcbiAgICAgIGFjdGl2YXRlZDoge3R5cGU6IEJvb2xlYW59XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxidXR0b24gQGNsaWNrPSR7dGhpcy5oYW5kbGVDbGlja30gP2Rpc2FibGVkPSR7dGhpcy5kaXNhYmxlZH0+XHJcbiAgICAgICAgPHNsb3QgY2xhc3M9JHt0aGlzLmFjdGl2YXRlZCA/ICdoaWRkZW4nIDogJyd9Pjwvc2xvdD4gICAgICBcclxuICAgICAgICA8c3BhbiBjbGFzcz0ke3RoaXMuYWN0aXZhdGVkID8gJycgOiAnaGlkZGVuJ30+TmV4dDwvc3Bhbj5cclxuICAgICAgPC9idXR0b24+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUmVuZGVyUm9vdCgpIHtcclxuICAgIHJldHVybiB0aGlzLmF0dGFjaFNoYWRvdyh7bW9kZTogJ29wZW4nLCBkZWxlZ2F0ZXNGb2N1czogdHJ1ZX0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlZCgpIHtcclxuICAgIGlmICh0aGlzLmFjdGl2YXRlZCkge1xyXG4gICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ2FjdGl2YXRlZCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmF0ZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGhhbmRsZUNsaWNrKCkge1xyXG4gICAgdGhpcy5jYWxsYmFjayh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcblhCdXR0b24uc3R5bGVzID0gY3NzYFxyXG4gIC5oaWRkZW4ge1xyXG4gICAgZGlzcGxheTogbm9uZTtcclxuICB9XHJcbmA7XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtYnV0dG9uJywgWEJ1dHRvbik7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEFwcCBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHJlbmRlcigpIHtcclxuICAgIGNvbnN0IHJvdXRlcyA9IFtcclxuICAgICAge3BhdGg6ICcvYXJyYXknLCBjb21wb25lbnQ6ICdwYWdlLWFycmF5JywgdGl0bGU6ICdBcnJheSd9LFxyXG4gICAgICB7cGF0aDogJy9vcmRlcmVkQXJyYXknLCBjb21wb25lbnQ6ICdwYWdlLW9yZGVyZWQtYXJyYXknLCB0aXRsZTogJ09yZGVyZWQgQXJyYXknfSxcclxuICAgICAge3BhdGg6ICcvYnViYmxlU29ydCcsIGNvbXBvbmVudDogJ3BhZ2UtYnViYmxlLXNvcnQnLCB0aXRsZTogJ0J1YmJsZSBTb3J0J30sXHJcbiAgICAgIHtwYXRoOiAnL3NlbGVjdFNvcnQnLCBjb21wb25lbnQ6ICdwYWdlLXNlbGVjdC1zb3J0JywgdGl0bGU6ICdTZWxlY3QgU29ydCd9LFxyXG4gICAgICB7cGF0aDogJy9pbnNlcnRpb25Tb3J0JywgY29tcG9uZW50OiAncGFnZS1pbnNlcnRpb24tc29ydCcsIHRpdGxlOiAnSW5zZXJ0aW9uIFNvcnQnfSxcclxuICAgICAge3BhdGg6ICcvc3RhY2snLCBjb21wb25lbnQ6ICdwYWdlLXN0YWNrJywgdGl0bGU6ICdTdGFjayd9LFxyXG4gICAgICB7cGF0aDogJy9xdWV1ZScsIGNvbXBvbmVudDogJ3BhZ2UtcXVldWUnLCB0aXRsZTogJ1F1ZXVlJ30sXHJcbiAgICAgIHtwYXRoOiAnL3ByaW9yaXR5UXVldWUnLCBjb21wb25lbnQ6ICdwYWdlLXByaW9yaXR5LXF1ZXVlJywgdGl0bGU6ICdQcmlvcml5IFF1ZXVlJ30sXHJcbiAgICAgIHtwYXRoOiAnL2xpbmtMaXN0JywgY29tcG9uZW50OiAncGFnZS1saW5rLWxpc3QnLCB0aXRsZTogJ0xpbmsgTGlzdCd9LFxyXG4gICAgICB7cGF0aDogJy9tZXJnZVNvcnQnLCBjb21wb25lbnQ6ICdwYWdlLW1lcmdlLXNvcnQnLCB0aXRsZTogJ01lcmdlIFNvcnQnfSxcclxuICAgICAge3BhdGg6ICcvc2hlbGxTb3J0JywgY29tcG9uZW50OiAncGFnZS1zaGVsbC1zb3J0JywgdGl0bGU6ICdTaGVsbCBTb3J0J30sXHJcbiAgICAgIHtwYXRoOiAnL3BhcnRpdGlvbicsIGNvbXBvbmVudDogJ3BhZ2UtcGFydGl0aW9uJywgdGl0bGU6ICdQYXJ0aXRpb24nfSxcclxuICAgICAge3BhdGg6ICcvcXVpY2tTb3J0MScsIGNvbXBvbmVudDogJ3BhZ2UtcXVpY2stc29ydC0xJywgdGl0bGU6ICdRdWljayBTb3J0IDEnfSxcclxuICAgICAge3BhdGg6ICcvcXVpY2tTb3J0MicsIGNvbXBvbmVudDogJ3BhZ2UtcXVpY2stc29ydC0yJywgdGl0bGU6ICdRdWljayBTb3J0IDInfSxcclxuICAgICAge3BhdGg6ICcvYmluYXJ5VHJlZScsIGNvbXBvbmVudDogJ3BhZ2UtYmluYXJ5LXRyZWUnLCB0aXRsZTogJ0JpbmFyeSBUcmVlJ30sXHJcbiAgICAgIHtwYXRoOiAnL3JlZEJsYWNrVHJlZScsIGNvbXBvbmVudDogJ3BhZ2UtcmVkYmxhY2stdHJlZScsIHRpdGxlOiAnUmVkLUJsYWNrIFRyZWUnfSxcclxuICAgICAge3BhdGg6ICcvaGFzaFRhYmxlJywgY29tcG9uZW50OiAncGFnZS1oYXNoLXRhYmxlJywgdGl0bGU6ICdIYXNoIFRhYmxlJ30sXHJcbiAgICAgIHtwYXRoOiAnL2hhc2hDaGFpbicsIGNvbXBvbmVudDogJ3BhZ2UtaGFzaC1jaGFpbicsIHRpdGxlOiAnSGFzaCBDaGFpbid9LFxyXG4gICAgICB7cGF0aDogJy9oZWFwJywgY29tcG9uZW50OiAncGFnZS1oZWFwJywgdGl0bGU6ICdIZWFwJ30sXHJcbiAgICAgIHtwYXRoOiAnL2dyYXBoTicsIGNvbXBvbmVudDogJ3BhZ2UtZ3JhcGgtbicsIHRpdGxlOiAnTm9uLURpcmVjdGVkIE5vbi1XZWlnaHRlZCBHcmFwaCAnfVxyXG4gICAgXTtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDM+V29ya3Nob3AgYXBwbGljYXRpb25zPC9oMz5cclxuICAgICAgPG5hdj5cclxuICAgICAgICAke3JvdXRlcy5tYXAocm91dGUgPT4gaHRtbGA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiJHtyb3V0ZS5wYXRofVwiIGlzPVwieC1yb3V0ZXItYVwiPiR7cm91dGUudGl0bGV9PC9hPjwvZGl2PmApfVxyXG4gICAgICA8L25hdj5cclxuICAgICAgPHgtcm91dGVyIC5yb3V0ZXM9JHtyb3V0ZXN9PjwveC1yb3V0ZXI+ICAgICAgXHJcbiAgICAgIDx4LWZvb3Rlcj48L3gtZm9vdGVyPlxyXG4gICAgYDtcclxuICAgIC8vVE9ETzogYWRkIGJ1dHRvbnMgZGVzY3JpcHRpb24gZnJvbSBKYXZhIGFwcGxldHNcclxuICAgIC8vVE9ETzogYWRkIHNob3J0IHZlcnNpb24gb2YgcHJvdmlkZWQgYWxnb3JpdGhtcyBvbiB0aGUgc2FtZSBwYWdlXHJcbiAgfVxyXG5cclxuICBjcmVhdGVSZW5kZXJSb290KCkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtYXBwJywgWEFwcCk7IiwiaW1wb3J0IHtMaXRFbGVtZW50fSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUJhc2UgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBjcmVhdGVSZW5kZXJSb290KCkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljayhpdGVyYXRvciwgYnRuKSB7XHJcbiAgICBpZiAoIXRoaXMuaXRlcmF0b3IpIHtcclxuICAgICAgdGhpcy5pdGVyYXRvciA9IGl0ZXJhdG9yLmNhbGwodGhpcyk7XHJcbiAgICAgIHRoaXMudG9nZ2xlQnV0dG9uc0FjdGl2aXR5KGJ0biwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBpdGVyYXRpb24gPSB0aGlzLml0ZXJhdGUoKTtcclxuICAgIGlmIChpdGVyYXRpb24uZG9uZSkge1xyXG4gICAgICB0aGlzLml0ZXJhdG9yID0gbnVsbDtcclxuICAgICAgdGhpcy50b2dnbGVCdXR0b25zQWN0aXZpdHkoYnRuLCBmYWxzZSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gWy4uLnRoaXMuaXRlbXNdO1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVCdXR0b25zQWN0aXZpdHkoYnRuLCBzdGF0dXMpIHtcclxuICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbCgneC1idXR0b24nKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgaWYgKGVsICE9PSBidG4pIGVsLmRpc2FibGVkID0gc3RhdHVzO1xyXG4gICAgfSk7XHJcbiAgICBidG4uYWN0aXZhdGVkID0gc3RhdHVzO1xyXG4gIH1cclxuXHJcbiAgaXRlcmF0ZSgpIHtcclxuICAgIGNvbnN0IGl0ZXJhdGlvbiA9IHRoaXMuaXRlcmF0b3IubmV4dCgpO1xyXG4gICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoaXRlcmF0aW9uLnZhbHVlKTtcclxuICAgIGNvbnN0IGFjdGl2YXRlZEJ0biA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1idXR0b24uYWN0aXZhdGVkJyk7XHJcbiAgICBpZiAoYWN0aXZhdGVkQnRuKSBhY3RpdmF0ZWRCdG4uZm9jdXMoKTtcclxuICAgIHJldHVybiBpdGVyYXRpb247XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLmxlbmd0aCA9IDA7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gIH1cclxufSIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge2dldFVuaXF1ZVJhbmRvbU51bWJlcn0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VBcnJheSBleHRlbmRzIFBhZ2VCYXNlIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ0FycmF5JztcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+JHt0aGlzLnRpdGxlfTwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbGwpfT5GaWxsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICAgICR7dGhpcy5yZW5kZXJBZGRpdGlvbmFsQ29udHJvbCgpfVxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtaG9yaXpvbnRhbCAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2Vycz0ke3RoaXMubWFya2Vyc30+PC94LWl0ZW1zLWhvcml6b250YWw+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlckFkZGl0aW9uYWxDb250cm9sKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxsYWJlbD48aW5wdXQgY2xhc3M9XCJkdXBzXCIgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZCBkaXNhYmxlZD5EdXBzIE9LPC9sYWJlbD5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtY29uc29sZScpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgICB0aGlzLmR1cHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5kdXBzJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSAyMDtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSAxMDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW0oe2luZGV4OiBpfSk7XHJcbiAgICAgIGlmIChpIDwgbGVuZ3RoRmlsbCkgaXRlbS5zZXRWYWx1ZShNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwKSk7XHJcbiAgICAgIGFyci5wdXNoKGl0ZW0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoRmlsbDtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW25ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSldO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgYXJyYXkgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA2MCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IGFycmF5IHdpdGggJHtsZW5ndGh9IGNlbGxzYDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgdGhpcy5kdXBzLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICB5aWVsZCAnU2VsZWN0IER1cGxpY2F0ZXMgT2sgb3Igbm90JztcclxuICAgIHRoaXMuZHVwcy5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICByZXR1cm4gJ05ldyBhcnJheSBjcmVhdGVkOyB0b3RhbCBpdGVtcyA9IDAnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2YgaXRlbXMgdG8gZmlsbCBpbic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gdGhpcy5pdGVtcy5sZW5ndGggfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gYEVSUk9SOiBjYW4ndCBmaWxsIG1vcmUgdGhhbiAke3RoaXMuaXRlbXMubGVuZ3RofSBpdGVtc2A7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBmaWxsIGluICR7bGVuZ3RofSBpdGVtc2A7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh0aGlzLmR1cHMuY2hlY2tlZCkge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoZ2V0VW5pcXVlUmFuZG9tTnVtYmVyKHRoaXMuaXRlbXMsIDEwMDApKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgICByZXR1cm4gYEZpbGwgY29tcGxldGVkOyB0b3RhbCBpdGVtcyA9ICR7bGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9ySW5zKCkge1xyXG4gICAgaWYgKHRoaXMuaXRlbXMubGVuZ3RoID09PSB0aGlzLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydCwgYXJyYXkgaXMgZnVsbCc7XHJcbiAgICB9XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLmR1cHMuY2hlY2tlZCkge1xyXG4gICAgICBjb25zdCBmb3VuZCA9ICB0aGlzLml0ZW1zLmZpbmQoaSA9PiBpLnZhbHVlID09PSBrZXkpO1xyXG4gICAgICBpZiAoZm91bmQpIHlpZWxkIGBFUlJPUjogeW91IGFscmVhZHkgaGF2ZSBpdGVtIHdpdGgga2V5ICR7a2V5fSBhdCBpbmRleCAke2ZvdW5kLmluZGV4fWA7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgdGhpcy5pdGVtc1t0aGlzLmxlbmd0aF0uc2V0VmFsdWUoa2V5KTtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IHRoaXMubGVuZ3RoO1xyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGF0IGluZGV4ICR7dGhpcy5sZW5ndGh9YDtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gICAgcmV0dXJuIGBJbnNlcnRpb24gY29tcGxldGVkOyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmluZCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGZpbmQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdDtcclxuICAgIGxldCBpc0FkZGl0aW9uYWwgPSBmYWxzZTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBpO1xyXG4gICAgICBpZiAodGhpcy5pdGVtc1tpXS52YWx1ZSA9PT0ga2V5KSB7XHJcbiAgICAgICAgZm91bmRBdCA9IGk7XHJcbiAgICAgICAgeWllbGQgYEhhdmUgZm91bmQgJHtpc0FkZGl0aW9uYWwgPyAnYWRkaXRpb2FsJyA6ICcnfSBpdGVtIGF0IGluZGV4ID0gJHtmb3VuZEF0fWA7XHJcbiAgICAgICAgaWYgKHRoaXMuZHVwcy5jaGVja2VkKSB7XHJcbiAgICAgICAgICBpc0FkZGl0aW9uYWwgPSB0cnVlO1xyXG4gICAgICAgICAgZm91bmRBdCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaSAhPT0gdGhpcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgeWllbGQgYENoZWNraW5nICR7aXNBZGRpdGlvbmFsID8gJ2ZvciBhZGRpdGlvYWwgbWF0Y2hlcycgOiAnbmV4dCBjZWxsJ307IGluZGV4ID0gJHtpICsgMX1gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBObyAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGRlbGV0ZSc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgbGV0IGRlbGV0ZWRDb3VudCA9IDA7XHJcbiAgICBsZXQgaXNBZGRpdGlvbmFsID0gZmFsc2U7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaTtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IGtleSkge1xyXG4gICAgICAgIGZvdW5kQXQgPSBpO1xyXG4gICAgICAgIGRlbGV0ZWRDb3VudCsrO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uY2xlYXIoKTtcclxuICAgICAgICB5aWVsZCBgSGF2ZSBmb3VuZCBhbmQgZGVsZXRlZCAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW0gYXQgaW5kZXggPSAke2ZvdW5kQXR9YDtcclxuICAgICAgICBpZiAodGhpcy5kdXBzLmNoZWNrZWQpIGlzQWRkaXRpb25hbCA9IHRydWU7XHJcbiAgICAgIH0gZWxzZSBpZiAoZGVsZXRlZENvdW50ID4gMCkge1xyXG4gICAgICAgIHlpZWxkIGBXaWxsIHNoaWZ0IGl0ZW0gJHtkZWxldGVkQ291bnR9IHNwYWNlc2A7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tpIC0gZGVsZXRlZENvdW50XS5tb3ZlRnJvbSh0aGlzLml0ZW1zW2ldKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgJHtpc0FkZGl0aW9uYWwgPyAnZm9yIGFkZGl0aW9hbCBtYXRjaGVzJyA6ICduZXh0IGNlbGwnfTsgaW5kZXggPSAke2kgKyAxfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMubGVuZ3RoIC09IGRlbGV0ZWRDb3VudDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgICBpZiAoZGVsZXRlZENvdW50ID4gMCkge1xyXG4gICAgICByZXR1cm4gYFNoaWZ0JHtkZWxldGVkQ291bnQgPiAxID8gJ3MnIDogJyd9IGNvbXBsZXRlOyBubyAke2lzQWRkaXRpb25hbCA/ICdtb3JlJyA6ICcnfSBpdGVtcyB0byBkZWxldGVgO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGBObyAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtYXJyYXknLCBQYWdlQXJyYXkpOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7Z2V0VW5pcXVlUmFuZG9tQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcclxuaW1wb3J0IHtQYWdlQXJyYXl9IGZyb20gJy4vcGFnZUFycmF5JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlT3JkZXJlZEFycmF5IGV4dGVuZHMgUGFnZUFycmF5IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ09yZGVyZWQgQXJyYXknO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyQWRkaXRpb25hbENvbnRyb2woKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2xpbmVhclwiIGNoZWNrZWQ+TGluZWFyPC9sYWJlbD5cclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2JpbmFyeVwiPkJpbmFyeTwvbGFiZWw+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy5iaW5hcnkgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fYmluYXJ5Jyk7XHJcbiAgICB0aGlzLmxpbmVhciA9IHRoaXMucXVlcnlTZWxlY3RvcignLmFsZ29yaXRobV9saW5lYXInKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZUJ1dHRvbnNBY3Rpdml0eShidG4sIHN0YXR1cykge1xyXG4gICAgc3VwZXIudG9nZ2xlQnV0dG9uc0FjdGl2aXR5KGJ0biwgc3RhdHVzKTtcclxuICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbCgnLmFsZ29yaXRobScpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICBlbC5kaXNhYmxlZCA9IHN0YXR1cztcclxuICAgIH0pO1xyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICBpdGVtLm1hcmsgPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgbWFya0l0ZW1zKHJhbmdlKSB7XHJcbiAgICB0aGlzLml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuICAgICAgaXRlbS5tYXJrID0gaSA+PSByYW5nZS5zdGFydCAmJiBpIDw9IHJhbmdlLmVuZDtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaW5pdEl0ZW1zKCkge1xyXG4gICAgY29uc3QgbGVuZ3RoID0gMjA7XHJcbiAgICBjb25zdCBsZW5ndGhGaWxsID0gMTA7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGNvbnN0IGFyclZhbHVlcyA9IGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aEZpbGwsIDEwMDApO1xyXG4gICAgYXJyVmFsdWVzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtKHtpbmRleDogaX0pO1xyXG4gICAgICBpZiAoaSA8IGxlbmd0aEZpbGwpIGl0ZW0uc2V0VmFsdWUoYXJyVmFsdWVzW2ldKTtcclxuICAgICAgYXJyLnB1c2goaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGhGaWxsO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgYXJyYXkgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA2MCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IGFycmF5IHdpdGggJHtsZW5ndGh9IGNlbGxzYDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgcmV0dXJuICdOZXcgYXJyYXkgY3JlYXRlZDsgdG90YWwgaXRlbXMgPSAwJztcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaWxsKCkge1xyXG4gICAgbGV0IGxlbmd0aCA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIgbnVtYmVyIG9mIGl0ZW1zIHRvIGZpbGwgaW4nO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBsZW5ndGggPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGxlbmd0aCA+IHRoaXMuaXRlbXMubGVuZ3RoIHx8IGxlbmd0aCA8IDApIHtcclxuICAgICAgcmV0dXJuIGBFUlJPUjogY2FuJ3QgZmlsbCBtb3JlIHRoYW4gJHt0aGlzLml0ZW1zLmxlbmd0aH0gaXRlbXNgO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgZmlsbCBpbiAke2xlbmd0aH0gaXRlbXNgO1xyXG4gICAgY29uc3QgYXJyVmFsdWVzID0gZ2V0VW5pcXVlUmFuZG9tQXJyYXkobGVuZ3RoLCAxMDAwKTtcclxuICAgIGFyclZhbHVlcy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XHJcbiAgICBhcnJWYWx1ZXMuZm9yRWFjaCgodmFsdWUsIGkpID0+IHtcclxuICAgICAgdGhpcy5pdGVtc1tpXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xyXG4gICAgcmV0dXJuIGBGaWxsIGNvbXBsZXRlZDsgdG90YWwgaXRlbXMgPSAke2xlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBsaW5lYXJTZWFyY2goa2V5LCBpc0luc2VydGlvbikge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkgfHwgaXNJbnNlcnRpb24gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpICE9PSB0aGlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgYXQgaW5kZXggPSAke2kgKyAxfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gICogYmluYXJ5U2VhcmNoKGtleSwgaXNJbnNlcnRpb24pIHtcclxuICAgIGxldCByYW5nZSA9IHtzdGFydDogMCwgZW5kOiB0aGlzLmxlbmd0aCAtIDF9O1xyXG4gICAgbGV0IGk7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICBpID0gTWF0aC5mbG9vcigocmFuZ2UuZW5kICsgcmFuZ2Uuc3RhcnQpIC8gMik7XHJcbiAgICAgIGlmIChyYW5nZS5lbmQgPCByYW5nZS5zdGFydCkge1xyXG4gICAgICAgIHJldHVybiBpc0luc2VydGlvbiA/IGkgKyAxIDogbnVsbDtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBpO1xyXG4gICAgICB0aGlzLm1hcmtJdGVtcyhyYW5nZSk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICByZXR1cm4gaTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgaW5kZXggJHtpfTsgcmFuZ2UgPSAke3JhbmdlLnN0YXJ0fSB0byAke3JhbmdlLmVuZH1gO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5KSB7XHJcbiAgICAgICAgcmFuZ2UuZW5kID0gaSAtIDE7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmFuZ2Uuc3RhcnQgPSBpICsgMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvcklucygpIHtcclxuICAgIGlmICh0aGlzLml0ZW1zLmxlbmd0aCA9PT0gdGhpcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQsIGFycmF5IGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtcy5maW5kKGkgPT4gaS52YWx1ZSA9PT0ga2V5KSkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydCwgZHVwbGljYXRlIGZvdW5kJztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgaW5zZXJ0QXQgPSB5aWVsZCogKHRoaXMubGluZWFyLmNoZWNrZWQgPyB0aGlzLmxpbmVhclNlYXJjaChrZXksIHRydWUpIDogdGhpcy5iaW5hcnlTZWFyY2goa2V5LCB0cnVlKSk7XHJcbiAgICBpbnNlcnRBdCA9IGluc2VydEF0ICE9IG51bGwgPyBpbnNlcnRBdCA6IHRoaXMubGVuZ3RoO1xyXG4gICAgeWllbGQgYFdpbGwgaW5zZXJ0IGF0IGluZGV4ICR7aW5zZXJ0QXR9JHtpbnNlcnRBdCAhPT0gdGhpcy5sZW5ndGggPyAnLCBmb2xsb3dpbmcgc2hpZnQnIDogJyd9YDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IHRoaXMubGVuZ3RoO1xyXG4gICAgaWYgKGluc2VydEF0ICE9PSB0aGlzLmxlbmd0aCkge1xyXG4gICAgICB5aWVsZCAnV2lsbCBzaGlmdCBjZWxscyB0byBtYWtlIHJvb20nO1xyXG4gICAgfVxyXG4gICAgZm9yIChsZXQgaSA9IHRoaXMubGVuZ3RoOyBpID4gaW5zZXJ0QXQ7IGktLSkge1xyXG4gICAgICB0aGlzLml0ZW1zW2ldLm1vdmVGcm9tKHRoaXMuaXRlbXNbaSAtIDFdKTtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaSAtIDE7XHJcbiAgICAgIHlpZWxkIGBTaGlmdGVkIGl0ZW0gZnJvbSBpbmRleCAke2kgLSAxfWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW2luc2VydEF0XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgeWllbGQgYEhhdmUgaW5zZXJ0ZWQgaXRlbSAke2tleX0gYXQgaW5kZXggJHtpbnNlcnRBdH1gO1xyXG4gICAgdGhpcy5sZW5ndGgrKztcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgICByZXR1cm4gYEluc2VydGlvbiBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zICR7dGhpcy5sZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaW5kKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBmb3VuZEF0ID0geWllbGQqICh0aGlzLmxpbmVhci5jaGVja2VkID8gdGhpcy5saW5lYXJTZWFyY2goa2V5KSA6IHRoaXMuYmluYXJ5U2VhcmNoKGtleSkpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuIGBObyBpdGVtcyB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGBIYXZlIGZvdW5kIGl0ZW0gYXQgaW5kZXggPSAke2ZvdW5kQXR9YDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JEZWwoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBkZWxldGUnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdCA9IHlpZWxkKiAodGhpcy5saW5lYXIuY2hlY2tlZCA/IHRoaXMubGluZWFyU2VhcmNoKGtleSkgOiB0aGlzLmJpbmFyeVNlYXJjaChrZXkpKTtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgICAgcmV0dXJuIGBObyBpdGVtcyB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtc1tmb3VuZEF0XS5jbGVhcigpO1xyXG4gICAgeWllbGQgYEhhdmUgZm91bmQgYW5kIGRlbGV0ZWQgaXRlbSBhdCBpbmRleCA9ICR7Zm91bmRBdH1gO1xyXG4gICAgaWYgKGZvdW5kQXQgIT09IHRoaXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBmb3VuZEF0O1xyXG4gICAgICB5aWVsZCAnV2lsbCBzaGlmdCBpdGVtcyc7XHJcbiAgICB9XHJcbiAgICBmb3IgKGxldCBpID0gZm91bmRBdCArIDE7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIHRoaXMuaXRlbXNbaSAtIDFdLm1vdmVGcm9tKHRoaXMuaXRlbXNbaV0pO1xyXG4gICAgICB5aWVsZCBgU2hpZnRlZCBpdGVtIGZyb20gaW5kZXggJHtpfWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLmxlbmd0aC0tO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgJHtmb3VuZEF0ICE9PSB0aGlzLmxlbmd0aCA/ICdTaGlmdCBjb21wbGV0ZWQnIDogJ0NvbXBsZXRlZCd9OyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2Utb3JkZXJlZC1hcnJheScsIFBhZ2VPcmRlcmVkQXJyYXkpOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7Z2V0Q29sb3IxMDB9IGZyb20gJy4uL3V0aWxzJztcclxuaW1wb3J0IHtQYWdlQmFzZX0gZnJvbSAnLi9wYWdlQmFzZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUJhc2VTb3J0IGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMubGVuZ3RoID0gMTA7XHJcbiAgICB0aGlzLmluaXRJdGVtcygpO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gICAgdGhpcy5waXZvdHMgPSBbXTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+JHt0aGlzLnRpdGxlfTwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclNpemUpfT5TaXplPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JSdW4pfT5SdW48L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclN0ZXApfT5TdGVwPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVBYm9ydC5iaW5kKHRoaXMpfSBjbGFzcz1cImJ0bl9hYm9ydCBoaWRkZW5cIj5BYm9ydDwveC1idXR0b24+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwiY29uc29sZV92ZXJib3NlXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJjb25zb2xlLXN0YXRzXCIgZGVmYXVsdE1lc3NhZ2U9XCLigJRcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtdmVydGljYWwgLml0ZW1zPSR7dGhpcy5pdGVtc30gLm1hcmtlcnM9JHt0aGlzLm1hcmtlcnN9IC50ZW1wPSR7dGhpcy50ZW1wfSAucGl2b3RzPSR7dGhpcy5waXZvdHN9PjwveC1pdGVtcy12ZXJ0aWNhbD5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGVTdGF0cyA9IHRoaXMucXVlcnlTZWxlY3RvcignLmNvbnNvbGUtc3RhdHMnKTtcclxuICAgIHRoaXMuY29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcignLmNvbnNvbGVfdmVyYm9zZScpO1xyXG4gICAgdGhpcy5idG5TdG9wID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuYnRuX2Fib3J0Jyk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVBYm9ydCgpIHtcclxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XHJcbiAgICB0aGlzLmFmdGVyU29ydCgpO1xyXG4gICAgdGhpcy5pdGVyYXRvciA9IChmdW5jdGlvbiAqKCkge1xyXG4gICAgICByZXR1cm4gJ0Fib3J0ZWQnO1xyXG4gICAgfSkoKTtcclxuICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgaW5pdEl0ZW1zKGxlbmd0aCA9IHRoaXMubGVuZ3RoKSB7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtKHtpbmRleDogaX0pO1xyXG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuaXNSZXZlcnNlT3JkZXIgPyAobGVuZ3RoIC0gaSkgKiAoMTAwIC8gbGVuZ3RoKSA6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMCk7XHJcbiAgICAgIGl0ZW0uc2V0VmFsdWUodmFsdWUsIGdldENvbG9yMTAwKHZhbHVlKSk7XHJcbiAgICAgIGFyci5wdXNoKGl0ZW0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0cyhzd2FwcyA9IDAsIGNvbXBhcmlzb25zID0gMCkge1xyXG4gICAgdGhpcy5jb25zb2xlU3RhdHMuc2V0TWVzc2FnZShgU3dhcHM6ICR7c3dhcHN9LCBDb21wYXJpc29uczogJHtjb21wYXJpc29uc31gKTtcclxuICB9XHJcblxyXG4gIGJlZm9yZVNvcnQoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVN0YXRzKCk7XHJcbiAgICB0aGlzLmJ0blN0b3AuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XHJcbiAgICB0aGlzLmJ0blN0b3AuZGlzYWJsZWQgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIGFmdGVyU29ydCgpIHtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIHRoaXMuYnRuU3RvcC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JOZXcoKSB7XHJcbiAgICB0aGlzLmlzUmV2ZXJzZU9yZGVyID0gIXRoaXMuaXNSZXZlcnNlT3JkZXI7XHJcbiAgICB0aGlzLmluaXRJdGVtcyh0aGlzLml0ZW1zLmxlbmd0aCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgICByZXR1cm4gYENyZWF0ZWQgJHt0aGlzLmlzUmV2ZXJzZU9yZGVyID8gJ3JldmVyc2UnIDogJ3Vub3JkZXJlZCd9IGFycmF5YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTaXplKCkge1xyXG4gICAgY29uc3QgbGVuZ3RoID0gdGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoID8gMTAwIDogdGhpcy5sZW5ndGg7XHJcbiAgICB0aGlzLmluaXRJdGVtcyhsZW5ndGgpO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gICAgcmV0dXJuIGBDcmVhdGVkICR7bGVuZ3RofSBlbGVtZW50cyBhcnJheWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG5cclxuICAgIC8vc29ydCBhbGdvcml0aG0gZ29lcyBoZXJlXHJcblxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBpcyBjb21wbGV0ZSc7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUnVuKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgaXRlcmF0b3I7XHJcbiAgICBsZXQgaXNEb25lID0gZmFsc2U7XHJcbiAgICB3aGlsZSh0cnVlKSB7XHJcbiAgICAgIHlpZWxkICdQcmVzcyBOZXh0IHRvIHN0YXJ0JztcclxuICAgICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICBpZiAoIWl0ZXJhdG9yKSB7XHJcbiAgICAgICAgICBpdGVyYXRvciA9IHRoaXMuaXRlcmF0b3JTdGVwKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpdGVyYXRvci5uZXh0KCkuZG9uZSkge1xyXG4gICAgICAgICAgaXNEb25lID0gdHJ1ZTtcclxuICAgICAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLml0ZW1zID0gWy4uLnRoaXMuaXRlbXNdO1xyXG4gICAgICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xyXG4gICAgICB9LCB0aGlzLml0ZW1zLmxlbmd0aCA9PT0gdGhpcy5sZW5ndGggPyAyMDAgOiA0MCk7XHJcbiAgICAgIHlpZWxkICdQcmVzcyBOZXh0IHRvIHBhdXNlJztcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcclxuICAgICAgaWYgKGlzRG9uZSkgYnJlYWs7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFmdGVyU29ydCgpO1xyXG4gICAgcmV0dXJuICdTb3J0IGlzIGNvbXBsZXRlJztcclxuICB9XHJcbn0iLCJpbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VCdWJibGVTb3J0IGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ0J1YmJsZSBTb3J0JztcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgZm9yIChsZXQgb3V0ZXIgPSBpdGVtcy5sZW5ndGggLSAxOyBvdXRlciA+IDA7IG91dGVyLS0pIHtcclxuICAgICAgZm9yIChsZXQgaW5uZXIgPSAwOyBpbm5lciA8IG91dGVyOyBpbm5lcisrKSB7XHJcbiAgICAgICAgaWYgKGl0ZW1zW2lubmVyXSA+IGl0ZW1zW2lubmVyICsgMV0pIHtcclxuICAgICAgICAgIHN3YXAoaXRlbXNbaW5uZXJdLCBpdGVtc1tpbm5lciArIDFdKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgKiAqL1xyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDEsIHNpemU6IDEsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcisxJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5pdGVtcy5sZW5ndGggLSAxLCBzaXplOiAyLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICdvdXRlcid9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgc3dhcHMgPSAwO1xyXG4gICAgbGV0IGNvbXBhcmlzb25zID0gMDtcclxuICAgIGZvciAobGV0IG91dGVyID0gdGhpcy5pdGVtcy5sZW5ndGggLSAxOyBvdXRlciA+IDA7IG91dGVyLS0pIHtcclxuICAgICAgZm9yIChsZXQgaW5uZXIgPSAwOyBpbm5lciA8IG91dGVyOyBpbm5lcisrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXRlbXNbaW5uZXJdLnZhbHVlID4gdGhpcy5pdGVtc1tpbm5lciArIDFdLnZhbHVlKSB7XHJcbiAgICAgICAgICB5aWVsZCAnV2lsbCBiZSBzd2FwcGVkJztcclxuICAgICAgICAgIHRoaXMuaXRlbXNbaW5uZXJdLnN3YXBXaXRoKHRoaXMuaXRlbXNbaW5uZXIgKyAxXSk7XHJcbiAgICAgICAgICBzd2FwcysrO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB5aWVsZCAnV2lsbCBub3QgYmUgc3dhcHBlZCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbisrO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbisrO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IDE7XHJcbiAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbi0tO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBpcyBjb21wbGV0ZSc7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtYnViYmxlLXNvcnQnLCBQYWdlQnViYmxlU29ydCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZVNvcnR9IGZyb20gJy4vcGFnZUJhc2VTb3J0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlU2VsZWN0U29ydCBleHRlbmRzIFBhZ2VCYXNlU29ydCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdTZWxlY3QgU29ydCc7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICogYWxnb3JpdGhtOlxyXG5cclxuICAgIGZvciAobGV0IG91dGVyID0gMDsgb3V0ZXIgPCBpdGVtcy5sZW5ndGggLSAxOyBvdXRlcisrKSB7XHJcbiAgICAgIG1pbiA9IG91dGVyO1xyXG4gICAgICBmb3IgKGxldCBpbm5lciA9IG91dGVyICsgMTsgaW5uZXIgPCBpdGVtcy5sZW5ndGg7IGlubmVyKyspIHtcclxuICAgICAgICBpZiAoaXRlbXNbaW5uZXJdIDwgaXRlbXNbbWluXSkge1xyXG4gICAgICAgICAgbWluID0gaW5uZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHN3YXAoaXRlbXNbb3V0ZXJdLCBpdGVtc1ttaW5dKTtcclxuICAgIH1cclxuXHJcbiAgKiAqL1xyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDEsIHNpemU6IDEsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDIsIGNvbG9yOiAncmVkJywgdGV4dDogJ291dGVyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogMCwgc2l6ZTogMywgY29sb3I6ICdwdXJwbGUnLCB0ZXh0OiAnbWluJ30pXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclN0ZXAoKSB7XHJcbiAgICB0aGlzLmJlZm9yZVNvcnQoKTtcclxuICAgIGxldCBzd2FwcyA9IDA7XHJcbiAgICBsZXQgY29tcGFyaXNvbnMgPSAwO1xyXG4gICAgbGV0IG1pbiA9IDA7XHJcbiAgICBmb3IgKGxldCBvdXRlciA9IDA7IG91dGVyIDwgdGhpcy5pdGVtcy5sZW5ndGggLSAxOyBvdXRlcisrKSB7XHJcbiAgICAgIG1pbiA9IG91dGVyO1xyXG4gICAgICBmb3IgKGxldCBpbm5lciA9IG91dGVyICsgMTsgaW5uZXIgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaW5uZXIrKykge1xyXG4gICAgICAgIHlpZWxkICdTZWFyY2hpbmcgZm9yIG1pbmltdW0nO1xyXG4gICAgICAgIGlmICh0aGlzLml0ZW1zW2lubmVyXS52YWx1ZSA8IHRoaXMuaXRlbXNbbWluXS52YWx1ZSkge1xyXG4gICAgICAgICAgbWluID0gaW5uZXI7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMl0ucG9zaXRpb24gPSBtaW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbisrO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtaW4gIT09IG91dGVyKSB7XHJcbiAgICAgICAgeWllbGQgJ1dpbGwgc3dhcCBvdXRlciAmIG1pbic7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tvdXRlcl0uc3dhcFdpdGgodGhpcy5pdGVtc1ttaW5dKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrc3dhcHMsIGNvbXBhcmlzb25zKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBub3QgYmUgc3dhcHBlZCc7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gb3V0ZXIgKyAyO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24rKztcclxuICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gb3V0ZXIgKyAxO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBpcyBjb21wbGV0ZSc7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2Utc2VsZWN0LXNvcnQnLCBQYWdlU2VsZWN0U29ydCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VJbnNlcnRpb25Tb3J0IGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ0luc2VydGlvbiBTb3J0JztcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgZm9yIChsZXQgaW5uZXIsIG91dGVyID0gMTsgb3V0ZXIgPCBpdGVtcy5sZW5ndGg7IG91dGVyKyspIHtcclxuICAgICAgdGVtcCA9IGl0ZW1zW291dGVyXTtcclxuICAgICAgZm9yIChpbm5lciA9IG91dGVyOyBpbm5lciA+IDAgJiYgdGVtcCA+PSBpdGVtc1tpbm5lciAtIDFdOyBpbm5lci0tKSB7XHJcbiAgICAgICAgaXRlbXNbaW5uZXJdID0gaXRlbXNbaW5uZXIgLSAxXTtcclxuICAgICAgfVxyXG4gICAgICBpdGVtc1tpbm5lcl0gPSB0ZW1wO1xyXG4gICAgfVxyXG5cclxuICAqICovXHJcblxyXG4gIGluaXRJdGVtcyhsZW5ndGgpIHtcclxuICAgIHN1cGVyLmluaXRJdGVtcyhsZW5ndGgpO1xyXG4gICAgdGhpcy50ZW1wID0gbmV3IEl0ZW0oe3ZhbHVlOiAwfSk7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDEsIHNpemU6IDEsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDEsIHNpemU6IDIsIGNvbG9yOiAncmVkJywgdGV4dDogJ291dGVyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogJ3RlbXAnLCBzaXplOiAxLCBjb2xvcjogJ3B1cnBsZScsIHRleHQ6ICd0ZW1wJ30pXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlU3RhdHMoY29waWVzID0gMCwgY29tcGFyaXNvbnMgPSAwKSB7XHJcbiAgICB0aGlzLmNvbnNvbGVTdGF0cy5zZXRNZXNzYWdlKGBDb3BpZXM6ICR7Y29waWVzfSwgQ29tcGFyaXNvbnM6ICR7Y29tcGFyaXNvbnN9YCk7XHJcbiAgfVxyXG5cclxuICBhZnRlclNvcnQoKSB7XHJcbiAgICBzdXBlci5hZnRlclNvcnQoKTtcclxuICAgIHRoaXMudGVtcCA9IG5ldyBJdGVtKHt2YWx1ZTogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclN0ZXAoKSB7XHJcbiAgICB0aGlzLmJlZm9yZVNvcnQoKTtcclxuICAgIGxldCBjb3BpZXMgPSAwO1xyXG4gICAgbGV0IGNvbXBhcmlzb25zID0gMDtcclxuICAgIGZvciAobGV0IGlubmVyLCBvdXRlciA9IDE7IG91dGVyIDwgdGhpcy5pdGVtcy5sZW5ndGg7IG91dGVyKyspIHtcclxuICAgICAgeWllbGQgJ1dpbGwgY29weSBvdXRlciB0byB0ZW1wJztcclxuICAgICAgdGhpcy5pdGVtc1tvdXRlcl0uc3dhcFdpdGgodGhpcy50ZW1wKTtcclxuICAgICAgY29waWVzKys7XHJcbiAgICAgIGZvciAoaW5uZXIgPSBvdXRlcjsgaW5uZXIgPiAwOyBpbm5lci0tKSB7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cyhjb3BpZXMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIGlmICh0aGlzLnRlbXAudmFsdWUgPj0gdGhpcy5pdGVtc1tpbm5lciAtIDFdLnZhbHVlKSB7XHJcbiAgICAgICAgICB5aWVsZCAnSGF2ZSBjb21wYXJlZCBpbm5lci0xIGFuZCB0ZW1wOiBubyBjb3B5IG5lY2Vzc2FyeSc7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgeWllbGQgJ0hhdmUgY29tcGFyZWQgaW5uZXItMSBhbmQgdGVtcDogd2lsbCBjb3B5IGlubmVyIHRvIGlubmVyLTEnO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaW5uZXJdLnN3YXBXaXRoKHRoaXMuaXRlbXNbaW5uZXIgLSAxXSk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK2NvcGllcywgY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbi0tO1xyXG4gICAgICB9XHJcbiAgICAgIHlpZWxkICdXaWxsIGNvcHkgdGVtcCB0byBpbm5lcic7XHJcbiAgICAgIHRoaXMudGVtcC5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyXSk7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IG91dGVyICsgMTtcclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uKys7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFmdGVyU29ydCgpO1xyXG4gICAgcmV0dXJuICdTb3J0IGlzIGNvbXBsZXRlJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1pbnNlcnRpb24tc29ydCcsIFBhZ2VJbnNlcnRpb25Tb3J0KTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlU3RhY2sgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgICB0aGlzLmxlbmd0aCA9IDA7XHJcbiAgICB0aGlzLmluaXRJdGVtcygpO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxoND5TdGFjazwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclB1c2gpfT5QdXNoPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JQb3ApfT5Qb3A8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclBlZWspfT5QZWVrPC94LWJ1dHRvbj5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDx4LWNvbnNvbGU+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWl0ZW1zLWhvcml6b250YWwgLml0ZW1zPSR7dGhpcy5pdGVtc30gLm1hcmtlcnM9JHt0aGlzLm1hcmtlcnN9IHJldmVyc2U+PC94LWl0ZW1zLWhvcml6b250YWw+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGZpcnN0VXBkYXRlZCgpIHtcclxuICAgIHRoaXMuY29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1jb25zb2xlJyk7XHJcbiAgICB0aGlzLmRpYWxvZyA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1kaWFsb2cnKTtcclxuICB9XHJcblxyXG4gIGluaXRJdGVtcygpIHtcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEwO1xyXG4gICAgY29uc3QgbGVuZ3RoRmlsbCA9IDQ7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtKHtpbmRleDogaX0pO1xyXG4gICAgICBpZiAoaSA8IGxlbmd0aEZpbGwpIGl0ZW0uc2V0VmFsdWUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCkpO1xyXG4gICAgICBhcnIucHVzaChpdGVtKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXRlbXMgPSBhcnI7XHJcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aEZpbGw7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDMsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ3RvcCd9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JOZXcoKSB7XHJcbiAgICB5aWVsZCAnV2lsbCBjcmVhdGUgbmV3IGVtcHR5IHN0YWNrJztcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEwO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLml0ZW1zLnB1c2gobmV3IEl0ZW0oe2luZGV4OiBpfSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gLTE7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUHVzaCgpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwdXNoLiBTdGFjayBpcyBmdWxsJztcclxuICAgIH1cclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIHB1c2gnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHB1c2guIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIHB1c2ggaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uKys7XHJcbiAgICB5aWVsZCAnSW5jcmVtZW50ZWQgdG9wJztcclxuICAgIHRoaXMuaXRlbXNbdGhpcy5sZW5ndGhdLnNldFZhbHVlKGtleSk7XHJcbiAgICB0aGlzLmxlbmd0aCsrO1xyXG4gICAgcmV0dXJuIGBJbnNlcnRlZCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUG9wKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgcG9wLiBTdGFjayBpcyBlbXB0eSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnV2lsbCBwb3AgaXRlbSBmcm9tIHRvcCBvZiBzdGFjayc7XHJcbiAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtc1t0aGlzLmxlbmd0aCAtIDFdO1xyXG4gICAgY29uc3QgdmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgaXRlbS5jbGVhcigpO1xyXG4gICAgeWllbGQgYEl0ZW0gcmVtb3ZlZDsgUmV0dXJuZWQgdmFsdWUgaXMgJHt2YWx1ZX1gO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uLS07XHJcbiAgICB0aGlzLmxlbmd0aC0tO1xyXG4gICAgcmV0dXJuICdEZWNyZW1lbnRlZCB0b3AnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclBlZWsoKSB7XHJcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwZWVrLiBTdGFjayBpcyBlbXB0eSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnV2lsbCBwZWVrIGF0IGl0ZW0gYXQgdG9wIG9mIHN0YWNrJztcclxuICAgIHJldHVybiBgUmV0dXJuZWQgdmFsdWUgaXMgJHt0aGlzLml0ZW1zW3RoaXMubGVuZ3RoIC0gMV0udmFsdWV9YDtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1zdGFjaycsIFBhZ2VTdGFjayk7IiwiaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlU3RhY2t9IGZyb20gJy4vcGFnZVN0YWNrJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlUXVldWUgZXh0ZW5kcyBQYWdlU3RhY2sge1xyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+UXVldWU8L2g0PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yTmV3KX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclJlbSl9PlJlbTwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUGVlayl9PlBlZWs8L3gtYnV0dG9uPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtaG9yaXpvbnRhbCAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2Vycz0ke3RoaXMubWFya2Vyc30gcmV2ZXJzZT48L3gtaXRlbXMtaG9yaXpvbnRhbD5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAxLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICdmcm9udCd9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IHRoaXMubGVuZ3RoIC0gMSwgc2l6ZTogMywgY29sb3I6ICdibHVlJywgdGV4dDogJ3JlYXInfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yTmV3KCkge1xyXG4gICAgeWllbGQgJ1dpbGwgY3JlYXRlIG5ldyBlbXB0eSBxdWV1ZSc7XHJcbiAgICBjb25zdCBsZW5ndGggPSAxMDtcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5pdGVtcy5wdXNoKG5ldyBJdGVtKHtpbmRleDogaX0pKTtcclxuICAgIH1cclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIGdldE5leHRJbmRleChpbmRleCkge1xyXG4gICAgcmV0dXJuIGluZGV4ICsgMSA9PT0gdGhpcy5pdGVtcy5sZW5ndGggPyAwIDogaW5kZXggKyAxO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvcklucygpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwdXNoLiBRdWV1ZSBpcyBmdWxsJztcclxuICAgIH1cclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGluc2VydCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgY29uc3QgbmV3SW5kZXggPSB0aGlzLmdldE5leHRJbmRleCh0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24pO1xyXG4gICAgdGhpcy5pdGVtc1tuZXdJbmRleF0uc2V0VmFsdWUoa2V5KTtcclxuICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IG5ld0luZGV4O1xyXG4gICAgdGhpcy5sZW5ndGgrKztcclxuICAgIHJldHVybiBgSW5zZXJ0ZWQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclJlbSgpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHJlbW92ZS4gUXVldWUgaXMgZW1wdHknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgJ1dpbGwgcmVtb3ZlIGl0ZW0gZnJvbSBmcm9udCBvZiBxdWV1ZSc7XHJcbiAgICBjb25zdCBjdXJJbmRleCA9IHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbjtcclxuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW2N1ckluZGV4XTtcclxuICAgIGNvbnN0IHZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIGl0ZW0uY2xlYXIoKTtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IHRoaXMuZ2V0TmV4dEluZGV4KGN1ckluZGV4KTtcclxuICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICByZXR1cm4gYEl0ZW0gcmVtb3ZlZDsgUmV0dXJuZWQgdmFsdWUgaXMgJHt2YWx1ZX1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclBlZWsoKSB7XHJcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwZWVrLiBRdWV1ZSBpcyBlbXB0eSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnV2lsbCBwZWVrIGF0IGZyb250IG9mIHF1ZXVlJztcclxuICAgIHJldHVybiBgUmV0dXJuZWQgdmFsdWUgaXMgJHt0aGlzLml0ZW1zW3RoaXMubWFya2Vyc1swXS5wb3NpdGlvbl0udmFsdWV9YDtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1xdWV1ZScsIFBhZ2VRdWV1ZSk7IiwiaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge2dldFVuaXF1ZVJhbmRvbUFycmF5fSBmcm9tICcuLi91dGlscyc7XHJcbmltcG9ydCB7UGFnZVF1ZXVlfSBmcm9tICcuL3BhZ2VRdWV1ZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVByaW9yaXR5UXVldWUgZXh0ZW5kcyBQYWdlUXVldWUge1xyXG4gIGluaXRJdGVtcygpIHtcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEwO1xyXG4gICAgY29uc3QgbGVuZ3RoRmlsbCA9IDQ7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGNvbnN0IGFyclZhbHVlcyA9IGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aEZpbGwsIDEwMDApO1xyXG4gICAgYXJyVmFsdWVzLnNvcnQoKGEsIGIpID0+IGIgLSBhKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtKHtpbmRleDogaX0pO1xyXG4gICAgICBpZiAoaSA8IGxlbmd0aEZpbGwpIGl0ZW0uc2V0VmFsdWUoYXJyVmFsdWVzW2ldKTtcclxuICAgICAgYXJyLnB1c2goaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGhGaWxsO1xyXG4gIH1cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiB0aGlzLmxlbmd0aCAtIDEsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2Zyb250J30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogMCwgc2l6ZTogMywgY29sb3I6ICdibHVlJywgdGV4dDogJ3JlYXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAtMSwgc2l6ZTogMSwgY29sb3I6ICdwdXJwbGUnfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9ySW5zKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSB0aGlzLml0ZW1zLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHB1c2guIFF1ZXVlIGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbiA9IHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbjtcclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBmb3IgKGxldCBpID0gdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uOyBpID49IC0xOyBpLS0pIHtcclxuICAgICAgaWYgKGkgPT09IC0xIHx8IGtleSA8PSB0aGlzLml0ZW1zW2ldLnZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uKys7XHJcbiAgICAgICAgeWllbGQgJ0ZvdW5kIHBsYWNlIHRvIGluc2VydCc7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tpICsgMV0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24rKztcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLml0ZW1zW2kgKyAxXS5tb3ZlRnJvbSh0aGlzLml0ZW1zW2ldKTtcclxuICAgICAgICB5aWVsZCAnU2VhcmNoaW5nIGZvciBwbGFjZSB0byBpbnNlcnQnO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbi0tO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMl0ucG9zaXRpb24gPSAtMTtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgICByZXR1cm4gYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JSZW0oKSB7XHJcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCByZW1vdmUuIFF1ZXVlIGlzIGVtcHR5JztcclxuICAgIH1cclxuICAgIHlpZWxkICdXaWxsIHJlbW92ZSBpdGVtIGZyb20gZnJvbnQgb2YgcXVldWUnO1xyXG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uXTtcclxuICAgIGNvbnN0IHZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIGl0ZW0uY2xlYXIoKTtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbi0tO1xyXG4gICAgdGhpcy5sZW5ndGgtLTtcclxuICAgIHJldHVybiBgSXRlbSByZW1vdmVkOyBSZXR1cm5lZCB2YWx1ZSBpcyAke3ZhbHVlfWA7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtcHJpb3JpdHktcXVldWUnLCBQYWdlUHJpb3JpdHlRdWV1ZSk7IiwiaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZX0gZnJvbSAnLi9wYWdlQmFzZSc7XHJcbmltcG9ydCB7Z2V0VW5pcXVlUmFuZG9tQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlTGlua0xpc3QgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoMTMpO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxoND5MaW5rIExpc3Q8L2g0PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yTmV3KX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICAgICR7dGhpcy5yZW5kZXJBZGRpdGlvbmFsQ29udHJvbCgpfVxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtaG9yaXpvbnRhbC1saW5rZWQgLml0ZW1zPSR7dGhpcy5pdGVtc30gLm1hcmtlcj0ke3RoaXMubWFya2VyfT48L3gtaXRlbXMtaG9yaXpvbnRhbC1saW5rZWQ+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlckFkZGl0aW9uYWxDb250cm9sKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxsYWJlbD48aW5wdXQgY2xhc3M9XCJzb3J0ZWRcIiB0eXBlPVwiY2hlY2tib3hcIiBkaXNhYmxlZD5Tb3J0ZWQ8L2xhYmVsPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGZpcnN0VXBkYXRlZCgpIHtcclxuICAgIHRoaXMuY29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1jb25zb2xlJyk7XHJcbiAgICB0aGlzLmRpYWxvZyA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1kaWFsb2cnKTtcclxuICAgIHRoaXMuc29ydGVkID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuc29ydGVkJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoLCBzb3J0ZWQpIHtcclxuICAgIGNvbnN0IGFyclZhbHVlcyA9IGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aCwgMTAwMCk7XHJcbiAgICBpZiAoc29ydGVkKSBhcnJWYWx1ZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG4gICAgdGhpcy5pdGVtcyA9IGFyclZhbHVlcy5tYXAodmFsdWUgPT4gKG5ldyBJdGVtKHt9KSkuc2V0VmFsdWUodmFsdWUpKTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgbGlua2VkIGxpc3QgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA1NiB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGxpc3Qgd2l0aCAke2xlbmd0aH0gbGlua3NgO1xyXG4gICAgdGhpcy5zb3J0ZWQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHlpZWxkICdTZWxlY3Q6IFNvcnRlZCBvciBub3QnO1xyXG4gICAgdGhpcy5zb3J0ZWQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoLCB0aGlzLnNvcnRlZC5jaGVja2VkKTtcclxuICB9XHJcblxyXG4gICogc2VhcmNoKGtleSwgaXNJbnNlcnRpb24pIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkgfHwgaXNJbnNlcnRpb24gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpICE9PSB0aGlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICB5aWVsZCBgU2VhcmNoaW5nIGZvciAke2lzSW5zZXJ0aW9uID8gJ2luc2VydGlvbiBwb2ludCcgOiBgaXRlbSB3aXRoIGtleSAke2tleX1gfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IDU2KSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBsaXN0IGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIGNvbnN0IGl0ZW0gPSAobmV3IEl0ZW0oe21hcms6IHRydWV9KSkuc2V0VmFsdWUoa2V5KTtcclxuICAgIGxldCBmb3VuZEF0ID0gMDtcclxuICAgIGlmICh0aGlzLnNvcnRlZC5jaGVja2VkKSB7XHJcbiAgICAgIHlpZWxkICdXaWxsIHNlYXJjaCBpbnNlcnRpb24gcG9pbnQnO1xyXG4gICAgICBmb3VuZEF0ID0geWllbGQqIHRoaXMuc2VhcmNoKGtleSwgdHJ1ZSk7XHJcbiAgICAgIHlpZWxkICdIYXZlIGZvdW5kIGluc2VydGlvbiBwb2ludCc7XHJcbiAgICAgIGlmIChmb3VuZEF0ICE9IG51bGwpIHtcclxuICAgICAgICBjb25zdCBwYXJ0ID0gdGhpcy5pdGVtcy5zcGxpY2UoZm91bmRBdCwgdGhpcy5pdGVtcy5sZW5ndGggLSBmb3VuZEF0LCBpdGVtKTtcclxuICAgICAgICB0aGlzLml0ZW1zID0gdGhpcy5pdGVtcy5jb25jYXQocGFydCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pdGVtcy5wdXNoKGl0ZW0pO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgICB0aGlzLml0ZW1zLnVuc2hpZnQoaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IC0xO1xyXG4gICAgeWllbGQgJ0l0ZW0gaW5zZXJ0ZWQuIFdpbGwgcmVkcmF3IHRoZSBsaXN0JztcclxuICAgIGl0ZW0ubWFyayA9IGZhbHNlO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBmb3VuZEF0O1xyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgSW5zZXJ0aW9uIGNvbXBsZXRlZC4gVG90YWwgaXRlbXMgPSAke3RoaXMuaXRlbXMubGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmluZCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGZpbmQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdCA9IHlpZWxkKiB0aGlzLnNlYXJjaChrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgcmV0dXJuIGAke2ZvdW5kQXQgPT0gbnVsbCA/ICdObycgOiAnSGF2ZSBmb3VuZCd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRGVsKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZGVsZXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5zZWFyY2goa2V5KTtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgICByZXR1cm4gYE5vIGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB5aWVsZCBgSGF2ZSBmb3VuZCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICAgIHRoaXMuaXRlbXNbZm91bmRBdF0uY2xlYXIoKTtcclxuICAgICAgeWllbGQgJ0RlbGV0ZWQgaXRlbS4gV2lsbCByZWRyYXcgdGhlIGxpc3QnO1xyXG4gICAgICB0aGlzLml0ZW1zLnNwbGljZShmb3VuZEF0LCAxKTtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgICByZXR1cm4gYERlbGV0ZWQgaXRlbSB3aXRoIGtleSAke2tleX0uIFRvdGFsIGl0ZW1zID0gJHt0aGlzLml0ZW1zLmxlbmd0aH1gO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWxpbmstbGlzdCcsIFBhZ2VMaW5rTGlzdCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VNZXJnZVNvcnQgZXh0ZW5kcyBQYWdlQmFzZVNvcnQge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMudGl0bGUgPSAnTWVyZ2UgU29ydCc7XHJcbiAgICB0aGlzLmxlbmd0aCA9IDEyO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gIG1lcmdlU29ydChsb3dlciwgdXBwZXIpIHtcclxuICAgIGlmIChsb3dlciAhPT0gdXBwZXIpIHtcclxuICAgICAgbGV0IG1pZCA9IE1hdGguZmxvb3IoKGxvd2VyICsgdXBwZXIpIC8gMik7XHJcbiAgICAgIHRoaXMubWVyZ2VTb3J0KGxvd2VyLCBtaWQpO1xyXG4gICAgICB0aGlzLm1lcmdlU29ydChtaWQgKyAxLCB1cHBlcik7XHJcbiAgICAgIHRoaXMubWVyZ2UobG93ZXIsIG1pZCArIDEsIHVwcGVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIG1lcmdlKGxvd2VyLCBtaWQsIHVwcGVyKSB7XHJcbiAgICBsZXQgbG93ZXJCb3VuZCA9IGxvd2VyO1xyXG4gICAgbGV0IG1pZEJvdW5kID0gbWlkIC0gMTtcclxuICAgIGxldCB3b3JrU3BhY2UgPSBbXTtcclxuICAgIHdoaWxlIChsb3dlciA8PSBtaWRCb3VuZCAmJiBtaWQgPD0gdXBwZXIpIHtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbbG93ZXJdLnZhbHVlIDwgdGhpcy5pdGVtc1ttaWRdLnZhbHVlKSB7XHJcbiAgICAgICAgd29ya1NwYWNlLnB1c2gobmV3IEl0ZW0odGhpcy5pdGVtc1tsb3dlcisrXSkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbWlkKytdKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHdoaWxlIChsb3dlciA8PSBtaWRCb3VuZCkge1xyXG4gICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW2xvd2VyKytdKSk7XHJcbiAgICB9XHJcbiAgICB3aGlsZSAobWlkIDw9IHVwcGVyKSB7XHJcbiAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbWlkKytdKSk7XHJcbiAgICB9XHJcbiAgICB3b3JrU3BhY2UuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xyXG4gICAgICB0aGlzLml0ZW1zW2xvd2VyQm91bmQgKyBpXS5jb3B5RnJvbShpdGVtKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgKiAqL1xyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2xvd2VyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogMCwgc2l6ZTogMiwgY29sb3I6ICdyZWQnLCB0ZXh0OiAndXBwZXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAzLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbWlkJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDMsIGNvbG9yOiAncHVycGxlJywgdGV4dDogJ3B0cid9KSxcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0cyhjb3BpZXMgPSAwLCBjb21wYXJpc29ucyA9IDApIHtcclxuICAgIHRoaXMuY29uc29sZVN0YXRzLnNldE1lc3NhZ2UoYENvcGllczogJHtjb3BpZXN9LCBDb21wYXJpc29uczogJHtjb21wYXJpc29uc31gKTtcclxuICB9XHJcblxyXG4gICogbWVyZ2UobG93ZXIsIG1pZCwgdXBwZXIpIHtcclxuICAgIGxldCBsb3dlckJvdW5kID0gbG93ZXI7XHJcbiAgICBsZXQgbWlkQm91bmQgPSBtaWQgLSAxO1xyXG4gICAgbGV0IHdvcmtTcGFjZSA9IFtdO1xyXG4gICAgd2hpbGUgKGxvd2VyIDw9IG1pZEJvdW5kICYmIG1pZCA8PSB1cHBlcikge1xyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2xvd2VyXS52YWx1ZSA8IHRoaXMuaXRlbXNbbWlkXS52YWx1ZSkge1xyXG4gICAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbG93ZXIrK10pKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW21pZCsrXSkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB3aGlsZSAobG93ZXIgPD0gbWlkQm91bmQpIHtcclxuICAgICAgd29ya1NwYWNlLnB1c2gobmV3IEl0ZW0odGhpcy5pdGVtc1tsb3dlcisrXSkpO1xyXG4gICAgfVxyXG4gICAgd2hpbGUgKG1pZCA8PSB1cHBlcikge1xyXG4gICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW21pZCsrXSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gLTE7XHJcbiAgICB0aGlzLm1hcmtlcnNbM10ucG9zaXRpb24gPSBsb3dlckJvdW5kO1xyXG4gICAgdGhpcy5jb3BpZXMgKz0gd29ya1NwYWNlLmxlbmd0aDtcclxuICAgIHRoaXMudXBkYXRlU3RhdHModGhpcy5jb3BpZXMsIHRoaXMuY29tcGFyaXNvbnMpO1xyXG4gICAgeWllbGQgYE1lcmdlZCAke2xvd2VyQm91bmR9LSR7bWlkQm91bmR9IGFuZCAke21pZEJvdW5kICsgMX0tJHt1cHBlcn0gaW50byB3b3JrU3BhY2VgO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrU3BhY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5pdGVtc1tsb3dlckJvdW5kICsgaV0uY29weUZyb20od29ya1NwYWNlW2ldKTtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gbG93ZXJCb3VuZCArIGk7XHJcbiAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLmNvcGllcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgIHlpZWxkIGBDb3BpZWQgd29ya3NwYWNlIGludG8gJHtsb3dlckJvdW5kICsgaX1gO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclN0ZXAoKSB7XHJcbiAgICB0aGlzLmJlZm9yZVNvcnQoKTtcclxuICAgIHRoaXMuY29waWVzID0gMDtcclxuICAgIHRoaXMuY29tcGFyaXNvbnMgPSAwO1xyXG5cclxuICAgIGNvbnN0IG9wZXJhdGlvbnMgPSBbXTtcclxuICAgIGNvbnN0IG1lcmdlU29ydCA9IChsb3dlciwgdXBwZXIpID0+IHtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0U3RhcnQnLCBsb3dlcjogbG93ZXIsIHVwcGVyOiB1cHBlcn0pO1xyXG4gICAgICBpZiAobG93ZXIgIT09IHVwcGVyKSB7XHJcbiAgICAgICAgbGV0IG1pZCA9IE1hdGguZmxvb3IoKGxvd2VyICsgdXBwZXIpIC8gMik7XHJcbiAgICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0TG93ZXInLCBsb3dlcjogbG93ZXIsIHVwcGVyOiBtaWR9KTtcclxuICAgICAgICBtZXJnZVNvcnQobG93ZXIsIG1pZCk7XHJcbiAgICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0VXBwZXInLCBsb3dlcjogbWlkICsgMSwgdXBwZXI6IHVwcGVyfSk7XHJcbiAgICAgICAgbWVyZ2VTb3J0KG1pZCArIDEsIHVwcGVyKTtcclxuICAgICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdtZXJnZScsIGxvd2VyOiBsb3dlciwgbWlkOiBtaWQgKyAxLCB1cHBlcjogdXBwZXJ9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdtZXJnZVNvcnRFbmQnLCBsb3dlcjogbG93ZXIsIHVwcGVyOiB1cHBlcn0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgbWVyZ2VTb3J0KDAsIHRoaXMuaXRlbXMubGVuZ3RoIC0gMSk7XHJcblxyXG4gICAgeWllbGQgJ0luaXRpYWwgY2FsbCB0byBtZXJnZVNvcnQnO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcGVyYXRpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN3aXRjaCAob3BlcmF0aW9uc1tpXS50eXBlKSB7XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0U3RhcnQnOiB7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLmxvd2VyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS51cHBlcjtcclxuICAgICAgICAgIHlpZWxkIGBFbnRlcmluZyBtZXJnZVNvcnQ6ICR7b3BlcmF0aW9uc1tpXS5sb3dlcn0tJHtvcGVyYXRpb25zW2ldLnVwcGVyfWA7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0RW5kJzoge1xyXG4gICAgICAgICAgeWllbGQgYEV4aXRpbmcgbWVyZ2VTb3J0OiAke29wZXJhdGlvbnNbaV0ubG93ZXJ9LSR7b3BlcmF0aW9uc1tpXS51cHBlcn1gO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgJ21lcmdlU29ydExvd2VyJzoge1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gIG9wZXJhdGlvbnNbaV0udXBwZXI7XHJcbiAgICAgICAgICB5aWVsZCBgV2lsbCBzb3J0IGxvd2VyIGhhbGY6ICR7b3BlcmF0aW9uc1tpXS5sb3dlcn0tJHtvcGVyYXRpb25zW2ldLnVwcGVyfWA7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0VXBwZXInOiB7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLnVwcGVyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS5sb3dlcjtcclxuICAgICAgICAgIHlpZWxkIGBXaWxsIHNvcnQgdXBwZXIgaGFsZjogJHtvcGVyYXRpb25zW2ldLmxvd2VyfS0ke29wZXJhdGlvbnNbaV0udXBwZXJ9YDtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlICdtZXJnZSc6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIG1lcmdlIHJhbmdlcyc7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLmxvd2VyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS51cHBlcjtcclxuICAgICAgICAgIHlpZWxkKiB0aGlzLm1lcmdlKG9wZXJhdGlvbnNbaV0ubG93ZXIsIG9wZXJhdGlvbnNbaV0ubWlkLCBvcGVyYXRpb25zW2ldLnVwcGVyKTtcclxuICAgICAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IC0xO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgaXMgY29tcGxldGUnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLW1lcmdlLXNvcnQnLCBQYWdlTWVyZ2VTb3J0KTsiLCJpbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7UGFnZUJhc2VTb3J0fSBmcm9tICcuL3BhZ2VCYXNlU29ydCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVNoZWxsU29ydCBleHRlbmRzIFBhZ2VCYXNlU29ydCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdTaGVsbCBTb3J0JztcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgbGV0IGggPSAxO1xyXG4gICAgLy9jYWxjdWxhdGUgbWF4aW11bSBwb3NzaWJsZSBoXHJcbiAgICB3aGlsZSAoaCA8PSAodGhpcy5pdGVtcy5sZW5ndGggLSAxKSAvIDMpIHtcclxuICAgICAgaCA9IGggKiAzICsgMTtcclxuICAgIH1cclxuICAgIC8vY29uc2lzdGVudCByZWR1Y2UgaFxyXG4gICAgd2hpbGUgKGggPiAwKSB7XHJcbiAgICAgIC8vaC1zb3J0XHJcbiAgICAgIGZvciAobGV0IG91dGVyID0gaDsgb3V0ZXIgPCB0aGlzLml0ZW1zLmxlbmd0aDsgb3V0ZXIrKykge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbb3V0ZXJdLnN3YXBXaXRoKHRoaXMudGVtcCk7XHJcbiAgICAgICAgbGV0IGlubmVyID0gb3V0ZXI7XHJcbiAgICAgICAgd2hpbGUgKGlubmVyID4gaCAtIDEgJiYgdGhpcy50ZW1wLnZhbHVlIDw9IHRoaXMuaXRlbXNbaW5uZXIgLSBoXS52YWx1ZSkge1xyXG4gICAgICAgICAgdGhpcy5pdGVtc1tpbm5lcl0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbm5lciAtIGhdKTtcclxuICAgICAgICAgIGlubmVyIC09IGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGVtcC5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyXSk7XHJcbiAgICAgIH1cclxuICAgICAgLy9yZWR1Y2UgaFxyXG4gICAgICBoID0gKGggLSAxKSAvIDM7XHJcbiAgICB9XHJcblxyXG4gICogKi9cclxuXHJcbiAgaW5pdEl0ZW1zKGxlbmd0aCkge1xyXG4gICAgc3VwZXIuaW5pdEl0ZW1zKGxlbmd0aCk7XHJcbiAgICB0aGlzLnRlbXAgPSBuZXcgSXRlbSh7dmFsdWU6IDB9KTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW1xyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ291dGVyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDIsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IC0xLCBzaXplOiAzLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXItaCd9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246ICd0ZW1wJywgc2l6ZTogMSwgY29sb3I6ICdwdXJwbGUnLCB0ZXh0OiAndGVtcCd9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVN0YXRzKGNvcGllcyA9IDAsIGNvbXBhcmlzb25zID0gMCwgaCA9IDEpIHtcclxuICAgIHRoaXMuY29uc29sZVN0YXRzLnNldE1lc3NhZ2UoYENvcGllczogJHtjb3BpZXN9LCBDb21wYXJpc29uczogJHtjb21wYXJpc29uc30sIGg9JHtofWApO1xyXG4gIH1cclxuXHJcbiAgYWZ0ZXJTb3J0KCkge1xyXG4gICAgc3VwZXIuYWZ0ZXJTb3J0KCk7XHJcbiAgICB0aGlzLnRlbXAgPSBuZXcgSXRlbSh7dmFsdWU6IDB9KTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgY29waWVzID0gMDtcclxuICAgIGxldCBjb21wYXJpc29ucyA9IDA7XHJcbiAgICBsZXQgaCA9IDE7XHJcbiAgICAvL2NhbGN1bGF0ZSBtYXhpbXVtIHBvc3NpYmxlIGhcclxuICAgIHdoaWxlIChoIDw9ICh0aGlzLml0ZW1zLmxlbmd0aCAtIDEpIC8gMykge1xyXG4gICAgICBoID0gaCAqIDMgKyAxO1xyXG4gICAgfVxyXG4gICAgLy9jb25zaXN0ZW50IHJlZHVjZSBoXHJcbiAgICB3aGlsZSAoaCA+IDApIHtcclxuICAgICAgLy9oLXNvcnRcclxuICAgICAgdGhpcy51cGRhdGVTdGF0cyhjb3BpZXMsIGNvbXBhcmlzb25zLCBoKTtcclxuICAgICAgZm9yIChsZXQgb3V0ZXIgPSBoOyBvdXRlciA8IHRoaXMuaXRlbXMubGVuZ3RoOyBvdXRlcisrKSB7XHJcbiAgICAgICAgbGV0IGlubmVyID0gb3V0ZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gb3V0ZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gaW5uZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gaW5uZXIgLSBoO1xyXG4gICAgICAgIHlpZWxkIGAke2h9LXNvcnRpbmcgYXJyYXkuIFdpbGwgY29weSBvdXRlciB0byB0ZW1wYDtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrY29waWVzLCBjb21wYXJpc29ucywgaCk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tvdXRlcl0uc3dhcFdpdGgodGhpcy50ZW1wKTtcclxuICAgICAgICB5aWVsZCAnV2lsbCBjb21wYXJlIGlubmVyLWggYW5kIHRlbXAnO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoY29waWVzLCArK2NvbXBhcmlzb25zLCBoKTtcclxuICAgICAgICB3aGlsZSAoaW5uZXIgPiBoIC0gMSAmJiB0aGlzLnRlbXAudmFsdWUgPD0gdGhpcy5pdGVtc1tpbm5lciAtIGhdLnZhbHVlKSB7XHJcbiAgICAgICAgICB5aWVsZCAnaW5uZXItaCA+PSB0ZW1wOyBXaWxsIGNvcHkgaW5uZXItaCB0byBpbm5lcic7XHJcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrY29waWVzLCBjb21wYXJpc29ucywgaCk7XHJcbiAgICAgICAgICB0aGlzLml0ZW1zW2lubmVyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyIC0gaF0pO1xyXG4gICAgICAgICAgaW5uZXIgLT0gaDtcclxuICAgICAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGlubmVyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gaW5uZXIgLSBoO1xyXG4gICAgICAgICAgaWYgKGlubmVyIDw9IGggLSAxKSB7XHJcbiAgICAgICAgICAgIHlpZWxkICdUaGVyZSBpcyBubyBpbm5lci1oJztcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHlpZWxkICdXaWxsIGNvbXBhcmUgaW5uZXItaCBhbmQgdGVtcCc7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHMoY29waWVzLCArK2NvbXBhcmlzb25zLCBoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgeWllbGQgYCR7aW5uZXIgPD0gaCAtIDEgPyAnJyA6ICdpbm5lci1oIDwgdGVtcDsgJ31XaWxsIGNvcHkgdGVtcCB0byBpbm5lcmA7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK2NvcGllcywgY29tcGFyaXNvbnMsIGgpO1xyXG4gICAgICAgIHRoaXMudGVtcC5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyXSk7XHJcbiAgICAgIH1cclxuICAgICAgLy9yZWR1Y2UgaFxyXG4gICAgICBoID0gKGggLSAxKSAvIDM7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFmdGVyU29ydCgpO1xyXG4gICAgcmV0dXJuICdTb3J0IGlzIGNvbXBsZXRlJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1zaGVsbC1zb3J0JywgUGFnZVNoZWxsU29ydCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZVNvcnR9IGZyb20gJy4vcGFnZUJhc2VTb3J0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlUGFydGl0aW9uIGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ1BhcnRpdGlvbic7XHJcbiAgICB0aGlzLnBhcnRpdGlvbiA9IC0xO1xyXG4gICAgdGhpcy5sZW5ndGggPSAxMjtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICogYWxnb3JpdGhtOlxyXG5cclxuICAgIGxldCBwaXZvdCA9IDUwO1xyXG4gICAgbGV0IGxlZnQgPSAwO1xyXG4gICAgbGV0IHJpZ2h0ID0gdGhpcy5pdGVtcy5sZW5ndGggLSAxO1xyXG5cclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdCAtIDE7XHJcbiAgICBsZXQgcmlnaHRQdHIgPSByaWdodCArIDE7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAvL3NlYXJjaCBncmVhdGVyIHRoYW4gcGl2b3RcclxuICAgICAgd2hpbGUgKGxlZnRQdHIgPCByaWdodCAmJiB0aGlzLml0ZW1zWysrbGVmdFB0cl0udmFsdWUgPCBwaXZvdCkge1xyXG4gICAgICB9XHJcbiAgICAgIC8vc2VhcmNoIGxlc3MgdGhhbiBwaXZvdFxyXG4gICAgICB3aGlsZSAocmlnaHRQdHIgPiBsZWZ0ICYmIHRoaXMuaXRlbXNbLS1yaWdodFB0cl0udmFsdWUgPiBwaXZvdCkge1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3JpZ2h0UHRyXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMucGFydGl0aW9uID0gbGVmdFB0cjtcclxuXHJcbiAgKiAqL1xyXG5cclxuICBhZnRlclNvcnQoKSB7XHJcbiAgICBzdXBlci5hZnRlclNvcnQoKTtcclxuICAgIHRoaXMucGl2b3RzID0gW107XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IC0xLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbGVmdFNjYW4nfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAtMSwgc2l6ZTogMSwgY29sb3I6ICdibHVlJywgdGV4dDogJ3JpZ2h0U2Nhbid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IHRoaXMucGFydGl0aW9uLCBzaXplOiAyLCBjb2xvcjogJ3B1cnBsZScsIHRleHQ6ICdwYXJ0aXRpb24nfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gLTE7XHJcbiAgICBsZXQgc3dhcHMgPSAwO1xyXG4gICAgbGV0IGNvbXBhcmlzb25zID0gMDtcclxuXHJcbiAgICBsZXQgbGVmdCA9IDA7XHJcbiAgICBsZXQgcmlnaHQgPSB0aGlzLml0ZW1zLmxlbmd0aCAtIDE7XHJcbiAgICB0aGlzLnBpdm90cyA9IFt7XHJcbiAgICAgIHN0YXJ0OiBsZWZ0LFxyXG4gICAgICBlbmQ6IHJpZ2h0LFxyXG4gICAgICB2YWx1ZTogNDAgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMClcclxuICAgIH1dO1xyXG4gICAgeWllbGQgYFBpdm90IHZhbHVlIGlzICR7dGhpcy5waXZvdHNbMF0udmFsdWV9YDtcclxuXHJcbiAgICBsZXQgbGVmdFB0ciA9IGxlZnQgLSAxO1xyXG4gICAgbGV0IHJpZ2h0UHRyID0gcmlnaHQgKyAxO1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgeWllbGQgYFdpbGwgc2NhbiAke2xlZnRQdHIgPiAtMSA/ICdhZ2FpbicgOiAnJ30gZnJvbSBsZWZ0YDtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gbGVmdFB0ciArIDE7XHJcbiAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICB3aGlsZSAobGVmdFB0ciA8IHJpZ2h0ICYmIHRoaXMuaXRlbXNbKytsZWZ0UHRyXS52YWx1ZSA8IHRoaXMucGl2b3RzWzBdLnZhbHVlKSB7XHJcbiAgICAgICAgaWYgKGxlZnRQdHIgPCByaWdodCkge1xyXG4gICAgICAgICAgeWllbGQgJ0NvbnRpbnVlIGxlZnQgc2Nhbic7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBsZWZ0UHRyICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cyhzd2FwcywgKytjb21wYXJpc29ucyk7XHJcbiAgICAgIH1cclxuICAgICAgeWllbGQgJ1dpbGwgc2NhbiBmcm9tIHJpZ2h0JztcclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gcmlnaHRQdHIgLSAxO1xyXG4gICAgICB0aGlzLnVwZGF0ZVN0YXRzKHN3YXBzLCArK2NvbXBhcmlzb25zKTtcclxuICAgICAgd2hpbGUgKHJpZ2h0UHRyID4gbGVmdCAmJiB0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5waXZvdHNbMF0udmFsdWUpIHtcclxuICAgICAgICBpZiAocmlnaHRQdHIgPiBsZWZ0KSB7XHJcbiAgICAgICAgICB5aWVsZCAnQ29udGludWUgcmlnaHQgc2Nhbic7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSByaWdodFB0ciAtIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0JztcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzd2FwIGxlZnRTY2FuIGFuZCByaWdodFNjYW4nO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKytzd2FwcywgY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbbGVmdFB0cl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodFB0cl0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wYXJ0aXRpb24gPSBsZWZ0UHRyO1xyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnQXJyb3cgc2hvd3MgcGFydGl0aW9uJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1wYXJ0aXRpb24nLCBQYWdlUGFydGl0aW9uKTsiLCJpbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VRdWlja1NvcnQxIGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ1F1aWNrIFNvcnQgMSc7XHJcbiAgICB0aGlzLmxlbmd0aCA9IDEyO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgY29uc3QgcXVpY2tTb3J0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XHJcbiAgICAgIGlmIChyaWdodCAtIGxlZnQgPCAxKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IHBpdm90ID0gcmlnaHQ7XHJcbiAgICAgIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpO1xyXG4gICAgICBxdWlja1NvcnQobGVmdCwgcGl2b3QgLSAxKTtcclxuICAgICAgcXVpY2tTb3J0KHBpdm90ICsgMSwgcmlnaHQpO1xyXG4gICAgfTtcclxuICAgIHF1aWNrU29ydCgwLCB0aGlzLml0ZW1zLmxlbmd0aCAtIDEpO1xyXG5cclxuICAqICovXHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5waXZvdHMgPSBbXTtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2xlZnQnfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAyLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbGVmdFNjYW4nfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiB0aGlzLml0ZW1zLmxlbmd0aCAtIDEsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ3JpZ2h0J30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5pdGVtcy5sZW5ndGggLSAyLCBzaXplOiAyLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAncmlnaHRTY2FuJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5pdGVtcy5sZW5ndGggLSAxLCBzaXplOiAzLCBjb2xvcjogJ3B1cnBsZScsIHRleHQ6ICdwaXZvdCd9KSxcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpIHtcclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdCAtIDE7XHJcbiAgICBsZXQgcmlnaHRQdHIgPSByaWdodCArIDE7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBsZWZ0UHRyO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbM10ucG9zaXRpb24gPSByaWdodFB0cjtcclxuICAgICAgaWYgKGxlZnRQdHIgPj0gbGVmdCkge1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHNjYW4gYWdhaW4nO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHlpZWxkIGBsZWZ0U2NhbiA9ICR7bGVmdFB0cn0sIHJpZ2h0U2NhbiA9ICR7cmlnaHRQdHJ9OyBXaWxsIHNjYW5gO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgd2hpbGUgKHRoaXMuaXRlbXNbKytsZWZ0UHRyXS52YWx1ZSA8IHRoaXMuaXRlbXNbcGl2b3RdLnZhbHVlKSB7XHJcbiAgICAgICAgaWYgKGxlZnRQdHIgPCByaWdodCkgdGhpcy5jb21wYXJpc29ucysrO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgd2hpbGUgKHJpZ2h0UHRyID4gMCAmJiB0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5pdGVtc1twaXZvdF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gbGVmdFB0cjtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHRQdHI7XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0LiBXaWxsIHN3YXAgcGl2b3QgYW5kIGxlZnRTY2FuJztcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrdGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3Bpdm90XSk7XHJcbiAgICAgICAgeWllbGQgYEFycmF5IHBhcnRpdGlvbmVkOiBsZWZ0ICgke2xlZnR9LSR7bGVmdFB0ciAtIDF9KSwgcmlnaHQgKCR7bGVmdFB0ciArIDF9LSR7cmlnaHQgKyAxfSkgYDtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzd2FwIGxlZnRTY2FuIGFuZCByaWdodFNjYW4nO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLml0ZW1zW2xlZnRQdHJdLnN3YXBXaXRoKHRoaXMuaXRlbXNbcmlnaHRQdHJdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlZnRQdHI7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgdGhpcy5zd2FwcyA9IDA7XHJcbiAgICB0aGlzLmNvbXBhcmlzb25zID0gMDtcclxuXHJcbiAgICBjb25zdCBjYWxsU3RhY2sgPSBbe3N0YXRlOiAnaW5pdGlhbCcsIGxlZnQ6IDAsIHJpZ2h0OiB0aGlzLml0ZW1zLmxlbmd0aCAtIDF9XTtcclxuICAgIHdoaWxlIChjYWxsU3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICBsZXQge3N0YXRlLCBsZWZ0LCByaWdodH0gPSBjYWxsU3RhY2sucG9wKCk7XHJcbiAgICAgIGlmIChzdGF0ZSAhPT0gJ2luaXRpYWwnKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gbGVmdDtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbiA9IHJpZ2h0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IHJpZ2h0IC0gMTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSByaWdodDtcclxuICAgICAgICB5aWVsZCBgV2lsbCBzb3J0ICR7c3RhdGV9IHBhcnRpdGlvbiAoJHtsZWZ0fS0ke3JpZ2h0fSlgO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChyaWdodCAtIGxlZnQgPCAxKSB7XHJcbiAgICAgICAgeWllbGQgYEVudGVyaW5nIHF1aWNrU29ydDsgUGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KSBpcyB0b28gc21hbGwgdG8gc29ydGA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5waXZvdHMucHVzaCh7XHJcbiAgICAgICAgICBzdGFydDogbGVmdCxcclxuICAgICAgICAgIGVuZDogcmlnaHQsXHJcbiAgICAgICAgICB2YWx1ZTogdGhpcy5pdGVtc1tyaWdodF0udmFsdWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB5aWVsZCBgRW50ZXJpbmcgcXVpY2tTb3J0OyBXaWxsIHBhcnRpdGlvbiAoJHtsZWZ0fS0ke3JpZ2h0fSlgO1xyXG4gICAgICAgIGxldCBwaXZvdCA9IHlpZWxkKiB0aGlzLnBhcnRpdGlvbihsZWZ0LCByaWdodCAtIDEsIHJpZ2h0KTtcclxuICAgICAgICBjYWxsU3RhY2sucHVzaCh7c3RhdGU6ICdyaWdodCcsIGxlZnQ6IHBpdm90ICsgMSwgcmlnaHQ6IHJpZ2h0fSk7XHJcbiAgICAgICAgY2FsbFN0YWNrLnB1c2goe3N0YXRlOiAnbGVmdCcsIGxlZnQ6IGxlZnQsIHJpZ2h0OiBwaXZvdCAtIDF9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgY29tcGxldGVkJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1xdWljay1zb3J0LTEnLCBQYWdlUXVpY2tTb3J0MSk7IiwiaW1wb3J0IHtQYWdlUXVpY2tTb3J0MX0gZnJvbSAnLi9wYWdlUXVpY2tTb3J0MSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVF1aWNrU29ydDIgZXh0ZW5kcyBQYWdlUXVpY2tTb3J0MSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdRdWljayBTb3J0IDInO1xyXG4gIH1cclxuXHJcbiAgLypcclxuICAqIGFsZ29yaXRobTpcclxuXHJcbiAgICBjb25zdCBxdWlja1NvcnQgPSAobGVmdCwgcmlnaHQpID0+IHtcclxuICAgIGludCBzaXplID0gcmlnaHQtbGVmdCsxO1xyXG4gICAgaWYoc2l6ZSA8PSAzKSAvLyDQoNGD0YfQvdCw0Y8g0YHQvtGA0YLQuNGA0L7QstC60LAg0L/RgNC4INC80LDQu9C+0Lwg0YDQsNC30LzQtdGA0LVcclxuICAgIG1hbnVhbFNvcnQobGVmdCwgcmlnaHQpO1xyXG4gICAgZWxzZSAvLyDQkdGL0YHRgtGA0LDRjyDRgdC+0YDRgtC40YDQvtCy0LrQsCDQv9GA0Lgg0LHQvtC70YzRiNC+0Lwg0YDQsNC30LzQtdGA0LVcclxuICAgIHtcclxuICAgIGxvbmcgbWVkaWFuID0gbWVkaWFuT2YzKGxlZnQsIHJpZ2h0KTtcclxuICAgIGludCBwYXJ0aXRpb24gPSBwYXJ0aXRpb25JdChsZWZ0LCByaWdodCwgbWVkaWFuKTtcclxuICAgIHJlY1F1aWNrU29ydChsZWZ0LCBwYXJ0aXRpb24tMSk7XHJcbiAgICByZWNRdWlja1NvcnQocGFydGl0aW9uKzEsIHJpZ2h0KTtcclxuICAgIH1cclxuICAgIH1cclxuICAgIH07XHJcbiAgICBxdWlja1NvcnQoMCwgdGhpcy5pdGVtcy5sZW5ndGggLSAxKTtcclxuXHJcbiAgKiAqL1xyXG5cclxuICAqIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpIHtcclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdDtcclxuICAgIGxldCByaWdodFB0ciA9IHJpZ2h0IC0gMTtcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGxlZnRQdHI7XHJcbiAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IHJpZ2h0UHRyO1xyXG4gICAgICBpZiAobGVmdFB0ciA+IGxlZnQpIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzY2FuIGFnYWluJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgV2lsbCBzY2FuICgke2xlZnRQdHIgKyAxfS0ke3JpZ2h0UHRyIC0gMX0pYDtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIHdoaWxlICh0aGlzLml0ZW1zWysrbGVmdFB0cl0udmFsdWUgPCB0aGlzLml0ZW1zW3Bpdm90XS52YWx1ZSkge1xyXG4gICAgICAgIGlmIChsZWZ0UHRyIDwgcmlnaHQpIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIHdoaWxlICh0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5pdGVtc1twaXZvdF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gbGVmdFB0cjtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHRQdHI7XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0LiBXaWxsIHN3YXAgcGl2b3QgYW5kIGxlZnRTY2FuJztcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrdGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3Bpdm90XSk7XHJcbiAgICAgICAgeWllbGQgYEFycmF5IHBhcnRpdGlvbmVkOiBsZWZ0ICgke2xlZnR9LSR7bGVmdFB0ciAtIDF9KSwgcmlnaHQgKCR7bGVmdFB0ciArIDF9LSR7cmlnaHR9KSBgO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHN3YXAgbGVmdFNjYW4gYW5kIHJpZ2h0U2Nhbic7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK3RoaXMuc3dhcHMsIHRoaXMuY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbbGVmdFB0cl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodFB0cl0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVmdFB0cjtcclxuICB9XHJcblxyXG4gIGxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgY2VudGVyLCByaWdodCkge1xyXG4gICAgaWYodGhpcy5pdGVtc1tsZWZ0XS52YWx1ZSA+IHRoaXMuaXRlbXNbY2VudGVyXS52YWx1ZSkge1xyXG4gICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgIHRoaXMuaXRlbXNbbGVmdF0uc3dhcFdpdGgodGhpcy5pdGVtc1tjZW50ZXJdKTtcclxuICAgIH1cclxuICAgIGlmKHRoaXMuaXRlbXNbbGVmdF0udmFsdWUgPiB0aGlzLml0ZW1zW3JpZ2h0XS52YWx1ZSkge1xyXG4gICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgIHRoaXMuaXRlbXNbbGVmdF0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodF0pO1xyXG4gICAgfVxyXG4gICAgaWYodGhpcy5pdGVtc1tjZW50ZXJdLnZhbHVlID4gdGhpcy5pdGVtc1tyaWdodF0udmFsdWUpIHtcclxuICAgICAgdGhpcy5zd2FwcysrO1xyXG4gICAgICB0aGlzLml0ZW1zW2NlbnRlcl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodF0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbWFudWFsU29ydChsZWZ0LCByaWdodCkge1xyXG4gICAgY29uc3Qgc2l6ZSA9IHJpZ2h0IC0gbGVmdCArIDE7XHJcbiAgICBpZiAoc2l6ZSA9PT0gMikge1xyXG4gICAgICBpZih0aGlzLml0ZW1zW2xlZnRdLnZhbHVlID4gdGhpcy5pdGVtc1tyaWdodF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0XS5zd2FwV2l0aCh0aGlzLml0ZW1zW3JpZ2h0XSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoc2l6ZSA9PT0gMykge1xyXG4gICAgICB0aGlzLmxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgcmlnaHQgLTEsIHJpZ2h0KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICB0aGlzLnN3YXBzID0gMDtcclxuICAgIHRoaXMuY29tcGFyaXNvbnMgPSAwO1xyXG5cclxuICAgIGNvbnN0IGNhbGxTdGFjayA9IFt7c3RhdGU6ICdpbml0aWFsJywgbGVmdDogMCwgcmlnaHQ6IHRoaXMuaXRlbXMubGVuZ3RoIC0gMX1dO1xyXG4gICAgd2hpbGUgKGNhbGxTdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGxldCB7c3RhdGUsIGxlZnQsIHJpZ2h0fSA9IGNhbGxTdGFjay5wb3AoKTtcclxuICAgICAgaWYgKHN0YXRlICE9PSAnaW5pdGlhbCcpIHtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gcmlnaHQ7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHQgLSAxO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1s0XS5wb3NpdGlvbiA9IHJpZ2h0O1xyXG4gICAgICAgIHlpZWxkIGBXaWxsIHNvcnQgJHtzdGF0ZX0gcGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KWA7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3Qgc2l6ZSA9IHJpZ2h0IC0gbGVmdCArIDE7XHJcbiAgICAgIGlmIChzaXplIDw9IDMpIHtcclxuICAgICAgICBpZiAoc2l6ZSA9PT0gMSkgeWllbGQgYHF1aWNrU29ydCBlbnRyeTsgQXJyYXkgb2YgMSAoJHtsZWZ0fS0ke3JpZ2h0fSkgYWx3YXlzIHNvcnRlZGA7XHJcbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMikgeWllbGQgYHF1aWNrU29ydCBlbnRyeTsgV2lsbCBzb3J0IDItZWxlbWVudHMgYXJyYXkgKCR7bGVmdH0tJHtyaWdodH0pYDtcclxuICAgICAgICBlbHNlIGlmIChzaXplID09PSAzKSB5aWVsZCBgcXVpY2tTb3J0IGVudHJ5OyBXaWxsIHNvcnQgbGVmdCwgY2VudGVyLCByaWdodCAoJHtsZWZ0fS0ke3JpZ2h0IC0gMX0tJHtyaWdodH0pYDtcclxuICAgICAgICB0aGlzLm1hbnVhbFNvcnQobGVmdCwgcmlnaHQpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHModGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgaWYgKHNpemUgPT09IDEpIHlpZWxkICdObyBhY3Rpb25zIG5lY2Vzc2FyeSc7XHJcbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMikgeWllbGQgJ0RvbmUgMi1lbGVtZW50IHNvcnQnO1xyXG4gICAgICAgIGVsc2UgaWYgKHNpemUgPT09IDMpIHlpZWxkICdEb25lIGxlZnQtY2VudGVyLXJpZ2h0IHNvcnQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IG1lZGlhbiA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcclxuICAgICAgICB5aWVsZCBgcXVpY2tTb3J0IGVudHJ5OyBXaWxsIHNvcnQgbGVmdCwgY2VudGVyLCByaWdodCAoJHtsZWZ0fS0ke21lZGlhbn0tJHtyaWdodH0pYDtcclxuICAgICAgICB0aGlzLmxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgbWVkaWFuLCByaWdodCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cyh0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSBtZWRpYW47XHJcbiAgICAgICAgeWllbGQgYFdpbGwgcGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KTsgcGl2b3Qgd2lsbCBiZSAke21lZGlhbn1gO1xyXG4gICAgICAgIHRoaXMucGl2b3RzLnB1c2goe1xyXG4gICAgICAgICAgc3RhcnQ6IGxlZnQsXHJcbiAgICAgICAgICBlbmQ6IHJpZ2h0LFxyXG4gICAgICAgICAgdmFsdWU6IHRoaXMuaXRlbXNbbWVkaWFuXS52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHN3YXAgcGl2b3QgYW5kIHJpZ2h0LTEnO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLml0ZW1zW21lZGlhbl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodCAtIDFdKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSByaWdodCAtIDE7XHJcbiAgICAgICAgbGV0IHBhcnRpdGlvbiA9IHlpZWxkKiB0aGlzLnBhcnRpdGlvbihsZWZ0LCByaWdodCwgcmlnaHQgLSAxKTtcclxuICAgICAgICBjYWxsU3RhY2sucHVzaCh7c3RhdGU6ICdyaWdodCcsIGxlZnQ6IHBhcnRpdGlvbiArIDEsIHJpZ2h0OiByaWdodH0pO1xyXG4gICAgICAgIGNhbGxTdGFjay5wdXNoKHtzdGF0ZTogJ2xlZnQnLCBsZWZ0OiBsZWZ0LCByaWdodDogcGFydGl0aW9uIC0gMX0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBjb21wbGV0ZWQnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXF1aWNrLXNvcnQtMicsIFBhZ2VRdWlja1NvcnQyKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlQmluYXJ5VHJlZSBleHRlbmRzIFBhZ2VCYXNlIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLmluaXRJdGVtcygyOSk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXIoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+QmluYXJ5IFRyZWU8L2g0PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRmlsbCl9PkZpbGw8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclRyYXYpfT5UcmF2PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cIm1haW4tY29uc29sZVwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwiY29uc29sZS1zdGF0c1wiIGRlZmF1bHRNZXNzYWdlPVwi4oCUXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWl0ZW1zLXRyZWUgLml0ZW1zPSR7dGhpcy5pdGVtc30gLm1hcmtlcj0ke3RoaXMubWFya2VyfT48L3gtaXRlbXMtdHJlZT5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcubWFpbi1jb25zb2xlJyk7XHJcbiAgICB0aGlzLnRyYXZDb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuY29uc29sZS1zdGF0cycpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoKSB7XHJcbiAgICBjb25zdCBhcnIgPSAobmV3IEFycmF5KDMxKSkuZmlsbCgpLm1hcCgoXywgaSkgPT4gbmV3IEl0ZW0oe2luZGV4OiBpfSkpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICAgIGxldCBpID0gMDtcclxuICAgICAgY29uc3QgdmFsdWUgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICB3aGlsZShhcnJbaV0gJiYgYXJyW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICBpID0gMiAqIGkgKyAoYXJyW2ldLnZhbHVlID4gdmFsdWUgPyAxIDogMik7XHJcbiAgICAgIH1cclxuICAgICAgaWYoYXJyW2ldKSBhcnJbaV0uc2V0VmFsdWUodmFsdWUpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXIoKSB7XHJcbiAgICB0aGlzLm1hcmtlciA9IG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmlsbCgpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIG51bWJlciBvZiBub2RlcyAoMSB0byAzMSknO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBsZW5ndGggPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGxlbmd0aCA+IDMxIHx8IGxlbmd0aCA8IDEpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIHNpemUgYmV0d2VlbiAxIGFuZCAzMSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBjcmVhdGUgdHJlZSB3aXRoICR7bGVuZ3RofSBub2Rlc2A7XHJcbiAgICB0aGlzLmluaXRJdGVtcyhsZW5ndGgpO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbmQoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2Ygbm9kZSB0byBmaW5kJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIHRyeSB0byBmaW5kIG5vZGUgd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBpc0ZvdW5kID0gZmFsc2U7XHJcbiAgICB3aGlsZSh0aGlzLml0ZW1zW2ldICYmIHRoaXMuaXRlbXNbaV0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICBpc0ZvdW5kID0gdHJ1ZTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBpc0xlZnQgPSB0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5O1xyXG4gICAgICBpID0gMiAqIGkgKyAoaXNMZWZ0ID8gMSA6IDIpO1xyXG4gICAgICB5aWVsZCBgR29pbmcgdG8gJHtpc0xlZnQgPyAnbGVmdCcgOiAncmlnaHQnfSBjaGlsZGA7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgJHtpc0ZvdW5kID8gJ0hhdmUgZm91bmQnIDogJ0NhblxcJ3QgZmluZCd9IG5vZGUgJHtrZXl9YDtcclxuICAgIHlpZWxkICdTZWFyY2ggaXMgY29tcGxldGUnO1xyXG4gICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9ySW5zKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIG5vZGUgdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiA5OSB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgbm9kZSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgd2hpbGUodGhpcy5pdGVtc1tpXSAmJiB0aGlzLml0ZW1zW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICBjb25zdCBpc0xlZnQgPSB0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5O1xyXG4gICAgICBpID0gMiAqIGkgKyAoaXNMZWZ0ID8gMSA6IDIpO1xyXG4gICAgICB5aWVsZCBgR29pbmcgdG8gJHtpc0xlZnQgPyAnbGVmdCcgOiAncmlnaHQnfSBjaGlsZGA7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tpXSkge1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgeWllbGQgYEhhdmUgaW5zZXJ0ZWQgbm9kZSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgICB5aWVsZCAnSW5zZXJ0aW9uIGNvbXBsZXRlZCc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB5aWVsZCAnQ2FuXFwndCBpbnNlcnQ6IExldmVsIGlzIHRvbyBncmVhdCc7XHJcbiAgICB9XHJcbiAgICB0aGlzLmluaXRNYXJrZXIoKTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JUcmF2KCkge1xyXG4gICAgeWllbGQgJ1dpbGwgdHJhdmVyc2UgdHJlZSBpbiBcImlub3JkZXJcIic7XHJcbiAgICB0aGlzLnRyYXZDb25zb2xlLnNldE1lc3NhZ2UoJycpO1xyXG4gICAgY29uc3Qgb3BlcmF0aW9ucyA9IFtdO1xyXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UoaSwgaXRlbXMpIHtcclxuICAgICAgaWYgKCFpdGVtc1tpXSB8fCBpdGVtc1tpXS52YWx1ZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IGxlZnQgPSAyICogaSArIDE7XHJcbiAgICAgIGNvbnN0IHJpZ2h0ID0gMiAqIGkgKyAyO1xyXG4gICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdsZWZ0JywgaW5kZXg6IGxlZnR9KTtcclxuICAgICAgdHJhdmVyc2UobGVmdCwgaXRlbXMpO1xyXG4gICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdzZWxmJywgaW5kZXg6IGksIHZhbHVlOiBpdGVtc1tpXS52YWx1ZX0pO1xyXG4gICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdyaWdodCcsIGluZGV4OiByaWdodH0pO1xyXG4gICAgICB0cmF2ZXJzZShyaWdodCwgaXRlbXMpO1xyXG4gICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdleGl0JywgaW5kZXg6IGl9KTtcclxuICAgIH1cclxuICAgIHRyYXZlcnNlKDAsIHRoaXMuaXRlbXMpO1xyXG4gICAgd2hpbGUgKG9wZXJhdGlvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zdCBvcGVyYXRpb24gPSBvcGVyYXRpb25zLnNoaWZ0KCk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW29wZXJhdGlvbi5pbmRleF0gJiYgdGhpcy5pdGVtc1tvcGVyYXRpb24uaW5kZXhdLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IG9wZXJhdGlvbi5pbmRleDtcclxuICAgICAgfVxyXG4gICAgICBzd2l0Y2ggKG9wZXJhdGlvbi50eXBlKSB7XHJcbiAgICAgICAgY2FzZSAnc2VsZic6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIHZpc2l0IHRoaXMgbm9kZSc7XHJcbiAgICAgICAgICB0aGlzLnRyYXZDb25zb2xlLnNldE1lc3NhZ2UodGhpcy50cmF2Q29uc29sZS5tZXNzYWdlICsgJyAnICsgb3BlcmF0aW9uLnZhbHVlKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlICdsZWZ0Jzoge1xyXG4gICAgICAgICAgeWllbGQgJ1dpbGwgY2hlY2sgZm9yIGxlZnQgY2hpbGQnO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgJ3JpZ2h0Jzoge1xyXG4gICAgICAgICAgeWllbGQgJ1dpbGwgY2hlY2sgZm9yIHJpZ2h0IGNoaWxkJztcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlICdleGl0Jzoge1xyXG4gICAgICAgICAgeWllbGQgJ1dpbGwgZ28gdG8gcm9vdCBvZiBsYXN0IHN1YnRyZWUnO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnRmluaXNoIHRyYXZlcnNlJztcclxuICAgIHRoaXMudHJhdkNvbnNvbGUuc2V0TWVzc2FnZSgnJyk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRGVsKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIG5vZGUgdG8gZGVsZXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIHRyeSB0byBmaW5kIG5vZGUgd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBpc0ZvdW5kID0gZmFsc2U7XHJcbiAgICB3aGlsZSAodGhpcy5pdGVtc1tpXSAmJiB0aGlzLml0ZW1zW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICBpZiAodGhpcy5pdGVtc1tpXS52YWx1ZSA9PT0ga2V5KSB7XHJcbiAgICAgICAgaXNGb3VuZCA9IHRydWU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgaXNMZWZ0ID0gdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleTtcclxuICAgICAgaSA9IDIgKiBpICsgKGlzTGVmdCA/IDEgOiAyKTtcclxuICAgICAgeWllbGQgYEdvaW5nIHRvICR7aXNMZWZ0ID8gJ2xlZnQnIDogJ3JpZ2h0J30gY2hpbGRgO1xyXG4gICAgfVxyXG4gICAgaWYgKGlzRm91bmQpIHtcclxuICAgICAgeWllbGQgJ0hhdmUgZm91bmQgbm9kZSB0byBkZWxldGUnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICdDYW5cXCd0IGZpbmQgbm9kZSB0byBkZWxldGUnO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLml0ZW1zW2ldO1xyXG4gICAgY29uc3QgbGVmdENoaWxkID0gdGhpcy5pdGVtc1syICogaSArIDFdO1xyXG4gICAgY29uc3QgcmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAyXTtcclxuICAgIC8vaWYgbm9kZSBoYXMgbm8gY2hpbGRyZW5cclxuICAgIGlmICgoIWxlZnRDaGlsZCB8fCBsZWZ0Q2hpbGQudmFsdWUgPT0gbnVsbCkgJiYgKCFyaWdodENoaWxkIHx8IHJpZ2h0Q2hpbGQudmFsdWUgPT0gbnVsbCkpIHtcclxuICAgICAgY3VycmVudC5jbGVhcigpO1xyXG4gICAgICB5aWVsZCAnTm9kZSB3YXMgZGVsZXRlZCc7XHJcbiAgICB9IGVsc2UgaWYgKCFyaWdodENoaWxkIHx8IHJpZ2h0Q2hpbGQudmFsdWUgPT0gbnVsbCkgeyAvL2lmIG5vZGUgaGFzIG5vIHJpZ2h0IGNoaWxkXHJcbiAgICAgIHlpZWxkICdXaWxsIHJlcGxhY2Ugbm9kZSB3aXRoIGl0cyBsZWZ0IHN1YnRyZWUnO1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShsZWZ0Q2hpbGQuaW5kZXgsIGN1cnJlbnQuaW5kZXgsIHRoaXMuaXRlbXMpO1xyXG4gICAgICB5aWVsZCAnTm9kZSB3YXMgcmVwbGFjZWQgYnkgaXRzIGxlZnQgc3VidHJlZSc7XHJcbiAgICB9IGVsc2UgaWYgKCFsZWZ0Q2hpbGQgfHwgbGVmdENoaWxkLnZhbHVlID09IG51bGwpIHsgLy9pZiBub2RlIGhhcyBubyBsZWZ0IGNoaWxkXHJcbiAgICAgIHlpZWxkICdXaWxsIHJlcGxhY2Ugbm9kZSB3aXRoIGl0cyByaWdodCBzdWJ0cmVlJztcclxuICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUocmlnaHRDaGlsZC5pbmRleCwgY3VycmVudC5pbmRleCwgdGhpcy5pdGVtcyk7XHJcbiAgICAgIHlpZWxkICdOb2RlIHdhcyByZXBsYWNlZCBieSBpdHMgcmlnaHQgc3VidHJlZSc7XHJcbiAgICB9IGVsc2UgeyAvL25vZGUgaGFzIHR3byBjaGlsZHJlbiwgZmluZCBzdWNjZXNzb3JcclxuICAgICAgY29uc3Qgc3VjY2Vzc29yID0gUGFnZUJpbmFyeVRyZWUuZ2V0U3VjY2Vzc29yKGN1cnJlbnQuaW5kZXgsIHRoaXMuaXRlbXMpO1xyXG4gICAgICB5aWVsZCBgV2lsbCByZXBsYWNlIG5vZGUgd2l0aCAke3RoaXMuaXRlbXNbc3VjY2Vzc29yXS52YWx1ZX1gO1xyXG4gICAgICBjb25zdCBoYXNSaWdodENoaWxkID0gdGhpcy5pdGVtc1syICogc3VjY2Vzc29yICsgMl0gJiYgdGhpcy5pdGVtc1syICogc3VjY2Vzc29yICsgMl0udmFsdWUgIT0gbnVsbDtcclxuICAgICAgaWYgKGhhc1JpZ2h0Q2hpbGQpIHtcclxuICAgICAgICB5aWVsZCBgYW5kIHJlcGxhY2UgJHt0aGlzLml0ZW1zW3N1Y2Nlc3Nvcl0udmFsdWV9IHdpdGggaXRzIHJpZ2h0IHN1YnRyZWVgO1xyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnQubW92ZUZyb20odGhpcy5pdGVtc1tzdWNjZXNzb3JdKTtcclxuICAgICAgaWYgKGhhc1JpZ2h0Q2hpbGQpIHtcclxuICAgICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZSgyICogc3VjY2Vzc29yICsgMiwgc3VjY2Vzc29yLCB0aGlzLml0ZW1zKTtcclxuICAgICAgICB5aWVsZCAnUmVtb3ZlZCBub2RlIGluIDItc3RlcCBwcm9jZXNzJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnTm9kZSB3YXMgcmVwbGFjZWQgYnkgc3VjY2Vzc29yJztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZ2V0U3VjY2Vzc29yKGluZGV4LCBpdGVtcykge1xyXG4gICAgbGV0IHN1Y2Nlc3NvciA9IGluZGV4O1xyXG4gICAgbGV0IGN1cnJlbnQgPSAyICogaW5kZXggKyAyOyAvL3JpZ2h0IGNoaWxkXHJcbiAgICB3aGlsZShpdGVtc1tjdXJyZW50XSAmJiBpdGVtc1tjdXJyZW50XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIHN1Y2Nlc3NvciA9IGN1cnJlbnQ7XHJcbiAgICAgIGN1cnJlbnQgPSAyICogY3VycmVudCArIDE7IC8vbGVmdCBjaGlsZFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHN1Y2Nlc3NvcjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBtb3ZlU3VidHJlZShmcm9tLCB0bywgaXRlbXMpIHtcclxuICAgIGNvbnN0IHRlbXBJdGVtcyA9IFtdO1xyXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlTW92ZVRvVGVtcChmcm9tLCB0bykge1xyXG4gICAgICBpZiAoIWl0ZW1zW2Zyb21dIHx8IGl0ZW1zW2Zyb21dLnZhbHVlID09IG51bGwpIHJldHVybjtcclxuICAgICAgdGVtcEl0ZW1zW3RvXSA9IG5ldyBJdGVtKGl0ZW1zW2Zyb21dKTtcclxuICAgICAgaXRlbXNbZnJvbV0uY2xlYXIoKTtcclxuICAgICAgcmVjdXJzaXZlTW92ZVRvVGVtcCgyICogZnJvbSArIDEsIDIgKiB0byArIDEpOyAvL2xlZnRcclxuICAgICAgcmVjdXJzaXZlTW92ZVRvVGVtcCgyICogZnJvbSArIDIsIDIgKiB0byArIDIpOyAvL3JpZ2h0XHJcbiAgICB9XHJcbiAgICByZWN1cnNpdmVNb3ZlVG9UZW1wKGZyb20sIHRvKTtcclxuICAgIHRlbXBJdGVtcy5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4geyAvL3Jlc3RvcmUgZnJvbSB0ZW1wXHJcbiAgICAgIGl0ZW1zW2luZGV4XS5tb3ZlRnJvbShpdGVtKTtcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWJpbmFyeS10cmVlJywgUGFnZUJpbmFyeVRyZWUpOyIsImltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCaW5hcnlUcmVlfSBmcm9tICcuL3BhZ2VCaW5hcnlUcmVlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlUmVkQmxhY2tUcmVlIGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaW5pdCgpO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxoND5SZWQtQmxhY2sgVHJlZTwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5pbml0LmJpbmQodGhpcyl9PlN0YXJ0PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckRlbCl9PkRlbDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRmxpcCl9PkZsaXA8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclJvTCl9PlJvTDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUm9SKX0+Um9SPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5zd2ljaFJCLmJpbmQodGhpcyl9PlIvQjwveC1idXR0b24+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwibWFpbi1jb25zb2xlXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJjb25zb2xlLXN0YXRzXCIgZGVmYXVsdE1lc3NhZ2U9XCLigJRcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtdHJlZSAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2VyPSR7dGhpcy5tYXJrZXJ9IC5jbGlja0ZuPSR7aXRlbSA9PiB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXh9PjwveC1pdGVtcy10cmVlPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuY29ycmVjdG5lc3NDb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuY29uc29sZS1zdGF0cycpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljaygpIHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLmhhbmRsZUNsaWNrKC4uLmFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLmNoZWNrUnVsZXMoKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBpbml0KCkge1xyXG4gICAgY29uc3QgYXJyID0gKG5ldyBBcnJheSgzMSkpLmZpbGwoKS5tYXAoKF8sIGkpID0+IG5ldyBJdGVtKHtpbmRleDogaX0pKTtcclxuICAgIGFyclswXS5zZXRWYWx1ZSg1MCk7XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gICAgaWYgKHRoaXMuY29uc29sZSkge1xyXG4gICAgICB0aGlzLmNoZWNrUnVsZXMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2Ygbm9kZSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDk5IHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBpc0xlZnQgPSBmYWxzZTtcclxuICAgIHdoaWxlKHRoaXMuaXRlbXNbaV0gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIGlzTGVmdCA9IHRoaXMuaXRlbXNbaV0udmFsdWUgPiBrZXk7XHJcbiAgICAgIGkgPSAyICogaSArIChpc0xlZnQgPyAxIDogMik7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tpXSkge1xyXG4gICAgICBjb25zdCBwYXJlbnRJID0gTWF0aC5mbG9vcigoaSAtIDEpIC8gMik7XHJcbiAgICAgIGNvbnN0IGdyYW5kUGFyZW50SSA9IE1hdGguZmxvb3IoKHBhcmVudEkgLSAxKSAvIDIpO1xyXG4gICAgICAvL2lmIHBhcmVudCBpcyByZWQsIGdyYW5kUGFyZW50IGlzIGJsYWNrIGFuZCBzZWNvbmQgY2hpbGQgb2YgZ3JhbmRQYXJlbnQgaXMgcmVkXHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW3BhcmVudEldLm1hcmsgJiYgdGhpcy5pdGVtc1tncmFuZFBhcmVudEldICYmICF0aGlzLml0ZW1zW2dyYW5kUGFyZW50SV0ubWFyayAmJiB0aGlzLml0ZW1zWzIgKiBncmFuZFBhcmVudEkgKyAoaXNMZWZ0ID8gMiA6IDEpXS5tYXJrKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBncmFuZFBhcmVudEk7XHJcbiAgICAgICAgcmV0dXJuICdDQU5cXCdUIElOU0VSVDogTmVlZHMgY29sb3IgZmxpcCc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgICB0aGlzLml0ZW1zW2ldLm1hcmsgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gJ0NBTlxcJ1QgSU5TRVJUOiBMZXZlbCBpcyB0b28gZ3JlYXQnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBub2RlIHRvIGRlbGV0ZSc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gOTkgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgd2hpbGUodGhpcy5pdGVtc1tpXSAmJiB0aGlzLml0ZW1zW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IGtleSkgYnJlYWs7XHJcbiAgICAgIGkgPSAyICogaSArICh0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5ID8gMSA6IDIpO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLml0ZW1zW2ldIHx8IHRoaXMuaXRlbXNbaV0udmFsdWUgPT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4gJ0NhblxcJ3QgZmluZCBub2RlIHRvIGRlbGV0ZSc7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY3VycmVudCA9IHRoaXMuaXRlbXNbaV07XHJcbiAgICBjb25zdCBsZWZ0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiBpICsgMV07XHJcbiAgICBjb25zdCByaWdodENoaWxkID0gdGhpcy5pdGVtc1syICogaSArIDJdO1xyXG4gICAgLy9pZiBub2RlIGhhcyBubyBjaGlsZHJlblxyXG4gICAgaWYgKCghbGVmdENoaWxkIHx8IGxlZnRDaGlsZC52YWx1ZSA9PSBudWxsKSAmJiAoIXJpZ2h0Q2hpbGQgfHwgcmlnaHRDaGlsZC52YWx1ZSA9PSBudWxsKSkge1xyXG4gICAgICB0aGlzLml0ZW1zW2ldLm1hcmsgPSBmYWxzZTtcclxuICAgICAgY3VycmVudC5jbGVhcigpO1xyXG4gICAgfSBlbHNlIGlmICghcmlnaHRDaGlsZCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpIHsgLy9pZiBub2RlIGhhcyBubyByaWdodCBjaGlsZFxyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShsZWZ0Q2hpbGQuaW5kZXgsIGN1cnJlbnQuaW5kZXgsIHRoaXMuaXRlbXMpO1xyXG4gICAgfSBlbHNlIGlmICghbGVmdENoaWxkIHx8IGxlZnRDaGlsZC52YWx1ZSA9PSBudWxsKSB7IC8vaWYgbm9kZSBoYXMgbm8gbGVmdCBjaGlsZFxyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodENoaWxkLmluZGV4LCBjdXJyZW50LmluZGV4LCB0aGlzLml0ZW1zKTtcclxuICAgIH0gZWxzZSB7IC8vbm9kZSBoYXMgdHdvIGNoaWxkcmVuLCBmaW5kIHN1Y2Nlc3NvclxyXG4gICAgICBjb25zdCBzdWNjZXNzb3IgPSBQYWdlQmluYXJ5VHJlZS5nZXRTdWNjZXNzb3IoY3VycmVudC5pbmRleCwgdGhpcy5pdGVtcyk7XHJcbiAgICAgIGNvbnN0IGhhc1JpZ2h0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiBzdWNjZXNzb3IgKyAyXSAmJiB0aGlzLml0ZW1zWzIgKiBzdWNjZXNzb3IgKyAyXS52YWx1ZSAhPSBudWxsO1xyXG4gICAgICBjdXJyZW50Lm1vdmVGcm9tKHRoaXMuaXRlbXNbc3VjY2Vzc29yXSk7XHJcbiAgICAgIGlmIChoYXNSaWdodENoaWxkKSB7XHJcbiAgICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUoMiAqIHN1Y2Nlc3NvciArIDIsIHN1Y2Nlc3NvciwgdGhpcy5pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNoZWNrUnVsZXMoKSB7XHJcbiAgICBsZXQgZXJyb3IgPSBudWxsO1xyXG4gICAgLy8xLiBFYWNoIG5vZGUgaXMgcmVkIG9yIGJsYWNrXHJcbiAgICAvLzIuIFJvb3Qgbm9kZSBpcyBhbHdheXMgYmxhY2tcclxuICAgIGlmICh0aGlzLml0ZW1zWzBdLm1hcmspIHtcclxuICAgICAgZXJyb3IgPSAnRVJST1I6IFJvb3QgbXVzdCBiZSBibGFjayc7XHJcbiAgICB9XHJcbiAgICAvLzMuIFJlZCBub2RlIGhhcyBibGFjayBjaGlsZHJlblxyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxlZnRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAxXTtcclxuICAgICAgY29uc3QgcmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAyXTtcclxuICAgICAgaWYgKGxlZnRDaGlsZCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgIGlmIChpdGVtLm1hcmsgJiYgKGxlZnRDaGlsZC5tYXJrIHx8IHJpZ2h0Q2hpbGQubWFyaykpIHtcclxuICAgICAgICBlcnJvciA9ICdFUlJPUjogUGFyZW50IGFuZCBjaGlsZCBhcmUgYm90aCByZWQhJztcclxuICAgICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXg7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLy80LiBBbGwgcm91dGVzIGZyb20gcm9vdCB0byBub2RlIG9yIGVtcHR5IGNoaWxkIGhhdmUgc2FtZSBibGFjayBoZWlnaHRcclxuICAgIGxldCBjb3VudGVyID0gMTtcclxuICAgIGxldCBjdXIgPSBudWxsO1xyXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UoaSwgaXRlbXMpIHtcclxuICAgICAgaWYgKCFpdGVtc1tpXSB8fCBpdGVtc1tpXS52YWx1ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgaWYgKGN1ciAhPSBudWxsICYmIGNvdW50ZXIgIT09IGN1cikge1xyXG4gICAgICAgICAgZXJyb3IgPSAnRVJST1I6IEJsYWNrIGNvdW50cyBkaWZmZXIhJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3VyID0gY291bnRlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGxlZnQgPSAyICogaSArIDE7XHJcbiAgICAgIGNvbnN0IHJpZ2h0ID0gMiAqIGkgKyAyO1xyXG4gICAgICAvL2xlZnRcclxuICAgICAgaWYgKGl0ZW1zW2xlZnRdICYmICFpdGVtc1tsZWZ0XS5tYXJrICYmIGl0ZW1zW2xlZnRdLnZhbHVlICE9IG51bGwpIGNvdW50ZXIrKztcclxuICAgICAgdHJhdmVyc2UobGVmdCwgaXRlbXMpO1xyXG4gICAgICAvL3NlbGYsIGxlYWZcclxuICAgICAgaWYgKCghaXRlbXNbbGVmdF0gfHwgaXRlbXNbbGVmdF0udmFsdWUgPT0gbnVsbCkgJiYgKCFpdGVtc1tyaWdodF0gfHwgaXRlbXNbcmlnaHRdLnZhbHVlID09IG51bGwpKSB7XHJcbiAgICAgICAgaWYgKGN1ciAhPSBudWxsICYmIGNvdW50ZXIgIT09IGN1cikge1xyXG4gICAgICAgICAgZXJyb3IgPSAnRVJST1I6IEJsYWNrIGNvdW50cyBkaWZmZXIhJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3VyID0gY291bnRlcjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgLy9yaWdodFxyXG4gICAgICBpZiAoaXRlbXNbcmlnaHRdICYmICFpdGVtc1tyaWdodF0ubWFyayAmJiBpdGVtc1tyaWdodF0udmFsdWUgIT0gbnVsbCkgY291bnRlcisrO1xyXG4gICAgICB0cmF2ZXJzZShyaWdodCwgaXRlbXMpO1xyXG4gICAgICAvL3NlbGYsIGV4aXRcclxuICAgICAgaWYgKCFpdGVtc1tpXS5tYXJrKSBjb3VudGVyLS07XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICB0cmF2ZXJzZSgwLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNvcnJlY3RuZXNzQ29uc29sZS5zZXRNZXNzYWdlKGVycm9yIHx8ICdUcmVlIGlzIHJlZC1ibGFjayBjb3JyZWN0Jyk7XHJcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGbGlwKCkge1xyXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5pdGVtc1t0aGlzLm1hcmtlci5wb3NpdGlvbl07XHJcbiAgICBjb25zdCBsZWZ0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiB0aGlzLm1hcmtlci5wb3NpdGlvbiArIDFdO1xyXG4gICAgY29uc3QgcmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIHRoaXMubWFya2VyLnBvc2l0aW9uICsgMl07XHJcbiAgICBpZiAoIWxlZnRDaGlsZCB8fCAhcmlnaHRDaGlsZCB8fCBsZWZ0Q2hpbGQudmFsdWUgPT0gbnVsbCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdOb2RlIGhhcyBubyBjaGlsZHJlbic7XHJcbiAgICB9IGVsc2UgaWYgKHBhcmVudC5pbmRleCA9PT0gMCAmJiBsZWZ0Q2hpbGQubWFyayA9PT0gcmlnaHRDaGlsZC5tYXJrKSB7XHJcbiAgICAgIGxlZnRDaGlsZC5tYXJrID0gIWxlZnRDaGlsZC5tYXJrO1xyXG4gICAgICByaWdodENoaWxkLm1hcmsgPSAhcmlnaHRDaGlsZC5tYXJrO1xyXG4gICAgfSBlbHNlIGlmIChwYXJlbnQubWFyayAhPT0gbGVmdENoaWxkLm1hcmsgJiYgbGVmdENoaWxkLm1hcmsgPT09IHJpZ2h0Q2hpbGQubWFyaykge1xyXG4gICAgICBsZWZ0Q2hpbGQubWFyayA9ICFsZWZ0Q2hpbGQubWFyaztcclxuICAgICAgcmlnaHRDaGlsZC5tYXJrID0gIXJpZ2h0Q2hpbGQubWFyaztcclxuICAgICAgcGFyZW50Lm1hcmsgPSAhcGFyZW50Lm1hcms7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gJ0NhblxcJ3QgZmxpcCB0aGlzIGNvbG9yIGFycmFuZ2VtZW50JztcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JSb0woKSB7XHJcbiAgICBjb25zdCB0b3AgPSB0aGlzLm1hcmtlci5wb3NpdGlvbjtcclxuICAgIGNvbnN0IGxlZnQgPSAyICogdG9wICsgMTtcclxuICAgIGNvbnN0IHJpZ2h0ID0gMiAqIHRvcCArIDI7XHJcbiAgICBpZiAoIXRoaXMuaXRlbXNbcmlnaHRdIHx8IHRoaXMuaXRlbXNbcmlnaHRdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdDYW5cXCd0IHJvdGF0ZSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tsZWZ0XSAmJiB0aGlzLml0ZW1zW2xlZnRdLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUobGVmdCwgMiAqIGxlZnQgKyAxLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXRlbXNbbGVmdF0ubW92ZUZyb20odGhpcy5pdGVtc1t0b3BdKTtcclxuICAgIHRoaXMuaXRlbXNbdG9wXS5tb3ZlRnJvbSh0aGlzLml0ZW1zW3JpZ2h0XSk7XHJcbiAgICBjb25zdCByaWdodEdyYW5kTGVmdCA9IDIgKiByaWdodCArIDE7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodEdyYW5kTGVmdF0gJiYgdGhpcy5pdGVtc1tyaWdodEdyYW5kTGVmdF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodEdyYW5kTGVmdCwgMiAqIGxlZnQgKyAyLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHJpZ2h0R3JhbmRSaWdodCA9IDIgKiByaWdodCArIDI7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodEdyYW5kUmlnaHRdICYmIHRoaXMuaXRlbXNbcmlnaHRHcmFuZFJpZ2h0XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIFBhZ2VCaW5hcnlUcmVlLm1vdmVTdWJ0cmVlKHJpZ2h0R3JhbmRSaWdodCwgcmlnaHQsIHRoaXMuaXRlbXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclJvUigpIHtcclxuICAgIGNvbnN0IHRvcCA9IHRoaXMubWFya2VyLnBvc2l0aW9uO1xyXG4gICAgY29uc3QgbGVmdCA9IDIgKiB0b3AgKyAxO1xyXG4gICAgY29uc3QgcmlnaHQgPSAyICogdG9wICsgMjtcclxuICAgIGlmICghdGhpcy5pdGVtc1tsZWZ0XSB8fCB0aGlzLml0ZW1zW2xlZnRdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdDYW5cXCd0IHJvdGF0ZSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodF0gJiYgdGhpcy5pdGVtc1tyaWdodF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodCwgMiAqIHJpZ2h0ICsgMiwgdGhpcy5pdGVtcyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW3JpZ2h0XS5tb3ZlRnJvbSh0aGlzLml0ZW1zW3RvcF0pO1xyXG4gICAgdGhpcy5pdGVtc1t0b3BdLm1vdmVGcm9tKHRoaXMuaXRlbXNbbGVmdF0pO1xyXG4gICAgY29uc3QgbGVmdEdyYW5kUmlnaHQgPSAyICogbGVmdCArIDI7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tsZWZ0R3JhbmRSaWdodF0gJiYgdGhpcy5pdGVtc1tsZWZ0R3JhbmRSaWdodF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShsZWZ0R3JhbmRSaWdodCwgMiAqIHJpZ2h0ICsgMSwgdGhpcy5pdGVtcyk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBsZWZ0R3JhbmRMZWZ0ID0gMiAqIGxlZnQgKyAxO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbbGVmdEdyYW5kTGVmdF0gJiYgdGhpcy5pdGVtc1tsZWZ0R3JhbmRMZWZ0XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIFBhZ2VCaW5hcnlUcmVlLm1vdmVTdWJ0cmVlKGxlZnRHcmFuZExlZnQsIGxlZnQsIHRoaXMuaXRlbXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3dpY2hSQigpIHtcclxuICAgIHRoaXMuaXRlbXNbdGhpcy5tYXJrZXIucG9zaXRpb25dLm1hcmsgPSAhdGhpcy5pdGVtc1t0aGlzLm1hcmtlci5wb3NpdGlvbl0ubWFyaztcclxuICAgIHRoaXMuY2hlY2tSdWxlcygpO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXJlZGJsYWNrLXRyZWUnLCBQYWdlUmVkQmxhY2tUcmVlKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtnZXRVbmlxdWVSYW5kb21BcnJheSwgaXNQcmltZX0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VIYXNoVGFibGUgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIHRoaXMuREVMRVRFRCA9ICdEZWwnO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxoND5IYXNoIFRhYmxlIChsaW5lYXIvcXVhZC9kb3VibGUpPC9oND5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvck5ldyl9Pk5ldzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRmlsbCl9PkZpbGw8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvcklucyl9PkluczwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRmluZCl9PkZpbmQ8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckRlbCl9PkRlbDwveC1idXR0b24+XHJcbiAgICAgICAgJHt0aGlzLnJlbmRlckFkZGl0aW9uYWxDb250cm9sKCl9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ob3Jpem9udGFsIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXJzPSR7dGhpcy5tYXJrZXJzfT48L3gtaXRlbXMtaG9yaXpvbnRhbD5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyQWRkaXRpb25hbENvbnRyb2woKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2xpbmVhclwiIGRpc2FibGVkIGNoZWNrZWQ+TGluZWFyPC9sYWJlbD5cclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX3F1YWRcIiBkaXNhYmxlZD5RdWFkPC9sYWJlbD5cclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2RvdWJsZVwiIGRpc2FibGVkPkRvdWJsZTwvbGFiZWw+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy5kb3VibGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fZG91YmxlJyk7XHJcbiAgICB0aGlzLnF1YWQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fcXVhZCcpO1xyXG4gICAgdGhpcy5saW5lYXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fbGluZWFyJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSA1OTtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSAzMDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aEZpbGw7XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgZ2V0VW5pcXVlUmFuZG9tQXJyYXkobGVuZ3RoRmlsbCwgMTAwMCkuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgIGFyclt0aGlzLnByb2JlSW5kZXgodmFsdWUpXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW25ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSldO1xyXG4gIH1cclxuXHJcbiAgaGFzaEZuKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgJSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICB9XHJcblxyXG4gIGRvdWJsZUhhc2hGbih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIDUgLSB2YWx1ZSAlIDU7XHJcbiAgfVxyXG5cclxuICBwcm9iZUluZGV4KHZhbHVlKSB7XHJcbiAgICBsZXQgaW5kZXggPSB0aGlzLmhhc2hGbih2YWx1ZSk7XHJcbiAgICBsZXQgc3RlcCA9IDE7XHJcbiAgICBsZXQgY291bnRlciA9IDA7XHJcbiAgICB3aGlsZSAodGhpcy5pdGVtc1tpbmRleF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBjb3VudGVyKys7XHJcbiAgICAgIGlmICh0aGlzLmRvdWJsZSAmJiB0aGlzLmRvdWJsZS5jaGVja2VkKSBzdGVwID0gdGhpcy5kb3VibGVIYXNoRm4odmFsdWUpO1xyXG4gICAgICBpZiAodGhpcy5xdWFkICYmIHRoaXMucXVhZC5jaGVja2VkKSBzdGVwID0gY291bnRlcioqMjtcclxuICAgICAgaW5kZXggKz0gc3RlcDtcclxuICAgICAgaWYgKGluZGV4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSBpbmRleCAtPSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgIH1cclxuICAgIHJldHVybiBpbmRleDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JOZXcoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBzaXplIG9mIGFycmF5IHRvIGNyZWF0ZS4gQ2xvc2VzdCBwcmltZSBudW1iZXIgd2lsbCBiZSBzZWxlY3RlZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gNjAgfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Ugc2l6ZSBiZXR3ZWVuIDAgYW5kIDYwJztcclxuICAgIH1cclxuICAgIHdoaWxlICghaXNQcmltZShsZW5ndGgpKSB7XHJcbiAgICAgIGxlbmd0aC0tO1xyXG4gICAgfVxyXG4gICAgdGhpcy5kb3VibGUuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHRoaXMucXVhZC5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5saW5lYXIuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHlpZWxkICdQbGVhc2UsIHNlbGVjdCBwcm9iZSBtZXRob2QnO1xyXG4gICAgdGhpcy5kb3VibGUuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5xdWFkLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHRoaXMubGluZWFyLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHlpZWxkIGBXaWxsIGNyZWF0ZSBlbXB0eSBhcnJheSB3aXRoICR7bGVuZ3RofSBjZWxsc2A7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgYXJyLnB1c2gobmV3IEl0ZW0oe2luZGV4OiBpfSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHJldHVybiAnTmV3IGFycmF5IGNyZWF0ZWQ7IHRvdGFsIGl0ZW1zID0gMCc7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmlsbCgpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIG51bWJlciBvZiBpdGVtcyB0byBmaWxsIGluJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiB0aGlzLml0ZW1zLmxlbmd0aCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiBgRVJST1I6IGNhbid0IGZpbGwgbW9yZSB0aGFuICR7dGhpcy5pdGVtcy5sZW5ndGh9IGl0ZW1zYDtcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIGZpbGwgaW4gJHtsZW5ndGh9IGl0ZW1zYDtcclxuICAgIGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aCwgMTAwMCkuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgIHRoaXMuaXRlbXNbdGhpcy5wcm9iZUluZGV4KHZhbHVlKV0uc2V0VmFsdWUodmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcclxuICAgIHJldHVybiBgRmlsbCBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zID0gJHtsZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBhcnJheSBpcyBmdWxsJztcclxuICAgIH1cclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGluc2VydCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5oYXNoRm4oa2V5KTtcclxuICAgIGxldCBzdGVwID0gMTtcclxuICAgIGxldCBjb3VudGVyID0gMDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgd2hpbGUgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlICE9IG51bGwgJiYgdGhpcy5pdGVtc1tpbmRleF0udmFsdWUgIT09IHRoaXMuREVMRVRFRCkge1xyXG4gICAgICB5aWVsZCBgQ2VsbCAke2luZGV4fSBvY2N1cGllZDsgZ29pbmcgdG8gbmV4dCBjZWxsYDtcclxuICAgICAgY291bnRlcisrO1xyXG4gICAgICBpZiAodGhpcy5kb3VibGUuY2hlY2tlZCkgc3RlcCA9IHRoaXMuZG91YmxlSGFzaEZuKGtleSk7XHJcbiAgICAgIGlmICh0aGlzLnF1YWQuY2hlY2tlZCkgc3RlcCA9IGNvdW50ZXIqKjI7XHJcbiAgICAgIGluZGV4ICs9IHN0ZXA7XHJcbiAgICAgIGlmIChpbmRleCA+PSB0aGlzLml0ZW1zLmxlbmd0aCkgaW5kZXggLT0gdGhpcy5pdGVtcy5sZW5ndGg7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICB5aWVsZCBgU2VhcmNoaW5nIGZvciB1bm9jY3VwaWVkIGNlbGw7IHN0ZXAgd2FzICR7c3RlcH1gO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0uc2V0VmFsdWUoa2V5KTtcclxuICAgIHlpZWxkIGBJbnNlcnRlZCBpdGVtIHdpdGgga2V5ICR7a2V5fSBhdCBpbmRleCAke2luZGV4fWA7XHJcbiAgICB0aGlzLmxlbmd0aCsrO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgSW5zZXJ0aW9uIGNvbXBsZXRlZDsgdG90YWwgaXRlbXMgJHt0aGlzLmxlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclByb2JlKGtleSkge1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5oYXNoRm4oa2V5KTtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaW5kZXg7XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX0gYXQgaW5kZXggJHtpbmRleH1gO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgZm91bmRBdCA9IGluZGV4O1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLml0ZW1zW2luZGV4XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIHlpZWxkICdObyBtYXRjaDsgd2lsbCBzdGFydCBwcm9iZSc7XHJcbiAgICAgIGxldCBzdGVwID0gMTtcclxuICAgICAgbGV0IGNvdW50ZXIgPSAwO1xyXG4gICAgICB3aGlsZSAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgICAgaWYgKCsrY291bnRlciA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIGJyZWFrO1xyXG4gICAgICAgIGlmICh0aGlzLmRvdWJsZS5jaGVja2VkKSBzdGVwID0gdGhpcy5kb3VibGVIYXNoRm4oa2V5KTtcclxuICAgICAgICBpZiAodGhpcy5xdWFkLmNoZWNrZWQpIHN0ZXAgPSBjb3VudGVyKioyO1xyXG4gICAgICAgIGluZGV4ICs9IHN0ZXA7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSBpbmRleCAtPSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICBpZiAodGhpcy5pdGVtc1tpbmRleF0udmFsdWUgPT0gbnVsbCkgYnJlYWs7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaW5kZXg7XHJcbiAgICAgICAgaWYgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICAgIGZvdW5kQXQgPSBpbmRleDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgeWllbGQgYENoZWNraW5nIG5leHQgY2VsbDsgc3RlcCB3YXMgJHtzdGVwfWA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm91bmRBdDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaW5kKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5pdGVyYXRvclByb2JlKGtleSwgZmFsc2UpO1xyXG4gICAgaWYgKGZvdW5kQXQgPT0gbnVsbCkge1xyXG4gICAgICB5aWVsZCBgQ2FuJ3QgbG9jYXRlIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHlpZWxkIGBIYXZlIGZvdW5kIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIH1cclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRGVsKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZGVsZXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5pdGVyYXRvclByb2JlKGtleSwgdHJ1ZSk7XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBDYW4ndCBsb2NhdGUgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5pdGVtc1tmb3VuZEF0XS52YWx1ZSA9IHRoaXMuREVMRVRFRDtcclxuICAgICAgdGhpcy5pdGVtc1tmb3VuZEF0XS5jb2xvciA9IG51bGw7XHJcbiAgICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICAgIHlpZWxkIGBEZWxldGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9OyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhhc2gtdGFibGUnLCBQYWdlSGFzaFRhYmxlKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtnZXRVbmlxdWVSYW5kb21BcnJheX0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VIYXNoQ2hhaW4gZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoMjUpO1xyXG4gICAgdGhpcy5maWxsVmFsdWVzKHRoaXMuaXRlbXMubGVuZ3RoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+SGFzaCBUYWJsZSBDaGFpbjwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbGwpfT5GaWxsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPG9sIHN0YXJ0PVwiMFwiIHN0eWxlPVwiaGVpZ2h0OiAzMGVtOyBvdmVyZmxvdy15OiBzY3JvbGw7XCI+JHt0aGlzLnJlbmRlckxpbmVzKCl9PC9vbD5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyTGluZXMoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pdGVtcy5tYXAoKGxpc3QsIGkpID0+IGh0bWxgXHJcbiAgICAgIDxsaT48eC1pdGVtcy1ob3Jpem9udGFsLWxpbmtlZCAuaXRlbXM9JHtsaXN0Lml0ZW1zfSAubWFya2VyPSR7bGlzdC5tYXJrZXJ9IG5hcnJvdyBjbGFzcz1cImxpc3QtJHtpfVwiPjwveC1pdGVtcy1ob3Jpem9udGFsLWxpbmtlZD48L2xpPlxyXG4gICAgYCk7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtY29uc29sZScpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoKSB7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgYXJyLnB1c2goe2l0ZW1zOiBbbmV3IEl0ZW0oe30pXSwgbWFya2VyOiB7fX0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICB9XHJcblxyXG4gIGZpbGxWYWx1ZXMobGVuZ3RoKSB7XHJcbiAgICBnZXRVbmlxdWVSYW5kb21BcnJheShsZW5ndGgsIDEwMDApLmZvckVhY2godmFsdWUgPT4ge1xyXG4gICAgICBjb25zdCBsaXN0ID0gdGhpcy5pdGVtc1t0aGlzLmhhc2hGbih2YWx1ZSldO1xyXG4gICAgICBpZiAobGlzdC5pdGVtc1swXS52YWx1ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgbGlzdC5pdGVtc1swXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGlzdC5pdGVtcy5wdXNoKChuZXcgSXRlbSh7fSkpLnNldFZhbHVlKHZhbHVlKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMuaXRlbXNbMF0ubWFya2VyID0gbmV3IE1hcmtlcih7cG9zaXRpb246IDB9KTtcclxuICB9XHJcblxyXG4gIGNsZWFySW5pdGlhbE1hcmtlcigpIHtcclxuICAgIHRoaXMuaXRlbXNbMF0ubWFya2VyID0ge307XHJcbiAgfVxyXG5cclxuICBoYXNoRm4odmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSAlIHRoaXMuaXRlbXMubGVuZ3RoO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgdGFibGUgdG8gY3JlYXRlLic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gMTAwIHx8IGxlbmd0aCA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIHNpemUgYmV0d2VlbiAwIGFuZCAxMDAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IHRhYmxlIHdpdGggJHtsZW5ndGh9IGxpc3RzYDtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKGxlbmd0aCk7XHJcbiAgICByZXR1cm4gJ05ldyB0YWJsZSBjcmVhdGVkOyB0b3RhbCBpdGVtcyA9IDAnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2YgaXRlbXMgdG8gZmlsbCBpbic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gdGhpcy5pdGVtcy5sZW5ndGggfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gYEVSUk9SOiBjYW4ndCBmaWxsIG1vcmUgdGhhbiAke3RoaXMuaXRlbXMubGVuZ3RofSBpdGVtc2A7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBmaWxsIGluICR7bGVuZ3RofSBpdGVtc2A7XHJcbiAgICB0aGlzLmZpbGxWYWx1ZXMobGVuZ3RoKTtcclxuICAgIHJldHVybiBgRmlsbCBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zID0gJHtsZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgaW5zZXJ0IGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIHRoaXMuY2xlYXJJbml0aWFsTWFya2VyKCk7XHJcbiAgICBsZXQgaW5kZXggPSB0aGlzLmhhc2hGbihrZXkpO1xyXG4gICAgY29uc3QgbGlzdCA9IHRoaXMuaXRlbXNbaW5kZXhdO1xyXG4gICAgbGlzdC5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gICAgdGhpcy5xdWVyeVNlbGVjdG9yKGAubGlzdC0ke2luZGV4fWApLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKTtcclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpbiBsaXN0ICR7aW5kZXh9YDtcclxuICAgIGlmIChsaXN0Lml0ZW1zWzBdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgbGlzdC5pdGVtc1swXS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbGlzdC5pdGVtcy5wdXNoKChuZXcgSXRlbSh7fSkpLnNldFZhbHVlKGtleSkpO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGluIGxpc3QgJHtpbmRleH1gO1xyXG4gICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgICByZXR1cm4gYEluc2VydGlvbiBjb21wbGV0ZWQuIFRvdGFsIGl0ZW1zID0gJHt0aGlzLmxlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbmQoaXNJbnRlcm5hbCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgdHJ5IHRvIGZpbmQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgdGhpcy5jbGVhckluaXRpYWxNYXJrZXIoKTtcclxuICAgIGxldCBpbmRleCA9IHRoaXMuaGFzaEZuKGtleSk7XHJcbiAgICBjb25zdCBsaXN0ID0gdGhpcy5pdGVtc1tpbmRleF07XHJcbiAgICBsaXN0Lm1hcmtlciA9IG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSk7XHJcbiAgICB0aGlzLnF1ZXJ5U2VsZWN0b3IoYC5saXN0LSR7aW5kZXh9YCkuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpO1xyXG4gICAgeWllbGQgYEl0ZW0gd2l0aCBrZXkgJHtrZXl9IHNob3VsZCBiZSBpbiBsaXN0ICR7aW5kZXh9YDtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgd2hpbGUgKGxpc3QuaXRlbXNbaV0gJiYgbGlzdC5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIGxpc3QubWFya2VyID0gbmV3IE1hcmtlcih7cG9zaXRpb246IGl9KTtcclxuICAgICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGF0IGxpbmsgJHtpfWA7XHJcbiAgICAgIGlmIChsaXN0Lml0ZW1zW2ldLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICBmb3VuZEF0ID0gaTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgICBpKys7XHJcbiAgICB9XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBDYW4ndCBsb2NhdGUgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgeWllbGQgYEhhdmUgZm91bmQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfVxyXG4gICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIGlmIChpc0ludGVybmFsICYmIGZvdW5kQXQgIT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4ga2V5O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSB5aWVsZCogdGhpcy5pdGVyYXRvckZpbmQodHJ1ZSk7XHJcbiAgICBpZiAoa2V5ICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5jbGVhckluaXRpYWxNYXJrZXIoKTtcclxuICAgICAgY29uc3QgbGlzdCA9IHRoaXMuaXRlbXNbdGhpcy5oYXNoRm4oa2V5KV07XHJcbiAgICAgIGNvbnN0IGluZGV4ID0gbGlzdC5pdGVtcy5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLnZhbHVlID09PSBrZXkpO1xyXG4gICAgICBpZiAoaW5kZXggPT09IDApIHtcclxuICAgICAgICBsaXN0Lm1hcmtlci5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICAgIGxpc3QuaXRlbXNbaW5kZXhdLmNsZWFyKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGlzdC5tYXJrZXIucG9zaXRpb24gPSBpbmRleCAtIDE7XHJcbiAgICAgICAgbGlzdC5pdGVtcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICAgIHlpZWxkIGBEZWxldGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9LiBUb3RhbCBpdGVtcyA9ICR7dGhpcy5sZW5ndGh9YDtcclxuICAgICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhhc2gtY2hhaW4nLCBQYWdlSGFzaENoYWluKTsiLCJpbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlSGVhcCBleHRlbmRzIFBhZ2VCYXNlIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLmluaXRJdGVtcygxMCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXIoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDQ+SGVhcDwvaDQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGaWxsKX0+RmlsbDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yQ2huZyl9PkNobmc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclJlbSl9PlJlbTwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9ySW5zKX0+SW5zPC94LWJ1dHRvbj5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJtYWluLWNvbnNvbGVcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtdHJlZSAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2VyPSR7dGhpcy5tYXJrZXJ9PjwveC1pdGVtcy10cmVlPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICAgICBhcnJbY3VyTGVuZ3RoXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIC8vdHJpY2tsZSB1cFxyXG4gICAgICBsZXQgaW5kZXggPSBjdXJMZW5ndGg7XHJcbiAgICAgIGxldCBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJMZW5ndGggLSAxKSAvIDIpO1xyXG4gICAgICB3aGlsZShpbmRleCA+PSAwICYmIGFycltwYXJlbnRdICYmIGFycltwYXJlbnRdLnZhbHVlIDwgdmFsdWUpIHtcclxuICAgICAgICBhcnJbcGFyZW50XS5zd2FwV2l0aChhcnJbaW5kZXhdKTtcclxuICAgICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgICBwYXJlbnQgPSBNYXRoLmZsb29yKChwYXJlbnQgLSAxKSAvIDIpO1xyXG4gICAgICB9XHJcbiAgKiAqL1xyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy50cmVlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLXRyZWUnKTtcclxuICB9XHJcblxyXG4gIGluaXRJdGVtcyhsZW5ndGgpIHtcclxuICAgIGNvbnN0IGFyciA9IChuZXcgQXJyYXkoMzEpKS5maWxsKCkubWFwKChfLCBpKSA9PiBuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICBmb3IgKGxldCBjdXJMZW5ndGggPSAwOyBjdXJMZW5ndGggPD0gbGVuZ3RoIC0gMTsgY3VyTGVuZ3RoKyspIHtcclxuICAgICAgY29uc3QgdmFsdWUgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICBhcnJbY3VyTGVuZ3RoXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIC8vdHJpY2tsZSB1cFxyXG4gICAgICBsZXQgaW5kZXggPSBjdXJMZW5ndGg7XHJcbiAgICAgIGxldCBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJMZW5ndGggLSAxKSAvIDIpO1xyXG4gICAgICB3aGlsZShpbmRleCA+PSAwICYmIGFycltwYXJlbnRdICYmIGFycltwYXJlbnRdLnZhbHVlIDwgdmFsdWUpIHtcclxuICAgICAgICBhcnJbcGFyZW50XS5zd2FwV2l0aChhcnJbaW5kZXhdKTtcclxuICAgICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgICBwYXJlbnQgPSBNYXRoLmZsb29yKChwYXJlbnQgLSAxKSAvIDIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VyKCkge1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2Ygbm9kZXMgKDEgdG8gMzEpJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiAzMSB8fCBsZW5ndGggPCAxKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMSBhbmQgMzEnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIHRyZWUgd2l0aCAke2xlbmd0aH0gbm9kZXNgO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoKTtcclxuICB9XHJcblxyXG4gICogdHJpY2tsZVVwKGtleSwgaW5kZXgpIHtcclxuICAgIHRoaXMuaXRlbXNbaW5kZXhdLnNldFZhbHVlKCcnLCAnI2ZmZmZmZicpO1xyXG4gICAgeWllbGQgJ1NhdmVkIG5ldyBub2RlOyB3aWxsIHRyaWNrbGUgdXAnO1xyXG4gICAgbGV0IHBhcmVudCA9IE1hdGguZmxvb3IoKGluZGV4IC0gMSkgLyAyKTtcclxuICAgIHdoaWxlKGluZGV4ID49IDAgJiYgdGhpcy5pdGVtc1twYXJlbnRdICYmIHRoaXMuaXRlbXNbcGFyZW50XS52YWx1ZSA8IGtleSkge1xyXG4gICAgICB0aGlzLml0ZW1zW3BhcmVudF0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbmRleF0pO1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IHBhcmVudDtcclxuICAgICAgeWllbGQgJ01vdmVkIGVtcHR5IG5vZGUgdXAnO1xyXG4gICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgcGFyZW50ID0gTWF0aC5mbG9vcigocGFyZW50IC0gMSkgLyAyKTtcclxuICAgIH1cclxuICAgIHlpZWxkICdUcmlja2xlIHVwIGNvbXBsZXRlZCc7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpbmRleDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBubyByb29tIGluIGRpc3BsYXknO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIG5vZGUgdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiA5OSB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgbm9kZSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5sZW5ndGg7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpbmRleDtcclxuICAgIHlpZWxkICdQbGFjZWQgbm9kZSBpbiBmaXJzdCBlbXB0eSBjZWxsJztcclxuICAgIHlpZWxkKiB0aGlzLnRyaWNrbGVVcChrZXksIGluZGV4KTtcclxuICAgIHlpZWxkICdJbnNlcnRlZCBuZXcgbm9kZSBpbiBlbXB0eSBub2RlJztcclxuICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gMDtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgfVxyXG5cclxuICAqIHRyaWNrbGVEb3duKGluZGV4LCBpc0NoZykge1xyXG4gICAgY29uc3Qgcm9vdE5vZGUgPSBuZXcgSXRlbSh0aGlzLml0ZW1zW2luZGV4XSk7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZSgnJywgJyNmZmZmZmYnKTtcclxuICAgIHlpZWxkIGBTYXZlZCAke2lzQ2hnID8gJ2NoYW5nZWQnIDogJ3Jvb3QnfSBub2RlICgke3Jvb3ROb2RlLnZhbHVlfSlgO1xyXG4gICAgd2hpbGUoaW5kZXggPCBNYXRoLmZsb29yKHRoaXMubGVuZ3RoIC8gMikpIHsgLy9ub2RlIGhhcyBhdCBsZWFzdCBvbmUgY2hpbGRcclxuICAgICAgbGV0IGxhcmdlckNoaWxkO1xyXG4gICAgICBjb25zdCBsZWZ0Q2hpbGQgPSBpbmRleCAqIDIgKyAxO1xyXG4gICAgICBjb25zdCByaWdodENoaWxkID0gbGVmdENoaWxkICsgMTtcclxuICAgICAgaWYgKHJpZ2h0Q2hpbGQgPCB0aGlzLmxlbmd0aCAmJiB0aGlzLml0ZW1zW2xlZnRDaGlsZF0udmFsdWUgPCB0aGlzLml0ZW1zW3JpZ2h0Q2hpbGRdLnZhbHVlKSB7XHJcbiAgICAgICAgbGFyZ2VyQ2hpbGQgPSByaWdodENoaWxkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxhcmdlckNoaWxkID0gbGVmdENoaWxkO1xyXG4gICAgICB9XHJcbiAgICAgIHlpZWxkIGBLZXkgJHt0aGlzLml0ZW1zW2xhcmdlckNoaWxkXS52YWx1ZX0gaXMgbGFyZ2VyIGNoaWxkYDtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbbGFyZ2VyQ2hpbGRdLnZhbHVlIDwgcm9vdE5vZGUudmFsdWUpIHtcclxuICAgICAgICB5aWVsZCBgJHtpc0NoZyA/ICdDaGFuZ2VkJyA6ICdcIkxhc3RcIid9IG5vZGUgbGFyZ2VyOyB3aWxsIGluc2VydCBpdGA7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5pdGVtc1tsYXJnZXJDaGlsZF0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbmRleF0pO1xyXG4gICAgICBpbmRleCA9IGxhcmdlckNoaWxkO1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICB5aWVsZCAnTW92ZWQgZW1wdHkgbm9kZSBkb3duJztcclxuICAgIH1cclxuICAgIGlmIChNYXRoLmZsb29yKE1hdGgubG9nMih0aGlzLmxlbmd0aCkpID09PSBNYXRoLmZsb29yKE1hdGgubG9nMihpbmRleCArIDEpKSkge1xyXG4gICAgICB5aWVsZCAnUmVhY2hlZCBib3R0b20gcm93LCBzbyBkb25lJztcclxuICAgIH0gZWxzZSBpZiAoaW5kZXggPj0gTWF0aC5mbG9vcih0aGlzLmxlbmd0aCAvIDIpKSB7XHJcbiAgICAgIHlpZWxkICdOb2RlIGhhcyBubyBjaGlsZHJlbiwgc28gZG9uZSc7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XSA9IHJvb3ROb2RlO1xyXG4gICAgeWllbGQgYEluc2VydGVkICR7aXNDaGcgPyAnY2hhbmdlZCcgOiAnXCJsYXN0XCInfSBub2RlYDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JSZW0oKSB7XHJcbiAgICBsZXQgaW5kZXggPSAwO1xyXG4gICAgY29uc3QgcmVtb3ZlZEtleSA9IHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlO1xyXG4gICAgeWllbGQgYFdpbGwgcmVtb3ZlIGxhcmdlc3Qgbm9kZSAoJHtyZW1vdmVkS2V5fSlgO1xyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0uc2V0VmFsdWUoJycsICcjZmZmZmZmJyk7XHJcbiAgICBjb25zdCBsYXN0Tm9kZSA9IHRoaXMuaXRlbXNbdGhpcy5sZW5ndGggLSAxXTtcclxuICAgIHlpZWxkIGBXaWxsIHJlcGxhY2Ugd2l0aCBcImxhc3RcIiBub2RlICgke2xhc3ROb2RlLnZhbHVlfSlgO1xyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0ubW92ZUZyb20obGFzdE5vZGUpO1xyXG4gICAgdGhpcy5sZW5ndGgtLTtcclxuICAgIHlpZWxkICdXaWxsIHRyaWNrbGUgZG93bic7XHJcbiAgICB5aWVsZCogdGhpcy50cmlja2xlRG93bihpbmRleCk7XHJcbiAgICB5aWVsZCBgRmluaXNoZWQgZGVsZXRpbmcgbGFyZ2VzdCBub2RlICgke3JlbW92ZWRLZXl9KWA7XHJcbiAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IDA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yQ2huZygpIHtcclxuICAgIHRoaXMudHJlZS5jbGlja0ZuID0gaXRlbSA9PiB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXg7XHJcbiAgICB5aWVsZCAnQ2xpY2sgb24gbm9kZSB0byBiZSBjaGFuZ2VkJztcclxuICAgIHRoaXMudHJlZS5jbGlja0ZuID0gbnVsbDtcclxuICAgIGNvbnN0IHRvcCA9IHRoaXMubWFya2VyLnBvc2l0aW9uO1xyXG4gICAgY29uc3QgY2hhbmdpbmdLZXkgPSB0aGlzLml0ZW1zW3RvcF0udmFsdWU7XHJcbiAgICB5aWVsZCAnVHlwZSBub2RlXFwncyBuZXcgdmFsdWUnO1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gOTkgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY2hhbmdlIG5vZGUgZnJvbSAke2NoYW5naW5nS2V5fSB0byAke2tleX1gO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbdG9wXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICB0aGlzLml0ZW1zW3RvcF0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgeWllbGQgJ0tleSBkZWNyZWFzZWQ7IHdpbGwgdHJpY2tsZSBkb3duJztcclxuICAgICAgeWllbGQqIHRoaXMudHJpY2tsZURvd24odG9wLCB0cnVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuaXRlbXNbdG9wXS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgICB5aWVsZCAnS2V5IGluY3JlYXNlZDsgd2lsbCB0cmlja2xlIHVwJztcclxuICAgICAgeWllbGQqIHRoaXMudHJpY2tsZVVwKGtleSwgdG9wKTtcclxuICAgIH1cclxuICAgIHlpZWxkIGBGaW5pc2hlZCBjaGFuZ2luZyBub2RlICgke2NoYW5naW5nS2V5fSlgO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhlYXAnLCBQYWdlSGVhcCk7IiwiaW1wb3J0IHtQYWdlQmFzZX0gZnJvbSAnLi9wYWdlQmFzZSc7XHJcbmltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VHcmFwaE4gZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMudHJlZSA9IG5ldyBNYXAoKTtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgICB0aGlzLmNsaWNrRm4gPSBudWxsO1xyXG4gIH1cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGg0Pk5vbi1EaXJlY3RlZCBOb24tV2VpZ2h0ZWQgR3JhcGg8L2g0PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMubmV3R3JhcGguYmluZCh0aGlzKX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JERlMpfT5ERlM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckJGUyl9PkJGUzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yVHJlZSl9PlRyZWU8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLnRvZ2dsZVZpZXcuYmluZCh0aGlzKX0+VmlldzwveC1idXR0b24+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwibWFpbi1jb25zb2xlXCIgZGVmYXVsdE1lc3NhZ2U9XCJEb3VibGUtY2xpY2sgbW91c2UgdG8gbWFrZSB2ZXJ0ZXguIERyYWcgdG8gbWFrZSBhbiBlZGdlLiBEcmFnICsgQ3RybCB0byBtb3ZlIHZlcnRleC5cIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cImNvbnNvbGUtc3RhdHNcIiBkZWZhdWx0TWVzc2FnZT1cIuKAlFwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ncmFwaFxyXG4gICAgICAgIC5pdGVtcz0ke3RoaXMuaXRlbXN9XHJcbiAgICAgICAgLmNvbm5lY3Rpb25zPSR7dGhpcy5jb25uZWN0aW9uc31cclxuICAgICAgICAubWFya2VkQ29ubmVjdGlvbnM9JHt0aGlzLnRyZWV9XHJcbiAgICAgICAgLnRyZWU9JHt0aGlzLnRyZWV9XHJcbiAgICAgICAgLmNsaWNrRm49JHt0aGlzLmNsaWNrRm59XHJcbiAgICAgICAgbGltaXQ9XCIxOFwiXHJcbiAgICAgICAgQGNoYW5nZWQ9JHt0aGlzLmNoYW5nZWRIYW5kbGVyfVxyXG4gICAgICA+PC94LWl0ZW1zLWdyYXBoPlxyXG4gICAgICA8eC1pdGVtcy10YWJsZVxyXG4gICAgICAgIC5pdGVtcz0ke3RoaXMuaXRlbXN9XHJcbiAgICAgICAgLmNvbm5lY3Rpb25zPSR7dGhpcy5jb25uZWN0aW9uc31cclxuICAgICAgICBoaWRkZW5cclxuICAgICAgPjwveC1pdGVtcy10YWJsZT5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuc3RhdENvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5jb25zb2xlLXN0YXRzJyk7XHJcbiAgICB0aGlzLnRhYmxlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLXRhYmxlJyk7XHJcbiAgICB0aGlzLmdyYXBoID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLWdyYXBoJyk7XHJcbiAgfVxyXG5cclxuICBjaGFuZ2VkSGFuZGxlcigpIHtcclxuICAgIHRoaXMudGFibGUucmVxdWVzdFVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgdG9nZ2xlVmlldygpIHtcclxuICAgIHRoaXMudGFibGUudG9nZ2xlQXR0cmlidXRlKCdoaWRkZW4nKTtcclxuICAgIHRoaXMuZ3JhcGgudG9nZ2xlQXR0cmlidXRlKCdoaWRkZW4nKTtcclxuICB9XHJcblxyXG4gIG5ld0dyYXBoKCkge1xyXG4gICAgaWYgKHRoaXMucmVuZXdDb25maXJtZWQpIHtcclxuICAgICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgICAgdGhpcy5jb25uZWN0aW9ucyA9IG5ldyBNYXAoKTtcclxuICAgICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoKTtcclxuICAgICAgdGhpcy5yZW5ld0NvbmZpcm1lZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoJ0FSRSBZT1UgU1VSRT8gUHJlc3MgYWdhaW4gdG8gY2xlYXIgb2xkIGdyYXBoJyk7XHJcbiAgICAgIHRoaXMucmVuZXdDb25maXJtZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljaygpIHtcclxuICAgIHN1cGVyLmhhbmRsZUNsaWNrKC4uLmFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXNldCgpIHtcclxuICAgIHRoaXMuaXRlbXMuZm9yRWFjaChpdGVtID0+IGl0ZW0ubWFyayA9IGZhbHNlKTtcclxuICAgIHRoaXMuc3RhdENvbnNvbGUuc2V0TWVzc2FnZSgpO1xyXG4gICAgdGhpcy5tYXJrRWRnZXMgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGFydFNlYXJjaCgpIHtcclxuICAgIGxldCBzdGFydEl0ZW07XHJcbiAgICB0aGlzLmNsaWNrRm4gPSBpdGVtID0+IHtcclxuICAgICAgc3RhcnRJdGVtID0gaXRlbTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9O1xyXG4gICAgeWllbGQgJ1NpbmdsZS1jbGljayBvbiB2ZXJ0ZXggZnJvbSB3aGljaCB0byBzdGFydCc7XHJcbiAgICB0aGlzLmNsaWNrRm4gPSBudWxsO1xyXG4gICAgaWYgKHN0YXJ0SXRlbSA9PSBudWxsKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IEl0ZW1cXCdzIG5vdCBjbGlja2VkLic7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgWW91IGNsaWNrZWQgb24gJHtzdGFydEl0ZW0udmFsdWV9YDtcclxuICAgIHJldHVybiBzdGFydEl0ZW07XHJcbiAgfVxyXG5cclxuICAvL0RlcHRoLWZpcnN0IHNlYXJjaFxyXG4gICogaXRlcmF0b3JERlMoaXNUcmVlKSB7XHJcbiAgICBjb25zdCBzdGFydEl0ZW0gPSB5aWVsZCogdGhpcy5pdGVyYXRvclN0YXJ0U2VhcmNoKCk7XHJcbiAgICBpZiAoc3RhcnRJdGVtID09IG51bGwpIHJldHVybjtcclxuICAgIGNvbnN0IHZpc2l0cyA9IFtzdGFydEl0ZW1dO1xyXG4gICAgY29uc3Qgc3RhY2sgPSBbc3RhcnRJdGVtXTtcclxuICAgIHN0YXJ0SXRlbS5tYXJrID0gdHJ1ZTtcclxuICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBzdGFjayk7XHJcbiAgICB5aWVsZCBgU3RhcnQgc2VhcmNoIGZyb20gdmVydGV4ICR7c3RhcnRJdGVtLnZhbHVlfWA7XHJcblxyXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc3QgaXRlbSA9IHRoaXMuZ2V0QWRqVW52aXNpdGVkVmVydGV4KHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdKTtcclxuICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xyXG4gICAgICAgIHN0YWNrLnBvcCgpO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBzdGFjayk7XHJcbiAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHlpZWxkIGBXaWxsIGNoZWNrIHZlcnRpY2VzIGFkamFjZW50IHRvICR7c3RhY2tbc3RhY2subGVuZ3RoIC0gMV0udmFsdWV9YDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgeWllbGQgJ05vIG1vcmUgdmVydGljZXMgd2l0aCB1bnZpc2l0ZWQgbmVpZ2hib3JzJztcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA+IDAgJiYgaXNUcmVlID09PSB0cnVlKSB7XHJcbiAgICAgICAgICB0aGlzLnRyZWUuZ2V0KHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdKS5hZGQoaXRlbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YWNrLnB1c2goaXRlbSk7XHJcbiAgICAgICAgdmlzaXRzLnB1c2goaXRlbSk7XHJcbiAgICAgICAgaXRlbS5tYXJrID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnNldFN0YXRzKHZpc2l0cywgc3RhY2spO1xyXG4gICAgICAgIHlpZWxkIGBWaXNpdGVkIHZlcnRleCAke2l0ZW0udmFsdWV9YDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGlzVHJlZSAhPT0gdHJ1ZSkge1xyXG4gICAgICB5aWVsZCAnUHJlc3MgYWdhaW4gdG8gcmVzZXQgc2VhcmNoJztcclxuICAgICAgdGhpcy5yZXNldCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0QWRqVW52aXNpdGVkVmVydGV4KGl0ZW0pIHtcclxuICAgIGNvbnN0IGNvbm5lY3RlZEl0ZW1zID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoaXRlbSk7XHJcbiAgICBsZXQgZm91bmQgPSBudWxsO1xyXG4gICAgaWYgKGNvbm5lY3RlZEl0ZW1zLnNpemUgPiAwKSB7XHJcbiAgICAgIGZvdW5kID0gdGhpcy5pdGVtcy5maW5kKGl0ZW0gPT4ge1xyXG4gICAgICAgIHJldHVybiBjb25uZWN0ZWRJdGVtcy5oYXMoaXRlbSkgJiYgIWl0ZW0ubWFyaztcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm91bmQ7XHJcbiAgfVxyXG5cclxuICBzZXRTdGF0cyh2aXNpdHMsIHN0YWNrLCBxdWV1ZSkge1xyXG4gICAgaWYgKHN0YWNrKVxyXG4gICAgICB0aGlzLnN0YXRDb25zb2xlLnNldE1lc3NhZ2UoYFZpc2l0czogJHt2aXNpdHMubWFwKGkgPT4gaS52YWx1ZSkuam9pbignICcpfS4gU3RhY2s6IChiLT50KTogJHtzdGFjay5tYXAoaSA9PiBpLnZhbHVlKS5qb2luKCcgJyl9YCk7XHJcbiAgICBpZiAocXVldWUpXHJcbiAgICAgIHRoaXMuc3RhdENvbnNvbGUuc2V0TWVzc2FnZShgVmlzaXRzOiAke3Zpc2l0cy5tYXAoaSA9PiBpLnZhbHVlKS5qb2luKCcgJyl9LiBRdWV1ZTogKGYtPnIpOiAke3F1ZXVlLm1hcChpID0+IGkudmFsdWUpLmpvaW4oJyAnKX1gKTtcclxuICB9XHJcblxyXG4gIC8vQnJlYWR0aC1maXJzdCBzZWFyY2hcclxuICAqIGl0ZXJhdG9yQkZTKCkge1xyXG4gICAgY29uc3Qgc3RhcnRJdGVtID0geWllbGQqIHRoaXMuaXRlcmF0b3JTdGFydFNlYXJjaCgpO1xyXG4gICAgaWYgKHN0YXJ0SXRlbSA9PSBudWxsKSByZXR1cm47XHJcbiAgICBjb25zdCB2aXNpdHMgPSBbc3RhcnRJdGVtXTtcclxuICAgIGNvbnN0IHF1ZXVlID0gW3N0YXJ0SXRlbV07XHJcbiAgICBzdGFydEl0ZW0ubWFyayA9IHRydWU7XHJcbiAgICB0aGlzLnNldFN0YXRzKHZpc2l0cywgbnVsbCwgcXVldWUpO1xyXG4gICAgeWllbGQgYFN0YXJ0IHNlYXJjaCBmcm9tIHZlcnRleCAke3N0YXJ0SXRlbS52YWx1ZX1gO1xyXG5cclxuICAgIGxldCBjdXJyZW50SXRlbSA9IHF1ZXVlLnNoaWZ0KCk7XHJcbiAgICB0aGlzLnNldFN0YXRzKHZpc2l0cywgbnVsbCwgcXVldWUpO1xyXG4gICAgeWllbGQgYFdpbGwgY2hlY2sgdmVydGljZXMgYWRqYWNlbnQgdG8gJHtzdGFydEl0ZW0udmFsdWV9YDtcclxuXHJcbiAgICB3aGlsZSAoY3VycmVudEl0ZW0gIT0gbnVsbCkge1xyXG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5nZXRBZGpVbnZpc2l0ZWRWZXJ0ZXgoY3VycmVudEl0ZW0pO1xyXG4gICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XHJcbiAgICAgICAgeWllbGQgYE5vIG1vcmUgdW52aXNpdGVkIHZlcnRpY2VzIGFkamFjZW50IHRvICR7Y3VycmVudEl0ZW0udmFsdWV9YDtcclxuICAgICAgICBjdXJyZW50SXRlbSA9IHF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRJdGVtICE9IG51bGwpIHtcclxuICAgICAgICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBudWxsLCBxdWV1ZSk7XHJcbiAgICAgICAgICB5aWVsZCBgV2lsbCBjaGVjayB2ZXJ0aWNlcyBhZGphY2VudCB0byAke2N1cnJlbnRJdGVtLnZhbHVlfWA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXVlLnB1c2goaXRlbSk7XHJcbiAgICAgICAgdmlzaXRzLnB1c2goaXRlbSk7XHJcbiAgICAgICAgaXRlbS5tYXJrID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnNldFN0YXRzKHZpc2l0cywgbnVsbCwgcXVldWUpO1xyXG4gICAgICAgIHlpZWxkIGBWaXNpdGVkIHZlcnRleCAke2l0ZW0udmFsdWV9YDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgeWllbGQgJ1ByZXNzIGFnYWluIHRvIHJlc2V0IHNlYXJjaCc7XHJcbiAgICB0aGlzLnJlc2V0KCk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yVHJlZSgpIHtcclxuICAgIHRoaXMuaXRlbXMuZm9yRWFjaChpdGVtID0+IHRoaXMudHJlZS5zZXQoaXRlbSwgbmV3IFNldCgpKSk7XHJcbiAgICB5aWVsZCogdGhpcy5pdGVyYXRvckRGUyh0cnVlKTtcclxuICAgIHlpZWxkICdQcmVzcyBhZ2FpbiB0byBoaWRlIHVubWFya2VkIGVkZ2VzJztcclxuICAgIGNvbnN0IGNvbm5lY3Rpb25zID0gdGhpcy5jb25uZWN0aW9ucztcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICB5aWVsZCAnTWluaW11bSBzcGFubmluZyB0cmVlOyBQcmVzcyBhZ2FpbiB0byByZXNldCB0cmVlJztcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBjb25uZWN0aW9ucztcclxuICAgIHRoaXMudHJlZSA9IG5ldyBNYXAoKTtcclxuICAgIHRoaXMucmVzZXQoKTtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1ncmFwaC1uJywgUGFnZUdyYXBoTik7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEZvb3RlciBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8cCBjbGFzcz1cImNyZWRpdHNcIj5UaGVzZSBhcmUgdGhlIGFwcGxldHMgdGhhdCBhY2NvbXBhbnkgeW91ciB0ZXh0IGJvb2sgPHN0cm9uZz5cIkRhdGEgU3RydWN0dXJlcyBhbmQgQWxnb3JpdGhtcyBpbiBKYXZhXCI8L3N0cm9uZz4sIFNlY29uZCBFZGl0aW9uLiBSb2JlcnQgTGFmb3JlLCAyMDAyPC9wPlxyXG4gICAgICA8cCBjbGFzcz1cImNyZWRpdHNcIj5UaGUgYXBwbGV0cyBhcmUgbGl0dGxlIGRlbW9uc3RyYXRpb24gcHJvZ3JhbXMgdGhhdCBjbGFyaWZ5IHRoZSB0b3BpY3MgaW4gdGhlIGJvb2suIDxicj5cclxuICAgICAgRm9yIGV4YW1wbGUsIHRvIGRlbW9uc3RyYXRlIHNvcnRpbmcgYWxnb3JpdGhtcywgYSBiYXIgY2hhcnQgaXMgZGlzcGxheWVkIGFuZCwgZWFjaCB0aW1lIHRoZSB1c2VyIHB1c2hlcyBhIGJ1dHRvbiBvbiB0aGUgYXBwbGV0LCBhbm90aGVyIHN0ZXAgb2YgdGhlIGFsZ29yaXRobSBpcyBjYXJyaWVkIG91dC4gT25lciBjYW4gc2VlIGhvdyB0aGUgYmFycyBtb3ZlLCBhbmQgYW5ub3RhdGlvbnMgd2l0aGluIHRoZSBhcHBsZXQgZXhwbGFpbiB3aGF0J3MgZ29pbmcgb24uPC9wPlxyXG4gICAgICA8cCBjbGFzcz1cImNyZWRpdHMtbXlcIj5CdWlsdCBieSBTdGFuaXNsYXYgUHJvc2hraW4gd2l0aCDinaQgYW5kIFdlYkNvbXBvbmVudHM8L3A+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUmVuZGVyUm9vdCgpIHtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWZvb3RlcicsIFhGb290ZXIpOyIsImltcG9ydCAnLi9jb21wb25lbnRzL2l0ZW1zR3JhcGgnO1xyXG5pbXBvcnQgJy4vY29tcG9uZW50cy9pdGVtc1RhYmxlJztcclxuaW1wb3J0ICcuL2NvbXBvbmVudHMvaXRlbXNUcmVlJztcclxuaW1wb3J0ICcuL2NvbXBvbmVudHMvaXRlbXNWZXJ0aWNhbCc7XHJcbmltcG9ydCAnLi9jb21wb25lbnRzL2l0ZW1zSG9yaXpvbnRhbCc7XHJcbmltcG9ydCAnLi9jb21wb25lbnRzL2l0ZW1zSG9yaXpvbnRhbExpbmtlZCc7XHJcbmltcG9ydCAnLi9jb21wb25lbnRzL3JvdXRlcic7XHJcbmltcG9ydCAnLi9jb21wb25lbnRzL3JvdXRlckEnO1xyXG5pbXBvcnQgJy4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuL2NvbXBvbmVudHMvZGlhbG9nJztcclxuaW1wb3J0ICcuL2NvbXBvbmVudHMvYnV0dG9uJztcclxuXHJcbmltcG9ydCAnLi9jb250YWluZXJzL2FwcCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VBcnJheSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VPcmRlcmVkQXJyYXknO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlQnViYmxlU29ydCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VTZWxlY3RTb3J0JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUluc2VydGlvblNvcnQnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlU3RhY2snO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlUXVldWUnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlUHJpb3JpdHlRdWV1ZSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VMaW5rTGlzdCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VNZXJnZVNvcnQnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlU2hlbGxTb3J0JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVBhcnRpdGlvbic7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VRdWlja1NvcnQxJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVF1aWNrU29ydDInO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlQmluYXJ5VHJlZSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VSZWRCbGFja1RyZWUnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlSGFzaFRhYmxlJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUhhc2hDaGFpbic7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VIZWFwJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUdyYXBoTic7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL2Zvb3Rlcic7XHJcblxyXG4vL1RPRE86IG1vdmUgY29kZSBmcm9tIGFwcCBoZXJlIGFuZCBpbXBvcnRzIHNwcmVhZCB0byBhbGwgZmlsZXMsIHdoZXJlIHVzaW5nIHNvbWUgY29tcG9uZW50LCBzaG91bGQgYmUgZXhhY3QgaW1wb3J0Il0sIm5hbWVzIjpbImRpcmVjdGl2ZSIsInJlbmRlciIsImxpdFJlbmRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7QUFhQSxNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc0JqQyxBQUFPLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUs7SUFDMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDckIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEIsT0FBTyxDQUFDLENBQUM7Q0FDWixDQUFDLENBQUM7QUFDSCxBQUFPLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLO0lBQzlCLE9BQU8sT0FBTyxDQUFDLEtBQUssVUFBVSxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDdkQ7O0FDMUNEOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBLEFBQU8sTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLGNBQWMsS0FBSyxTQUFTO0lBQzNELE1BQU0sQ0FBQyxjQUFjLENBQUMseUJBQXlCO1FBQzNDLFNBQVMsQ0FBQzs7Ozs7OztBQU9sQixBQUFPLE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEdBQUcsSUFBSSxFQUFFLE1BQU0s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LEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7TUFDN0MsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztNQUN0QixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUNqRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUMvQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO01BQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNDO0lBQ0QsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsT0FBTyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtNQUM1QixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7TUFDckMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1FBQzVFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7T0FDeEM7TUFDRCxRQUFRLFNBQVMsQ0FBQyxJQUFJO1FBQ3BCLEtBQUssTUFBTSxFQUFFO1VBQ1gsTUFBTSxzQkFBc0IsQ0FBQztVQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFD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