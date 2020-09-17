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

class XView extends LitElement {
  static get properties() {
    return {
      component: {type: String}
    };
  }

  render() {
    let template = (this.component != null && this.component !== '') ? `<${this.component}></${this.component}>` : '';
    return html`${unsafeHTML(template)}`;
  }

  createRenderRoot() {
    return this;
  }
}

customElements.define('x-view', XView);

class PageStart extends LitElement {
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

class Marker {
  constructor({position, text, color = 'red', size = 1}) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.text = text;
  }
}

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
      <button type="button" title="" @click=${this.handleClick} ?disabled=${this.disabled}>
        <slot class=${this.activated ? 'hidden' : ''}></slot>      
        <span class=${this.activated ? '' : 'hidden'}>Next</span>
      </button>
    `;
  }

  createRenderRoot() {
    return this.attachShadow({mode: 'open', delegatesFocus: true});
  }

  updated() {
    this.classList.toggle('activated', this.activated);
  }

  handleClick() {
    this.callback(this);
  }
}

XButton.styles = css`
  .hidden {
    display: none;
  }
  button {
    height: 1.6em;
    border-radius: 4px;
    border: 1px solid gray;
    background: whitesmoke;
  }
`;

customElements.define('x-button', XButton);

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

class XInfo extends LitElement {
  render() {
    return html`
      <button type="button" title="" @click=${() => this.info.classList.toggle('show')}>?</button>
      <div>
        <slot></slot>
      </div>
    `;
  }

  firstUpdated() {
    this.info = this.shadowRoot.querySelector('div');
  }
}

XInfo.styles = css`
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
`;

customElements.define('x-info', XInfo);

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

class PageArray extends PageBase {
  constructor() {
    super();
    this.title = 'Array';
    this.info = html`
      <p><b>New</b> creates array with N cells (60 max)</p>
      <p><b>Fill</b> inserts N items into array</p>
      <p><b>Ins</b> inserts new item with value N</p>
      <p><b>Find</b> finds item(s) with value N</p>
      <p><b>Del</b> deletes item(s) with value N</p>
    `;
    this.items = [];
    this.markers = [];
    this.length = 0;
    this.initItems();
    this.initMarkers();
  }

  render() {
    return html`
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        ${this.renderAdditionalControl()}
        <x-info>${this.info}</x-info>
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
    this.info = html`
      <p><b>New</b> creates array with N cells (60 max)</p>
      <p><b>Fill</b> inserts N items into array</p>
      <p><b>Ins</b> inserts new item with value N</p>
      <p><b>Find</b> finds item with value N</p>
      <p><b>Del</b> deletes item with value N</p>
    `;
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
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorSize)}>Size</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRun)}>Run</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorStep)}>Step</x-button>
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
      <h1>Stack</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPush)}>Push</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPop)}>Pop</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
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
  constructor() {
    super();
    this.title = 'Queue';
    this.info = html`
      <p><b>New</b> creates new queue</p> 
      <p><b>Ins</b> inserts item with value N at rear of queue</p> 
      <p><b>Rem</b> removes item from front of queue, returns value</p> 
      <p><b>Peek</b> returns value of item at front of queue</p> 
    `;
  }

  render() {
    return html`
      <h1>${this.title}</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPeek)}>Peek</x-button>
        <x-info>${this.info}</x-info>
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
  constructor() {
    super();
    this.title = 'Priority Queue';
    this.info = html`
      <p><b>New</b> creates new empty priority queue</p> 
      <p><b>Ins</b> inserts item with value N</p>
      <p><b>Rem</b> removes item from front of queue, returns value</p> 
      <p><b>Peek</b> returns value of item at front of queue</p>
    `;
  }

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

class PageLinkList extends PageBase {
  constructor() {
    super();
    this.initItems(13);
    this.initMarkers();
  }

  render() {
    return html`
      <h1>Link List</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
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

class PageBinaryTree extends PageBase {
  constructor() {
    super();
    this.initItems(29);
    this.initMarker();
  }

  render() {
    return html`
      <h1>Binary Tree</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTrav)}>Trav</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
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
      <h1>Red-Black Tree</h1>
      <div class="controlpanel">
        <x-button .callback=${this.init.bind(this)}>Start</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFlip)}>Flip</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRoL)}>RoL</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRoR)}>RoR</x-button>
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
      <h1>Hash Table (linear/quad/double)</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
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
      <h1>Hash Table Chain</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorNew)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFind)}>Find</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorDel)}>Del</x-button>
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
      <h1>Heap</h1>
      <div class="controlpanel">
        <x-button .callback=${this.handleClick.bind(this, this.iteratorFill)}>Fill</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorChng)}>Chng</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorRem)}>Rem</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorIns)}>Ins</x-button>
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

class Vertex extends Item {
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
      connections: {type: Array},
      markedConnections: {type: Array},
      clickFn: {type: Function},
      directed: {type: Boolean},
      weighted: {type: Boolean}
    };
  }

  getNoConnectionValue() {
    return this.weighted ? Infinity : 0;
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
          <line class="line" x1="${this.dragOpts.dragItem.x}" y1="${this.dragOpts.dragItem.y}" x2="${this.dragOpts.x}" y2="${this.dragOpts.y}"></line>
        ` : ''}
        ${this.drawConnections(false)}
        ${this.drawConnections(true)}
        ${this.drawItems()}
      </svg>
      ${html`
        <x-dialog>
          <label>Weight (0—99): <input name="number" type="number" min="0" max="99" step="1"></label>
        </x-dialog>`}
      `;
  }

  firstUpdated() {
    this.dialog = this.shadowRoot.querySelector('x-dialog');
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

  drawConnections(isMarked) {
    const lines = [];
    const connections = isMarked ? this.markedConnections : this.connections;
    if (!connections) return;
    connections.forEach((row, i) => {
      row.forEach((val, j) => {
        if (val !== this.getNoConnectionValue()) {
          lines.push(svg`
            <line
              class="line ${isMarked ? 'marked' : ''}"
              x1="${this.items[i].x}"
              y1="${this.items[i].y}"
              x2="${this.items[j].x}"
              y2="${this.items[j].y}"
            ></line>
            ${this.directed ? this.drawDirectionMarker(this.items[i], this.items[j]) : ''}
            ${this.weighted ? this.drawWeightMarker(this.items[i], this.items[j], val) : ''}
          `);
        }
      });
    });
    return lines;
  }

  drawDirectionMarker(p1, p2) {
    const step = 20;
    const px = p1.x - p2.x;
    const py = p1.y - p2.y;
    let angle = - Math.atan(py / px) - Math.PI * (px >= 0 ? 1.5 : 0.5);
    const x = p2.x + step * Math.sin(angle);
    const y = p2.y + step * Math.cos(angle);
    return svg`
      <circle class="directionMarker" cx="${x}" cy="${y}" r="3"></circle>
    `;
  }

  drawWeightMarker(p1, p2, w) {
    const x = (p1.x + p2.x) / 2;
    const y =  (p1.y + p2.y) / 2;
    return svg`
      <rect class="weightRect" x="${x - 9}" y="${y - 9}" width="18" height="18"/>
      <text class="weightText" x="${x}" y="${y + 1}" text-anchor="middle" alignment-baseline="middle">${w}</text>
    `;
  }

  dblclickHandler(e) {
    if (this.dragOpts != null || this.limit === this.items.length) return;
    const index = this.items.length;
    const item = new Vertex({
      index,
      x: e.offsetX,
      y: e.offsetY
    });
    item.setValue(String.fromCharCode(65 + index));
    this.items.push(item);

    this.connections.push(new Array(this.connections.length).fill(this.getNoConnectionValue()));
    this.connections.forEach(c => c.push(this.getNoConnectionValue()));

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
      if (this.weighted) {
        this.dialog.open().then(formData => {
          this.createConnection(dragItem, item, Number(formData.get('number')));
          this.requestUpdate();
        }, () => this.requestUpdate());
      } else {
        this.createConnection(dragItem, item);
      }
    }
    this.dragOpts = null;
    this.requestUpdate();
  }

  createConnection(item1, item2, weight = 1) {
    this.connections[item1.index][item2.index] = weight;
    if (!this.directed) {
      this.connections[item2.index][item1.index] = weight;
    }
    this.dispatchEvent(new Event('changed'));
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
`;

customElements.define('x-items-graph', XItemsGraph);

class XItemsTable extends LitElement {
  static get properties() {
    return {
      items: {type: Array},
      connections: {type: Array}
    };
  }

  render() {
    return html`
      <table>
        ${this.renderHeader()}
        ${this.items.map(item => this.renderRow(item.value, this.connections[item.index]))}
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
    if (this.connections.length > 0) {
      return html`
        <tr>
          <td>${value}</td>
          ${this.items.map(item => {
            const weight = connections[item.index].toString().slice(0,3);
            return html`<td>${weight}</td>`;
          })}
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
      text-align: center;
  }
  tr td:first-child,
  tr th:first-child {
    border-right: 1px solid black;
    font-family: sans-serif;
    font-weight: bold;
  }
`;

customElements.define('x-items-table', XItemsTable);

class PageGraphN extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.markedConnections = [];
    this.connections = [];
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
        <x-button .callback=${this.handleClick.bind(this, this.iteratorMST)}>Tree</x-button>
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
      this.connections = [];
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
      yield 'ERROR: Item\'s not clicked.';
      return;
    }
    yield `You clicked on ${startItem.value}`;
    return startItem;
  }

  //DFS - Depth-first search
  * iteratorDFS(isTree) {
    const startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    const visits = [startItem];
    const stack = [startItem];
    startItem.mark = true;
    this.setStats(visits, stack);
    yield `Start search from vertex ${startItem.value}`;

    while (stack.length > 0) {
      const prevItem = stack[stack.length - 1];
      const item = this.getAdjUnvisitedVertex(prevItem);
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
          this.markedConnections[prevItem.index][item.index] = 1;
          this.markedConnections[item.index][prevItem.index] = 1;
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
    const connectedItems = this.connections[item.index];
    let found = null;
    if (connectedItems.length > 0) {
      found = this.items.find(item => {
        return !item.mark && connectedItems[item.index] === 1;
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

  //BFS - Breadth-first search
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

  //MST - Minimum Spanning Tree
  * iteratorMST() {
    this.markedConnections = this.connections.map(() => new Array(this.connections.length).fill(this.graph.getNoConnectionValue()));
    yield* this.iteratorDFS(true);
    yield 'Press again to hide unmarked edges';
    const connections = this.connections;
    this.connections = this.markedConnections;
    this.markedConnections = [];
    yield 'Minimum spanning tree; Press again to reset tree';
    this.connections = connections;
    this.reset();
  }
}

customElements.define('page-graph-n', PageGraphN);

class PageGraphD extends PageBase {
  constructor() {
    super();
    this.initItems();
    this.connections = [];
    this.renewConfirmed = false;
    this.clickFn = null;
  }
  render() {
    return html`
      <h1>Directed Non-Weighted Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorTopo)}>Topo</x-button>
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
      this.connections = [];
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

  //topological sort
  * iteratorTopo() {
    yield 'Will perform topological sort';
    const connectionsCache = this.connections.map(row => [...row]);
    const itemsCache = this.items.map(item => new Vertex(item));
    const result = [];
    for (let i = 0; i < connectionsCache.length; i++) {
      const curItem = this.getNoSuccessorVertex();
      if (!curItem) {
        yield 'ERROR: Cannot sort graph with cycles';
        this.connections = connectionsCache;
        this.items = itemsCache;
        this.statConsole.setMessage();
        return;
      }
      yield `Will remove vertex ${curItem.value}`;
      result.push(curItem.value);
      this.statConsole.setMessage(`List: ${result.join(' ')}`);

      //remove item (vertex) and its connections
      this.connections.splice(curItem.index, 1);
      this.connections.forEach(row => row.splice(curItem.index, 1));
      this.items.splice(curItem.index, 1);
      this.items.forEach((item, i) => item.index = i);

      yield `Added vertex ${curItem.value} at start of sorted list`;
    }
    yield 'Sort is complete. Will restore graph';
    this.connections = connectionsCache;
    this.items = itemsCache;
    yield 'Will reset sort';
    this.statConsole.setMessage();
  }

  getNoSuccessorVertex() {
    const index = this.connections.findIndex(row => row.reduce((acc, i) => acc + i) === 0);
    return index != null ? this.items[index] : false;
  }
}

customElements.define('page-graph-d', PageGraphD);

class Edge {
  constructor({src, dest, weight}) {
    this.src = src;
    this.dest = dest;
    this.weight = weight;
  }
  get title() {
    return `${this.src.value}${this.dest.value}(${this.weight.toString().slice(0, 3)})`;
  }
}

class PageGraphW extends PageGraphN {

  render() {
    return html`
      <h1>Weighted, Undirected Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorMST)}>Tree</x-button>
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
    `;
  }

  setStats(tree, pq) {
    this.statConsole.setMessage(`Tree: ${tree.map(i => i.value).join(' ')}. PQ: ${pq.map(i => i.title).join(' ')}`);
  }

  //minimal spanning tree (MST)
  * iteratorDFS() {
    let currentItem = yield* this.iteratorStartSearch();
    yield `Starting tree from vertex ${currentItem.value}`;
    if (currentItem == null) return;
    const tree = [];
    const pq = [];
    let countItems = 0;
    while(true) {
      tree.push(currentItem);
      this.setStats(tree, pq);
      currentItem.mark = true;
      currentItem.isInTree = true;
      countItems++;
      yield `Placed vertex ${currentItem.value} in tree`;

      if (countItems === this.items.length) break;

      //insertion in PQ vertices, adjacent current
      this.items.forEach(item => {
        const weight = this.connections[currentItem.index][item.index];
        if (item !== currentItem && !item.isInTree && typeof weight === 'number') {
          this.putInPQ(pq, currentItem, item, weight);
        }
      });

      this.setStats(tree, pq);
      yield `Placed vertices adjacent to ${currentItem.value} in priority queue`;

      if (pq.length === 0) {
        yield 'Graph not connected';
        this.reset();
        return;
      }

      //removing min edge from pq
      const edge = pq.pop();
      currentItem = edge.dest;
      yield `Removed minimum-distance edge ${edge.title} from priority queue`;
      this.markedConnections[edge.src.index][edge.dest.index] = edge.weight;
    }
    this.items.forEach(item => delete item.isInTree);
  }

  putInPQ(pq, currentItem, item, weight) {
    const index = pq.findIndex(edge => edge.dest === item);
    let shouldAdd = false;
    if (index === -1) {
      shouldAdd = true;
    } else if (pq[index].weight > weight) {
      pq.splice(index, 1);
      shouldAdd = true;
    }
    if (shouldAdd) {
      const indexPriority = pq.findIndex(edge => edge.weight < weight);
      pq.splice(indexPriority < 0 ? pq.length : indexPriority, 0, new Edge({src: currentItem, dest: item, weight}));
    }
  }
}

customElements.define('page-graph-w', PageGraphW);

class PageGraphDW extends PageGraphN {

  render() {
    return html`
      <h1>Directed, Weighted Graph</h1>
      <div class="controlpanel">
        <x-button .callback=${this.newGraph.bind(this)}>New</x-button>
        <x-button .callback=${this.handleClick.bind(this, this.iteratorPath)}>Path</x-button>
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
    `;
  }

  setStats(shortestPath) {
    this.statConsole.setMessage(html`
      <table>
        <tr>
          ${shortestPath.map(edge => html`<th class=${edge.dest.isInTree ? 'marked' : ''}>${edge.dest.value}</th>`)}
        </tr>
        <tr>
          ${shortestPath.map(edge => html`<td>${edge.weight.toString().slice(0, 3)}(${edge.src.value})</td>`)}
        </tr>
      </table>
    `);
  }

  * adjustShortestPath(shortestPath, startItem, lastEdge) {
    const lastItem = lastEdge.dest;
    const startToLastWeight = lastEdge.weight;
    let i = 0;
    while (true) {
      if (i >= shortestPath.length) break;
      if (shortestPath[i].dest.isInTree) {
        i++;
        continue;
      }

      const startToCurWeight = shortestPath[i].weight;
      const curItem = shortestPath[i].dest;
      yield `Will compare distances for column ${curItem.value}`;

      const lastToCurWeight = this.connections[lastItem.index][curItem.index];
      const isNeedToReplace = (startToLastWeight + lastToCurWeight) < startToCurWeight;
      yield `To ${curItem.value}: ${startItem.value} to ${lastItem.value} (${startToLastWeight.toString().slice(0, 3)})
        plus edge ${lastItem.value}${curItem.value}(${lastToCurWeight.toString().slice(0, 3)})
        ${isNeedToReplace ? 'less than' : 'greater than or equal to'} ${startItem.value} to ${curItem.value} (${startToCurWeight.toString().slice(0, 3)})`;

      if (isNeedToReplace) {
        shortestPath[i].src = lastItem;
        shortestPath[i].weight = startToLastWeight + lastToCurWeight;
        this.setStats(shortestPath);
        yield `Updated array column ${curItem.value}`;
      } else {
        yield `No need to update array column ${curItem.value}`;
      }

      if (i < shortestPath.length) {
        yield 'Will examine next non-tree column';
        i++;
      } else {
        break;
      }
    }
    yield 'Done all entries in shortest-path array';
  }

  //minimal spanning tree (MST)
  * iteratorPath() {
    let startItem = yield* this.iteratorStartSearch();
    if (startItem == null) return;
    yield `Starting from vertex ${startItem.value}`;

    startItem.mark = true;
    startItem.isInTree = true;
    yield `Added vertex ${startItem.value} to tree`;

    this.markedConnections = this.connections.map(() => new Array(this.connections.length).fill(this.graph.getNoConnectionValue()));

    const shortestPath = this.connections[startItem.index].map((weight, index) => {
      return new Edge({src: startItem, dest: this.items[index], weight});
    });
    this.setStats(shortestPath);
    yield `Copied row ${startItem.value} from adjacency matrix to shortest path array`;

    let counter = 1;
    while(counter < this.items.length) {
      counter++;

      const minPathEdge = shortestPath.reduce((min, cur) => {
        return (min && min.weight < cur.weight || cur.dest.isInTree) ? min : cur;
      });

      if (!minPathEdge || minPathEdge.weight === Infinity) {
        yield 'One or more vertices are UNREACHABLE';
        break;
      }

      yield `Minimum distance from ${startItem.value} is ${minPathEdge.weight}, to vertex ${minPathEdge.dest.value}`;

      minPathEdge.dest.mark = true;
      minPathEdge.dest.isInTree = true;
      this.markedConnections[minPathEdge.src.index][minPathEdge.dest.index] = this.connections[minPathEdge.src.index][minPathEdge.dest.index];
      this.setStats(shortestPath);
      yield `Added vertex ${minPathEdge.dest.value} to tree`;

      yield 'Will adjust values in shortest-path array';
      yield* this.adjustShortestPath(shortestPath, startItem, minPathEdge);

    }
    yield `All shortest paths from ${startItem.value} found. Distances in array`;
    yield 'Press again to reset paths';
    this.items.forEach(item => {
      delete item.isInTree;
      item.mark = false;
    });
    this.markedConnections = [];
    this.statConsole.setMessage();
  }
}

customElements.define('page-graph-dw', PageGraphDW);

let view;
const routes = {
  '#array': 'page-array',
  '#orderedArray': 'page-ordered-array',
  '#bubbleSort': 'page-bubble-sort',
  '#selectSort': 'page-select-sort',
  '#insertionSort': 'page-insertion-sort',
  '#stack': 'page-stack',
  '#queue': 'page-queue',
  '#priorityQueue': 'page-priority-queue',
  '#linkList': 'page-link-list',
  '#mergeSort': 'page-merge-sort',
  '#shellSort': 'page-shell-sort',
  '#partition': 'page-partition',
  '#quickSort1': 'page-quick-sort-1',
  '#quickSort2': 'page-quick-sort-2',
  '#binaryTree': 'page-binary-tree',
  '#redBlackTree': 'page-redblack-tree',
  '#hashTable': 'page-hash-table',
  '#hashChain': 'page-hash-chain',
  '#heap': 'page-heap',
  '#graphN': 'page-graph-n',
  '#graphD': 'page-graph-d',
  '#graphW': 'page-graph-w',
  '#graphDW': 'page-graph-dw'
};

class XApp extends LitElement {
  render() {
    return html`
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
    `;
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    view = this.querySelector('x-view');
    this.loadView();
    window.addEventListener('hashchange', this.loadView, false);
  }
  
  disconnectedCallback() {
    window.removeEventListener('hashchange', this.loadView);
  }

  loadView() {
    const hash = location.hash;
    if (hash !== '') {
      view.component = routes[hash];
      view.scrollIntoView();
    }
  }
}

customElements.define('x-app', XApp);

})));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1odG1sL2xpYi9kaXJlY3RpdmUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvZG9tLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3BhcnQuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUtaW5zdGFuY2UuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvdGVtcGxhdGUtcmVzdWx0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3BhcnRzLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL2RlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3RlbXBsYXRlLWZhY3RvcnkuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvcmVuZGVyLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGl0LWh0bWwuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtaHRtbC9saWIvbW9kaWZ5LXRlbXBsYXRlLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvbGliL3NoYWR5LXJlbmRlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1lbGVtZW50L2xpYi91cGRhdGluZy1lbGVtZW50LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWVsZW1lbnQvbGliL2RlY29yYXRvcnMuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL25vZGVfbW9kdWxlcy9saXQtZWxlbWVudC9saWIvY3NzLXRhZy5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvbm9kZV9tb2R1bGVzL2xpdC1lbGVtZW50L2xpdC1lbGVtZW50LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9ub2RlX21vZHVsZXMvbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtaHRtbC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvdmlldy5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVN0YXJ0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvdXRpbHMuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jbGFzc2VzL2l0ZW0uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jbGFzc2VzL21hcmtlci5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUJhc2UuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2J1dHRvbi5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvY29uc29sZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvZGlhbG9nLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29tcG9uZW50cy9pbmZvLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29tcG9uZW50cy9pdGVtc0hvcml6b250YWwuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VBcnJheS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZU9yZGVyZWRBcnJheS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbXBvbmVudHMvaXRlbXNWZXJ0aWNhbC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUJhc2VTb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlQnViYmxlU29ydC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVNlbGVjdFNvcnQuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VJbnNlcnRpb25Tb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlU3RhY2suanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VRdWV1ZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVByaW9yaXR5UXVldWUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zSG9yaXpvbnRhbExpbmtlZC5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUxpbmtMaXN0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlTWVyZ2VTb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlU2hlbGxTb3J0LmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlUGFydGl0aW9uLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY29udGFpbmVycy9wYWdlUXVpY2tTb3J0MS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZVF1aWNrU29ydDIuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zVHJlZS5qcyIsIkQ6L1Byb2plY3RzL2NvbXB1dGVyLXNjaWVuY2UtdHJhaW5pbmcvY2xpZW50L2NvbnRhaW5lcnMvcGFnZUJpbmFyeVRyZWUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VSZWRCbGFja1RyZWUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VIYXNoVGFibGUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VIYXNoQ2hhaW4uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VIZWFwLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvY2xhc3Nlcy92ZXJ0ZXguanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zR3JhcGguanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb21wb25lbnRzL2l0ZW1zVGFibGUuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VHcmFwaE4uanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VHcmFwaEQuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jbGFzc2VzL2VkZ2UuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VHcmFwaFcuanMiLCJEOi9Qcm9qZWN0cy9jb21wdXRlci1zY2llbmNlLXRyYWluaW5nL2NsaWVudC9jb250YWluZXJzL3BhZ2VHcmFwaERXLmpzIiwiRDovUHJvamVjdHMvY29tcHV0ZXItc2NpZW5jZS10cmFpbmluZy9jbGllbnQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuY29uc3QgZGlyZWN0aXZlcyA9IG5ldyBXZWFrTWFwKCk7XG4vKipcbiAqIEJyYW5kcyBhIGZ1bmN0aW9uIGFzIGEgZGlyZWN0aXZlIHNvIHRoYXQgbGl0LWh0bWwgd2lsbCBjYWxsIHRoZSBmdW5jdGlvblxuICogZHVyaW5nIHRlbXBsYXRlIHJlbmRlcmluZywgcmF0aGVyIHRoYW4gcGFzc2luZyBhcyBhIHZhbHVlLlxuICpcbiAqIEBwYXJhbSBmIFRoZSBkaXJlY3RpdmUgZmFjdG9yeSBmdW5jdGlvbi4gTXVzdCBiZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhXG4gKiBmdW5jdGlvbiBvZiB0aGUgc2lnbmF0dXJlIGAocGFydDogUGFydCkgPT4gdm9pZGAuIFRoZSByZXR1cm5lZCBmdW5jdGlvbiB3aWxsXG4gKiBiZSBjYWxsZWQgd2l0aCB0aGUgcGFydCBvYmplY3RcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYFxuICogaW1wb3J0IHtkaXJlY3RpdmUsIGh0bWx9IGZyb20gJ2xpdC1odG1sJztcbiAqXG4gKiBjb25zdCBpbW11dGFibGUgPSBkaXJlY3RpdmUoKHYpID0+IChwYXJ0KSA9PiB7XG4gKiAgIGlmIChwYXJ0LnZhbHVlICE9PSB2KSB7XG4gKiAgICAgcGFydC5zZXRWYWx1ZSh2KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG5leHBvcnQgY29uc3QgZGlyZWN0aXZlID0gKGYpID0+ICgoLi4uYXJncykgPT4ge1xuICAgIGNvbnN0IGQgPSBmKC4uLmFyZ3MpO1xuICAgIGRpcmVjdGl2ZXMuc2V0KGQsIHRydWUpO1xuICAgIHJldHVybiBkO1xufSk7XG5leHBvcnQgY29uc3QgaXNEaXJlY3RpdmUgPSAobykgPT4ge1xuICAgIHJldHVybiB0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJyAmJiBkaXJlY3RpdmVzLmhhcyhvKTtcbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kaXJlY3RpdmUuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBUcnVlIGlmIHRoZSBjdXN0b20gZWxlbWVudHMgcG9seWZpbGwgaXMgaW4gdXNlLlxuICovXG5leHBvcnQgY29uc3QgaXNDRVBvbHlmaWxsID0gd2luZG93LmN1c3RvbUVsZW1lbnRzICE9PSB1bmRlZmluZWQgJiZcbiAgICB3aW5kb3cuY3VzdG9tRWxlbWVudHMucG9seWZpbGxXcmFwRmx1c2hDYWxsYmFjayAhPT1cbiAgICAgICAgdW5kZWZpbmVkO1xuLyoqXG4gKiBSZXBhcmVudHMgbm9kZXMsIHN0YXJ0aW5nIGZyb20gYHN0YXJ0Tm9kZWAgKGluY2x1c2l2ZSkgdG8gYGVuZE5vZGVgXG4gKiAoZXhjbHVzaXZlKSwgaW50byBhbm90aGVyIGNvbnRhaW5lciAoY291bGQgYmUgdGhlIHNhbWUgY29udGFpbmVyKSwgYmVmb3JlXG4gKiBgYmVmb3JlTm9kZWAuIElmIGBiZWZvcmVOb2RlYCBpcyBudWxsLCBpdCBhcHBlbmRzIHRoZSBub2RlcyB0byB0aGVcbiAqIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGFyZW50Tm9kZXMgPSAoY29udGFpbmVyLCBzdGFydCwgZW5kID0gbnVsbCwgYmVmb3JlID0gbnVsbCkgPT4ge1xuICAgIGxldCBub2RlID0gc3RhcnQ7XG4gICAgd2hpbGUgKG5vZGUgIT09IGVuZCkge1xuICAgICAgICBjb25zdCBuID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShub2RlLCBiZWZvcmUpO1xuICAgICAgICBub2RlID0gbjtcbiAgICB9XG59O1xuLyoqXG4gKiBSZW1vdmVzIG5vZGVzLCBzdGFydGluZyBmcm9tIGBzdGFydE5vZGVgIChpbmNsdXNpdmUpIHRvIGBlbmROb2RlYFxuICogKGV4Y2x1c2l2ZSksIGZyb20gYGNvbnRhaW5lcmAuXG4gKi9cbmV4cG9ydCBjb25zdCByZW1vdmVOb2RlcyA9IChjb250YWluZXIsIHN0YXJ0Tm9kZSwgZW5kTm9kZSA9IG51bGwpID0+IHtcbiAgICBsZXQgbm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICB3aGlsZSAobm9kZSAhPT0gZW5kTm9kZSkge1xuICAgICAgICBjb25zdCBuID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICBub2RlID0gbjtcbiAgICB9XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZG9tLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOCBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IHt9O1xuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyBhIE5vZGVQYXJ0IHRvIGZ1bGx5IGNsZWFyIGl0cyBjb250ZW50LlxuICovXG5leHBvcnQgY29uc3Qgbm90aGluZyA9IHt9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGFydC5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIEFuIGV4cHJlc3Npb24gbWFya2VyIHdpdGggZW1iZWRkZWQgdW5pcXVlIGtleSB0byBhdm9pZCBjb2xsaXNpb24gd2l0aFxuICogcG9zc2libGUgdGV4dCBpbiB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCBtYXJrZXIgPSBge3tsaXQtJHtTdHJpbmcoTWF0aC5yYW5kb20oKSkuc2xpY2UoMil9fX1gO1xuLyoqXG4gKiBBbiBleHByZXNzaW9uIG1hcmtlciB1c2VkIHRleHQtcG9zaXRpb25zLCBtdWx0aS1iaW5kaW5nIGF0dHJpYnV0ZXMsIGFuZFxuICogYXR0cmlidXRlcyB3aXRoIG1hcmt1cC1saWtlIHRleHQgdmFsdWVzLlxuICovXG5leHBvcnQgY29uc3Qgbm9kZU1hcmtlciA9IGA8IS0tJHttYXJrZXJ9LS0+YDtcbmV4cG9ydCBjb25zdCBtYXJrZXJSZWdleCA9IG5ldyBSZWdFeHAoYCR7bWFya2VyfXwke25vZGVNYXJrZXJ9YCk7XG4vKipcbiAqIFN1ZmZpeCBhcHBlbmRlZCB0byBhbGwgYm91bmQgYXR0cmlidXRlIG5hbWVzLlxuICovXG5leHBvcnQgY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuLyoqXG4gKiBBbiB1cGRhdGVhYmxlIFRlbXBsYXRlIHRoYXQgdHJhY2tzIHRoZSBsb2NhdGlvbiBvZiBkeW5hbWljIHBhcnRzLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGUge1xuICAgIGNvbnN0cnVjdG9yKHJlc3VsdCwgZWxlbWVudCkge1xuICAgICAgICB0aGlzLnBhcnRzID0gW107XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIGxldCBpbmRleCA9IC0xO1xuICAgICAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICAgICAgY29uc3Qgbm9kZXNUb1JlbW92ZSA9IFtdO1xuICAgICAgICBjb25zdCBfcHJlcGFyZVRlbXBsYXRlID0gKHRlbXBsYXRlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGVtcGxhdGUuY29udGVudDtcbiAgICAgICAgICAgIC8vIEVkZ2UgbmVlZHMgYWxsIDQgcGFyYW1ldGVycyBwcmVzZW50OyBJRTExIG5lZWRzIDNyZCBwYXJhbWV0ZXIgdG8gYmVcbiAgICAgICAgICAgIC8vIG51bGxcbiAgICAgICAgICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoY29udGVudCwgMTMzIC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfFRFWFR9ICovLCBudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgbGFzdCBpbmRleCBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0LiBXZSB0cnkgdG8gZGVsZXRlXG4gICAgICAgICAgICAvLyB1bm5lY2Vzc2FyeSBub2RlcywgYnV0IHdlIG5ldmVyIHdhbnQgdG8gYXNzb2NpYXRlIHR3byBkaWZmZXJlbnQgcGFydHNcbiAgICAgICAgICAgIC8vIHRvIHRoZSBzYW1lIGluZGV4LiBUaGV5IG11c3QgaGF2ZSBhIGNvbnN0YW50IG5vZGUgYmV0d2Vlbi5cbiAgICAgICAgICAgIGxldCBsYXN0UGFydEluZGV4ID0gMDtcbiAgICAgICAgICAgIHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHdhbGtlci5jdXJyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSAvKiBOb2RlLkVMRU1FTlRfTk9ERSAqLykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9OYW1lZE5vZGVNYXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhdHRyaWJ1dGVzIGFyZSBub3QgZ3VhcmFudGVlZCB0byBiZSByZXR1cm5lZCBpbiBkb2N1bWVudCBvcmRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluIHBhcnRpY3VsYXIsIEVkZ2UvSUUgY2FuIHJldHVybiB0aGVtIG91dCBvZiBvcmRlciwgc28gd2UgY2Fubm90XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc3N1bWUgYSBjb3JyZXNwb25kYW5jZSBiZXR3ZWVuIHBhcnQgaW5kZXggYW5kIGF0dHJpYnV0ZSBpbmRleC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlc1tpXS52YWx1ZS5pbmRleE9mKG1hcmtlcikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChjb3VudC0tID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgbGl0ZXJhbCBzZWN0aW9uIGxlYWRpbmcgdXAgdG8gdGhlIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXhwcmVzc2lvbiBpbiB0aGlzIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0cmluZ0ZvclBhcnQgPSByZXN1bHQuc3RyaW5nc1twYXJ0SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIGF0dHJpYnV0ZSBuYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXguZXhlYyhzdHJpbmdGb3JQYXJ0KVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsbCBib3VuZCBhdHRyaWJ1dGVzIGhhdmUgaGFkIGEgc3VmZml4IGFkZGVkIGluXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVtcGxhdGVSZXN1bHQjZ2V0SFRNTCB0byBvcHQgb3V0IG9mIHNwZWNpYWwgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxpbmcuIFRvIGxvb2sgdXAgdGhlIGF0dHJpYnV0ZSB2YWx1ZSB3ZSBhbHNvIG5lZWQgdG8gYWRkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHN1ZmZpeC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVMb29rdXBOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpICsgYm91bmRBdHRyaWJ1dGVTdWZmaXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlVmFsdWUgPSBub2RlLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGVMb29rdXBOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJpbmdzID0gYXR0cmlidXRlVmFsdWUuc3BsaXQobWFya2VyUmVnZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFydHMucHVzaCh7IHR5cGU6ICdhdHRyaWJ1dGUnLCBpbmRleCwgbmFtZSwgc3RyaW5ncyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGVMb29rdXBOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0SW5kZXggKz0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09ICdURU1QTEFURScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9wcmVwYXJlVGVtcGxhdGUobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMyAvKiBOb2RlLlRFWFRfTk9ERSAqLykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbm9kZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5pbmRleE9mKG1hcmtlcikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5ncyA9IGRhdGEuc3BsaXQobWFya2VyUmVnZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgdGV4dCBub2RlIGZvciBlYWNoIGxpdGVyYWwgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlc2Ugbm9kZXMgYXJlIGFsc28gdXNlZCBhcyB0aGUgbWFya2VycyBmb3Igbm9kZSBwYXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoKHN0cmluZ3NbaV0gPT09ICcnKSA/IGNyZWF0ZU1hcmtlcigpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nc1tpXSksIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFydHMucHVzaCh7IHR5cGU6ICdub2RlJywgaW5kZXg6ICsraW5kZXggfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSdzIG5vIHRleHQsIHdlIG11c3QgaW5zZXJ0IGEgY29tbWVudCB0byBtYXJrIG91ciBwbGFjZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVsc2UsIHdlIGNhbiB0cnVzdCBpdCB3aWxsIHN0aWNrIGFyb3VuZCBhZnRlciBjbG9uaW5nLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0cmluZ3NbbGFzdEluZGV4XSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCBub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1RvUmVtb3ZlLnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmRhdGEgPSBzdHJpbmdzW2xhc3RJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIGEgcGFydCBmb3IgZWFjaCBtYXRjaCBmb3VuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydEluZGV4ICs9IGxhc3RJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4IC8qIE5vZGUuQ09NTUVOVF9OT0RFICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmRhdGEgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGEgbmV3IG1hcmtlciBub2RlIHRvIGJlIHRoZSBzdGFydE5vZGUgb2YgdGhlIFBhcnQgaWYgYW55IG9mXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgZm9sbG93aW5nIGFyZSB0cnVlOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICogV2UgZG9uJ3QgaGF2ZSBhIHByZXZpb3VzU2libGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICogVGhlIHByZXZpb3VzU2libGluZyBpcyBhbHJlYWR5IHRoZSBzdGFydCBvZiBhIHByZXZpb3VzIHBhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnByZXZpb3VzU2libGluZyA9PT0gbnVsbCB8fCBpbmRleCA9PT0gbGFzdFBhcnRJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0UGFydEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcnRzLnB1c2goeyB0eXBlOiAnbm9kZScsIGluZGV4IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhIG5leHRTaWJsaW5nLCBrZWVwIHRoaXMgbm9kZSBzbyB3ZSBoYXZlIGFuIGVuZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVsc2UsIHdlIGNhbiByZW1vdmUgaXQgdG8gc2F2ZSBmdXR1cmUgY29zdHMuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5uZXh0U2libGluZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuZGF0YSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNUb1JlbW92ZS5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4LS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0SW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGkgPSBub2RlLmRhdGEuaW5kZXhPZihtYXJrZXIsIGkgKyAxKSkgIT09XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21tZW50IG5vZGUgaGFzIGEgYmluZGluZyBtYXJrZXIgaW5zaWRlLCBtYWtlIGFuIGluYWN0aXZlIHBhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGNvbnNpZGVyIHdoZXRoZXIgaXQncyBldmVuIHdvcnRoIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBiaW5kaW5ncyBpbiBjb21tZW50cyB3b3JrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHsgdHlwZTogJ25vZGUnLCBpbmRleDogLTEgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIF9wcmVwYXJlVGVtcGxhdGUoZWxlbWVudCk7XG4gICAgICAgIC8vIFJlbW92ZSB0ZXh0IGJpbmRpbmcgbm9kZXMgYWZ0ZXIgdGhlIHdhbGsgdG8gbm90IGRpc3R1cmIgdGhlIFRyZWVXYWxrZXJcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5vZGVzVG9SZW1vdmUpIHtcbiAgICAgICAgICAgIG4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydCBjb25zdCBpc1RlbXBsYXRlUGFydEFjdGl2ZSA9IChwYXJ0KSA9PiBwYXJ0LmluZGV4ICE9PSAtMTtcbi8vIEFsbG93cyBgZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJylgIHRvIGJlIHJlbmFtZWQgZm9yIGFcbi8vIHNtYWxsIG1hbnVhbCBzaXplLXNhdmluZ3MuXG5leHBvcnQgY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG4vKipcbiAqIFRoaXMgcmVnZXggZXh0cmFjdHMgdGhlIGF0dHJpYnV0ZSBuYW1lIHByZWNlZGluZyBhbiBhdHRyaWJ1dGUtcG9zaXRpb25cbiAqIGV4cHJlc3Npb24uIEl0IGRvZXMgdGhpcyBieSBtYXRjaGluZyB0aGUgc3ludGF4IGFsbG93ZWQgZm9yIGF0dHJpYnV0ZXNcbiAqIGFnYWluc3QgdGhlIHN0cmluZyBsaXRlcmFsIGRpcmVjdGx5IHByZWNlZGluZyB0aGUgZXhwcmVzc2lvbiwgYXNzdW1pbmcgdGhhdFxuICogdGhlIGV4cHJlc3Npb24gaXMgaW4gYW4gYXR0cmlidXRlLXZhbHVlIHBvc2l0aW9uLlxuICpcbiAqIFNlZSBhdHRyaWJ1dGVzIGluIHRoZSBIVE1MIHNwZWM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjYXR0cmlidXRlcy0wXG4gKlxuICogXCJcXDAtXFx4MUZcXHg3Ri1cXHg5RlwiIGFyZSBVbmljb2RlIGNvbnRyb2wgY2hhcmFjdGVyc1xuICpcbiAqIFwiIFxceDA5XFx4MGFcXHgwY1xceDBkXCIgYXJlIEhUTUwgc3BhY2UgY2hhcmFjdGVyczpcbiAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9pbmZyYXN0cnVjdHVyZS5odG1sI3NwYWNlLWNoYXJhY3RlclxuICpcbiAqIFNvIGFuIGF0dHJpYnV0ZSBpczpcbiAqICAqIFRoZSBuYW1lOiBhbnkgY2hhcmFjdGVyIGV4Y2VwdCBhIGNvbnRyb2wgY2hhcmFjdGVyLCBzcGFjZSBjaGFyYWN0ZXIsICgnKSxcbiAqICAgIChcIiksIFwiPlwiLCBcIj1cIiwgb3IgXCIvXCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieSBcIj1cIlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5OlxuICogICAgKiBBbnkgY2hhcmFjdGVyIGV4Y2VwdCBzcGFjZSwgKCcpLCAoXCIpLCBcIjxcIiwgXCI+XCIsIFwiPVwiLCAoYCksIG9yXG4gKiAgICAqIChcIikgdGhlbiBhbnkgbm9uLShcIiksIG9yXG4gKiAgICAqICgnKSB0aGVuIGFueSBub24tKCcpXG4gKi9cbmV4cG9ydCBjb25zdCBsYXN0QXR0cmlidXRlTmFtZVJlZ2V4ID0gLyhbIFxceDA5XFx4MGFcXHgwY1xceDBkXSkoW15cXDAtXFx4MUZcXHg3Ri1cXHg5RiBcXHgwOVxceDBhXFx4MGNcXHgwZFwiJz49L10rKShbIFxceDA5XFx4MGFcXHgwY1xceDBkXSo9WyBcXHgwOVxceDBhXFx4MGNcXHgwZF0qKD86W14gXFx4MDlcXHgwYVxceDBjXFx4MGRcIidgPD49XSp8XCJbXlwiXSp8J1teJ10qKSkkLztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRlbXBsYXRlLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5pbXBvcnQgeyBpc0NFUG9seWZpbGwgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyBpc1RlbXBsYXRlUGFydEFjdGl2ZSB9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuLyoqXG4gKiBBbiBpbnN0YW5jZSBvZiBhIGBUZW1wbGF0ZWAgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIERPTSBhbmQgdXBkYXRlZFxuICogd2l0aCBuZXcgdmFsdWVzLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSB7XG4gICAgY29uc3RydWN0b3IodGVtcGxhdGUsIHByb2Nlc3Nvciwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLl9wYXJ0cyA9IFtdO1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgICAgIHRoaXMucHJvY2Vzc29yID0gcHJvY2Vzc29yO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH1cbiAgICB1cGRhdGUodmFsdWVzKSB7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMuX3BhcnRzKSB7XG4gICAgICAgICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFydC5zZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLl9wYXJ0cykge1xuICAgICAgICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnQuY29tbWl0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Nsb25lKCkge1xuICAgICAgICAvLyBXaGVuIHVzaW5nIHRoZSBDdXN0b20gRWxlbWVudHMgcG9seWZpbGwsIGNsb25lIHRoZSBub2RlLCByYXRoZXIgdGhhblxuICAgICAgICAvLyBpbXBvcnRpbmcgaXQsIHRvIGtlZXAgdGhlIGZyYWdtZW50IGluIHRoZSB0ZW1wbGF0ZSdzIGRvY3VtZW50LiBUaGlzXG4gICAgICAgIC8vIGxlYXZlcyB0aGUgZnJhZ21lbnQgaW5lcnQgc28gY3VzdG9tIGVsZW1lbnRzIHdvbid0IHVwZ3JhZGUgYW5kXG4gICAgICAgIC8vIHBvdGVudGlhbGx5IG1vZGlmeSB0aGVpciBjb250ZW50cyBieSBjcmVhdGluZyBhIHBvbHlmaWxsZWQgU2hhZG93Um9vdFxuICAgICAgICAvLyB3aGlsZSB3ZSB0cmF2ZXJzZSB0aGUgdHJlZS5cbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBpc0NFUG9seWZpbGwgP1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZS5lbGVtZW50LmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIDpcbiAgICAgICAgICAgIGRvY3VtZW50LmltcG9ydE5vZGUodGhpcy50ZW1wbGF0ZS5lbGVtZW50LmNvbnRlbnQsIHRydWUpO1xuICAgICAgICBjb25zdCBwYXJ0cyA9IHRoaXMudGVtcGxhdGUucGFydHM7XG4gICAgICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgICAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICAgICAgY29uc3QgX3ByZXBhcmVJbnN0YW5jZSA9IChmcmFnbWVudCkgPT4ge1xuICAgICAgICAgICAgLy8gRWRnZSBuZWVkcyBhbGwgNCBwYXJhbWV0ZXJzIHByZXNlbnQ7IElFMTEgbmVlZHMgM3JkIHBhcmFtZXRlciB0byBiZVxuICAgICAgICAgICAgLy8gbnVsbFxuICAgICAgICAgICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihmcmFnbWVudCwgMTMzIC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfFRFWFR9ICovLCBudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICBsZXQgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCB0aGUgbm9kZXMgYW5kIHBhcnRzIG9mIGEgdGVtcGxhdGVcbiAgICAgICAgICAgIHdoaWxlIChwYXJ0SW5kZXggPCBwYXJ0cy5sZW5ndGggJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnQgPSBwYXJ0c1twYXJ0SW5kZXhdO1xuICAgICAgICAgICAgICAgIC8vIENvbnNlY3V0aXZlIFBhcnRzIG1heSBoYXZlIHRoZSBzYW1lIG5vZGUgaW5kZXgsIGluIHRoZSBjYXNlIG9mXG4gICAgICAgICAgICAgICAgLy8gbXVsdGlwbGUgYm91bmQgYXR0cmlidXRlcyBvbiBhbiBlbGVtZW50LiBTbyBlYWNoIGl0ZXJhdGlvbiB3ZSBlaXRoZXJcbiAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnQgdGhlIG5vZGVJbmRleCwgaWYgd2UgYXJlbid0IG9uIGEgbm9kZSB3aXRoIGEgcGFydCwgb3IgdGhlXG4gICAgICAgICAgICAgICAgLy8gcGFydEluZGV4IGlmIHdlIGFyZS4gQnkgbm90IGluY3JlbWVudGluZyB0aGUgbm9kZUluZGV4IHdoZW4gd2UgZmluZCBhXG4gICAgICAgICAgICAgICAgLy8gcGFydCwgd2UgYWxsb3cgZm9yIHRoZSBuZXh0IHBhcnQgdG8gYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgLy8gbm9kZSBpZiBuZWNjZXNzYXNyeS5cbiAgICAgICAgICAgICAgICBpZiAoIWlzVGVtcGxhdGVQYXJ0QWN0aXZlKHBhcnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcnRzLnB1c2godW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVJbmRleCA9PT0gcGFydC5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFydC50eXBlID09PSAnbm9kZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnQgPSB0aGlzLnByb2Nlc3Nvci5oYW5kbGVUZXh0RXhwcmVzc2lvbih0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydC5pbnNlcnRBZnRlck5vZGUobm9kZS5wcmV2aW91c1NpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFydHMucHVzaChwYXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcnRzLnB1c2goLi4udGhpcy5wcm9jZXNzb3IuaGFuZGxlQXR0cmlidXRlRXhwcmVzc2lvbnMobm9kZSwgcGFydC5uYW1lLCBwYXJ0LnN0cmluZ3MsIHRoaXMub3B0aW9ucykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHBhcnRJbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLm5vZGVOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfcHJlcGFyZUluc3RhbmNlKG5vZGUuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgX3ByZXBhcmVJbnN0YW5jZShmcmFnbWVudCk7XG4gICAgICAgIGlmIChpc0NFUG9seWZpbGwpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkb3B0Tm9kZShmcmFnbWVudCk7XG4gICAgICAgICAgICBjdXN0b21FbGVtZW50cy51cGdyYWRlKGZyYWdtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGVtcGxhdGUtaW5zdGFuY2UuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cbmltcG9ydCB7IHJlcGFyZW50Tm9kZXMgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyBib3VuZEF0dHJpYnV0ZVN1ZmZpeCwgbGFzdEF0dHJpYnV0ZU5hbWVSZWdleCwgbWFya2VyLCBub2RlTWFya2VyIH0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiBgaHRtbGAsIHdoaWNoIGhvbGRzIGEgVGVtcGxhdGUgYW5kIHRoZSB2YWx1ZXMgZnJvbVxuICogaW50ZXJwb2xhdGVkIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHN0cmluZ3MsIHZhbHVlcywgdHlwZSwgcHJvY2Vzc29yKSB7XG4gICAgICAgIHRoaXMuc3RyaW5ncyA9IHN0cmluZ3M7XG4gICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLnByb2Nlc3NvciA9IHByb2Nlc3NvcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZyBvZiBIVE1MIHVzZWQgdG8gY3JlYXRlIGEgYDx0ZW1wbGF0ZT5gIGVsZW1lbnQuXG4gICAgICovXG4gICAgZ2V0SFRNTCgpIHtcbiAgICAgICAgY29uc3QgZW5kSW5kZXggPSB0aGlzLnN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zdHJpbmdzW2ldO1xuICAgICAgICAgICAgLy8gVGhpcyBleGVjKCkgY2FsbCBkb2VzIHR3byB0aGluZ3M6XG4gICAgICAgICAgICAvLyAxKSBBcHBlbmRzIGEgc3VmZml4IHRvIHRoZSBib3VuZCBhdHRyaWJ1dGUgbmFtZSB0byBvcHQgb3V0IG9mIHNwZWNpYWxcbiAgICAgICAgICAgIC8vIGF0dHJpYnV0ZSB2YWx1ZSBwYXJzaW5nIHRoYXQgSUUxMSBhbmQgRWRnZSBkbywgbGlrZSBmb3Igc3R5bGUgYW5kXG4gICAgICAgICAgICAvLyBtYW55IFNWRyBhdHRyaWJ1dGVzLiBUaGUgVGVtcGxhdGUgY2xhc3MgYWxzbyBhcHBlbmRzIHRoZSBzYW1lIHN1ZmZpeFxuICAgICAgICAgICAgLy8gd2hlbiBsb29raW5nIHVwIGF0dHJpYnV0ZXMgdG8gY3JlYXRlIFBhcnRzLlxuICAgICAgICAgICAgLy8gMikgQWRkcyBhbiB1bnF1b3RlZC1hdHRyaWJ1dGUtc2FmZSBtYXJrZXIgZm9yIHRoZSBmaXJzdCBleHByZXNzaW9uIGluXG4gICAgICAgICAgICAvLyBhbiBhdHRyaWJ1dGUuIFN1YnNlcXVlbnQgYXR0cmlidXRlIGV4cHJlc3Npb25zIHdpbGwgdXNlIG5vZGUgbWFya2VycyxcbiAgICAgICAgICAgIC8vIGFuZCB0aGlzIGlzIHNhZmUgc2luY2UgYXR0cmlidXRlcyB3aXRoIG11bHRpcGxlIGV4cHJlc3Npb25zIGFyZVxuICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCB0byBiZSBxdW90ZWQuXG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXguZXhlYyhzKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIC8vIFdlJ3JlIHN0YXJ0aW5nIGEgbmV3IGJvdW5kIGF0dHJpYnV0ZS5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIHNhZmUgYXR0cmlidXRlIHN1ZmZpeCwgYW5kIHVzZSB1bnF1b3RlZC1hdHRyaWJ1dGUtc2FmZVxuICAgICAgICAgICAgICAgIC8vIG1hcmtlci5cbiAgICAgICAgICAgICAgICBodG1sICs9IHMuc3Vic3RyKDAsIG1hdGNoLmluZGV4KSArIG1hdGNoWzFdICsgbWF0Y2hbMl0gK1xuICAgICAgICAgICAgICAgICAgICBib3VuZEF0dHJpYnV0ZVN1ZmZpeCArIG1hdGNoWzNdICsgbWFya2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gV2UncmUgZWl0aGVyIGluIGEgYm91bmQgbm9kZSwgb3IgdHJhaWxpbmcgYm91bmQgYXR0cmlidXRlLlxuICAgICAgICAgICAgICAgIC8vIEVpdGhlciB3YXksIG5vZGVNYXJrZXIgaXMgc2FmZSB0byB1c2UuXG4gICAgICAgICAgICAgICAgaHRtbCArPSBzICsgbm9kZU1hcmtlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbCArIHRoaXMuc3RyaW5nc1tlbmRJbmRleF07XG4gICAgfVxuICAgIGdldFRlbXBsYXRlRWxlbWVudCgpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSB0aGlzLmdldEhUTUwoKTtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH1cbn1cbi8qKlxuICogQSBUZW1wbGF0ZVJlc3VsdCBmb3IgU1ZHIGZyYWdtZW50cy5cbiAqXG4gKiBUaGlzIGNsYXNzIHdyYXBzIEhUTWwgaW4gYW4gYDxzdmc+YCB0YWcgaW4gb3JkZXIgdG8gcGFyc2UgaXRzIGNvbnRlbnRzIGluIHRoZVxuICogU1ZHIG5hbWVzcGFjZSwgdGhlbiBtb2RpZmllcyB0aGUgdGVtcGxhdGUgdG8gcmVtb3ZlIHRoZSBgPHN2Zz5gIHRhZyBzbyB0aGF0XG4gKiBjbG9uZXMgb25seSBjb250YWluZXIgdGhlIG9yaWdpbmFsIGZyYWdtZW50LlxuICovXG5leHBvcnQgY2xhc3MgU1ZHVGVtcGxhdGVSZXN1bHQgZXh0ZW5kcyBUZW1wbGF0ZVJlc3VsdCB7XG4gICAgZ2V0SFRNTCgpIHtcbiAgICAgICAgcmV0dXJuIGA8c3ZnPiR7c3VwZXIuZ2V0SFRNTCgpfTwvc3ZnPmA7XG4gICAgfVxuICAgIGdldFRlbXBsYXRlRWxlbWVudCgpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBzdXBlci5nZXRUZW1wbGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgICAgIGNvbnN0IHN2Z0VsZW1lbnQgPSBjb250ZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgIGNvbnRlbnQucmVtb3ZlQ2hpbGQoc3ZnRWxlbWVudCk7XG4gICAgICAgIHJlcGFyZW50Tm9kZXMoY29udGVudCwgc3ZnRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRlbXBsYXRlLXJlc3VsdC5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuaW1wb3J0IHsgaXNEaXJlY3RpdmUgfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQgeyByZW1vdmVOb2RlcyB9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7IG5vQ2hhbmdlLCBub3RoaW5nIH0gZnJvbSAnLi9wYXJ0LmpzJztcbmltcG9ydCB7IFRlbXBsYXRlSW5zdGFuY2UgfSBmcm9tICcuL3RlbXBsYXRlLWluc3RhbmNlLmpzJztcbmltcG9ydCB7IFRlbXBsYXRlUmVzdWx0IH0gZnJvbSAnLi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuaW1wb3J0IHsgY3JlYXRlTWFya2VyIH0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWUpID0+IHtcbiAgICByZXR1cm4gKHZhbHVlID09PSBudWxsIHx8XG4gICAgICAgICEodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpKTtcbn07XG4vKipcbiAqIFNldHMgYXR0cmlidXRlIHZhbHVlcyBmb3IgQXR0cmlidXRlUGFydHMsIHNvIHRoYXQgdGhlIHZhbHVlIGlzIG9ubHkgc2V0IG9uY2VcbiAqIGV2ZW4gaWYgdGhlcmUgYXJlIG11bHRpcGxlIHBhcnRzIGZvciBhbiBhdHRyaWJ1dGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVDb21taXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpIHtcbiAgICAgICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuc3RyaW5ncyA9IHN0cmluZ3M7XG4gICAgICAgIHRoaXMucGFydHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5wYXJ0c1tpXSA9IHRoaXMuX2NyZWF0ZVBhcnQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc2luZ2xlIHBhcnQuIE92ZXJyaWRlIHRoaXMgdG8gY3JlYXRlIGEgZGlmZmVybnQgdHlwZSBvZiBwYXJ0LlxuICAgICAqL1xuICAgIF9jcmVhdGVQYXJ0KCkge1xuICAgICAgICByZXR1cm4gbmV3IEF0dHJpYnV0ZVBhcnQodGhpcyk7XG4gICAgfVxuICAgIF9nZXRWYWx1ZSgpIHtcbiAgICAgICAgY29uc3Qgc3RyaW5ncyA9IHRoaXMuc3RyaW5ncztcbiAgICAgICAgY29uc3QgbCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgbGV0IHRleHQgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHRleHQgKz0gc3RyaW5nc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnQgPSB0aGlzLnBhcnRzW2ldO1xuICAgICAgICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSBwYXJ0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh2ICE9IG51bGwgJiZcbiAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkodikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2ICE9PSAnc3RyaW5nJyAmJiB2W1N5bWJvbC5pdGVyYXRvcl0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IHR5cGVvZiB0ID09PSAnc3RyaW5nJyA/IHQgOiBTdHJpbmcodCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gdHlwZW9mIHYgPT09ICdzdHJpbmcnID8gdiA6IFN0cmluZyh2KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGV4dCArPSBzdHJpbmdzW2xdO1xuICAgICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG4gICAgY29tbWl0KCkge1xuICAgICAgICBpZiAodGhpcy5kaXJ0eSkge1xuICAgICAgICAgICAgdGhpcy5kaXJ0eSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHRoaXMuX2dldFZhbHVlKCkpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZVBhcnQge1xuICAgIGNvbnN0cnVjdG9yKGNvbWl0dGVyKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuY29tbWl0dGVyID0gY29taXR0ZXI7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gbm9DaGFuZ2UgJiYgKCFpc1ByaW1pdGl2ZSh2YWx1ZSkgfHwgdmFsdWUgIT09IHRoaXMudmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAvLyBJZiB0aGUgdmFsdWUgaXMgYSBub3QgYSBkaXJlY3RpdmUsIGRpcnR5IHRoZSBjb21taXR0ZXIgc28gdGhhdCBpdCdsbFxuICAgICAgICAgICAgLy8gY2FsbCBzZXRBdHRyaWJ1dGUuIElmIHRoZSB2YWx1ZSBpcyBhIGRpcmVjdGl2ZSwgaXQnbGwgZGlydHkgdGhlXG4gICAgICAgICAgICAvLyBjb21taXR0ZXIgaWYgaXQgY2FsbHMgc2V0VmFsdWUoKS5cbiAgICAgICAgICAgIGlmICghaXNEaXJlY3RpdmUodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21taXR0ZXIuZGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGNvbW1pdCgpIHtcbiAgICAgICAgd2hpbGUgKGlzRGlyZWN0aXZlKHRoaXMudmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLnZhbHVlO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IG5vQ2hhbmdlO1xuICAgICAgICAgICAgZGlyZWN0aXZlKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tbWl0dGVyLmNvbW1pdCgpO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBOb2RlUGFydCB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICB0aGlzLnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluc2VydHMgdGhpcyBwYXJ0IGludG8gYSBjb250YWluZXIuXG4gICAgICpcbiAgICAgKiBUaGlzIHBhcnQgbXVzdCBiZSBlbXB0eSwgYXMgaXRzIGNvbnRlbnRzIGFyZSBub3QgYXV0b21hdGljYWxseSBtb3ZlZC5cbiAgICAgKi9cbiAgICBhcHBlbmRJbnRvKGNvbnRhaW5lcikge1xuICAgICAgICB0aGlzLnN0YXJ0Tm9kZSA9IGNvbnRhaW5lci5hcHBlbmRDaGlsZChjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgIHRoaXMuZW5kTm9kZSA9IGNvbnRhaW5lci5hcHBlbmRDaGlsZChjcmVhdGVNYXJrZXIoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluc2VydHMgdGhpcyBwYXJ0IGJldHdlZW4gYHJlZmAgYW5kIGByZWZgJ3MgbmV4dCBzaWJsaW5nLiBCb3RoIGByZWZgIGFuZFxuICAgICAqIGl0cyBuZXh0IHNpYmxpbmcgbXVzdCBiZSBzdGF0aWMsIHVuY2hhbmdpbmcgbm9kZXMgc3VjaCBhcyB0aG9zZSB0aGF0IGFwcGVhclxuICAgICAqIGluIGEgbGl0ZXJhbCBzZWN0aW9uIG9mIGEgdGVtcGxhdGUuXG4gICAgICpcbiAgICAgKiBUaGlzIHBhcnQgbXVzdCBiZSBlbXB0eSwgYXMgaXRzIGNvbnRlbnRzIGFyZSBub3QgYXV0b21hdGljYWxseSBtb3ZlZC5cbiAgICAgKi9cbiAgICBpbnNlcnRBZnRlck5vZGUocmVmKSB7XG4gICAgICAgIHRoaXMuc3RhcnROb2RlID0gcmVmO1xuICAgICAgICB0aGlzLmVuZE5vZGUgPSByZWYubmV4dFNpYmxpbmc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFwcGVuZHMgdGhpcyBwYXJ0IGludG8gYSBwYXJlbnQgcGFydC5cbiAgICAgKlxuICAgICAqIFRoaXMgcGFydCBtdXN0IGJlIGVtcHR5LCBhcyBpdHMgY29udGVudHMgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IG1vdmVkLlxuICAgICAqL1xuICAgIGFwcGVuZEludG9QYXJ0KHBhcnQpIHtcbiAgICAgICAgcGFydC5faW5zZXJ0KHRoaXMuc3RhcnROb2RlID0gY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICBwYXJ0Ll9pbnNlcnQodGhpcy5lbmROb2RlID0gY3JlYXRlTWFya2VyKCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIHRoaXMgcGFydCBhZnRlciBgcmVmYFxuICAgICAqXG4gICAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAgICovXG4gICAgaW5zZXJ0QWZ0ZXJQYXJ0KHJlZikge1xuICAgICAgICByZWYuX2luc2VydCh0aGlzLnN0YXJ0Tm9kZSA9IGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgdGhpcy5lbmROb2RlID0gcmVmLmVuZE5vZGU7XG4gICAgICAgIHJlZi5lbmROb2RlID0gdGhpcy5zdGFydE5vZGU7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBjb21taXQoKSB7XG4gICAgICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLl9wZW5kaW5nVmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9wZW5kaW5nVmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSBub0NoYW5nZTtcbiAgICAgICAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX3BlbmRpbmdWYWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbW1pdFRlbXBsYXRlUmVzdWx0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbW1pdE5vZGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICB2YWx1ZVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICAgICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWUgPT09IG5vdGhpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBub3RoaW5nO1xuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2ssIHdpbGwgcmVuZGVyIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9pbnNlcnQobm9kZSkge1xuICAgICAgICB0aGlzLmVuZE5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5lbmROb2RlKTtcbiAgICB9XG4gICAgX2NvbW1pdE5vZGUodmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMudmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9pbnNlcnQodmFsdWUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIF9jb21taXRUZXh0KHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZS5uZXh0U2libGluZztcbiAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbiAgICAgICAgaWYgKG5vZGUgPT09IHRoaXMuZW5kTm9kZS5wcmV2aW91c1NpYmxpbmcgJiZcbiAgICAgICAgICAgIG5vZGUubm9kZVR5cGUgPT09IDMgLyogTm9kZS5URVhUX05PREUgKi8pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIG9ubHkgaGF2ZSBhIHNpbmdsZSB0ZXh0IG5vZGUgYmV0d2VlbiB0aGUgbWFya2Vycywgd2UgY2FuIGp1c3RcbiAgICAgICAgICAgIC8vIHNldCBpdHMgdmFsdWUsIHJhdGhlciB0aGFuIHJlcGxhY2luZyBpdC5cbiAgICAgICAgICAgIC8vIFRPRE8oanVzdGluZmFnbmFuaSk6IENhbiB3ZSBqdXN0IGNoZWNrIGlmIHRoaXMudmFsdWUgaXMgcHJpbWl0aXZlP1xuICAgICAgICAgICAgbm9kZS5kYXRhID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9jb21taXROb2RlKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IFN0cmluZyh2YWx1ZSkpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIF9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpO1xuICAgICAgICBpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlSW5zdGFuY2UgJiZcbiAgICAgICAgICAgIHRoaXMudmFsdWUudGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlLnVwZGF0ZSh2YWx1ZS52YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIHByb3BhZ2F0ZSB0aGUgdGVtcGxhdGUgcHJvY2Vzc29yIGZyb20gdGhlIFRlbXBsYXRlUmVzdWx0XG4gICAgICAgICAgICAvLyBzbyB0aGF0IHdlIHVzZSBpdHMgc3ludGF4IGV4dGVuc2lvbiwgZXRjLiBUaGUgdGVtcGxhdGUgZmFjdG9yeSBjb21lc1xuICAgICAgICAgICAgLy8gZnJvbSB0aGUgcmVuZGVyIGZ1bmN0aW9uIG9wdGlvbnMgc28gdGhhdCBpdCBjYW4gY29udHJvbCB0ZW1wbGF0ZVxuICAgICAgICAgICAgLy8gY2FjaGluZyBhbmQgcHJlcHJvY2Vzc2luZy5cbiAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFRlbXBsYXRlSW5zdGFuY2UodGVtcGxhdGUsIHZhbHVlLnByb2Nlc3NvciwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gaW5zdGFuY2UuX2Nsb25lKCk7XG4gICAgICAgICAgICBpbnN0YW5jZS51cGRhdGUodmFsdWUudmFsdWVzKTtcbiAgICAgICAgICAgIHRoaXMuX2NvbW1pdE5vZGUoZnJhZ21lbnQpO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGluc3RhbmNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9jb21taXRJdGVyYWJsZSh2YWx1ZSkge1xuICAgICAgICAvLyBGb3IgYW4gSXRlcmFibGUsIHdlIGNyZWF0ZSBhIG5ldyBJbnN0YW5jZVBhcnQgcGVyIGl0ZW0sIHRoZW4gc2V0IGl0c1xuICAgICAgICAvLyB2YWx1ZSB0byB0aGUgaXRlbS4gVGhpcyBpcyBhIGxpdHRsZSBiaXQgb2Ygb3ZlcmhlYWQgZm9yIGV2ZXJ5IGl0ZW0gaW5cbiAgICAgICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgICAgIC8vIG9mIFRlbXBsYXRlUmVzdWx0cyB0aGF0IHdpbGwgYmUgY29tbW9ubHkgcmV0dXJuZWQgZnJvbSBleHByZXNzaW9ucyBsaWtlOlxuICAgICAgICAvLyBhcnJheS5tYXAoKGkpID0+IGh0bWxgJHtpfWApLCBieSByZXVzaW5nIGV4aXN0aW5nIFRlbXBsYXRlSW5zdGFuY2VzLlxuICAgICAgICAvLyBJZiBfdmFsdWUgaXMgYW4gYXJyYXksIHRoZW4gdGhlIHByZXZpb3VzIHJlbmRlciB3YXMgb2YgYW5cbiAgICAgICAgLy8gaXRlcmFibGUgYW5kIF92YWx1ZSB3aWxsIGNvbnRhaW4gdGhlIE5vZGVQYXJ0cyBmcm9tIHRoZSBwcmV2aW91c1xuICAgICAgICAvLyByZW5kZXIuIElmIF92YWx1ZSBpcyBub3QgYW4gYXJyYXksIGNsZWFyIHRoaXMgcGFydCBhbmQgbWFrZSBhIG5ld1xuICAgICAgICAvLyBhcnJheSBmb3IgTm9kZVBhcnRzLlxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodGhpcy52YWx1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBMZXRzIHVzIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgaXRlbXMgd2Ugc3RhbXBlZCBzbyB3ZSBjYW4gY2xlYXIgbGVmdG92ZXJcbiAgICAgICAgLy8gaXRlbXMgZnJvbSBhIHByZXZpb3VzIHJlbmRlclxuICAgICAgICBjb25zdCBpdGVtUGFydHMgPSB0aGlzLnZhbHVlO1xuICAgICAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICAgICAgbGV0IGl0ZW1QYXJ0O1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBwYXJ0XG4gICAgICAgICAgICBpdGVtUGFydCA9IGl0ZW1QYXJ0c1twYXJ0SW5kZXhdO1xuICAgICAgICAgICAgLy8gSWYgbm8gZXhpc3RpbmcgcGFydCwgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICAgICAgaWYgKGl0ZW1QYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpdGVtUGFydCA9IG5ldyBOb2RlUGFydCh0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGl0ZW1QYXJ0cy5wdXNoKGl0ZW1QYXJ0KTtcbiAgICAgICAgICAgICAgICBpZiAocGFydEluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1QYXJ0LmFwcGVuZEludG9QYXJ0KHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbVBhcnQuaW5zZXJ0QWZ0ZXJQYXJ0KGl0ZW1QYXJ0c1twYXJ0SW5kZXggLSAxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlbVBhcnQuc2V0VmFsdWUoaXRlbSk7XG4gICAgICAgICAgICBpdGVtUGFydC5jb21taXQoKTtcbiAgICAgICAgICAgIHBhcnRJbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0SW5kZXggPCBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICAgICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgICAgICAgICAgdGhpcy5jbGVhcihpdGVtUGFydCAmJiBpdGVtUGFydC5lbmROb2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjbGVhcihzdGFydE5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSkge1xuICAgICAgICByZW1vdmVOb2Rlcyh0aGlzLnN0YXJ0Tm9kZS5wYXJlbnROb2RlLCBzdGFydE5vZGUubmV4dFNpYmxpbmcsIHRoaXMuZW5kTm9kZSk7XG4gICAgfVxufVxuLyoqXG4gKiBJbXBsZW1lbnRzIGEgYm9vbGVhbiBhdHRyaWJ1dGUsIHJvdWdobHkgYXMgZGVmaW5lZCBpbiB0aGUgSFRNTFxuICogc3BlY2lmaWNhdGlvbi5cbiAqXG4gKiBJZiB0aGUgdmFsdWUgaXMgdHJ1dGh5LCB0aGVuIHRoZSBhdHRyaWJ1dGUgaXMgcHJlc2VudCB3aXRoIGEgdmFsdWUgb2ZcbiAqICcnLiBJZiB0aGUgdmFsdWUgaXMgZmFsc2V5LCB0aGUgYXR0cmlidXRlIGlzIHJlbW92ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBCb29sZWFuQXR0cmlidXRlUGFydCB7XG4gICAgY29uc3RydWN0b3IoZWxlbWVudCwgbmFtZSwgc3RyaW5ncykge1xuICAgICAgICB0aGlzLnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzdHJpbmdzLmxlbmd0aCAhPT0gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdCb29sZWFuIGF0dHJpYnV0ZXMgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB9XG4gICAgc2V0VmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIGNvbW1pdCgpIHtcbiAgICAgICAgd2hpbGUgKGlzRGlyZWN0aXZlKHRoaXMuX3BlbmRpbmdWYWx1ZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuX3BlbmRpbmdWYWx1ZTtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICAgICAgICAgICAgZGlyZWN0aXZlKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9wZW5kaW5nVmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmFsdWUgPSAhIXRoaXMuX3BlbmRpbmdWYWx1ZTtcbiAgICAgICAgaWYgKHRoaXMudmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2U7XG4gICAgfVxufVxuLyoqXG4gKiBTZXRzIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIFByb3BlcnR5UGFydHMsIHNvIHRoYXQgdGhlIHZhbHVlIGlzIG9ubHkgc2V0IG9uY2VcbiAqIGV2ZW4gaWYgdGhlcmUgYXJlIG11bHRpcGxlIHBhcnRzIGZvciBhIHByb3BlcnR5LlxuICpcbiAqIElmIGFuIGV4cHJlc3Npb24gY29udHJvbHMgdGhlIHdob2xlIHByb3BlcnR5IHZhbHVlLCB0aGVuIHRoZSB2YWx1ZSBpcyBzaW1wbHlcbiAqIGFzc2lnbmVkIHRvIHRoZSBwcm9wZXJ0eSB1bmRlciBjb250cm9sLiBJZiB0aGVyZSBhcmUgc3RyaW5nIGxpdGVyYWxzIG9yXG4gKiBtdWx0aXBsZSBleHByZXNzaW9ucywgdGhlbiB0aGUgc3RyaW5ncyBhcmUgZXhwcmVzc2lvbnMgYXJlIGludGVycG9sYXRlZCBpbnRvXG4gKiBhIHN0cmluZyBmaXJzdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFByb3BlcnR5Q29tbWl0dGVyIGV4dGVuZHMgQXR0cmlidXRlQ29tbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzKSB7XG4gICAgICAgIHN1cGVyKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpO1xuICAgICAgICB0aGlzLnNpbmdsZSA9XG4gICAgICAgICAgICAoc3RyaW5ncy5sZW5ndGggPT09IDIgJiYgc3RyaW5nc1swXSA9PT0gJycgJiYgc3RyaW5nc1sxXSA9PT0gJycpO1xuICAgIH1cbiAgICBfY3JlYXRlUGFydCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wZXJ0eVBhcnQodGhpcyk7XG4gICAgfVxuICAgIF9nZXRWYWx1ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2luZ2xlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJ0c1swXS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuX2dldFZhbHVlKCk7XG4gICAgfVxuICAgIGNvbW1pdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgICAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudFt0aGlzLm5hbWVdID0gdGhpcy5fZ2V0VmFsdWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbn1cbi8vIERldGVjdCBldmVudCBsaXN0ZW5lciBvcHRpb25zIHN1cHBvcnQuIElmIHRoZSBgY2FwdHVyZWAgcHJvcGVydHkgaXMgcmVhZFxuLy8gZnJvbSB0aGUgb3B0aW9ucyBvYmplY3QsIHRoZW4gb3B0aW9ucyBhcmUgc3VwcG9ydGVkLiBJZiBub3QsIHRoZW4gdGhlIHRocmlkXG4vLyBhcmd1bWVudCB0byBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpcyBpbnRlcnByZXRlZCBhcyB0aGUgYm9vbGVhbiBjYXB0dXJlXG4vLyB2YWx1ZSBzbyB3ZSBzaG91bGQgb25seSBwYXNzIHRoZSBgY2FwdHVyZWAgcHJvcGVydHkuXG5sZXQgZXZlbnRPcHRpb25zU3VwcG9ydGVkID0gZmFsc2U7XG50cnkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIGdldCBjYXB0dXJlKCkge1xuICAgICAgICAgICAgZXZlbnRPcHRpb25zU3VwcG9ydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0ZXN0Jywgb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0ZXN0Jywgb3B0aW9ucywgb3B0aW9ucyk7XG59XG5jYXRjaCAoX2UpIHtcbn1cbmV4cG9ydCBjbGFzcyBFdmVudFBhcnQge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQsIGV2ZW50TmFtZSwgZXZlbnRDb250ZXh0KSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG4gICAgICAgIHRoaXMuZXZlbnRDb250ZXh0ID0gZXZlbnRDb250ZXh0O1xuICAgICAgICB0aGlzLl9ib3VuZEhhbmRsZUV2ZW50ID0gKGUpID0+IHRoaXMuaGFuZGxlRXZlbnQoZSk7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdWYWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBjb21taXQoKSB7XG4gICAgICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLl9wZW5kaW5nVmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9wZW5kaW5nVmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nVmFsdWUgPSBub0NoYW5nZTtcbiAgICAgICAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fcGVuZGluZ1ZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0xpc3RlbmVyID0gdGhpcy5fcGVuZGluZ1ZhbHVlO1xuICAgICAgICBjb25zdCBvbGRMaXN0ZW5lciA9IHRoaXMudmFsdWU7XG4gICAgICAgIGNvbnN0IHNob3VsZFJlbW92ZUxpc3RlbmVyID0gbmV3TGlzdGVuZXIgPT0gbnVsbCB8fFxuICAgICAgICAgICAgb2xkTGlzdGVuZXIgIT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIChuZXdMaXN0ZW5lci5jYXB0dXJlICE9PSBvbGRMaXN0ZW5lci5jYXB0dXJlIHx8XG4gICAgICAgICAgICAgICAgICAgIG5ld0xpc3RlbmVyLm9uY2UgIT09IG9sZExpc3RlbmVyLm9uY2UgfHxcbiAgICAgICAgICAgICAgICAgICAgbmV3TGlzdGVuZXIucGFzc2l2ZSAhPT0gb2xkTGlzdGVuZXIucGFzc2l2ZSk7XG4gICAgICAgIGNvbnN0IHNob3VsZEFkZExpc3RlbmVyID0gbmV3TGlzdGVuZXIgIT0gbnVsbCAmJiAob2xkTGlzdGVuZXIgPT0gbnVsbCB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG4gICAgICAgIGlmIChzaG91bGRSZW1vdmVMaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5ldmVudE5hbWUsIHRoaXMuX2JvdW5kSGFuZGxlRXZlbnQsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaG91bGRBZGRMaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IGdldE9wdGlvbnMobmV3TGlzdGVuZXIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5ldmVudE5hbWUsIHRoaXMuX2JvdW5kSGFuZGxlRXZlbnQsIHRoaXMuX29wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsdWUgPSBuZXdMaXN0ZW5lcjtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2U7XG4gICAgfVxuICAgIGhhbmRsZUV2ZW50KGV2ZW50KSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy52YWx1ZS5jYWxsKHRoaXMuZXZlbnRDb250ZXh0IHx8IHRoaXMuZWxlbWVudCwgZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy52YWx1ZS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyBXZSBjb3B5IG9wdGlvbnMgYmVjYXVzZSBvZiB0aGUgaW5jb25zaXN0ZW50IGJlaGF2aW9yIG9mIGJyb3dzZXJzIHdoZW4gcmVhZGluZ1xuLy8gdGhlIHRoaXJkIGFyZ3VtZW50IG9mIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLiBJRTExIGRvZXNuJ3Qgc3VwcG9ydCBvcHRpb25zXG4vLyBhdCBhbGwuIENocm9tZSA0MSBvbmx5IHJlYWRzIGBjYXB0dXJlYCBpZiB0aGUgYXJndW1lbnQgaXMgYW4gb2JqZWN0LlxuY29uc3QgZ2V0T3B0aW9ucyA9IChvKSA9PiBvICYmXG4gICAgKGV2ZW50T3B0aW9uc1N1cHBvcnRlZCA/XG4gICAgICAgIHsgY2FwdHVyZTogby5jYXB0dXJlLCBwYXNzaXZlOiBvLnBhc3NpdmUsIG9uY2U6IG8ub25jZSB9IDpcbiAgICAgICAgby5jYXB0dXJlKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXBhcnRzLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbmltcG9ydCB7IEF0dHJpYnV0ZUNvbW1pdHRlciwgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsIEV2ZW50UGFydCwgTm9kZVBhcnQsIFByb3BlcnR5Q29tbWl0dGVyIH0gZnJvbSAnLi9wYXJ0cy5qcyc7XG4vKipcbiAqIENyZWF0ZXMgUGFydHMgd2hlbiBhIHRlbXBsYXRlIGlzIGluc3RhbnRpYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvciB7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBhcnRzIGZvciBhbiBhdHRyaWJ1dGUtcG9zaXRpb24gYmluZGluZywgZ2l2ZW4gdGhlIGV2ZW50LCBhdHRyaWJ1dGVcbiAgICAgKiBuYW1lLCBhbmQgc3RyaW5nIGxpdGVyYWxzLlxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnQgVGhlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgYmluZGluZ1xuICAgICAqIEBwYXJhbSBuYW1lICBUaGUgYXR0cmlidXRlIG5hbWVcbiAgICAgKiBAcGFyYW0gc3RyaW5ncyBUaGUgc3RyaW5nIGxpdGVyYWxzLiBUaGVyZSBhcmUgYWx3YXlzIGF0IGxlYXN0IHR3byBzdHJpbmdzLFxuICAgICAqICAgZXZlbnQgZm9yIGZ1bGx5LWNvbnRyb2xsZWQgYmluZGluZ3Mgd2l0aCBhIHNpbmdsZSBleHByZXNzaW9uLlxuICAgICAqL1xuICAgIGhhbmRsZUF0dHJpYnV0ZUV4cHJlc3Npb25zKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgcHJlZml4ID0gbmFtZVswXTtcbiAgICAgICAgaWYgKHByZWZpeCA9PT0gJy4nKSB7XG4gICAgICAgICAgICBjb25zdCBjb21pdHRlciA9IG5ldyBQcm9wZXJ0eUNvbW1pdHRlcihlbGVtZW50LCBuYW1lLnNsaWNlKDEpLCBzdHJpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBjb21pdHRlci5wYXJ0cztcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlZml4ID09PSAnQCcpIHtcbiAgICAgICAgICAgIHJldHVybiBbbmV3IEV2ZW50UGFydChlbGVtZW50LCBuYW1lLnNsaWNlKDEpLCBvcHRpb25zLmV2ZW50Q29udGV4dCldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVmaXggPT09ICc/Jykge1xuICAgICAgICAgICAgcmV0dXJuIFtuZXcgQm9vbGVhbkF0dHJpYnV0ZVBhcnQoZWxlbWVudCwgbmFtZS5zbGljZSgxKSwgc3RyaW5ncyldO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbWl0dGVyID0gbmV3IEF0dHJpYnV0ZUNvbW1pdHRlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzKTtcbiAgICAgICAgcmV0dXJuIGNvbWl0dGVyLnBhcnRzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcGFydHMgZm9yIGEgdGV4dC1wb3NpdGlvbiBiaW5kaW5nLlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZUZhY3RvcnlcbiAgICAgKi9cbiAgICBoYW5kbGVUZXh0RXhwcmVzc2lvbihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZVBhcnQob3B0aW9ucyk7XG4gICAgfVxufVxuZXhwb3J0IGNvbnN0IGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvciA9IG5ldyBEZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IoKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbmltcG9ydCB7IG1hcmtlciwgVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcbi8qKlxuICogVGhlIGRlZmF1bHQgVGVtcGxhdGVGYWN0b3J5IHdoaWNoIGNhY2hlcyBUZW1wbGF0ZXMga2V5ZWQgb25cbiAqIHJlc3VsdC50eXBlIGFuZCByZXN1bHQuc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlbXBsYXRlRmFjdG9yeShyZXN1bHQpIHtcbiAgICBsZXQgdGVtcGxhdGVDYWNoZSA9IHRlbXBsYXRlQ2FjaGVzLmdldChyZXN1bHQudHlwZSk7XG4gICAgaWYgKHRlbXBsYXRlQ2FjaGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0ZW1wbGF0ZUNhY2hlID0ge1xuICAgICAgICAgICAgc3RyaW5nc0FycmF5OiBuZXcgV2Vha01hcCgpLFxuICAgICAgICAgICAga2V5U3RyaW5nOiBuZXcgTWFwKClcbiAgICAgICAgfTtcbiAgICAgICAgdGVtcGxhdGVDYWNoZXMuc2V0KHJlc3VsdC50eXBlLCB0ZW1wbGF0ZUNhY2hlKTtcbiAgICB9XG4gICAgbGV0IHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5zdHJpbmdzQXJyYXkuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfVxuICAgIC8vIElmIHRoZSBUZW1wbGF0ZVN0cmluZ3NBcnJheSBpcyBuZXcsIGdlbmVyYXRlIGEga2V5IGZyb20gdGhlIHN0cmluZ3NcbiAgICAvLyBUaGlzIGtleSBpcyBzaGFyZWQgYmV0d2VlbiBhbGwgdGVtcGxhdGVzIHdpdGggaWRlbnRpY2FsIGNvbnRlbnRcbiAgICBjb25zdCBrZXkgPSByZXN1bHQuc3RyaW5ncy5qb2luKG1hcmtlcik7XG4gICAgLy8gQ2hlY2sgaWYgd2UgYWxyZWFkeSBoYXZlIGEgVGVtcGxhdGUgZm9yIHRoaXMga2V5XG4gICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmtleVN0cmluZy5nZXQoa2V5KTtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIG5vdCBzZWVuIHRoaXMga2V5IGJlZm9yZSwgY3JlYXRlIGEgbmV3IFRlbXBsYXRlXG4gICAgICAgIHRlbXBsYXRlID0gbmV3IFRlbXBsYXRlKHJlc3VsdCwgcmVzdWx0LmdldFRlbXBsYXRlRWxlbWVudCgpKTtcbiAgICAgICAgLy8gQ2FjaGUgdGhlIFRlbXBsYXRlIGZvciB0aGlzIGtleVxuICAgICAgICB0ZW1wbGF0ZUNhY2hlLmtleVN0cmluZy5zZXQoa2V5LCB0ZW1wbGF0ZSk7XG4gICAgfVxuICAgIC8vIENhY2hlIGFsbCBmdXR1cmUgcXVlcmllcyBmb3IgdGhpcyBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICAgIHRlbXBsYXRlQ2FjaGUuc3RyaW5nc0FycmF5LnNldChyZXN1bHQuc3RyaW5ncywgdGVtcGxhdGUpO1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbn1cbmV4cG9ydCBjb25zdCB0ZW1wbGF0ZUNhY2hlcyA9IG5ldyBNYXAoKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRlbXBsYXRlLWZhY3RvcnkuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cbmltcG9ydCB7IHJlbW92ZU5vZGVzIH0gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHsgTm9kZVBhcnQgfSBmcm9tICcuL3BhcnRzLmpzJztcbmltcG9ydCB7IHRlbXBsYXRlRmFjdG9yeSB9IGZyb20gJy4vdGVtcGxhdGUtZmFjdG9yeS5qcyc7XG5leHBvcnQgY29uc3QgcGFydHMgPSBuZXcgV2Vha01hcCgpO1xuLyoqXG4gKiBSZW5kZXJzIGEgdGVtcGxhdGUgdG8gYSBjb250YWluZXIuXG4gKlxuICogVG8gdXBkYXRlIGEgY29udGFpbmVyIHdpdGggbmV3IHZhbHVlcywgcmVldmFsdWF0ZSB0aGUgdGVtcGxhdGUgbGl0ZXJhbCBhbmRcbiAqIGNhbGwgYHJlbmRlcmAgd2l0aCB0aGUgbmV3IHJlc3VsdC5cbiAqXG4gKiBAcGFyYW0gcmVzdWx0IGEgVGVtcGxhdGVSZXN1bHQgY3JlYXRlZCBieSBldmFsdWF0aW5nIGEgdGVtcGxhdGUgdGFnIGxpa2VcbiAqICAgICBgaHRtbGAgb3IgYHN2Z2AuXG4gKiBAcGFyYW0gY29udGFpbmVyIEEgRE9NIHBhcmVudCB0byByZW5kZXIgdG8uIFRoZSBlbnRpcmUgY29udGVudHMgYXJlIGVpdGhlclxuICogICAgIHJlcGxhY2VkLCBvciBlZmZpY2llbnRseSB1cGRhdGVkIGlmIHRoZSBzYW1lIHJlc3VsdCB0eXBlIHdhcyBwcmV2aW91c1xuICogICAgIHJlbmRlcmVkIHRoZXJlLlxuICogQHBhcmFtIG9wdGlvbnMgUmVuZGVyT3B0aW9ucyBmb3IgdGhlIGVudGlyZSByZW5kZXIgdHJlZSByZW5kZXJlZCB0byB0aGlzXG4gKiAgICAgY29udGFpbmVyLiBSZW5kZXIgb3B0aW9ucyBtdXN0ICpub3QqIGNoYW5nZSBiZXR3ZWVuIHJlbmRlcnMgdG8gdGhlIHNhbWVcbiAqICAgICBjb250YWluZXIsIGFzIHRob3NlIGNoYW5nZXMgd2lsbCBub3QgZWZmZWN0IHByZXZpb3VzbHkgcmVuZGVyZWQgRE9NLlxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKHJlc3VsdCwgY29udGFpbmVyLCBvcHRpb25zKSA9PiB7XG4gICAgbGV0IHBhcnQgPSBwYXJ0cy5nZXQoY29udGFpbmVyKTtcbiAgICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlbW92ZU5vZGVzKGNvbnRhaW5lciwgY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgICBwYXJ0cy5zZXQoY29udGFpbmVyLCBwYXJ0ID0gbmV3IE5vZGVQYXJ0KE9iamVjdC5hc3NpZ24oeyB0ZW1wbGF0ZUZhY3RvcnkgfSwgb3B0aW9ucykpKTtcbiAgICAgICAgcGFydC5hcHBlbmRJbnRvKGNvbnRhaW5lcik7XG4gICAgfVxuICAgIHBhcnQuc2V0VmFsdWUocmVzdWx0KTtcbiAgICBwYXJ0LmNvbW1pdCgpO1xufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXJlbmRlci5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vKipcbiAqXG4gKiBNYWluIGxpdC1odG1sIG1vZHVsZS5cbiAqXG4gKiBNYWluIGV4cG9ydHM6XG4gKlxuICogLSAgW1todG1sXV1cbiAqIC0gIFtbc3ZnXV1cbiAqIC0gIFtbcmVuZGVyXV1cbiAqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKiBAcHJlZmVycmVkXG4gKi9cbi8qKlxuICogRG8gbm90IHJlbW92ZSB0aGlzIGNvbW1lbnQ7IGl0IGtlZXBzIHR5cGVkb2MgZnJvbSBtaXNwbGFjaW5nIHRoZSBtb2R1bGVcbiAqIGRvY3MuXG4gKi9cbmltcG9ydCB7IGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvciB9IGZyb20gJy4vbGliL2RlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IFNWR1RlbXBsYXRlUmVzdWx0LCBUZW1wbGF0ZVJlc3VsdCB9IGZyb20gJy4vbGliL3RlbXBsYXRlLXJlc3VsdC5qcyc7XG5leHBvcnQgeyBEZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvciB9IGZyb20gJy4vbGliL2RlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmV4cG9ydCB7IGRpcmVjdGl2ZSwgaXNEaXJlY3RpdmUgfSBmcm9tICcuL2xpYi9kaXJlY3RpdmUuanMnO1xuLy8gVE9ETyhqdXN0aW5mYWduYW5pKTogcmVtb3ZlIGxpbmUgd2hlbiB3ZSBnZXQgTm9kZVBhcnQgbW92aW5nIG1ldGhvZHNcbmV4cG9ydCB7IHJlbW92ZU5vZGVzLCByZXBhcmVudE5vZGVzIH0gZnJvbSAnLi9saWIvZG9tLmpzJztcbmV4cG9ydCB7IG5vQ2hhbmdlLCBub3RoaW5nIH0gZnJvbSAnLi9saWIvcGFydC5qcyc7XG5leHBvcnQgeyBBdHRyaWJ1dGVDb21taXR0ZXIsIEF0dHJpYnV0ZVBhcnQsIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LCBFdmVudFBhcnQsIGlzUHJpbWl0aXZlLCBOb2RlUGFydCwgUHJvcGVydHlDb21taXR0ZXIsIFByb3BlcnR5UGFydCB9IGZyb20gJy4vbGliL3BhcnRzLmpzJztcbmV4cG9ydCB7IHBhcnRzLCByZW5kZXIgfSBmcm9tICcuL2xpYi9yZW5kZXIuanMnO1xuZXhwb3J0IHsgdGVtcGxhdGVDYWNoZXMsIHRlbXBsYXRlRmFjdG9yeSB9IGZyb20gJy4vbGliL3RlbXBsYXRlLWZhY3RvcnkuanMnO1xuZXhwb3J0IHsgVGVtcGxhdGVJbnN0YW5jZSB9IGZyb20gJy4vbGliL3RlbXBsYXRlLWluc3RhbmNlLmpzJztcbmV4cG9ydCB7IFNWR1RlbXBsYXRlUmVzdWx0LCBUZW1wbGF0ZVJlc3VsdCB9IGZyb20gJy4vbGliL3RlbXBsYXRlLXJlc3VsdC5qcyc7XG5leHBvcnQgeyBjcmVhdGVNYXJrZXIsIGlzVGVtcGxhdGVQYXJ0QWN0aXZlLCBUZW1wbGF0ZSB9IGZyb20gJy4vbGliL3RlbXBsYXRlLmpzJztcbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgbGl0LWh0bWwgdXNhZ2UuXG4vLyBUT0RPKGp1c3RpbmZhZ25hbmkpOiBpbmplY3QgdmVyc2lvbiBudW1iZXIgYXQgYnVpbGQgdGltZVxuKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gfHwgKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gPSBbXSkpLnB1c2goJzEuMC4wJyk7XG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIEhUTUwgdGVtcGxhdGUgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IChzdHJpbmdzLCAuLi52YWx1ZXMpID0+IG5ldyBUZW1wbGF0ZVJlc3VsdChzdHJpbmdzLCB2YWx1ZXMsICdodG1sJywgZGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yKTtcbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IChzdHJpbmdzLCAuLi52YWx1ZXMpID0+IG5ldyBTVkdUZW1wbGF0ZVJlc3VsdChzdHJpbmdzLCB2YWx1ZXMsICdzdmcnLCBkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGl0LWh0bWwuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHNoYWR5LXJlbmRlclxuICovXG5pbXBvcnQgeyBpc1RlbXBsYXRlUGFydEFjdGl2ZSB9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuY29uc3Qgd2Fsa2VyTm9kZUZpbHRlciA9IDEzMyAvKiBOb2RlRmlsdGVyLlNIT1dfe0VMRU1FTlR8Q09NTUVOVHxURVhUfSAqLztcbi8qKlxuICogUmVtb3ZlcyB0aGUgbGlzdCBvZiBub2RlcyBmcm9tIGEgVGVtcGxhdGUgc2FmZWx5LiBJbiBhZGRpdGlvbiB0byByZW1vdmluZ1xuICogbm9kZXMgZnJvbSB0aGUgVGVtcGxhdGUsIHRoZSBUZW1wbGF0ZSBwYXJ0IGluZGljZXMgYXJlIHVwZGF0ZWQgdG8gbWF0Y2hcbiAqIHRoZSBtdXRhdGVkIFRlbXBsYXRlIERPTS5cbiAqXG4gKiBBcyB0aGUgdGVtcGxhdGUgaXMgd2Fsa2VkIHRoZSByZW1vdmFsIHN0YXRlIGlzIHRyYWNrZWQgYW5kXG4gKiBwYXJ0IGluZGljZXMgYXJlIGFkanVzdGVkIGFzIG5lZWRlZC5cbiAqXG4gKiBkaXZcbiAqICAgZGl2IzEgKHJlbW92ZSkgPC0tIHN0YXJ0IHJlbW92aW5nIChyZW1vdmluZyBub2RlIGlzIGRpdiMxKVxuICogICAgIGRpdlxuICogICAgICAgZGl2IzIgKHJlbW92ZSkgIDwtLSBjb250aW51ZSByZW1vdmluZyAocmVtb3Zpbmcgbm9kZSBpcyBzdGlsbCBkaXYjMSlcbiAqICAgICAgICAgZGl2XG4gKiBkaXYgPC0tIHN0b3AgcmVtb3Zpbmcgc2luY2UgcHJldmlvdXMgc2libGluZyBpcyB0aGUgcmVtb3Zpbmcgbm9kZSAoZGl2IzEsXG4gKiByZW1vdmVkIDQgbm9kZXMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVOb2Rlc0Zyb21UZW1wbGF0ZSh0ZW1wbGF0ZSwgbm9kZXNUb1JlbW92ZSkge1xuICAgIGNvbnN0IHsgZWxlbWVudDogeyBjb250ZW50IH0sIHBhcnRzIH0gPSB0ZW1wbGF0ZTtcbiAgICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGNvbnRlbnQsIHdhbGtlck5vZGVGaWx0ZXIsIG51bGwsIGZhbHNlKTtcbiAgICBsZXQgcGFydEluZGV4ID0gbmV4dEFjdGl2ZUluZGV4SW5UZW1wbGF0ZVBhcnRzKHBhcnRzKTtcbiAgICBsZXQgcGFydCA9IHBhcnRzW3BhcnRJbmRleF07XG4gICAgbGV0IG5vZGVJbmRleCA9IC0xO1xuICAgIGxldCByZW1vdmVDb3VudCA9IDA7XG4gICAgY29uc3Qgbm9kZXNUb1JlbW92ZUluVGVtcGxhdGUgPSBbXTtcbiAgICBsZXQgY3VycmVudFJlbW92aW5nTm9kZSA9IG51bGw7XG4gICAgd2hpbGUgKHdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgIG5vZGVJbmRleCsrO1xuICAgICAgICBjb25zdCBub2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgICAgICAvLyBFbmQgcmVtb3ZhbCBpZiBzdGVwcGVkIHBhc3QgdGhlIHJlbW92aW5nIG5vZGVcbiAgICAgICAgaWYgKG5vZGUucHJldmlvdXNTaWJsaW5nID09PSBjdXJyZW50UmVtb3ZpbmdOb2RlKSB7XG4gICAgICAgICAgICBjdXJyZW50UmVtb3ZpbmdOb2RlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBBIG5vZGUgdG8gcmVtb3ZlIHdhcyBmb3VuZCBpbiB0aGUgdGVtcGxhdGVcbiAgICAgICAgaWYgKG5vZGVzVG9SZW1vdmUuaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICBub2Rlc1RvUmVtb3ZlSW5UZW1wbGF0ZS5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgLy8gVHJhY2sgbm9kZSB3ZSdyZSByZW1vdmluZ1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRSZW1vdmluZ05vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UmVtb3ZpbmdOb2RlID0gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXaGVuIHJlbW92aW5nLCBpbmNyZW1lbnQgY291bnQgYnkgd2hpY2ggdG8gYWRqdXN0IHN1YnNlcXVlbnQgcGFydCBpbmRpY2VzXG4gICAgICAgIGlmIChjdXJyZW50UmVtb3ZpbmdOb2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChwYXJ0ICE9PSB1bmRlZmluZWQgJiYgcGFydC5pbmRleCA9PT0gbm9kZUluZGV4KSB7XG4gICAgICAgICAgICAvLyBJZiBwYXJ0IGlzIGluIGEgcmVtb3ZlZCBub2RlIGRlYWN0aXZhdGUgaXQgYnkgc2V0dGluZyBpbmRleCB0byAtMSBvclxuICAgICAgICAgICAgLy8gYWRqdXN0IHRoZSBpbmRleCBhcyBuZWVkZWQuXG4gICAgICAgICAgICBwYXJ0LmluZGV4ID0gY3VycmVudFJlbW92aW5nTm9kZSAhPT0gbnVsbCA/IC0xIDogcGFydC5pbmRleCAtIHJlbW92ZUNvdW50O1xuICAgICAgICAgICAgLy8gZ28gdG8gdGhlIG5leHQgYWN0aXZlIHBhcnQuXG4gICAgICAgICAgICBwYXJ0SW5kZXggPSBuZXh0QWN0aXZlSW5kZXhJblRlbXBsYXRlUGFydHMocGFydHMsIHBhcnRJbmRleCk7XG4gICAgICAgICAgICBwYXJ0ID0gcGFydHNbcGFydEluZGV4XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBub2Rlc1RvUmVtb3ZlSW5UZW1wbGF0ZS5mb3JFYWNoKChuKSA9PiBuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobikpO1xufVxuY29uc3QgY291bnROb2RlcyA9IChub2RlKSA9PiB7XG4gICAgbGV0IGNvdW50ID0gKG5vZGUubm9kZVR5cGUgPT09IDExIC8qIE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSAqLykgPyAwIDogMTtcbiAgICBjb25zdCB3YWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKG5vZGUsIHdhbGtlck5vZGVGaWx0ZXIsIG51bGwsIGZhbHNlKTtcbiAgICB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xufTtcbmNvbnN0IG5leHRBY3RpdmVJbmRleEluVGVtcGxhdGVQYXJ0cyA9IChwYXJ0cywgc3RhcnRJbmRleCA9IC0xKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IHN0YXJ0SW5kZXggKyAxOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICBpZiAoaXNUZW1wbGF0ZVBhcnRBY3RpdmUocGFydCkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn07XG4vKipcbiAqIEluc2VydHMgdGhlIGdpdmVuIG5vZGUgaW50byB0aGUgVGVtcGxhdGUsIG9wdGlvbmFsbHkgYmVmb3JlIHRoZSBnaXZlblxuICogcmVmTm9kZS4gSW4gYWRkaXRpb24gdG8gaW5zZXJ0aW5nIHRoZSBub2RlIGludG8gdGhlIFRlbXBsYXRlLCB0aGUgVGVtcGxhdGVcbiAqIHBhcnQgaW5kaWNlcyBhcmUgdXBkYXRlZCB0byBtYXRjaCB0aGUgbXV0YXRlZCBUZW1wbGF0ZSBET00uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnROb2RlSW50b1RlbXBsYXRlKHRlbXBsYXRlLCBub2RlLCByZWZOb2RlID0gbnVsbCkge1xuICAgIGNvbnN0IHsgZWxlbWVudDogeyBjb250ZW50IH0sIHBhcnRzIH0gPSB0ZW1wbGF0ZTtcbiAgICAvLyBJZiB0aGVyZSdzIG5vIHJlZk5vZGUsIHRoZW4gcHV0IG5vZGUgYXQgZW5kIG9mIHRlbXBsYXRlLlxuICAgIC8vIE5vIHBhcnQgaW5kaWNlcyBuZWVkIHRvIGJlIHNoaWZ0ZWQgaW4gdGhpcyBjYXNlLlxuICAgIGlmIChyZWZOb2RlID09PSBudWxsIHx8IHJlZk5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250ZW50LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoY29udGVudCwgd2Fsa2VyTm9kZUZpbHRlciwgbnVsbCwgZmFsc2UpO1xuICAgIGxldCBwYXJ0SW5kZXggPSBuZXh0QWN0aXZlSW5kZXhJblRlbXBsYXRlUGFydHMocGFydHMpO1xuICAgIGxldCBpbnNlcnRDb3VudCA9IDA7XG4gICAgbGV0IHdhbGtlckluZGV4ID0gLTE7XG4gICAgd2hpbGUgKHdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgIHdhbGtlckluZGV4Kys7XG4gICAgICAgIGNvbnN0IHdhbGtlck5vZGUgPSB3YWxrZXIuY3VycmVudE5vZGU7XG4gICAgICAgIGlmICh3YWxrZXJOb2RlID09PSByZWZOb2RlKSB7XG4gICAgICAgICAgICBpbnNlcnRDb3VudCA9IGNvdW50Tm9kZXMobm9kZSk7XG4gICAgICAgICAgICByZWZOb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIHJlZk5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChwYXJ0SW5kZXggIT09IC0xICYmIHBhcnRzW3BhcnRJbmRleF0uaW5kZXggPT09IHdhbGtlckluZGV4KSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSd2ZSBpbnNlcnRlZCB0aGUgbm9kZSwgc2ltcGx5IGFkanVzdCBhbGwgc3Vic2VxdWVudCBwYXJ0c1xuICAgICAgICAgICAgaWYgKGluc2VydENvdW50ID4gMCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJ0SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnRzW3BhcnRJbmRleF0uaW5kZXggKz0gaW5zZXJ0Q291bnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcnRJbmRleCA9IG5leHRBY3RpdmVJbmRleEluVGVtcGxhdGVQYXJ0cyhwYXJ0cywgcGFydEluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFydEluZGV4ID0gbmV4dEFjdGl2ZUluZGV4SW5UZW1wbGF0ZVBhcnRzKHBhcnRzLCBwYXJ0SW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bW9kaWZ5LXRlbXBsYXRlLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogTW9kdWxlIHRvIGFkZCBzaGFkeSBET00vc2hhZHkgQ1NTIHBvbHlmaWxsIHN1cHBvcnQgdG8gbGl0LWh0bWwgdGVtcGxhdGVcbiAqIHJlbmRlcmluZy4gU2VlIHRoZSBbW3JlbmRlcl1dIG1ldGhvZCBmb3IgZGV0YWlscy5cbiAqXG4gKiBAbW9kdWxlIHNoYWR5LXJlbmRlclxuICogQHByZWZlcnJlZFxuICovXG4vKipcbiAqIERvIG5vdCByZW1vdmUgdGhpcyBjb21tZW50OyBpdCBrZWVwcyB0eXBlZG9jIGZyb20gbWlzcGxhY2luZyB0aGUgbW9kdWxlXG4gKiBkb2NzLlxuICovXG5pbXBvcnQgeyByZW1vdmVOb2RlcyB9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7IGluc2VydE5vZGVJbnRvVGVtcGxhdGUsIHJlbW92ZU5vZGVzRnJvbVRlbXBsYXRlIH0gZnJvbSAnLi9tb2RpZnktdGVtcGxhdGUuanMnO1xuaW1wb3J0IHsgcGFydHMsIHJlbmRlciBhcyBsaXRSZW5kZXIgfSBmcm9tICcuL3JlbmRlci5qcyc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUNhY2hlcyB9IGZyb20gJy4vdGVtcGxhdGUtZmFjdG9yeS5qcyc7XG5pbXBvcnQgeyBUZW1wbGF0ZUluc3RhbmNlIH0gZnJvbSAnLi90ZW1wbGF0ZS1pbnN0YW5jZS5qcyc7XG5pbXBvcnQgeyBUZW1wbGF0ZVJlc3VsdCB9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcbmltcG9ydCB7IG1hcmtlciwgVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcbmV4cG9ydCB7IGh0bWwsIHN2ZywgVGVtcGxhdGVSZXN1bHQgfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG4vLyBHZXQgYSBrZXkgdG8gbG9va3VwIGluIGB0ZW1wbGF0ZUNhY2hlc2AuXG5jb25zdCBnZXRUZW1wbGF0ZUNhY2hlS2V5ID0gKHR5cGUsIHNjb3BlTmFtZSkgPT4gYCR7dHlwZX0tLSR7c2NvcGVOYW1lfWA7XG5sZXQgY29tcGF0aWJsZVNoYWR5Q1NTVmVyc2lvbiA9IHRydWU7XG5pZiAodHlwZW9mIHdpbmRvdy5TaGFkeUNTUyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21wYXRpYmxlU2hhZHlDU1NWZXJzaW9uID0gZmFsc2U7XG59XG5lbHNlIGlmICh0eXBlb2Ygd2luZG93LlNoYWR5Q1NTLnByZXBhcmVUZW1wbGF0ZURvbSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zb2xlLndhcm4oYEluY29tcGF0aWJsZSBTaGFkeUNTUyB2ZXJzaW9uIGRldGVjdGVkLmAgK1xuICAgICAgICBgUGxlYXNlIHVwZGF0ZSB0byBhdCBsZWFzdCBAd2ViY29tcG9uZW50cy93ZWJjb21wb25lbnRzanNAMi4wLjIgYW5kYCArXG4gICAgICAgIGBAd2ViY29tcG9uZW50cy9zaGFkeWNzc0AxLjMuMS5gKTtcbiAgICBjb21wYXRpYmxlU2hhZHlDU1NWZXJzaW9uID0gZmFsc2U7XG59XG4vKipcbiAqIFRlbXBsYXRlIGZhY3Rvcnkgd2hpY2ggc2NvcGVzIHRlbXBsYXRlIERPTSB1c2luZyBTaGFkeUNTUy5cbiAqIEBwYXJhbSBzY29wZU5hbWUge3N0cmluZ31cbiAqL1xuY29uc3Qgc2hhZHlUZW1wbGF0ZUZhY3RvcnkgPSAoc2NvcGVOYW1lKSA9PiAocmVzdWx0KSA9PiB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBnZXRUZW1wbGF0ZUNhY2hlS2V5KHJlc3VsdC50eXBlLCBzY29wZU5hbWUpO1xuICAgIGxldCB0ZW1wbGF0ZUNhY2hlID0gdGVtcGxhdGVDYWNoZXMuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAodGVtcGxhdGVDYWNoZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRlbXBsYXRlQ2FjaGUgPSB7XG4gICAgICAgICAgICBzdHJpbmdzQXJyYXk6IG5ldyBXZWFrTWFwKCksXG4gICAgICAgICAgICBrZXlTdHJpbmc6IG5ldyBNYXAoKVxuICAgICAgICB9O1xuICAgICAgICB0ZW1wbGF0ZUNhY2hlcy5zZXQoY2FjaGVLZXksIHRlbXBsYXRlQ2FjaGUpO1xuICAgIH1cbiAgICBsZXQgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLnN0cmluZ3NBcnJheS5nZXQocmVzdWx0LnN0cmluZ3MpO1xuICAgIGlmICh0ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gcmVzdWx0LnN0cmluZ3Muam9pbihtYXJrZXIpO1xuICAgIHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5rZXlTdHJpbmcuZ2V0KGtleSk7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHJlc3VsdC5nZXRUZW1wbGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgaWYgKGNvbXBhdGlibGVTaGFkeUNTU1ZlcnNpb24pIHtcbiAgICAgICAgICAgIHdpbmRvdy5TaGFkeUNTUy5wcmVwYXJlVGVtcGxhdGVEb20oZWxlbWVudCwgc2NvcGVOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICB0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQsIGVsZW1lbnQpO1xuICAgICAgICB0ZW1wbGF0ZUNhY2hlLmtleVN0cmluZy5zZXQoa2V5LCB0ZW1wbGF0ZSk7XG4gICAgfVxuICAgIHRlbXBsYXRlQ2FjaGUuc3RyaW5nc0FycmF5LnNldChyZXN1bHQuc3RyaW5ncywgdGVtcGxhdGUpO1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbn07XG5jb25zdCBURU1QTEFURV9UWVBFUyA9IFsnaHRtbCcsICdzdmcnXTtcbi8qKlxuICogUmVtb3ZlcyBhbGwgc3R5bGUgZWxlbWVudHMgZnJvbSBUZW1wbGF0ZXMgZm9yIHRoZSBnaXZlbiBzY29wZU5hbWUuXG4gKi9cbmNvbnN0IHJlbW92ZVN0eWxlc0Zyb21MaXRUZW1wbGF0ZXMgPSAoc2NvcGVOYW1lKSA9PiB7XG4gICAgVEVNUExBVEVfVFlQRVMuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZXMgPSB0ZW1wbGF0ZUNhY2hlcy5nZXQoZ2V0VGVtcGxhdGVDYWNoZUtleSh0eXBlLCBzY29wZU5hbWUpKTtcbiAgICAgICAgaWYgKHRlbXBsYXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZXMua2V5U3RyaW5nLmZvckVhY2goKHRlbXBsYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBlbGVtZW50OiB7IGNvbnRlbnQgfSB9ID0gdGVtcGxhdGU7XG4gICAgICAgICAgICAgICAgLy8gSUUgMTEgZG9lc24ndCBzdXBwb3J0IHRoZSBpdGVyYWJsZSBwYXJhbSBTZXQgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZXMgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgQXJyYXkuZnJvbShjb250ZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3N0eWxlJykpLmZvckVhY2goKHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGVzLmFkZChzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZW1vdmVOb2Rlc0Zyb21UZW1wbGF0ZSh0ZW1wbGF0ZSwgc3R5bGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuY29uc3Qgc2hhZHlSZW5kZXJTZXQgPSBuZXcgU2V0KCk7XG4vKipcbiAqIEZvciB0aGUgZ2l2ZW4gc2NvcGUgbmFtZSwgZW5zdXJlcyB0aGF0IFNoYWR5Q1NTIHN0eWxlIHNjb3BpbmcgaXMgcGVyZm9ybWVkLlxuICogVGhpcyBpcyBkb25lIGp1c3Qgb25jZSBwZXIgc2NvcGUgbmFtZSBzbyB0aGUgZnJhZ21lbnQgYW5kIHRlbXBsYXRlIGNhbm5vdFxuICogYmUgbW9kaWZpZWQuXG4gKiAoMSkgZXh0cmFjdHMgc3R5bGVzIGZyb20gdGhlIHJlbmRlcmVkIGZyYWdtZW50IGFuZCBoYW5kcyB0aGVtIHRvIFNoYWR5Q1NTXG4gKiB0byBiZSBzY29wZWQgYW5kIGFwcGVuZGVkIHRvIHRoZSBkb2N1bWVudFxuICogKDIpIHJlbW92ZXMgc3R5bGUgZWxlbWVudHMgZnJvbSBhbGwgbGl0LWh0bWwgVGVtcGxhdGVzIGZvciB0aGlzIHNjb3BlIG5hbWUuXG4gKlxuICogTm90ZSwgPHN0eWxlPiBlbGVtZW50cyBjYW4gb25seSBiZSBwbGFjZWQgaW50byB0ZW1wbGF0ZXMgZm9yIHRoZVxuICogaW5pdGlhbCByZW5kZXJpbmcgb2YgdGhlIHNjb3BlLiBJZiA8c3R5bGU+IGVsZW1lbnRzIGFyZSBpbmNsdWRlZCBpbiB0ZW1wbGF0ZXNcbiAqIGR5bmFtaWNhbGx5IHJlbmRlcmVkIHRvIHRoZSBzY29wZSAoYWZ0ZXIgdGhlIGZpcnN0IHNjb3BlIHJlbmRlciksIHRoZXkgd2lsbFxuICogbm90IGJlIHNjb3BlZCBhbmQgdGhlIDxzdHlsZT4gd2lsbCBiZSBsZWZ0IGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVuZGVyZWRcbiAqIG91dHB1dC5cbiAqL1xuY29uc3QgcHJlcGFyZVRlbXBsYXRlU3R5bGVzID0gKHJlbmRlcmVkRE9NLCB0ZW1wbGF0ZSwgc2NvcGVOYW1lKSA9PiB7XG4gICAgc2hhZHlSZW5kZXJTZXQuYWRkKHNjb3BlTmFtZSk7XG4gICAgLy8gTW92ZSBzdHlsZXMgb3V0IG9mIHJlbmRlcmVkIERPTSBhbmQgc3RvcmUuXG4gICAgY29uc3Qgc3R5bGVzID0gcmVuZGVyZWRET00ucXVlcnlTZWxlY3RvckFsbCgnc3R5bGUnKTtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gc3R5bGVzLCBza2lwIHVubmVjZXNzYXJ5IHdvcmtcbiAgICBpZiAoc3R5bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBFbnN1cmUgcHJlcGFyZVRlbXBsYXRlU3R5bGVzIGlzIGNhbGxlZCB0byBzdXBwb3J0IGFkZGluZ1xuICAgICAgICAvLyBzdHlsZXMgdmlhIGBwcmVwYXJlQWRvcHRlZENzc1RleHRgIHNpbmNlIHRoYXQgcmVxdWlyZXMgdGhhdFxuICAgICAgICAvLyBgcHJlcGFyZVRlbXBsYXRlU3R5bGVzYCBpcyBjYWxsZWQuXG4gICAgICAgIHdpbmRvdy5TaGFkeUNTUy5wcmVwYXJlVGVtcGxhdGVTdHlsZXModGVtcGxhdGUuZWxlbWVudCwgc2NvcGVOYW1lKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25kZW5zZWRTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgLy8gQ29sbGVjdCBzdHlsZXMgaW50byBhIHNpbmdsZSBzdHlsZS4gVGhpcyBoZWxwcyB1cyBtYWtlIHN1cmUgU2hhZHlDU1NcbiAgICAvLyBtYW5pcHVsYXRpb25zIHdpbGwgbm90IHByZXZlbnQgdXMgZnJvbSBiZWluZyBhYmxlIHRvIGZpeCB1cCB0ZW1wbGF0ZVxuICAgIC8vIHBhcnQgaW5kaWNlcy5cbiAgICAvLyBOT1RFOiBjb2xsZWN0aW5nIHN0eWxlcyBpcyBpbmVmZmljaWVudCBmb3IgYnJvd3NlcnMgYnV0IFNoYWR5Q1NTXG4gICAgLy8gY3VycmVudGx5IGRvZXMgdGhpcyBhbnl3YXkuIFdoZW4gaXQgZG9lcyBub3QsIHRoaXMgc2hvdWxkIGJlIGNoYW5nZWQuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBzdHlsZXNbaV07XG4gICAgICAgIHN0eWxlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGUpO1xuICAgICAgICBjb25kZW5zZWRTdHlsZS50ZXh0Q29udGVudCArPSBzdHlsZS50ZXh0Q29udGVudDtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIHN0eWxlcyBmcm9tIG5lc3RlZCB0ZW1wbGF0ZXMgaW4gdGhpcyBzY29wZS5cbiAgICByZW1vdmVTdHlsZXNGcm9tTGl0VGVtcGxhdGVzKHNjb3BlTmFtZSk7XG4gICAgLy8gQW5kIHRoZW4gcHV0IHRoZSBjb25kZW5zZWQgc3R5bGUgaW50byB0aGUgXCJyb290XCIgdGVtcGxhdGUgcGFzc2VkIGluIGFzXG4gICAgLy8gYHRlbXBsYXRlYC5cbiAgICBpbnNlcnROb2RlSW50b1RlbXBsYXRlKHRlbXBsYXRlLCBjb25kZW5zZWRTdHlsZSwgdGVtcGxhdGUuZWxlbWVudC5jb250ZW50LmZpcnN0Q2hpbGQpO1xuICAgIC8vIE5vdGUsIGl0J3MgaW1wb3J0YW50IHRoYXQgU2hhZHlDU1MgZ2V0cyB0aGUgdGVtcGxhdGUgdGhhdCBgbGl0LWh0bWxgXG4gICAgLy8gd2lsbCBhY3R1YWxseSByZW5kZXIgc28gdGhhdCBpdCBjYW4gdXBkYXRlIHRoZSBzdHlsZSBpbnNpZGUgd2hlblxuICAgIC8vIG5lZWRlZCAoZS5nLiBAYXBwbHkgbmF0aXZlIFNoYWRvdyBET00gY2FzZSkuXG4gICAgd2luZG93LlNoYWR5Q1NTLnByZXBhcmVUZW1wbGF0ZVN0eWxlcyh0ZW1wbGF0ZS5lbGVtZW50LCBzY29wZU5hbWUpO1xuICAgIGlmICh3aW5kb3cuU2hhZHlDU1MubmF0aXZlU2hhZG93KSB7XG4gICAgICAgIC8vIFdoZW4gaW4gbmF0aXZlIFNoYWRvdyBET00sIHJlLWFkZCBzdHlsaW5nIHRvIHJlbmRlcmVkIGNvbnRlbnQgdXNpbmdcbiAgICAgICAgLy8gdGhlIHN0eWxlIFNoYWR5Q1NTIHByb2R1Y2VkLlxuICAgICAgICBjb25zdCBzdHlsZSA9IHRlbXBsYXRlLmVsZW1lbnQuY29udGVudC5xdWVyeVNlbGVjdG9yKCdzdHlsZScpO1xuICAgICAgICByZW5kZXJlZERPTS5pbnNlcnRCZWZvcmUoc3R5bGUuY2xvbmVOb2RlKHRydWUpLCByZW5kZXJlZERPTS5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIFdoZW4gbm90IGluIG5hdGl2ZSBTaGFkb3cgRE9NLCBhdCB0aGlzIHBvaW50IFNoYWR5Q1NTIHdpbGwgaGF2ZVxuICAgICAgICAvLyByZW1vdmVkIHRoZSBzdHlsZSBmcm9tIHRoZSBsaXQgdGVtcGxhdGUgYW5kIHBhcnRzIHdpbGwgYmUgYnJva2VuIGFzIGFcbiAgICAgICAgLy8gcmVzdWx0LiBUbyBmaXggdGhpcywgd2UgcHV0IGJhY2sgdGhlIHN0eWxlIG5vZGUgU2hhZHlDU1MgcmVtb3ZlZFxuICAgICAgICAvLyBhbmQgdGhlbiB0ZWxsIGxpdCB0byByZW1vdmUgdGhhdCBub2RlIGZyb20gdGhlIHRlbXBsYXRlLlxuICAgICAgICAvLyBOT1RFLCBTaGFkeUNTUyBjcmVhdGVzIGl0cyBvd24gc3R5bGUgc28gd2UgY2FuIHNhZmVseSBhZGQvcmVtb3ZlXG4gICAgICAgIC8vIGBjb25kZW5zZWRTdHlsZWAgaGVyZS5cbiAgICAgICAgdGVtcGxhdGUuZWxlbWVudC5jb250ZW50Lmluc2VydEJlZm9yZShjb25kZW5zZWRTdHlsZSwgdGVtcGxhdGUuZWxlbWVudC5jb250ZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICBjb25zdCByZW1vdmVzID0gbmV3IFNldCgpO1xuICAgICAgICByZW1vdmVzLmFkZChjb25kZW5zZWRTdHlsZSk7XG4gICAgICAgIHJlbW92ZU5vZGVzRnJvbVRlbXBsYXRlKHRlbXBsYXRlLCByZW1vdmVzKTtcbiAgICB9XG59O1xuLyoqXG4gKiBFeHRlbnNpb24gdG8gdGhlIHN0YW5kYXJkIGByZW5kZXJgIG1ldGhvZCB3aGljaCBzdXBwb3J0cyByZW5kZXJpbmdcbiAqIHRvIFNoYWRvd1Jvb3RzIHdoZW4gdGhlIFNoYWR5RE9NIChodHRwczovL2dpdGh1Yi5jb20vd2ViY29tcG9uZW50cy9zaGFkeWRvbSlcbiAqIGFuZCBTaGFkeUNTUyAoaHR0cHM6Ly9naXRodWIuY29tL3dlYmNvbXBvbmVudHMvc2hhZHljc3MpIHBvbHlmaWxscyBhcmUgdXNlZFxuICogb3Igd2hlbiB0aGUgd2ViY29tcG9uZW50c2pzXG4gKiAoaHR0cHM6Ly9naXRodWIuY29tL3dlYmNvbXBvbmVudHMvd2ViY29tcG9uZW50c2pzKSBwb2x5ZmlsbCBpcyB1c2VkLlxuICpcbiAqIEFkZHMgYSBgc2NvcGVOYW1lYCBvcHRpb24gd2hpY2ggaXMgdXNlZCB0byBzY29wZSBlbGVtZW50IERPTSBhbmQgc3R5bGVzaGVldHNcbiAqIHdoZW4gbmF0aXZlIFNoYWRvd0RPTSBpcyB1bmF2YWlsYWJsZS4gVGhlIGBzY29wZU5hbWVgIHdpbGwgYmUgYWRkZWQgdG9cbiAqIHRoZSBjbGFzcyBhdHRyaWJ1dGUgb2YgYWxsIHJlbmRlcmVkIERPTS4gSW4gYWRkaXRpb24sIGFueSBzdHlsZSBlbGVtZW50cyB3aWxsXG4gKiBiZSBhdXRvbWF0aWNhbGx5IHJlLXdyaXR0ZW4gd2l0aCB0aGlzIGBzY29wZU5hbWVgIHNlbGVjdG9yIGFuZCBtb3ZlZCBvdXRcbiAqIG9mIHRoZSByZW5kZXJlZCBET00gYW5kIGludG8gdGhlIGRvY3VtZW50IGA8aGVhZD5gLlxuICpcbiAqIEl0IGlzIGNvbW1vbiB0byB1c2UgdGhpcyByZW5kZXIgbWV0aG9kIGluIGNvbmp1bmN0aW9uIHdpdGggYSBjdXN0b20gZWxlbWVudFxuICogd2hpY2ggcmVuZGVycyBhIHNoYWRvd1Jvb3QuIFdoZW4gdGhpcyBpcyBkb25lLCB0eXBpY2FsbHkgdGhlIGVsZW1lbnQnc1xuICogYGxvY2FsTmFtZWAgc2hvdWxkIGJlIHVzZWQgYXMgdGhlIGBzY29wZU5hbWVgLlxuICpcbiAqIEluIGFkZGl0aW9uIHRvIERPTSBzY29waW5nLCBTaGFkeUNTUyBhbHNvIHN1cHBvcnRzIGEgYmFzaWMgc2hpbSBmb3IgY3NzXG4gKiBjdXN0b20gcHJvcGVydGllcyAobmVlZGVkIG9ubHkgb24gb2xkZXIgYnJvd3NlcnMgbGlrZSBJRTExKSBhbmQgYSBzaGltIGZvclxuICogYSBkZXByZWNhdGVkIGZlYXR1cmUgY2FsbGVkIGBAYXBwbHlgIHRoYXQgc3VwcG9ydHMgYXBwbHlpbmcgYSBzZXQgb2YgY3NzXG4gKiBjdXN0b20gcHJvcGVydGllcyB0byBhIGdpdmVuIGxvY2F0aW9uLlxuICpcbiAqIFVzYWdlIGNvbnNpZGVyYXRpb25zOlxuICpcbiAqICogUGFydCB2YWx1ZXMgaW4gYDxzdHlsZT5gIGVsZW1lbnRzIGFyZSBvbmx5IGFwcGxpZWQgdGhlIGZpcnN0IHRpbWUgYSBnaXZlblxuICogYHNjb3BlTmFtZWAgcmVuZGVycy4gU3Vic2VxdWVudCBjaGFuZ2VzIHRvIHBhcnRzIGluIHN0eWxlIGVsZW1lbnRzIHdpbGwgaGF2ZVxuICogbm8gZWZmZWN0LiBCZWNhdXNlIG9mIHRoaXMsIHBhcnRzIGluIHN0eWxlIGVsZW1lbnRzIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yXG4gKiB2YWx1ZXMgdGhhdCB3aWxsIG5ldmVyIGNoYW5nZSwgZm9yIGV4YW1wbGUgcGFydHMgdGhhdCBzZXQgc2NvcGUtd2lkZSB0aGVtZVxuICogdmFsdWVzIG9yIHBhcnRzIHdoaWNoIHJlbmRlciBzaGFyZWQgc3R5bGUgZWxlbWVudHMuXG4gKlxuICogKiBOb3RlLCBkdWUgdG8gYSBsaW1pdGF0aW9uIG9mIHRoZSBTaGFkeURPTSBwb2x5ZmlsbCwgcmVuZGVyaW5nIGluIGFcbiAqIGN1c3RvbSBlbGVtZW50J3MgYGNvbnN0cnVjdG9yYCBpcyBub3Qgc3VwcG9ydGVkLiBJbnN0ZWFkIHJlbmRlcmluZyBzaG91bGRcbiAqIGVpdGhlciBkb25lIGFzeW5jaHJvbm91c2x5LCBmb3IgZXhhbXBsZSBhdCBtaWNyb3Rhc2sgdGltaW5nIChmb3IgZXhhbXBsZVxuICogYFByb21pc2UucmVzb2x2ZSgpYCksIG9yIGJlIGRlZmVycmVkIHVudGlsIHRoZSBmaXJzdCB0aW1lIHRoZSBlbGVtZW50J3NcbiAqIGBjb25uZWN0ZWRDYWxsYmFja2AgcnVucy5cbiAqXG4gKiBVc2FnZSBjb25zaWRlcmF0aW9ucyB3aGVuIHVzaW5nIHNoaW1tZWQgY3VzdG9tIHByb3BlcnRpZXMgb3IgYEBhcHBseWA6XG4gKlxuICogKiBXaGVuZXZlciBhbnkgZHluYW1pYyBjaGFuZ2VzIGFyZSBtYWRlIHdoaWNoIGFmZmVjdFxuICogY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCBgU2hhZHlDU1Muc3R5bGVFbGVtZW50KGVsZW1lbnQpYCBtdXN0IGJlIGNhbGxlZFxuICogdG8gdXBkYXRlIHRoZSBlbGVtZW50LiBUaGVyZSBhcmUgdHdvIGNhc2VzIHdoZW4gdGhpcyBpcyBuZWVkZWQ6XG4gKiAoMSkgdGhlIGVsZW1lbnQgaXMgY29ubmVjdGVkIHRvIGEgbmV3IHBhcmVudCwgKDIpIGEgY2xhc3MgaXMgYWRkZWQgdG8gdGhlXG4gKiBlbGVtZW50IHRoYXQgY2F1c2VzIGl0IHRvIG1hdGNoIGRpZmZlcmVudCBjdXN0b20gcHJvcGVydGllcy5cbiAqIFRvIGFkZHJlc3MgdGhlIGZpcnN0IGNhc2Ugd2hlbiByZW5kZXJpbmcgYSBjdXN0b20gZWxlbWVudCwgYHN0eWxlRWxlbWVudGBcbiAqIHNob3VsZCBiZSBjYWxsZWQgaW4gdGhlIGVsZW1lbnQncyBgY29ubmVjdGVkQ2FsbGJhY2tgLlxuICpcbiAqICogU2hpbW1lZCBjdXN0b20gcHJvcGVydGllcyBtYXkgb25seSBiZSBkZWZpbmVkIGVpdGhlciBmb3IgYW4gZW50aXJlXG4gKiBzaGFkb3dSb290IChmb3IgZXhhbXBsZSwgaW4gYSBgOmhvc3RgIHJ1bGUpIG9yIHZpYSBhIHJ1bGUgdGhhdCBkaXJlY3RseVxuICogbWF0Y2hlcyBhbiBlbGVtZW50IHdpdGggYSBzaGFkb3dSb290LiBJbiBvdGhlciB3b3JkcywgaW5zdGVhZCBvZiBmbG93aW5nIGZyb21cbiAqIHBhcmVudCB0byBjaGlsZCBhcyBkbyBuYXRpdmUgY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCBzaGltbWVkIGN1c3RvbSBwcm9wZXJ0aWVzXG4gKiBmbG93IG9ubHkgZnJvbSBzaGFkb3dSb290cyB0byBuZXN0ZWQgc2hhZG93Um9vdHMuXG4gKlxuICogKiBXaGVuIHVzaW5nIGBAYXBwbHlgIG1peGluZyBjc3Mgc2hvcnRoYW5kIHByb3BlcnR5IG5hbWVzIHdpdGhcbiAqIG5vbi1zaG9ydGhhbmQgbmFtZXMgKGZvciBleGFtcGxlIGBib3JkZXJgIGFuZCBgYm9yZGVyLXdpZHRoYCkgaXMgbm90XG4gKiBzdXBwb3J0ZWQuXG4gKi9cbmV4cG9ydCBjb25zdCByZW5kZXIgPSAocmVzdWx0LCBjb250YWluZXIsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCBzY29wZU5hbWUgPSBvcHRpb25zLnNjb3BlTmFtZTtcbiAgICBjb25zdCBoYXNSZW5kZXJlZCA9IHBhcnRzLmhhcyhjb250YWluZXIpO1xuICAgIGNvbnN0IG5lZWRzU2NvcGluZyA9IGNvbnRhaW5lciBpbnN0YW5jZW9mIFNoYWRvd1Jvb3QgJiZcbiAgICAgICAgY29tcGF0aWJsZVNoYWR5Q1NTVmVyc2lvbiAmJiByZXN1bHQgaW5zdGFuY2VvZiBUZW1wbGF0ZVJlc3VsdDtcbiAgICAvLyBIYW5kbGUgZmlyc3QgcmVuZGVyIHRvIGEgc2NvcGUgc3BlY2lhbGx5Li4uXG4gICAgY29uc3QgZmlyc3RTY29wZVJlbmRlciA9IG5lZWRzU2NvcGluZyAmJiAhc2hhZHlSZW5kZXJTZXQuaGFzKHNjb3BlTmFtZSk7XG4gICAgLy8gT24gZmlyc3Qgc2NvcGUgcmVuZGVyLCByZW5kZXIgaW50byBhIGZyYWdtZW50OyB0aGlzIGNhbm5vdCBiZSBhIHNpbmdsZVxuICAgIC8vIGZyYWdtZW50IHRoYXQgaXMgcmV1c2VkIHNpbmNlIG5lc3RlZCByZW5kZXJzIGNhbiBvY2N1ciBzeW5jaHJvbm91c2x5LlxuICAgIGNvbnN0IHJlbmRlckNvbnRhaW5lciA9IGZpcnN0U2NvcGVSZW5kZXIgPyBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCkgOiBjb250YWluZXI7XG4gICAgbGl0UmVuZGVyKHJlc3VsdCwgcmVuZGVyQ29udGFpbmVyLCBPYmplY3QuYXNzaWduKHsgdGVtcGxhdGVGYWN0b3J5OiBzaGFkeVRlbXBsYXRlRmFjdG9yeShzY29wZU5hbWUpIH0sIG9wdGlvbnMpKTtcbiAgICAvLyBXaGVuIHBlcmZvcm1pbmcgZmlyc3Qgc2NvcGUgcmVuZGVyLFxuICAgIC8vICgxKSBXZSd2ZSByZW5kZXJlZCBpbnRvIGEgZnJhZ21lbnQgc28gdGhhdCB0aGVyZSdzIGEgY2hhbmNlIHRvXG4gICAgLy8gYHByZXBhcmVUZW1wbGF0ZVN0eWxlc2AgYmVmb3JlIHN1Yi1lbGVtZW50cyBoaXQgdGhlIERPTVxuICAgIC8vICh3aGljaCBtaWdodCBjYXVzZSB0aGVtIHRvIHJlbmRlciBiYXNlZCBvbiBhIGNvbW1vbiBwYXR0ZXJuIG9mXG4gICAgLy8gcmVuZGVyaW5nIGluIGEgY3VzdG9tIGVsZW1lbnQncyBgY29ubmVjdGVkQ2FsbGJhY2tgKTtcbiAgICAvLyAoMikgU2NvcGUgdGhlIHRlbXBsYXRlIHdpdGggU2hhZHlDU1Mgb25lIHRpbWUgb25seSBmb3IgdGhpcyBzY29wZS5cbiAgICAvLyAoMykgUmVuZGVyIHRoZSBmcmFnbWVudCBpbnRvIHRoZSBjb250YWluZXIgYW5kIG1ha2Ugc3VyZSB0aGVcbiAgICAvLyBjb250YWluZXIga25vd3MgaXRzIGBwYXJ0YCBpcyB0aGUgb25lIHdlIGp1c3QgcmVuZGVyZWQuIFRoaXMgZW5zdXJlc1xuICAgIC8vIERPTSB3aWxsIGJlIHJlLXVzZWQgb24gc3Vic2VxdWVudCByZW5kZXJzLlxuICAgIGlmIChmaXJzdFNjb3BlUmVuZGVyKSB7XG4gICAgICAgIGNvbnN0IHBhcnQgPSBwYXJ0cy5nZXQocmVuZGVyQ29udGFpbmVyKTtcbiAgICAgICAgcGFydHMuZGVsZXRlKHJlbmRlckNvbnRhaW5lcik7XG4gICAgICAgIGlmIChwYXJ0LnZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVJbnN0YW5jZSkge1xuICAgICAgICAgICAgcHJlcGFyZVRlbXBsYXRlU3R5bGVzKHJlbmRlckNvbnRhaW5lciwgcGFydC52YWx1ZS50ZW1wbGF0ZSwgc2NvcGVOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZW1vdmVOb2Rlcyhjb250YWluZXIsIGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvbnRhaW5lcik7XG4gICAgICAgIHBhcnRzLnNldChjb250YWluZXIsIHBhcnQpO1xuICAgIH1cbiAgICAvLyBBZnRlciBlbGVtZW50cyBoYXZlIGhpdCB0aGUgRE9NLCB1cGRhdGUgc3R5bGluZyBpZiB0aGlzIGlzIHRoZVxuICAgIC8vIGluaXRpYWwgcmVuZGVyIHRvIHRoaXMgY29udGFpbmVyLlxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIHdoZW5ldmVyIGR5bmFtaWMgY2hhbmdlcyBhcmUgbWFkZSBzbyBpdCB3b3VsZCBiZVxuICAgIC8vIHNhZmVzdCB0byBkbyBldmVyeSByZW5kZXI7IGhvd2V2ZXIsIHRoaXMgd291bGQgcmVncmVzcyBwZXJmb3JtYW5jZVxuICAgIC8vIHNvIHdlIGxlYXZlIGl0IHVwIHRvIHRoZSB1c2VyIHRvIGNhbGwgYFNoYWR5Q1NTUy5zdHlsZUVsZW1lbnRgXG4gICAgLy8gZm9yIGR5bmFtaWMgY2hhbmdlcy5cbiAgICBpZiAoIWhhc1JlbmRlcmVkICYmIG5lZWRzU2NvcGluZykge1xuICAgICAgICB3aW5kb3cuU2hhZHlDU1Muc3R5bGVFbGVtZW50KGNvbnRhaW5lci5ob3N0KTtcbiAgICB9XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2hhZHktcmVuZGVyLmpzLm1hcCIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cbi8qKlxuICogV2hlbiB1c2luZyBDbG9zdXJlIENvbXBpbGVyLCBKU0NvbXBpbGVyX3JlbmFtZVByb3BlcnR5KHByb3BlcnR5LCBvYmplY3QpIGlzXG4gKiByZXBsYWNlZCBhdCBjb21waWxlIHRpbWUgYnkgdGhlIG11bmdlZCBuYW1lIGZvciBvYmplY3RbcHJvcGVydHldLiBXZSBjYW5ub3RcbiAqIGFsaWFzIHRoaXMgZnVuY3Rpb24sIHNvIHdlIGhhdmUgdG8gdXNlIGEgc21hbGwgc2hpbSB0aGF0IGhhcyB0aGUgc2FtZVxuICogYmVoYXZpb3Igd2hlbiBub3QgY29tcGlsaW5nLlxuICovXG53aW5kb3cuSlNDb21waWxlcl9yZW5hbWVQcm9wZXJ0eSA9XG4gICAgKHByb3AsIF9vYmopID0+IHByb3A7XG5leHBvcnQgY29uc3QgZGVmYXVsdENvbnZlcnRlciA9IHtcbiAgICB0b0F0dHJpYnV0ZSh2YWx1ZSwgdHlwZSkge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQm9vbGVhbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPyAnJyA6IG51bGw7XG4gICAgICAgICAgICBjYXNlIE9iamVjdDpcbiAgICAgICAgICAgIGNhc2UgQXJyYXk6XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIGlzIGBudWxsYCBvciBgdW5kZWZpbmVkYCBwYXNzIHRoaXMgdGhyb3VnaFxuICAgICAgICAgICAgICAgIC8vIHRvIGFsbG93IHJlbW92aW5nL25vIGNoYW5nZSBiZWhhdmlvci5cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIGZyb21BdHRyaWJ1dGUodmFsdWUsIHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIEJvb2xlYW46XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlICE9PSBudWxsO1xuICAgICAgICAgICAgY2FzZSBOdW1iZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsID8gbnVsbCA6IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICBjYXNlIE9iamVjdDpcbiAgICAgICAgICAgIGNhc2UgQXJyYXk6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuLyoqXG4gKiBDaGFuZ2UgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRydWUgaWYgYHZhbHVlYCBpcyBkaWZmZXJlbnQgZnJvbSBgb2xkVmFsdWVgLlxuICogVGhpcyBtZXRob2QgaXMgdXNlZCBhcyB0aGUgZGVmYXVsdCBmb3IgYSBwcm9wZXJ0eSdzIGBoYXNDaGFuZ2VkYCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vdEVxdWFsID0gKHZhbHVlLCBvbGQpID0+IHtcbiAgICAvLyBUaGlzIGVuc3VyZXMgKG9sZD09TmFOLCB2YWx1ZT09TmFOKSBhbHdheXMgcmV0dXJucyBmYWxzZVxuICAgIHJldHVybiBvbGQgIT09IHZhbHVlICYmIChvbGQgPT09IG9sZCB8fCB2YWx1ZSA9PT0gdmFsdWUpO1xufTtcbmNvbnN0IGRlZmF1bHRQcm9wZXJ0eURlY2xhcmF0aW9uID0ge1xuICAgIGF0dHJpYnV0ZTogdHJ1ZSxcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgY29udmVydGVyOiBkZWZhdWx0Q29udmVydGVyLFxuICAgIHJlZmxlY3Q6IGZhbHNlLFxuICAgIGhhc0NoYW5nZWQ6IG5vdEVxdWFsXG59O1xuY29uc3QgbWljcm90YXNrUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSh0cnVlKTtcbmNvbnN0IFNUQVRFX0hBU19VUERBVEVEID0gMTtcbmNvbnN0IFNUQVRFX1VQREFURV9SRVFVRVNURUQgPSAxIDw8IDI7XG5jb25zdCBTVEFURV9JU19SRUZMRUNUSU5HX1RPX0FUVFJJQlVURSA9IDEgPDwgMztcbmNvbnN0IFNUQVRFX0lTX1JFRkxFQ1RJTkdfVE9fUFJPUEVSVFkgPSAxIDw8IDQ7XG5jb25zdCBTVEFURV9IQVNfQ09OTkVDVEVEID0gMSA8PCA1O1xuLyoqXG4gKiBCYXNlIGVsZW1lbnQgY2xhc3Mgd2hpY2ggbWFuYWdlcyBlbGVtZW50IHByb3BlcnRpZXMgYW5kIGF0dHJpYnV0ZXMuIFdoZW5cbiAqIHByb3BlcnRpZXMgY2hhbmdlLCB0aGUgYHVwZGF0ZWAgbWV0aG9kIGlzIGFzeW5jaHJvbm91c2x5IGNhbGxlZC4gVGhpcyBtZXRob2RcbiAqIHNob3VsZCBiZSBzdXBwbGllZCBieSBzdWJjbGFzc2VycyB0byByZW5kZXIgdXBkYXRlcyBhcyBkZXNpcmVkLlxuICovXG5leHBvcnQgY2xhc3MgVXBkYXRpbmdFbGVtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IDA7XG4gICAgICAgIHRoaXMuX2luc3RhbmNlUHJvcGVydGllcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fdXBkYXRlUHJvbWlzZSA9IG1pY3JvdGFza1Byb21pc2U7XG4gICAgICAgIHRoaXMuX2hhc0Nvbm5lY3RlZFJlc29sdmVyID0gdW5kZWZpbmVkO1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFwIHdpdGgga2V5cyBmb3IgYW55IHByb3BlcnRpZXMgdGhhdCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3RcbiAgICAgICAgICogdXBkYXRlIGN5Y2xlIHdpdGggcHJldmlvdXMgdmFsdWVzLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fY2hhbmdlZFByb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYXAgd2l0aCBrZXlzIG9mIHByb3BlcnRpZXMgdGhhdCBzaG91bGQgYmUgcmVmbGVjdGVkIHdoZW4gdXBkYXRlZC5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3JlZmxlY3RpbmdQcm9wZXJ0aWVzID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGxpc3Qgb2YgYXR0cmlidXRlcyBjb3JyZXNwb25kaW5nIHRvIHRoZSByZWdpc3RlcmVkIHByb3BlcnRpZXMuXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcbiAgICAgICAgLy8gbm90ZTogcGlnZ3kgYmFja2luZyBvbiB0aGlzIHRvIGVuc3VyZSB3ZSdyZSBmaW5hbGl6ZWQuXG4gICAgICAgIHRoaXMuZmluYWxpemUoKTtcbiAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IFtdO1xuICAgICAgICAvLyBVc2UgZm9yRWFjaCBzbyB0aGlzIHdvcmtzIGV2ZW4gaWYgZm9yL29mIGxvb3BzIGFyZSBjb21waWxlZCB0byBmb3IgbG9vcHNcbiAgICAgICAgLy8gZXhwZWN0aW5nIGFycmF5c1xuICAgICAgICB0aGlzLl9jbGFzc1Byb3BlcnRpZXMuZm9yRWFjaCgodiwgcCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXMuX2F0dHJpYnV0ZU5hbWVGb3JQcm9wZXJ0eShwLCB2KTtcbiAgICAgICAgICAgIGlmIChhdHRyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRyaWJ1dGVUb1Byb3BlcnR5TWFwLnNldChhdHRyLCBwKTtcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLnB1c2goYXR0cik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5zdXJlcyB0aGUgcHJpdmF0ZSBgX2NsYXNzUHJvcGVydGllc2AgcHJvcGVydHkgbWV0YWRhdGEgaXMgY3JlYXRlZC5cbiAgICAgKiBJbiBhZGRpdGlvbiB0byBgZmluYWxpemVgIHRoaXMgaXMgYWxzbyBjYWxsZWQgaW4gYGNyZWF0ZVByb3BlcnR5YCB0b1xuICAgICAqIGVuc3VyZSB0aGUgYEBwcm9wZXJ0eWAgZGVjb3JhdG9yIGNhbiBhZGQgcHJvcGVydHkgbWV0YWRhdGEuXG4gICAgICovXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgc3RhdGljIF9lbnN1cmVDbGFzc1Byb3BlcnRpZXMoKSB7XG4gICAgICAgIC8vIGVuc3VyZSBwcml2YXRlIHN0b3JhZ2UgZm9yIHByb3BlcnR5IGRlY2xhcmF0aW9ucy5cbiAgICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KEpTQ29tcGlsZXJfcmVuYW1lUHJvcGVydHkoJ19jbGFzc1Byb3BlcnRpZXMnLCB0aGlzKSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NsYXNzUHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIC8vIE5PVEU6IFdvcmthcm91bmQgSUUxMSBub3Qgc3VwcG9ydGluZyBNYXAgY29uc3RydWN0b3IgYXJndW1lbnQuXG4gICAgICAgICAgICBjb25zdCBzdXBlclByb3BlcnRpZXMgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykuX2NsYXNzUHJvcGVydGllcztcbiAgICAgICAgICAgIGlmIChzdXBlclByb3BlcnRpZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHN1cGVyUHJvcGVydGllcy5mb3JFYWNoKCh2LCBrKSA9PiB0aGlzLl9jbGFzc1Byb3BlcnRpZXMuc2V0KGssIHYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcHJvcGVydHkgYWNjZXNzb3Igb24gdGhlIGVsZW1lbnQgcHJvdG90eXBlIGlmIG9uZSBkb2VzIG5vdCBleGlzdC5cbiAgICAgKiBUaGUgcHJvcGVydHkgc2V0dGVyIGNhbGxzIHRoZSBwcm9wZXJ0eSdzIGBoYXNDaGFuZ2VkYCBwcm9wZXJ0eSBvcHRpb25cbiAgICAgKiBvciB1c2VzIGEgc3RyaWN0IGlkZW50aXR5IGNoZWNrIHRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB0byByZXF1ZXN0XG4gICAgICogYW4gdXBkYXRlLlxuICAgICAqIEBub2NvbGxhcHNlXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZVByb3BlcnR5KG5hbWUsIG9wdGlvbnMgPSBkZWZhdWx0UHJvcGVydHlEZWNsYXJhdGlvbikge1xuICAgICAgICAvLyBOb3RlLCBzaW5jZSB0aGlzIGNhbiBiZSBjYWxsZWQgYnkgdGhlIGBAcHJvcGVydHlgIGRlY29yYXRvciB3aGljaFxuICAgICAgICAvLyBpcyBjYWxsZWQgYmVmb3JlIGBmaW5hbGl6ZWAsIHdlIGVuc3VyZSBzdG9yYWdlIGV4aXN0cyBmb3IgcHJvcGVydHlcbiAgICAgICAgLy8gbWV0YWRhdGEuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUNsYXNzUHJvcGVydGllcygpO1xuICAgICAgICB0aGlzLl9jbGFzc1Byb3BlcnRpZXMuc2V0KG5hbWUsIG9wdGlvbnMpO1xuICAgICAgICAvLyBEbyBub3QgZ2VuZXJhdGUgYW4gYWNjZXNzb3IgaWYgdGhlIHByb3RvdHlwZSBhbHJlYWR5IGhhcyBvbmUsIHNpbmNlXG4gICAgICAgIC8vIGl0IHdvdWxkIGJlIGxvc3Qgb3RoZXJ3aXNlIGFuZCB0aGF0IHdvdWxkIG5ldmVyIGJlIHRoZSB1c2VyJ3MgaW50ZW50aW9uO1xuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBleHBlY3QgdXNlcnMgdG8gY2FsbCBgcmVxdWVzdFVwZGF0ZWAgdGhlbXNlbHZlcyBmcm9tXG4gICAgICAgIC8vIHVzZXItZGVmaW5lZCBhY2Nlc3NvcnMuIE5vdGUgdGhhdCBpZiB0aGUgc3VwZXIgaGFzIGFuIGFjY2Vzc29yIHdlIHdpbGxcbiAgICAgICAgLy8gc3RpbGwgb3ZlcndyaXRlIGl0XG4gICAgICAgIGlmIChvcHRpb25zLm5vQWNjZXNzb3IgfHwgdGhpcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXkgPSB0eXBlb2YgbmFtZSA9PT0gJ3N5bWJvbCcgPyBTeW1ib2woKSA6IGBfXyR7bmFtZX1gO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5wcm90b3R5cGUsIG5hbWUsIHtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgbm8gc3ltYm9sIGluIGluZGV4XG4gICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBubyBzeW1ib2wgaW4gaW5kZXhcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgbm8gc3ltYm9sIGluIGluZGV4XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0aGlzW25hbWVdO1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgbm8gc3ltYm9sIGluIGluZGV4XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0VXBkYXRlKG5hbWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHByb3BlcnR5IGFjY2Vzc29ycyBmb3IgcmVnaXN0ZXJlZCBwcm9wZXJ0aWVzIGFuZCBlbnN1cmVzXG4gICAgICogYW55IHN1cGVyY2xhc3NlcyBhcmUgYWxzbyBmaW5hbGl6ZWQuXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgZmluYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KEpTQ29tcGlsZXJfcmVuYW1lUHJvcGVydHkoJ2ZpbmFsaXplZCcsIHRoaXMpKSAmJlxuICAgICAgICAgICAgdGhpcy5maW5hbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBmaW5hbGl6ZSBhbnkgc3VwZXJjbGFzc2VzXG4gICAgICAgIGNvbnN0IHN1cGVyQ3RvciA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKTtcbiAgICAgICAgaWYgKHR5cGVvZiBzdXBlckN0b3IuZmluYWxpemUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHN1cGVyQ3Rvci5maW5hbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2xhc3NQcm9wZXJ0aWVzKCk7XG4gICAgICAgIC8vIGluaXRpYWxpemUgTWFwIHBvcHVsYXRlZCBpbiBvYnNlcnZlZEF0dHJpYnV0ZXNcbiAgICAgICAgdGhpcy5fYXR0cmlidXRlVG9Qcm9wZXJ0eU1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgLy8gbWFrZSBhbnkgcHJvcGVydGllc1xuICAgICAgICAvLyBOb3RlLCBvbmx5IHByb2Nlc3MgXCJvd25cIiBwcm9wZXJ0aWVzIHNpbmNlIHRoaXMgZWxlbWVudCB3aWxsIGluaGVyaXRcbiAgICAgICAgLy8gYW55IHByb3BlcnRpZXMgZGVmaW5lZCBvbiB0aGUgc3VwZXJDbGFzcywgYW5kIGZpbmFsaXphdGlvbiBlbnN1cmVzXG4gICAgICAgIC8vIHRoZSBlbnRpcmUgcHJvdG90eXBlIGNoYWluIGlzIGZpbmFsaXplZC5cbiAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoSlNDb21waWxlcl9yZW5hbWVQcm9wZXJ0eSgncHJvcGVydGllcycsIHRoaXMpKSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BlcnRpZXM7XG4gICAgICAgICAgICAvLyBzdXBwb3J0IHN5bWJvbHMgaW4gcHJvcGVydGllcyAoSUUxMSBkb2VzIG5vdCBzdXBwb3J0IHRoaXMpXG4gICAgICAgICAgICBjb25zdCBwcm9wS2V5cyA9IFtcbiAgICAgICAgICAgICAgICAuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm9wcyksXG4gICAgICAgICAgICAgICAgLi4uKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSAnZnVuY3Rpb24nKSA/XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocHJvcHMpIDpcbiAgICAgICAgICAgICAgICAgICAgW11cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICAvLyBUaGlzIGZvci9vZiBpcyBvayBiZWNhdXNlIHByb3BLZXlzIGlzIGFuIGFycmF5XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHAgb2YgcHJvcEtleXMpIHtcbiAgICAgICAgICAgICAgICAvLyBub3RlLCB1c2Ugb2YgYGFueWAgaXMgZHVlIHRvIFR5cGVTcmlwdCBsYWNrIG9mIHN1cHBvcnQgZm9yIHN5bWJvbCBpblxuICAgICAgICAgICAgICAgIC8vIGluZGV4IHR5cGVzXG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBubyBzeW1ib2wgaW4gaW5kZXhcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVByb3BlcnR5KHAsIHByb3BzW3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcm9wZXJ0eSBuYW1lIGZvciB0aGUgZ2l2ZW4gYXR0cmlidXRlIGBuYW1lYC5cbiAgICAgKiBAbm9jb2xsYXBzZVxuICAgICAqL1xuICAgIHN0YXRpYyBfYXR0cmlidXRlTmFtZUZvclByb3BlcnR5KG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgYXR0cmlidXRlID0gb3B0aW9ucy5hdHRyaWJ1dGU7XG4gICAgICAgIHJldHVybiBhdHRyaWJ1dGUgPT09IGZhbHNlID9cbiAgICAgICAgICAgIHVuZGVmaW5lZCA6XG4gICAgICAgICAgICAodHlwZW9mIGF0dHJpYnV0ZSA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZSA6XG4gICAgICAgICAgICAgICAgKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyA/IG5hbWUudG9Mb3dlckNhc2UoKSA6IHVuZGVmaW5lZCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgYSBwcm9wZXJ0eSBzaG91bGQgcmVxdWVzdCBhbiB1cGRhdGUuXG4gICAgICogQ2FsbGVkIHdoZW4gYSBwcm9wZXJ0eSB2YWx1ZSBpcyBzZXQgYW5kIHVzZXMgdGhlIGBoYXNDaGFuZ2VkYFxuICAgICAqIG9wdGlvbiBmb3IgdGhlIHByb3BlcnR5IGlmIHByZXNlbnQgb3IgYSBzdHJpY3QgaWRlbnRpdHkgY2hlY2suXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgX3ZhbHVlSGFzQ2hhbmdlZCh2YWx1ZSwgb2xkLCBoYXNDaGFuZ2VkID0gbm90RXF1YWwpIHtcbiAgICAgICAgcmV0dXJuIGhhc0NoYW5nZWQodmFsdWUsIG9sZCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgZ2l2ZW4gYXR0cmlidXRlIHZhbHVlLlxuICAgICAqIENhbGxlZCB2aWEgdGhlIGBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2tgIGFuZCB1c2VzIHRoZSBwcm9wZXJ0eSdzXG4gICAgICogYGNvbnZlcnRlcmAgb3IgYGNvbnZlcnRlci5mcm9tQXR0cmlidXRlYCBwcm9wZXJ0eSBvcHRpb24uXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgX3Byb3BlcnR5VmFsdWVGcm9tQXR0cmlidXRlKHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBvcHRpb25zLnR5cGU7XG4gICAgICAgIGNvbnN0IGNvbnZlcnRlciA9IG9wdGlvbnMuY29udmVydGVyIHx8IGRlZmF1bHRDb252ZXJ0ZXI7XG4gICAgICAgIGNvbnN0IGZyb21BdHRyaWJ1dGUgPSAodHlwZW9mIGNvbnZlcnRlciA9PT0gJ2Z1bmN0aW9uJyA/IGNvbnZlcnRlciA6IGNvbnZlcnRlci5mcm9tQXR0cmlidXRlKTtcbiAgICAgICAgcmV0dXJuIGZyb21BdHRyaWJ1dGUgPyBmcm9tQXR0cmlidXRlKHZhbHVlLCB0eXBlKSA6IHZhbHVlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBwcm9wZXJ0eSB2YWx1ZS4gSWYgdGhpc1xuICAgICAqIHJldHVybnMgdW5kZWZpbmVkLCB0aGUgcHJvcGVydHkgd2lsbCAqbm90KiBiZSByZWZsZWN0ZWQgdG8gYW4gYXR0cmlidXRlLlxuICAgICAqIElmIHRoaXMgcmV0dXJucyBudWxsLCB0aGUgYXR0cmlidXRlIHdpbGwgYmUgcmVtb3ZlZCwgb3RoZXJ3aXNlIHRoZVxuICAgICAqIGF0dHJpYnV0ZSB3aWxsIGJlIHNldCB0byB0aGUgdmFsdWUuXG4gICAgICogVGhpcyB1c2VzIHRoZSBwcm9wZXJ0eSdzIGByZWZsZWN0YCBhbmQgYHR5cGUudG9BdHRyaWJ1dGVgIHByb3BlcnR5IG9wdGlvbnMuXG4gICAgICogQG5vY29sbGFwc2VcbiAgICAgKi9cbiAgICBzdGF0aWMgX3Byb3BlcnR5VmFsdWVUb0F0dHJpYnV0ZSh2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucy5yZWZsZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0eXBlID0gb3B0aW9ucy50eXBlO1xuICAgICAgICBjb25zdCBjb252ZXJ0ZXIgPSBvcHRpb25zLmNvbnZlcnRlcjtcbiAgICAgICAgY29uc3QgdG9BdHRyaWJ1dGUgPSBjb252ZXJ0ZXIgJiYgY29udmVydGVyLnRvQXR0cmlidXRlIHx8XG4gICAgICAgICAgICBkZWZhdWx0Q29udmVydGVyLnRvQXR0cmlidXRlO1xuICAgICAgICByZXR1cm4gdG9BdHRyaWJ1dGUodmFsdWUsIHR5cGUpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBlbGVtZW50IGluaXRpYWxpemF0aW9uLiBCeSBkZWZhdWx0IGNhcHR1cmVzIGFueSBwcmUtc2V0IHZhbHVlcyBmb3JcbiAgICAgKiByZWdpc3RlcmVkIHByb3BlcnRpZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdGhpcy5fc2F2ZUluc3RhbmNlUHJvcGVydGllcygpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXhlcyBhbnkgcHJvcGVydGllcyBzZXQgb24gdGhlIGluc3RhbmNlIGJlZm9yZSB1cGdyYWRlIHRpbWUuXG4gICAgICogT3RoZXJ3aXNlIHRoZXNlIHdvdWxkIHNoYWRvdyB0aGUgYWNjZXNzb3IgYW5kIGJyZWFrIHRoZXNlIHByb3BlcnRpZXMuXG4gICAgICogVGhlIHByb3BlcnRpZXMgYXJlIHN0b3JlZCBpbiBhIE1hcCB3aGljaCBpcyBwbGF5ZWQgYmFjayBhZnRlciB0aGVcbiAgICAgKiBjb25zdHJ1Y3RvciBydW5zLiBOb3RlLCBvbiB2ZXJ5IG9sZCB2ZXJzaW9ucyBvZiBTYWZhcmkgKDw9OSkgb3IgQ2hyb21lXG4gICAgICogKDw9NDEpLCBwcm9wZXJ0aWVzIGNyZWF0ZWQgZm9yIG5hdGl2ZSBwbGF0Zm9ybSBwcm9wZXJ0aWVzIGxpa2UgKGBpZGAgb3JcbiAgICAgKiBgbmFtZWApIG1heSBub3QgaGF2ZSBkZWZhdWx0IHZhbHVlcyBzZXQgaW4gdGhlIGVsZW1lbnQgY29uc3RydWN0b3IuIE9uXG4gICAgICogdGhlc2UgYnJvd3NlcnMgbmF0aXZlIHByb3BlcnRpZXMgYXBwZWFyIG9uIGluc3RhbmNlcyBhbmQgdGhlcmVmb3JlIHRoZWlyXG4gICAgICogZGVmYXVsdCB2YWx1ZSB3aWxsIG92ZXJ3cml0ZSBhbnkgZWxlbWVudCBkZWZhdWx0IChlLmcuIGlmIHRoZSBlbGVtZW50IHNldHNcbiAgICAgKiB0aGlzLmlkID0gJ2lkJyBpbiB0aGUgY29uc3RydWN0b3IsIHRoZSAnaWQnIHdpbGwgYmVjb21lICcnIHNpbmNlIHRoaXMgaXNcbiAgICAgKiB0aGUgbmF0aXZlIHBsYXRmb3JtIGRlZmF1bHQpLlxuICAgICAqL1xuICAgIF9zYXZlSW5zdGFuY2VQcm9wZXJ0aWVzKCkge1xuICAgICAgICAvLyBVc2UgZm9yRWFjaCBzbyB0aGlzIHdvcmtzIGV2ZW4gaWYgZm9yL29mIGxvb3BzIGFyZSBjb21waWxlZCB0byBmb3IgbG9vcHNcbiAgICAgICAgLy8gZXhwZWN0aW5nIGFycmF5c1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yXG4gICAgICAgICAgICAuX2NsYXNzUHJvcGVydGllcy5mb3JFYWNoKChfdiwgcCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXNbcF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbcF07XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5zdGFuY2VQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMuc2V0KHAsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgcHJldmlvdXNseSBzYXZlZCBpbnN0YW5jZSBwcm9wZXJ0aWVzLlxuICAgICAqL1xuICAgIF9hcHBseUluc3RhbmNlUHJvcGVydGllcygpIHtcbiAgICAgICAgLy8gVXNlIGZvckVhY2ggc28gdGhpcyB3b3JrcyBldmVuIGlmIGZvci9vZiBsb29wcyBhcmUgY29tcGlsZWQgdG8gZm9yIGxvb3BzXG4gICAgICAgIC8vIGV4cGVjdGluZyBhcnJheXNcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICB0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMuZm9yRWFjaCgodiwgcCkgPT4gdGhpc1twXSA9IHYpO1xuICAgICAgICB0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlIHwgU1RBVEVfSEFTX0NPTk5FQ1RFRDtcbiAgICAgICAgLy8gRW5zdXJlIGNvbm5lY3Rpb24gdHJpZ2dlcnMgYW4gdXBkYXRlLiBVcGRhdGVzIGNhbm5vdCBjb21wbGV0ZSBiZWZvcmVcbiAgICAgICAgLy8gY29ubmVjdGlvbiBhbmQgaWYgb25lIGlzIHBlbmRpbmcgY29ubmVjdGlvbiB0aGUgYF9oYXNDb25uZWN0aW9uUmVzb2x2ZXJgXG4gICAgICAgIC8vIHdpbGwgZXhpc3QuIElmIHNvLCByZXNvbHZlIGl0IHRvIGNvbXBsZXRlIHRoZSB1cGRhdGUsIG90aGVyd2lzZVxuICAgICAgICAvLyByZXF1ZXN0VXBkYXRlLlxuICAgICAgICBpZiAodGhpcy5faGFzQ29ubmVjdGVkUmVzb2x2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2hhc0Nvbm5lY3RlZFJlc29sdmVyKCk7XG4gICAgICAgICAgICB0aGlzLl9oYXNDb25uZWN0ZWRSZXNvbHZlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFsbG93cyBmb3IgYHN1cGVyLmRpc2Nvbm5lY3RlZENhbGxiYWNrKClgIGluIGV4dGVuc2lvbnMgd2hpbGVcbiAgICAgKiByZXNlcnZpbmcgdGhlIHBvc3NpYmlsaXR5IG9mIG1ha2luZyBub24tYnJlYWtpbmcgZmVhdHVyZSBhZGRpdGlvbnNcbiAgICAgKiB3aGVuIGRpc2Nvbm5lY3RpbmcgYXQgc29tZSBwb2ludCBpbiB0aGUgZnV0dXJlLlxuICAgICAqL1xuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTeW5jaHJvbml6ZXMgcHJvcGVydHkgdmFsdWVzIHdoZW4gYXR0cmlidXRlcyBjaGFuZ2UuXG4gICAgICovXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKG9sZCAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2F0dHJpYnV0ZVRvUHJvcGVydHkobmFtZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9wZXJ0eVRvQXR0cmlidXRlKG5hbWUsIHZhbHVlLCBvcHRpb25zID0gZGVmYXVsdFByb3BlcnR5RGVjbGFyYXRpb24pIHtcbiAgICAgICAgY29uc3QgY3RvciA9IHRoaXMuY29uc3RydWN0b3I7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBjdG9yLl9hdHRyaWJ1dGVOYW1lRm9yUHJvcGVydHkobmFtZSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChhdHRyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJWYWx1ZSA9IGN0b3IuX3Byb3BlcnR5VmFsdWVUb0F0dHJpYnV0ZSh2YWx1ZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAvLyBhbiB1bmRlZmluZWQgdmFsdWUgZG9lcyBub3QgY2hhbmdlIHRoZSBhdHRyaWJ1dGUuXG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUcmFjayBpZiB0aGUgcHJvcGVydHkgaXMgYmVpbmcgcmVmbGVjdGVkIHRvIGF2b2lkXG4gICAgICAgICAgICAvLyBzZXR0aW5nIHRoZSBwcm9wZXJ0eSBhZ2FpbiB2aWEgYGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja2AuIE5vdGU6XG4gICAgICAgICAgICAvLyAxLiB0aGlzIHRha2VzIGFkdmFudGFnZSBvZiB0aGUgZmFjdCB0aGF0IHRoZSBjYWxsYmFjayBpcyBzeW5jaHJvbm91cy5cbiAgICAgICAgICAgIC8vIDIuIHdpbGwgYmVoYXZlIGluY29ycmVjdGx5IGlmIG11bHRpcGxlIGF0dHJpYnV0ZXMgYXJlIGluIHRoZSByZWFjdGlvblxuICAgICAgICAgICAgLy8gc3RhY2sgYXQgdGltZSBvZiBjYWxsaW5nLiBIb3dldmVyLCBzaW5jZSB3ZSBwcm9jZXNzIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgIC8vIGluIGB1cGRhdGVgIHRoaXMgc2hvdWxkIG5vdCBiZSBwb3NzaWJsZSAob3IgYW4gZXh0cmVtZSBjb3JuZXIgY2FzZVxuICAgICAgICAgICAgLy8gdGhhdCB3ZSdkIGxpa2UgdG8gZGlzY292ZXIpLlxuICAgICAgICAgICAgLy8gbWFyayBzdGF0ZSByZWZsZWN0aW5nXG4gICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlIHwgU1RBVEVfSVNfUkVGTEVDVElOR19UT19BVFRSSUJVVEU7XG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKGF0dHIsIGF0dHJWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBtYXJrIHN0YXRlIG5vdCByZWZsZWN0aW5nXG4gICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlICYgflNUQVRFX0lTX1JFRkxFQ1RJTkdfVE9fQVRUUklCVVRFO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9hdHRyaWJ1dGVUb1Byb3BlcnR5KG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIC8vIFVzZSB0cmFja2luZyBpbmZvIHRvIGF2b2lkIGRlc2VyaWFsaXppbmcgYXR0cmlidXRlIHZhbHVlIGlmIGl0IHdhc1xuICAgICAgICAvLyBqdXN0IHNldCBmcm9tIGEgcHJvcGVydHkgc2V0dGVyLlxuICAgICAgICBpZiAodGhpcy5fdXBkYXRlU3RhdGUgJiBTVEFURV9JU19SRUZMRUNUSU5HX1RPX0FUVFJJQlVURSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGN0b3IuX2F0dHJpYnV0ZVRvUHJvcGVydHlNYXAuZ2V0KG5hbWUpO1xuICAgICAgICBpZiAocHJvcE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGN0b3IuX2NsYXNzUHJvcGVydGllcy5nZXQocHJvcE5hbWUpIHx8IGRlZmF1bHRQcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgLy8gbWFyayBzdGF0ZSByZWZsZWN0aW5nXG4gICAgICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlIHwgU1RBVEVfSVNfUkVGTEVDVElOR19UT19QUk9QRVJUWTtcbiAgICAgICAgICAgIHRoaXNbcHJvcE5hbWVdID1cbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgY3Rvci5fcHJvcGVydHlWYWx1ZUZyb21BdHRyaWJ1dGUodmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgLy8gbWFyayBzdGF0ZSBub3QgcmVmbGVjdGluZ1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlU3RhdGUgPSB0aGlzLl91cGRhdGVTdGF0ZSAmIH5TVEFURV9JU19SRUZMRUNUSU5HX1RPX1BST1BFUlRZO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlcXVlc3RzIGFuIHVwZGF0ZSB3aGljaCBpcyBwcm9jZXNzZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgc2hvdWxkXG4gICAgICogYmUgY2FsbGVkIHdoZW4gYW4gZWxlbWVudCBzaG91bGQgdXBkYXRlIGJhc2VkIG9uIHNvbWUgc3RhdGUgbm90IHRyaWdnZXJlZFxuICAgICAqIGJ5IHNldHRpbmcgYSBwcm9wZXJ0eS4gSW4gdGhpcyBjYXNlLCBwYXNzIG5vIGFyZ3VtZW50cy4gSXQgc2hvdWxkIGFsc28gYmVcbiAgICAgKiBjYWxsZWQgd2hlbiBtYW51YWxseSBpbXBsZW1lbnRpbmcgYSBwcm9wZXJ0eSBzZXR0ZXIuIEluIHRoaXMgY2FzZSwgcGFzcyB0aGVcbiAgICAgKiBwcm9wZXJ0eSBgbmFtZWAgYW5kIGBvbGRWYWx1ZWAgdG8gZW5zdXJlIHRoYXQgYW55IGNvbmZpZ3VyZWQgcHJvcGVydHlcbiAgICAgKiBvcHRpb25zIGFyZSBob25vcmVkLiBSZXR1cm5zIHRoZSBgdXBkYXRlQ29tcGxldGVgIFByb21pc2Ugd2hpY2ggaXMgcmVzb2x2ZWRcbiAgICAgKiB3aGVuIHRoZSB1cGRhdGUgY29tcGxldGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWUge1Byb3BlcnR5S2V5fSAob3B0aW9uYWwpIG5hbWUgb2YgcmVxdWVzdGluZyBwcm9wZXJ0eVxuICAgICAqIEBwYXJhbSBvbGRWYWx1ZSB7YW55fSAob3B0aW9uYWwpIG9sZCB2YWx1ZSBvZiByZXF1ZXN0aW5nIHByb3BlcnR5XG4gICAgICogQHJldHVybnMge1Byb21pc2V9IEEgUHJvbWlzZSB0aGF0IGlzIHJlc29sdmVkIHdoZW4gdGhlIHVwZGF0ZSBjb21wbGV0ZXMuXG4gICAgICovXG4gICAgcmVxdWVzdFVwZGF0ZShuYW1lLCBvbGRWYWx1ZSkge1xuICAgICAgICBsZXQgc2hvdWxkUmVxdWVzdFVwZGF0ZSA9IHRydWU7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBwcm9wZXJ0eSBrZXksIHBlcmZvcm0gcHJvcGVydHkgdXBkYXRlIHN0ZXBzLlxuICAgICAgICBpZiAobmFtZSAhPT0gdW5kZWZpbmVkICYmICF0aGlzLl9jaGFuZ2VkUHJvcGVydGllcy5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGN0b3IuX2NsYXNzUHJvcGVydGllcy5nZXQobmFtZSkgfHwgZGVmYXVsdFByb3BlcnR5RGVjbGFyYXRpb247XG4gICAgICAgICAgICBpZiAoY3Rvci5fdmFsdWVIYXNDaGFuZ2VkKHRoaXNbbmFtZV0sIG9sZFZhbHVlLCBvcHRpb25zLmhhc0NoYW5nZWQpKSB7XG4gICAgICAgICAgICAgICAgLy8gdHJhY2sgb2xkIHZhbHVlIHdoZW4gY2hhbmdpbmcuXG4gICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlZFByb3BlcnRpZXMuc2V0KG5hbWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBhZGQgdG8gcmVmbGVjdGluZyBwcm9wZXJ0aWVzIHNldFxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnJlZmxlY3QgPT09IHRydWUgJiZcbiAgICAgICAgICAgICAgICAgICAgISh0aGlzLl91cGRhdGVTdGF0ZSAmIFNUQVRFX0lTX1JFRkxFQ1RJTkdfVE9fUFJPUEVSVFkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcy5zZXQobmFtZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGFib3J0IHRoZSByZXF1ZXN0IGlmIHRoZSBwcm9wZXJ0eSBzaG91bGQgbm90IGJlIGNvbnNpZGVyZWQgY2hhbmdlZC5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNob3VsZFJlcXVlc3RVcGRhdGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2hhc1JlcXVlc3RlZFVwZGF0ZSAmJiBzaG91bGRSZXF1ZXN0VXBkYXRlKSB7XG4gICAgICAgICAgICB0aGlzLl9lbnF1ZXVlVXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlQ29tcGxldGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgdGhlIGVsZW1lbnQgdG8gYXN5bmNocm9ub3VzbHkgdXBkYXRlLlxuICAgICAqL1xuICAgIGFzeW5jIF9lbnF1ZXVlVXBkYXRlKCkge1xuICAgICAgICAvLyBNYXJrIHN0YXRlIHVwZGF0aW5nLi4uXG4gICAgICAgIHRoaXMuX3VwZGF0ZVN0YXRlID0gdGhpcy5fdXBkYXRlU3RhdGUgfCBTVEFURV9VUERBVEVfUkVRVUVTVEVEO1xuICAgICAgICBsZXQgcmVzb2x2ZTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNVcGRhdGVQcm9taXNlID0gdGhpcy5fdXBkYXRlUHJvbWlzZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXMpID0+IHJlc29sdmUgPSByZXMpO1xuICAgICAgICAvLyBFbnN1cmUgYW55IHByZXZpb3VzIHVwZGF0ZSBoYXMgcmVzb2x2ZWQgYmVmb3JlIHVwZGF0aW5nLlxuICAgICAgICAvLyBUaGlzIGBhd2FpdGAgYWxzbyBlbnN1cmVzIHRoYXQgcHJvcGVydHkgY2hhbmdlcyBhcmUgYmF0Y2hlZC5cbiAgICAgICAgYXdhaXQgcHJldmlvdXNVcGRhdGVQcm9taXNlO1xuICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIGVsZW1lbnQgaGFzIGNvbm5lY3RlZCBiZWZvcmUgdXBkYXRpbmcuXG4gICAgICAgIGlmICghdGhpcy5faGFzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzKSA9PiB0aGlzLl9oYXNDb25uZWN0ZWRSZXNvbHZlciA9IHJlcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWxsb3cgYHBlcmZvcm1VcGRhdGVgIHRvIGJlIGFzeW5jaHJvbm91cyB0byBlbmFibGUgc2NoZWR1bGluZyBvZiB1cGRhdGVzLlxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnBlcmZvcm1VcGRhdGUoKTtcbiAgICAgICAgLy8gTm90ZSwgdGhpcyBpcyB0byBhdm9pZCBkZWxheWluZyBhbiBhZGRpdGlvbmFsIG1pY3JvdGFzayB1bmxlc3Mgd2UgbmVlZFxuICAgICAgICAvLyB0by5cbiAgICAgICAgaWYgKHJlc3VsdCAhPSBudWxsICYmXG4gICAgICAgICAgICB0eXBlb2YgcmVzdWx0LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKCF0aGlzLl9oYXNSZXF1ZXN0ZWRVcGRhdGUpO1xuICAgIH1cbiAgICBnZXQgX2hhc0Nvbm5lY3RlZCgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl91cGRhdGVTdGF0ZSAmIFNUQVRFX0hBU19DT05ORUNURUQpO1xuICAgIH1cbiAgICBnZXQgX2hhc1JlcXVlc3RlZFVwZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl91cGRhdGVTdGF0ZSAmIFNUQVRFX1VQREFURV9SRVFVRVNURUQpO1xuICAgIH1cbiAgICBnZXQgaGFzVXBkYXRlZCgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl91cGRhdGVTdGF0ZSAmIFNUQVRFX0hBU19VUERBVEVEKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYW4gZWxlbWVudCB1cGRhdGUuXG4gICAgICpcbiAgICAgKiBZb3UgY2FuIG92ZXJyaWRlIHRoaXMgbWV0aG9kIHRvIGNoYW5nZSB0aGUgdGltaW5nIG9mIHVwZGF0ZXMuIEZvciBpbnN0YW5jZSxcbiAgICAgKiB0byBzY2hlZHVsZSB1cGRhdGVzIHRvIG9jY3VyIGp1c3QgYmVmb3JlIHRoZSBuZXh0IGZyYW1lOlxuICAgICAqXG4gICAgICogYGBgXG4gICAgICogcHJvdGVjdGVkIGFzeW5jIHBlcmZvcm1VcGRhdGUoKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICogICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHJlc29sdmUoKSkpO1xuICAgICAqICAgc3VwZXIucGVyZm9ybVVwZGF0ZSgpO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBwZXJmb3JtVXBkYXRlKCkge1xuICAgICAgICAvLyBNaXhpbiBpbnN0YW5jZSBwcm9wZXJ0aWVzIG9uY2UsIGlmIHRoZXkgZXhpc3QuXG4gICAgICAgIGlmICh0aGlzLl9pbnN0YW5jZVByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMuX2FwcGx5SW5zdGFuY2VQcm9wZXJ0aWVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkVXBkYXRlKHRoaXMuX2NoYW5nZWRQcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZFByb3BlcnRpZXMgPSB0aGlzLl9jaGFuZ2VkUHJvcGVydGllcztcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKGNoYW5nZWRQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIHRoaXMuX21hcmtVcGRhdGVkKCk7XG4gICAgICAgICAgICBpZiAoISh0aGlzLl91cGRhdGVTdGF0ZSAmIFNUQVRFX0hBU19VUERBVEVEKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXRlID0gdGhpcy5fdXBkYXRlU3RhdGUgfCBTVEFURV9IQVNfVVBEQVRFRDtcbiAgICAgICAgICAgICAgICB0aGlzLmZpcnN0VXBkYXRlZChjaGFuZ2VkUHJvcGVydGllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWQoY2hhbmdlZFByb3BlcnRpZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fbWFya1VwZGF0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfbWFya1VwZGF0ZWQoKSB7XG4gICAgICAgIHRoaXMuX2NoYW5nZWRQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVTdGF0ZSA9IHRoaXMuX3VwZGF0ZVN0YXRlICYgflNUQVRFX1VQREFURV9SRVFVRVNURUQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgZWxlbWVudCBoYXMgY29tcGxldGVkIHVwZGF0aW5nLlxuICAgICAqIFRoZSBQcm9taXNlIHZhbHVlIGlzIGEgYm9vbGVhbiB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgZWxlbWVudCBjb21wbGV0ZWQgdGhlXG4gICAgICogdXBkYXRlIHdpdGhvdXQgdHJpZ2dlcmluZyBhbm90aGVyIHVwZGF0ZS4gVGhlIFByb21pc2UgcmVzdWx0IGlzIGBmYWxzZWAgaWZcbiAgICAgKiBhIHByb3BlcnR5IHdhcyBzZXQgaW5zaWRlIGB1cGRhdGVkKClgLiBUaGlzIGdldHRlciBjYW4gYmUgaW1wbGVtZW50ZWQgdG9cbiAgICAgKiBhd2FpdCBhZGRpdGlvbmFsIHN0YXRlLiBGb3IgZXhhbXBsZSwgaXQgaXMgc29tZXRpbWVzIHVzZWZ1bCB0byBhd2FpdCBhXG4gICAgICogcmVuZGVyZWQgZWxlbWVudCBiZWZvcmUgZnVsZmlsbGluZyB0aGlzIFByb21pc2UuIFRvIGRvIHRoaXMsIGZpcnN0IGF3YWl0XG4gICAgICogYHN1cGVyLnVwZGF0ZUNvbXBsZXRlYCB0aGVuIGFueSBzdWJzZXF1ZW50IHN0YXRlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IFRoZSBQcm9taXNlIHJldHVybnMgYSBib29sZWFuIHRoYXQgaW5kaWNhdGVzIGlmIHRoZVxuICAgICAqIHVwZGF0ZSByZXNvbHZlZCB3aXRob3V0IHRyaWdnZXJpbmcgYW5vdGhlciB1cGRhdGUuXG4gICAgICovXG4gICAgZ2V0IHVwZGF0ZUNvbXBsZXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdXBkYXRlUHJvbWlzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29udHJvbHMgd2hldGhlciBvciBub3QgYHVwZGF0ZWAgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBlbGVtZW50IHJlcXVlc3RzXG4gICAgICogYW4gdXBkYXRlLiBCeSBkZWZhdWx0LCB0aGlzIG1ldGhvZCBhbHdheXMgcmV0dXJucyBgdHJ1ZWAsIGJ1dCB0aGlzIGNhbiBiZVxuICAgICAqIGN1c3RvbWl6ZWQgdG8gY29udHJvbCB3aGVuIHRvIHVwZGF0ZS5cbiAgICAgKlxuICAgICAqICogQHBhcmFtIF9jaGFuZ2VkUHJvcGVydGllcyBNYXAgb2YgY2hhbmdlZCBwcm9wZXJ0aWVzIHdpdGggb2xkIHZhbHVlc1xuICAgICAqL1xuICAgIHNob3VsZFVwZGF0ZShfY2hhbmdlZFByb3BlcnRpZXMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGVsZW1lbnQuIFRoaXMgbWV0aG9kIHJlZmxlY3RzIHByb3BlcnR5IHZhbHVlcyB0byBhdHRyaWJ1dGVzLlxuICAgICAqIEl0IGNhbiBiZSBvdmVycmlkZGVuIHRvIHJlbmRlciBhbmQga2VlcCB1cGRhdGVkIGVsZW1lbnQgRE9NLlxuICAgICAqIFNldHRpbmcgcHJvcGVydGllcyBpbnNpZGUgdGhpcyBtZXRob2Qgd2lsbCAqbm90KiB0cmlnZ2VyXG4gICAgICogYW5vdGhlciB1cGRhdGUuXG4gICAgICpcbiAgICAgKiAqIEBwYXJhbSBfY2hhbmdlZFByb3BlcnRpZXMgTWFwIG9mIGNoYW5nZWQgcHJvcGVydGllcyB3aXRoIG9sZCB2YWx1ZXNcbiAgICAgKi9cbiAgICB1cGRhdGUoX2NoYW5nZWRQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICh0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcy5zaXplID4gMCkge1xuICAgICAgICAgICAgLy8gVXNlIGZvckVhY2ggc28gdGhpcyB3b3JrcyBldmVuIGlmIGZvci9vZiBsb29wcyBhcmUgY29tcGlsZWQgdG8gZm9yXG4gICAgICAgICAgICAvLyBsb29wcyBleHBlY3RpbmcgYXJyYXlzXG4gICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW5nUHJvcGVydGllcy5mb3JFYWNoKCh2LCBrKSA9PiB0aGlzLl9wcm9wZXJ0eVRvQXR0cmlidXRlKGssIHRoaXNba10sIHYpKTtcbiAgICAgICAgICAgIHRoaXMuX3JlZmxlY3RpbmdQcm9wZXJ0aWVzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEludm9rZWQgd2hlbmV2ZXIgdGhlIGVsZW1lbnQgaXMgdXBkYXRlZC4gSW1wbGVtZW50IHRvIHBlcmZvcm1cbiAgICAgKiBwb3N0LXVwZGF0aW5nIHRhc2tzIHZpYSBET00gQVBJcywgZm9yIGV4YW1wbGUsIGZvY3VzaW5nIGFuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHByb3BlcnRpZXMgaW5zaWRlIHRoaXMgbWV0aG9kIHdpbGwgdHJpZ2dlciB0aGUgZWxlbWVudCB0byB1cGRhdGVcbiAgICAgKiBhZ2FpbiBhZnRlciB0aGlzIHVwZGF0ZSBjeWNsZSBjb21wbGV0ZXMuXG4gICAgICpcbiAgICAgKiAqIEBwYXJhbSBfY2hhbmdlZFByb3BlcnRpZXMgTWFwIG9mIGNoYW5nZWQgcHJvcGVydGllcyB3aXRoIG9sZCB2YWx1ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVkKF9jaGFuZ2VkUHJvcGVydGllcykge1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbnZva2VkIHdoZW4gdGhlIGVsZW1lbnQgaXMgZmlyc3QgdXBkYXRlZC4gSW1wbGVtZW50IHRvIHBlcmZvcm0gb25lIHRpbWVcbiAgICAgKiB3b3JrIG9uIHRoZSBlbGVtZW50IGFmdGVyIHVwZGF0ZS5cbiAgICAgKlxuICAgICAqIFNldHRpbmcgcHJvcGVydGllcyBpbnNpZGUgdGhpcyBtZXRob2Qgd2lsbCB0cmlnZ2VyIHRoZSBlbGVtZW50IHRvIHVwZGF0ZVxuICAgICAqIGFnYWluIGFmdGVyIHRoaXMgdXBkYXRlIGN5Y2xlIGNvbXBsZXRlcy5cbiAgICAgKlxuICAgICAqICogQHBhcmFtIF9jaGFuZ2VkUHJvcGVydGllcyBNYXAgb2YgY2hhbmdlZCBwcm9wZXJ0aWVzIHdpdGggb2xkIHZhbHVlc1xuICAgICAqL1xuICAgIGZpcnN0VXBkYXRlZChfY2hhbmdlZFByb3BlcnRpZXMpIHtcbiAgICB9XG59XG4vKipcbiAqIE1hcmtzIGNsYXNzIGFzIGhhdmluZyBmaW5pc2hlZCBjcmVhdGluZyBwcm9wZXJ0aWVzLlxuICovXG5VcGRhdGluZ0VsZW1lbnQuZmluYWxpemVkID0gdHJ1ZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXVwZGF0aW5nLWVsZW1lbnQuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuY29uc3QgbGVnYWN5Q3VzdG9tRWxlbWVudCA9ICh0YWdOYW1lLCBjbGF6eikgPT4ge1xuICAgIHdpbmRvdy5jdXN0b21FbGVtZW50cy5kZWZpbmUodGFnTmFtZSwgY2xhenopO1xuICAgIC8vIENhc3QgYXMgYW55IGJlY2F1c2UgVFMgZG9lc24ndCByZWNvZ25pemUgdGhlIHJldHVybiB0eXBlIGFzIGJlaW5nIGFcbiAgICAvLyBzdWJ0eXBlIG9mIHRoZSBkZWNvcmF0ZWQgY2xhc3Mgd2hlbiBjbGF6eiBpcyB0eXBlZCBhc1xuICAgIC8vIGBDb25zdHJ1Y3RvcjxIVE1MRWxlbWVudD5gIGZvciBzb21lIHJlYXNvbi5cbiAgICAvLyBgQ29uc3RydWN0b3I8SFRNTEVsZW1lbnQ+YCBpcyBoZWxwZnVsIHRvIG1ha2Ugc3VyZSB0aGUgZGVjb3JhdG9yIGlzXG4gICAgLy8gYXBwbGllZCB0byBlbGVtZW50cyBob3dldmVyLlxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICByZXR1cm4gY2xheno7XG59O1xuY29uc3Qgc3RhbmRhcmRDdXN0b21FbGVtZW50ID0gKHRhZ05hbWUsIGRlc2NyaXB0b3IpID0+IHtcbiAgICBjb25zdCB7IGtpbmQsIGVsZW1lbnRzIH0gPSBkZXNjcmlwdG9yO1xuICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQsXG4gICAgICAgIGVsZW1lbnRzLFxuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBvbmNlIHRoZSBjbGFzcyBpcyBvdGhlcndpc2UgZnVsbHkgZGVmaW5lZFxuICAgICAgICBmaW5pc2hlcihjbGF6eikge1xuICAgICAgICAgICAgd2luZG93LmN1c3RvbUVsZW1lbnRzLmRlZmluZSh0YWdOYW1lLCBjbGF6eik7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogQ2xhc3MgZGVjb3JhdG9yIGZhY3RvcnkgdGhhdCBkZWZpbmVzIHRoZSBkZWNvcmF0ZWQgY2xhc3MgYXMgYSBjdXN0b20gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0gdGFnTmFtZSB0aGUgbmFtZSBvZiB0aGUgY3VzdG9tIGVsZW1lbnQgdG8gZGVmaW5lXG4gKi9cbmV4cG9ydCBjb25zdCBjdXN0b21FbGVtZW50ID0gKHRhZ05hbWUpID0+IChjbGFzc09yRGVzY3JpcHRvcikgPT4gKHR5cGVvZiBjbGFzc09yRGVzY3JpcHRvciA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgIGxlZ2FjeUN1c3RvbUVsZW1lbnQodGFnTmFtZSwgY2xhc3NPckRlc2NyaXB0b3IpIDpcbiAgICBzdGFuZGFyZEN1c3RvbUVsZW1lbnQodGFnTmFtZSwgY2xhc3NPckRlc2NyaXB0b3IpO1xuY29uc3Qgc3RhbmRhcmRQcm9wZXJ0eSA9IChvcHRpb25zLCBlbGVtZW50KSA9PiB7XG4gICAgLy8gV2hlbiBkZWNvcmF0aW5nIGFuIGFjY2Vzc29yLCBwYXNzIGl0IHRocm91Z2ggYW5kIGFkZCBwcm9wZXJ0eSBtZXRhZGF0YS5cbiAgICAvLyBOb3RlLCB0aGUgYGhhc093blByb3BlcnR5YCBjaGVjayBpbiBgY3JlYXRlUHJvcGVydHlgIGVuc3VyZXMgd2UgZG9uJ3RcbiAgICAvLyBzdG9tcCBvdmVyIHRoZSB1c2VyJ3MgYWNjZXNzb3IuXG4gICAgaWYgKGVsZW1lbnQua2luZCA9PT0gJ21ldGhvZCcgJiYgZWxlbWVudC5kZXNjcmlwdG9yICYmXG4gICAgICAgICEoJ3ZhbHVlJyBpbiBlbGVtZW50LmRlc2NyaXB0b3IpKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBlbGVtZW50LCB7IGZpbmlzaGVyKGNsYXp6KSB7XG4gICAgICAgICAgICAgICAgY2xhenouY3JlYXRlUHJvcGVydHkoZWxlbWVudC5rZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGNyZWF0ZVByb3BlcnR5KCkgdGFrZXMgY2FyZSBvZiBkZWZpbmluZyB0aGUgcHJvcGVydHksIGJ1dCB3ZSBzdGlsbFxuICAgICAgICAvLyBtdXN0IHJldHVybiBzb21lIGtpbmQgb2YgZGVzY3JpcHRvciwgc28gcmV0dXJuIGEgZGVzY3JpcHRvciBmb3IgYW5cbiAgICAgICAgLy8gdW51c2VkIHByb3RvdHlwZSBmaWVsZC4gVGhlIGZpbmlzaGVyIGNhbGxzIGNyZWF0ZVByb3BlcnR5KCkuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBraW5kOiAnZmllbGQnLFxuICAgICAgICAgICAga2V5OiBTeW1ib2woKSxcbiAgICAgICAgICAgIHBsYWNlbWVudDogJ293bicsXG4gICAgICAgICAgICBkZXNjcmlwdG9yOiB7fSxcbiAgICAgICAgICAgIC8vIFdoZW4gQGJhYmVsL3BsdWdpbi1wcm9wb3NhbC1kZWNvcmF0b3JzIGltcGxlbWVudHMgaW5pdGlhbGl6ZXJzLFxuICAgICAgICAgICAgLy8gZG8gdGhpcyBpbnN0ZWFkIG9mIHRoZSBpbml0aWFsaXplciBiZWxvdy4gU2VlOlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2JhYmVsL2JhYmVsL2lzc3Vlcy85MjYwIGV4dHJhczogW1xuICAgICAgICAgICAgLy8gICB7XG4gICAgICAgICAgICAvLyAgICAga2luZDogJ2luaXRpYWxpemVyJyxcbiAgICAgICAgICAgIC8vICAgICBwbGFjZW1lbnQ6ICdvd24nLFxuICAgICAgICAgICAgLy8gICAgIGluaXRpYWxpemVyOiBkZXNjcmlwdG9yLmluaXRpYWxpemVyLFxuICAgICAgICAgICAgLy8gICB9XG4gICAgICAgICAgICAvLyBdLFxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBkZWNvcmF0b3JcbiAgICAgICAgICAgIGluaXRpYWxpemVyKCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5pbml0aWFsaXplciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW2VsZW1lbnQua2V5XSA9IGVsZW1lbnQuaW5pdGlhbGl6ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmluaXNoZXIoY2xhenopIHtcbiAgICAgICAgICAgICAgICBjbGF6ei5jcmVhdGVQcm9wZXJ0eShlbGVtZW50LmtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufTtcbmNvbnN0IGxlZ2FjeVByb3BlcnR5ID0gKG9wdGlvbnMsIHByb3RvLCBuYW1lKSA9PiB7XG4gICAgcHJvdG8uY29uc3RydWN0b3JcbiAgICAgICAgLmNyZWF0ZVByb3BlcnR5KG5hbWUsIG9wdGlvbnMpO1xufTtcbi8qKlxuICogQSBwcm9wZXJ0eSBkZWNvcmF0b3Igd2hpY2ggY3JlYXRlcyBhIExpdEVsZW1lbnQgcHJvcGVydHkgd2hpY2ggcmVmbGVjdHMgYVxuICogY29ycmVzcG9uZGluZyBhdHRyaWJ1dGUgdmFsdWUuIEEgYFByb3BlcnR5RGVjbGFyYXRpb25gIG1heSBvcHRpb25hbGx5IGJlXG4gKiBzdXBwbGllZCB0byBjb25maWd1cmUgcHJvcGVydHkgZmVhdHVyZXMuXG4gKlxuICogQEV4cG9ydERlY29yYXRlZEl0ZW1zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wZXJ0eShvcHRpb25zKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueSBkZWNvcmF0b3JcbiAgICByZXR1cm4gKHByb3RvT3JEZXNjcmlwdG9yLCBuYW1lKSA9PiAobmFtZSAhPT0gdW5kZWZpbmVkKSA/XG4gICAgICAgIGxlZ2FjeVByb3BlcnR5KG9wdGlvbnMsIHByb3RvT3JEZXNjcmlwdG9yLCBuYW1lKSA6XG4gICAgICAgIHN0YW5kYXJkUHJvcGVydHkob3B0aW9ucywgcHJvdG9PckRlc2NyaXB0b3IpO1xufVxuLyoqXG4gKiBBIHByb3BlcnR5IGRlY29yYXRvciB0aGF0IGNvbnZlcnRzIGEgY2xhc3MgcHJvcGVydHkgaW50byBhIGdldHRlciB0aGF0XG4gKiBleGVjdXRlcyBhIHF1ZXJ5U2VsZWN0b3Igb24gdGhlIGVsZW1lbnQncyByZW5kZXJSb290LlxuICovXG5leHBvcnQgY29uc3QgcXVlcnkgPSBfcXVlcnkoKHRhcmdldCwgc2VsZWN0b3IpID0+IHRhcmdldC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSk7XG4vKipcbiAqIEEgcHJvcGVydHkgZGVjb3JhdG9yIHRoYXQgY29udmVydHMgYSBjbGFzcyBwcm9wZXJ0eSBpbnRvIGEgZ2V0dGVyXG4gKiB0aGF0IGV4ZWN1dGVzIGEgcXVlcnlTZWxlY3RvckFsbCBvbiB0aGUgZWxlbWVudCdzIHJlbmRlclJvb3QuXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeUFsbCA9IF9xdWVyeSgodGFyZ2V0LCBzZWxlY3RvcikgPT4gdGFyZ2V0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbmNvbnN0IGxlZ2FjeVF1ZXJ5ID0gKGRlc2NyaXB0b3IsIHByb3RvLCBuYW1lKSA9PiB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCBkZXNjcmlwdG9yKTtcbn07XG5jb25zdCBzdGFuZGFyZFF1ZXJ5ID0gKGRlc2NyaXB0b3IsIGVsZW1lbnQpID0+ICh7XG4gICAga2luZDogJ21ldGhvZCcsXG4gICAgcGxhY2VtZW50OiAncHJvdG90eXBlJyxcbiAgICBrZXk6IGVsZW1lbnQua2V5LFxuICAgIGRlc2NyaXB0b3IsXG59KTtcbi8qKlxuICogQmFzZS1pbXBsZW1lbnRhdGlvbiBvZiBgQHF1ZXJ5YCBhbmQgYEBxdWVyeUFsbGAgZGVjb3JhdG9ycy5cbiAqXG4gKiBAcGFyYW0gcXVlcnlGbiBleGVjdHV0ZSBhIGBzZWxlY3RvcmAgKGllLCBxdWVyeVNlbGVjdG9yIG9yIHF1ZXJ5U2VsZWN0b3JBbGwpXG4gKiBhZ2FpbnN0IGB0YXJnZXRgLlxuICogQHN1cHByZXNzIHt2aXNpYmlsaXR5fSBUaGUgZGVzY3JpcHRvciBhY2Nlc3NlcyBhbiBpbnRlcm5hbCBmaWVsZCBvbiB0aGVcbiAqIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIF9xdWVyeShxdWVyeUZuKSB7XG4gICAgcmV0dXJuIChzZWxlY3RvcikgPT4gKHByb3RvT3JEZXNjcmlwdG9yLCBcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55IGRlY29yYXRvclxuICAgIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcXVlcnlGbih0aGlzLnJlbmRlclJvb3QsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gKG5hbWUgIT09IHVuZGVmaW5lZCkgP1xuICAgICAgICAgICAgbGVnYWN5UXVlcnkoZGVzY3JpcHRvciwgcHJvdG9PckRlc2NyaXB0b3IsIG5hbWUpIDpcbiAgICAgICAgICAgIHN0YW5kYXJkUXVlcnkoZGVzY3JpcHRvciwgcHJvdG9PckRlc2NyaXB0b3IpO1xuICAgIH07XG59XG5jb25zdCBzdGFuZGFyZEV2ZW50T3B0aW9ucyA9IChvcHRpb25zLCBlbGVtZW50KSA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGVsZW1lbnQsIHsgZmluaXNoZXIoY2xhenopIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2xhenoucHJvdG90eXBlW2VsZW1lbnQua2V5XSwgb3B0aW9ucyk7XG4gICAgICAgIH0gfSk7XG59O1xuY29uc3QgbGVnYWN5RXZlbnRPcHRpb25zID0gXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55IGxlZ2FjeSBkZWNvcmF0b3JcbihvcHRpb25zLCBwcm90bywgbmFtZSkgPT4ge1xuICAgIE9iamVjdC5hc3NpZ24ocHJvdG9bbmFtZV0sIG9wdGlvbnMpO1xufTtcbi8qKlxuICogQWRkcyBldmVudCBsaXN0ZW5lciBvcHRpb25zIHRvIGEgbWV0aG9kIHVzZWQgYXMgYW4gZXZlbnQgbGlzdGVuZXIgaW4gYVxuICogbGl0LWh0bWwgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgQW4gb2JqZWN0IHRoYXQgc3BlY2lmaXMgZXZlbnQgbGlzdGVuZXIgb3B0aW9ucyBhcyBhY2NlcHRlZCBieVxuICogYEV2ZW50VGFyZ2V0I2FkZEV2ZW50TGlzdGVuZXJgIGFuZCBgRXZlbnRUYXJnZXQjcmVtb3ZlRXZlbnRMaXN0ZW5lcmAuXG4gKlxuICogQ3VycmVudCBicm93c2VycyBzdXBwb3J0IHRoZSBgY2FwdHVyZWAsIGBwYXNzaXZlYCwgYW5kIGBvbmNlYCBvcHRpb25zLiBTZWU6XG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRXZlbnRUYXJnZXQvYWRkRXZlbnRMaXN0ZW5lciNQYXJhbWV0ZXJzXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiAgICAgY2xhc3MgTXlFbGVtZW50IHtcbiAqXG4gKiAgICAgICBjbGlja2VkID0gZmFsc2U7XG4gKlxuICogICAgICAgcmVuZGVyKCkge1xuICogICAgICAgICByZXR1cm4gaHRtbGA8ZGl2IEBjbGljaz0ke3RoaXMuX29uQ2xpY2t9YD48YnV0dG9uPjwvYnV0dG9uPjwvZGl2PmA7XG4gKiAgICAgICB9XG4gKlxuICogICAgICAgQGV2ZW50T3B0aW9ucyh7Y2FwdHVyZTogdHJ1ZX0pXG4gKiAgICAgICBfb25DbGljayhlKSB7XG4gKiAgICAgICAgIHRoaXMuY2xpY2tlZCA9IHRydWU7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICovXG5leHBvcnQgY29uc3QgZXZlbnRPcHRpb25zID0gKG9wdGlvbnMpID0+IFxuLy8gUmV0dXJuIHZhbHVlIHR5cGVkIGFzIGFueSB0byBwcmV2ZW50IFR5cGVTY3JpcHQgZnJvbSBjb21wbGFpbmluZyB0aGF0XG4vLyBzdGFuZGFyZCBkZWNvcmF0b3IgZnVuY3Rpb24gc2lnbmF0dXJlIGRvZXMgbm90IG1hdGNoIFR5cGVTY3JpcHQgZGVjb3JhdG9yXG4vLyBzaWduYXR1cmVcbi8vIFRPRE8oa3NjaGFhZik6IHVuY2xlYXIgd2h5IGl0IHdhcyBvbmx5IGZhaWxpbmcgb24gdGhpcyBkZWNvcmF0b3IgYW5kIG5vdFxuLy8gdGhlIG90aGVyc1xuKChwcm90b09yRGVzY3JpcHRvciwgbmFtZSkgPT4gKG5hbWUgIT09IHVuZGVmaW5lZCkgP1xuICAgIGxlZ2FjeUV2ZW50T3B0aW9ucyhvcHRpb25zLCBwcm90b09yRGVzY3JpcHRvciwgbmFtZSkgOlxuICAgIHN0YW5kYXJkRXZlbnRPcHRpb25zKG9wdGlvbnMsIHByb3RvT3JEZXNjcmlwdG9yKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZWNvcmF0b3JzLmpzLm1hcCIsIi8qKlxuQGxpY2Vuc2VcbkNvcHlyaWdodCAoYykgMjAxOSBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5UaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbmh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dCBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG5odHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHQgVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlXG5mb3VuZCBhdCBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dCBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhc1xucGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc28gc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudFxuZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4qL1xuZXhwb3J0IGNvbnN0IHN1cHBvcnRzQWRvcHRpbmdTdHlsZVNoZWV0cyA9ICgnYWRvcHRlZFN0eWxlU2hlZXRzJyBpbiBEb2N1bWVudC5wcm90b3R5cGUpICYmXG4gICAgKCdyZXBsYWNlJyBpbiBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZSk7XG5jb25zdCBjb25zdHJ1Y3Rpb25Ub2tlbiA9IFN5bWJvbCgpO1xuZXhwb3J0IGNsYXNzIENTU1Jlc3VsdCB7XG4gICAgY29uc3RydWN0b3IoY3NzVGV4dCwgc2FmZVRva2VuKSB7XG4gICAgICAgIGlmIChzYWZlVG9rZW4gIT09IGNvbnN0cnVjdGlvblRva2VuKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTU1Jlc3VsdCBpcyBub3QgY29uc3RydWN0YWJsZS4gVXNlIGB1bnNhZmVDU1NgIG9yIGBjc3NgIGluc3RlYWQuJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jc3NUZXh0ID0gY3NzVGV4dDtcbiAgICB9XG4gICAgLy8gTm90ZSwgdGhpcyBpcyBhIGdldHRlciBzbyB0aGF0IGl0J3MgbGF6eS4gSW4gcHJhY3RpY2UsIHRoaXMgbWVhbnNcbiAgICAvLyBzdHlsZXNoZWV0cyBhcmUgbm90IGNyZWF0ZWQgdW50aWwgdGhlIGZpcnN0IGVsZW1lbnQgaW5zdGFuY2UgaXMgbWFkZS5cbiAgICBnZXQgc3R5bGVTaGVldCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0eWxlU2hlZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gTm90ZSwgaWYgYGFkb3B0ZWRTdHlsZVNoZWV0c2AgaXMgc3VwcG9ydGVkIHRoZW4gd2UgYXNzdW1lIENTU1N0eWxlU2hlZXRcbiAgICAgICAgICAgIC8vIGlzIGNvbnN0cnVjdGFibGUuXG4gICAgICAgICAgICBpZiAoc3VwcG9ydHNBZG9wdGluZ1N0eWxlU2hlZXRzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3R5bGVTaGVldCA9IG5ldyBDU1NTdHlsZVNoZWV0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3R5bGVTaGVldC5yZXBsYWNlU3luYyh0aGlzLmNzc1RleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3R5bGVTaGVldCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0eWxlU2hlZXQ7XG4gICAgfVxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jc3NUZXh0O1xuICAgIH1cbn1cbi8qKlxuICogV3JhcCBhIHZhbHVlIGZvciBpbnRlcnBvbGF0aW9uIGluIGEgY3NzIHRhZ2dlZCB0ZW1wbGF0ZSBsaXRlcmFsLlxuICpcbiAqIFRoaXMgaXMgdW5zYWZlIGJlY2F1c2UgdW50cnVzdGVkIENTUyB0ZXh0IGNhbiBiZSB1c2VkIHRvIHBob25lIGhvbWVcbiAqIG9yIGV4ZmlsdHJhdGUgZGF0YSB0byBhbiBhdHRhY2tlciBjb250cm9sbGVkIHNpdGUuIFRha2UgY2FyZSB0byBvbmx5IHVzZVxuICogdGhpcyB3aXRoIHRydXN0ZWQgaW5wdXQuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVDU1MgPSAodmFsdWUpID0+IHtcbiAgICByZXR1cm4gbmV3IENTU1Jlc3VsdChTdHJpbmcodmFsdWUpLCBjb25zdHJ1Y3Rpb25Ub2tlbik7XG59O1xuY29uc3QgdGV4dEZyb21DU1NSZXN1bHQgPSAodmFsdWUpID0+IHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBDU1NSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNzc1RleHQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlIHBhc3NlZCB0byAnY3NzJyBmdW5jdGlvbiBtdXN0IGJlIGEgJ2NzcycgZnVuY3Rpb24gcmVzdWx0OiAke3ZhbHVlfS4gVXNlICd1bnNhZmVDU1MnIHRvIHBhc3Mgbm9uLWxpdGVyYWwgdmFsdWVzLCBidXRcbiAgICAgICAgICAgIHRha2UgY2FyZSB0byBlbnN1cmUgcGFnZSBzZWN1cml0eS5gKTtcbiAgICB9XG59O1xuLyoqXG4gKiBUZW1wbGF0ZSB0YWcgd2hpY2ggd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCBMaXRFbGVtZW50J3MgYHN0eWxlYCBwcm9wZXJ0eSB0b1xuICogc2V0IGVsZW1lbnQgc3R5bGVzLiBGb3Igc2VjdXJpdHkgcmVhc29ucywgb25seSBsaXRlcmFsIHN0cmluZyB2YWx1ZXMgbWF5IGJlXG4gKiB1c2VkLiBUbyBpbmNvcnBvcmF0ZSBub24tbGl0ZXJhbCB2YWx1ZXMgYHVuc2FmZUNTU2AgbWF5IGJlIHVzZWQgaW5zaWRlIGFcbiAqIHRlbXBsYXRlIHN0cmluZyBwYXJ0LlxuICovXG5leHBvcnQgY29uc3QgY3NzID0gKHN0cmluZ3MsIC4uLnZhbHVlcykgPT4ge1xuICAgIGNvbnN0IGNzc1RleHQgPSB2YWx1ZXMucmVkdWNlKChhY2MsIHYsIGlkeCkgPT4gYWNjICsgdGV4dEZyb21DU1NSZXN1bHQodikgKyBzdHJpbmdzW2lkeCArIDFdLCBzdHJpbmdzWzBdKTtcbiAgICByZXR1cm4gbmV3IENTU1Jlc3VsdChjc3NUZXh0LCBjb25zdHJ1Y3Rpb25Ub2tlbik7XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y3NzLXRhZy5qcy5tYXAiLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5pbXBvcnQgeyBUZW1wbGF0ZVJlc3VsdCB9IGZyb20gJ2xpdC1odG1sJztcbmltcG9ydCB7IHJlbmRlciB9IGZyb20gJ2xpdC1odG1sL2xpYi9zaGFkeS1yZW5kZXInO1xuaW1wb3J0IHsgVXBkYXRpbmdFbGVtZW50IH0gZnJvbSAnLi9saWIvdXBkYXRpbmctZWxlbWVudC5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2xpYi91cGRhdGluZy1lbGVtZW50LmpzJztcbmV4cG9ydCAqIGZyb20gJy4vbGliL2RlY29yYXRvcnMuanMnO1xuZXhwb3J0IHsgaHRtbCwgc3ZnLCBUZW1wbGF0ZVJlc3VsdCwgU1ZHVGVtcGxhdGVSZXN1bHQgfSBmcm9tICdsaXQtaHRtbC9saXQtaHRtbCc7XG5pbXBvcnQgeyBzdXBwb3J0c0Fkb3B0aW5nU3R5bGVTaGVldHMgfSBmcm9tICcuL2xpYi9jc3MtdGFnLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vbGliL2Nzcy10YWcuanMnO1xuLy8gSU1QT1JUQU5UOiBkbyBub3QgY2hhbmdlIHRoZSBwcm9wZXJ0eSBuYW1lIG9yIHRoZSBhc3NpZ25tZW50IGV4cHJlc3Npb24uXG4vLyBUaGlzIGxpbmUgd2lsbCBiZSB1c2VkIGluIHJlZ2V4ZXMgdG8gc2VhcmNoIGZvciBMaXRFbGVtZW50IHVzYWdlLlxuLy8gVE9ETyhqdXN0aW5mYWduYW5pKTogaW5qZWN0IHZlcnNpb24gbnVtYmVyIGF0IGJ1aWxkIHRpbWVcbih3aW5kb3dbJ2xpdEVsZW1lbnRWZXJzaW9ucyddIHx8ICh3aW5kb3dbJ2xpdEVsZW1lbnRWZXJzaW9ucyddID0gW10pKVxuICAgIC5wdXNoKCcyLjAuMScpO1xuLyoqXG4gKiBNaW5pbWFsIGltcGxlbWVudGF0aW9uIG9mIEFycmF5LnByb3RvdHlwZS5mbGF0XG4gKiBAcGFyYW0gYXJyIHRoZSBhcnJheSB0byBmbGF0dGVuXG4gKiBAcGFyYW0gcmVzdWx0IHRoZSBhY2N1bWxhdGVkIHJlc3VsdFxuICovXG5mdW5jdGlvbiBhcnJheUZsYXQoc3R5bGVzLCByZXN1bHQgPSBbXSkge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBzdHlsZXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzdHlsZXNbaV07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgYXJyYXlGbGF0KHZhbHVlLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG4vKiogRGVlcGx5IGZsYXR0ZW5zIHN0eWxlcyBhcnJheS4gVXNlcyBuYXRpdmUgZmxhdCBpZiBhdmFpbGFibGUuICovXG5jb25zdCBmbGF0dGVuU3R5bGVzID0gKHN0eWxlcykgPT4gc3R5bGVzLmZsYXQgPyBzdHlsZXMuZmxhdChJbmZpbml0eSkgOiBhcnJheUZsYXQoc3R5bGVzKTtcbmV4cG9ydCBjbGFzcyBMaXRFbGVtZW50IGV4dGVuZHMgVXBkYXRpbmdFbGVtZW50IHtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBzdGF0aWMgZmluYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmZpbmFsaXplKCk7XG4gICAgICAgIC8vIFByZXBhcmUgc3R5bGluZyB0aGF0IGlzIHN0YW1wZWQgYXQgZmlyc3QgcmVuZGVyIHRpbWUuIFN0eWxpbmdcbiAgICAgICAgLy8gaXMgYnVpbHQgZnJvbSB1c2VyIHByb3ZpZGVkIGBzdHlsZXNgIG9yIGlzIGluaGVyaXRlZCBmcm9tIHRoZSBzdXBlcmNsYXNzLlxuICAgICAgICB0aGlzLl9zdHlsZXMgPVxuICAgICAgICAgICAgdGhpcy5oYXNPd25Qcm9wZXJ0eShKU0NvbXBpbGVyX3JlbmFtZVByb3BlcnR5KCdzdHlsZXMnLCB0aGlzKSkgP1xuICAgICAgICAgICAgICAgIHRoaXMuX2dldFVuaXF1ZVN0eWxlcygpIDpcbiAgICAgICAgICAgICAgICB0aGlzLl9zdHlsZXMgfHwgW107XG4gICAgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHN0YXRpYyBfZ2V0VW5pcXVlU3R5bGVzKCkge1xuICAgICAgICAvLyBUYWtlIGNhcmUgbm90IHRvIGNhbGwgYHRoaXMuc3R5bGVzYCBtdWx0aXBsZSB0aW1lcyBzaW5jZSB0aGlzIGdlbmVyYXRlc1xuICAgICAgICAvLyBuZXcgQ1NTUmVzdWx0cyBlYWNoIHRpbWUuXG4gICAgICAgIC8vIFRPRE8oc29ydmVsbCk6IFNpbmNlIHdlIGRvIG5vdCBjYWNoZSBDU1NSZXN1bHRzIGJ5IGlucHV0LCBhbnlcbiAgICAgICAgLy8gc2hhcmVkIHN0eWxlcyB3aWxsIGdlbmVyYXRlIG5ldyBzdHlsZXNoZWV0IG9iamVjdHMsIHdoaWNoIGlzIHdhc3RlZnVsLlxuICAgICAgICAvLyBUaGlzIHNob3VsZCBiZSBhZGRyZXNzZWQgd2hlbiBhIGJyb3dzZXIgc2hpcHMgY29uc3RydWN0YWJsZVxuICAgICAgICAvLyBzdHlsZXNoZWV0cy5cbiAgICAgICAgY29uc3QgdXNlclN0eWxlcyA9IHRoaXMuc3R5bGVzO1xuICAgICAgICBjb25zdCBzdHlsZXMgPSBbXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodXNlclN0eWxlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGZsYXRTdHlsZXMgPSBmbGF0dGVuU3R5bGVzKHVzZXJTdHlsZXMpO1xuICAgICAgICAgICAgLy8gQXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24gdG8gYXZvaWQgZHVwbGljYXRlZCBzdHlsaW5nIHRoYXQgY2FuXG4gICAgICAgICAgICAvLyBvY2N1ciBlc3BlY2lhbGx5IHdoZW4gY29tcG9zaW5nIHZpYSBzdWJjbGFzc2luZywgZGUtZHVwbGljYXRlIHN0eWxlc1xuICAgICAgICAgICAgLy8gcHJlc2VydmluZyB0aGUgbGFzdCBpdGVtIGluIHRoZSBsaXN0LiBUaGUgbGFzdCBpdGVtIGlzIGtlcHQgdG9cbiAgICAgICAgICAgIC8vIHRyeSB0byBwcmVzZXJ2ZSBjYXNjYWRlIG9yZGVyIHdpdGggdGhlIGFzc3VtcHRpb24gdGhhdCBpdCdzIG1vc3RcbiAgICAgICAgICAgIC8vIGltcG9ydGFudCB0aGF0IGxhc3QgYWRkZWQgc3R5bGVzIG92ZXJyaWRlIHByZXZpb3VzIHN0eWxlcy5cbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2V0ID0gZmxhdFN0eWxlcy5yZWR1Y2VSaWdodCgoc2V0LCBzKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0LmFkZChzKTtcbiAgICAgICAgICAgICAgICAvLyBvbiBJRSBzZXQuYWRkIGRvZXMgbm90IHJldHVybiB0aGUgc2V0LlxuICAgICAgICAgICAgICAgIHJldHVybiBzZXQ7XG4gICAgICAgICAgICB9LCBuZXcgU2V0KCkpO1xuICAgICAgICAgICAgLy8gQXJyYXkuZnJvbSBkb2VzIG5vdCB3b3JrIG9uIFNldCBpbiBJRVxuICAgICAgICAgICAgc3R5bGVTZXQuZm9yRWFjaCgodikgPT4gc3R5bGVzLnVuc2hpZnQodikpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHVzZXJTdHlsZXMpIHtcbiAgICAgICAgICAgIHN0eWxlcy5wdXNoKHVzZXJTdHlsZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHlsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGVsZW1lbnQgaW5pdGlhbGl6YXRpb24uIEJ5IGRlZmF1bHQgdGhpcyBjYWxscyBgY3JlYXRlUmVuZGVyUm9vdGBcbiAgICAgKiB0byBjcmVhdGUgdGhlIGVsZW1lbnQgYHJlbmRlclJvb3RgIG5vZGUgYW5kIGNhcHR1cmVzIGFueSBwcmUtc2V0IHZhbHVlcyBmb3JcbiAgICAgKiByZWdpc3RlcmVkIHByb3BlcnRpZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB0aGlzLnJlbmRlclJvb3QgPSB0aGlzLmNyZWF0ZVJlbmRlclJvb3QoKTtcbiAgICAgICAgLy8gTm90ZSwgaWYgcmVuZGVyUm9vdCBpcyBub3QgYSBzaGFkb3dSb290LCBzdHlsZXMgd291bGQvY291bGQgYXBwbHkgdG8gdGhlXG4gICAgICAgIC8vIGVsZW1lbnQncyBnZXRSb290Tm9kZSgpLiBXaGlsZSB0aGlzIGNvdWxkIGJlIGRvbmUsIHdlJ3JlIGNob29zaW5nIG5vdCB0b1xuICAgICAgICAvLyBzdXBwb3J0IHRoaXMgbm93IHNpbmNlIGl0IHdvdWxkIHJlcXVpcmUgZGlmZmVyZW50IGxvZ2ljIGFyb3VuZCBkZS1kdXBpbmcuXG4gICAgICAgIGlmICh3aW5kb3cuU2hhZG93Um9vdCAmJiB0aGlzLnJlbmRlclJvb3QgaW5zdGFuY2VvZiB3aW5kb3cuU2hhZG93Um9vdCkge1xuICAgICAgICAgICAgdGhpcy5hZG9wdFN0eWxlcygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG5vZGUgaW50byB3aGljaCB0aGUgZWxlbWVudCBzaG91bGQgcmVuZGVyIGFuZCBieSBkZWZhdWx0XG4gICAgICogY3JlYXRlcyBhbmQgcmV0dXJucyBhbiBvcGVuIHNoYWRvd1Jvb3QuIEltcGxlbWVudCB0byBjdXN0b21pemUgd2hlcmUgdGhlXG4gICAgICogZWxlbWVudCdzIERPTSBpcyByZW5kZXJlZC4gRm9yIGV4YW1wbGUsIHRvIHJlbmRlciBpbnRvIHRoZSBlbGVtZW50J3NcbiAgICAgKiBjaGlsZE5vZGVzLCByZXR1cm4gYHRoaXNgLlxuICAgICAqIEByZXR1cm5zIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IFJldHVybnMgYSBub2RlIGludG8gd2hpY2ggdG8gcmVuZGVyLlxuICAgICAqL1xuICAgIGNyZWF0ZVJlbmRlclJvb3QoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF0dGFjaFNoYWRvdyh7IG1vZGU6ICdvcGVuJyB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXBwbGllcyBzdHlsaW5nIHRvIHRoZSBlbGVtZW50IHNoYWRvd1Jvb3QgdXNpbmcgdGhlIGBzdGF0aWMgZ2V0IHN0eWxlc2BcbiAgICAgKiBwcm9wZXJ0eS4gU3R5bGluZyB3aWxsIGFwcGx5IHVzaW5nIGBzaGFkb3dSb290LmFkb3B0ZWRTdHlsZVNoZWV0c2Agd2hlcmVcbiAgICAgKiBhdmFpbGFibGUgYW5kIHdpbGwgZmFsbGJhY2sgb3RoZXJ3aXNlLiBXaGVuIFNoYWRvdyBET00gaXMgcG9seWZpbGxlZCxcbiAgICAgKiBTaGFkeUNTUyBzY29wZXMgc3R5bGVzIGFuZCBhZGRzIHRoZW0gdG8gdGhlIGRvY3VtZW50LiBXaGVuIFNoYWRvdyBET01cbiAgICAgKiBpcyBhdmFpbGFibGUgYnV0IGBhZG9wdGVkU3R5bGVTaGVldHNgIGlzIG5vdCwgc3R5bGVzIGFyZSBhcHBlbmRlZCB0byB0aGVcbiAgICAgKiBlbmQgb2YgdGhlIGBzaGFkb3dSb290YCB0byBbbWltaWMgc3BlY1xuICAgICAqIGJlaGF2aW9yXShodHRwczovL3dpY2cuZ2l0aHViLmlvL2NvbnN0cnVjdC1zdHlsZXNoZWV0cy8jdXNpbmctY29uc3RydWN0ZWQtc3R5bGVzaGVldHMpLlxuICAgICAqL1xuICAgIGFkb3B0U3R5bGVzKCkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0aGlzLmNvbnN0cnVjdG9yLl9zdHlsZXM7XG4gICAgICAgIGlmIChzdHlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlcmUgYXJlIHRocmVlIHNlcGFyYXRlIGNhc2VzIGhlcmUgYmFzZWQgb24gU2hhZG93IERPTSBzdXBwb3J0LlxuICAgICAgICAvLyAoMSkgc2hhZG93Um9vdCBwb2x5ZmlsbGVkOiB1c2UgU2hhZHlDU1NcbiAgICAgICAgLy8gKDIpIHNoYWRvd1Jvb3QuYWRvcHRlZFN0eWxlU2hlZXRzIGF2YWlsYWJsZTogdXNlIGl0LlxuICAgICAgICAvLyAoMykgc2hhZG93Um9vdC5hZG9wdGVkU3R5bGVTaGVldHMgcG9seWZpbGxlZDogYXBwZW5kIHN0eWxlcyBhZnRlclxuICAgICAgICAvLyByZW5kZXJpbmdcbiAgICAgICAgaWYgKHdpbmRvdy5TaGFkeUNTUyAhPT0gdW5kZWZpbmVkICYmICF3aW5kb3cuU2hhZHlDU1MubmF0aXZlU2hhZG93KSB7XG4gICAgICAgICAgICB3aW5kb3cuU2hhZHlDU1MuU2NvcGluZ1NoaW0ucHJlcGFyZUFkb3B0ZWRDc3NUZXh0KHN0eWxlcy5tYXAoKHMpID0+IHMuY3NzVGV4dCksIHRoaXMubG9jYWxOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBwb3J0c0Fkb3B0aW5nU3R5bGVTaGVldHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUm9vdC5hZG9wdGVkU3R5bGVTaGVldHMgPVxuICAgICAgICAgICAgICAgIHN0eWxlcy5tYXAoKHMpID0+IHMuc3R5bGVTaGVldCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGlzIG11c3QgYmUgZG9uZSBhZnRlciByZW5kZXJpbmcgc28gdGhlIGFjdHVhbCBzdHlsZSBpbnNlcnRpb24gaXMgZG9uZVxuICAgICAgICAgICAgLy8gaW4gYHVwZGF0ZWAuXG4gICAgICAgICAgICB0aGlzLl9uZWVkc1NoaW1BZG9wdGVkU3R5bGVTaGVldHMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBzdXBlci5jb25uZWN0ZWRDYWxsYmFjaygpO1xuICAgICAgICAvLyBOb3RlLCBmaXJzdCB1cGRhdGUvcmVuZGVyIGhhbmRsZXMgc3R5bGVFbGVtZW50IHNvIHdlIG9ubHkgY2FsbCB0aGlzIGlmXG4gICAgICAgIC8vIGNvbm5lY3RlZCBhZnRlciBmaXJzdCB1cGRhdGUuXG4gICAgICAgIGlmICh0aGlzLmhhc1VwZGF0ZWQgJiYgd2luZG93LlNoYWR5Q1NTICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdpbmRvdy5TaGFkeUNTUy5zdHlsZUVsZW1lbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgZWxlbWVudC4gVGhpcyBtZXRob2QgcmVmbGVjdHMgcHJvcGVydHkgdmFsdWVzIHRvIGF0dHJpYnV0ZXNcbiAgICAgKiBhbmQgY2FsbHMgYHJlbmRlcmAgdG8gcmVuZGVyIERPTSB2aWEgbGl0LWh0bWwuIFNldHRpbmcgcHJvcGVydGllcyBpbnNpZGVcbiAgICAgKiB0aGlzIG1ldGhvZCB3aWxsICpub3QqIHRyaWdnZXIgYW5vdGhlciB1cGRhdGUuXG4gICAgICogKiBAcGFyYW0gX2NoYW5nZWRQcm9wZXJ0aWVzIE1hcCBvZiBjaGFuZ2VkIHByb3BlcnRpZXMgd2l0aCBvbGQgdmFsdWVzXG4gICAgICovXG4gICAgdXBkYXRlKGNoYW5nZWRQcm9wZXJ0aWVzKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShjaGFuZ2VkUHJvcGVydGllcyk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlUmVzdWx0ID0gdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgaWYgKHRlbXBsYXRlUmVzdWx0IGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAucmVuZGVyKHRlbXBsYXRlUmVzdWx0LCB0aGlzLnJlbmRlclJvb3QsIHsgc2NvcGVOYW1lOiB0aGlzLmxvY2FsTmFtZSwgZXZlbnRDb250ZXh0OiB0aGlzIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdoZW4gbmF0aXZlIFNoYWRvdyBET00gaXMgdXNlZCBidXQgYWRvcHRlZFN0eWxlcyBhcmUgbm90IHN1cHBvcnRlZCxcbiAgICAgICAgLy8gaW5zZXJ0IHN0eWxpbmcgYWZ0ZXIgcmVuZGVyaW5nIHRvIGVuc3VyZSBhZG9wdGVkU3R5bGVzIGhhdmUgaGlnaGVzdFxuICAgICAgICAvLyBwcmlvcml0eS5cbiAgICAgICAgaWYgKHRoaXMuX25lZWRzU2hpbUFkb3B0ZWRTdHlsZVNoZWV0cykge1xuICAgICAgICAgICAgdGhpcy5fbmVlZHNTaGltQWRvcHRlZFN0eWxlU2hlZXRzID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNvbnN0cnVjdG9yLl9zdHlsZXMuZm9yRWFjaCgocykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHMuY3NzVGV4dDtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJvb3QuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW52b2tlZCBvbiBlYWNoIHVwZGF0ZSB0byBwZXJmb3JtIHJlbmRlcmluZyB0YXNrcy4gVGhpcyBtZXRob2QgbXVzdCByZXR1cm5cbiAgICAgKiBhIGxpdC1odG1sIFRlbXBsYXRlUmVzdWx0LiBTZXR0aW5nIHByb3BlcnRpZXMgaW5zaWRlIHRoaXMgbWV0aG9kIHdpbGwgKm5vdCpcbiAgICAgKiB0cmlnZ2VyIHRoZSBlbGVtZW50IHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICByZW5kZXIoKSB7XG4gICAgfVxufVxuLyoqXG4gKiBFbnN1cmUgdGhpcyBjbGFzcyBpcyBtYXJrZWQgYXMgYGZpbmFsaXplZGAgYXMgYW4gb3B0aW1pemF0aW9uIGVuc3VyaW5nXG4gKiBpdCB3aWxsIG5vdCBuZWVkbGVzc2x5IHRyeSB0byBgZmluYWxpemVgLlxuICovXG5MaXRFbGVtZW50LmZpbmFsaXplZCA9IHRydWU7XG4vKipcbiAqIFJlbmRlciBtZXRob2QgdXNlZCB0byByZW5kZXIgdGhlIGxpdC1odG1sIFRlbXBsYXRlUmVzdWx0IHRvIHRoZSBlbGVtZW50J3NcbiAqIERPTS5cbiAqIEBwYXJhbSB7VGVtcGxhdGVSZXN1bHR9IFRlbXBsYXRlIHRvIHJlbmRlci5cbiAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBOb2RlIGludG8gd2hpY2ggdG8gcmVuZGVyLlxuICogQHBhcmFtIHtTdHJpbmd9IEVsZW1lbnQgbmFtZS5cbiAqIEBub2NvbGxhcHNlXG4gKi9cbkxpdEVsZW1lbnQucmVuZGVyID0gcmVuZGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGl0LWVsZW1lbnQuanMubWFwIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuaW1wb3J0IHsgaXNQcmltaXRpdmUgfSBmcm9tICcuLi9saWIvcGFydHMuanMnO1xuaW1wb3J0IHsgZGlyZWN0aXZlLCBOb2RlUGFydCB9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbi8vIEZvciBlYWNoIHBhcnQsIHJlbWVtYmVyIHRoZSB2YWx1ZSB0aGF0IHdhcyBsYXN0IHJlbmRlcmVkIHRvIHRoZSBwYXJ0IGJ5IHRoZVxuLy8gdW5zYWZlSFRNTCBkaXJlY3RpdmUsIGFuZCB0aGUgRG9jdW1lbnRGcmFnbWVudCB0aGF0IHdhcyBsYXN0IHNldCBhcyBhIHZhbHVlLlxuLy8gVGhlIERvY3VtZW50RnJhZ21lbnQgaXMgdXNlZCBhcyBhIHVuaXF1ZSBrZXkgdG8gY2hlY2sgaWYgdGhlIGxhc3QgdmFsdWVcbi8vIHJlbmRlcmVkIHRvIHRoZSBwYXJ0IHdhcyB3aXRoIHVuc2FmZUhUTUwuIElmIG5vdCwgd2UnbGwgYWx3YXlzIHJlLXJlbmRlciB0aGVcbi8vIHZhbHVlIHBhc3NlZCB0byB1bnNhZmVIVE1MLlxuY29uc3QgcHJldmlvdXNWYWx1ZXMgPSBuZXcgV2Vha01hcCgpO1xuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoKHZhbHVlKSA9PiAocGFydCkgPT4ge1xuICAgIGlmICghKHBhcnQgaW5zdGFuY2VvZiBOb2RlUGFydCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnNhZmVIVE1MIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBiaW5kaW5ncycpO1xuICAgIH1cbiAgICBjb25zdCBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXNWYWx1ZXMuZ2V0KHBhcnQpO1xuICAgIGlmIChwcmV2aW91c1ZhbHVlICE9PSB1bmRlZmluZWQgJiYgaXNQcmltaXRpdmUodmFsdWUpICYmXG4gICAgICAgIHZhbHVlID09PSBwcmV2aW91c1ZhbHVlLnZhbHVlICYmIHBhcnQudmFsdWUgPT09IHByZXZpb3VzVmFsdWUuZnJhZ21lbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gdmFsdWU7IC8vIGlubmVySFRNTCBjYXN0cyB0byBzdHJpbmcgaW50ZXJuYWxseVxuICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuaW1wb3J0Tm9kZSh0ZW1wbGF0ZS5jb250ZW50LCB0cnVlKTtcbiAgICBwYXJ0LnNldFZhbHVlKGZyYWdtZW50KTtcbiAgICBwcmV2aW91c1ZhbHVlcy5zZXQocGFydCwgeyB2YWx1ZSwgZnJhZ21lbnQgfSk7XG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXVuc2FmZS1odG1sLmpzLm1hcCIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge3Vuc2FmZUhUTUx9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFhWaWV3IGV4dGVuZHMgTGl0RWxlbWVudCB7XHJcbiAgc3RhdGljIGdldCBwcm9wZXJ0aWVzKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY29tcG9uZW50OiB7dHlwZTogU3RyaW5nfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIGxldCB0ZW1wbGF0ZSA9ICh0aGlzLmNvbXBvbmVudCAhPSBudWxsICYmIHRoaXMuY29tcG9uZW50ICE9PSAnJykgPyBgPCR7dGhpcy5jb21wb25lbnR9PjwvJHt0aGlzLmNvbXBvbmVudH0+YCA6ICcnO1xyXG4gICAgcmV0dXJuIGh0bWxgJHt1bnNhZmVIVE1MKHRlbXBsYXRlKX1gO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUmVuZGVyUm9vdCgpIHtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LXZpZXcnLCBYVmlldyk7XHJcbiIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VTdGFydCBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8cD5UaGVzZSBhcmUgdGhlIGFwcGxldHMgdGhhdCBhY2NvbXBhbnkgeW91ciB0ZXh0IGJvb2sgPHN0cm9uZz5cIkRhdGEgU3RydWN0dXJlcyBhbmQgQWxnb3JpdGhtcyBpbiBKYXZhXCI8L3N0cm9uZz4sIFNlY29uZCBFZGl0aW9uLiBSb2JlcnQgTGFmb3JlLCAyMDAyPC9wPlxyXG4gICAgICA8cD5UaGUgYXBwbGV0cyBhcmUgbGl0dGxlIGRlbW9uc3RyYXRpb24gcHJvZ3JhbXMgdGhhdCBjbGFyaWZ5IHRoZSB0b3BpY3MgaW4gdGhlIGJvb2suIDxicj5cclxuICAgICAgRm9yIGV4YW1wbGUsIHRvIGRlbW9uc3RyYXRlIHNvcnRpbmcgYWxnb3JpdGhtcywgYSBiYXIgY2hhcnQgaXMgZGlzcGxheWVkIGFuZCwgZWFjaCB0aW1lIHRoZSB1c2VyIHB1c2hlcyBhIGJ1dHRvbiBvbiB0aGUgYXBwbGV0LCBhbm90aGVyIHN0ZXAgb2YgdGhlIGFsZ29yaXRobSBpcyBjYXJyaWVkIG91dC4gVGhlIHVzZXIgY2FuIHNlZSBob3cgdGhlIGJhcnMgbW92ZSwgYW5kIGFubm90YXRpb25zIHdpdGhpbiB0aGUgYXBwbGV0IGV4cGxhaW4gd2hhdCdzIGdvaW5nIG9uLjwvcD5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVSZW5kZXJSb290KCkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2Utc3RhcnQnLCBQYWdlU3RhcnQpOyIsImV4cG9ydCBjb25zdCBnZXRVbmlxdWVSYW5kb21BcnJheSA9IChsZW5ndGgsIG1heCkgPT4ge1xyXG4gIGNvbnN0IGFycmF5ID0gW107XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgYXJyYXkucHVzaChnZXRVbmlxdWVSYW5kb21OdW1iZXIoYXJyYXksIG1heCkpO1xyXG4gIH1cclxuICByZXR1cm4gYXJyYXk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0VW5pcXVlUmFuZG9tTnVtYmVyID0gKGl0ZW1zLCBtYXgpID0+IHtcclxuICBjb25zdCBudW0gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXgpO1xyXG4gIHJldHVybiBpdGVtcy5maW5kKGkgPT4gaSA9PT0gbnVtKSA/IGdldFVuaXF1ZVJhbmRvbU51bWJlcihpdGVtcywgbWF4KSA6IG51bTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBpc1ByaW1lID0gKG51bSkgPT4ge1xyXG4gIGZvciAobGV0IGkgPSAyLCBzID0gTWF0aC5zcXJ0KG51bSk7IGkgPD0gczsgaSsrKVxyXG4gICAgaWYgKG51bSAlIGkgPT09IDApIHJldHVybiBmYWxzZTtcclxuICByZXR1cm4gbnVtID4gMTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb2xvcnMxMDAgPSBbXHJcbiAgJyNGRkNERDInLFxyXG4gICcjRjhCQkQwJyxcclxuICAnI0UxQkVFNycsXHJcbiAgJyNEMUM0RTknLFxyXG4gICcjQzVDQUU5JyxcclxuICAnI0JCREVGQicsXHJcbiAgJyNCM0U1RkMnLFxyXG4gICcjQjJFQkYyJyxcclxuICAnI0IyREZEQicsXHJcbiAgJyNDOEU2QzknLFxyXG4gICcjRENFREM4JyxcclxuICAnI0YwRjRDMycsXHJcbiAgJyNGRkY5QzQnLFxyXG4gICcjRkZFQ0IzJyxcclxuICAnI0ZGRTBCMicsXHJcbiAgJyNGRkNDQkMnLFxyXG4gICcjRDdDQ0M4JyxcclxuICAnI0NGRDhEQycsXHJcbiAgJyNGNUY1RjUnLFxyXG5dO1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldENvbG9yMTAwID0gKGkpID0+IHtcclxuICByZXR1cm4gY29sb3JzMTAwW2kgJSBjb2xvcnMxMDAubGVuZ3RoXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRSYW5kb21Db2xvcjEwMCA9ICgpID0+IHtcclxuICByZXR1cm4gY29sb3JzMTAwW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9yczEwMC5sZW5ndGgpXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb2xvcnM0MDAgPSBbXHJcbiAgJyNFRjUzNTAnLFxyXG4gICcjRUM0MDdBJyxcclxuICAnI0FCNDdCQycsXHJcbiAgJyM3RTU3QzInLFxyXG4gICcjNUM2QkMwJyxcclxuICAnIzQyQTVGNScsXHJcbiAgJyMyOUI2RjYnLFxyXG4gICcjMjZDNkRBJyxcclxuICAnIzI2QTY5QScsXHJcbiAgJyM2NkJCNkEnLFxyXG4gICcjOUNDQzY1JyxcclxuICAnI0Q0RTE1NycsXHJcbiAgJyNGRkVFNTgnLFxyXG4gICcjRkZDQTI4JyxcclxuICAnI0ZGQTcyNicsXHJcbiAgJyNGRjcwNDMnLFxyXG4gICcjOEQ2RTYzJyxcclxuICAnIzc4OTA5QycsXHJcbiAgJyNCREJEQkQnLFxyXG5dO1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldENvbG9yNDAwID0gKGkpID0+IHtcclxuICByZXR1cm4gY29sb3JzNDAwW2kgJSBjb2xvcnM0MDAubGVuZ3RoXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRSYW5kb21Db2xvcjQwMCA9ICgpID0+IHtcclxuICByZXR1cm4gY29sb3JzNDAwW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvbG9yczQwMC5sZW5ndGgpXTtcclxufTsiLCJpbXBvcnQge2dldFJhbmRvbUNvbG9yMTAwfSBmcm9tICcuLi91dGlscyc7XHJcblxyXG5leHBvcnQgY2xhc3MgSXRlbSB7XHJcbiAgY29uc3RydWN0b3Ioe2luZGV4LCB2YWx1ZSwgY29sb3IsIG1hcmsgPSBmYWxzZX0pIHtcclxuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcclxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBjb2xvcjtcclxuICAgIHRoaXMubWFyayA9IG1hcms7XHJcbiAgfVxyXG5cclxuICBjbGVhcigpIHtcclxuICAgIHRoaXMudmFsdWUgPSBudWxsO1xyXG4gICAgdGhpcy5jb2xvciA9IG51bGw7XHJcbiAgICB0aGlzLm1hcmsgPSBmYWxzZTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgc2V0VmFsdWUodmFsdWUsIGNvbG9yID0gZ2V0UmFuZG9tQ29sb3IxMDAoKSkge1xyXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgdGhpcy5jb2xvciA9IGNvbG9yO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBjb3B5RnJvbShpdGVtKSB7XHJcbiAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBpdGVtLmNvbG9yO1xyXG4gICAgdGhpcy5tYXJrID0gaXRlbS5tYXJrO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBtb3ZlRnJvbShpdGVtKSB7XHJcbiAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIHRoaXMuY29sb3IgPSBpdGVtLmNvbG9yO1xyXG4gICAgdGhpcy5tYXJrID0gaXRlbS5tYXJrO1xyXG4gICAgaXRlbS52YWx1ZSA9IG51bGw7XHJcbiAgICBpdGVtLmNvbG9yID0gbnVsbDtcclxuICAgIGl0ZW0ubWFyayA9IGZhbHNlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBzd2FwV2l0aChpdGVtKSB7XHJcbiAgICBjb25zdCBjYWNoZVZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgIGNvbnN0IGNhY2hlQ29sb3IgPSB0aGlzLmNvbG9yO1xyXG4gICAgY29uc3QgY2FjaGVNYXJrID0gdGhpcy5tYXJrO1xyXG4gICAgdGhpcy52YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICB0aGlzLmNvbG9yID0gaXRlbS5jb2xvcjtcclxuICAgIHRoaXMubWFyayA9IGl0ZW0ubWFyaztcclxuICAgIGl0ZW0udmFsdWUgPSBjYWNoZVZhbHVlO1xyXG4gICAgaXRlbS5jb2xvciA9IGNhY2hlQ29sb3I7XHJcbiAgICBpdGVtLm1hcmsgPSBjYWNoZU1hcms7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn0iLCJleHBvcnQgY2xhc3MgTWFya2VyIHtcclxuICBjb25zdHJ1Y3Rvcih7cG9zaXRpb24sIHRleHQsIGNvbG9yID0gJ3JlZCcsIHNpemUgPSAxfSkge1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgdGhpcy5jb2xvciA9IGNvbG9yO1xyXG4gICAgdGhpcy5zaXplID0gc2l6ZTtcclxuICAgIHRoaXMudGV4dCA9IHRleHQ7XHJcbiAgfVxyXG59IiwiaW1wb3J0IHtMaXRFbGVtZW50fSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUJhc2UgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBjcmVhdGVSZW5kZXJSb290KCkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljayhpdGVyYXRvciwgYnRuKSB7XHJcbiAgICBpZiAoIXRoaXMuaXRlcmF0b3IpIHtcclxuICAgICAgdGhpcy5pdGVyYXRvciA9IGl0ZXJhdG9yLmNhbGwodGhpcyk7XHJcbiAgICAgIHRoaXMudG9nZ2xlQnV0dG9uc0FjdGl2aXR5KGJ0biwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBpdGVyYXRpb24gPSB0aGlzLml0ZXJhdGUoKTtcclxuICAgIGlmIChpdGVyYXRpb24uZG9uZSkge1xyXG4gICAgICB0aGlzLml0ZXJhdG9yID0gbnVsbDtcclxuICAgICAgdGhpcy50b2dnbGVCdXR0b25zQWN0aXZpdHkoYnRuLCBmYWxzZSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gWy4uLnRoaXMuaXRlbXNdO1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVCdXR0b25zQWN0aXZpdHkoYnRuLCBzdGF0dXMpIHtcclxuICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbCgneC1idXR0b24nKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgaWYgKGVsICE9PSBidG4pIGVsLmRpc2FibGVkID0gc3RhdHVzO1xyXG4gICAgfSk7XHJcbiAgICBidG4uYWN0aXZhdGVkID0gc3RhdHVzO1xyXG4gIH1cclxuXHJcbiAgaXRlcmF0ZSgpIHtcclxuICAgIGNvbnN0IGl0ZXJhdGlvbiA9IHRoaXMuaXRlcmF0b3IubmV4dCgpO1xyXG4gICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoaXRlcmF0aW9uLnZhbHVlKTtcclxuICAgIGNvbnN0IGFjdGl2YXRlZEJ0biA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1idXR0b24uYWN0aXZhdGVkJyk7XHJcbiAgICBpZiAoYWN0aXZhdGVkQnRuKSBhY3RpdmF0ZWRCdG4uZm9jdXMoKTtcclxuICAgIHJldHVybiBpdGVyYXRpb247XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLmxlbmd0aCA9IDA7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gIH1cclxufSIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEJ1dHRvbiBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNhbGxiYWNrOiB7dHlwZTogRnVuY3Rpb259LFxyXG4gICAgICBkaXNhYmxlZDoge3R5cGU6IEJvb2xlYW59LFxyXG4gICAgICBhY3RpdmF0ZWQ6IHt0eXBlOiBCb29sZWFufVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlwiIEBjbGljaz0ke3RoaXMuaGFuZGxlQ2xpY2t9ID9kaXNhYmxlZD0ke3RoaXMuZGlzYWJsZWR9PlxyXG4gICAgICAgIDxzbG90IGNsYXNzPSR7dGhpcy5hY3RpdmF0ZWQgPyAnaGlkZGVuJyA6ICcnfT48L3Nsb3Q+ICAgICAgXHJcbiAgICAgICAgPHNwYW4gY2xhc3M9JHt0aGlzLmFjdGl2YXRlZCA/ICcnIDogJ2hpZGRlbid9Pk5leHQ8L3NwYW4+XHJcbiAgICAgIDwvYnV0dG9uPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGNyZWF0ZVJlbmRlclJvb3QoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5hdHRhY2hTaGFkb3coe21vZGU6ICdvcGVuJywgZGVsZWdhdGVzRm9jdXM6IHRydWV9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2YXRlZCcsIHRoaXMuYWN0aXZhdGVkKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZUNsaWNrKCkge1xyXG4gICAgdGhpcy5jYWxsYmFjayh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcblhCdXR0b24uc3R5bGVzID0gY3NzYFxyXG4gIC5oaWRkZW4ge1xyXG4gICAgZGlzcGxheTogbm9uZTtcclxuICB9XHJcbiAgYnV0dG9uIHtcclxuICAgIGhlaWdodDogMS42ZW07XHJcbiAgICBib3JkZXItcmFkaXVzOiA0cHg7XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCBncmF5O1xyXG4gICAgYmFja2dyb3VuZDogd2hpdGVzbW9rZTtcclxuICB9XHJcbmA7XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtYnV0dG9uJywgWEJ1dHRvbik7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sLCBjc3N9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuXHJcbmV4cG9ydCBjbGFzcyBYQ29uc29sZSBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRlZmF1bHRNZXNzYWdlOiB7dHlwZTogU3RyaW5nfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuZGVmYXVsdE1lc3NhZ2UgPSAnUHJlc3MgYW55IGJ1dHRvbic7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPHAgY2xhc3M9XCJtZXNzYWdlXCI+JHt0aGlzLm1lc3NhZ2UgfHwgdGhpcy5kZWZhdWx0TWVzc2FnZX08L3A+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgc2V0TWVzc2FnZSh0ZXh0KSB7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSB0ZXh0O1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5YQ29uc29sZS5zdHlsZXMgPSBjc3NgXHJcbiAgOmhvc3Qge1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgfVxyXG4gIC5tZXNzYWdlIHtcclxuICAgIHBhZGRpbmc6IDEwcHg7XHJcbiAgICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xyXG4gIH1cclxuXHJcbiAgLm1lc3NhZ2UgdGFibGUge1xyXG4gICAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xyXG4gIH1cclxuICAubWVzc2FnZSB0YWJsZSB0ZCxcclxuICAubWVzc2FnZSB0YWJsZSB0aCB7XHJcbiAgICAgIHBhZGRpbmc6IDJweCA2cHg7XHJcbiAgfVxyXG4gIC5tZXNzYWdlIHRhYmxlIHRoIHtcclxuICAgICAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcclxuICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIGJsYWNrO1xyXG4gIH1cclxuICAubWVzc2FnZSAubWFya2VkIHtcclxuICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgICAgIGNvbG9yOiByZWQ7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWNvbnNvbGUnLCBYQ29uc29sZSk7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWERpYWxvZyBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8ZGlhbG9nPlxyXG4gICAgICAgIDxmb3JtIG1ldGhvZD1cImRpYWxvZ1wiPlxyXG4gICAgICAgICAgPHAgY2xhc3M9XCJzbG90Q250XCI+XHJcbiAgICAgICAgICAgIDxzbG90Pjwvc2xvdD5cclxuICAgICAgICAgIDwvcD5cclxuICAgICAgICAgIDxidXR0b24gdmFsdWU9XCJkZWZhdWx0XCI+Q29uZmlybTwvYnV0dG9uPlxyXG4gICAgICAgICAgPGJ1dHRvbiB2YWx1ZT1cImNhbmNlbFwiPkNhbmNlbDwvYnV0dG9uPlxyXG4gICAgICAgIDwvZm9ybT5cclxuICAgICAgPC9kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignZGlhbG9nJyk7XHJcbiAgICB0aGlzLmZvcm0gPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignZm9ybScpO1xyXG4gICAgLy9tb3ZlIHNsb3R0ZWQgbm9kZXMgaW50byBkaWFsb2cncyBmb3JtIGRpcmVjdGx5IGZvciBwcm9wZXIgd29yayBGb3JtRGF0YVxyXG4gICAgLy9UT0RPOiBmaW5kIGEgYmV0dGVyIHdheSB0byBiZWF0IHRoaXMgcHJvYmxlbVxyXG4gICAgY29uc3Qgc2xvdCA9IHRoaXMuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCdzbG90Jyk7XHJcbiAgICB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignLnNsb3RDbnQnKS5hcHBlbmQoLi4uc2xvdC5hc3NpZ25lZE5vZGVzKCkpO1xyXG4gICAgc2xvdC5yZW1vdmUoKTtcclxuICB9XHJcblxyXG4gIG9wZW4oKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICB0aGlzLmRpYWxvZy5zaG93TW9kYWwoKTtcclxuICAgICAgY29uc3Qgb25DbG9zZSA9ICgpID0+IHtcclxuICAgICAgICB0aGlzLmRpYWxvZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xyXG4gICAgICAgIGlmICh0aGlzLmRpYWxvZy5yZXR1cm5WYWx1ZSA9PT0gJ2RlZmF1bHQnKSB7XHJcbiAgICAgICAgICByZXNvbHZlKG5ldyBGb3JtRGF0YSh0aGlzLmZvcm0pKTtcclxuICAgICAgICAgIHRoaXMuZm9ybS5yZXNldCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZWplY3QoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHRoaXMuZGlhbG9nLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgneC1kaWFsb2cnLCBYRGlhbG9nKTsiLCJpbXBvcnQge0xpdEVsZW1lbnQsIGh0bWwsIGNzc30gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFhJbmZvIGV4dGVuZHMgTGl0RWxlbWVudCB7XHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiXCIgQGNsaWNrPSR7KCkgPT4gdGhpcy5pbmZvLmNsYXNzTGlzdC50b2dnbGUoJ3Nob3cnKX0+PzwvYnV0dG9uPlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxzbG90Pjwvc2xvdD5cclxuICAgICAgPC9kaXY+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5pbmZvID0gdGhpcy5zaGFkb3dSb290LnF1ZXJ5U2VsZWN0b3IoJ2RpdicpO1xyXG4gIH1cclxufVxyXG5cclxuWEluZm8uc3R5bGVzID0gY3NzYFxyXG4gIDpob3N0IHtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICB9XHJcbiAgYnV0dG9uIHtcclxuICAgIHdpZHRoOiAxLjY4ZW07XHJcbiAgICBoZWlnaHQ6IDEuNmVtO1xyXG4gICAgcGFkZGluZzogMDtcclxuICAgIG1hcmdpbjogMCAwIDAgLjVlbTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcclxuICAgIGJvcmRlcjogMXB4IHNvbGlkIGdyYXk7XHJcbiAgICBiYWNrZ3JvdW5kOiB3aGl0ZXNtb2tlO1xyXG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgfVxyXG4gIGRpdiB7XHJcbiAgICB6LWluZGV4OiAxMDtcclxuICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICB0b3A6IC41ZW07XHJcbiAgICBsZWZ0OiAyZW07XHJcbiAgICB3aWR0aDogMjUwcHg7XHJcbiAgICBwYWRkaW5nOiAwIDE1cHg7XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCBncmF5O1xyXG4gICAgYmFja2dyb3VuZDogd2hpdGVzbW9rZTtcclxuICB9XHJcbiAgYnV0dG9uOmhvdmVyICsgZGl2IHtcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gIH1cclxuICAuc2hvdyB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICB9XHJcbmA7XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtaW5mbycsIFhJbmZvKTsiLCJpbXBvcnQge2NzcywgaHRtbCwgTGl0RWxlbWVudH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFhJdGVtc0hvcml6b250YWwgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgbWFya2Vyczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgcmV2ZXJzZToge3R5cGU6IEJvb2xlYW59LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgY29uc3QgaXRlbXMgPSB0aGlzLml0ZW1zLm1hcChpdGVtID0+IGh0bWxgXHJcbiAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImluZGV4XCI+XHJcbiAgICAgICAgICAke2l0ZW0uaW5kZXh9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCIgc3R5bGU9XCIke2l0ZW0uY29sb3IgPyAnYmFja2dyb3VuZC1jb2xvcjonICsgaXRlbS5jb2xvciA6ICcnfVwiPlxyXG4gICAgICAgICAgJHtpdGVtLnZhbHVlfVxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJtYXJrZXJfY29udGFpbmVyICR7aXRlbS5tYXJrID8gJ21hcmsnIDogJyd9XCI+XHJcbiAgICAgICAgICAke3RoaXMucmVuZGVyTWFya2VyKGl0ZW0uaW5kZXgpfVxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIGApO1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgICR7dGhpcy5yZXZlcnNlID8gaXRlbXMucmV2ZXJzZSgpIDogaXRlbXN9ICAgICAgXHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyTWFya2VyKGkpIHtcclxuICAgIGxldCByZXN1bHQgPSAnJztcclxuICAgIHRoaXMubWFya2Vycy5mb3JFYWNoKG1hcmtlciA9PiB7XHJcbiAgICAgIGlmIChtYXJrZXIucG9zaXRpb24gPT09IGkpIHtcclxuICAgICAgICByZXN1bHQgPSBodG1sYFxyXG4gICAgICAgICAgJHtyZXN1bHR9XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibWFya2VyIHNpemVfJHttYXJrZXIuc2l6ZX0gJHttYXJrZXIuY29sb3IgPyAnY29sb3JfJyArIG1hcmtlci5jb2xvciA6ICcnfVwiPlxyXG4gICAgICAgICAgICA8c3Bhbj4ke21hcmtlci50ZXh0fTwvc3Bhbj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIGA7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcbn1cclxuXHJcblhJdGVtc0hvcml6b250YWwuc3R5bGVzID0gY3NzYFxyXG4gIDpob3N0IHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xyXG4gICAgZmxleC13cmFwOiB3cmFwO1xyXG4gICAgaGVpZ2h0OiAxOWVtO1xyXG4gICAgbWF4LXdpZHRoOiA2MDBweDtcclxuICB9XHJcbiAgLml0ZW0ge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICB9XHJcbiAgLmluZGV4LCAudmFsdWUsIC5zdGF0ZSB7XHJcbiAgICBhbGlnbi1zZWxmOiBjZW50ZXI7XHJcbiAgfVxyXG4gIC5pbmRleCB7XHJcbiAgICB3aWR0aDogMS41ZW07XHJcbiAgICBwYWRkaW5nLXJpZ2h0OiA0cHg7XHJcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIG1pbi13aWR0aDogMS43ZW07XHJcbiAgICBtaW4taGVpZ2h0OiAxLjdlbTtcclxuICAgIHBhZGRpbmc6IDAgMTBweDtcclxuICAgIG1hcmdpbjogMDtcclxuICAgIGxpbmUtaGVpZ2h0OiAxLjdlbTtcclxuICAgIGJvcmRlcjogMXB4IHNvbGlkIGxpZ2h0Z3JheTtcclxuICB9XHJcbiAgLm1hcmtlcl9jb250YWluZXIge1xyXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xyXG4gICAgbWluLWhlaWdodDogMS43ZW07XHJcbiAgICBwYWRkaW5nLWxlZnQ6IDNlbTtcclxuICAgIGxpbmUtaGVpZ2h0OiAxLjdlbTtcclxuICB9XHJcbiAgLm1hcms6YmVmb3JlIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgd2lkdGg6IDRweDtcclxuICAgIGhlaWdodDogMS45ZW07XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICBsZWZ0OiAwO1xyXG4gICAgbWFyZ2luLXRvcDogLTFweDtcclxuICAgIGJhY2tncm91bmQtY29sb3I6IHJveWFsYmx1ZTtcclxuICB9XHJcbiAgLm1hcmtlciB7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICBsZWZ0OiAwO1xyXG4gICAgaGVpZ2h0OiAxMDAlO1xyXG4gICAgZm9udC1zaXplOiAuOGVtO1xyXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gIH1cclxuICAubWFya2VyIHNwYW4ge1xyXG4gICAgdGV4dC1zaGFkb3c6IHdoaXRlIDFweCAxcHggMDtcclxuICB9XHJcbiAgLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgY29udGVudDogJyc7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHdpZHRoOiA1cHg7XHJcbiAgICBoZWlnaHQ6IDVweDtcclxuICAgIHRvcDogNTAlO1xyXG4gICAgbGVmdDogNnB4O1xyXG4gICAgdHJhbnNmb3JtOiByb3RhdGUoLTEzNWRlZykgdHJhbnNsYXRlKDUwJSwgNTAlKTtcclxuICAgIHRyYW5zZm9ybS1vcmlnaW46IGNlbnRlcjtcclxuICAgIGJvcmRlcjogMnB4IHNvbGlkO1xyXG4gICAgYm9yZGVyLWxlZnQ6IG5vbmU7XHJcbiAgICBib3JkZXItYm90dG9tOiBub25lO1xyXG4gIH1cclxuICAubWFya2VyOmFmdGVyIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICBoZWlnaHQ6IDJweDtcclxuICAgIHRvcDogNTAlO1xyXG4gICAgbGVmdDogNnB4O1xyXG4gICAgbWFyZ2luLXRvcDogLTJweDtcclxuICB9XHJcbiAgLnNpemVfMS5tYXJrZXIge1xyXG4gICAgei1pbmRleDogMztcclxuICAgIHBhZGRpbmctbGVmdDogMmVtO1xyXG4gIH1cclxuICAuc2l6ZV8xLm1hcmtlcjphZnRlciB7XHJcbiAgICB3aWR0aDogMWVtO1xyXG4gIH1cclxuICAuc2l6ZV8yLm1hcmtlciB7XHJcbiAgICB6LWluZGV4OiAyO1xyXG4gICAgcGFkZGluZy1sZWZ0OiA0ZW07XHJcbiAgfVxyXG4gIC5zaXplXzIubWFya2VyOmFmdGVyIHtcclxuICAgIHdpZHRoOiAzZW07XHJcbiAgfVxyXG4gIC5zaXplXzMubWFya2VyIHtcclxuICAgIHotaW5kZXg6IDE7XHJcbiAgICBwYWRkaW5nLWxlZnQ6IDZlbTtcclxuICB9XHJcbiAgLnNpemVfMy5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgd2lkdGg6IDVlbTtcclxuICB9XHJcbiAgLmNvbG9yX3JlZC5tYXJrZXIge1xyXG4gICAgY29sb3I6IHJlZDtcclxuICB9XHJcbiAgLmNvbG9yX3JlZC5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGJvcmRlci1jb2xvcjogcmVkO1xyXG4gIH1cclxuICAuY29sb3JfcmVkLm1hcmtlcjphZnRlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XHJcbiAgfVxyXG4gIC5jb2xvcl9ibHVlLm1hcmtlciB7XHJcbiAgICBjb2xvcjogYmx1ZTtcclxuICB9XHJcbiAgLmNvbG9yX2JsdWUubWFya2VyOmJlZm9yZSB7XHJcbiAgICBib3JkZXItY29sb3I6IGJsdWU7XHJcbiAgfVxyXG4gIC5jb2xvcl9ibHVlLm1hcmtlcjphZnRlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBibHVlO1xyXG4gIH1cclxuICAuY29sb3JfcHVycGxlLm1hcmtlciB7XHJcbiAgICBjb2xvcjogcHVycGxlO1xyXG4gIH1cclxuICAuY29sb3JfcHVycGxlLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgYm9yZGVyLWNvbG9yOiBwdXJwbGU7XHJcbiAgfVxyXG4gIC5jb2xvcl9wdXJwbGUubWFya2VyOmFmdGVyIHtcclxuICAgIGJhY2tncm91bmQtY29sb3I6IHB1cnBsZTtcclxuICB9XHJcbmA7XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtaXRlbXMtaG9yaXpvbnRhbCcsIFhJdGVtc0hvcml6b250YWwpOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge2dldFVuaXF1ZVJhbmRvbU51bWJlcn0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvYnV0dG9uJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2NvbnNvbGUnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvZGlhbG9nJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNIb3Jpem9udGFsJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlQXJyYXkgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdBcnJheSc7XHJcbiAgICB0aGlzLmluZm8gPSBodG1sYFxyXG4gICAgICA8cD48Yj5OZXc8L2I+IGNyZWF0ZXMgYXJyYXkgd2l0aCBOIGNlbGxzICg2MCBtYXgpPC9wPlxyXG4gICAgICA8cD48Yj5GaWxsPC9iPiBpbnNlcnRzIE4gaXRlbXMgaW50byBhcnJheTwvcD5cclxuICAgICAgPHA+PGI+SW5zPC9iPiBpbnNlcnRzIG5ldyBpdGVtIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgPHA+PGI+RmluZDwvYj4gZmluZHMgaXRlbShzKSB3aXRoIHZhbHVlIE48L3A+XHJcbiAgICAgIDxwPjxiPkRlbDwvYj4gZGVsZXRlcyBpdGVtKHMpIHdpdGggdmFsdWUgTjwvcD5cclxuICAgIGA7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXTtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPiR7dGhpcy50aXRsZX08L2gxPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yTmV3KX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGaWxsKX0+RmlsbDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9ySW5zKX0+SW5zPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGaW5kKX0+RmluZDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRGVsKX0+RGVsPC94LWJ1dHRvbj5cclxuICAgICAgICAke3RoaXMucmVuZGVyQWRkaXRpb25hbENvbnRyb2woKX1cclxuICAgICAgICA8eC1pbmZvPiR7dGhpcy5pbmZvfTwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtaG9yaXpvbnRhbCAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2Vycz0ke3RoaXMubWFya2Vyc30+PC94LWl0ZW1zLWhvcml6b250YWw+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlckFkZGl0aW9uYWxDb250cm9sKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxsYWJlbD48aW5wdXQgY2xhc3M9XCJkdXBzXCIgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZCBkaXNhYmxlZD5EdXBzIE9LPC9sYWJlbD5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtY29uc29sZScpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgICB0aGlzLmR1cHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5kdXBzJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSAyMDtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSAxMDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBpdGVtID0gbmV3IEl0ZW0oe2luZGV4OiBpfSk7XHJcbiAgICAgIGlmIChpIDwgbGVuZ3RoRmlsbCkgaXRlbS5zZXRWYWx1ZShNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwKSk7XHJcbiAgICAgIGFyci5wdXNoKGl0ZW0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoRmlsbDtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW25ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSldO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgYXJyYXkgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA2MCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IGFycmF5IHdpdGggJHtsZW5ndGh9IGNlbGxzYDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgdGhpcy5kdXBzLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICB5aWVsZCAnU2VsZWN0IER1cGxpY2F0ZXMgT2sgb3Igbm90JztcclxuICAgIHRoaXMuZHVwcy5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICByZXR1cm4gJ05ldyBhcnJheSBjcmVhdGVkOyB0b3RhbCBpdGVtcyA9IDAnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2YgaXRlbXMgdG8gZmlsbCBpbic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gdGhpcy5pdGVtcy5sZW5ndGggfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gYEVSUk9SOiBjYW4ndCBmaWxsIG1vcmUgdGhhbiAke3RoaXMuaXRlbXMubGVuZ3RofSBpdGVtc2A7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBmaWxsIGluICR7bGVuZ3RofSBpdGVtc2A7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh0aGlzLmR1cHMuY2hlY2tlZCkge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoZ2V0VW5pcXVlUmFuZG9tTnVtYmVyKHRoaXMuaXRlbXMsIDEwMDApKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgICByZXR1cm4gYEZpbGwgY29tcGxldGVkOyB0b3RhbCBpdGVtcyA9ICR7bGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9ySW5zKCkge1xyXG4gICAgaWYgKHRoaXMuaXRlbXMubGVuZ3RoID09PSB0aGlzLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydCwgYXJyYXkgaXMgZnVsbCc7XHJcbiAgICB9XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLmR1cHMuY2hlY2tlZCkge1xyXG4gICAgICBjb25zdCBmb3VuZCA9ICB0aGlzLml0ZW1zLmZpbmQoaSA9PiBpLnZhbHVlID09PSBrZXkpO1xyXG4gICAgICBpZiAoZm91bmQpIHlpZWxkIGBFUlJPUjogeW91IGFscmVhZHkgaGF2ZSBpdGVtIHdpdGgga2V5ICR7a2V5fSBhdCBpbmRleCAke2ZvdW5kLmluZGV4fWA7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgdGhpcy5pdGVtc1t0aGlzLmxlbmd0aF0uc2V0VmFsdWUoa2V5KTtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IHRoaXMubGVuZ3RoO1xyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGF0IGluZGV4ICR7dGhpcy5sZW5ndGh9YDtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gICAgcmV0dXJuIGBJbnNlcnRpb24gY29tcGxldGVkOyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmluZCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGZpbmQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdDtcclxuICAgIGxldCBpc0FkZGl0aW9uYWwgPSBmYWxzZTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBpO1xyXG4gICAgICBpZiAodGhpcy5pdGVtc1tpXS52YWx1ZSA9PT0ga2V5KSB7XHJcbiAgICAgICAgZm91bmRBdCA9IGk7XHJcbiAgICAgICAgeWllbGQgYEhhdmUgZm91bmQgJHtpc0FkZGl0aW9uYWwgPyAnYWRkaXRpb2FsJyA6ICcnfSBpdGVtIGF0IGluZGV4ID0gJHtmb3VuZEF0fWA7XHJcbiAgICAgICAgaWYgKHRoaXMuZHVwcy5jaGVja2VkKSB7XHJcbiAgICAgICAgICBpc0FkZGl0aW9uYWwgPSB0cnVlO1xyXG4gICAgICAgICAgZm91bmRBdCA9IG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaSAhPT0gdGhpcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgeWllbGQgYENoZWNraW5nICR7aXNBZGRpdGlvbmFsID8gJ2ZvciBhZGRpdGlvYWwgbWF0Y2hlcycgOiAnbmV4dCBjZWxsJ307IGluZGV4ID0gJHtpICsgMX1gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBObyAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGRlbGV0ZSc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgbGV0IGRlbGV0ZWRDb3VudCA9IDA7XHJcbiAgICBsZXQgaXNBZGRpdGlvbmFsID0gZmFsc2U7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaTtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IGtleSkge1xyXG4gICAgICAgIGZvdW5kQXQgPSBpO1xyXG4gICAgICAgIGRlbGV0ZWRDb3VudCsrO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uY2xlYXIoKTtcclxuICAgICAgICB5aWVsZCBgSGF2ZSBmb3VuZCBhbmQgZGVsZXRlZCAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW0gYXQgaW5kZXggPSAke2ZvdW5kQXR9YDtcclxuICAgICAgICBpZiAodGhpcy5kdXBzLmNoZWNrZWQpIGlzQWRkaXRpb25hbCA9IHRydWU7XHJcbiAgICAgIH0gZWxzZSBpZiAoZGVsZXRlZENvdW50ID4gMCkge1xyXG4gICAgICAgIHlpZWxkIGBXaWxsIHNoaWZ0IGl0ZW0gJHtkZWxldGVkQ291bnR9IHNwYWNlc2A7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tpIC0gZGVsZXRlZENvdW50XS5tb3ZlRnJvbSh0aGlzLml0ZW1zW2ldKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgJHtpc0FkZGl0aW9uYWwgPyAnZm9yIGFkZGl0aW9hbCBtYXRjaGVzJyA6ICduZXh0IGNlbGwnfTsgaW5kZXggPSAke2kgKyAxfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMubGVuZ3RoIC09IGRlbGV0ZWRDb3VudDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgICBpZiAoZGVsZXRlZENvdW50ID4gMCkge1xyXG4gICAgICByZXR1cm4gYFNoaWZ0JHtkZWxldGVkQ291bnQgPiAxID8gJ3MnIDogJyd9IGNvbXBsZXRlOyBubyAke2lzQWRkaXRpb25hbCA/ICdtb3JlJyA6ICcnfSBpdGVtcyB0byBkZWxldGVgO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGBObyAke2lzQWRkaXRpb25hbCA/ICdhZGRpdGlvYWwnIDogJyd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtYXJyYXknLCBQYWdlQXJyYXkpOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7Z2V0VW5pcXVlUmFuZG9tQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcclxuaW1wb3J0IHtQYWdlQXJyYXl9IGZyb20gJy4vcGFnZUFycmF5JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlT3JkZXJlZEFycmF5IGV4dGVuZHMgUGFnZUFycmF5IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ09yZGVyZWQgQXJyYXknO1xyXG4gICAgdGhpcy5pbmZvID0gaHRtbGBcclxuICAgICAgPHA+PGI+TmV3PC9iPiBjcmVhdGVzIGFycmF5IHdpdGggTiBjZWxscyAoNjAgbWF4KTwvcD5cclxuICAgICAgPHA+PGI+RmlsbDwvYj4gaW5zZXJ0cyBOIGl0ZW1zIGludG8gYXJyYXk8L3A+XHJcbiAgICAgIDxwPjxiPkluczwvYj4gaW5zZXJ0cyBuZXcgaXRlbSB3aXRoIHZhbHVlIE48L3A+XHJcbiAgICAgIDxwPjxiPkZpbmQ8L2I+IGZpbmRzIGl0ZW0gd2l0aCB2YWx1ZSBOPC9wPlxyXG4gICAgICA8cD48Yj5EZWw8L2I+IGRlbGV0ZXMgaXRlbSB3aXRoIHZhbHVlIE48L3A+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyQWRkaXRpb25hbENvbnRyb2woKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2xpbmVhclwiIGNoZWNrZWQ+TGluZWFyPC9sYWJlbD5cclxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX2JpbmFyeVwiPkJpbmFyeTwvbGFiZWw+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy5iaW5hcnkgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fYmluYXJ5Jyk7XHJcbiAgICB0aGlzLmxpbmVhciA9IHRoaXMucXVlcnlTZWxlY3RvcignLmFsZ29yaXRobV9saW5lYXInKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZUJ1dHRvbnNBY3Rpdml0eShidG4sIHN0YXR1cykge1xyXG4gICAgc3VwZXIudG9nZ2xlQnV0dG9uc0FjdGl2aXR5KGJ0biwgc3RhdHVzKTtcclxuICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbCgnLmFsZ29yaXRobScpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICBlbC5kaXNhYmxlZCA9IHN0YXR1cztcclxuICAgIH0pO1xyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICBpdGVtLm1hcmsgPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgbWFya0l0ZW1zKHJhbmdlKSB7XHJcbiAgICB0aGlzLml0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuICAgICAgaXRlbS5tYXJrID0gaSA+PSByYW5nZS5zdGFydCAmJiBpIDw9IHJhbmdlLmVuZDtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaW5pdEl0ZW1zKCkge1xyXG4gICAgY29uc3QgbGVuZ3RoID0gMjA7XHJcbiAgICBjb25zdCBsZW5ndGhGaWxsID0gMTA7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGNvbnN0IGFyclZhbHVlcyA9IGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aEZpbGwsIDEwMDApO1xyXG4gICAgYXJyVmFsdWVzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgaXRlbSA9IG5ldyBJdGVtKHtpbmRleDogaX0pO1xyXG4gICAgICBpZiAoaSA8IGxlbmd0aEZpbGwpIGl0ZW0uc2V0VmFsdWUoYXJyVmFsdWVzW2ldKTtcclxuICAgICAgYXJyLnB1c2goaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGhGaWxsO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgYXJyYXkgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA2MCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IGFycmF5IHdpdGggJHtsZW5ndGh9IGNlbGxzYDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgcmV0dXJuICdOZXcgYXJyYXkgY3JlYXRlZDsgdG90YWwgaXRlbXMgPSAwJztcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaWxsKCkge1xyXG4gICAgbGV0IGxlbmd0aCA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIgbnVtYmVyIG9mIGl0ZW1zIHRvIGZpbGwgaW4nO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBsZW5ndGggPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGxlbmd0aCA+IHRoaXMuaXRlbXMubGVuZ3RoIHx8IGxlbmd0aCA8IDApIHtcclxuICAgICAgcmV0dXJuIGBFUlJPUjogY2FuJ3QgZmlsbCBtb3JlIHRoYW4gJHt0aGlzLml0ZW1zLmxlbmd0aH0gaXRlbXNgO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgZmlsbCBpbiAke2xlbmd0aH0gaXRlbXNgO1xyXG4gICAgY29uc3QgYXJyVmFsdWVzID0gZ2V0VW5pcXVlUmFuZG9tQXJyYXkobGVuZ3RoLCAxMDAwKTtcclxuICAgIGFyclZhbHVlcy5zb3J0KChhLCBiKSA9PiBhIC0gYik7XHJcbiAgICBhcnJWYWx1ZXMuZm9yRWFjaCgodmFsdWUsIGkpID0+IHtcclxuICAgICAgdGhpcy5pdGVtc1tpXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xyXG4gICAgcmV0dXJuIGBGaWxsIGNvbXBsZXRlZDsgdG90YWwgaXRlbXMgPSAke2xlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBsaW5lYXJTZWFyY2goa2V5LCBpc0luc2VydGlvbikge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkgfHwgaXNJbnNlcnRpb24gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpICE9PSB0aGlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgYXQgaW5kZXggPSAke2kgKyAxfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gICogYmluYXJ5U2VhcmNoKGtleSwgaXNJbnNlcnRpb24pIHtcclxuICAgIGxldCByYW5nZSA9IHtzdGFydDogMCwgZW5kOiB0aGlzLmxlbmd0aCAtIDF9O1xyXG4gICAgbGV0IGk7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICBpID0gTWF0aC5mbG9vcigocmFuZ2UuZW5kICsgcmFuZ2Uuc3RhcnQpIC8gMik7XHJcbiAgICAgIGlmIChyYW5nZS5lbmQgPCByYW5nZS5zdGFydCkge1xyXG4gICAgICAgIHJldHVybiBpc0luc2VydGlvbiA/IGkgKyAxIDogbnVsbDtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBpO1xyXG4gICAgICB0aGlzLm1hcmtJdGVtcyhyYW5nZSk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICByZXR1cm4gaTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgQ2hlY2tpbmcgaW5kZXggJHtpfTsgcmFuZ2UgPSAke3JhbmdlLnN0YXJ0fSB0byAke3JhbmdlLmVuZH1gO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5KSB7XHJcbiAgICAgICAgcmFuZ2UuZW5kID0gaSAtIDE7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmFuZ2Uuc3RhcnQgPSBpICsgMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvcklucygpIHtcclxuICAgIGlmICh0aGlzLml0ZW1zLmxlbmd0aCA9PT0gdGhpcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQsIGFycmF5IGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtcy5maW5kKGkgPT4gaS52YWx1ZSA9PT0ga2V5KSkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydCwgZHVwbGljYXRlIGZvdW5kJztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgaW5zZXJ0QXQgPSB5aWVsZCogKHRoaXMubGluZWFyLmNoZWNrZWQgPyB0aGlzLmxpbmVhclNlYXJjaChrZXksIHRydWUpIDogdGhpcy5iaW5hcnlTZWFyY2goa2V5LCB0cnVlKSk7XHJcbiAgICBpbnNlcnRBdCA9IGluc2VydEF0ICE9IG51bGwgPyBpbnNlcnRBdCA6IHRoaXMubGVuZ3RoO1xyXG4gICAgeWllbGQgYFdpbGwgaW5zZXJ0IGF0IGluZGV4ICR7aW5zZXJ0QXR9JHtpbnNlcnRBdCAhPT0gdGhpcy5sZW5ndGggPyAnLCBmb2xsb3dpbmcgc2hpZnQnIDogJyd9YDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IHRoaXMubGVuZ3RoO1xyXG4gICAgaWYgKGluc2VydEF0ICE9PSB0aGlzLmxlbmd0aCkge1xyXG4gICAgICB5aWVsZCAnV2lsbCBzaGlmdCBjZWxscyB0byBtYWtlIHJvb20nO1xyXG4gICAgfVxyXG4gICAgZm9yIChsZXQgaSA9IHRoaXMubGVuZ3RoOyBpID4gaW5zZXJ0QXQ7IGktLSkge1xyXG4gICAgICB0aGlzLml0ZW1zW2ldLm1vdmVGcm9tKHRoaXMuaXRlbXNbaSAtIDFdKTtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaSAtIDE7XHJcbiAgICAgIHlpZWxkIGBTaGlmdGVkIGl0ZW0gZnJvbSBpbmRleCAke2kgLSAxfWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW2luc2VydEF0XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgeWllbGQgYEhhdmUgaW5zZXJ0ZWQgaXRlbSAke2tleX0gYXQgaW5kZXggJHtpbnNlcnRBdH1gO1xyXG4gICAgdGhpcy5sZW5ndGgrKztcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgICByZXR1cm4gYEluc2VydGlvbiBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zICR7dGhpcy5sZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaW5kKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBmb3VuZEF0ID0geWllbGQqICh0aGlzLmxpbmVhci5jaGVja2VkID8gdGhpcy5saW5lYXJTZWFyY2goa2V5KSA6IHRoaXMuYmluYXJ5U2VhcmNoKGtleSkpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuIGBObyBpdGVtcyB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGBIYXZlIGZvdW5kIGl0ZW0gYXQgaW5kZXggPSAke2ZvdW5kQXR9YDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JEZWwoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBkZWxldGUnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdCA9IHlpZWxkKiAodGhpcy5saW5lYXIuY2hlY2tlZCA/IHRoaXMubGluZWFyU2VhcmNoKGtleSkgOiB0aGlzLmJpbmFyeVNlYXJjaChrZXkpKTtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgICAgcmV0dXJuIGBObyBpdGVtcyB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtc1tmb3VuZEF0XS5jbGVhcigpO1xyXG4gICAgeWllbGQgYEhhdmUgZm91bmQgYW5kIGRlbGV0ZWQgaXRlbSBhdCBpbmRleCA9ICR7Zm91bmRBdH1gO1xyXG4gICAgaWYgKGZvdW5kQXQgIT09IHRoaXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBmb3VuZEF0O1xyXG4gICAgICB5aWVsZCAnV2lsbCBzaGlmdCBpdGVtcyc7XHJcbiAgICB9XHJcbiAgICBmb3IgKGxldCBpID0gZm91bmRBdCArIDE7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIHRoaXMuaXRlbXNbaSAtIDFdLm1vdmVGcm9tKHRoaXMuaXRlbXNbaV0pO1xyXG4gICAgICB5aWVsZCBgU2hpZnRlZCBpdGVtIGZyb20gaW5kZXggJHtpfWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLmxlbmd0aC0tO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgJHtmb3VuZEF0ICE9PSB0aGlzLmxlbmd0aCA/ICdTaGlmdCBjb21wbGV0ZWQnIDogJ0NvbXBsZXRlZCd9OyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2Utb3JkZXJlZC1hcnJheScsIFBhZ2VPcmRlcmVkQXJyYXkpOyIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuXHJcbmV4cG9ydCBjbGFzcyBYSXRlbXNWZXJ0aWNhbCBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiB7dHlwZTogQXJyYXl9LFxyXG4gICAgICB0ZW1wOiB7dHlwZTogT2JqZWN0fSxcclxuICAgICAgbWFya2Vyczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgcGl2b3RzOiB7dHlwZTogQXJyYXl9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgICB0aGlzLnBpdm90cyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgICR7dGhpcy5pdGVtcy5tYXAoaXRlbSA9PiBodG1sYFxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiIHN0eWxlPVwiJHtpdGVtLmNvbG9yID8gJ2JhY2tncm91bmQtY29sb3I6JyArIGl0ZW0uY29sb3IgKyAnOycgOiAnJ30gJHtpdGVtLnZhbHVlID8gJ2hlaWdodDonICsgaXRlbS52YWx1ZSArICclOycgOiAnJ31cIj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmRleFwiIHN0eWxlPVwiJHt0aGlzLml0ZW1zLmxlbmd0aCA+IDIwID8gJ2Rpc3BsYXk6bm9uZTsnIDogJyd9XCI+XHJcbiAgICAgICAgICAgICR7aXRlbS5pbmRleH1cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1hcmtlcl9jb250YWluZXJcIj5cclxuICAgICAgICAgICAgJHt0aGlzLnJlbmRlck1hcmtlcihpdGVtLmluZGV4KX1cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgJHt0aGlzLnJlbmRlclBpdm90cyhpdGVtKX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgYCl9ICAgICAgXHJcbiAgICAgICR7dGhpcy5yZW5kZXJUZW1wKCl9XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyUGl2b3RzKGl0ZW0pIHtcclxuICAgIGxldCByZXN1bHQgPSAnJztcclxuICAgIHRoaXMucGl2b3RzLmZvckVhY2goKHBpdm90LCBpKSA9PiB7XHJcbiAgICAgIGlmIChwaXZvdC5zdGFydCA8PSBpdGVtLmluZGV4ICYmIHBpdm90LmVuZCA+PSBpdGVtLmluZGV4KSB7XHJcbiAgICAgICAgY29uc3QgaXNEaW1tZWQgPSB0aGlzLnBpdm90cy5sZW5ndGggPiAxICYmIHRoaXMucGl2b3RzLmxlbmd0aCAhPT0gaSArIDE7XHJcbiAgICAgICAgcmVzdWx0ID0gaHRtbGBcclxuICAgICAgICAgICR7cmVzdWx0fVxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInBpdm90ICR7aXNEaW1tZWQgPyAnZGltbWVkJyA6ICcnfVwiIHN0eWxlPVwiaGVpZ2h0OiAkezQwMCAqICgxIC0gcGl2b3QudmFsdWUgLyAxMDApIC0gMn1weFwiPjwvZGl2PlxyXG4gICAgICAgIGA7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIHJlbmRlclRlbXAoKSB7XHJcbiAgICBpZiAodGhpcy50ZW1wIGluc3RhbmNlb2YgSXRlbSkge1xyXG4gICAgICByZXR1cm4gaHRtbGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbSB0ZW1wXCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiIHN0eWxlPVwiJHt0aGlzLnRlbXAuY29sb3IgPyAnYmFja2dyb3VuZC1jb2xvcjonICsgdGhpcy50ZW1wLmNvbG9yICsgJzsnIDogJyd9ICR7dGhpcy50ZW1wLnZhbHVlID8gJ2hlaWdodDonICsgdGhpcy50ZW1wLnZhbHVlICsgJyU7JyA6ICcnfVwiPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1hcmtlcl9jb250YWluZXJcIj5cclxuICAgICAgICAgICAgJHt0aGlzLnJlbmRlck1hcmtlcigndGVtcCcpfVxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIGA7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJlbmRlck1hcmtlcihpKSB7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICB0aGlzLm1hcmtlcnMuZm9yRWFjaChtYXJrZXIgPT4ge1xyXG4gICAgICBpZiAobWFya2VyLnBvc2l0aW9uID09PSBpKSB7XHJcbiAgICAgICAgcmVzdWx0ID0gaHRtbGBcclxuICAgICAgICAgICR7cmVzdWx0fVxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1hcmtlciBzaXplXyR7bWFya2VyLnNpemV9ICR7bWFya2VyLmNvbG9yID8gJ2NvbG9yXycgKyBtYXJrZXIuY29sb3IgOiAnJ31cIj5cclxuICAgICAgICAgICAgPHNwYW4+JHt0aGlzLml0ZW1zLmxlbmd0aCA+IDIwID8gJycgOiBtYXJrZXIudGV4dH08L3NwYW4+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICBgO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG5YSXRlbXNWZXJ0aWNhbC5zdHlsZXMgPSBjc3NgXHJcbiAgOmhvc3Qge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XHJcbiAgICBmbGV4LXdyYXA6IG5vd3JhcDtcclxuICAgIG1heC13aWR0aDogNjAwcHg7XHJcbiAgfVxyXG4gIC5pdGVtIHtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xyXG4gICAgbWluLXdpZHRoOiA1cHg7XHJcbiAgICBmbGV4LWdyb3c6IDE7XHJcbiAgICBmbGV4LWJhc2lzOiAwO1xyXG4gIH1cclxuICAudGVtcCB7XHJcbiAgICBtYXJnaW4tbGVmdDogMmVtO1xyXG4gIH1cclxuICAuaW5kZXgge1xyXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgbWFyZ2luLWJvdHRvbTogNXB4O1xyXG4gIH1cclxuICAudmFsdWVfY29udGFpbmVyIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uLXJldmVyc2U7XHJcbiAgICBoZWlnaHQ6IDQwMHB4O1xyXG4gICAgbWFyZ2luLWJvdHRvbTogNXB4O1xyXG4gIH1cclxuICAudmFsdWUge1xyXG4gICAgYm9yZGVyOiAxcHggc29saWQgbGlnaHRncmF5O1xyXG4gIH1cclxuICAucGl2b3Qge1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgdG9wOiAwO1xyXG4gICAgbGVmdDogMDtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIGJsYWNrO1xyXG4gIH1cclxuICAucGl2b3QuZGltbWVkIHtcclxuICAgIGJvcmRlci1ib3R0b20tc3R5bGU6IGRvdHRlZDtcclxuICB9XHJcbiAgLm1hcmtlcl9jb250YWluZXIge1xyXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xyXG4gICAgaGVpZ2h0OiA2ZW07XHJcbiAgfVxyXG4gIC5tYXJrZXIge1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgdG9wOiAwO1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBmb250LXNpemU6IC44ZW07XHJcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgfVxyXG4gIC5tYXJrZXIgc3BhbiB7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICBtaW4td2lkdGg6IDVlbTtcclxuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtNTAlKTtcclxuICAgIHRleHQtc2hhZG93OiB3aGl0ZSAxcHggMXB4IDA7XHJcbiAgfVxyXG4gIC5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICB3aWR0aDogNXB4O1xyXG4gICAgaGVpZ2h0OiA1cHg7XHJcbiAgICB0b3A6IC0ycHg7XHJcbiAgICBsZWZ0OiA1MCU7XHJcbiAgICB0cmFuc2Zvcm06IHJvdGF0ZSgtNDVkZWcpIHRyYW5zbGF0ZSgtNTAlKTtcclxuICAgIHRyYW5zZm9ybS1vcmlnaW46IGNlbnRlcjtcclxuICAgIGJvcmRlcjogMnB4IHNvbGlkO1xyXG4gICAgYm9yZGVyLWxlZnQ6IG5vbmU7XHJcbiAgICBib3JkZXItYm90dG9tOiBub25lO1xyXG4gIH1cclxuICAubWFya2VyOmFmdGVyIHtcclxuICAgIGNvbnRlbnQ6ICcnO1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICB3aWR0aDogMnB4O1xyXG4gICAgdG9wOiAwO1xyXG4gICAgbGVmdDogNTAlO1xyXG4gIH1cclxuICAuc2l6ZV8xLm1hcmtlciB7XHJcbiAgICB6LWluZGV4OiAzO1xyXG4gICAgcGFkZGluZy10b3A6IDFlbTtcclxuICB9XHJcbiAgLnNpemVfMS5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgaGVpZ2h0OiAxZW07XHJcbiAgfVxyXG4gIC5zaXplXzIubWFya2VyIHtcclxuICAgIHotaW5kZXg6IDI7XHJcbiAgICBwYWRkaW5nLXRvcDogM2VtO1xyXG4gIH1cclxuICAuc2l6ZV8yLm1hcmtlcjphZnRlciB7XHJcbiAgICBoZWlnaHQ6IDNlbTtcclxuICB9XHJcbiAgLnNpemVfMy5tYXJrZXIge1xyXG4gICAgei1pbmRleDogMTtcclxuICAgIHBhZGRpbmctdG9wOiA1ZW07XHJcbiAgfVxyXG4gIC5zaXplXzMubWFya2VyOmFmdGVyIHtcclxuICAgIGhlaWdodDogNWVtO1xyXG4gIH1cclxuICAuY29sb3JfcmVkLm1hcmtlciB7XHJcbiAgICBjb2xvcjogcmVkO1xyXG4gIH1cclxuICAuY29sb3JfcmVkLm1hcmtlcjpiZWZvcmUge1xyXG4gICAgYm9yZGVyLWNvbG9yOiByZWQ7XHJcbiAgfVxyXG4gIC5jb2xvcl9yZWQubWFya2VyOmFmdGVyIHtcclxuICAgIGJhY2tncm91bmQtY29sb3I6IHJlZDtcclxuICB9XHJcbiAgLmNvbG9yX2JsdWUubWFya2VyIHtcclxuICAgIGNvbG9yOiBibHVlO1xyXG4gIH1cclxuICAuY29sb3JfYmx1ZS5tYXJrZXI6YmVmb3JlIHtcclxuICAgIGJvcmRlci1jb2xvcjogYmx1ZTtcclxuICB9XHJcbiAgLmNvbG9yX2JsdWUubWFya2VyOmFmdGVyIHtcclxuICAgIGJhY2tncm91bmQtY29sb3I6IGJsdWU7XHJcbiAgfVxyXG4gIC5jb2xvcl9wdXJwbGUubWFya2VyIHtcclxuICAgIGNvbG9yOiBwdXJwbGU7XHJcbiAgfVxyXG4gIC5jb2xvcl9wdXJwbGUubWFya2VyOmJlZm9yZSB7XHJcbiAgICBib3JkZXItY29sb3I6IHB1cnBsZTtcclxuICB9XHJcbiAgLmNvbG9yX3B1cnBsZS5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcHVycGxlO1xyXG4gIH1cclxuYDtcclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgneC1pdGVtcy12ZXJ0aWNhbCcsIFhJdGVtc1ZlcnRpY2FsKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge2dldENvbG9yMTAwfSBmcm9tICcuLi91dGlscyc7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvYnV0dG9uJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2NvbnNvbGUnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaW5mbyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1ZlcnRpY2FsJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlQmFzZVNvcnQgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5sZW5ndGggPSAxMDtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgICB0aGlzLnBpdm90cyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIGh0bWxgXHJcbiAgICAgIDxoMT4ke3RoaXMudGl0bGV9PC9oMT5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvck5ldyl9Pk5ldzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yU2l6ZSl9PlNpemU8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclJ1bil9PlJ1bjwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yU3RlcCl9PlN0ZXA8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUFib3J0LmJpbmQodGhpcyl9IGNsYXNzPVwiYnRuX2Fib3J0IGhpZGRlblwiPkFib3J0PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+TmV3PC9iPiBjcmVhdGVzIG5ldyBkYXRhIGFuZCBpbml0aWFsaXplcyBzb3J0OyB0b2dnbGVzIGJldHdlZW4gcmFuZG9tIGFuZCBpbnZlcnNlIG9yZGVyPC9wPlxyXG4gICAgICAgICAgPHA+PGI+U2l6ZTwvYj4gdG9nZ2xlcyBiZXR3ZWVuIDEwIGJhcnMgYW5kIDEwMCBiYXJzOyBhbHNvIGNyZWF0ZXMgbmV3IGRhdGEgYW5kIGluaXRpYWxpemVzIHNvcnQ8L3A+IFxyXG4gICAgICAgICAgPHA+PGI+UnVuPC9iPiBzdGFydHMgdGhlIHNvcnRpbmcgcHJvY2VzcyBydW5uaW5nIGF1dG9tYXRpY2FsbHkgKE5leHQgdG8gcGF1c2UvcmVzdW1lLCBBYm9ydCB0byBzdG9wKTwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5TdGVwPC9iPiBleGVjdXRlcyBvbmUgc3RlcCBvZiBzb3J0aW5nIHByb2Nlc3M8L3A+IFxyXG4gICAgICAgIDwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cImNvbnNvbGVfdmVyYm9zZVwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwiY29uc29sZS1zdGF0c1wiIGRlZmF1bHRNZXNzYWdlPVwi4oCUXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWl0ZW1zLXZlcnRpY2FsIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXJzPSR7dGhpcy5tYXJrZXJzfSAudGVtcD0ke3RoaXMudGVtcH0gLnBpdm90cz0ke3RoaXMucGl2b3RzfT48L3gtaXRlbXMtdmVydGljYWw+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlU3RhdHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5jb25zb2xlLXN0YXRzJyk7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5jb25zb2xlX3ZlcmJvc2UnKTtcclxuICAgIHRoaXMuYnRuU3RvcCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmJ0bl9hYm9ydCcpO1xyXG4gIH1cclxuXHJcbiAgaGFuZGxlQWJvcnQoKSB7XHJcbiAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHRoaXMuaXRlcmF0b3IgPSAoZnVuY3Rpb24gKigpIHtcclxuICAgICAgcmV0dXJuICdBYm9ydGVkJztcclxuICAgIH0pKCk7XHJcbiAgICB0aGlzLml0ZXJhdGUoKTtcclxuICB9XHJcblxyXG4gIGluaXRJdGVtcyhsZW5ndGggPSB0aGlzLmxlbmd0aCkge1xyXG4gICAgY29uc3QgYXJyID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbSh7aW5kZXg6IGl9KTtcclxuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmlzUmV2ZXJzZU9yZGVyID8gKGxlbmd0aCAtIGkpICogKDEwMCAvIGxlbmd0aCkgOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICBpdGVtLnNldFZhbHVlKHZhbHVlLCBnZXRDb2xvcjEwMCh2YWx1ZSkpO1xyXG4gICAgICBhcnIucHVzaChpdGVtKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXRlbXMgPSBhcnI7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlU3RhdHMoc3dhcHMgPSAwLCBjb21wYXJpc29ucyA9IDApIHtcclxuICAgIHRoaXMuY29uc29sZVN0YXRzLnNldE1lc3NhZ2UoYFN3YXBzOiAke3N3YXBzfSwgQ29tcGFyaXNvbnM6ICR7Y29tcGFyaXNvbnN9YCk7XHJcbiAgfVxyXG5cclxuICBiZWZvcmVTb3J0KCkge1xyXG4gICAgdGhpcy51cGRhdGVTdGF0cygpO1xyXG4gICAgdGhpcy5idG5TdG9wLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xyXG4gICAgdGhpcy5idG5TdG9wLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBhZnRlclNvcnQoKSB7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgICB0aGlzLmJ0blN0b3AuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yTmV3KCkge1xyXG4gICAgdGhpcy5pc1JldmVyc2VPcmRlciA9ICF0aGlzLmlzUmV2ZXJzZU9yZGVyO1xyXG4gICAgdGhpcy5pbml0SXRlbXModGhpcy5pdGVtcy5sZW5ndGgpO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gICAgcmV0dXJuIGBDcmVhdGVkICR7dGhpcy5pc1JldmVyc2VPcmRlciA/ICdyZXZlcnNlJyA6ICd1bm9yZGVyZWQnfSBhcnJheWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU2l6ZSgpIHtcclxuICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMuaXRlbXMubGVuZ3RoID09PSB0aGlzLmxlbmd0aCA/IDEwMCA6IHRoaXMubGVuZ3RoO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIHJldHVybiBgQ3JlYXRlZCAke2xlbmd0aH0gZWxlbWVudHMgYXJyYXlgO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclN0ZXAoKSB7XHJcbiAgICB0aGlzLmJlZm9yZVNvcnQoKTtcclxuXHJcbiAgICAvL3NvcnQgYWxnb3JpdGhtIGdvZXMgaGVyZVxyXG5cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgaXMgY29tcGxldGUnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclJ1bigpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgbGV0IGl0ZXJhdG9yO1xyXG4gICAgbGV0IGlzRG9uZSA9IGZhbHNlO1xyXG4gICAgd2hpbGUodHJ1ZSkge1xyXG4gICAgICB5aWVsZCAnUHJlc3MgTmV4dCB0byBzdGFydCc7XHJcbiAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgaWYgKCFpdGVyYXRvcikge1xyXG4gICAgICAgICAgaXRlcmF0b3IgPSB0aGlzLml0ZXJhdG9yU3RlcCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaXRlcmF0b3IubmV4dCgpLmRvbmUpIHtcclxuICAgICAgICAgIGlzRG9uZSA9IHRydWU7XHJcbiAgICAgICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFsuLi50aGlzLml0ZW1zXTtcclxuICAgICAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcclxuICAgICAgfSwgdGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoID8gMjAwIDogNDApO1xyXG4gICAgICB5aWVsZCAnUHJlc3MgTmV4dCB0byBwYXVzZSc7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XHJcbiAgICAgIGlmIChpc0RvbmUpIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBpcyBjb21wbGV0ZSc7XHJcbiAgfVxyXG59IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZVNvcnR9IGZyb20gJy4vcGFnZUJhc2VTb3J0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlQnViYmxlU29ydCBleHRlbmRzIFBhZ2VCYXNlU29ydCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdCdWJibGUgU29ydCc7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICogYWxnb3JpdGhtOlxyXG5cclxuICAgIGZvciAobGV0IG91dGVyID0gaXRlbXMubGVuZ3RoIC0gMTsgb3V0ZXIgPiAwOyBvdXRlci0tKSB7XHJcbiAgICAgIGZvciAobGV0IGlubmVyID0gMDsgaW5uZXIgPCBvdXRlcjsgaW5uZXIrKykge1xyXG4gICAgICAgIGlmIChpdGVtc1tpbm5lcl0gPiBpdGVtc1tpbm5lciArIDFdKSB7XHJcbiAgICAgICAgICBzd2FwKGl0ZW1zW2lubmVyXSwgaXRlbXNbaW5uZXIgKyAxXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICogKi9cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAxLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXIrMSd9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IHRoaXMuaXRlbXMubGVuZ3RoIC0gMSwgc2l6ZTogMiwgY29sb3I6ICdyZWQnLCB0ZXh0OiAnb3V0ZXInfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgbGV0IHN3YXBzID0gMDtcclxuICAgIGxldCBjb21wYXJpc29ucyA9IDA7XHJcbiAgICBmb3IgKGxldCBvdXRlciA9IHRoaXMuaXRlbXMubGVuZ3RoIC0gMTsgb3V0ZXIgPiAwOyBvdXRlci0tKSB7XHJcbiAgICAgIGZvciAobGV0IGlubmVyID0gMDsgaW5uZXIgPCBvdXRlcjsgaW5uZXIrKykge1xyXG4gICAgICAgIGlmICh0aGlzLml0ZW1zW2lubmVyXS52YWx1ZSA+IHRoaXMuaXRlbXNbaW5uZXIgKyAxXS52YWx1ZSkge1xyXG4gICAgICAgICAgeWllbGQgJ1dpbGwgYmUgc3dhcHBlZCc7XHJcbiAgICAgICAgICB0aGlzLml0ZW1zW2lubmVyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyICsgMV0pO1xyXG4gICAgICAgICAgc3dhcHMrKztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgeWllbGQgJ1dpbGwgbm90IGJlIHN3YXBwZWQnO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKHN3YXBzLCArK2NvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24rKztcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24rKztcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSAxO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMl0ucG9zaXRpb24tLTtcclxuICAgIH1cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgaXMgY29tcGxldGUnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWJ1YmJsZS1zb3J0JywgUGFnZUJ1YmJsZVNvcnQpOyIsImltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2VTb3J0fSBmcm9tICcuL3BhZ2VCYXNlU29ydCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVNlbGVjdFNvcnQgZXh0ZW5kcyBQYWdlQmFzZVNvcnQge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMudGl0bGUgPSAnU2VsZWN0IFNvcnQnO1xyXG4gIH1cclxuXHJcbiAgLypcclxuICAqIGFsZ29yaXRobTpcclxuXHJcbiAgICBmb3IgKGxldCBvdXRlciA9IDA7IG91dGVyIDwgaXRlbXMubGVuZ3RoIC0gMTsgb3V0ZXIrKykge1xyXG4gICAgICBtaW4gPSBvdXRlcjtcclxuICAgICAgZm9yIChsZXQgaW5uZXIgPSBvdXRlciArIDE7IGlubmVyIDwgaXRlbXMubGVuZ3RoOyBpbm5lcisrKSB7XHJcbiAgICAgICAgaWYgKGl0ZW1zW2lubmVyXSA8IGl0ZW1zW21pbl0pIHtcclxuICAgICAgICAgIG1pbiA9IGlubmVyO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBzd2FwKGl0ZW1zW291dGVyXSwgaXRlbXNbbWluXSk7XHJcbiAgICB9XHJcblxyXG4gICogKi9cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAxLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAyLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICdvdXRlcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDMsIGNvbG9yOiAncHVycGxlJywgdGV4dDogJ21pbid9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgc3dhcHMgPSAwO1xyXG4gICAgbGV0IGNvbXBhcmlzb25zID0gMDtcclxuICAgIGxldCBtaW4gPSAwO1xyXG4gICAgZm9yIChsZXQgb3V0ZXIgPSAwOyBvdXRlciA8IHRoaXMuaXRlbXMubGVuZ3RoIC0gMTsgb3V0ZXIrKykge1xyXG4gICAgICBtaW4gPSBvdXRlcjtcclxuICAgICAgZm9yIChsZXQgaW5uZXIgPSBvdXRlciArIDE7IGlubmVyIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGlubmVyKyspIHtcclxuICAgICAgICB5aWVsZCAnU2VhcmNoaW5nIGZvciBtaW5pbXVtJztcclxuICAgICAgICBpZiAodGhpcy5pdGVtc1tpbm5lcl0udmFsdWUgPCB0aGlzLml0ZW1zW21pbl0udmFsdWUpIHtcclxuICAgICAgICAgIG1pbiA9IGlubmVyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gbWluO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24rKztcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKHN3YXBzLCArK2NvbXBhcmlzb25zKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWluICE9PSBvdXRlcikge1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHN3YXAgb3V0ZXIgJiBtaW4nO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbb3V0ZXJdLnN3YXBXaXRoKHRoaXMuaXRlbXNbbWluXSk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK3N3YXBzLCBjb21wYXJpc29ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgeWllbGQgJ1dpbGwgbm90IGJlIHN3YXBwZWQnO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IG91dGVyICsgMjtcclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uKys7XHJcbiAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbiA9IG91dGVyICsgMTtcclxuICAgIH1cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgaXMgY29tcGxldGUnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXNlbGVjdC1zb3J0JywgUGFnZVNlbGVjdFNvcnQpOyIsImltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtQYWdlQmFzZVNvcnR9IGZyb20gJy4vcGFnZUJhc2VTb3J0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlSW5zZXJ0aW9uU29ydCBleHRlbmRzIFBhZ2VCYXNlU29ydCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdJbnNlcnRpb24gU29ydCc7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICogYWxnb3JpdGhtOlxyXG5cclxuICAgIGZvciAobGV0IGlubmVyLCBvdXRlciA9IDE7IG91dGVyIDwgaXRlbXMubGVuZ3RoOyBvdXRlcisrKSB7XHJcbiAgICAgIHRlbXAgPSBpdGVtc1tvdXRlcl07XHJcbiAgICAgIGZvciAoaW5uZXIgPSBvdXRlcjsgaW5uZXIgPiAwICYmIHRlbXAgPj0gaXRlbXNbaW5uZXIgLSAxXTsgaW5uZXItLSkge1xyXG4gICAgICAgIGl0ZW1zW2lubmVyXSA9IGl0ZW1zW2lubmVyIC0gMV07XHJcbiAgICAgIH1cclxuICAgICAgaXRlbXNbaW5uZXJdID0gdGVtcDtcclxuICAgIH1cclxuXHJcbiAgKiAqL1xyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoKSB7XHJcbiAgICBzdXBlci5pbml0SXRlbXMobGVuZ3RoKTtcclxuICAgIHRoaXMudGVtcCA9IG5ldyBJdGVtKHt2YWx1ZTogMH0pO1xyXG4gIH1cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAxLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAxLCBzaXplOiAyLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICdvdXRlcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246ICd0ZW1wJywgc2l6ZTogMSwgY29sb3I6ICdwdXJwbGUnLCB0ZXh0OiAndGVtcCd9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVN0YXRzKGNvcGllcyA9IDAsIGNvbXBhcmlzb25zID0gMCkge1xyXG4gICAgdGhpcy5jb25zb2xlU3RhdHMuc2V0TWVzc2FnZShgQ29waWVzOiAke2NvcGllc30sIENvbXBhcmlzb25zOiAke2NvbXBhcmlzb25zfWApO1xyXG4gIH1cclxuXHJcbiAgYWZ0ZXJTb3J0KCkge1xyXG4gICAgc3VwZXIuYWZ0ZXJTb3J0KCk7XHJcbiAgICB0aGlzLnRlbXAgPSBuZXcgSXRlbSh7dmFsdWU6IDB9KTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgY29waWVzID0gMDtcclxuICAgIGxldCBjb21wYXJpc29ucyA9IDA7XHJcbiAgICBmb3IgKGxldCBpbm5lciwgb3V0ZXIgPSAxOyBvdXRlciA8IHRoaXMuaXRlbXMubGVuZ3RoOyBvdXRlcisrKSB7XHJcbiAgICAgIHlpZWxkICdXaWxsIGNvcHkgb3V0ZXIgdG8gdGVtcCc7XHJcbiAgICAgIHRoaXMuaXRlbXNbb3V0ZXJdLnN3YXBXaXRoKHRoaXMudGVtcCk7XHJcbiAgICAgIGNvcGllcysrO1xyXG4gICAgICBmb3IgKGlubmVyID0gb3V0ZXI7IGlubmVyID4gMDsgaW5uZXItLSkge1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoY29waWVzLCArK2NvbXBhcmlzb25zKTtcclxuICAgICAgICBpZiAodGhpcy50ZW1wLnZhbHVlID49IHRoaXMuaXRlbXNbaW5uZXIgLSAxXS52YWx1ZSkge1xyXG4gICAgICAgICAgeWllbGQgJ0hhdmUgY29tcGFyZWQgaW5uZXItMSBhbmQgdGVtcDogbm8gY29weSBuZWNlc3NhcnknO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHlpZWxkICdIYXZlIGNvbXBhcmVkIGlubmVyLTEgYW5kIHRlbXA6IHdpbGwgY29weSBpbm5lciB0byBpbm5lci0xJztcclxuICAgICAgICB0aGlzLml0ZW1zW2lubmVyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyIC0gMV0pO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKytjb3BpZXMsIGNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24tLTtcclxuICAgICAgfVxyXG4gICAgICB5aWVsZCAnV2lsbCBjb3B5IHRlbXAgdG8gaW5uZXInO1xyXG4gICAgICB0aGlzLnRlbXAuc3dhcFdpdGgodGhpcy5pdGVtc1tpbm5lcl0pO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBvdXRlciArIDE7XHJcbiAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbisrO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBpcyBjb21wbGV0ZSc7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtaW5zZXJ0aW9uLXNvcnQnLCBQYWdlSW5zZXJ0aW9uU29ydCk7IiwiaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZX0gZnJvbSAnLi9wYWdlQmFzZSc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9idXR0b24nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvY29uc29sZSc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9kaWFsb2cnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaW5mbyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc0hvcml6b250YWwnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VTdGFjayBleHRlbmRzIFBhZ2VCYXNlIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXTtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPlN0YWNrPC9oMT5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvck5ldyl9Pk5ldzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUHVzaCl9PlB1c2g8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclBvcCl9PlBvcDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUGVlayl9PlBlZWs8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+XHJcbiAgICAgICAgICA8cD48Yj5OZXc8L2I+IGNyZWF0ZXMgbmV3IHN0YWNrPC9wPiBcclxuICAgICAgICAgIDxwPjxiPlB1c2g8L2I+IGluc2VydHMgaXRlbSB3aXRoIHZhbHVlIE4gYXQgdG9wIG9mIHN0YWNrPC9wPiBcclxuICAgICAgICAgIDxwPjxiPlBvcDwvYj4gcmVtb3ZlcyBpdGVtIGZyb20gdG9wIG9mIHN0YWNrLCByZXR1cm5zIHZhbHVlPC9wPiBcclxuICAgICAgICAgIDxwPjxiPlBlZWs8L2I+IHJldHVybnMgdmFsdWUgb2YgaXRlbSBhdCB0b3Agb2Ygc3RhY2s8L3A+XHJcbiAgICAgICAgPC94LWluZm8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ob3Jpem9udGFsIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXJzPSR7dGhpcy5tYXJrZXJzfSByZXZlcnNlPjwveC1pdGVtcy1ob3Jpem9udGFsPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtY29uc29sZScpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSAxMDtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSA0O1xyXG4gICAgY29uc3QgYXJyID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbSh7aW5kZXg6IGl9KTtcclxuICAgICAgaWYgKGkgPCBsZW5ndGhGaWxsKSBpdGVtLnNldFZhbHVlKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApKTtcclxuICAgICAgYXJyLnB1c2goaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGhGaWxsO1xyXG4gIH1cclxuXHJcbiAgaW5pdE1hcmtlcnMoKSB7XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAzLCBzaXplOiAxLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICd0b3AnfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yTmV3KCkge1xyXG4gICAgeWllbGQgJ1dpbGwgY3JlYXRlIG5ldyBlbXB0eSBzdGFjayc7XHJcbiAgICBjb25zdCBsZW5ndGggPSAxMDtcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5pdGVtcy5wdXNoKG5ldyBJdGVtKHtpbmRleDogaX0pKTtcclxuICAgIH1cclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IC0xO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclB1c2goKSB7XHJcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IHRoaXMuaXRlbXMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgcHVzaC4gU3RhY2sgaXMgZnVsbCc7XHJcbiAgICB9XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBwdXNoJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwdXNoLiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBwdXNoIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbisrO1xyXG4gICAgeWllbGQgJ0luY3JlbWVudGVkIHRvcCc7XHJcbiAgICB0aGlzLml0ZW1zW3RoaXMubGVuZ3RoXS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5sZW5ndGgrKztcclxuICAgIHJldHVybiBgSW5zZXJ0ZWQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclBvcCgpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHBvcC4gU3RhY2sgaXMgZW1wdHknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgJ1dpbGwgcG9wIGl0ZW0gZnJvbSB0b3Agb2Ygc3RhY2snO1xyXG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbdGhpcy5sZW5ndGggLSAxXTtcclxuICAgIGNvbnN0IHZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgIGl0ZW0uY2xlYXIoKTtcclxuICAgIHlpZWxkIGBJdGVtIHJlbW92ZWQ7IFJldHVybmVkIHZhbHVlIGlzICR7dmFsdWV9YDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbi0tO1xyXG4gICAgdGhpcy5sZW5ndGgtLTtcclxuICAgIHJldHVybiAnRGVjcmVtZW50ZWQgdG9wJztcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JQZWVrKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgcGVlay4gU3RhY2sgaXMgZW1wdHknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgJ1dpbGwgcGVlayBhdCBpdGVtIGF0IHRvcCBvZiBzdGFjayc7XHJcbiAgICByZXR1cm4gYFJldHVybmVkIHZhbHVlIGlzICR7dGhpcy5pdGVtc1t0aGlzLmxlbmd0aCAtIDFdLnZhbHVlfWA7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2Utc3RhY2snLCBQYWdlU3RhY2spOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZVN0YWNrfSBmcm9tICcuL3BhZ2VTdGFjayc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9idXR0b24nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvY29uc29sZSc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9kaWFsb2cnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaW5mbyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc0hvcml6b250YWwnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VRdWV1ZSBleHRlbmRzIFBhZ2VTdGFjayB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdRdWV1ZSc7XHJcbiAgICB0aGlzLmluZm8gPSBodG1sYFxyXG4gICAgICA8cD48Yj5OZXc8L2I+IGNyZWF0ZXMgbmV3IHF1ZXVlPC9wPiBcclxuICAgICAgPHA+PGI+SW5zPC9iPiBpbnNlcnRzIGl0ZW0gd2l0aCB2YWx1ZSBOIGF0IHJlYXIgb2YgcXVldWU8L3A+IFxyXG4gICAgICA8cD48Yj5SZW08L2I+IHJlbW92ZXMgaXRlbSBmcm9tIGZyb250IG9mIHF1ZXVlLCByZXR1cm5zIHZhbHVlPC9wPiBcclxuICAgICAgPHA+PGI+UGVlazwvYj4gcmV0dXJucyB2YWx1ZSBvZiBpdGVtIGF0IGZyb250IG9mIHF1ZXVlPC9wPiBcclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPiR7dGhpcy50aXRsZX08L2gxPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yTmV3KX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclJlbSl9PlJlbTwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUGVlayl9PlBlZWs8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+JHt0aGlzLmluZm99PC94LWluZm8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ob3Jpem9udGFsIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXJzPSR7dGhpcy5tYXJrZXJzfSByZXZlcnNlPjwveC1pdGVtcy1ob3Jpem9udGFsPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2Zyb250J30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5sZW5ndGggLSAxLCBzaXplOiAzLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAncmVhcid9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JOZXcoKSB7XHJcbiAgICB5aWVsZCAnV2lsbCBjcmVhdGUgbmV3IGVtcHR5IHF1ZXVlJztcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEwO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLml0ZW1zLnB1c2gobmV3IEl0ZW0oe2luZGV4OiBpfSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5sZW5ndGggPSAwO1xyXG4gICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gIH1cclxuXHJcbiAgZ2V0TmV4dEluZGV4KGluZGV4KSB7XHJcbiAgICByZXR1cm4gaW5kZXggKyAxID09PSB0aGlzLml0ZW1zLmxlbmd0aCA/IDAgOiBpbmRleCArIDE7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9ySW5zKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSB0aGlzLml0ZW1zLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHB1c2guIFF1ZXVlIGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBjb25zdCBuZXdJbmRleCA9IHRoaXMuZ2V0TmV4dEluZGV4KHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbik7XHJcbiAgICB0aGlzLml0ZW1zW25ld0luZGV4XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gbmV3SW5kZXg7XHJcbiAgICB0aGlzLmxlbmd0aCsrO1xyXG4gICAgcmV0dXJuIGBJbnNlcnRlZCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUmVtKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgcmVtb3ZlLiBRdWV1ZSBpcyBlbXB0eSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnV2lsbCByZW1vdmUgaXRlbSBmcm9tIGZyb250IG9mIHF1ZXVlJztcclxuICAgIGNvbnN0IGN1ckluZGV4ID0gdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uO1xyXG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbY3VySW5kZXhdO1xyXG4gICAgY29uc3QgdmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgaXRlbS5jbGVhcigpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gdGhpcy5nZXROZXh0SW5kZXgoY3VySW5kZXgpO1xyXG4gICAgdGhpcy5sZW5ndGgtLTtcclxuICAgIHJldHVybiBgSXRlbSByZW1vdmVkOyBSZXR1cm5lZCB2YWx1ZSBpcyAke3ZhbHVlfWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUGVlaygpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IHBlZWsuIFF1ZXVlIGlzIGVtcHR5JztcclxuICAgIH1cclxuICAgIHlpZWxkICdXaWxsIHBlZWsgYXQgZnJvbnQgb2YgcXVldWUnO1xyXG4gICAgcmV0dXJuIGBSZXR1cm5lZCB2YWx1ZSBpcyAke3RoaXMuaXRlbXNbdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uXS52YWx1ZX1gO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXF1ZXVlJywgUGFnZVF1ZXVlKTsiLCJpbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7Z2V0VW5pcXVlUmFuZG9tQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcclxuaW1wb3J0IHtQYWdlUXVldWV9IGZyb20gJy4vcGFnZVF1ZXVlJztcclxuaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVByaW9yaXR5UXVldWUgZXh0ZW5kcyBQYWdlUXVldWUge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMudGl0bGUgPSAnUHJpb3JpdHkgUXVldWUnO1xyXG4gICAgdGhpcy5pbmZvID0gaHRtbGBcclxuICAgICAgPHA+PGI+TmV3PC9iPiBjcmVhdGVzIG5ldyBlbXB0eSBwcmlvcml0eSBxdWV1ZTwvcD4gXHJcbiAgICAgIDxwPjxiPkluczwvYj4gaW5zZXJ0cyBpdGVtIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgPHA+PGI+UmVtPC9iPiByZW1vdmVzIGl0ZW0gZnJvbSBmcm9udCBvZiBxdWV1ZSwgcmV0dXJucyB2YWx1ZTwvcD4gXHJcbiAgICAgIDxwPjxiPlBlZWs8L2I+IHJldHVybnMgdmFsdWUgb2YgaXRlbSBhdCBmcm9udCBvZiBxdWV1ZTwvcD5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSAxMDtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSA0O1xyXG4gICAgY29uc3QgYXJyID0gW107XHJcbiAgICBjb25zdCBhcnJWYWx1ZXMgPSBnZXRVbmlxdWVSYW5kb21BcnJheShsZW5ndGhGaWxsLCAxMDAwKTtcclxuICAgIGFyclZhbHVlcy5zb3J0KChhLCBiKSA9PiBiIC0gYSk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSBuZXcgSXRlbSh7aW5kZXg6IGl9KTtcclxuICAgICAgaWYgKGkgPCBsZW5ndGhGaWxsKSBpdGVtLnNldFZhbHVlKGFyclZhbHVlc1tpXSk7XHJcbiAgICAgIGFyci5wdXNoKGl0ZW0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoRmlsbDtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW1xyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5sZW5ndGggLSAxLCBzaXplOiAxLCBjb2xvcjogJ3JlZCcsIHRleHQ6ICdmcm9udCd9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDMsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdyZWFyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDEsIGNvbG9yOiAncHVycGxlJ30pXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvcklucygpIHtcclxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBwdXNoLiBRdWV1ZSBpcyBmdWxsJztcclxuICAgIH1cclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGluc2VydCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMl0ucG9zaXRpb24gPSB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb247XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgZm9yIChsZXQgaSA9IHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbjsgaSA+PSAtMTsgaS0tKSB7XHJcbiAgICAgIGlmIChpID09PSAtMSB8fCBrZXkgPD0gdGhpcy5pdGVtc1tpXS52YWx1ZSkge1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbisrO1xyXG4gICAgICAgIHlpZWxkICdGb3VuZCBwbGFjZSB0byBpbnNlcnQnO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaSArIDFdLnNldFZhbHVlKGtleSk7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uKys7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tpICsgMV0ubW92ZUZyb20odGhpcy5pdGVtc1tpXSk7XHJcbiAgICAgICAgeWllbGQgJ1NlYXJjaGluZyBmb3IgcGxhY2UgdG8gaW5zZXJ0JztcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMl0ucG9zaXRpb24tLTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gLTE7XHJcbiAgICB0aGlzLmxlbmd0aCsrO1xyXG4gICAgcmV0dXJuIGBJbnNlcnRlZCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yUmVtKCkge1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgcmVtb3ZlLiBRdWV1ZSBpcyBlbXB0eSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnV2lsbCByZW1vdmUgaXRlbSBmcm9tIGZyb250IG9mIHF1ZXVlJztcclxuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW3RoaXMubWFya2Vyc1swXS5wb3NpdGlvbl07XHJcbiAgICBjb25zdCB2YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICBpdGVtLmNsZWFyKCk7XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24tLTtcclxuICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICByZXR1cm4gYEl0ZW0gcmVtb3ZlZDsgUmV0dXJuZWQgdmFsdWUgaXMgJHt2YWx1ZX1gO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXByaW9yaXR5LXF1ZXVlJywgUGFnZVByaW9yaXR5UXVldWUpOyIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zSG9yaXpvbnRhbExpbmtlZCBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiB7dHlwZTogQXJyYXl9LFxyXG4gICAgICBtYXJrZXI6IHt0eXBlOiBPYmplY3R9LFxyXG4gICAgICBuYXJyb3c6IHt0eXBlOiBCb29sZWFufVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgIHRoaXMubWFya2VyID0ge307XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgJHt0aGlzLml0ZW1zLm1hcCgoaXRlbSwgaSkgPT4gaHRtbGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbSAke2l0ZW0ubWFyayA/ICdtYXJrJyA6ICcnfSAke2l0ZW0udmFsdWUgPT0gbnVsbCA/ICduby1kYXRhJzogJyd9XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIiBzdHlsZT1cIiR7aXRlbS5jb2xvciA/ICdiYWNrZ3JvdW5kLWNvbG9yOicgKyBpdGVtLmNvbG9yIDogJyd9XCI+XHJcbiAgICAgICAgICAgICR7aXRlbS52YWx1ZSAhPSBudWxsID8gaXRlbS52YWx1ZSA6IGh0bWxgJm5ic3A7YH1cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1hcmtlcl9jb250YWluZXJcIj5cclxuICAgICAgICAgICAgJHt0aGlzLm1hcmtlci5wb3NpdGlvbiA9PT0gKGl0ZW0uaW5kZXggIT0gbnVsbCA/IGl0ZW0uaW5kZXggOiBpKSA/IGh0bWxgPGRpdiBjbGFzcz1cIm1hcmtlclwiPjwvZGl2PmAgOiAnJ31cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICBgKX1cclxuICAgIGA7XHJcbiAgfVxyXG59XHJcblxyXG5YSXRlbXNIb3Jpem9udGFsTGlua2VkLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcclxuICAgIGZsZXgtd3JhcDogd3JhcDtcclxuICAgIGFsaWduLWNvbnRlbnQ6IGZsZXgtc3RhcnQ7XHJcbiAgICBoZWlnaHQ6IDE5ZW07XHJcbiAgICBtYXgtd2lkdGg6IDYwMHB4O1xyXG4gIH1cclxuICA6aG9zdChbbmFycm93XSksXHJcbiAgOmhvc3QoW25hcnJvd10pIC5pdGVtIHtcclxuICAgIGhlaWdodDogM2VtO1xyXG4gIH1cclxuICA6aG9zdChbbmFycm93XSkgLml0ZW06Zmlyc3QtY2hpbGQge1xyXG4gICAgbWFyZ2luLWxlZnQ6IDAuNmVtO1xyXG4gIH1cclxuICA6aG9zdChbbmFycm93XSkgLml0ZW06Zmlyc3QtY2hpbGQ6YWZ0ZXIge1xyXG4gICAgZGlzcGxheTogbm9uZTtcclxuICB9XHJcbiAgOmhvc3QoW25hcnJvd10pIC5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgaGVpZ2h0OiAxMHB4O1xyXG4gIH1cclxuICAuaXRlbSB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcclxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgIG1hcmdpbi1sZWZ0OiAyZW07XHJcbiAgICBoZWlnaHQ6IDQuNWVtO1xyXG4gIH1cclxuICAuaXRlbS5uby1kYXRhOmJlZm9yZSxcclxuICAuaXRlbTpmaXJzdC1jaGlsZDpiZWZvcmUge1xyXG4gICAgZGlzcGxheTogbm9uZTsgIFxyXG4gIH1cclxuICAuaXRlbS5tYXJrOmZpcnN0LWNoaWxkOmFmdGVyIHtcclxuICAgIGJvcmRlci1sZWZ0OiBub25lO1xyXG4gIH1cclxuICAuaXRlbTpmaXJzdC1jaGlsZDphZnRlciB7XHJcbiAgICBsZWZ0OiAyZW07XHJcbiAgICB3aWR0aDogM2VtO1xyXG4gIH1cclxuICAuaXRlbTpsYXN0LWNoaWxkOmFmdGVyIHtcclxuICAgIHdpZHRoOiA1ZW07XHJcbiAgfVxyXG4gIC5pdGVtLm1hcms6bGFzdC1jaGlsZDphZnRlciB7XHJcbiAgICBib3JkZXItcmlnaHQ6IG5vbmU7XHJcbiAgfVxyXG4gIC5pdGVtOmJlZm9yZSB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgd2lkdGg6IDVweDtcclxuICAgIGhlaWdodDogNXB4O1xyXG4gICAgdG9wOiAwLjg1ZW07XHJcbiAgICBsZWZ0OiAtMXB4O1xyXG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTEwMCUsIC01MCUpIHJvdGF0ZSg0NWRlZyk7XHJcbiAgICB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXI7XHJcbiAgICBib3JkZXI6IDJweCBzb2xpZDtcclxuICAgIGJvcmRlci1sZWZ0OiBub25lO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICAgIGJvcmRlci1jb2xvcjogZ3JheTtcclxuICB9XHJcbiAgLml0ZW06YWZ0ZXIge1xyXG4gICAgY29udGVudDogJyc7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIGhlaWdodDogMnB4O1xyXG4gICAgd2lkdGg6IDdlbTtcclxuICAgIHRvcDogMC44NWVtO1xyXG4gICAgbGVmdDogLTJlbTtcclxuICAgIG1hcmdpbi10b3A6IC0xcHg7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBncmF5O1xyXG4gIH1cclxuICAuaXRlbS5tYXJrIHtcclxuICAgIHRvcDogMS41ZW07XHJcbiAgICBoZWlnaHQ6IDNlbTtcclxuICAgIGxlZnQ6IDFlbTtcclxuICAgIG1hcmdpbjogMDtcclxuICB9XHJcbiAgLml0ZW0ubWFyazpiZWZvcmUge1xyXG4gICAgdG9wOiAtMXB4O1xyXG4gICAgbGVmdDogMWVtO1xyXG4gICAgbWFyZ2luLWxlZnQ6IC0xcHg7XHJcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtMTAwJSkgcm90YXRlKDEzNWRlZyk7XHJcbiAgfVxyXG4gIC5pdGVtLm1hcms6YWZ0ZXIge1xyXG4gICAgaGVpZ2h0OiAuNzVlbTtcclxuICAgIHdpZHRoOiAxZW07XHJcbiAgICB0b3A6IC0uNzVlbTtcclxuICAgIGxlZnQ6IDFlbTtcclxuICAgIGJvcmRlcjogMnB4IHNvbGlkIGdyYXk7XHJcbiAgICBib3JkZXItdG9wOiBub25lO1xyXG4gICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC0ycHgsIDJweCk7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIHotaW5kZXg6IDE7XHJcbiAgICBtaW4td2lkdGg6IDEuN2VtO1xyXG4gICAgbWluLWhlaWdodDogMS43ZW07XHJcbiAgICBwYWRkaW5nOiAwIDEwcHg7XHJcbiAgICBtYXJnaW46IDA7XHJcbiAgICBsaW5lLWhlaWdodDogMS43ZW07XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XHJcbiAgICBhbGlnbi1zZWxmOiBjZW50ZXI7XHJcbiAgfVxyXG4gIC5tYXJrZXIge1xyXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xyXG4gIH1cclxuICAubWFya2VyOmJlZm9yZSB7XHJcbiAgICBjb250ZW50OiAnJztcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgd2lkdGg6IDVweDtcclxuICAgIGhlaWdodDogNXB4O1xyXG4gICAgdG9wOiAycHg7XHJcbiAgICBsZWZ0OiA1MCU7XHJcbiAgICB0cmFuc2Zvcm06IHJvdGF0ZSgtNDVkZWcpIHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcclxuICAgIGJvcmRlcjogMnB4IHNvbGlkO1xyXG4gICAgYm9yZGVyLWxlZnQ6IG5vbmU7XHJcbiAgICBib3JkZXItYm90dG9tOiBub25lO1xyXG4gICAgYm9yZGVyLWNvbG9yOiByZWQ7XHJcbiAgfVxyXG4gIC5tYXJrZXI6YWZ0ZXIge1xyXG4gICAgY29udGVudDogJyc7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIHdpZHRoOiAycHg7XHJcbiAgICBoZWlnaHQ6IDFlbTtcclxuICAgIHRvcDogMXB4O1xyXG4gICAgbGVmdDogNTAlO1xyXG4gICAgbWFyZ2luLWxlZnQ6IC0ycHg7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLWhvcml6b250YWwtbGlua2VkJywgWEl0ZW1zSG9yaXpvbnRhbExpbmtlZCk7IiwiaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZX0gZnJvbSAnLi9wYWdlQmFzZSc7XHJcbmltcG9ydCB7Z2V0VW5pcXVlUmFuZG9tQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2RpYWxvZyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pbmZvJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2l0ZW1zSG9yaXpvbnRhbExpbmtlZCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUxpbmtMaXN0IGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKDEzKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDE+TGluayBMaXN0PC9oMT5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvck5ldyl9Pk5ldzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9ySW5zKX0+SW5zPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGaW5kKX0+RmluZDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRGVsKX0+RGVsPC94LWJ1dHRvbj5cclxuICAgICAgICA8bGFiZWw+PGlucHV0IGNsYXNzPVwic29ydGVkXCIgdHlwZT1cImNoZWNrYm94XCIgZGlzYWJsZWQ+U29ydGVkPC9sYWJlbD5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+TmV3PC9iPiBjcmVhdGVzIGxpbmtlZCBsaXN0IHdpdGggTiBpdGVtcyAoMjggbWF4KTwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5JbnM8L2I+IGluc2VydHMgbmV3IGl0ZW0gd2l0aCB2YWx1ZSBOPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkZpbmQ8L2I+IGZpbmRzIGl0ZW0gd2l0aCB2YWx1ZSBOPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkRlbDwvYj4gZGVsZXRlcyBpdGVtIHdpdGggdmFsdWUgTjwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5Tb3J0ZWQ8L2I+IGNoZWNrYm94IGlzIHVzZWQgd2l0aCBOZXc8L3A+IFxyXG4gICAgICAgIDwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtaG9yaXpvbnRhbC1saW5rZWQgLml0ZW1zPSR7dGhpcy5pdGVtc30gLm1hcmtlcj0ke3RoaXMubWFya2VyfT48L3gtaXRlbXMtaG9yaXpvbnRhbC1saW5rZWQ+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGZpcnN0VXBkYXRlZCgpIHtcclxuICAgIHRoaXMuY29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1jb25zb2xlJyk7XHJcbiAgICB0aGlzLmRpYWxvZyA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1kaWFsb2cnKTtcclxuICAgIHRoaXMuc29ydGVkID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuc29ydGVkJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoLCBzb3J0ZWQpIHtcclxuICAgIGNvbnN0IGFyclZhbHVlcyA9IGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aCwgMTAwMCk7XHJcbiAgICBpZiAoc29ydGVkKSBhcnJWYWx1ZXMuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG4gICAgdGhpcy5pdGVtcyA9IGFyclZhbHVlcy5tYXAodmFsdWUgPT4gKG5ldyBJdGVtKHt9KSkuc2V0VmFsdWUodmFsdWUpKTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgbGlua2VkIGxpc3QgdG8gY3JlYXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiA1NiB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMCBhbmQgNjAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGxpc3Qgd2l0aCAke2xlbmd0aH0gbGlua3NgO1xyXG4gICAgdGhpcy5zb3J0ZWQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHlpZWxkICdTZWxlY3Q6IFNvcnRlZCBvciBub3QnO1xyXG4gICAgdGhpcy5zb3J0ZWQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoLCB0aGlzLnNvcnRlZC5jaGVja2VkKTtcclxuICB9XHJcblxyXG4gICogc2VhcmNoKGtleSwgaXNJbnNlcnRpb24pIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGk7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2ldLnZhbHVlID09PSBrZXkgfHwgaXNJbnNlcnRpb24gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpICE9PSB0aGlzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICB5aWVsZCBgU2VhcmNoaW5nIGZvciAke2lzSW5zZXJ0aW9uID8gJ2luc2VydGlvbiBwb2ludCcgOiBgaXRlbSB3aXRoIGtleSAke2tleX1gfWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IDU2KSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBsaXN0IGlzIGZ1bGwnO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIGNvbnN0IGl0ZW0gPSAobmV3IEl0ZW0oe21hcms6IHRydWV9KSkuc2V0VmFsdWUoa2V5KTtcclxuICAgIGxldCBmb3VuZEF0ID0gMDtcclxuICAgIGlmICh0aGlzLnNvcnRlZC5jaGVja2VkKSB7XHJcbiAgICAgIHlpZWxkICdXaWxsIHNlYXJjaCBpbnNlcnRpb24gcG9pbnQnO1xyXG4gICAgICBmb3VuZEF0ID0geWllbGQqIHRoaXMuc2VhcmNoKGtleSwgdHJ1ZSk7XHJcbiAgICAgIHlpZWxkICdIYXZlIGZvdW5kIGluc2VydGlvbiBwb2ludCc7XHJcbiAgICAgIGlmIChmb3VuZEF0ICE9IG51bGwpIHtcclxuICAgICAgICBjb25zdCBwYXJ0ID0gdGhpcy5pdGVtcy5zcGxpY2UoZm91bmRBdCwgdGhpcy5pdGVtcy5sZW5ndGggLSBmb3VuZEF0LCBpdGVtKTtcclxuICAgICAgICB0aGlzLml0ZW1zID0gdGhpcy5pdGVtcy5jb25jYXQocGFydCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pdGVtcy5wdXNoKGl0ZW0pO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgICB0aGlzLml0ZW1zLnVuc2hpZnQoaXRlbSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IC0xO1xyXG4gICAgeWllbGQgJ0l0ZW0gaW5zZXJ0ZWQuIFdpbGwgcmVkcmF3IHRoZSBsaXN0JztcclxuICAgIGl0ZW0ubWFyayA9IGZhbHNlO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBmb3VuZEF0O1xyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgSW5zZXJ0aW9uIGNvbXBsZXRlZC4gVG90YWwgaXRlbXMgPSAke3RoaXMuaXRlbXMubGVuZ3RofWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmluZCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGZpbmQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Uga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIHlpZWxkIGBMb29raW5nIGZvciBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgZm91bmRBdCA9IHlpZWxkKiB0aGlzLnNlYXJjaChrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgcmV0dXJuIGAke2ZvdW5kQXQgPT0gbnVsbCA/ICdObycgOiAnSGF2ZSBmb3VuZCd9IGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRGVsKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZGVsZXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5zZWFyY2goa2V5KTtcclxuICAgIGlmIChmb3VuZEF0ID09IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgICByZXR1cm4gYE5vIGl0ZW1zIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB5aWVsZCBgSGF2ZSBmb3VuZCBpdGVtIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICAgIHRoaXMuaXRlbXNbZm91bmRBdF0uY2xlYXIoKTtcclxuICAgICAgeWllbGQgJ0RlbGV0ZWQgaXRlbS4gV2lsbCByZWRyYXcgdGhlIGxpc3QnO1xyXG4gICAgICB0aGlzLml0ZW1zLnNwbGljZShmb3VuZEF0LCAxKTtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gICAgICByZXR1cm4gYERlbGV0ZWQgaXRlbSB3aXRoIGtleSAke2tleX0uIFRvdGFsIGl0ZW1zID0gJHt0aGlzLml0ZW1zLmxlbmd0aH1gO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWxpbmstbGlzdCcsIFBhZ2VMaW5rTGlzdCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VNZXJnZVNvcnQgZXh0ZW5kcyBQYWdlQmFzZVNvcnQge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMudGl0bGUgPSAnTWVyZ2UgU29ydCc7XHJcbiAgICB0aGlzLmxlbmd0aCA9IDEyO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gIG1lcmdlU29ydChsb3dlciwgdXBwZXIpIHtcclxuICAgIGlmIChsb3dlciAhPT0gdXBwZXIpIHtcclxuICAgICAgbGV0IG1pZCA9IE1hdGguZmxvb3IoKGxvd2VyICsgdXBwZXIpIC8gMik7XHJcbiAgICAgIHRoaXMubWVyZ2VTb3J0KGxvd2VyLCBtaWQpO1xyXG4gICAgICB0aGlzLm1lcmdlU29ydChtaWQgKyAxLCB1cHBlcik7XHJcbiAgICAgIHRoaXMubWVyZ2UobG93ZXIsIG1pZCArIDEsIHVwcGVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIG1lcmdlKGxvd2VyLCBtaWQsIHVwcGVyKSB7XHJcbiAgICBsZXQgbG93ZXJCb3VuZCA9IGxvd2VyO1xyXG4gICAgbGV0IG1pZEJvdW5kID0gbWlkIC0gMTtcclxuICAgIGxldCB3b3JrU3BhY2UgPSBbXTtcclxuICAgIHdoaWxlIChsb3dlciA8PSBtaWRCb3VuZCAmJiBtaWQgPD0gdXBwZXIpIHtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbbG93ZXJdLnZhbHVlIDwgdGhpcy5pdGVtc1ttaWRdLnZhbHVlKSB7XHJcbiAgICAgICAgd29ya1NwYWNlLnB1c2gobmV3IEl0ZW0odGhpcy5pdGVtc1tsb3dlcisrXSkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbWlkKytdKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHdoaWxlIChsb3dlciA8PSBtaWRCb3VuZCkge1xyXG4gICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW2xvd2VyKytdKSk7XHJcbiAgICB9XHJcbiAgICB3aGlsZSAobWlkIDw9IHVwcGVyKSB7XHJcbiAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbWlkKytdKSk7XHJcbiAgICB9XHJcbiAgICB3b3JrU3BhY2UuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xyXG4gICAgICB0aGlzLml0ZW1zW2xvd2VyQm91bmQgKyBpXS5jb3B5RnJvbShpdGVtKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgKiAqL1xyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2xvd2VyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogMCwgc2l6ZTogMiwgY29sb3I6ICdyZWQnLCB0ZXh0OiAndXBwZXInfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAzLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbWlkJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDMsIGNvbG9yOiAncHVycGxlJywgdGV4dDogJ3B0cid9KSxcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0cyhjb3BpZXMgPSAwLCBjb21wYXJpc29ucyA9IDApIHtcclxuICAgIHRoaXMuY29uc29sZVN0YXRzLnNldE1lc3NhZ2UoYENvcGllczogJHtjb3BpZXN9LCBDb21wYXJpc29uczogJHtjb21wYXJpc29uc31gKTtcclxuICB9XHJcblxyXG4gICogbWVyZ2UobG93ZXIsIG1pZCwgdXBwZXIpIHtcclxuICAgIGxldCBsb3dlckJvdW5kID0gbG93ZXI7XHJcbiAgICBsZXQgbWlkQm91bmQgPSBtaWQgLSAxO1xyXG4gICAgbGV0IHdvcmtTcGFjZSA9IFtdO1xyXG4gICAgd2hpbGUgKGxvd2VyIDw9IG1pZEJvdW5kICYmIG1pZCA8PSB1cHBlcikge1xyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW2xvd2VyXS52YWx1ZSA8IHRoaXMuaXRlbXNbbWlkXS52YWx1ZSkge1xyXG4gICAgICAgIHdvcmtTcGFjZS5wdXNoKG5ldyBJdGVtKHRoaXMuaXRlbXNbbG93ZXIrK10pKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW21pZCsrXSkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB3aGlsZSAobG93ZXIgPD0gbWlkQm91bmQpIHtcclxuICAgICAgd29ya1NwYWNlLnB1c2gobmV3IEl0ZW0odGhpcy5pdGVtc1tsb3dlcisrXSkpO1xyXG4gICAgfVxyXG4gICAgd2hpbGUgKG1pZCA8PSB1cHBlcikge1xyXG4gICAgICB3b3JrU3BhY2UucHVzaChuZXcgSXRlbSh0aGlzLml0ZW1zW21pZCsrXSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gLTE7XHJcbiAgICB0aGlzLm1hcmtlcnNbM10ucG9zaXRpb24gPSBsb3dlckJvdW5kO1xyXG4gICAgdGhpcy5jb3BpZXMgKz0gd29ya1NwYWNlLmxlbmd0aDtcclxuICAgIHRoaXMudXBkYXRlU3RhdHModGhpcy5jb3BpZXMsIHRoaXMuY29tcGFyaXNvbnMpO1xyXG4gICAgeWllbGQgYE1lcmdlZCAke2xvd2VyQm91bmR9LSR7bWlkQm91bmR9IGFuZCAke21pZEJvdW5kICsgMX0tJHt1cHBlcn0gaW50byB3b3JrU3BhY2VgO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrU3BhY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGhpcy5pdGVtc1tsb3dlckJvdW5kICsgaV0uY29weUZyb20od29ya1NwYWNlW2ldKTtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gbG93ZXJCb3VuZCArIGk7XHJcbiAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLmNvcGllcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgIHlpZWxkIGBDb3BpZWQgd29ya3NwYWNlIGludG8gJHtsb3dlckJvdW5kICsgaX1gO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclN0ZXAoKSB7XHJcbiAgICB0aGlzLmJlZm9yZVNvcnQoKTtcclxuICAgIHRoaXMuY29waWVzID0gMDtcclxuICAgIHRoaXMuY29tcGFyaXNvbnMgPSAwO1xyXG5cclxuICAgIGNvbnN0IG9wZXJhdGlvbnMgPSBbXTtcclxuICAgIGNvbnN0IG1lcmdlU29ydCA9IChsb3dlciwgdXBwZXIpID0+IHtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0U3RhcnQnLCBsb3dlcjogbG93ZXIsIHVwcGVyOiB1cHBlcn0pO1xyXG4gICAgICBpZiAobG93ZXIgIT09IHVwcGVyKSB7XHJcbiAgICAgICAgbGV0IG1pZCA9IE1hdGguZmxvb3IoKGxvd2VyICsgdXBwZXIpIC8gMik7XHJcbiAgICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0TG93ZXInLCBsb3dlcjogbG93ZXIsIHVwcGVyOiBtaWR9KTtcclxuICAgICAgICBtZXJnZVNvcnQobG93ZXIsIG1pZCk7XHJcbiAgICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbWVyZ2VTb3J0VXBwZXInLCBsb3dlcjogbWlkICsgMSwgdXBwZXI6IHVwcGVyfSk7XHJcbiAgICAgICAgbWVyZ2VTb3J0KG1pZCArIDEsIHVwcGVyKTtcclxuICAgICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdtZXJnZScsIGxvd2VyOiBsb3dlciwgbWlkOiBtaWQgKyAxLCB1cHBlcjogdXBwZXJ9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBvcGVyYXRpb25zLnB1c2goe3R5cGU6ICdtZXJnZVNvcnRFbmQnLCBsb3dlcjogbG93ZXIsIHVwcGVyOiB1cHBlcn0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgbWVyZ2VTb3J0KDAsIHRoaXMuaXRlbXMubGVuZ3RoIC0gMSk7XHJcblxyXG4gICAgeWllbGQgJ0luaXRpYWwgY2FsbCB0byBtZXJnZVNvcnQnO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcGVyYXRpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN3aXRjaCAob3BlcmF0aW9uc1tpXS50eXBlKSB7XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0U3RhcnQnOiB7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLmxvd2VyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS51cHBlcjtcclxuICAgICAgICAgIHlpZWxkIGBFbnRlcmluZyBtZXJnZVNvcnQ6ICR7b3BlcmF0aW9uc1tpXS5sb3dlcn0tJHtvcGVyYXRpb25zW2ldLnVwcGVyfWA7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0RW5kJzoge1xyXG4gICAgICAgICAgeWllbGQgYEV4aXRpbmcgbWVyZ2VTb3J0OiAke29wZXJhdGlvbnNbaV0ubG93ZXJ9LSR7b3BlcmF0aW9uc1tpXS51cHBlcn1gO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgJ21lcmdlU29ydExvd2VyJzoge1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gIG9wZXJhdGlvbnNbaV0udXBwZXI7XHJcbiAgICAgICAgICB5aWVsZCBgV2lsbCBzb3J0IGxvd2VyIGhhbGY6ICR7b3BlcmF0aW9uc1tpXS5sb3dlcn0tJHtvcGVyYXRpb25zW2ldLnVwcGVyfWA7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnbWVyZ2VTb3J0VXBwZXInOiB7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLnVwcGVyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS5sb3dlcjtcclxuICAgICAgICAgIHlpZWxkIGBXaWxsIHNvcnQgdXBwZXIgaGFsZjogJHtvcGVyYXRpb25zW2ldLmxvd2VyfS0ke29wZXJhdGlvbnNbaV0udXBwZXJ9YDtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlICdtZXJnZSc6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIG1lcmdlIHJhbmdlcyc7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBvcGVyYXRpb25zW2ldLmxvd2VyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gb3BlcmF0aW9uc1tpXS51cHBlcjtcclxuICAgICAgICAgIHlpZWxkKiB0aGlzLm1lcmdlKG9wZXJhdGlvbnNbaV0ubG93ZXIsIG9wZXJhdGlvbnNbaV0ubWlkLCBvcGVyYXRpb25zW2ldLnVwcGVyKTtcclxuICAgICAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IC0xO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgaXMgY29tcGxldGUnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLW1lcmdlLXNvcnQnLCBQYWdlTWVyZ2VTb3J0KTsiLCJpbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7UGFnZUJhc2VTb3J0fSBmcm9tICcuL3BhZ2VCYXNlU29ydCc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVNoZWxsU29ydCBleHRlbmRzIFBhZ2VCYXNlU29ydCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdTaGVsbCBTb3J0JztcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgbGV0IGggPSAxO1xyXG4gICAgLy9jYWxjdWxhdGUgbWF4aW11bSBwb3NzaWJsZSBoXHJcbiAgICB3aGlsZSAoaCA8PSAodGhpcy5pdGVtcy5sZW5ndGggLSAxKSAvIDMpIHtcclxuICAgICAgaCA9IGggKiAzICsgMTtcclxuICAgIH1cclxuICAgIC8vY29uc2lzdGVudCByZWR1Y2UgaFxyXG4gICAgd2hpbGUgKGggPiAwKSB7XHJcbiAgICAgIC8vaC1zb3J0XHJcbiAgICAgIGZvciAobGV0IG91dGVyID0gaDsgb3V0ZXIgPCB0aGlzLml0ZW1zLmxlbmd0aDsgb3V0ZXIrKykge1xyXG4gICAgICAgIHRoaXMuaXRlbXNbb3V0ZXJdLnN3YXBXaXRoKHRoaXMudGVtcCk7XHJcbiAgICAgICAgbGV0IGlubmVyID0gb3V0ZXI7XHJcbiAgICAgICAgd2hpbGUgKGlubmVyID4gaCAtIDEgJiYgdGhpcy50ZW1wLnZhbHVlIDw9IHRoaXMuaXRlbXNbaW5uZXIgLSBoXS52YWx1ZSkge1xyXG4gICAgICAgICAgdGhpcy5pdGVtc1tpbm5lcl0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbm5lciAtIGhdKTtcclxuICAgICAgICAgIGlubmVyIC09IGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGVtcC5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyXSk7XHJcbiAgICAgIH1cclxuICAgICAgLy9yZWR1Y2UgaFxyXG4gICAgICBoID0gKGggLSAxKSAvIDM7XHJcbiAgICB9XHJcblxyXG4gICogKi9cclxuXHJcbiAgaW5pdEl0ZW1zKGxlbmd0aCkge1xyXG4gICAgc3VwZXIuaW5pdEl0ZW1zKGxlbmd0aCk7XHJcbiAgICB0aGlzLnRlbXAgPSBuZXcgSXRlbSh7dmFsdWU6IDB9KTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW1xyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ291dGVyJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogLTEsIHNpemU6IDIsIGNvbG9yOiAnYmx1ZScsIHRleHQ6ICdpbm5lcid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IC0xLCBzaXplOiAzLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnaW5uZXItaCd9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246ICd0ZW1wJywgc2l6ZTogMSwgY29sb3I6ICdwdXJwbGUnLCB0ZXh0OiAndGVtcCd9KVxyXG4gICAgXTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVN0YXRzKGNvcGllcyA9IDAsIGNvbXBhcmlzb25zID0gMCwgaCA9IDEpIHtcclxuICAgIHRoaXMuY29uc29sZVN0YXRzLnNldE1lc3NhZ2UoYENvcGllczogJHtjb3BpZXN9LCBDb21wYXJpc29uczogJHtjb21wYXJpc29uc30sIGg9JHtofWApO1xyXG4gIH1cclxuXHJcbiAgYWZ0ZXJTb3J0KCkge1xyXG4gICAgc3VwZXIuYWZ0ZXJTb3J0KCk7XHJcbiAgICB0aGlzLnRlbXAgPSBuZXcgSXRlbSh7dmFsdWU6IDB9KTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICBsZXQgY29waWVzID0gMDtcclxuICAgIGxldCBjb21wYXJpc29ucyA9IDA7XHJcbiAgICBsZXQgaCA9IDE7XHJcbiAgICAvL2NhbGN1bGF0ZSBtYXhpbXVtIHBvc3NpYmxlIGhcclxuICAgIHdoaWxlIChoIDw9ICh0aGlzLml0ZW1zLmxlbmd0aCAtIDEpIC8gMykge1xyXG4gICAgICBoID0gaCAqIDMgKyAxO1xyXG4gICAgfVxyXG4gICAgLy9jb25zaXN0ZW50IHJlZHVjZSBoXHJcbiAgICB3aGlsZSAoaCA+IDApIHtcclxuICAgICAgLy9oLXNvcnRcclxuICAgICAgdGhpcy51cGRhdGVTdGF0cyhjb3BpZXMsIGNvbXBhcmlzb25zLCBoKTtcclxuICAgICAgZm9yIChsZXQgb3V0ZXIgPSBoOyBvdXRlciA8IHRoaXMuaXRlbXMubGVuZ3RoOyBvdXRlcisrKSB7XHJcbiAgICAgICAgbGV0IGlubmVyID0gb3V0ZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gb3V0ZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gaW5uZXI7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gaW5uZXIgLSBoO1xyXG4gICAgICAgIHlpZWxkIGAke2h9LXNvcnRpbmcgYXJyYXkuIFdpbGwgY29weSBvdXRlciB0byB0ZW1wYDtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrY29waWVzLCBjb21wYXJpc29ucywgaCk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tvdXRlcl0uc3dhcFdpdGgodGhpcy50ZW1wKTtcclxuICAgICAgICB5aWVsZCAnV2lsbCBjb21wYXJlIGlubmVyLWggYW5kIHRlbXAnO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoY29waWVzLCArK2NvbXBhcmlzb25zLCBoKTtcclxuICAgICAgICB3aGlsZSAoaW5uZXIgPiBoIC0gMSAmJiB0aGlzLnRlbXAudmFsdWUgPD0gdGhpcy5pdGVtc1tpbm5lciAtIGhdLnZhbHVlKSB7XHJcbiAgICAgICAgICB5aWVsZCAnaW5uZXItaCA+PSB0ZW1wOyBXaWxsIGNvcHkgaW5uZXItaCB0byBpbm5lcic7XHJcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrY29waWVzLCBjb21wYXJpc29ucywgaCk7XHJcbiAgICAgICAgICB0aGlzLml0ZW1zW2lubmVyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyIC0gaF0pO1xyXG4gICAgICAgICAgaW5uZXIgLT0gaDtcclxuICAgICAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGlubmVyO1xyXG4gICAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gaW5uZXIgLSBoO1xyXG4gICAgICAgICAgaWYgKGlubmVyIDw9IGggLSAxKSB7XHJcbiAgICAgICAgICAgIHlpZWxkICdUaGVyZSBpcyBubyBpbm5lci1oJztcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHlpZWxkICdXaWxsIGNvbXBhcmUgaW5uZXItaCBhbmQgdGVtcCc7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHMoY29waWVzLCArK2NvbXBhcmlzb25zLCBoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgeWllbGQgYCR7aW5uZXIgPD0gaCAtIDEgPyAnJyA6ICdpbm5lci1oIDwgdGVtcDsgJ31XaWxsIGNvcHkgdGVtcCB0byBpbm5lcmA7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK2NvcGllcywgY29tcGFyaXNvbnMsIGgpO1xyXG4gICAgICAgIHRoaXMudGVtcC5zd2FwV2l0aCh0aGlzLml0ZW1zW2lubmVyXSk7XHJcbiAgICAgIH1cclxuICAgICAgLy9yZWR1Y2UgaFxyXG4gICAgICBoID0gKGggLSAxKSAvIDM7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFmdGVyU29ydCgpO1xyXG4gICAgcmV0dXJuICdTb3J0IGlzIGNvbXBsZXRlJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1zaGVsbC1zb3J0JywgUGFnZVNoZWxsU29ydCk7IiwiaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmFzZVNvcnR9IGZyb20gJy4vcGFnZUJhc2VTb3J0JztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlUGFydGl0aW9uIGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ1BhcnRpdGlvbic7XHJcbiAgICB0aGlzLnBhcnRpdGlvbiA9IC0xO1xyXG4gICAgdGhpcy5sZW5ndGggPSAxMjtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICogYWxnb3JpdGhtOlxyXG5cclxuICAgIGxldCBwaXZvdCA9IDUwO1xyXG4gICAgbGV0IGxlZnQgPSAwO1xyXG4gICAgbGV0IHJpZ2h0ID0gdGhpcy5pdGVtcy5sZW5ndGggLSAxO1xyXG5cclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdCAtIDE7XHJcbiAgICBsZXQgcmlnaHRQdHIgPSByaWdodCArIDE7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAvL3NlYXJjaCBncmVhdGVyIHRoYW4gcGl2b3RcclxuICAgICAgd2hpbGUgKGxlZnRQdHIgPCByaWdodCAmJiB0aGlzLml0ZW1zWysrbGVmdFB0cl0udmFsdWUgPCBwaXZvdCkge1xyXG4gICAgICB9XHJcbiAgICAgIC8vc2VhcmNoIGxlc3MgdGhhbiBwaXZvdFxyXG4gICAgICB3aGlsZSAocmlnaHRQdHIgPiBsZWZ0ICYmIHRoaXMuaXRlbXNbLS1yaWdodFB0cl0udmFsdWUgPiBwaXZvdCkge1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3JpZ2h0UHRyXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMucGFydGl0aW9uID0gbGVmdFB0cjtcclxuXHJcbiAgKiAqL1xyXG5cclxuICBhZnRlclNvcnQoKSB7XHJcbiAgICBzdXBlci5hZnRlclNvcnQoKTtcclxuICAgIHRoaXMucGl2b3RzID0gW107XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IC0xLCBzaXplOiAxLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbGVmdFNjYW4nfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAtMSwgc2l6ZTogMSwgY29sb3I6ICdibHVlJywgdGV4dDogJ3JpZ2h0U2Nhbid9KSxcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IHRoaXMucGFydGl0aW9uLCBzaXplOiAyLCBjb2xvcjogJ3B1cnBsZScsIHRleHQ6ICdwYXJ0aXRpb24nfSlcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gLTE7XHJcbiAgICBsZXQgc3dhcHMgPSAwO1xyXG4gICAgbGV0IGNvbXBhcmlzb25zID0gMDtcclxuXHJcbiAgICBsZXQgbGVmdCA9IDA7XHJcbiAgICBsZXQgcmlnaHQgPSB0aGlzLml0ZW1zLmxlbmd0aCAtIDE7XHJcbiAgICB0aGlzLnBpdm90cyA9IFt7XHJcbiAgICAgIHN0YXJ0OiBsZWZ0LFxyXG4gICAgICBlbmQ6IHJpZ2h0LFxyXG4gICAgICB2YWx1ZTogNDAgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMClcclxuICAgIH1dO1xyXG4gICAgeWllbGQgYFBpdm90IHZhbHVlIGlzICR7dGhpcy5waXZvdHNbMF0udmFsdWV9YDtcclxuXHJcbiAgICBsZXQgbGVmdFB0ciA9IGxlZnQgLSAxO1xyXG4gICAgbGV0IHJpZ2h0UHRyID0gcmlnaHQgKyAxO1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgeWllbGQgYFdpbGwgc2NhbiAke2xlZnRQdHIgPiAtMSA/ICdhZ2FpbicgOiAnJ30gZnJvbSBsZWZ0YDtcclxuICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gbGVmdFB0ciArIDE7XHJcbiAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICB3aGlsZSAobGVmdFB0ciA8IHJpZ2h0ICYmIHRoaXMuaXRlbXNbKytsZWZ0UHRyXS52YWx1ZSA8IHRoaXMucGl2b3RzWzBdLnZhbHVlKSB7XHJcbiAgICAgICAgaWYgKGxlZnRQdHIgPCByaWdodCkge1xyXG4gICAgICAgICAgeWllbGQgJ0NvbnRpbnVlIGxlZnQgc2Nhbic7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBsZWZ0UHRyICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cyhzd2FwcywgKytjb21wYXJpc29ucyk7XHJcbiAgICAgIH1cclxuICAgICAgeWllbGQgJ1dpbGwgc2NhbiBmcm9tIHJpZ2h0JztcclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gcmlnaHRQdHIgLSAxO1xyXG4gICAgICB0aGlzLnVwZGF0ZVN0YXRzKHN3YXBzLCArK2NvbXBhcmlzb25zKTtcclxuICAgICAgd2hpbGUgKHJpZ2h0UHRyID4gbGVmdCAmJiB0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5waXZvdHNbMF0udmFsdWUpIHtcclxuICAgICAgICBpZiAocmlnaHRQdHIgPiBsZWZ0KSB7XHJcbiAgICAgICAgICB5aWVsZCAnQ29udGludWUgcmlnaHQgc2Nhbic7XHJcbiAgICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSByaWdodFB0ciAtIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoc3dhcHMsICsrY29tcGFyaXNvbnMpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0JztcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzd2FwIGxlZnRTY2FuIGFuZCByaWdodFNjYW4nO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKytzd2FwcywgY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbbGVmdFB0cl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodFB0cl0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wYXJ0aXRpb24gPSBsZWZ0UHRyO1xyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnQXJyb3cgc2hvd3MgcGFydGl0aW9uJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1wYXJ0aXRpb24nLCBQYWdlUGFydGl0aW9uKTsiLCJpbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlU29ydH0gZnJvbSAnLi9wYWdlQmFzZVNvcnQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VRdWlja1NvcnQxIGV4dGVuZHMgUGFnZUJhc2VTb3J0IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHN1cGVyKCk7XHJcbiAgICB0aGlzLnRpdGxlID0gJ1F1aWNrIFNvcnQgMSc7XHJcbiAgICB0aGlzLmxlbmd0aCA9IDEyO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIC8qXHJcbiAgKiBhbGdvcml0aG06XHJcblxyXG4gICAgY29uc3QgcXVpY2tTb3J0ID0gKGxlZnQsIHJpZ2h0KSA9PiB7XHJcbiAgICAgIGlmIChyaWdodCAtIGxlZnQgPCAxKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IHBpdm90ID0gcmlnaHQ7XHJcbiAgICAgIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpO1xyXG4gICAgICBxdWlja1NvcnQobGVmdCwgcGl2b3QgLSAxKTtcclxuICAgICAgcXVpY2tTb3J0KHBpdm90ICsgMSwgcmlnaHQpO1xyXG4gICAgfTtcclxuICAgIHF1aWNrU29ydCgwLCB0aGlzLml0ZW1zLmxlbmd0aCAtIDEpO1xyXG5cclxuICAqICovXHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5waXZvdHMgPSBbXTtcclxuICAgIHRoaXMubWFya2VycyA9IFtcclxuICAgICAgbmV3IE1hcmtlcih7cG9zaXRpb246IDAsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ2xlZnQnfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwLCBzaXplOiAyLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAnbGVmdFNjYW4nfSksXHJcbiAgICAgIG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiB0aGlzLml0ZW1zLmxlbmd0aCAtIDEsIHNpemU6IDEsIGNvbG9yOiAncmVkJywgdGV4dDogJ3JpZ2h0J30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5pdGVtcy5sZW5ndGggLSAyLCBzaXplOiAyLCBjb2xvcjogJ2JsdWUnLCB0ZXh0OiAncmlnaHRTY2FuJ30pLFxyXG4gICAgICBuZXcgTWFya2VyKHtwb3NpdGlvbjogdGhpcy5pdGVtcy5sZW5ndGggLSAxLCBzaXplOiAzLCBjb2xvcjogJ3B1cnBsZScsIHRleHQ6ICdwaXZvdCd9KSxcclxuICAgIF07XHJcbiAgfVxyXG5cclxuICAqIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpIHtcclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdCAtIDE7XHJcbiAgICBsZXQgcmlnaHRQdHIgPSByaWdodCArIDE7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBsZWZ0UHRyO1xyXG4gICAgICB0aGlzLm1hcmtlcnNbM10ucG9zaXRpb24gPSByaWdodFB0cjtcclxuICAgICAgaWYgKGxlZnRQdHIgPj0gbGVmdCkge1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHNjYW4gYWdhaW4nO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHlpZWxkIGBsZWZ0U2NhbiA9ICR7bGVmdFB0cn0sIHJpZ2h0U2NhbiA9ICR7cmlnaHRQdHJ9OyBXaWxsIHNjYW5gO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgd2hpbGUgKHRoaXMuaXRlbXNbKytsZWZ0UHRyXS52YWx1ZSA8IHRoaXMuaXRlbXNbcGl2b3RdLnZhbHVlKSB7XHJcbiAgICAgICAgaWYgKGxlZnRQdHIgPCByaWdodCkgdGhpcy5jb21wYXJpc29ucysrO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgd2hpbGUgKHJpZ2h0UHRyID4gMCAmJiB0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5pdGVtc1twaXZvdF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gbGVmdFB0cjtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHRQdHI7XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0LiBXaWxsIHN3YXAgcGl2b3QgYW5kIGxlZnRTY2FuJztcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrdGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3Bpdm90XSk7XHJcbiAgICAgICAgeWllbGQgYEFycmF5IHBhcnRpdGlvbmVkOiBsZWZ0ICgke2xlZnR9LSR7bGVmdFB0ciAtIDF9KSwgcmlnaHQgKCR7bGVmdFB0ciArIDF9LSR7cmlnaHQgKyAxfSkgYDtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzd2FwIGxlZnRTY2FuIGFuZCByaWdodFNjYW4nO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLml0ZW1zW2xlZnRQdHJdLnN3YXBXaXRoKHRoaXMuaXRlbXNbcmlnaHRQdHJdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlZnRQdHI7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RlcCgpIHtcclxuICAgIHRoaXMuYmVmb3JlU29ydCgpO1xyXG4gICAgdGhpcy5zd2FwcyA9IDA7XHJcbiAgICB0aGlzLmNvbXBhcmlzb25zID0gMDtcclxuXHJcbiAgICBjb25zdCBjYWxsU3RhY2sgPSBbe3N0YXRlOiAnaW5pdGlhbCcsIGxlZnQ6IDAsIHJpZ2h0OiB0aGlzLml0ZW1zLmxlbmd0aCAtIDF9XTtcclxuICAgIHdoaWxlIChjYWxsU3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICBsZXQge3N0YXRlLCBsZWZ0LCByaWdodH0gPSBjYWxsU3RhY2sucG9wKCk7XHJcbiAgICAgIGlmIChzdGF0ZSAhPT0gJ2luaXRpYWwnKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gbGVmdDtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMV0ucG9zaXRpb24gPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1syXS5wb3NpdGlvbiA9IHJpZ2h0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IHJpZ2h0IC0gMTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSByaWdodDtcclxuICAgICAgICB5aWVsZCBgV2lsbCBzb3J0ICR7c3RhdGV9IHBhcnRpdGlvbiAoJHtsZWZ0fS0ke3JpZ2h0fSlgO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChyaWdodCAtIGxlZnQgPCAxKSB7XHJcbiAgICAgICAgeWllbGQgYEVudGVyaW5nIHF1aWNrU29ydDsgUGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KSBpcyB0b28gc21hbGwgdG8gc29ydGA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5waXZvdHMucHVzaCh7XHJcbiAgICAgICAgICBzdGFydDogbGVmdCxcclxuICAgICAgICAgIGVuZDogcmlnaHQsXHJcbiAgICAgICAgICB2YWx1ZTogdGhpcy5pdGVtc1tyaWdodF0udmFsdWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB5aWVsZCBgRW50ZXJpbmcgcXVpY2tTb3J0OyBXaWxsIHBhcnRpdGlvbiAoJHtsZWZ0fS0ke3JpZ2h0fSlgO1xyXG4gICAgICAgIGxldCBwaXZvdCA9IHlpZWxkKiB0aGlzLnBhcnRpdGlvbihsZWZ0LCByaWdodCAtIDEsIHJpZ2h0KTtcclxuICAgICAgICBjYWxsU3RhY2sucHVzaCh7c3RhdGU6ICdyaWdodCcsIGxlZnQ6IHBpdm90ICsgMSwgcmlnaHQ6IHJpZ2h0fSk7XHJcbiAgICAgICAgY2FsbFN0YWNrLnB1c2goe3N0YXRlOiAnbGVmdCcsIGxlZnQ6IGxlZnQsIHJpZ2h0OiBwaXZvdCAtIDF9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWZ0ZXJTb3J0KCk7XHJcbiAgICByZXR1cm4gJ1NvcnQgY29tcGxldGVkJztcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1xdWljay1zb3J0LTEnLCBQYWdlUXVpY2tTb3J0MSk7IiwiaW1wb3J0IHtQYWdlUXVpY2tTb3J0MX0gZnJvbSAnLi9wYWdlUXVpY2tTb3J0MSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZVF1aWNrU29ydDIgZXh0ZW5kcyBQYWdlUXVpY2tTb3J0MSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy50aXRsZSA9ICdRdWljayBTb3J0IDInO1xyXG4gIH1cclxuXHJcbiAgLypcclxuICAqIGFsZ29yaXRobTpcclxuXHJcbiAgICBjb25zdCBxdWlja1NvcnQgPSAobGVmdCwgcmlnaHQpID0+IHtcclxuICAgIGludCBzaXplID0gcmlnaHQtbGVmdCsxO1xyXG4gICAgaWYoc2l6ZSA8PSAzKSAvLyDQoNGD0YfQvdCw0Y8g0YHQvtGA0YLQuNGA0L7QstC60LAg0L/RgNC4INC80LDQu9C+0Lwg0YDQsNC30LzQtdGA0LVcclxuICAgIG1hbnVhbFNvcnQobGVmdCwgcmlnaHQpO1xyXG4gICAgZWxzZSAvLyDQkdGL0YHRgtGA0LDRjyDRgdC+0YDRgtC40YDQvtCy0LrQsCDQv9GA0Lgg0LHQvtC70YzRiNC+0Lwg0YDQsNC30LzQtdGA0LVcclxuICAgIHtcclxuICAgIGxvbmcgbWVkaWFuID0gbWVkaWFuT2YzKGxlZnQsIHJpZ2h0KTtcclxuICAgIGludCBwYXJ0aXRpb24gPSBwYXJ0aXRpb25JdChsZWZ0LCByaWdodCwgbWVkaWFuKTtcclxuICAgIHJlY1F1aWNrU29ydChsZWZ0LCBwYXJ0aXRpb24tMSk7XHJcbiAgICByZWNRdWlja1NvcnQocGFydGl0aW9uKzEsIHJpZ2h0KTtcclxuICAgIH1cclxuICAgIH1cclxuICAgIH07XHJcbiAgICBxdWlja1NvcnQoMCwgdGhpcy5pdGVtcy5sZW5ndGggLSAxKTtcclxuXHJcbiAgKiAqL1xyXG5cclxuICAqIHBhcnRpdGlvbihsZWZ0LCByaWdodCwgcGl2b3QpIHtcclxuICAgIGxldCBsZWZ0UHRyID0gbGVmdDtcclxuICAgIGxldCByaWdodFB0ciA9IHJpZ2h0IC0gMTtcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGxlZnRQdHI7XHJcbiAgICAgIHRoaXMubWFya2Vyc1szXS5wb3NpdGlvbiA9IHJpZ2h0UHRyO1xyXG4gICAgICBpZiAobGVmdFB0ciA+IGxlZnQpIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBzY2FuIGFnYWluJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgV2lsbCBzY2FuICgke2xlZnRQdHIgKyAxfS0ke3JpZ2h0UHRyIC0gMX0pYDtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIHdoaWxlICh0aGlzLml0ZW1zWysrbGVmdFB0cl0udmFsdWUgPCB0aGlzLml0ZW1zW3Bpdm90XS52YWx1ZSkge1xyXG4gICAgICAgIGlmIChsZWZ0UHRyIDwgcmlnaHQpIHRoaXMuY29tcGFyaXNvbnMrKztcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIHdoaWxlICh0aGlzLml0ZW1zWy0tcmlnaHRQdHJdLnZhbHVlID4gdGhpcy5pdGVtc1twaXZvdF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLmNvbXBhcmlzb25zKys7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tYXJrZXJzWzFdLnBvc2l0aW9uID0gbGVmdFB0cjtcclxuICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHRQdHI7XHJcbiAgICAgIGlmIChsZWZ0UHRyID49IHJpZ2h0UHRyKSB7XHJcbiAgICAgICAgeWllbGQgJ1NjYW5zIGhhdmUgbWV0LiBXaWxsIHN3YXAgcGl2b3QgYW5kIGxlZnRTY2FuJztcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRzKCsrdGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0UHRyXS5zd2FwV2l0aCh0aGlzLml0ZW1zW3Bpdm90XSk7XHJcbiAgICAgICAgeWllbGQgYEFycmF5IHBhcnRpdGlvbmVkOiBsZWZ0ICgke2xlZnR9LSR7bGVmdFB0ciAtIDF9KSwgcmlnaHQgKCR7bGVmdFB0ciArIDF9LSR7cmlnaHR9KSBgO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHN3YXAgbGVmdFNjYW4gYW5kIHJpZ2h0U2Nhbic7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cygrK3RoaXMuc3dhcHMsIHRoaXMuY29tcGFyaXNvbnMpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbbGVmdFB0cl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodFB0cl0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVmdFB0cjtcclxuICB9XHJcblxyXG4gIGxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgY2VudGVyLCByaWdodCkge1xyXG4gICAgaWYodGhpcy5pdGVtc1tsZWZ0XS52YWx1ZSA+IHRoaXMuaXRlbXNbY2VudGVyXS52YWx1ZSkge1xyXG4gICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgIHRoaXMuaXRlbXNbbGVmdF0uc3dhcFdpdGgodGhpcy5pdGVtc1tjZW50ZXJdKTtcclxuICAgIH1cclxuICAgIGlmKHRoaXMuaXRlbXNbbGVmdF0udmFsdWUgPiB0aGlzLml0ZW1zW3JpZ2h0XS52YWx1ZSkge1xyXG4gICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgIHRoaXMuaXRlbXNbbGVmdF0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodF0pO1xyXG4gICAgfVxyXG4gICAgaWYodGhpcy5pdGVtc1tjZW50ZXJdLnZhbHVlID4gdGhpcy5pdGVtc1tyaWdodF0udmFsdWUpIHtcclxuICAgICAgdGhpcy5zd2FwcysrO1xyXG4gICAgICB0aGlzLml0ZW1zW2NlbnRlcl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodF0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbWFudWFsU29ydChsZWZ0LCByaWdodCkge1xyXG4gICAgY29uc3Qgc2l6ZSA9IHJpZ2h0IC0gbGVmdCArIDE7XHJcbiAgICBpZiAoc2l6ZSA9PT0gMikge1xyXG4gICAgICBpZih0aGlzLml0ZW1zW2xlZnRdLnZhbHVlID4gdGhpcy5pdGVtc1tyaWdodF0udmFsdWUpIHtcclxuICAgICAgICB0aGlzLnN3YXBzKys7XHJcbiAgICAgICAgdGhpcy5pdGVtc1tsZWZ0XS5zd2FwV2l0aCh0aGlzLml0ZW1zW3JpZ2h0XSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoc2l6ZSA9PT0gMykge1xyXG4gICAgICB0aGlzLmxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgcmlnaHQgLTEsIHJpZ2h0KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JTdGVwKCkge1xyXG4gICAgdGhpcy5iZWZvcmVTb3J0KCk7XHJcbiAgICB0aGlzLnN3YXBzID0gMDtcclxuICAgIHRoaXMuY29tcGFyaXNvbnMgPSAwO1xyXG5cclxuICAgIGNvbnN0IGNhbGxTdGFjayA9IFt7c3RhdGU6ICdpbml0aWFsJywgbGVmdDogMCwgcmlnaHQ6IHRoaXMuaXRlbXMubGVuZ3RoIC0gMX1dO1xyXG4gICAgd2hpbGUgKGNhbGxTdGFjay5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGxldCB7c3RhdGUsIGxlZnQsIHJpZ2h0fSA9IGNhbGxTdGFjay5wb3AoKTtcclxuICAgICAgaWYgKHN0YXRlICE9PSAnaW5pdGlhbCcpIHtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1sxXS5wb3NpdGlvbiA9IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzJdLnBvc2l0aW9uID0gcmlnaHQ7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzNdLnBvc2l0aW9uID0gcmlnaHQgLSAxO1xyXG4gICAgICAgIHRoaXMubWFya2Vyc1s0XS5wb3NpdGlvbiA9IHJpZ2h0O1xyXG4gICAgICAgIHlpZWxkIGBXaWxsIHNvcnQgJHtzdGF0ZX0gcGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KWA7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3Qgc2l6ZSA9IHJpZ2h0IC0gbGVmdCArIDE7XHJcbiAgICAgIGlmIChzaXplIDw9IDMpIHtcclxuICAgICAgICBpZiAoc2l6ZSA9PT0gMSkgeWllbGQgYHF1aWNrU29ydCBlbnRyeTsgQXJyYXkgb2YgMSAoJHtsZWZ0fS0ke3JpZ2h0fSkgYWx3YXlzIHNvcnRlZGA7XHJcbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMikgeWllbGQgYHF1aWNrU29ydCBlbnRyeTsgV2lsbCBzb3J0IDItZWxlbWVudHMgYXJyYXkgKCR7bGVmdH0tJHtyaWdodH0pYDtcclxuICAgICAgICBlbHNlIGlmIChzaXplID09PSAzKSB5aWVsZCBgcXVpY2tTb3J0IGVudHJ5OyBXaWxsIHNvcnQgbGVmdCwgY2VudGVyLCByaWdodCAoJHtsZWZ0fS0ke3JpZ2h0IC0gMX0tJHtyaWdodH0pYDtcclxuICAgICAgICB0aGlzLm1hbnVhbFNvcnQobGVmdCwgcmlnaHQpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHModGhpcy5zd2FwcywgdGhpcy5jb21wYXJpc29ucyk7XHJcbiAgICAgICAgaWYgKHNpemUgPT09IDEpIHlpZWxkICdObyBhY3Rpb25zIG5lY2Vzc2FyeSc7XHJcbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMikgeWllbGQgJ0RvbmUgMi1lbGVtZW50IHNvcnQnO1xyXG4gICAgICAgIGVsc2UgaWYgKHNpemUgPT09IDMpIHlpZWxkICdEb25lIGxlZnQtY2VudGVyLXJpZ2h0IHNvcnQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IG1lZGlhbiA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcclxuICAgICAgICB5aWVsZCBgcXVpY2tTb3J0IGVudHJ5OyBXaWxsIHNvcnQgbGVmdCwgY2VudGVyLCByaWdodCAoJHtsZWZ0fS0ke21lZGlhbn0tJHtyaWdodH0pYDtcclxuICAgICAgICB0aGlzLmxlZnRDZW50ZXJSaWdodFNvcnQobGVmdCwgbWVkaWFuLCByaWdodCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0cyh0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSBtZWRpYW47XHJcbiAgICAgICAgeWllbGQgYFdpbGwgcGFydGl0aW9uICgke2xlZnR9LSR7cmlnaHR9KTsgcGl2b3Qgd2lsbCBiZSAke21lZGlhbn1gO1xyXG4gICAgICAgIHRoaXMucGl2b3RzLnB1c2goe1xyXG4gICAgICAgICAgc3RhcnQ6IGxlZnQsXHJcbiAgICAgICAgICBlbmQ6IHJpZ2h0LFxyXG4gICAgICAgICAgdmFsdWU6IHRoaXMuaXRlbXNbbWVkaWFuXS52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHlpZWxkICdXaWxsIHN3YXAgcGl2b3QgYW5kIHJpZ2h0LTEnO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHMoKyt0aGlzLnN3YXBzLCB0aGlzLmNvbXBhcmlzb25zKTtcclxuICAgICAgICB0aGlzLml0ZW1zW21lZGlhbl0uc3dhcFdpdGgodGhpcy5pdGVtc1tyaWdodCAtIDFdKTtcclxuICAgICAgICB0aGlzLm1hcmtlcnNbNF0ucG9zaXRpb24gPSByaWdodCAtIDE7XHJcbiAgICAgICAgbGV0IHBhcnRpdGlvbiA9IHlpZWxkKiB0aGlzLnBhcnRpdGlvbihsZWZ0LCByaWdodCwgcmlnaHQgLSAxKTtcclxuICAgICAgICBjYWxsU3RhY2sucHVzaCh7c3RhdGU6ICdyaWdodCcsIGxlZnQ6IHBhcnRpdGlvbiArIDEsIHJpZ2h0OiByaWdodH0pO1xyXG4gICAgICAgIGNhbGxTdGFjay5wdXNoKHtzdGF0ZTogJ2xlZnQnLCBsZWZ0OiBsZWZ0LCByaWdodDogcGFydGl0aW9uIC0gMX0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5hZnRlclNvcnQoKTtcclxuICAgIHJldHVybiAnU29ydCBjb21wbGV0ZWQnO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXF1aWNrLXNvcnQtMicsIFBhZ2VRdWlja1NvcnQyKTsiLCJpbXBvcnQge0xpdEVsZW1lbnQsIHN2ZywgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zVHJlZSBleHRlbmRzIExpdEVsZW1lbnQge1xyXG4gIHN0YXRpYyBnZXQgcHJvcGVydGllcygpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiB7dHlwZTogQXJyYXl9LFxyXG4gICAgICBtYXJrZXI6IHt0eXBlOiBPYmplY3R9LFxyXG4gICAgICBjbGlja0ZuOiB7dHlwZTogRnVuY3Rpb259XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q29vcmRzKGkpIHtcclxuICAgIGNvbnN0IGxldmVsID0gTWF0aC5mbG9vcihNYXRoLmxvZzIoaSArIDEpKTtcclxuICAgIGNvbnN0IHBhcnQgPSA2MDAgLyAoMiAqKiAobGV2ZWwgKyAxKSk7XHJcbiAgICBjb25zdCB5ID0gKGxldmVsICsgMSkgKiA2MDtcclxuICAgIGNvbnN0IHggPSAyICogcGFydCAqIChpICsgMSAtIDIgKiogbGV2ZWwpICsgcGFydDtcclxuICAgIHJldHVybiB7eCwgeX07XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICBjb25zdCBpdGVtcyA9IHRoaXMuaXRlbXMubWFwKChpdGVtLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvb3JkcyA9IHRoaXMuZ2V0Q29vcmRzKGkpO1xyXG4gICAgICBjb25zdCBpTCA9IDIgKiBpICsgMTtcclxuICAgICAgY29uc3QgaVIgPSBpTCArIDE7XHJcbiAgICAgIGNvbnN0IGNvb3Jkc0wgPSB0aGlzLmdldENvb3JkcyhpTCk7XHJcbiAgICAgIGNvbnN0IGNvb3Jkc1IgPSB0aGlzLmdldENvb3JkcyhpUik7XHJcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlICE9IG51bGwgPyBzdmdgXHJcbiAgICAgICAgPGcgZmlsbD1cIiR7aXRlbS5jb2xvcn1cIj5cclxuICAgICAgICAgICR7dGhpcy5pdGVtc1tpTF0gJiYgdGhpcy5pdGVtc1tpTF0udmFsdWUgIT0gbnVsbCA/IHN2Z2BcclxuICAgICAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lXCIgeDE9XCIke2Nvb3Jkcy54fVwiIHkxPVwiJHtjb29yZHMueX1cIiB4Mj1cIiR7Y29vcmRzTC54fVwiIHkyPVwiJHtjb29yZHNMLnl9XCI+XHJcbiAgICAgICAgICBgIDogJyd9XHJcbiAgICAgICAgICAke3RoaXMuaXRlbXNbaVJdICYmIHRoaXMuaXRlbXNbaVJdLnZhbHVlICE9IG51bGwgPyBzdmdgXHJcbiAgICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIHgxPVwiJHtjb29yZHMueH1cIiB5MT1cIiR7Y29vcmRzLnl9XCIgeDI9XCIke2Nvb3Jkc1IueH1cIiB5Mj1cIiR7Y29vcmRzUi55fVwiPlxyXG4gICAgICAgICAgYCA6ICcnfVxyXG4gICAgICAgICAgPGcgQGNsaWNrPSR7dGhpcy5jbGlja0hhbmRsZXIuYmluZCh0aGlzLCBpdGVtKX0gY2xhc3M9XCIke3RoaXMuY2xpY2tGbiAhPSBudWxsID8gJ2NsaWNrYWJsZScgOiAnJ31cIj5cclxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cIml0ZW0gJHtpdGVtLm1hcmsgPyAnbWFya2VkJyA6ICcnfVwiIGN4PVwiJHtjb29yZHMueH1cIiBjeT1cIiR7Y29vcmRzLnl9XCIgcj1cIjEyXCI+PC9jaXJjbGU+XHJcbiAgICAgICAgICAgIDx0ZXh0IGNsYXNzPVwidmFsdWVcIiB4PVwiJHtjb29yZHMueH1cIiB5PVwiJHtjb29yZHMueSArIDJ9XCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBhbGlnbm1lbnQtYmFzZWxpbmU9XCJtaWRkbGVcIj4ke2l0ZW0udmFsdWV9PC90ZXh0PlxyXG4gICAgICAgICAgPC9nPlxyXG4gICAgICAgIDwvZz5cclxuICAgICAgICAke3RoaXMucmVuZGVyTWFya2VyKGksIGNvb3Jkcyl9XHJcbiAgICAgIGAgOiAnJztcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHN2Z2BcclxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDYwMCA0MDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XHJcbiAgICAgICAgJHtpdGVtc31cclxuICAgICAgPC9zdmc+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgY2xpY2tIYW5kbGVyKGl0ZW0pIHtcclxuICAgIGlmICh0aGlzLmNsaWNrRm4gIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLm1hcmtlciA9IG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiBpdGVtLmluZGV4fSk7XHJcbiAgICAgIHJldHVybiB0aGlzLmNsaWNrRm4oaXRlbSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZW5kZXJNYXJrZXIoaSAsY29vcmRzKSB7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICBpZiAodGhpcy5tYXJrZXIgJiYgdGhpcy5tYXJrZXIucG9zaXRpb24gPT09IGkpIHtcclxuICAgICAgcmVzdWx0ID0gc3ZnYFxyXG4gICAgICAgIDxnIGNsYXNzPVwibWFya2VyXCI+XHJcbiAgICAgICAgICA8bGluZSB4MT1cIiR7Y29vcmRzLnh9XCIgeTE9XCIke2Nvb3Jkcy55IC0gMTN9XCIgeDI9XCIke2Nvb3Jkcy54fVwiIHkyPVwiJHtjb29yZHMueSAtIDM1fVwiPjwvbGluZT4gICAgICAgIFxyXG4gICAgICAgICAgPGxpbmUgeDE9XCIke2Nvb3Jkcy54fVwiIHkxPVwiJHtjb29yZHMueSAtIDEzfVwiIHgyPVwiJHtjb29yZHMueCAtIDR9XCIgeTI9XCIke2Nvb3Jkcy55IC0gMjB9XCI+PC9saW5lPiAgICAgICBcclxuICAgICAgICAgIDxsaW5lIHgxPVwiJHtjb29yZHMueH1cIiB5MT1cIiR7Y29vcmRzLnkgLSAxM31cIiB4Mj1cIiR7Y29vcmRzLnggKyA0fVwiIHkyPVwiJHtjb29yZHMueSAtIDIwfVwiPjwvbGluZT4gICAgICAgIFxyXG4gICAgICAgIDwvZz5cclxuICAgICAgYDtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG5YSXRlbXNUcmVlLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIGhlaWdodDogNDAwcHg7XHJcbiAgICB3aWR0aDogNjAwcHg7ICAgIFxyXG4gIH1cclxuICBzdmcge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgfVxyXG4gIC5pdGVtIHtcclxuICAgIHN0cm9rZTogYmxhY2s7XHJcbiAgfVxyXG4gIC5pdGVtLm1hcmtlZCB7XHJcbiAgICBzdHJva2U6IHJlZDtcclxuICB9XHJcbiAgLmNsaWNrYWJsZSB7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBzdHJva2Utd2lkdGg6IDJweDtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIGZvbnQ6IG5vcm1hbCAxM3B4IHNhbnMtc2VyaWY7XHJcbiAgICBmaWxsOiBibGFjaztcclxuICAgIHN0cm9rZTogbm9uZTtcclxuICB9XHJcbiAgLmxpbmUge1xyXG4gICAgc3Ryb2tlOiBibGFjaztcclxuICB9XHJcbiAgLm1hcmtlciBsaW5lIHtcclxuICAgIHN0cm9rZTogcmVkO1xyXG4gICAgc3Ryb2tlLXdpZHRoOiAycHg7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLXRyZWUnLCBYSXRlbXNUcmVlKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtJdGVtfSBmcm9tICcuLi9jbGFzc2VzL2l0ZW0nO1xyXG5pbXBvcnQge01hcmtlcn0gZnJvbSAnLi4vY2xhc3Nlcy9tYXJrZXInO1xyXG5pbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2RpYWxvZyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pbmZvJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2l0ZW1zVHJlZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUJpbmFyeVRyZWUgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoMjkpO1xyXG4gICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPkJpbmFyeSBUcmVlPC9oMT5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbGwpfT5GaWxsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGaW5kKX0+RmluZDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9ySW5zKX0+SW5zPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JUcmF2KX0+VHJhdjwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRGVsKX0+RGVsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+RmlsbDwvYj4gY3JlYXRlcyBhIG5ldyB0cmVlIHdpdGggTiBub2RlczwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5GaW5kPC9iPiBzZWFyY2hlcyBmb3IgYSBub2RlIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgICAgIDxwPjxiPkluczwvYj4gaW5zZXJ0cyBhIG5ldyBub2RlIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgICAgIDxwPjxiPlRyYXY8L2I+IHRyYXZlcnNlcyB0aGUgdHJlZSBpbiBhc2NlbmRpbmcgb3JkZXI8L3A+IFxyXG4gICAgICAgICAgPHA+PGI+RGVsPC9iPiBkZWxldGVzIHRoZSBub2RlIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgICA8L3gtaW5mbz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJtYWluLWNvbnNvbGVcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cImNvbnNvbGUtc3RhdHNcIiBkZWZhdWx0TWVzc2FnZT1cIuKAlFwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy10cmVlIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXI9JHt0aGlzLm1hcmtlcn0+PC94LWl0ZW1zLXRyZWU+XHJcbiAgICAgIDx4LWRpYWxvZz5cclxuICAgICAgICA8bGFiZWw+TnVtYmVyOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIj48L2xhYmVsPlxyXG4gICAgICA8L3gtZGlhbG9nPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIGZpcnN0VXBkYXRlZCgpIHtcclxuICAgIHRoaXMuY29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcignLm1haW4tY29uc29sZScpO1xyXG4gICAgdGhpcy50cmF2Q29uc29sZSA9IHRoaXMucXVlcnlTZWxlY3RvcignLmNvbnNvbGUtc3RhdHMnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gIH1cclxuXHJcbiAgaW5pdEl0ZW1zKGxlbmd0aCkge1xyXG4gICAgY29uc3QgYXJyID0gKG5ldyBBcnJheSgzMSkpLmZpbGwoKS5tYXAoKF8sIGkpID0+IG5ldyBJdGVtKHtpbmRleDogaX0pKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGxlbmd0aCAtIDE7IGkrKykge1xyXG4gICAgICBsZXQgaSA9IDA7XHJcbiAgICAgIGNvbnN0IHZhbHVlID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICAgICAgd2hpbGUoYXJyW2ldICYmIGFycltpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgaSA9IDIgKiBpICsgKGFycltpXS52YWx1ZSA+IHZhbHVlID8gMSA6IDIpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKGFycltpXSkgYXJyW2ldLnNldFZhbHVlKHZhbHVlKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXRlbXMgPSBhcnI7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VyKCkge1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2Ygbm9kZXMgKDEgdG8gMzEpJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiAzMSB8fCBsZW5ndGggPCAxKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMSBhbmQgMzEnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIHRyZWUgd2l0aCAke2xlbmd0aH0gbm9kZXNgO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoKTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaW5kKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIG5vZGUgdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCB0cnkgdG8gZmluZCBub2RlIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBsZXQgaXNGb3VuZCA9IGZhbHNlO1xyXG4gICAgd2hpbGUodGhpcy5pdGVtc1tpXSAmJiB0aGlzLml0ZW1zW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICBpZiAodGhpcy5pdGVtc1tpXS52YWx1ZSA9PT0ga2V5KSB7XHJcbiAgICAgICAgaXNGb3VuZCA9IHRydWU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgaXNMZWZ0ID0gdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleTtcclxuICAgICAgaSA9IDIgKiBpICsgKGlzTGVmdCA/IDEgOiAyKTtcclxuICAgICAgeWllbGQgYEdvaW5nIHRvICR7aXNMZWZ0ID8gJ2xlZnQnIDogJ3JpZ2h0J30gY2hpbGRgO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYCR7aXNGb3VuZCA/ICdIYXZlIGZvdW5kJyA6ICdDYW5cXCd0IGZpbmQnfSBub2RlICR7a2V5fWA7XHJcbiAgICB5aWVsZCAnU2VhcmNoIGlzIGNvbXBsZXRlJztcclxuICAgIHRoaXMuaW5pdE1hcmtlcigpO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvcklucygpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBub2RlIHRvIGluc2VydCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gOTkgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgaW5zZXJ0IG5vZGUgd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIGxldCBpID0gMDtcclxuICAgIHdoaWxlKHRoaXMuaXRlbXNbaV0gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gaTtcclxuICAgICAgY29uc3QgaXNMZWZ0ID0gdGhpcy5pdGVtc1tpXS52YWx1ZSA+IGtleTtcclxuICAgICAgaSA9IDIgKiBpICsgKGlzTGVmdCA/IDEgOiAyKTtcclxuICAgICAgeWllbGQgYEdvaW5nIHRvICR7aXNMZWZ0ID8gJ2xlZnQnIDogJ3JpZ2h0J30gY2hpbGRgO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuaXRlbXNbaV0pIHtcclxuICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICB0aGlzLml0ZW1zW2ldLnNldFZhbHVlKGtleSk7XHJcbiAgICAgIHlpZWxkIGBIYXZlIGluc2VydGVkIG5vZGUgd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgICAgeWllbGQgJ0luc2VydGlvbiBjb21wbGV0ZWQnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgeWllbGQgJ0NhblxcJ3QgaW5zZXJ0OiBMZXZlbCBpcyB0b28gZ3JlYXQnO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yVHJhdigpIHtcclxuICAgIHlpZWxkICdXaWxsIHRyYXZlcnNlIHRyZWUgaW4gXCJpbm9yZGVyXCInO1xyXG4gICAgdGhpcy50cmF2Q29uc29sZS5zZXRNZXNzYWdlKCcnKTtcclxuICAgIGNvbnN0IG9wZXJhdGlvbnMgPSBbXTtcclxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKGksIGl0ZW1zKSB7XHJcbiAgICAgIGlmICghaXRlbXNbaV0gfHwgaXRlbXNbaV0udmFsdWUgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICBjb25zdCBsZWZ0ID0gMiAqIGkgKyAxO1xyXG4gICAgICBjb25zdCByaWdodCA9IDIgKiBpICsgMjtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnbGVmdCcsIGluZGV4OiBsZWZ0fSk7XHJcbiAgICAgIHRyYXZlcnNlKGxlZnQsIGl0ZW1zKTtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnc2VsZicsIGluZGV4OiBpLCB2YWx1ZTogaXRlbXNbaV0udmFsdWV9KTtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAncmlnaHQnLCBpbmRleDogcmlnaHR9KTtcclxuICAgICAgdHJhdmVyc2UocmlnaHQsIGl0ZW1zKTtcclxuICAgICAgb3BlcmF0aW9ucy5wdXNoKHt0eXBlOiAnZXhpdCcsIGluZGV4OiBpfSk7XHJcbiAgICB9XHJcbiAgICB0cmF2ZXJzZSgwLCB0aGlzLml0ZW1zKTtcclxuICAgIHdoaWxlIChvcGVyYXRpb25zLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc3Qgb3BlcmF0aW9uID0gb3BlcmF0aW9ucy5zaGlmdCgpO1xyXG4gICAgICBpZiAodGhpcy5pdGVtc1tvcGVyYXRpb24uaW5kZXhdICYmIHRoaXMuaXRlbXNbb3BlcmF0aW9uLmluZGV4XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBvcGVyYXRpb24uaW5kZXg7XHJcbiAgICAgIH1cclxuICAgICAgc3dpdGNoIChvcGVyYXRpb24udHlwZSkge1xyXG4gICAgICAgIGNhc2UgJ3NlbGYnOiB7XHJcbiAgICAgICAgICB5aWVsZCAnV2lsbCB2aXNpdCB0aGlzIG5vZGUnO1xyXG4gICAgICAgICAgdGhpcy50cmF2Q29uc29sZS5zZXRNZXNzYWdlKHRoaXMudHJhdkNvbnNvbGUubWVzc2FnZSArICcgJyArIG9wZXJhdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnbGVmdCc6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIGNoZWNrIGZvciBsZWZ0IGNoaWxkJztcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlICdyaWdodCc6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIGNoZWNrIGZvciByaWdodCBjaGlsZCc7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSAnZXhpdCc6IHtcclxuICAgICAgICAgIHlpZWxkICdXaWxsIGdvIHRvIHJvb3Qgb2YgbGFzdCBzdWJ0cmVlJztcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgeWllbGQgJ0ZpbmlzaCB0cmF2ZXJzZSc7XHJcbiAgICB0aGlzLnRyYXZDb25zb2xlLnNldE1lc3NhZ2UoJycpO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBub2RlIHRvIGRlbGV0ZSc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCB0cnkgdG8gZmluZCBub2RlIHdpdGgga2V5ICR7a2V5fWA7XHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBsZXQgaXNGb3VuZCA9IGZhbHNlO1xyXG4gICAgd2hpbGUgKHRoaXMuaXRlbXNbaV0gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gaTtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IGtleSkge1xyXG4gICAgICAgIGlzRm91bmQgPSB0cnVlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGlzTGVmdCA9IHRoaXMuaXRlbXNbaV0udmFsdWUgPiBrZXk7XHJcbiAgICAgIGkgPSAyICogaSArIChpc0xlZnQgPyAxIDogMik7XHJcbiAgICAgIHlpZWxkIGBHb2luZyB0byAke2lzTGVmdCA/ICdsZWZ0JyA6ICdyaWdodCd9IGNoaWxkYDtcclxuICAgIH1cclxuICAgIGlmIChpc0ZvdW5kKSB7XHJcbiAgICAgIHlpZWxkICdIYXZlIGZvdW5kIG5vZGUgdG8gZGVsZXRlJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAnQ2FuXFwndCBmaW5kIG5vZGUgdG8gZGVsZXRlJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5pdGVtc1tpXTtcclxuICAgIGNvbnN0IGxlZnRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAxXTtcclxuICAgIGNvbnN0IHJpZ2h0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiBpICsgMl07XHJcbiAgICAvL2lmIG5vZGUgaGFzIG5vIGNoaWxkcmVuXHJcbiAgICBpZiAoKCFsZWZ0Q2hpbGQgfHwgbGVmdENoaWxkLnZhbHVlID09IG51bGwpICYmICghcmlnaHRDaGlsZCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpKSB7XHJcbiAgICAgIGN1cnJlbnQuY2xlYXIoKTtcclxuICAgICAgeWllbGQgJ05vZGUgd2FzIGRlbGV0ZWQnO1xyXG4gICAgfSBlbHNlIGlmICghcmlnaHRDaGlsZCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpIHsgLy9pZiBub2RlIGhhcyBubyByaWdodCBjaGlsZFxyXG4gICAgICB5aWVsZCAnV2lsbCByZXBsYWNlIG5vZGUgd2l0aCBpdHMgbGVmdCBzdWJ0cmVlJztcclxuICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUobGVmdENoaWxkLmluZGV4LCBjdXJyZW50LmluZGV4LCB0aGlzLml0ZW1zKTtcclxuICAgICAgeWllbGQgJ05vZGUgd2FzIHJlcGxhY2VkIGJ5IGl0cyBsZWZ0IHN1YnRyZWUnO1xyXG4gICAgfSBlbHNlIGlmICghbGVmdENoaWxkIHx8IGxlZnRDaGlsZC52YWx1ZSA9PSBudWxsKSB7IC8vaWYgbm9kZSBoYXMgbm8gbGVmdCBjaGlsZFxyXG4gICAgICB5aWVsZCAnV2lsbCByZXBsYWNlIG5vZGUgd2l0aCBpdHMgcmlnaHQgc3VidHJlZSc7XHJcbiAgICAgIFBhZ2VCaW5hcnlUcmVlLm1vdmVTdWJ0cmVlKHJpZ2h0Q2hpbGQuaW5kZXgsIGN1cnJlbnQuaW5kZXgsIHRoaXMuaXRlbXMpO1xyXG4gICAgICB5aWVsZCAnTm9kZSB3YXMgcmVwbGFjZWQgYnkgaXRzIHJpZ2h0IHN1YnRyZWUnO1xyXG4gICAgfSBlbHNlIHsgLy9ub2RlIGhhcyB0d28gY2hpbGRyZW4sIGZpbmQgc3VjY2Vzc29yXHJcbiAgICAgIGNvbnN0IHN1Y2Nlc3NvciA9IFBhZ2VCaW5hcnlUcmVlLmdldFN1Y2Nlc3NvcihjdXJyZW50LmluZGV4LCB0aGlzLml0ZW1zKTtcclxuICAgICAgeWllbGQgYFdpbGwgcmVwbGFjZSBub2RlIHdpdGggJHt0aGlzLml0ZW1zW3N1Y2Nlc3Nvcl0udmFsdWV9YDtcclxuICAgICAgY29uc3QgaGFzUmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIHN1Y2Nlc3NvciArIDJdICYmIHRoaXMuaXRlbXNbMiAqIHN1Y2Nlc3NvciArIDJdLnZhbHVlICE9IG51bGw7XHJcbiAgICAgIGlmIChoYXNSaWdodENoaWxkKSB7XHJcbiAgICAgICAgeWllbGQgYGFuZCByZXBsYWNlICR7dGhpcy5pdGVtc1tzdWNjZXNzb3JdLnZhbHVlfSB3aXRoIGl0cyByaWdodCBzdWJ0cmVlYDtcclxuICAgICAgfVxyXG4gICAgICBjdXJyZW50Lm1vdmVGcm9tKHRoaXMuaXRlbXNbc3VjY2Vzc29yXSk7XHJcbiAgICAgIGlmIChoYXNSaWdodENoaWxkKSB7XHJcbiAgICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUoMiAqIHN1Y2Nlc3NvciArIDIsIHN1Y2Nlc3NvciwgdGhpcy5pdGVtcyk7XHJcbiAgICAgICAgeWllbGQgJ1JlbW92ZWQgbm9kZSBpbiAyLXN0ZXAgcHJvY2Vzcyc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgeWllbGQgJ05vZGUgd2FzIHJlcGxhY2VkIGJ5IHN1Y2Nlc3Nvcic7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuaW5pdE1hcmtlcigpO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldFN1Y2Nlc3NvcihpbmRleCwgaXRlbXMpIHtcclxuICAgIGxldCBzdWNjZXNzb3IgPSBpbmRleDtcclxuICAgIGxldCBjdXJyZW50ID0gMiAqIGluZGV4ICsgMjsgLy9yaWdodCBjaGlsZFxyXG4gICAgd2hpbGUoaXRlbXNbY3VycmVudF0gJiYgaXRlbXNbY3VycmVudF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBzdWNjZXNzb3IgPSBjdXJyZW50O1xyXG4gICAgICBjdXJyZW50ID0gMiAqIGN1cnJlbnQgKyAxOyAvL2xlZnQgY2hpbGRcclxuICAgIH1cclxuICAgIHJldHVybiBzdWNjZXNzb3I7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgbW92ZVN1YnRyZWUoZnJvbSwgdG8sIGl0ZW1zKSB7XHJcbiAgICBjb25zdCB0ZW1wSXRlbXMgPSBbXTtcclxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZU1vdmVUb1RlbXAoZnJvbSwgdG8pIHtcclxuICAgICAgaWYgKCFpdGVtc1tmcm9tXSB8fCBpdGVtc1tmcm9tXS52YWx1ZSA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgIHRlbXBJdGVtc1t0b10gPSBuZXcgSXRlbShpdGVtc1tmcm9tXSk7XHJcbiAgICAgIGl0ZW1zW2Zyb21dLmNsZWFyKCk7XHJcbiAgICAgIHJlY3Vyc2l2ZU1vdmVUb1RlbXAoMiAqIGZyb20gKyAxLCAyICogdG8gKyAxKTsgLy9sZWZ0XHJcbiAgICAgIHJlY3Vyc2l2ZU1vdmVUb1RlbXAoMiAqIGZyb20gKyAyLCAyICogdG8gKyAyKTsgLy9yaWdodFxyXG4gICAgfVxyXG4gICAgcmVjdXJzaXZlTW92ZVRvVGVtcChmcm9tLCB0byk7XHJcbiAgICB0ZW1wSXRlbXMuZm9yRWFjaCgoaXRlbSwgaW5kZXgpID0+IHsgLy9yZXN0b3JlIGZyb20gdGVtcFxyXG4gICAgICBpdGVtc1tpbmRleF0ubW92ZUZyb20oaXRlbSk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncGFnZS1iaW5hcnktdHJlZScsIFBhZ2VCaW5hcnlUcmVlKTsiLCJpbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0IHtQYWdlQmluYXJ5VHJlZX0gZnJvbSAnLi9wYWdlQmluYXJ5VHJlZSc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9idXR0b24nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvY29uc29sZSc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9kaWFsb2cnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaW5mbyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1RyZWUnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VSZWRCbGFja1RyZWUgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0KCk7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPlJlZC1CbGFjayBUcmVlPC9oMT5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xwYW5lbFwiPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmluaXQuYmluZCh0aGlzKX0+U3RhcnQ8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvcklucyl9PkluczwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRGVsKX0+RGVsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JGbGlwKX0+RmxpcDwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yUm9MKX0+Um9MPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JSb1IpfT5Sb1I8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLnN3aWNoUkIuYmluZCh0aGlzKX0+Ui9CPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+Q2xpY2sgb24gbm9kZTwvYj4gdG8gbW92ZSBhcnJvdyB0byBpdDwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5TdGFydDwvYj4gbWFrZXMgYSBuZXcgdHJlZSB3aXRoIG9uZSBub2RlPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkluczwvYj4gaW5zZXJ0cyBhIG5ldyBub2RlIHdpdGggdmFsdWUgTjwvcD4gXHJcbiAgICAgICAgICA8cD48Yj5EZWw8L2I+IGRlbGV0ZXMgdGhlIG5vZGUgd2l0aCB2YWx1ZSBOPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkZsaXA8L2I+IHN3YXBzIGNvbG9ycyBiZXR3ZWVuIGJsYWNrIHBhcmVudCAoYXJyb3cpIGFuZCB0d28gcmVkIGNoaWxkcmVuPC9wPiBcclxuICAgICAgICAgIDxwPjxiPlJvTDwvYj4gcm90YXRlcyBsZWZ0IGFyb3VuZCBub2RlIHdpdGggYXJyb3c8L3A+IFxyXG4gICAgICAgICAgPHA+PGI+Um9SPC9iPiByb3RhdGVzIHJpZ2h0IGFyb3VuZCBub2RlIHdpdGggYXJyb3c8L3A+IFxyXG4gICAgICAgICAgPHA+PGI+Ui9CPC9iPiB0b2dnbGVzIGNvbG9yIG9mIG5vZGUgd2l0aCBhcnJvdzwvcD4gXHJcbiAgICAgICAgPC94LWluZm8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwibWFpbi1jb25zb2xlXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJjb25zb2xlLXN0YXRzXCIgZGVmYXVsdE1lc3NhZ2U9XCLigJRcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtdHJlZSAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2VyPSR7dGhpcy5tYXJrZXJ9IC5jbGlja0ZuPSR7aXRlbSA9PiB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXh9PjwveC1pdGVtcy10cmVlPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuY29ycmVjdG5lc3NDb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuY29uc29sZS1zdGF0cycpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljaygpIHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLmhhbmRsZUNsaWNrKC4uLmFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLmNoZWNrUnVsZXMoKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBpbml0KCkge1xyXG4gICAgY29uc3QgYXJyID0gKG5ldyBBcnJheSgzMSkpLmZpbGwoKS5tYXAoKF8sIGkpID0+IG5ldyBJdGVtKHtpbmRleDogaX0pKTtcclxuICAgIGFyclswXS5zZXRWYWx1ZSg1MCk7XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gICAgaWYgKHRoaXMuY29uc29sZSkge1xyXG4gICAgICB0aGlzLmNoZWNrUnVsZXMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2Ygbm9kZSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDk5IHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogY2FuXFwndCBpbnNlcnQuIE5lZWQga2V5IGJldHdlZW4gMCBhbmQgOTk5JztcclxuICAgIH1cclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBpc0xlZnQgPSBmYWxzZTtcclxuICAgIHdoaWxlKHRoaXMuaXRlbXNbaV0gJiYgdGhpcy5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIGlzTGVmdCA9IHRoaXMuaXRlbXNbaV0udmFsdWUgPiBrZXk7XHJcbiAgICAgIGkgPSAyICogaSArIChpc0xlZnQgPyAxIDogMik7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tpXSkge1xyXG4gICAgICBjb25zdCBwYXJlbnRJID0gTWF0aC5mbG9vcigoaSAtIDEpIC8gMik7XHJcbiAgICAgIGNvbnN0IGdyYW5kUGFyZW50SSA9IE1hdGguZmxvb3IoKHBhcmVudEkgLSAxKSAvIDIpO1xyXG4gICAgICAvL2lmIHBhcmVudCBpcyByZWQsIGdyYW5kUGFyZW50IGlzIGJsYWNrIGFuZCBzZWNvbmQgY2hpbGQgb2YgZ3JhbmRQYXJlbnQgaXMgcmVkXHJcbiAgICAgIGlmICh0aGlzLml0ZW1zW3BhcmVudEldLm1hcmsgJiYgdGhpcy5pdGVtc1tncmFuZFBhcmVudEldICYmICF0aGlzLml0ZW1zW2dyYW5kUGFyZW50SV0ubWFyayAmJiB0aGlzLml0ZW1zWzIgKiBncmFuZFBhcmVudEkgKyAoaXNMZWZ0ID8gMiA6IDEpXS5tYXJrKSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBncmFuZFBhcmVudEk7XHJcbiAgICAgICAgcmV0dXJuICdDQU5cXCdUIElOU0VSVDogTmVlZHMgY29sb3IgZmxpcCc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpO1xyXG4gICAgICAgIHRoaXMuaXRlbXNbaV0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgICB0aGlzLml0ZW1zW2ldLm1hcmsgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gJ0NBTlxcJ1QgSU5TRVJUOiBMZXZlbCBpcyB0b28gZ3JlYXQnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBub2RlIHRvIGRlbGV0ZSc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gOTkgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgd2hpbGUodGhpcy5pdGVtc1tpXSAmJiB0aGlzLml0ZW1zW2ldLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IGtleSkgYnJlYWs7XHJcbiAgICAgIGkgPSAyICogaSArICh0aGlzLml0ZW1zW2ldLnZhbHVlID4ga2V5ID8gMSA6IDIpO1xyXG4gICAgfVxyXG4gICAgaWYgKCF0aGlzLml0ZW1zW2ldIHx8IHRoaXMuaXRlbXNbaV0udmFsdWUgPT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4gJ0NhblxcJ3QgZmluZCBub2RlIHRvIGRlbGV0ZSc7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY3VycmVudCA9IHRoaXMuaXRlbXNbaV07XHJcbiAgICBjb25zdCBsZWZ0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiBpICsgMV07XHJcbiAgICBjb25zdCByaWdodENoaWxkID0gdGhpcy5pdGVtc1syICogaSArIDJdO1xyXG4gICAgLy9pZiBub2RlIGhhcyBubyBjaGlsZHJlblxyXG4gICAgaWYgKCghbGVmdENoaWxkIHx8IGxlZnRDaGlsZC52YWx1ZSA9PSBudWxsKSAmJiAoIXJpZ2h0Q2hpbGQgfHwgcmlnaHRDaGlsZC52YWx1ZSA9PSBudWxsKSkge1xyXG4gICAgICB0aGlzLml0ZW1zW2ldLm1hcmsgPSBmYWxzZTtcclxuICAgICAgY3VycmVudC5jbGVhcigpO1xyXG4gICAgfSBlbHNlIGlmICghcmlnaHRDaGlsZCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpIHsgLy9pZiBub2RlIGhhcyBubyByaWdodCBjaGlsZFxyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShsZWZ0Q2hpbGQuaW5kZXgsIGN1cnJlbnQuaW5kZXgsIHRoaXMuaXRlbXMpO1xyXG4gICAgfSBlbHNlIGlmICghbGVmdENoaWxkIHx8IGxlZnRDaGlsZC52YWx1ZSA9PSBudWxsKSB7IC8vaWYgbm9kZSBoYXMgbm8gbGVmdCBjaGlsZFxyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodENoaWxkLmluZGV4LCBjdXJyZW50LmluZGV4LCB0aGlzLml0ZW1zKTtcclxuICAgIH0gZWxzZSB7IC8vbm9kZSBoYXMgdHdvIGNoaWxkcmVuLCBmaW5kIHN1Y2Nlc3NvclxyXG4gICAgICBjb25zdCBzdWNjZXNzb3IgPSBQYWdlQmluYXJ5VHJlZS5nZXRTdWNjZXNzb3IoY3VycmVudC5pbmRleCwgdGhpcy5pdGVtcyk7XHJcbiAgICAgIGNvbnN0IGhhc1JpZ2h0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiBzdWNjZXNzb3IgKyAyXSAmJiB0aGlzLml0ZW1zWzIgKiBzdWNjZXNzb3IgKyAyXS52YWx1ZSAhPSBudWxsO1xyXG4gICAgICBjdXJyZW50Lm1vdmVGcm9tKHRoaXMuaXRlbXNbc3VjY2Vzc29yXSk7XHJcbiAgICAgIGlmIChoYXNSaWdodENoaWxkKSB7XHJcbiAgICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUoMiAqIHN1Y2Nlc3NvciArIDIsIHN1Y2Nlc3NvciwgdGhpcy5pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNoZWNrUnVsZXMoKSB7XHJcbiAgICBsZXQgZXJyb3IgPSBudWxsO1xyXG4gICAgLy8xLiBFYWNoIG5vZGUgaXMgcmVkIG9yIGJsYWNrXHJcbiAgICAvLzIuIFJvb3Qgbm9kZSBpcyBhbHdheXMgYmxhY2tcclxuICAgIGlmICh0aGlzLml0ZW1zWzBdLm1hcmspIHtcclxuICAgICAgZXJyb3IgPSAnRVJST1I6IFJvb3QgbXVzdCBiZSBibGFjayc7XHJcbiAgICB9XHJcbiAgICAvLzMuIFJlZCBub2RlIGhhcyBibGFjayBjaGlsZHJlblxyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxlZnRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAxXTtcclxuICAgICAgY29uc3QgcmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIGkgKyAyXTtcclxuICAgICAgaWYgKGxlZnRDaGlsZCA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgIGlmIChpdGVtLm1hcmsgJiYgKGxlZnRDaGlsZC5tYXJrIHx8IHJpZ2h0Q2hpbGQubWFyaykpIHtcclxuICAgICAgICBlcnJvciA9ICdFUlJPUjogUGFyZW50IGFuZCBjaGlsZCBhcmUgYm90aCByZWQhJztcclxuICAgICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXg7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLy80LiBBbGwgcm91dGVzIGZyb20gcm9vdCB0byBub2RlIG9yIGVtcHR5IGNoaWxkIGhhdmUgc2FtZSBibGFjayBoZWlnaHRcclxuICAgIGxldCBjb3VudGVyID0gMTtcclxuICAgIGxldCBjdXIgPSBudWxsO1xyXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UoaSwgaXRlbXMpIHtcclxuICAgICAgaWYgKCFpdGVtc1tpXSB8fCBpdGVtc1tpXS52YWx1ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgaWYgKGN1ciAhPSBudWxsICYmIGNvdW50ZXIgIT09IGN1cikge1xyXG4gICAgICAgICAgZXJyb3IgPSAnRVJST1I6IEJsYWNrIGNvdW50cyBkaWZmZXIhJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3VyID0gY291bnRlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGxlZnQgPSAyICogaSArIDE7XHJcbiAgICAgIGNvbnN0IHJpZ2h0ID0gMiAqIGkgKyAyO1xyXG4gICAgICAvL2xlZnRcclxuICAgICAgaWYgKGl0ZW1zW2xlZnRdICYmICFpdGVtc1tsZWZ0XS5tYXJrICYmIGl0ZW1zW2xlZnRdLnZhbHVlICE9IG51bGwpIGNvdW50ZXIrKztcclxuICAgICAgdHJhdmVyc2UobGVmdCwgaXRlbXMpO1xyXG4gICAgICAvL3NlbGYsIGxlYWZcclxuICAgICAgaWYgKCghaXRlbXNbbGVmdF0gfHwgaXRlbXNbbGVmdF0udmFsdWUgPT0gbnVsbCkgJiYgKCFpdGVtc1tyaWdodF0gfHwgaXRlbXNbcmlnaHRdLnZhbHVlID09IG51bGwpKSB7XHJcbiAgICAgICAgaWYgKGN1ciAhPSBudWxsICYmIGNvdW50ZXIgIT09IGN1cikge1xyXG4gICAgICAgICAgZXJyb3IgPSAnRVJST1I6IEJsYWNrIGNvdW50cyBkaWZmZXIhJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3VyID0gY291bnRlcjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgLy9yaWdodFxyXG4gICAgICBpZiAoaXRlbXNbcmlnaHRdICYmICFpdGVtc1tyaWdodF0ubWFyayAmJiBpdGVtc1tyaWdodF0udmFsdWUgIT0gbnVsbCkgY291bnRlcisrO1xyXG4gICAgICB0cmF2ZXJzZShyaWdodCwgaXRlbXMpO1xyXG4gICAgICAvL3NlbGYsIGV4aXRcclxuICAgICAgaWYgKCFpdGVtc1tpXS5tYXJrKSBjb3VudGVyLS07XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICB0cmF2ZXJzZSgwLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNvcnJlY3RuZXNzQ29uc29sZS5zZXRNZXNzYWdlKGVycm9yIHx8ICdUcmVlIGlzIHJlZC1ibGFjayBjb3JyZWN0Jyk7XHJcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGbGlwKCkge1xyXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5pdGVtc1t0aGlzLm1hcmtlci5wb3NpdGlvbl07XHJcbiAgICBjb25zdCBsZWZ0Q2hpbGQgPSB0aGlzLml0ZW1zWzIgKiB0aGlzLm1hcmtlci5wb3NpdGlvbiArIDFdO1xyXG4gICAgY29uc3QgcmlnaHRDaGlsZCA9IHRoaXMuaXRlbXNbMiAqIHRoaXMubWFya2VyLnBvc2l0aW9uICsgMl07XHJcbiAgICBpZiAoIWxlZnRDaGlsZCB8fCAhcmlnaHRDaGlsZCB8fCBsZWZ0Q2hpbGQudmFsdWUgPT0gbnVsbCB8fCByaWdodENoaWxkLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdOb2RlIGhhcyBubyBjaGlsZHJlbic7XHJcbiAgICB9IGVsc2UgaWYgKHBhcmVudC5pbmRleCA9PT0gMCAmJiBsZWZ0Q2hpbGQubWFyayA9PT0gcmlnaHRDaGlsZC5tYXJrKSB7XHJcbiAgICAgIGxlZnRDaGlsZC5tYXJrID0gIWxlZnRDaGlsZC5tYXJrO1xyXG4gICAgICByaWdodENoaWxkLm1hcmsgPSAhcmlnaHRDaGlsZC5tYXJrO1xyXG4gICAgfSBlbHNlIGlmIChwYXJlbnQubWFyayAhPT0gbGVmdENoaWxkLm1hcmsgJiYgbGVmdENoaWxkLm1hcmsgPT09IHJpZ2h0Q2hpbGQubWFyaykge1xyXG4gICAgICBsZWZ0Q2hpbGQubWFyayA9ICFsZWZ0Q2hpbGQubWFyaztcclxuICAgICAgcmlnaHRDaGlsZC5tYXJrID0gIXJpZ2h0Q2hpbGQubWFyaztcclxuICAgICAgcGFyZW50Lm1hcmsgPSAhcGFyZW50Lm1hcms7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gJ0NhblxcJ3QgZmxpcCB0aGlzIGNvbG9yIGFycmFuZ2VtZW50JztcclxuICAgIH1cclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JSb0woKSB7XHJcbiAgICBjb25zdCB0b3AgPSB0aGlzLm1hcmtlci5wb3NpdGlvbjtcclxuICAgIGNvbnN0IGxlZnQgPSAyICogdG9wICsgMTtcclxuICAgIGNvbnN0IHJpZ2h0ID0gMiAqIHRvcCArIDI7XHJcbiAgICBpZiAoIXRoaXMuaXRlbXNbcmlnaHRdIHx8IHRoaXMuaXRlbXNbcmlnaHRdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdDYW5cXCd0IHJvdGF0ZSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tsZWZ0XSAmJiB0aGlzLml0ZW1zW2xlZnRdLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgUGFnZUJpbmFyeVRyZWUubW92ZVN1YnRyZWUobGVmdCwgMiAqIGxlZnQgKyAxLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuICAgIHRoaXMuaXRlbXNbbGVmdF0ubW92ZUZyb20odGhpcy5pdGVtc1t0b3BdKTtcclxuICAgIHRoaXMuaXRlbXNbdG9wXS5tb3ZlRnJvbSh0aGlzLml0ZW1zW3JpZ2h0XSk7XHJcbiAgICBjb25zdCByaWdodEdyYW5kTGVmdCA9IDIgKiByaWdodCArIDE7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodEdyYW5kTGVmdF0gJiYgdGhpcy5pdGVtc1tyaWdodEdyYW5kTGVmdF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodEdyYW5kTGVmdCwgMiAqIGxlZnQgKyAyLCB0aGlzLml0ZW1zKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHJpZ2h0R3JhbmRSaWdodCA9IDIgKiByaWdodCArIDI7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodEdyYW5kUmlnaHRdICYmIHRoaXMuaXRlbXNbcmlnaHRHcmFuZFJpZ2h0XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIFBhZ2VCaW5hcnlUcmVlLm1vdmVTdWJ0cmVlKHJpZ2h0R3JhbmRSaWdodCwgcmlnaHQsIHRoaXMuaXRlbXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclJvUigpIHtcclxuICAgIGNvbnN0IHRvcCA9IHRoaXMubWFya2VyLnBvc2l0aW9uO1xyXG4gICAgY29uc3QgbGVmdCA9IDIgKiB0b3AgKyAxO1xyXG4gICAgY29uc3QgcmlnaHQgPSAyICogdG9wICsgMjtcclxuICAgIGlmICghdGhpcy5pdGVtc1tsZWZ0XSB8fCB0aGlzLml0ZW1zW2xlZnRdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICdDYW5cXCd0IHJvdGF0ZSc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pdGVtc1tyaWdodF0gJiYgdGhpcy5pdGVtc1tyaWdodF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShyaWdodCwgMiAqIHJpZ2h0ICsgMiwgdGhpcy5pdGVtcyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW3JpZ2h0XS5tb3ZlRnJvbSh0aGlzLml0ZW1zW3RvcF0pO1xyXG4gICAgdGhpcy5pdGVtc1t0b3BdLm1vdmVGcm9tKHRoaXMuaXRlbXNbbGVmdF0pO1xyXG4gICAgY29uc3QgbGVmdEdyYW5kUmlnaHQgPSAyICogbGVmdCArIDI7XHJcbiAgICBpZiAodGhpcy5pdGVtc1tsZWZ0R3JhbmRSaWdodF0gJiYgdGhpcy5pdGVtc1tsZWZ0R3JhbmRSaWdodF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBQYWdlQmluYXJ5VHJlZS5tb3ZlU3VidHJlZShsZWZ0R3JhbmRSaWdodCwgMiAqIHJpZ2h0ICsgMSwgdGhpcy5pdGVtcyk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBsZWZ0R3JhbmRMZWZ0ID0gMiAqIGxlZnQgKyAxO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbbGVmdEdyYW5kTGVmdF0gJiYgdGhpcy5pdGVtc1tsZWZ0R3JhbmRMZWZ0XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIFBhZ2VCaW5hcnlUcmVlLm1vdmVTdWJ0cmVlKGxlZnRHcmFuZExlZnQsIGxlZnQsIHRoaXMuaXRlbXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3dpY2hSQigpIHtcclxuICAgIHRoaXMuaXRlbXNbdGhpcy5tYXJrZXIucG9zaXRpb25dLm1hcmsgPSAhdGhpcy5pdGVtc1t0aGlzLm1hcmtlci5wb3NpdGlvbl0ubWFyaztcclxuICAgIHRoaXMuY2hlY2tSdWxlcygpO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLXJlZGJsYWNrLXRyZWUnLCBQYWdlUmVkQmxhY2tUcmVlKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtnZXRVbmlxdWVSYW5kb21BcnJheSwgaXNQcmltZX0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvYnV0dG9uJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2NvbnNvbGUnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvZGlhbG9nJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNIb3Jpem9udGFsJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlSGFzaFRhYmxlIGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmluaXRNYXJrZXJzKCk7XHJcbiAgICB0aGlzLkRFTEVURUQgPSAnRGVsJztcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDE+SGFzaCBUYWJsZSAobGluZWFyL3F1YWQvZG91YmxlKTwvaDE+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbGwpfT5GaWxsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImFsZ29yaXRobVwiIGNsYXNzPVwiYWxnb3JpdGhtIGFsZ29yaXRobV9saW5lYXJcIiBkaXNhYmxlZCBjaGVja2VkPkxpbmVhcjwvbGFiZWw+XHJcbiAgICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxnb3JpdGhtXCIgY2xhc3M9XCJhbGdvcml0aG0gYWxnb3JpdGhtX3F1YWRcIiBkaXNhYmxlZD5RdWFkPC9sYWJlbD5cclxuICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIG5hbWU9XCJhbGdvcml0aG1cIiBjbGFzcz1cImFsZ29yaXRobSBhbGdvcml0aG1fZG91YmxlXCIgZGlzYWJsZWQ+RG91YmxlPC9sYWJlbD5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+TmV3PC9iPiBjcmVhdGVzIGhhc2ggdGFibGUgd2l0aCBOIGNlbGxzICg2MCBtYXgpPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkZpbGw8L2I+IGluc2VydHMgTiBpdGVtcyBpbnRvIHRhYmxlPC9wPiBcclxuICAgICAgICAgIDxwPjxiPkluczwvYj4gaW5zZXJ0cyBuZXcgaXRlbSB3aXRoIHZhbHVlIE48L3A+IFxyXG4gICAgICAgICAgPHA+PGI+RmluZDwvYj4gZmluZHMgaXRlbSB3aXRoIHZhbHVlIE48L3A+IFxyXG4gICAgICAgICAgPHA+PGI+TGluZWFyL1F1YWQvRG91YmxlPC9iPiBzZWxlY3RzIHByb2JlIG1ldGhvZDwvcD4gXHJcbiAgICAgICAgPC94LWluZm8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ob3Jpem9udGFsIC5pdGVtcz0ke3RoaXMuaXRlbXN9IC5tYXJrZXJzPSR7dGhpcy5tYXJrZXJzfT48L3gtaXRlbXMtaG9yaXpvbnRhbD5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy5kb3VibGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fZG91YmxlJyk7XHJcbiAgICB0aGlzLnF1YWQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fcXVhZCcpO1xyXG4gICAgdGhpcy5saW5lYXIgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5hbGdvcml0aG1fbGluZWFyJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMoKSB7XHJcbiAgICBjb25zdCBsZW5ndGggPSA1OTtcclxuICAgIGNvbnN0IGxlbmd0aEZpbGwgPSAzMDtcclxuICAgIGNvbnN0IGFyciA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICBhcnIucHVzaChuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aEZpbGw7XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgZ2V0VW5pcXVlUmFuZG9tQXJyYXkobGVuZ3RoRmlsbCwgMTAwMCkuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgIGFyclt0aGlzLnByb2JlSW5kZXgodmFsdWUpXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGluaXRNYXJrZXJzKCkge1xyXG4gICAgdGhpcy5tYXJrZXJzID0gW25ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSldO1xyXG4gIH1cclxuXHJcbiAgaGFzaEZuKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgJSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICB9XHJcblxyXG4gIGRvdWJsZUhhc2hGbih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIDUgLSB2YWx1ZSAlIDU7XHJcbiAgfVxyXG5cclxuICBwcm9iZUluZGV4KHZhbHVlKSB7XHJcbiAgICBsZXQgaW5kZXggPSB0aGlzLmhhc2hGbih2YWx1ZSk7XHJcbiAgICBsZXQgc3RlcCA9IDE7XHJcbiAgICBsZXQgY291bnRlciA9IDA7XHJcbiAgICB3aGlsZSAodGhpcy5pdGVtc1tpbmRleF0udmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICBjb3VudGVyKys7XHJcbiAgICAgIGlmICh0aGlzLmRvdWJsZSAmJiB0aGlzLmRvdWJsZS5jaGVja2VkKSBzdGVwID0gdGhpcy5kb3VibGVIYXNoRm4odmFsdWUpO1xyXG4gICAgICBpZiAodGhpcy5xdWFkICYmIHRoaXMucXVhZC5jaGVja2VkKSBzdGVwID0gY291bnRlcioqMjtcclxuICAgICAgaW5kZXggKz0gc3RlcDtcclxuICAgICAgaWYgKGluZGV4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSBpbmRleCAtPSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgIH1cclxuICAgIHJldHVybiBpbmRleDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JOZXcoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBzaXplIG9mIGFycmF5IHRvIGNyZWF0ZS4gQ2xvc2VzdCBwcmltZSBudW1iZXIgd2lsbCBiZSBzZWxlY3RlZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gNjAgfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiB1c2Ugc2l6ZSBiZXR3ZWVuIDAgYW5kIDYwJztcclxuICAgIH1cclxuICAgIHdoaWxlICghaXNQcmltZShsZW5ndGgpKSB7XHJcbiAgICAgIGxlbmd0aC0tO1xyXG4gICAgfVxyXG4gICAgdGhpcy5kb3VibGUuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHRoaXMucXVhZC5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5saW5lYXIuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIHlpZWxkICdQbGVhc2UsIHNlbGVjdCBwcm9iZSBtZXRob2QnO1xyXG4gICAgdGhpcy5kb3VibGUuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5xdWFkLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHRoaXMubGluZWFyLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHlpZWxkIGBXaWxsIGNyZWF0ZSBlbXB0eSBhcnJheSB3aXRoICR7bGVuZ3RofSBjZWxsc2A7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgYXJyLnB1c2gobmV3IEl0ZW0oe2luZGV4OiBpfSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICAgIHJldHVybiAnTmV3IGFycmF5IGNyZWF0ZWQ7IHRvdGFsIGl0ZW1zID0gMCc7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRmlsbCgpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIG51bWJlciBvZiBpdGVtcyB0byBmaWxsIGluJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiB0aGlzLml0ZW1zLmxlbmd0aCB8fCBsZW5ndGggPCAwKSB7XHJcbiAgICAgIHJldHVybiBgRVJST1I6IGNhbid0IGZpbGwgbW9yZSB0aGFuICR7dGhpcy5pdGVtcy5sZW5ndGh9IGl0ZW1zYDtcclxuICAgIH1cclxuICAgIHlpZWxkIGBXaWxsIGZpbGwgaW4gJHtsZW5ndGh9IGl0ZW1zYDtcclxuICAgIGdldFVuaXF1ZVJhbmRvbUFycmF5KGxlbmd0aCwgMTAwMCkuZm9yRWFjaCh2YWx1ZSA9PiB7XHJcbiAgICAgIHRoaXMuaXRlbXNbdGhpcy5wcm9iZUluZGV4KHZhbHVlKV0uc2V0VmFsdWUodmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcclxuICAgIHJldHVybiBgRmlsbCBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zID0gJHtsZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBhcnJheSBpcyBmdWxsJztcclxuICAgIH1cclxuICAgIGxldCBrZXkgPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIGtleSBvZiBpdGVtIHRvIGluc2VydCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5oYXNoRm4oa2V5KTtcclxuICAgIGxldCBzdGVwID0gMTtcclxuICAgIGxldCBjb3VudGVyID0gMDtcclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgd2hpbGUgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlICE9IG51bGwgJiYgdGhpcy5pdGVtc1tpbmRleF0udmFsdWUgIT09IHRoaXMuREVMRVRFRCkge1xyXG4gICAgICB5aWVsZCBgQ2VsbCAke2luZGV4fSBvY2N1cGllZDsgZ29pbmcgdG8gbmV4dCBjZWxsYDtcclxuICAgICAgY291bnRlcisrO1xyXG4gICAgICBpZiAodGhpcy5kb3VibGUuY2hlY2tlZCkgc3RlcCA9IHRoaXMuZG91YmxlSGFzaEZuKGtleSk7XHJcbiAgICAgIGlmICh0aGlzLnF1YWQuY2hlY2tlZCkgc3RlcCA9IGNvdW50ZXIqKjI7XHJcbiAgICAgIGluZGV4ICs9IHN0ZXA7XHJcbiAgICAgIGlmIChpbmRleCA+PSB0aGlzLml0ZW1zLmxlbmd0aCkgaW5kZXggLT0gdGhpcy5pdGVtcy5sZW5ndGg7XHJcbiAgICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICB5aWVsZCBgU2VhcmNoaW5nIGZvciB1bm9jY3VwaWVkIGNlbGw7IHN0ZXAgd2FzICR7c3RlcH1gO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0uc2V0VmFsdWUoa2V5KTtcclxuICAgIHlpZWxkIGBJbnNlcnRlZCBpdGVtIHdpdGgga2V5ICR7a2V5fSBhdCBpbmRleCAke2luZGV4fWA7XHJcbiAgICB0aGlzLmxlbmd0aCsrO1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gMDtcclxuICAgIHJldHVybiBgSW5zZXJ0aW9uIGNvbXBsZXRlZDsgdG90YWwgaXRlbXMgJHt0aGlzLmxlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvclByb2JlKGtleSkge1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5oYXNoRm4oa2V5KTtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaW5kZXg7XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX0gYXQgaW5kZXggJHtpbmRleH1gO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgZm91bmRBdCA9IGluZGV4O1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLml0ZW1zW2luZGV4XS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIHlpZWxkICdObyBtYXRjaDsgd2lsbCBzdGFydCBwcm9iZSc7XHJcbiAgICAgIGxldCBzdGVwID0gMTtcclxuICAgICAgbGV0IGNvdW50ZXIgPSAwO1xyXG4gICAgICB3aGlsZSAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgICAgaWYgKCsrY291bnRlciA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIGJyZWFrO1xyXG4gICAgICAgIGlmICh0aGlzLmRvdWJsZS5jaGVja2VkKSBzdGVwID0gdGhpcy5kb3VibGVIYXNoRm4oa2V5KTtcclxuICAgICAgICBpZiAodGhpcy5xdWFkLmNoZWNrZWQpIHN0ZXAgPSBjb3VudGVyKioyO1xyXG4gICAgICAgIGluZGV4ICs9IHN0ZXA7XHJcbiAgICAgICAgaWYgKGluZGV4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSBpbmRleCAtPSB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICBpZiAodGhpcy5pdGVtc1tpbmRleF0udmFsdWUgPT0gbnVsbCkgYnJlYWs7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJzWzBdLnBvc2l0aW9uID0gaW5kZXg7XHJcbiAgICAgICAgaWYgKHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICAgIGZvdW5kQXQgPSBpbmRleDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgeWllbGQgYENoZWNraW5nIG5leHQgY2VsbDsgc3RlcCB3YXMgJHtzdGVwfWA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm91bmRBdDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JGaW5kKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5pdGVyYXRvclByb2JlKGtleSwgZmFsc2UpO1xyXG4gICAgaWYgKGZvdW5kQXQgPT0gbnVsbCkge1xyXG4gICAgICB5aWVsZCBgQ2FuJ3QgbG9jYXRlIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHlpZWxkIGBIYXZlIGZvdW5kIGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIH1cclxuICAgIHRoaXMubWFya2Vyc1swXS5wb3NpdGlvbiA9IDA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yRGVsKCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZGVsZXRlJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiAxMDAwIHx8IGtleSA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgTG9va2luZyBmb3IgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGZvdW5kQXQgPSB5aWVsZCogdGhpcy5pdGVyYXRvclByb2JlKGtleSwgdHJ1ZSk7XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBDYW4ndCBsb2NhdGUgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5pdGVtc1tmb3VuZEF0XS52YWx1ZSA9IHRoaXMuREVMRVRFRDtcclxuICAgICAgdGhpcy5pdGVtc1tmb3VuZEF0XS5jb2xvciA9IG51bGw7XHJcbiAgICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICAgIHlpZWxkIGBEZWxldGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9OyB0b3RhbCBpdGVtcyAke3RoaXMubGVuZ3RofWA7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnNbMF0ucG9zaXRpb24gPSAwO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhhc2gtdGFibGUnLCBQYWdlSGFzaFRhYmxlKTsiLCJpbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtnZXRVbmlxdWVSYW5kb21BcnJheX0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQge0l0ZW19IGZyb20gJy4uL2NsYXNzZXMvaXRlbSc7XHJcbmltcG9ydCB7TWFya2VyfSBmcm9tICcuLi9jbGFzc2VzL21hcmtlcic7XHJcbmltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvYnV0dG9uJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2NvbnNvbGUnO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvZGlhbG9nJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBhZ2VIYXNoQ2hhaW4gZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoMjUpO1xyXG4gICAgdGhpcy5maWxsVmFsdWVzKHRoaXMuaXRlbXMubGVuZ3RoKTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDE+SGFzaCBUYWJsZSBDaGFpbjwvaDE+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JOZXcpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbGwpfT5GaWxsPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JJbnMpfT5JbnM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckZpbmQpfT5GaW5kPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JEZWwpfT5EZWw8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+XHJcbiAgICAgICAgICA8cD48Yj5OZXc8L2I+IGNyZWF0ZXMgbmV3IGhhc2ggdGFibGUgY29udGFpbmluZyBOIGxpbmtlZCBsaXN0czwvcD5cclxuICAgICAgICAgIDxwPjxiPkZpbGw8L2I+IGluc2VydHMgTiBpdGVtcyBpbnRvIHRhYmxlPC9wPlxyXG4gICAgICAgICAgPHA+PGI+SW5zPC9iPiBpbnNlcnRzIG5ldyBpdGVtIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgICAgIDxwPjxiPkZpbmQ8L2I+IGZpbmRzIGl0ZW0gd2l0aCB2YWx1ZSBOPC9wPlxyXG4gICAgICAgICAgPHA+PGI+RGVsPC9iPiBkZWxldGVzIGl0ZW0gd2l0aCB2YWx1ZSBOPC9wPlxyXG4gICAgICAgIDwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZT48L3gtY29uc29sZT5cclxuICAgICAgPG9sIHN0YXJ0PVwiMFwiIHN0eWxlPVwiaGVpZ2h0OiAzMGVtOyBvdmVyZmxvdy15OiBzY3JvbGw7XCI+JHt0aGlzLnJlbmRlckxpbmVzKCl9PC9vbD5cclxuICAgICAgPHgtZGlhbG9nPlxyXG4gICAgICAgIDxsYWJlbD5OdW1iZXI6IDxpbnB1dCBuYW1lPVwibnVtYmVyXCIgdHlwZT1cIm51bWJlclwiPjwvbGFiZWw+XHJcbiAgICAgIDwveC1kaWFsb2c+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyTGluZXMoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pdGVtcy5tYXAoKGxpc3QsIGkpID0+IGh0bWxgXHJcbiAgICAgIDxsaT48eC1pdGVtcy1ob3Jpem9udGFsLWxpbmtlZCAuaXRlbXM9JHtsaXN0Lml0ZW1zfSAubWFya2VyPSR7bGlzdC5tYXJrZXJ9IG5hcnJvdyBjbGFzcz1cImxpc3QtJHtpfVwiPjwveC1pdGVtcy1ob3Jpem9udGFsLWxpbmtlZD48L2xpPlxyXG4gICAgYCk7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtY29uc29sZScpO1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3gtZGlhbG9nJyk7XHJcbiAgfVxyXG5cclxuICBpbml0SXRlbXMobGVuZ3RoKSB7XHJcbiAgICBjb25zdCBhcnIgPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgYXJyLnB1c2goe2l0ZW1zOiBbbmV3IEl0ZW0oe30pXSwgbWFya2VyOiB7fX0pO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcyA9IGFycjtcclxuICAgIHRoaXMubGVuZ3RoID0gMDtcclxuICB9XHJcblxyXG4gIGZpbGxWYWx1ZXMobGVuZ3RoKSB7XHJcbiAgICBnZXRVbmlxdWVSYW5kb21BcnJheShsZW5ndGgsIDEwMDApLmZvckVhY2godmFsdWUgPT4ge1xyXG4gICAgICBjb25zdCBsaXN0ID0gdGhpcy5pdGVtc1t0aGlzLmhhc2hGbih2YWx1ZSldO1xyXG4gICAgICBpZiAobGlzdC5pdGVtc1swXS52YWx1ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgbGlzdC5pdGVtc1swXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGlzdC5pdGVtcy5wdXNoKChuZXcgSXRlbSh7fSkpLnNldFZhbHVlKHZhbHVlKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VycygpIHtcclxuICAgIHRoaXMuaXRlbXNbMF0ubWFya2VyID0gbmV3IE1hcmtlcih7cG9zaXRpb246IDB9KTtcclxuICB9XHJcblxyXG4gIGNsZWFySW5pdGlhbE1hcmtlcigpIHtcclxuICAgIHRoaXMuaXRlbXNbMF0ubWFya2VyID0ge307XHJcbiAgfVxyXG5cclxuICBoYXNoRm4odmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSAlIHRoaXMuaXRlbXMubGVuZ3RoO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvck5ldygpIHtcclxuICAgIGxldCBsZW5ndGggPSAwO1xyXG4gICAgeWllbGQgJ0VudGVyIHNpemUgb2YgdGFibGUgdG8gY3JlYXRlLic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gMTAwIHx8IGxlbmd0aCA8IDApIHtcclxuICAgICAgcmV0dXJuICdFUlJPUjogdXNlIHNpemUgYmV0d2VlbiAwIGFuZCAxMDAnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIGVtcHR5IHRhYmxlIHdpdGggJHtsZW5ndGh9IGxpc3RzYDtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKGxlbmd0aCk7XHJcbiAgICByZXR1cm4gJ05ldyB0YWJsZSBjcmVhdGVkOyB0b3RhbCBpdGVtcyA9IDAnO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2YgaXRlbXMgdG8gZmlsbCBpbic7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGxlbmd0aCA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAobGVuZ3RoID4gdGhpcy5pdGVtcy5sZW5ndGggfHwgbGVuZ3RoIDwgMCkge1xyXG4gICAgICByZXR1cm4gYEVSUk9SOiBjYW4ndCBmaWxsIG1vcmUgdGhhbiAke3RoaXMuaXRlbXMubGVuZ3RofSBpdGVtc2A7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBmaWxsIGluICR7bGVuZ3RofSBpdGVtc2A7XHJcbiAgICB0aGlzLmZpbGxWYWx1ZXMobGVuZ3RoKTtcclxuICAgIHJldHVybiBgRmlsbCBjb21wbGV0ZWQ7IHRvdGFsIGl0ZW1zID0gJHtsZW5ndGh9YDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBsZXQga2V5ID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBrZXkgb2YgaXRlbSB0byBpbnNlcnQnO1xyXG4gICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICBrZXkgPSBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSk7XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfSwgKCkgPT4gdGhpcy5pdGVyYXRlKCkpO1xyXG4gICAgeWllbGQgJ0RpYWxvZyBvcGVuZWQnOyAvL3NraXAgaW4gcHJvbWlzZVxyXG4gICAgaWYgKGtleSA+IDEwMDAgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgaW5zZXJ0IGl0ZW0gd2l0aCBrZXkgJHtrZXl9YDtcclxuICAgIHRoaXMuY2xlYXJJbml0aWFsTWFya2VyKCk7XHJcbiAgICBsZXQgaW5kZXggPSB0aGlzLmhhc2hGbihrZXkpO1xyXG4gICAgY29uc3QgbGlzdCA9IHRoaXMuaXRlbXNbaW5kZXhdO1xyXG4gICAgbGlzdC5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gICAgdGhpcy5xdWVyeVNlbGVjdG9yKGAubGlzdC0ke2luZGV4fWApLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKTtcclxuICAgIHlpZWxkIGBXaWxsIGluc2VydCBpbiBsaXN0ICR7aW5kZXh9YDtcclxuICAgIGlmIChsaXN0Lml0ZW1zWzBdLnZhbHVlID09IG51bGwpIHtcclxuICAgICAgbGlzdC5pdGVtc1swXS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbGlzdC5pdGVtcy5wdXNoKChuZXcgSXRlbSh7fSkpLnNldFZhbHVlKGtleSkpO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYEluc2VydGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGluIGxpc3QgJHtpbmRleH1gO1xyXG4gICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgICByZXR1cm4gYEluc2VydGlvbiBjb21wbGV0ZWQuIFRvdGFsIGl0ZW1zID0gJHt0aGlzLmxlbmd0aH1gO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbmQoaXNJbnRlcm5hbCkge1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIGl0ZW0gdG8gZmluZCc7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gMTAwMCB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgdHJ5IHRvIGZpbmQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgdGhpcy5jbGVhckluaXRpYWxNYXJrZXIoKTtcclxuICAgIGxldCBpbmRleCA9IHRoaXMuaGFzaEZuKGtleSk7XHJcbiAgICBjb25zdCBsaXN0ID0gdGhpcy5pdGVtc1tpbmRleF07XHJcbiAgICBsaXN0Lm1hcmtlciA9IG5ldyBNYXJrZXIoe3Bvc2l0aW9uOiAwfSk7XHJcbiAgICB0aGlzLnF1ZXJ5U2VsZWN0b3IoYC5saXN0LSR7aW5kZXh9YCkuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpO1xyXG4gICAgeWllbGQgYEl0ZW0gd2l0aCBrZXkgJHtrZXl9IHNob3VsZCBiZSBpbiBsaXN0ICR7aW5kZXh9YDtcclxuICAgIGxldCBpID0gMDtcclxuICAgIGxldCBmb3VuZEF0O1xyXG4gICAgd2hpbGUgKGxpc3QuaXRlbXNbaV0gJiYgbGlzdC5pdGVtc1tpXS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgIGxpc3QubWFya2VyID0gbmV3IE1hcmtlcih7cG9zaXRpb246IGl9KTtcclxuICAgICAgeWllbGQgYExvb2tpbmcgZm9yIGl0ZW0gd2l0aCBrZXkgJHtrZXl9IGF0IGxpbmsgJHtpfWA7XHJcbiAgICAgIGlmIChsaXN0Lml0ZW1zW2ldLnZhbHVlID09PSBrZXkpIHtcclxuICAgICAgICBmb3VuZEF0ID0gaTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgICBpKys7XHJcbiAgICB9XHJcbiAgICBpZiAoZm91bmRBdCA9PSBudWxsKSB7XHJcbiAgICAgIHlpZWxkIGBDYW4ndCBsb2NhdGUgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgeWllbGQgYEhhdmUgZm91bmQgaXRlbSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgfVxyXG4gICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgIHRoaXMuaW5pdE1hcmtlcnMoKTtcclxuICAgIGlmIChpc0ludGVybmFsICYmIGZvdW5kQXQgIT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4ga2V5O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckRlbCgpIHtcclxuICAgIGxldCBrZXkgPSB5aWVsZCogdGhpcy5pdGVyYXRvckZpbmQodHJ1ZSk7XHJcbiAgICBpZiAoa2V5ICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5jbGVhckluaXRpYWxNYXJrZXIoKTtcclxuICAgICAgY29uc3QgbGlzdCA9IHRoaXMuaXRlbXNbdGhpcy5oYXNoRm4oa2V5KV07XHJcbiAgICAgIGNvbnN0IGluZGV4ID0gbGlzdC5pdGVtcy5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLnZhbHVlID09PSBrZXkpO1xyXG4gICAgICBpZiAoaW5kZXggPT09IDApIHtcclxuICAgICAgICBsaXN0Lm1hcmtlci5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICAgIGxpc3QuaXRlbXNbaW5kZXhdLmNsZWFyKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGlzdC5tYXJrZXIucG9zaXRpb24gPSBpbmRleCAtIDE7XHJcbiAgICAgICAgbGlzdC5pdGVtcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMubGVuZ3RoLS07XHJcbiAgICAgIHlpZWxkIGBEZWxldGVkIGl0ZW0gd2l0aCBrZXkgJHtrZXl9LiBUb3RhbCBpdGVtcyA9ICR7dGhpcy5sZW5ndGh9YDtcclxuICAgICAgbGlzdC5tYXJrZXIgPSB7fTtcclxuICAgICAgdGhpcy5pbml0TWFya2VycygpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhhc2gtY2hhaW4nLCBQYWdlSGFzaENoYWluKTsiLCJpbXBvcnQge1BhZ2VCYXNlfSBmcm9tICcuL3BhZ2VCYXNlJztcclxuaW1wb3J0IHtodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCB7SXRlbX0gZnJvbSAnLi4vY2xhc3Nlcy9pdGVtJztcclxuaW1wb3J0IHtNYXJrZXJ9IGZyb20gJy4uL2NsYXNzZXMvbWFya2VyJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2RpYWxvZyc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pbmZvJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2l0ZW1zVHJlZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFnZUhlYXAgZXh0ZW5kcyBQYWdlQmFzZSB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5pbml0SXRlbXMoMTApO1xyXG4gICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPkhlYXA8L2gxPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yRmlsbCl9PkZpbGw8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckNobmcpfT5DaG5nPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JSZW0pfT5SZW08L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvcklucyl9PkluczwveC1idXR0b24+XHJcbiAgICAgICAgPHgtaW5mbz5cclxuICAgICAgICAgIDxwPjxiPkZpbGw8L2I+IGNyZWF0ZXMgbmV3IGhlYXAgd2l0aCBOIG5vZGVzPC9wPlxyXG4gICAgICAgICAgPHA+PGI+Q2huZzwvYj4gY2hhbmdlcyBzZWxlY3RlZCBub2RlIHRvIHZhbHVlIE48L3A+XHJcbiAgICAgICAgICA8cD48Yj5DbGljayBvbiBub2RlPC9iPiB0byBzZWxlY3QgaXQ8L3A+XHJcbiAgICAgICAgICA8cD48Yj5SZW08L2I+IHJlbW92ZXMgbm9kZSB3aXRoIGhpZ2hlc3Qga2V5PC9wPlxyXG4gICAgICAgICAgPHA+PGI+SW5zPC9iPiBpbnNlcnRzIG5ldyBub2RlIHdpdGggdmFsdWUgTjwvcD5cclxuICAgICAgICA8L3gtaW5mbz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJtYWluLWNvbnNvbGVcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtdHJlZSAuaXRlbXM9JHt0aGlzLml0ZW1zfSAubWFya2VyPSR7dGhpcy5tYXJrZXJ9PjwveC1pdGVtcy10cmVlPlxyXG4gICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgPGxhYmVsPk51bWJlcjogPGlucHV0IG5hbWU9XCJudW1iZXJcIiB0eXBlPVwibnVtYmVyXCI+PC9sYWJlbD5cclxuICAgICAgPC94LWRpYWxvZz5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICAgICBhcnJbY3VyTGVuZ3RoXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIC8vdHJpY2tsZSB1cFxyXG4gICAgICBsZXQgaW5kZXggPSBjdXJMZW5ndGg7XHJcbiAgICAgIGxldCBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJMZW5ndGggLSAxKSAvIDIpO1xyXG4gICAgICB3aGlsZShpbmRleCA+PSAwICYmIGFycltwYXJlbnRdICYmIGFycltwYXJlbnRdLnZhbHVlIDwgdmFsdWUpIHtcclxuICAgICAgICBhcnJbcGFyZW50XS5zd2FwV2l0aChhcnJbaW5kZXhdKTtcclxuICAgICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgICBwYXJlbnQgPSBNYXRoLmZsb29yKChwYXJlbnQgLSAxKSAvIDIpO1xyXG4gICAgICB9XHJcbiAgKiAqL1xyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuZGlhbG9nID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWRpYWxvZycpO1xyXG4gICAgdGhpcy50cmVlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLXRyZWUnKTtcclxuICB9XHJcblxyXG4gIGluaXRJdGVtcyhsZW5ndGgpIHtcclxuICAgIGNvbnN0IGFyciA9IChuZXcgQXJyYXkoMzEpKS5maWxsKCkubWFwKChfLCBpKSA9PiBuZXcgSXRlbSh7aW5kZXg6IGl9KSk7XHJcbiAgICBmb3IgKGxldCBjdXJMZW5ndGggPSAwOyBjdXJMZW5ndGggPD0gbGVuZ3RoIC0gMTsgY3VyTGVuZ3RoKyspIHtcclxuICAgICAgY29uc3QgdmFsdWUgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICBhcnJbY3VyTGVuZ3RoXS5zZXRWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgIC8vdHJpY2tsZSB1cFxyXG4gICAgICBsZXQgaW5kZXggPSBjdXJMZW5ndGg7XHJcbiAgICAgIGxldCBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJMZW5ndGggLSAxKSAvIDIpO1xyXG4gICAgICB3aGlsZShpbmRleCA+PSAwICYmIGFycltwYXJlbnRdICYmIGFycltwYXJlbnRdLnZhbHVlIDwgdmFsdWUpIHtcclxuICAgICAgICBhcnJbcGFyZW50XS5zd2FwV2l0aChhcnJbaW5kZXhdKTtcclxuICAgICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgICBwYXJlbnQgPSBNYXRoLmZsb29yKChwYXJlbnQgLSAxKSAvIDIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zID0gYXJyO1xyXG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XHJcbiAgfVxyXG5cclxuICBpbml0TWFya2VyKCkge1xyXG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgTWFya2VyKHtwb3NpdGlvbjogMH0pO1xyXG4gIH1cclxuXHJcbiAgKiBpdGVyYXRvckZpbGwoKSB7XHJcbiAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgIHlpZWxkICdFbnRlciBudW1iZXIgb2Ygbm9kZXMgKDEgdG8gMzEpJztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAgbGVuZ3RoID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChsZW5ndGggPiAzMSB8fCBsZW5ndGggPCAxKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IHVzZSBzaXplIGJldHdlZW4gMSBhbmQgMzEnO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY3JlYXRlIHRyZWUgd2l0aCAke2xlbmd0aH0gbm9kZXNgO1xyXG4gICAgdGhpcy5pbml0SXRlbXMobGVuZ3RoKTtcclxuICB9XHJcblxyXG4gICogdHJpY2tsZVVwKGtleSwgaW5kZXgpIHtcclxuICAgIHRoaXMuaXRlbXNbaW5kZXhdLnNldFZhbHVlKCcnLCAnI2ZmZmZmZicpO1xyXG4gICAgeWllbGQgJ1NhdmVkIG5ldyBub2RlOyB3aWxsIHRyaWNrbGUgdXAnO1xyXG4gICAgbGV0IHBhcmVudCA9IE1hdGguZmxvb3IoKGluZGV4IC0gMSkgLyAyKTtcclxuICAgIHdoaWxlKGluZGV4ID49IDAgJiYgdGhpcy5pdGVtc1twYXJlbnRdICYmIHRoaXMuaXRlbXNbcGFyZW50XS52YWx1ZSA8IGtleSkge1xyXG4gICAgICB0aGlzLml0ZW1zW3BhcmVudF0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbmRleF0pO1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IHBhcmVudDtcclxuICAgICAgeWllbGQgJ01vdmVkIGVtcHR5IG5vZGUgdXAnO1xyXG4gICAgICBpbmRleCA9IHBhcmVudDtcclxuICAgICAgcGFyZW50ID0gTWF0aC5mbG9vcigocGFyZW50IC0gMSkgLyAyKTtcclxuICAgIH1cclxuICAgIHlpZWxkICdUcmlja2xlIHVwIGNvbXBsZXRlZCc7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpbmRleDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JJbnMoKSB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IHRoaXMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LCBubyByb29tIGluIGRpc3BsYXknO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB5aWVsZCAnRW50ZXIga2V5IG9mIG5vZGUgdG8gaW5zZXJ0JztcclxuICAgIHRoaXMuZGlhbG9nLm9wZW4oKS50aGVuKGZvcm1EYXRhID0+IHtcclxuICAgICAga2V5ID0gTnVtYmVyKGZvcm1EYXRhLmdldCgnbnVtYmVyJykpO1xyXG4gICAgICB0aGlzLml0ZXJhdGUoKTtcclxuICAgIH0sICgpID0+IHRoaXMuaXRlcmF0ZSgpKTtcclxuICAgIHlpZWxkICdEaWFsb2cgb3BlbmVkJzsgLy9za2lwIGluIHByb21pc2VcclxuICAgIGlmIChrZXkgPiA5OSB8fCBrZXkgPCAwKSB7XHJcbiAgICAgIHJldHVybiAnRVJST1I6IGNhblxcJ3QgaW5zZXJ0LiBOZWVkIGtleSBiZXR3ZWVuIDAgYW5kIDk5OSc7XHJcbiAgICB9XHJcbiAgICB5aWVsZCBgV2lsbCBpbnNlcnQgbm9kZSB3aXRoIGtleSAke2tleX1gO1xyXG4gICAgbGV0IGluZGV4ID0gdGhpcy5sZW5ndGg7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSBpbmRleDtcclxuICAgIHlpZWxkICdQbGFjZWQgbm9kZSBpbiBmaXJzdCBlbXB0eSBjZWxsJztcclxuICAgIHlpZWxkKiB0aGlzLnRyaWNrbGVVcChrZXksIGluZGV4KTtcclxuICAgIHlpZWxkICdJbnNlcnRlZCBuZXcgbm9kZSBpbiBlbXB0eSBub2RlJztcclxuICAgIHRoaXMubWFya2VyLnBvc2l0aW9uID0gMDtcclxuICAgIHRoaXMubGVuZ3RoKys7XHJcbiAgfVxyXG5cclxuICAqIHRyaWNrbGVEb3duKGluZGV4LCBpc0NoZykge1xyXG4gICAgY29uc3Qgcm9vdE5vZGUgPSBuZXcgSXRlbSh0aGlzLml0ZW1zW2luZGV4XSk7XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XS5zZXRWYWx1ZSgnJywgJyNmZmZmZmYnKTtcclxuICAgIHlpZWxkIGBTYXZlZCAke2lzQ2hnID8gJ2NoYW5nZWQnIDogJ3Jvb3QnfSBub2RlICgke3Jvb3ROb2RlLnZhbHVlfSlgO1xyXG4gICAgd2hpbGUoaW5kZXggPCBNYXRoLmZsb29yKHRoaXMubGVuZ3RoIC8gMikpIHsgLy9ub2RlIGhhcyBhdCBsZWFzdCBvbmUgY2hpbGRcclxuICAgICAgbGV0IGxhcmdlckNoaWxkO1xyXG4gICAgICBjb25zdCBsZWZ0Q2hpbGQgPSBpbmRleCAqIDIgKyAxO1xyXG4gICAgICBjb25zdCByaWdodENoaWxkID0gbGVmdENoaWxkICsgMTtcclxuICAgICAgaWYgKHJpZ2h0Q2hpbGQgPCB0aGlzLmxlbmd0aCAmJiB0aGlzLml0ZW1zW2xlZnRDaGlsZF0udmFsdWUgPCB0aGlzLml0ZW1zW3JpZ2h0Q2hpbGRdLnZhbHVlKSB7XHJcbiAgICAgICAgbGFyZ2VyQ2hpbGQgPSByaWdodENoaWxkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxhcmdlckNoaWxkID0gbGVmdENoaWxkO1xyXG4gICAgICB9XHJcbiAgICAgIHlpZWxkIGBLZXkgJHt0aGlzLml0ZW1zW2xhcmdlckNoaWxkXS52YWx1ZX0gaXMgbGFyZ2VyIGNoaWxkYDtcclxuICAgICAgaWYgKHRoaXMuaXRlbXNbbGFyZ2VyQ2hpbGRdLnZhbHVlIDwgcm9vdE5vZGUudmFsdWUpIHtcclxuICAgICAgICB5aWVsZCBgJHtpc0NoZyA/ICdDaGFuZ2VkJyA6ICdcIkxhc3RcIid9IG5vZGUgbGFyZ2VyOyB3aWxsIGluc2VydCBpdGA7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5pdGVtc1tsYXJnZXJDaGlsZF0uc3dhcFdpdGgodGhpcy5pdGVtc1tpbmRleF0pO1xyXG4gICAgICBpbmRleCA9IGxhcmdlckNoaWxkO1xyXG4gICAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGluZGV4O1xyXG4gICAgICB5aWVsZCAnTW92ZWQgZW1wdHkgbm9kZSBkb3duJztcclxuICAgIH1cclxuICAgIGlmIChNYXRoLmZsb29yKE1hdGgubG9nMih0aGlzLmxlbmd0aCkpID09PSBNYXRoLmZsb29yKE1hdGgubG9nMihpbmRleCArIDEpKSkge1xyXG4gICAgICB5aWVsZCAnUmVhY2hlZCBib3R0b20gcm93LCBzbyBkb25lJztcclxuICAgIH0gZWxzZSBpZiAoaW5kZXggPj0gTWF0aC5mbG9vcih0aGlzLmxlbmd0aCAvIDIpKSB7XHJcbiAgICAgIHlpZWxkICdOb2RlIGhhcyBubyBjaGlsZHJlbiwgc28gZG9uZSc7XHJcbiAgICB9XHJcbiAgICB0aGlzLml0ZW1zW2luZGV4XSA9IHJvb3ROb2RlO1xyXG4gICAgeWllbGQgYEluc2VydGVkICR7aXNDaGcgPyAnY2hhbmdlZCcgOiAnXCJsYXN0XCInfSBub2RlYDtcclxuICB9XHJcblxyXG4gICogaXRlcmF0b3JSZW0oKSB7XHJcbiAgICBsZXQgaW5kZXggPSAwO1xyXG4gICAgY29uc3QgcmVtb3ZlZEtleSA9IHRoaXMuaXRlbXNbaW5kZXhdLnZhbHVlO1xyXG4gICAgeWllbGQgYFdpbGwgcmVtb3ZlIGxhcmdlc3Qgbm9kZSAoJHtyZW1vdmVkS2V5fSlgO1xyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0uc2V0VmFsdWUoJycsICcjZmZmZmZmJyk7XHJcbiAgICBjb25zdCBsYXN0Tm9kZSA9IHRoaXMuaXRlbXNbdGhpcy5sZW5ndGggLSAxXTtcclxuICAgIHlpZWxkIGBXaWxsIHJlcGxhY2Ugd2l0aCBcImxhc3RcIiBub2RlICgke2xhc3ROb2RlLnZhbHVlfSlgO1xyXG4gICAgdGhpcy5pdGVtc1tpbmRleF0ubW92ZUZyb20obGFzdE5vZGUpO1xyXG4gICAgdGhpcy5sZW5ndGgtLTtcclxuICAgIHlpZWxkICdXaWxsIHRyaWNrbGUgZG93bic7XHJcbiAgICB5aWVsZCogdGhpcy50cmlja2xlRG93bihpbmRleCk7XHJcbiAgICB5aWVsZCBgRmluaXNoZWQgZGVsZXRpbmcgbGFyZ2VzdCBub2RlICgke3JlbW92ZWRLZXl9KWA7XHJcbiAgICB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IDA7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yQ2huZygpIHtcclxuICAgIHRoaXMudHJlZS5jbGlja0ZuID0gaXRlbSA9PiB0aGlzLm1hcmtlci5wb3NpdGlvbiA9IGl0ZW0uaW5kZXg7XHJcbiAgICB5aWVsZCAnQ2xpY2sgb24gbm9kZSB0byBiZSBjaGFuZ2VkJztcclxuICAgIHRoaXMudHJlZS5jbGlja0ZuID0gbnVsbDtcclxuICAgIGNvbnN0IHRvcCA9IHRoaXMubWFya2VyLnBvc2l0aW9uO1xyXG4gICAgY29uc3QgY2hhbmdpbmdLZXkgPSB0aGlzLml0ZW1zW3RvcF0udmFsdWU7XHJcbiAgICB5aWVsZCAnVHlwZSBub2RlXFwncyBuZXcgdmFsdWUnO1xyXG4gICAgbGV0IGtleSA9IDA7XHJcbiAgICB0aGlzLmRpYWxvZy5vcGVuKCkudGhlbihmb3JtRGF0YSA9PiB7XHJcbiAgICAgIGtleSA9IE51bWJlcihmb3JtRGF0YS5nZXQoJ251bWJlcicpKTtcclxuICAgICAgdGhpcy5pdGVyYXRlKCk7XHJcbiAgICB9LCAoKSA9PiB0aGlzLml0ZXJhdGUoKSk7XHJcbiAgICB5aWVsZCAnRGlhbG9nIG9wZW5lZCc7IC8vc2tpcCBpbiBwcm9taXNlXHJcbiAgICBpZiAoa2V5ID4gOTkgfHwga2V5IDwgMCkge1xyXG4gICAgICByZXR1cm4gJ0VSUk9SOiBjYW5cXCd0IGluc2VydC4gTmVlZCBrZXkgYmV0d2VlbiAwIGFuZCA5OTknO1xyXG4gICAgfVxyXG4gICAgeWllbGQgYFdpbGwgY2hhbmdlIG5vZGUgZnJvbSAke2NoYW5naW5nS2V5fSB0byAke2tleX1gO1xyXG4gICAgaWYgKHRoaXMuaXRlbXNbdG9wXS52YWx1ZSA+IGtleSkge1xyXG4gICAgICB0aGlzLml0ZW1zW3RvcF0uc2V0VmFsdWUoa2V5KTtcclxuICAgICAgeWllbGQgJ0tleSBkZWNyZWFzZWQ7IHdpbGwgdHJpY2tsZSBkb3duJztcclxuICAgICAgeWllbGQqIHRoaXMudHJpY2tsZURvd24odG9wLCB0cnVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuaXRlbXNbdG9wXS5zZXRWYWx1ZShrZXkpO1xyXG4gICAgICB5aWVsZCAnS2V5IGluY3JlYXNlZDsgd2lsbCB0cmlja2xlIHVwJztcclxuICAgICAgeWllbGQqIHRoaXMudHJpY2tsZVVwKGtleSwgdG9wKTtcclxuICAgIH1cclxuICAgIHlpZWxkIGBGaW5pc2hlZCBjaGFuZ2luZyBub2RlICgke2NoYW5naW5nS2V5fSlgO1xyXG4gICAgdGhpcy5tYXJrZXIucG9zaXRpb24gPSAwO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWhlYXAnLCBQYWdlSGVhcCk7IiwiaW1wb3J0IHtJdGVtfSBmcm9tICcuL2l0ZW0nO1xyXG5cclxuZXhwb3J0IGNsYXNzIFZlcnRleCBleHRlbmRzIEl0ZW0ge1xyXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcclxuICAgIHN1cGVyKG9wdGlvbnMpO1xyXG4gICAgdGhpcy54ID0gb3B0aW9ucy54O1xyXG4gICAgdGhpcy55ID0gb3B0aW9ucy55O1xyXG4gIH1cclxufSIsImltcG9ydCB7TGl0RWxlbWVudCwgc3ZnLCBodG1sLCBjc3N9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtWZXJ0ZXh9IGZyb20gJy4uL2NsYXNzZXMvdmVydGV4JztcclxuaW1wb3J0ICcuL2RpYWxvZyc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zR3JhcGggZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBsaW1pdDoge3R5cGU6IE51bWJlcn0sXHJcbiAgICAgIGl0ZW1zOiB7dHlwZTogQXJyYXl9LFxyXG4gICAgICBjb25uZWN0aW9uczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgbWFya2VkQ29ubmVjdGlvbnM6IHt0eXBlOiBBcnJheX0sXHJcbiAgICAgIGNsaWNrRm46IHt0eXBlOiBGdW5jdGlvbn0sXHJcbiAgICAgIGRpcmVjdGVkOiB7dHlwZTogQm9vbGVhbn0sXHJcbiAgICAgIHdlaWdodGVkOiB7dHlwZTogQm9vbGVhbn1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBnZXROb0Nvbm5lY3Rpb25WYWx1ZSgpIHtcclxuICAgIHJldHVybiB0aGlzLndlaWdodGVkID8gSW5maW5pdHkgOiAwO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIHN2Z2BcclxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDYwMCA0MDBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcclxuICAgICAgICBAZGJsY2xpY2s9JHt0aGlzLmRibGNsaWNrSGFuZGxlcn1cclxuICAgICAgICBAbW91c2Vkb3duPSR7KGUpID0+IGUucHJldmVudERlZmF1bHQoKX1cclxuICAgICAgICBAbW91c2V1cD0ke3RoaXMuZHJhZ2VuZEhhbmRsZXJ9XHJcbiAgICAgICAgQG1vdXNlbW92ZT0ke3RoaXMuZHJhZ0hhbmRsZXJ9XHJcbiAgICAgID5cclxuICAgICAgICAke3RoaXMuZHJhZ09wdHMgIT0gbnVsbCAmJiB0aGlzLmRyYWdPcHRzLmlzQ29ubmVjdGlvbiA/IHN2Z2BcclxuICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIHgxPVwiJHt0aGlzLmRyYWdPcHRzLmRyYWdJdGVtLnh9XCIgeTE9XCIke3RoaXMuZHJhZ09wdHMuZHJhZ0l0ZW0ueX1cIiB4Mj1cIiR7dGhpcy5kcmFnT3B0cy54fVwiIHkyPVwiJHt0aGlzLmRyYWdPcHRzLnl9XCI+PC9saW5lPlxyXG4gICAgICAgIGAgOiAnJ31cclxuICAgICAgICAke3RoaXMuZHJhd0Nvbm5lY3Rpb25zKGZhbHNlKX1cclxuICAgICAgICAke3RoaXMuZHJhd0Nvbm5lY3Rpb25zKHRydWUpfVxyXG4gICAgICAgICR7dGhpcy5kcmF3SXRlbXMoKX1cclxuICAgICAgPC9zdmc+XHJcbiAgICAgICR7aHRtbGBcclxuICAgICAgICA8eC1kaWFsb2c+XHJcbiAgICAgICAgICA8bGFiZWw+V2VpZ2h0ICgw4oCUOTkpOiA8aW5wdXQgbmFtZT1cIm51bWJlclwiIHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiOTlcIiBzdGVwPVwiMVwiPjwvbGFiZWw+XHJcbiAgICAgICAgPC94LWRpYWxvZz5gfVxyXG4gICAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcigneC1kaWFsb2cnKTtcclxuICB9XHJcblxyXG4gIGRyYXdJdGVtcygpIHtcclxuICAgIHJldHVybiB0aGlzLml0ZW1zLm1hcChpdGVtID0+IHN2Z2BcclxuICAgICAgPGcgZmlsbD1cIiR7aXRlbS5jb2xvcn1cIj5cclxuICAgICAgICA8Z1xyXG4gICAgICAgICAgY2xhc3M9XCJpdGVtR3JvdXAgJHt0aGlzLmNsaWNrRm4gIT0gbnVsbCA/ICdjbGlja2FibGUnIDogJyd9XCJcclxuICAgICAgICAgIEBjbGljaz0ke3RoaXMuY2xpY2tIYW5kbGVyLmJpbmQodGhpcywgaXRlbSl9XHJcbiAgICAgICAgICBAbW91c2Vkb3duPSR7KGUpID0+IHRoaXMuZHJhZ3N0YXJ0SGFuZGxlcihlLCBpdGVtKX1cclxuICAgICAgICAgIEBtb3VzZXVwPSR7KGUpID0+IHRoaXMuZHJhZ2VuZEhhbmRsZXIoZSwgaXRlbSl9XHJcbiAgICAgICAgICBAbW91c2Vtb3ZlPSR7dGhpcy5pdGVtSG92ZXJIYW5kbGVyfVxyXG4gICAgICAgICAgQG1vdXNlbGVhdmU9JHt0aGlzLml0ZW1MZWF2ZUhhbmRsZXJ9XHJcbiAgICAgICAgPlxyXG4gICAgICAgICAgPGNpcmNsZSBjbGFzcz1cIml0ZW0gJHtpdGVtLm1hcmsgPyAnbWFya2VkJyA6ICcnfVwiIGN4PVwiJHtpdGVtLnh9XCIgY3k9XCIke2l0ZW0ueX1cIiByPVwiMTJcIj48L2NpcmNsZT5cclxuICAgICAgICAgIDx0ZXh0IGNsYXNzPVwidmFsdWUgJHtpdGVtLm1hcmsgPyAnbWFya2VkJyA6ICcnfVwiIHg9XCIke2l0ZW0ueH1cIiB5PVwiJHtpdGVtLnkgKyAyfVwiIHRleHQtYW5jaG9yPVwibWlkZGxlXCIgYWxpZ25tZW50LWJhc2VsaW5lPVwibWlkZGxlXCI+JHtpdGVtLnZhbHVlfTwvdGV4dD5cclxuICAgICAgICA8L2c+XHJcbiAgICAgIDwvZz5cclxuICAgIGApO1xyXG4gIH1cclxuXHJcbiAgZHJhd0Nvbm5lY3Rpb25zKGlzTWFya2VkKSB7XHJcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xyXG4gICAgY29uc3QgY29ubmVjdGlvbnMgPSBpc01hcmtlZCA/IHRoaXMubWFya2VkQ29ubmVjdGlvbnMgOiB0aGlzLmNvbm5lY3Rpb25zO1xyXG4gICAgaWYgKCFjb25uZWN0aW9ucykgcmV0dXJuO1xyXG4gICAgY29ubmVjdGlvbnMuZm9yRWFjaCgocm93LCBpKSA9PiB7XHJcbiAgICAgIHJvdy5mb3JFYWNoKCh2YWwsIGopID0+IHtcclxuICAgICAgICBpZiAodmFsICE9PSB0aGlzLmdldE5vQ29ubmVjdGlvblZhbHVlKCkpIHtcclxuICAgICAgICAgIGxpbmVzLnB1c2goc3ZnYFxyXG4gICAgICAgICAgICA8bGluZVxyXG4gICAgICAgICAgICAgIGNsYXNzPVwibGluZSAke2lzTWFya2VkID8gJ21hcmtlZCcgOiAnJ31cIlxyXG4gICAgICAgICAgICAgIHgxPVwiJHt0aGlzLml0ZW1zW2ldLnh9XCJcclxuICAgICAgICAgICAgICB5MT1cIiR7dGhpcy5pdGVtc1tpXS55fVwiXHJcbiAgICAgICAgICAgICAgeDI9XCIke3RoaXMuaXRlbXNbal0ueH1cIlxyXG4gICAgICAgICAgICAgIHkyPVwiJHt0aGlzLml0ZW1zW2pdLnl9XCJcclxuICAgICAgICAgICAgPjwvbGluZT5cclxuICAgICAgICAgICAgJHt0aGlzLmRpcmVjdGVkID8gdGhpcy5kcmF3RGlyZWN0aW9uTWFya2VyKHRoaXMuaXRlbXNbaV0sIHRoaXMuaXRlbXNbal0pIDogJyd9XHJcbiAgICAgICAgICAgICR7dGhpcy53ZWlnaHRlZCA/IHRoaXMuZHJhd1dlaWdodE1hcmtlcih0aGlzLml0ZW1zW2ldLCB0aGlzLml0ZW1zW2pdLCB2YWwpIDogJyd9XHJcbiAgICAgICAgICBgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbGluZXM7XHJcbiAgfVxyXG5cclxuICBkcmF3RGlyZWN0aW9uTWFya2VyKHAxLCBwMikge1xyXG4gICAgY29uc3Qgc3RlcCA9IDIwO1xyXG4gICAgY29uc3QgcHggPSBwMS54IC0gcDIueDtcclxuICAgIGNvbnN0IHB5ID0gcDEueSAtIHAyLnk7XHJcbiAgICBsZXQgYW5nbGUgPSAtIE1hdGguYXRhbihweSAvIHB4KSAtIE1hdGguUEkgKiAocHggPj0gMCA/IDEuNSA6IDAuNSk7XHJcbiAgICBjb25zdCB4ID0gcDIueCArIHN0ZXAgKiBNYXRoLnNpbihhbmdsZSk7XHJcbiAgICBjb25zdCB5ID0gcDIueSArIHN0ZXAgKiBNYXRoLmNvcyhhbmdsZSk7XHJcbiAgICByZXR1cm4gc3ZnYFxyXG4gICAgICA8Y2lyY2xlIGNsYXNzPVwiZGlyZWN0aW9uTWFya2VyXCIgY3g9XCIke3h9XCIgY3k9XCIke3l9XCIgcj1cIjNcIj48L2NpcmNsZT5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBkcmF3V2VpZ2h0TWFya2VyKHAxLCBwMiwgdykge1xyXG4gICAgY29uc3QgeCA9IChwMS54ICsgcDIueCkgLyAyO1xyXG4gICAgY29uc3QgeSA9ICAocDEueSArIHAyLnkpIC8gMjtcclxuICAgIHJldHVybiBzdmdgXHJcbiAgICAgIDxyZWN0IGNsYXNzPVwid2VpZ2h0UmVjdFwiIHg9XCIke3ggLSA5fVwiIHk9XCIke3kgLSA5fVwiIHdpZHRoPVwiMThcIiBoZWlnaHQ9XCIxOFwiLz5cclxuICAgICAgPHRleHQgY2xhc3M9XCJ3ZWlnaHRUZXh0XCIgeD1cIiR7eH1cIiB5PVwiJHt5ICsgMX1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIGFsaWdubWVudC1iYXNlbGluZT1cIm1pZGRsZVwiPiR7d308L3RleHQ+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZGJsY2xpY2tIYW5kbGVyKGUpIHtcclxuICAgIGlmICh0aGlzLmRyYWdPcHRzICE9IG51bGwgfHwgdGhpcy5saW1pdCA9PT0gdGhpcy5pdGVtcy5sZW5ndGgpIHJldHVybjtcclxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pdGVtcy5sZW5ndGg7XHJcbiAgICBjb25zdCBpdGVtID0gbmV3IFZlcnRleCh7XHJcbiAgICAgIGluZGV4LFxyXG4gICAgICB4OiBlLm9mZnNldFgsXHJcbiAgICAgIHk6IGUub2Zmc2V0WVxyXG4gICAgfSk7XHJcbiAgICBpdGVtLnNldFZhbHVlKFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpbmRleCkpO1xyXG4gICAgdGhpcy5pdGVtcy5wdXNoKGl0ZW0pO1xyXG5cclxuICAgIHRoaXMuY29ubmVjdGlvbnMucHVzaChuZXcgQXJyYXkodGhpcy5jb25uZWN0aW9ucy5sZW5ndGgpLmZpbGwodGhpcy5nZXROb0Nvbm5lY3Rpb25WYWx1ZSgpKSk7XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zLmZvckVhY2goYyA9PiBjLnB1c2godGhpcy5nZXROb0Nvbm5lY3Rpb25WYWx1ZSgpKSk7XHJcblxyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlZCcpKTtcclxuICAgIHRoaXMucmVxdWVzdFVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgZHJhZ3N0YXJ0SGFuZGxlcihlLCBpdGVtKSB7XHJcbiAgICB0aGlzLmRyYWdPcHRzID0ge1xyXG4gICAgICBpbml0aWFsWDogZS5jbGllbnRYLFxyXG4gICAgICBpbml0aWFsWTogZS5jbGllbnRZLFxyXG4gICAgICBkcmFnSXRlbTogaXRlbSxcclxuICAgICAgaXNDb25uZWN0aW9uOiAhZS5jdHJsS2V5XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZHJhZ0hhbmRsZXIoZSkge1xyXG4gICAgaWYgKHRoaXMuZHJhZ09wdHMgPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMuZHJhZ09wdHMuaXNDb25uZWN0aW9uKSB7XHJcbiAgICAgIHRoaXMuZHJhZ09wdHMueCA9IGUub2Zmc2V0WDtcclxuICAgICAgdGhpcy5kcmFnT3B0cy55ID0gZS5vZmZzZXRZO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5kcmFnT3B0cy5kcmFnSXRlbS54ID0gZS5vZmZzZXRYO1xyXG4gICAgICB0aGlzLmRyYWdPcHRzLmRyYWdJdGVtLnkgPSBlLm9mZnNldFk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcclxuICB9XHJcblxyXG4gIGRyYWdlbmRIYW5kbGVyKGUsIGl0ZW0pIHtcclxuICAgIGlmICh0aGlzLmRyYWdPcHRzID09IG51bGwpIHJldHVybjtcclxuICAgIGlmICh0aGlzLmRyYWdPcHRzICYmIGl0ZW0gJiYgaXRlbSAhPT0gdGhpcy5kcmFnT3B0cy5kcmFnSXRlbSAmJiB0aGlzLmRyYWdPcHRzLmlzQ29ubmVjdGlvbikge1xyXG4gICAgICBjb25zdCBkcmFnSXRlbSA9IHRoaXMuZHJhZ09wdHMuZHJhZ0l0ZW07XHJcbiAgICAgIGlmICh0aGlzLndlaWdodGVkKSB7XHJcbiAgICAgICAgdGhpcy5kaWFsb2cub3BlbigpLnRoZW4oZm9ybURhdGEgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jcmVhdGVDb25uZWN0aW9uKGRyYWdJdGVtLCBpdGVtLCBOdW1iZXIoZm9ybURhdGEuZ2V0KCdudW1iZXInKSkpO1xyXG4gICAgICAgICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgICAgICAgfSwgKCkgPT4gdGhpcy5yZXF1ZXN0VXBkYXRlKCkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvbihkcmFnSXRlbSwgaXRlbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuZHJhZ09wdHMgPSBudWxsO1xyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVDb25uZWN0aW9uKGl0ZW0xLCBpdGVtMiwgd2VpZ2h0ID0gMSkge1xyXG4gICAgdGhpcy5jb25uZWN0aW9uc1tpdGVtMS5pbmRleF1baXRlbTIuaW5kZXhdID0gd2VpZ2h0O1xyXG4gICAgaWYgKCF0aGlzLmRpcmVjdGVkKSB7XHJcbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbaXRlbTIuaW5kZXhdW2l0ZW0xLmluZGV4XSA9IHdlaWdodDtcclxuICAgIH1cclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZWQnKSk7XHJcbiAgfVxyXG5cclxuICBjbGlja0hhbmRsZXIoaXRlbSkge1xyXG4gICAgaWYgKHRoaXMuY2xpY2tGbiAhPSBudWxsKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNsaWNrRm4oaXRlbSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpdGVtSG92ZXJIYW5kbGVyKGUpIHtcclxuICAgIGlmIChlLmN0cmxLZXkpIHtcclxuICAgICAgZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2RyYWdnYWJsZScpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZS5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnYWJsZScpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpdGVtTGVhdmVIYW5kbGVyKGUpIHtcclxuICAgIGUudGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnYWJsZScpO1xyXG4gIH1cclxufVxyXG5cclxuWEl0ZW1zR3JhcGguc3R5bGVzID0gY3NzYFxyXG4gIDpob3N0IHtcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgaGVpZ2h0OiA0MDBweDtcclxuICAgIHdpZHRoOiA2MDBweDtcclxuICAgIGJvcmRlcjogMXB4IGdyYXkgc29saWQ7XHJcbiAgfVxyXG4gIHN2ZyB7XHJcbiAgICB3aWR0aDogMTAwJTtcclxuICAgIGhlaWdodDogMTAwJTtcclxuICB9XHJcbiAgLml0ZW1Hcm91cCB7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgfVxyXG4gIC5pdGVtIHtcclxuICAgIHN0cm9rZTogYmxhY2s7XHJcbiAgfVxyXG4gIC5pdGVtLm1hcmtlZCB7XHJcbiAgICBzdHJva2U6IHJlZDtcclxuICAgIHN0cm9rZS13aWR0aDogM3B4O1xyXG4gIH1cclxuICAuY2xpY2thYmxlIHtcclxuICAgIHN0cm9rZS13aWR0aDogM3B4O1xyXG4gIH1cclxuICAuZHJhZ2dhYmxlIHtcclxuICAgIGN1cnNvcjogZ3JhYjtcclxuICB9XHJcbiAgLnZhbHVlIHtcclxuICAgIGZvbnQ6IG5vcm1hbCAxM3B4IHNhbnMtc2VyaWY7XHJcbiAgICBmaWxsOiBibGFjaztcclxuICAgIHN0cm9rZTogbm9uZTtcclxuICB9XHJcbiAgLnZhbHVlLm1hcmtlZCB7XHJcbiAgICBmaWxsOiByZWQ7XHJcbiAgfVxyXG4gIC5saW5lIHtcclxuICAgIHN0cm9rZTogYmxhY2s7XHJcbiAgfVxyXG4gIC5saW5lLm1hcmtlZCB7XHJcbiAgICBzdHJva2Utd2lkdGg6IDNweDtcclxuICB9XHJcbiAgLmRpcmVjdGlvbk1hcmtlciB7XHJcbiAgICBzdHJva2U6IGJsYWNrO1xyXG4gICAgc3Ryb2tlLXdpZHRoOiAycHg7XHJcbiAgICBmaWxsOiBibGFjaztcclxuICB9XHJcbiAgLndlaWdodFJlY3Qge1xyXG4gICAgc3Ryb2tlOiBibGFjaztcclxuICAgIHN0cm9rZS13aWR0aDogMXB4O1xyXG4gICAgZmlsbDogYmlzcXVlO1xyXG4gIH1cclxuICAud2VpZ2h0VGV4dCB7XHJcbiAgICBmb250OiBub3JtYWwgMTJweCBzYW5zLXNlcmlmO1xyXG4gICAgZmlsbDogYmxhY2s7XHJcbiAgICBzdHJva2U6IG5vbmU7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLWdyYXBoJywgWEl0ZW1zR3JhcGgpOyIsImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgY3NzfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcblxyXG5leHBvcnQgY2xhc3MgWEl0ZW1zVGFibGUgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczoge3R5cGU6IEFycmF5fSxcclxuICAgICAgY29ubmVjdGlvbnM6IHt0eXBlOiBBcnJheX1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPHRhYmxlPlxyXG4gICAgICAgICR7dGhpcy5yZW5kZXJIZWFkZXIoKX1cclxuICAgICAgICAke3RoaXMuaXRlbXMubWFwKGl0ZW0gPT4gdGhpcy5yZW5kZXJSb3coaXRlbS52YWx1ZSwgdGhpcy5jb25uZWN0aW9uc1tpdGVtLmluZGV4XSkpfVxyXG4gICAgICA8L3RhYmxlPlxyXG4gICAgYDtcclxuICB9XHJcblxyXG4gIHJlbmRlckhlYWRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8dHI+XHJcbiAgICAgICAgPHRoPjwvdGg+XHJcbiAgICAgICAgJHt0aGlzLml0ZW1zLm1hcChpdGVtID0+IGh0bWxgPHRoPiR7aXRlbS52YWx1ZX08L3RoPmApfVxyXG4gICAgICA8L3RyPlxyXG4gICAgYDtcclxuICB9XHJcbiAgXHJcbiAgcmVuZGVyUm93KHZhbHVlLCBjb25uZWN0aW9ucykge1xyXG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXR1cm4gaHRtbGBcclxuICAgICAgICA8dHI+XHJcbiAgICAgICAgICA8dGQ+JHt2YWx1ZX08L3RkPlxyXG4gICAgICAgICAgJHt0aGlzLml0ZW1zLm1hcChpdGVtID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgd2VpZ2h0ID0gY29ubmVjdGlvbnNbaXRlbS5pbmRleF0udG9TdHJpbmcoKS5zbGljZSgwLDMpO1xyXG4gICAgICAgICAgICByZXR1cm4gaHRtbGA8dGQ+JHt3ZWlnaHR9PC90ZD5gO1xyXG4gICAgICAgICAgfSl9XHJcbiAgICAgICAgPC90cj5cclxuICAgICAgYDtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcblhJdGVtc1RhYmxlLnN0eWxlcyA9IGNzc2BcclxuICA6aG9zdCB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIGhlaWdodDogNDAwcHg7XHJcbiAgICB3aWR0aDogNjAwcHg7XHJcbiAgICBiYWNrZ3JvdW5kOiBwYXBheWF3aGlwO1xyXG4gIH1cclxuICB0YWJsZSB7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xyXG4gIH1cclxuICB0aCwgdGQge1xyXG4gICAgcGFkZGluZzogMnB4IDVweDtcclxuICB9XHJcbiAgdGgge1xyXG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgYmxhY2s7XHJcbiAgfVxyXG4gIHRkIHtcclxuICAgICAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcclxuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gIH1cclxuICB0ciB0ZDpmaXJzdC1jaGlsZCxcclxuICB0ciB0aDpmaXJzdC1jaGlsZCB7XHJcbiAgICBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCBibGFjaztcclxuICAgIGZvbnQtZmFtaWx5OiBzYW5zLXNlcmlmO1xyXG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgfVxyXG5gO1xyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWl0ZW1zLXRhYmxlJywgWEl0ZW1zVGFibGUpOyIsImltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNHcmFwaCc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1RhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlR3JhcGhOIGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLm1hcmtlZENvbm5lY3Rpb25zID0gW107XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gW107XHJcbiAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgICB0aGlzLmNsaWNrRm4gPSBudWxsO1xyXG4gIH1cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGg0Pk5vbi1EaXJlY3RlZCBOb24tV2VpZ2h0ZWQgR3JhcGg8L2g0PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMubmV3R3JhcGguYmluZCh0aGlzKX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JERlMpfT5ERlM8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvckJGUyl9PkJGUzwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzLCB0aGlzLml0ZXJhdG9yTVNUKX0+VHJlZTwveC1idXR0b24+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMudG9nZ2xlVmlldy5iaW5kKHRoaXMpfT5WaWV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1pbmZvPlxyXG4gICAgICAgICAgPHA+PGI+RG91YmxlLWNsaWNrPC9iPiB0byBjcmVhdGUgbmV3IHZlcnRleDwvcD5cclxuICAgICAgICAgIDxwPjxiPkRyYWc8L2I+IGZyb20gdmVydGV4IHRvIHZlcnRleCB0byBjcmVhdGUgZWRnZTwvcD5cclxuICAgICAgICAgIDxwPjxiPkRyYWcgKyBDdHJsPC9iPiBtb3ZlcyB2ZXJ0ZXg8L3A+XHJcbiAgICAgICAgICA8cD48Yj5OZXc8L2I+IGNsZWFycyBhbiBvbGQgZ3JhcGg8L3A+XHJcbiAgICAgICAgICA8cD48Yj5ERlM8L2I+IGNhcnJpZXMgb3V0IERlcHRoIEZpcnN0IFNlYXJjaDwvcD5cclxuICAgICAgICAgIDxwPjxiPkJGUzwvYj4gY2FycmllcyBvdXQgQnJlYWR0aCBGaXJzdCBTZWFyY2g8L3A+XHJcbiAgICAgICAgICA8cD48Yj5UcmVlPC9iPiBjcmVhdGVzIG1pbmltdW0gc3Bhbm5pbmcgdHJlZTwvcD5cclxuICAgICAgICAgIDxwPjxiPlZpZXc8L2I+IHRvZ2dsZXMgYmV0d2VlbiBncmFwaCBhbmQgYWRqYWNlbmN5IG1hdHJpeDwvcD5cclxuICAgICAgICA8L3gtaW5mbz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJtYWluLWNvbnNvbGVcIiBkZWZhdWx0TWVzc2FnZT1cIkRvdWJsZS1jbGljayBtb3VzZSB0byBtYWtlIHZlcnRleC4gRHJhZyB0byBtYWtlIGFuIGVkZ2UuIERyYWcgKyBDdHJsIHRvIG1vdmUgdmVydGV4LlwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwiY29uc29sZS1zdGF0c1wiIGRlZmF1bHRNZXNzYWdlPVwi4oCUXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWl0ZW1zLWdyYXBoXHJcbiAgICAgICAgLml0ZW1zPSR7dGhpcy5pdGVtc31cclxuICAgICAgICAuY29ubmVjdGlvbnM9JHt0aGlzLmNvbm5lY3Rpb25zfVxyXG4gICAgICAgIC5tYXJrZWRDb25uZWN0aW9ucz0ke3RoaXMubWFya2VkQ29ubmVjdGlvbnN9XHJcbiAgICAgICAgLmNsaWNrRm49JHt0aGlzLmNsaWNrRm59XHJcbiAgICAgICAgbGltaXQ9XCIxOFwiXHJcbiAgICAgICAgQGNoYW5nZWQ9JHt0aGlzLmNoYW5nZWRIYW5kbGVyfVxyXG4gICAgICA+PC94LWl0ZW1zLWdyYXBoPlxyXG4gICAgICA8eC1pdGVtcy10YWJsZVxyXG4gICAgICAgIC5pdGVtcz0ke3RoaXMuaXRlbXN9XHJcbiAgICAgICAgLmNvbm5lY3Rpb25zPSR7dGhpcy5jb25uZWN0aW9uc31cclxuICAgICAgICBoaWRkZW5cclxuICAgICAgPjwveC1pdGVtcy10YWJsZT5cclxuICAgIGA7XHJcbiAgfVxyXG5cclxuICBmaXJzdFVwZGF0ZWQoKSB7XHJcbiAgICB0aGlzLmNvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5tYWluLWNvbnNvbGUnKTtcclxuICAgIHRoaXMuc3RhdENvbnNvbGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5jb25zb2xlLXN0YXRzJyk7XHJcbiAgICB0aGlzLnRhYmxlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLXRhYmxlJyk7XHJcbiAgICB0aGlzLmdyYXBoID0gdGhpcy5xdWVyeVNlbGVjdG9yKCd4LWl0ZW1zLWdyYXBoJyk7XHJcbiAgfVxyXG5cclxuICBjaGFuZ2VkSGFuZGxlcigpIHtcclxuICAgIHRoaXMudGFibGUucmVxdWVzdFVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgdG9nZ2xlVmlldygpIHtcclxuICAgIHRoaXMudGFibGUudG9nZ2xlQXR0cmlidXRlKCdoaWRkZW4nKTtcclxuICAgIHRoaXMuZ3JhcGgudG9nZ2xlQXR0cmlidXRlKCdoaWRkZW4nKTtcclxuICB9XHJcblxyXG4gIG5ld0dyYXBoKCkge1xyXG4gICAgaWYgKHRoaXMucmVuZXdDb25maXJtZWQpIHtcclxuICAgICAgdGhpcy5pbml0SXRlbXMoKTtcclxuICAgICAgdGhpcy5jb25uZWN0aW9ucyA9IFtdO1xyXG4gICAgICB0aGlzLmNvbnNvbGUuc2V0TWVzc2FnZSgpO1xyXG4gICAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmNvbnNvbGUuc2V0TWVzc2FnZSgnQVJFIFlPVSBTVVJFPyBQcmVzcyBhZ2FpbiB0byBjbGVhciBvbGQgZ3JhcGgnKTtcclxuICAgICAgdGhpcy5yZW5ld0NvbmZpcm1lZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJlcXVlc3RVcGRhdGUoKTtcclxuICB9XHJcblxyXG4gIGhhbmRsZUNsaWNrKCkge1xyXG4gICAgc3VwZXIuaGFuZGxlQ2xpY2soLi4uYXJndW1lbnRzKTtcclxuICAgIHRoaXMucmVuZXdDb25maXJtZWQgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJlc2V0KCkge1xyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4gaXRlbS5tYXJrID0gZmFsc2UpO1xyXG4gICAgdGhpcy5zdGF0Q29uc29sZS5zZXRNZXNzYWdlKCk7XHJcbiAgfVxyXG5cclxuICAqIGl0ZXJhdG9yU3RhcnRTZWFyY2goKSB7XHJcbiAgICBsZXQgc3RhcnRJdGVtO1xyXG4gICAgdGhpcy5jbGlja0ZuID0gaXRlbSA9PiB7XHJcbiAgICAgIHN0YXJ0SXRlbSA9IGl0ZW07XHJcbiAgICAgIHRoaXMuaXRlcmF0ZSgpO1xyXG4gICAgfTtcclxuICAgIHlpZWxkICdTaW5nbGUtY2xpY2sgb24gdmVydGV4IGZyb20gd2hpY2ggdG8gc3RhcnQnO1xyXG4gICAgdGhpcy5jbGlja0ZuID0gbnVsbDtcclxuICAgIGlmIChzdGFydEl0ZW0gPT0gbnVsbCkge1xyXG4gICAgICB5aWVsZCAnRVJST1I6IEl0ZW1cXCdzIG5vdCBjbGlja2VkLic7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHlpZWxkIGBZb3UgY2xpY2tlZCBvbiAke3N0YXJ0SXRlbS52YWx1ZX1gO1xyXG4gICAgcmV0dXJuIHN0YXJ0SXRlbTtcclxuICB9XHJcblxyXG4gIC8vREZTIC0gRGVwdGgtZmlyc3Qgc2VhcmNoXHJcbiAgKiBpdGVyYXRvckRGUyhpc1RyZWUpIHtcclxuICAgIGNvbnN0IHN0YXJ0SXRlbSA9IHlpZWxkKiB0aGlzLml0ZXJhdG9yU3RhcnRTZWFyY2goKTtcclxuICAgIGlmIChzdGFydEl0ZW0gPT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgY29uc3QgdmlzaXRzID0gW3N0YXJ0SXRlbV07XHJcbiAgICBjb25zdCBzdGFjayA9IFtzdGFydEl0ZW1dO1xyXG4gICAgc3RhcnRJdGVtLm1hcmsgPSB0cnVlO1xyXG4gICAgdGhpcy5zZXRTdGF0cyh2aXNpdHMsIHN0YWNrKTtcclxuICAgIHlpZWxkIGBTdGFydCBzZWFyY2ggZnJvbSB2ZXJ0ZXggJHtzdGFydEl0ZW0udmFsdWV9YDtcclxuXHJcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zdCBwcmV2SXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5nZXRBZGpVbnZpc2l0ZWRWZXJ0ZXgocHJldkl0ZW0pO1xyXG4gICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XHJcbiAgICAgICAgc3RhY2sucG9wKCk7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0cyh2aXNpdHMsIHN0YWNrKTtcclxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgeWllbGQgYFdpbGwgY2hlY2sgdmVydGljZXMgYWRqYWNlbnQgdG8gJHtzdGFja1tzdGFjay5sZW5ndGggLSAxXS52YWx1ZX1gO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB5aWVsZCAnTm8gbW9yZSB2ZXJ0aWNlcyB3aXRoIHVudmlzaXRlZCBuZWlnaGJvcnMnO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMCAmJiBpc1RyZWUgPT09IHRydWUpIHtcclxuICAgICAgICAgIHRoaXMubWFya2VkQ29ubmVjdGlvbnNbcHJldkl0ZW0uaW5kZXhdW2l0ZW0uaW5kZXhdID0gMTtcclxuICAgICAgICAgIHRoaXMubWFya2VkQ29ubmVjdGlvbnNbaXRlbS5pbmRleF1bcHJldkl0ZW0uaW5kZXhdID0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhY2sucHVzaChpdGVtKTtcclxuICAgICAgICB2aXNpdHMucHVzaChpdGVtKTtcclxuICAgICAgICBpdGVtLm1hcmsgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBzdGFjayk7XHJcbiAgICAgICAgeWllbGQgYFZpc2l0ZWQgdmVydGV4ICR7aXRlbS52YWx1ZX1gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoaXNUcmVlICE9PSB0cnVlKSB7XHJcbiAgICAgIHlpZWxkICdQcmVzcyBhZ2FpbiB0byByZXNldCBzZWFyY2gnO1xyXG4gICAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRBZGpVbnZpc2l0ZWRWZXJ0ZXgoaXRlbSkge1xyXG4gICAgY29uc3QgY29ubmVjdGVkSXRlbXMgPSB0aGlzLmNvbm5lY3Rpb25zW2l0ZW0uaW5kZXhdO1xyXG4gICAgbGV0IGZvdW5kID0gbnVsbDtcclxuICAgIGlmIChjb25uZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGZvdW5kID0gdGhpcy5pdGVtcy5maW5kKGl0ZW0gPT4ge1xyXG4gICAgICAgIHJldHVybiAhaXRlbS5tYXJrICYmIGNvbm5lY3RlZEl0ZW1zW2l0ZW0uaW5kZXhdID09PSAxO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBmb3VuZDtcclxuICB9XHJcblxyXG4gIHNldFN0YXRzKHZpc2l0cywgc3RhY2ssIHF1ZXVlKSB7XHJcbiAgICBpZiAoc3RhY2spXHJcbiAgICAgIHRoaXMuc3RhdENvbnNvbGUuc2V0TWVzc2FnZShgVmlzaXRzOiAke3Zpc2l0cy5tYXAoaSA9PiBpLnZhbHVlKS5qb2luKCcgJyl9LiBTdGFjazogKGItPnQpOiAke3N0YWNrLm1hcChpID0+IGkudmFsdWUpLmpvaW4oJyAnKX1gKTtcclxuICAgIGlmIChxdWV1ZSlcclxuICAgICAgdGhpcy5zdGF0Q29uc29sZS5zZXRNZXNzYWdlKGBWaXNpdHM6ICR7dmlzaXRzLm1hcChpID0+IGkudmFsdWUpLmpvaW4oJyAnKX0uIFF1ZXVlOiAoZi0+cik6ICR7cXVldWUubWFwKGkgPT4gaS52YWx1ZSkuam9pbignICcpfWApO1xyXG4gIH1cclxuXHJcbiAgLy9CRlMgLSBCcmVhZHRoLWZpcnN0IHNlYXJjaFxyXG4gICogaXRlcmF0b3JCRlMoKSB7XHJcbiAgICBjb25zdCBzdGFydEl0ZW0gPSB5aWVsZCogdGhpcy5pdGVyYXRvclN0YXJ0U2VhcmNoKCk7XHJcbiAgICBpZiAoc3RhcnRJdGVtID09IG51bGwpIHJldHVybjtcclxuICAgIGNvbnN0IHZpc2l0cyA9IFtzdGFydEl0ZW1dO1xyXG4gICAgY29uc3QgcXVldWUgPSBbc3RhcnRJdGVtXTtcclxuICAgIHN0YXJ0SXRlbS5tYXJrID0gdHJ1ZTtcclxuICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBudWxsLCBxdWV1ZSk7XHJcbiAgICB5aWVsZCBgU3RhcnQgc2VhcmNoIGZyb20gdmVydGV4ICR7c3RhcnRJdGVtLnZhbHVlfWA7XHJcblxyXG4gICAgbGV0IGN1cnJlbnRJdGVtID0gcXVldWUuc2hpZnQoKTtcclxuICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBudWxsLCBxdWV1ZSk7XHJcbiAgICB5aWVsZCBgV2lsbCBjaGVjayB2ZXJ0aWNlcyBhZGphY2VudCB0byAke3N0YXJ0SXRlbS52YWx1ZX1gO1xyXG5cclxuICAgIHdoaWxlIChjdXJyZW50SXRlbSAhPSBudWxsKSB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmdldEFkalVudmlzaXRlZFZlcnRleChjdXJyZW50SXRlbSk7XHJcbiAgICAgIGlmIChpdGVtID09IG51bGwpIHtcclxuICAgICAgICB5aWVsZCBgTm8gbW9yZSB1bnZpc2l0ZWQgdmVydGljZXMgYWRqYWNlbnQgdG8gJHtjdXJyZW50SXRlbS52YWx1ZX1gO1xyXG4gICAgICAgIGN1cnJlbnRJdGVtID0gcXVldWUuc2hpZnQoKTtcclxuICAgICAgICBpZiAoY3VycmVudEl0ZW0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgdGhpcy5zZXRTdGF0cyh2aXNpdHMsIG51bGwsIHF1ZXVlKTtcclxuICAgICAgICAgIHlpZWxkIGBXaWxsIGNoZWNrIHZlcnRpY2VzIGFkamFjZW50IHRvICR7Y3VycmVudEl0ZW0udmFsdWV9YDtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcXVldWUucHVzaChpdGVtKTtcclxuICAgICAgICB2aXNpdHMucHVzaChpdGVtKTtcclxuICAgICAgICBpdGVtLm1hcmsgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuc2V0U3RhdHModmlzaXRzLCBudWxsLCBxdWV1ZSk7XHJcbiAgICAgICAgeWllbGQgYFZpc2l0ZWQgdmVydGV4ICR7aXRlbS52YWx1ZX1gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB5aWVsZCAnUHJlc3MgYWdhaW4gdG8gcmVzZXQgc2VhcmNoJztcclxuICAgIHRoaXMucmVzZXQoKTtcclxuICB9XHJcblxyXG4gIC8vTVNUIC0gTWluaW11bSBTcGFubmluZyBUcmVlXHJcbiAgKiBpdGVyYXRvck1TVCgpIHtcclxuICAgIHRoaXMubWFya2VkQ29ubmVjdGlvbnMgPSB0aGlzLmNvbm5lY3Rpb25zLm1hcCgoKSA9PiBuZXcgQXJyYXkodGhpcy5jb25uZWN0aW9ucy5sZW5ndGgpLmZpbGwodGhpcy5ncmFwaC5nZXROb0Nvbm5lY3Rpb25WYWx1ZSgpKSk7XHJcbiAgICB5aWVsZCogdGhpcy5pdGVyYXRvckRGUyh0cnVlKTtcclxuICAgIHlpZWxkICdQcmVzcyBhZ2FpbiB0byBoaWRlIHVubWFya2VkIGVkZ2VzJztcclxuICAgIGNvbnN0IGNvbm5lY3Rpb25zID0gdGhpcy5jb25uZWN0aW9ucztcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSB0aGlzLm1hcmtlZENvbm5lY3Rpb25zO1xyXG4gICAgdGhpcy5tYXJrZWRDb25uZWN0aW9ucyA9IFtdO1xyXG4gICAgeWllbGQgJ01pbmltdW0gc3Bhbm5pbmcgdHJlZTsgUHJlc3MgYWdhaW4gdG8gcmVzZXQgdHJlZSc7XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gY29ubmVjdGlvbnM7XHJcbiAgICB0aGlzLnJlc2V0KCk7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtZ3JhcGgtbicsIFBhZ2VHcmFwaE4pOyIsImltcG9ydCB7UGFnZUJhc2V9IGZyb20gJy4vcGFnZUJhc2UnO1xyXG5pbXBvcnQge2h0bWx9IGZyb20gJ2xpdC1lbGVtZW50JztcclxuaW1wb3J0IHtWZXJ0ZXh9IGZyb20gJy4uL2NsYXNzZXMvdmVydGV4JztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNHcmFwaCc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1RhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlR3JhcGhEIGV4dGVuZHMgUGFnZUJhc2Uge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gW107XHJcbiAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgICB0aGlzLmNsaWNrRm4gPSBudWxsO1xyXG4gIH1cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPkRpcmVjdGVkIE5vbi1XZWlnaHRlZCBHcmFwaDwvaDE+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5uZXdHcmFwaC5iaW5kKHRoaXMpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclRvcG8pfT5Ub3BvPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy50b2dnbGVWaWV3LmJpbmQodGhpcyl9PlZpZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+XHJcbiAgICAgICAgICA8cD48Yj5Eb3VibGUtY2xpY2s8L2I+IHRvIGNyZWF0ZSBuZXcgdmVydGV4PC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZzwvYj4gZnJvbSB2ZXJ0ZXggdG8gdmVydGV4IHRvIGNyZWF0ZSBlZGdlPC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZyArIEN0cmw8L2I+IG1vdmVzIHZlcnRleDwvcD5cclxuICAgICAgICAgIDxwPjxiPk5ldzwvYj4gY2xlYXJzIGFuIG9sZCBncmFwaDwvcD5cclxuICAgICAgICAgIDxwPjxiPlRvcG88L2I+IGNhcnJpZXMgb3V0IHRvcG9sb2dpY2FsIHNvcnQ8L3A+XHJcbiAgICAgICAgICA8cD48Yj5WaWV3PC9iPiB0b2dnbGVzIGJldHdlZW4gZ3JhcGggYW5kIGFkamFjZW5jeSBtYXRyaXg8L3A+XHJcbiAgICAgICAgPC94LWluZm8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8eC1jb25zb2xlIGNsYXNzPVwibWFpbi1jb25zb2xlXCIgZGVmYXVsdE1lc3NhZ2U9XCJEb3VibGUtY2xpY2sgbW91c2UgdG8gbWFrZSB2ZXJ0ZXguIERyYWcgdG8gbWFrZSBhbiBlZGdlLiBEcmFnICsgQ3RybCB0byBtb3ZlIHZlcnRleC5cIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cImNvbnNvbGUtc3RhdHNcIiBkZWZhdWx0TWVzc2FnZT1cIuKAlFwiPjwveC1jb25zb2xlPlxyXG4gICAgICA8eC1pdGVtcy1ncmFwaFxyXG4gICAgICAgIC5pdGVtcz0ke3RoaXMuaXRlbXN9XHJcbiAgICAgICAgLmNvbm5lY3Rpb25zPSR7dGhpcy5jb25uZWN0aW9uc31cclxuICAgICAgICAuY2xpY2tGbj0ke3RoaXMuY2xpY2tGbn1cclxuICAgICAgICBkaXJlY3RlZFxyXG4gICAgICAgIGxpbWl0PVwiMThcIlxyXG4gICAgICAgIEBjaGFuZ2VkPSR7dGhpcy5jaGFuZ2VkSGFuZGxlcn1cclxuICAgICAgPjwveC1pdGVtcy1ncmFwaD5cclxuICAgICAgPHgtaXRlbXMtdGFibGVcclxuICAgICAgICAuaXRlbXM9JHt0aGlzLml0ZW1zfVxyXG4gICAgICAgIC5jb25uZWN0aW9ucz0ke3RoaXMuY29ubmVjdGlvbnN9XHJcbiAgICAgICAgaGlkZGVuXHJcbiAgICAgID48L3gtaXRlbXMtdGFibGU+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdGhpcy5jb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcubWFpbi1jb25zb2xlJyk7XHJcbiAgICB0aGlzLnN0YXRDb25zb2xlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuY29uc29sZS1zdGF0cycpO1xyXG4gICAgdGhpcy50YWJsZSA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1pdGVtcy10YWJsZScpO1xyXG4gICAgdGhpcy5ncmFwaCA9IHRoaXMucXVlcnlTZWxlY3RvcigneC1pdGVtcy1ncmFwaCcpO1xyXG4gIH1cclxuXHJcbiAgY2hhbmdlZEhhbmRsZXIoKSB7XHJcbiAgICB0aGlzLnRhYmxlLnJlcXVlc3RVcGRhdGUoKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZVZpZXcoKSB7XHJcbiAgICB0aGlzLnRhYmxlLnRvZ2dsZUF0dHJpYnV0ZSgnaGlkZGVuJyk7XHJcbiAgICB0aGlzLmdyYXBoLnRvZ2dsZUF0dHJpYnV0ZSgnaGlkZGVuJyk7XHJcbiAgfVxyXG5cclxuICBuZXdHcmFwaCgpIHtcclxuICAgIGlmICh0aGlzLnJlbmV3Q29uZmlybWVkKSB7XHJcbiAgICAgIHRoaXMuaW5pdEl0ZW1zKCk7XHJcbiAgICAgIHRoaXMuY29ubmVjdGlvbnMgPSBbXTtcclxuICAgICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoKTtcclxuICAgICAgdGhpcy5yZW5ld0NvbmZpcm1lZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jb25zb2xlLnNldE1lc3NhZ2UoJ0FSRSBZT1UgU1VSRT8gUHJlc3MgYWdhaW4gdG8gY2xlYXIgb2xkIGdyYXBoJyk7XHJcbiAgICAgIHRoaXMucmVuZXdDb25maXJtZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdGhpcy5yZXF1ZXN0VXBkYXRlKCk7XHJcbiAgfVxyXG5cclxuICBoYW5kbGVDbGljaygpIHtcclxuICAgIHN1cGVyLmhhbmRsZUNsaWNrKC4uLmFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJlbmV3Q29uZmlybWVkID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvL3RvcG9sb2dpY2FsIHNvcnRcclxuICAqIGl0ZXJhdG9yVG9wbygpIHtcclxuICAgIHlpZWxkICdXaWxsIHBlcmZvcm0gdG9wb2xvZ2ljYWwgc29ydCc7XHJcbiAgICBjb25zdCBjb25uZWN0aW9uc0NhY2hlID0gdGhpcy5jb25uZWN0aW9ucy5tYXAocm93ID0+IFsuLi5yb3ddKTtcclxuICAgIGNvbnN0IGl0ZW1zQ2FjaGUgPSB0aGlzLml0ZW1zLm1hcChpdGVtID0+IG5ldyBWZXJ0ZXgoaXRlbSkpO1xyXG4gICAgY29uc3QgcmVzdWx0ID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbm5lY3Rpb25zQ2FjaGUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgY3VySXRlbSA9IHRoaXMuZ2V0Tm9TdWNjZXNzb3JWZXJ0ZXgoKTtcclxuICAgICAgaWYgKCFjdXJJdGVtKSB7XHJcbiAgICAgICAgeWllbGQgJ0VSUk9SOiBDYW5ub3Qgc29ydCBncmFwaCB3aXRoIGN5Y2xlcyc7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9ucyA9IGNvbm5lY3Rpb25zQ2FjaGU7XHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IGl0ZW1zQ2FjaGU7XHJcbiAgICAgICAgdGhpcy5zdGF0Q29uc29sZS5zZXRNZXNzYWdlKCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHlpZWxkIGBXaWxsIHJlbW92ZSB2ZXJ0ZXggJHtjdXJJdGVtLnZhbHVlfWA7XHJcbiAgICAgIHJlc3VsdC5wdXNoKGN1ckl0ZW0udmFsdWUpO1xyXG4gICAgICB0aGlzLnN0YXRDb25zb2xlLnNldE1lc3NhZ2UoYExpc3Q6ICR7cmVzdWx0LmpvaW4oJyAnKX1gKTtcclxuXHJcbiAgICAgIC8vcmVtb3ZlIGl0ZW0gKHZlcnRleCkgYW5kIGl0cyBjb25uZWN0aW9uc1xyXG4gICAgICB0aGlzLmNvbm5lY3Rpb25zLnNwbGljZShjdXJJdGVtLmluZGV4LCAxKTtcclxuICAgICAgdGhpcy5jb25uZWN0aW9ucy5mb3JFYWNoKHJvdyA9PiByb3cuc3BsaWNlKGN1ckl0ZW0uaW5kZXgsIDEpKTtcclxuICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoY3VySXRlbS5pbmRleCwgMSk7XHJcbiAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaCgoaXRlbSwgaSkgPT4gaXRlbS5pbmRleCA9IGkpO1xyXG5cclxuICAgICAgeWllbGQgYEFkZGVkIHZlcnRleCAke2N1ckl0ZW0udmFsdWV9IGF0IHN0YXJ0IG9mIHNvcnRlZCBsaXN0YDtcclxuICAgIH1cclxuICAgIHlpZWxkICdTb3J0IGlzIGNvbXBsZXRlLiBXaWxsIHJlc3RvcmUgZ3JhcGgnO1xyXG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IGNvbm5lY3Rpb25zQ2FjaGU7XHJcbiAgICB0aGlzLml0ZW1zID0gaXRlbXNDYWNoZTtcclxuICAgIHlpZWxkICdXaWxsIHJlc2V0IHNvcnQnO1xyXG4gICAgdGhpcy5zdGF0Q29uc29sZS5zZXRNZXNzYWdlKCk7XHJcbiAgfVxyXG5cclxuICBnZXROb1N1Y2Nlc3NvclZlcnRleCgpIHtcclxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jb25uZWN0aW9ucy5maW5kSW5kZXgocm93ID0+IHJvdy5yZWR1Y2UoKGFjYywgaSkgPT4gYWNjICsgaSkgPT09IDApO1xyXG4gICAgcmV0dXJuIGluZGV4ICE9IG51bGwgPyB0aGlzLml0ZW1zW2luZGV4XSA6IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwYWdlLWdyYXBoLWQnLCBQYWdlR3JhcGhEKTsiLCJleHBvcnQgY2xhc3MgRWRnZSB7XHJcbiAgY29uc3RydWN0b3Ioe3NyYywgZGVzdCwgd2VpZ2h0fSkge1xyXG4gICAgdGhpcy5zcmMgPSBzcmM7XHJcbiAgICB0aGlzLmRlc3QgPSBkZXN0O1xyXG4gICAgdGhpcy53ZWlnaHQgPSB3ZWlnaHQ7XHJcbiAgfVxyXG4gIGdldCB0aXRsZSgpIHtcclxuICAgIHJldHVybiBgJHt0aGlzLnNyYy52YWx1ZX0ke3RoaXMuZGVzdC52YWx1ZX0oJHt0aGlzLndlaWdodC50b1N0cmluZygpLnNsaWNlKDAsIDMpfSlgO1xyXG4gIH1cclxufSIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge1BhZ2VHcmFwaE59IGZyb20gJy4vcGFnZUdyYXBoTic7XHJcbmltcG9ydCB7RWRnZX0gZnJvbSAnLi4vY2xhc3Nlcy9lZGdlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNHcmFwaCc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1RhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlR3JhcGhXIGV4dGVuZHMgUGFnZUdyYXBoTiB7XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIHJldHVybiBodG1sYFxyXG4gICAgICA8aDE+V2VpZ2h0ZWQsIFVuZGlyZWN0ZWQgR3JhcGg8L2gxPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHBhbmVsXCI+XHJcbiAgICAgICAgPHgtYnV0dG9uIC5jYWxsYmFjaz0ke3RoaXMubmV3R3JhcGguYmluZCh0aGlzKX0+TmV3PC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIHRoaXMuaXRlcmF0b3JNU1QpfT5UcmVlPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy50b2dnbGVWaWV3LmJpbmQodGhpcyl9PlZpZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+XHJcbiAgICAgICAgICA8cD48Yj5Eb3VibGUtY2xpY2s8L2I+IHRvIGNyZWF0ZSBuZXcgdmVydGV4PC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZzwvYj4gZnJvbSB2ZXJ0ZXggdG8gdmVydGV4IHRvIGNyZWF0ZSBlZGdlPC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZyArIEN0cmw8L2I+IG1vdmVzIHZlcnRleDwvcD5cclxuICAgICAgICAgIDxwPjxiPk5ldzwvYj4gY2xlYXJzIGFuIG9sZCBncmFwaDwvcD5cclxuICAgICAgICAgIDxwPjxiPlRyZWU8L2I+IGNyZWF0ZXMgbWluaW11bSBzcGFubmluZyB0cmVlPC9wPlxyXG4gICAgICAgICAgPHA+PGI+VmlldzwvYj4gdG9nZ2xlcyBiZXR3ZWVuIGdyYXBoIGFuZCBhZGphY2VuY3kgbWF0cml4PC9wPlxyXG4gICAgICAgIDwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cIm1haW4tY29uc29sZVwiIGRlZmF1bHRNZXNzYWdlPVwiRG91YmxlLWNsaWNrIG1vdXNlIHRvIG1ha2UgdmVydGV4LiBEcmFnIHRvIG1ha2UgYW4gZWRnZS4gRHJhZyArIEN0cmwgdG8gbW92ZSB2ZXJ0ZXguXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJjb25zb2xlLXN0YXRzXCIgZGVmYXVsdE1lc3NhZ2U9XCLigJRcIj48L3gtY29uc29sZT5cclxuICAgICAgPHgtaXRlbXMtZ3JhcGhcclxuICAgICAgICAuaXRlbXM9JHt0aGlzLml0ZW1zfVxyXG4gICAgICAgIC5jb25uZWN0aW9ucz0ke3RoaXMuY29ubmVjdGlvbnN9XHJcbiAgICAgICAgLm1hcmtlZENvbm5lY3Rpb25zPSR7dGhpcy5tYXJrZWRDb25uZWN0aW9uc31cclxuICAgICAgICAuY2xpY2tGbj0ke3RoaXMuY2xpY2tGbn1cclxuICAgICAgICB3ZWlnaHRlZFxyXG4gICAgICAgIGxpbWl0PVwiMThcIlxyXG4gICAgICAgIEBjaGFuZ2VkPSR7dGhpcy5jaGFuZ2VkSGFuZGxlcn1cclxuICAgICAgPjwveC1pdGVtcy1ncmFwaD5cclxuICAgICAgPHgtaXRlbXMtdGFibGVcclxuICAgICAgICAuaXRlbXM9JHt0aGlzLml0ZW1zfVxyXG4gICAgICAgIC5jb25uZWN0aW9ucz0ke3RoaXMuY29ubmVjdGlvbnN9XHJcbiAgICAgICAgaGlkZGVuXHJcbiAgICAgID48L3gtaXRlbXMtdGFibGU+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgc2V0U3RhdHModHJlZSwgcHEpIHtcclxuICAgIHRoaXMuc3RhdENvbnNvbGUuc2V0TWVzc2FnZShgVHJlZTogJHt0cmVlLm1hcChpID0+IGkudmFsdWUpLmpvaW4oJyAnKX0uIFBROiAke3BxLm1hcChpID0+IGkudGl0bGUpLmpvaW4oJyAnKX1gKTtcclxuICB9XHJcblxyXG4gIC8vbWluaW1hbCBzcGFubmluZyB0cmVlIChNU1QpXHJcbiAgKiBpdGVyYXRvckRGUygpIHtcclxuICAgIGxldCBjdXJyZW50SXRlbSA9IHlpZWxkKiB0aGlzLml0ZXJhdG9yU3RhcnRTZWFyY2goKTtcclxuICAgIHlpZWxkIGBTdGFydGluZyB0cmVlIGZyb20gdmVydGV4ICR7Y3VycmVudEl0ZW0udmFsdWV9YDtcclxuICAgIGlmIChjdXJyZW50SXRlbSA9PSBudWxsKSByZXR1cm47XHJcbiAgICBjb25zdCB0cmVlID0gW107XHJcbiAgICBjb25zdCBwcSA9IFtdO1xyXG4gICAgbGV0IGNvdW50SXRlbXMgPSAwO1xyXG4gICAgd2hpbGUodHJ1ZSkge1xyXG4gICAgICB0cmVlLnB1c2goY3VycmVudEl0ZW0pO1xyXG4gICAgICB0aGlzLnNldFN0YXRzKHRyZWUsIHBxKTtcclxuICAgICAgY3VycmVudEl0ZW0ubWFyayA9IHRydWU7XHJcbiAgICAgIGN1cnJlbnRJdGVtLmlzSW5UcmVlID0gdHJ1ZTtcclxuICAgICAgY291bnRJdGVtcysrO1xyXG4gICAgICB5aWVsZCBgUGxhY2VkIHZlcnRleCAke2N1cnJlbnRJdGVtLnZhbHVlfSBpbiB0cmVlYDtcclxuXHJcbiAgICAgIGlmIChjb3VudEl0ZW1zID09PSB0aGlzLml0ZW1zLmxlbmd0aCkgYnJlYWs7XHJcblxyXG4gICAgICAvL2luc2VydGlvbiBpbiBQUSB2ZXJ0aWNlcywgYWRqYWNlbnQgY3VycmVudFxyXG4gICAgICB0aGlzLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgY29uc3Qgd2VpZ2h0ID0gdGhpcy5jb25uZWN0aW9uc1tjdXJyZW50SXRlbS5pbmRleF1baXRlbS5pbmRleF07XHJcbiAgICAgICAgaWYgKGl0ZW0gIT09IGN1cnJlbnRJdGVtICYmICFpdGVtLmlzSW5UcmVlICYmIHR5cGVvZiB3ZWlnaHQgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICB0aGlzLnB1dEluUFEocHEsIGN1cnJlbnRJdGVtLCBpdGVtLCB3ZWlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLnNldFN0YXRzKHRyZWUsIHBxKTtcclxuICAgICAgeWllbGQgYFBsYWNlZCB2ZXJ0aWNlcyBhZGphY2VudCB0byAke2N1cnJlbnRJdGVtLnZhbHVlfSBpbiBwcmlvcml0eSBxdWV1ZWA7XHJcblxyXG4gICAgICBpZiAocHEubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgeWllbGQgJ0dyYXBoIG5vdCBjb25uZWN0ZWQnO1xyXG4gICAgICAgIHRoaXMucmVzZXQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vcmVtb3ZpbmcgbWluIGVkZ2UgZnJvbSBwcVxyXG4gICAgICBjb25zdCBlZGdlID0gcHEucG9wKCk7XHJcbiAgICAgIGN1cnJlbnRJdGVtID0gZWRnZS5kZXN0O1xyXG4gICAgICB5aWVsZCBgUmVtb3ZlZCBtaW5pbXVtLWRpc3RhbmNlIGVkZ2UgJHtlZGdlLnRpdGxlfSBmcm9tIHByaW9yaXR5IHF1ZXVlYDtcclxuICAgICAgdGhpcy5tYXJrZWRDb25uZWN0aW9uc1tlZGdlLnNyYy5pbmRleF1bZWRnZS5kZXN0LmluZGV4XSA9IGVkZ2Uud2VpZ2h0O1xyXG4gICAgfVxyXG4gICAgdGhpcy5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4gZGVsZXRlIGl0ZW0uaXNJblRyZWUpO1xyXG4gIH1cclxuXHJcbiAgcHV0SW5QUShwcSwgY3VycmVudEl0ZW0sIGl0ZW0sIHdlaWdodCkge1xyXG4gICAgY29uc3QgaW5kZXggPSBwcS5maW5kSW5kZXgoZWRnZSA9PiBlZGdlLmRlc3QgPT09IGl0ZW0pO1xyXG4gICAgbGV0IHNob3VsZEFkZCA9IGZhbHNlO1xyXG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xyXG4gICAgICBzaG91bGRBZGQgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChwcVtpbmRleF0ud2VpZ2h0ID4gd2VpZ2h0KSB7XHJcbiAgICAgIHBxLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoc2hvdWxkQWRkKSB7XHJcbiAgICAgIGNvbnN0IGluZGV4UHJpb3JpdHkgPSBwcS5maW5kSW5kZXgoZWRnZSA9PiBlZGdlLndlaWdodCA8IHdlaWdodCk7XHJcbiAgICAgIHBxLnNwbGljZShpbmRleFByaW9yaXR5IDwgMCA/IHBxLmxlbmd0aCA6IGluZGV4UHJpb3JpdHksIDAsIG5ldyBFZGdlKHtzcmM6IGN1cnJlbnRJdGVtLCBkZXN0OiBpdGVtLCB3ZWlnaHR9KSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtZ3JhcGgtdycsIFBhZ2VHcmFwaFcpOyIsImltcG9ydCB7aHRtbH0gZnJvbSAnbGl0LWVsZW1lbnQnO1xyXG5pbXBvcnQge1BhZ2VHcmFwaE59IGZyb20gJy4vcGFnZUdyYXBoTic7XHJcbmltcG9ydCB7RWRnZX0gZnJvbSAnLi4vY2xhc3Nlcy9lZGdlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2J1dHRvbic7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9jb25zb2xlJztcclxuaW1wb3J0ICcuLi9jb21wb25lbnRzL2luZm8nO1xyXG5pbXBvcnQgJy4uL2NvbXBvbmVudHMvaXRlbXNHcmFwaCc7XHJcbmltcG9ydCAnLi4vY29tcG9uZW50cy9pdGVtc1RhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWdlR3JhcGhEVyBleHRlbmRzIFBhZ2VHcmFwaE4ge1xyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPGgxPkRpcmVjdGVkLCBXZWlnaHRlZCBHcmFwaDwvaDE+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9scGFuZWxcIj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy5uZXdHcmFwaC5iaW5kKHRoaXMpfT5OZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWJ1dHRvbiAuY2FsbGJhY2s9JHt0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcywgdGhpcy5pdGVyYXRvclBhdGgpfT5QYXRoPC94LWJ1dHRvbj5cclxuICAgICAgICA8eC1idXR0b24gLmNhbGxiYWNrPSR7dGhpcy50b2dnbGVWaWV3LmJpbmQodGhpcyl9PlZpZXc8L3gtYnV0dG9uPlxyXG4gICAgICAgIDx4LWluZm8+XHJcbiAgICAgICAgICA8cD48Yj5Eb3VibGUtY2xpY2s8L2I+IHRvIGNyZWF0ZSBuZXcgdmVydGV4PC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZzwvYj4gZnJvbSB2ZXJ0ZXggdG8gdmVydGV4IHRvIGNyZWF0ZSBlZGdlPC9wPlxyXG4gICAgICAgICAgPHA+PGI+RHJhZyArIEN0cmw8L2I+IG1vdmVzIHZlcnRleDwvcD5cclxuICAgICAgICAgIDxwPjxiPk5ldzwvYj4gY2xlYXJzIGFuIG9sZCBncmFwaDwvcD5cclxuICAgICAgICAgIDxwPjxiPlBhdGg8L2I+IGZpbmRzIGFsbCBTaG9ydGVzdCBQYXRocyBmcm9tIGEgdmVydGV4PC9wPlxyXG4gICAgICAgICAgPHA+PGI+VmlldzwvYj4gdG9nZ2xlcyBiZXR3ZWVuIGdyYXBoIGFuZCBhZGphY2VuY3kgbWF0cml4PC9wPlxyXG4gICAgICAgIDwveC1pbmZvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPHgtY29uc29sZSBjbGFzcz1cIm1haW4tY29uc29sZVwiIGRlZmF1bHRNZXNzYWdlPVwiRG91YmxlLWNsaWNrIG1vdXNlIHRvIG1ha2UgdmVydGV4LiBEcmFnIHRvIG1ha2UgYW4gZWRnZS4gRHJhZyArIEN0cmwgdG8gbW92ZSB2ZXJ0ZXguXCI+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWNvbnNvbGUgY2xhc3M9XCJjb25zb2xlLXN0YXRzXCIgZGVmYXVsdE1lc3NhZ2U9XCLigJRcIiBhbGxvd0h0bWw+PC94LWNvbnNvbGU+XHJcbiAgICAgIDx4LWl0ZW1zLWdyYXBoXHJcbiAgICAgICAgLml0ZW1zPSR7dGhpcy5pdGVtc31cclxuICAgICAgICAuY29ubmVjdGlvbnM9JHt0aGlzLmNvbm5lY3Rpb25zfVxyXG4gICAgICAgIC5tYXJrZWRDb25uZWN0aW9ucz0ke3RoaXMubWFya2VkQ29ubmVjdGlvbnN9XHJcbiAgICAgICAgLmNsaWNrRm49JHt0aGlzLmNsaWNrRm59XHJcbiAgICAgICAgZGlyZWN0ZWRcclxuICAgICAgICB3ZWlnaHRlZFxyXG4gICAgICAgIGxpbWl0PVwiMThcIlxyXG4gICAgICAgIEBjaGFuZ2VkPSR7dGhpcy5jaGFuZ2VkSGFuZGxlcn1cclxuICAgICAgPjwveC1pdGVtcy1ncmFwaD5cclxuICAgICAgPHgtaXRlbXMtdGFibGVcclxuICAgICAgICAuaXRlbXM9JHt0aGlzLml0ZW1zfVxyXG4gICAgICAgIC5jb25uZWN0aW9ucz0ke3RoaXMuY29ubmVjdGlvbnN9XHJcbiAgICAgICAgaGlkZGVuXHJcbiAgICAgID48L3gtaXRlbXMtdGFibGU+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgc2V0U3RhdHMoc2hvcnRlc3RQYXRoKSB7XHJcbiAgICB0aGlzLnN0YXRDb25zb2xlLnNldE1lc3NhZ2UoaHRtbGBcclxuICAgICAgPHRhYmxlPlxyXG4gICAgICAgIDx0cj5cclxuICAgICAgICAgICR7c2hvcnRlc3RQYXRoLm1hcChlZGdlID0+IGh0bWxgPHRoIGNsYXNzPSR7ZWRnZS5kZXN0LmlzSW5UcmVlID8gJ21hcmtlZCcgOiAnJ30+JHtlZGdlLmRlc3QudmFsdWV9PC90aD5gKX1cclxuICAgICAgICA8L3RyPlxyXG4gICAgICAgIDx0cj5cclxuICAgICAgICAgICR7c2hvcnRlc3RQYXRoLm1hcChlZGdlID0+IGh0bWxgPHRkPiR7ZWRnZS53ZWlnaHQudG9TdHJpbmcoKS5zbGljZSgwLCAzKX0oJHtlZGdlLnNyYy52YWx1ZX0pPC90ZD5gKX1cclxuICAgICAgICA8L3RyPlxyXG4gICAgICA8L3RhYmxlPlxyXG4gICAgYCk7XHJcbiAgfVxyXG5cclxuICAqIGFkanVzdFNob3J0ZXN0UGF0aChzaG9ydGVzdFBhdGgsIHN0YXJ0SXRlbSwgbGFzdEVkZ2UpIHtcclxuICAgIGNvbnN0IGxhc3RJdGVtID0gbGFzdEVkZ2UuZGVzdDtcclxuICAgIGNvbnN0IHN0YXJ0VG9MYXN0V2VpZ2h0ID0gbGFzdEVkZ2Uud2VpZ2h0O1xyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgaWYgKGkgPj0gc2hvcnRlc3RQYXRoLmxlbmd0aCkgYnJlYWs7XHJcbiAgICAgIGlmIChzaG9ydGVzdFBhdGhbaV0uZGVzdC5pc0luVHJlZSkge1xyXG4gICAgICAgIGkrKztcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc3RhcnRUb0N1cldlaWdodCA9IHNob3J0ZXN0UGF0aFtpXS53ZWlnaHQ7XHJcbiAgICAgIGNvbnN0IGN1ckl0ZW0gPSBzaG9ydGVzdFBhdGhbaV0uZGVzdDtcclxuICAgICAgeWllbGQgYFdpbGwgY29tcGFyZSBkaXN0YW5jZXMgZm9yIGNvbHVtbiAke2N1ckl0ZW0udmFsdWV9YDtcclxuXHJcbiAgICAgIGNvbnN0IGxhc3RUb0N1cldlaWdodCA9IHRoaXMuY29ubmVjdGlvbnNbbGFzdEl0ZW0uaW5kZXhdW2N1ckl0ZW0uaW5kZXhdO1xyXG4gICAgICBjb25zdCBpc05lZWRUb1JlcGxhY2UgPSAoc3RhcnRUb0xhc3RXZWlnaHQgKyBsYXN0VG9DdXJXZWlnaHQpIDwgc3RhcnRUb0N1cldlaWdodDtcclxuICAgICAgeWllbGQgYFRvICR7Y3VySXRlbS52YWx1ZX06ICR7c3RhcnRJdGVtLnZhbHVlfSB0byAke2xhc3RJdGVtLnZhbHVlfSAoJHtzdGFydFRvTGFzdFdlaWdodC50b1N0cmluZygpLnNsaWNlKDAsIDMpfSlcclxuICAgICAgICBwbHVzIGVkZ2UgJHtsYXN0SXRlbS52YWx1ZX0ke2N1ckl0ZW0udmFsdWV9KCR7bGFzdFRvQ3VyV2VpZ2h0LnRvU3RyaW5nKCkuc2xpY2UoMCwgMyl9KVxyXG4gICAgICAgICR7aXNOZWVkVG9SZXBsYWNlID8gJ2xlc3MgdGhhbicgOiAnZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvJ30gJHtzdGFydEl0ZW0udmFsdWV9IHRvICR7Y3VySXRlbS52YWx1ZX0gKCR7c3RhcnRUb0N1cldlaWdodC50b1N0cmluZygpLnNsaWNlKDAsIDMpfSlgO1xyXG5cclxuICAgICAgaWYgKGlzTmVlZFRvUmVwbGFjZSkge1xyXG4gICAgICAgIHNob3J0ZXN0UGF0aFtpXS5zcmMgPSBsYXN0SXRlbTtcclxuICAgICAgICBzaG9ydGVzdFBhdGhbaV0ud2VpZ2h0ID0gc3RhcnRUb0xhc3RXZWlnaHQgKyBsYXN0VG9DdXJXZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5zZXRTdGF0cyhzaG9ydGVzdFBhdGgpO1xyXG4gICAgICAgIHlpZWxkIGBVcGRhdGVkIGFycmF5IGNvbHVtbiAke2N1ckl0ZW0udmFsdWV9YDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB5aWVsZCBgTm8gbmVlZCB0byB1cGRhdGUgYXJyYXkgY29sdW1uICR7Y3VySXRlbS52YWx1ZX1gO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaSA8IHNob3J0ZXN0UGF0aC5sZW5ndGgpIHtcclxuICAgICAgICB5aWVsZCAnV2lsbCBleGFtaW5lIG5leHQgbm9uLXRyZWUgY29sdW1uJztcclxuICAgICAgICBpKys7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHlpZWxkICdEb25lIGFsbCBlbnRyaWVzIGluIHNob3J0ZXN0LXBhdGggYXJyYXknO1xyXG4gIH1cclxuXHJcbiAgLy9taW5pbWFsIHNwYW5uaW5nIHRyZWUgKE1TVClcclxuICAqIGl0ZXJhdG9yUGF0aCgpIHtcclxuICAgIGxldCBzdGFydEl0ZW0gPSB5aWVsZCogdGhpcy5pdGVyYXRvclN0YXJ0U2VhcmNoKCk7XHJcbiAgICBpZiAoc3RhcnRJdGVtID09IG51bGwpIHJldHVybjtcclxuICAgIHlpZWxkIGBTdGFydGluZyBmcm9tIHZlcnRleCAke3N0YXJ0SXRlbS52YWx1ZX1gO1xyXG5cclxuICAgIHN0YXJ0SXRlbS5tYXJrID0gdHJ1ZTtcclxuICAgIHN0YXJ0SXRlbS5pc0luVHJlZSA9IHRydWU7XHJcbiAgICB5aWVsZCBgQWRkZWQgdmVydGV4ICR7c3RhcnRJdGVtLnZhbHVlfSB0byB0cmVlYDtcclxuXHJcbiAgICB0aGlzLm1hcmtlZENvbm5lY3Rpb25zID0gdGhpcy5jb25uZWN0aW9ucy5tYXAoKCkgPT4gbmV3IEFycmF5KHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoKS5maWxsKHRoaXMuZ3JhcGguZ2V0Tm9Db25uZWN0aW9uVmFsdWUoKSkpO1xyXG5cclxuICAgIGNvbnN0IHNob3J0ZXN0UGF0aCA9IHRoaXMuY29ubmVjdGlvbnNbc3RhcnRJdGVtLmluZGV4XS5tYXAoKHdlaWdodCwgaW5kZXgpID0+IHtcclxuICAgICAgcmV0dXJuIG5ldyBFZGdlKHtzcmM6IHN0YXJ0SXRlbSwgZGVzdDogdGhpcy5pdGVtc1tpbmRleF0sIHdlaWdodH0pO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnNldFN0YXRzKHNob3J0ZXN0UGF0aCk7XHJcbiAgICB5aWVsZCBgQ29waWVkIHJvdyAke3N0YXJ0SXRlbS52YWx1ZX0gZnJvbSBhZGphY2VuY3kgbWF0cml4IHRvIHNob3J0ZXN0IHBhdGggYXJyYXlgO1xyXG5cclxuICAgIGxldCBjb3VudGVyID0gMTtcclxuICAgIHdoaWxlKGNvdW50ZXIgPCB0aGlzLml0ZW1zLmxlbmd0aCkge1xyXG4gICAgICBjb3VudGVyKys7XHJcblxyXG4gICAgICBjb25zdCBtaW5QYXRoRWRnZSA9IHNob3J0ZXN0UGF0aC5yZWR1Y2UoKG1pbiwgY3VyKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChtaW4gJiYgbWluLndlaWdodCA8IGN1ci53ZWlnaHQgfHwgY3VyLmRlc3QuaXNJblRyZWUpID8gbWluIDogY3VyO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghbWluUGF0aEVkZ2UgfHwgbWluUGF0aEVkZ2Uud2VpZ2h0ID09PSBJbmZpbml0eSkge1xyXG4gICAgICAgIHlpZWxkICdPbmUgb3IgbW9yZSB2ZXJ0aWNlcyBhcmUgVU5SRUFDSEFCTEUnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB5aWVsZCBgTWluaW11bSBkaXN0YW5jZSBmcm9tICR7c3RhcnRJdGVtLnZhbHVlfSBpcyAke21pblBhdGhFZGdlLndlaWdodH0sIHRvIHZlcnRleCAke21pblBhdGhFZGdlLmRlc3QudmFsdWV9YDtcclxuXHJcbiAgICAgIG1pblBhdGhFZGdlLmRlc3QubWFyayA9IHRydWU7XHJcbiAgICAgIG1pblBhdGhFZGdlLmRlc3QuaXNJblRyZWUgPSB0cnVlO1xyXG4gICAgICB0aGlzLm1hcmtlZENvbm5lY3Rpb25zW21pblBhdGhFZGdlLnNyYy5pbmRleF1bbWluUGF0aEVkZ2UuZGVzdC5pbmRleF0gPSB0aGlzLmNvbm5lY3Rpb25zW21pblBhdGhFZGdlLnNyYy5pbmRleF1bbWluUGF0aEVkZ2UuZGVzdC5pbmRleF07XHJcbiAgICAgIHRoaXMuc2V0U3RhdHMoc2hvcnRlc3RQYXRoKTtcclxuICAgICAgeWllbGQgYEFkZGVkIHZlcnRleCAke21pblBhdGhFZGdlLmRlc3QudmFsdWV9IHRvIHRyZWVgO1xyXG5cclxuICAgICAgeWllbGQgJ1dpbGwgYWRqdXN0IHZhbHVlcyBpbiBzaG9ydGVzdC1wYXRoIGFycmF5JztcclxuICAgICAgeWllbGQqIHRoaXMuYWRqdXN0U2hvcnRlc3RQYXRoKHNob3J0ZXN0UGF0aCwgc3RhcnRJdGVtLCBtaW5QYXRoRWRnZSk7XHJcblxyXG4gICAgfVxyXG4gICAgeWllbGQgYEFsbCBzaG9ydGVzdCBwYXRocyBmcm9tICR7c3RhcnRJdGVtLnZhbHVlfSBmb3VuZC4gRGlzdGFuY2VzIGluIGFycmF5YDtcclxuICAgIHlpZWxkICdQcmVzcyBhZ2FpbiB0byByZXNldCBwYXRocyc7XHJcbiAgICB0aGlzLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgIGRlbGV0ZSBpdGVtLmlzSW5UcmVlO1xyXG4gICAgICBpdGVtLm1hcmsgPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy5tYXJrZWRDb25uZWN0aW9ucyA9IFtdO1xyXG4gICAgdGhpcy5zdGF0Q29uc29sZS5zZXRNZXNzYWdlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3BhZ2UtZ3JhcGgtZHcnLCBQYWdlR3JhcGhEVyk7IiwiaW1wb3J0IHtMaXRFbGVtZW50LCBodG1sfSBmcm9tICdsaXQtZWxlbWVudCc7XHJcbmltcG9ydCAnLi9jb21wb25lbnRzL3ZpZXcnO1xyXG5cclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVN0YXJ0JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUFycmF5JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZU9yZGVyZWRBcnJheSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VCdWJibGVTb3J0JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVNlbGVjdFNvcnQnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlSW5zZXJ0aW9uU29ydCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VTdGFjayc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VRdWV1ZSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VQcmlvcml0eVF1ZXVlJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUxpbmtMaXN0JztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZU1lcmdlU29ydCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VTaGVsbFNvcnQnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlUGFydGl0aW9uJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVF1aWNrU29ydDEnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlUXVpY2tTb3J0Mic7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VCaW5hcnlUcmVlJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZVJlZEJsYWNrVHJlZSc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VIYXNoVGFibGUnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlSGFzaENoYWluJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUhlYXAnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlR3JhcGhOJztcclxuaW1wb3J0ICcuL2NvbnRhaW5lcnMvcGFnZUdyYXBoRCc7XHJcbmltcG9ydCAnLi9jb250YWluZXJzL3BhZ2VHcmFwaFcnO1xyXG5pbXBvcnQgJy4vY29udGFpbmVycy9wYWdlR3JhcGhEVyc7XHJcblxyXG5sZXQgdmlldztcclxuY29uc3Qgcm91dGVzID0ge1xyXG4gICcjYXJyYXknOiAncGFnZS1hcnJheScsXHJcbiAgJyNvcmRlcmVkQXJyYXknOiAncGFnZS1vcmRlcmVkLWFycmF5JyxcclxuICAnI2J1YmJsZVNvcnQnOiAncGFnZS1idWJibGUtc29ydCcsXHJcbiAgJyNzZWxlY3RTb3J0JzogJ3BhZ2Utc2VsZWN0LXNvcnQnLFxyXG4gICcjaW5zZXJ0aW9uU29ydCc6ICdwYWdlLWluc2VydGlvbi1zb3J0JyxcclxuICAnI3N0YWNrJzogJ3BhZ2Utc3RhY2snLFxyXG4gICcjcXVldWUnOiAncGFnZS1xdWV1ZScsXHJcbiAgJyNwcmlvcml0eVF1ZXVlJzogJ3BhZ2UtcHJpb3JpdHktcXVldWUnLFxyXG4gICcjbGlua0xpc3QnOiAncGFnZS1saW5rLWxpc3QnLFxyXG4gICcjbWVyZ2VTb3J0JzogJ3BhZ2UtbWVyZ2Utc29ydCcsXHJcbiAgJyNzaGVsbFNvcnQnOiAncGFnZS1zaGVsbC1zb3J0JyxcclxuICAnI3BhcnRpdGlvbic6ICdwYWdlLXBhcnRpdGlvbicsXHJcbiAgJyNxdWlja1NvcnQxJzogJ3BhZ2UtcXVpY2stc29ydC0xJyxcclxuICAnI3F1aWNrU29ydDInOiAncGFnZS1xdWljay1zb3J0LTInLFxyXG4gICcjYmluYXJ5VHJlZSc6ICdwYWdlLWJpbmFyeS10cmVlJyxcclxuICAnI3JlZEJsYWNrVHJlZSc6ICdwYWdlLXJlZGJsYWNrLXRyZWUnLFxyXG4gICcjaGFzaFRhYmxlJzogJ3BhZ2UtaGFzaC10YWJsZScsXHJcbiAgJyNoYXNoQ2hhaW4nOiAncGFnZS1oYXNoLWNoYWluJyxcclxuICAnI2hlYXAnOiAncGFnZS1oZWFwJyxcclxuICAnI2dyYXBoTic6ICdwYWdlLWdyYXBoLW4nLFxyXG4gICcjZ3JhcGhEJzogJ3BhZ2UtZ3JhcGgtZCcsXHJcbiAgJyNncmFwaFcnOiAncGFnZS1ncmFwaC13JyxcclxuICAnI2dyYXBoRFcnOiAncGFnZS1ncmFwaC1kdydcclxufTtcclxuXHJcbmNsYXNzIFhBcHAgZXh0ZW5kcyBMaXRFbGVtZW50IHtcclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gaHRtbGBcclxuICAgICAgPG5hdj5cclxuICAgICAgICA8aDE+TGlzdCBvZiBBcHBsZXRzPC9oMT5cclxuICAgICAgICA8aDI+Q2hhcHRlciAxIOKAlCBPdmVydmlldzwvaDI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+KE5vIGFwcGxldHMpPC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGgyPkNoYXB0ZXIgMiDigJQgQXJyYXlzPC9oMj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI2FycmF5XCI+MSkgQXJyYXk8L2E+PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNvcmRlcmVkQXJyYXlcIj4yKSBPcmRlcmVkQXJyYXk8L2E+PC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGgyPkNoYXB0ZXIgMyDigJQgU2ltcGxlIFNvcnRpbmc8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjYnViYmxlU29ydFwiPjMpIEJ1YmJsZTwvYT48L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI2luc2VydGlvblNvcnRcIj40KSBJbnNlcnRpb248L2E+PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNzZWxlY3RTb3J0XCI+NSkgU2VsZWN0aW9uPC9hPjwvZGl2PlxyXG4gICAgICAgIFxyXG4gICAgICAgIDxoMj5DaGFwdGVyIDQg4oCUIFN0YWNrcyBhbmQgUXVldWVzPC9oMj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI3N0YWNrXCI+NikgU3RhY2s8L2E+PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNxdWV1ZVwiPjcpIFF1ZXVlPC9hPjwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjcHJpb3JpdHlRdWV1ZVwiPjgpIFByaW9yaXR5UTwvYT48L2Rpdj5cclxuICAgICAgICBcclxuICAgICAgICA8aDI+Q2hhcHRlciA1IOKAlCBMaW5rZWQgTGlzdHM8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjbGlua0xpc3RcIj45KSBMaW5rTGlzdDwvYT48L2Rpdj5cclxuICAgICAgICBcclxuICAgICAgICA8aDI+Q2hhcHRlciA2IOKAlCBSZWN1cnNpb248L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIHRpdGxlPVwiSW4gcHJvZ3Jlc3NcIj4xMCkgVG93ZXJzPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNtZXJnZVNvcnRcIj4xMSkgbWVyZ2VTb3J0PC9hPjwvZGl2PlxyXG4gICAgICAgIFxyXG4gICAgICAgIDxoMj5DaGFwdGVyIDcg4oCUIEFkdmFuY2VkIFNvcnRpbmc8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjc2hlbGxTb3J0XCI+MTIpIHNoZWxsU29ydDwvYT48L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI3BhcnRpdGlvblwiPjEzKSBwYXJ0aXRpb248L2E+PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNxdWlja1NvcnQxXCI+MTQpIHF1aWNrU29ydDE8L2E+PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNxdWlja1NvcnQyXCI+MTUpIHF1aWNrU29ydDI8L2E+PC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGgyPkNoYXB0ZXIgOCDigJQgQmluYXJ5IFRyZWVzPC9oMj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI2JpbmFyeVRyZWVcIj4xNikgVHJlZTwvYT48L2Rpdj5cclxuICAgICAgICBcclxuICAgICAgICA8aDI+Q2hhcHRlciA5IOKAlCBSZWQtYmxhY2sgVHJlZXM8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjcmVkQmxhY2tUcmVlXCI+MTcpIFJCVHJlZTwvYT48L2Rpdj5cclxuICAgICAgICBcclxuICAgICAgICA8aDI+Q2hhcHRlciAxMCDigJQgMi0zLTQgVHJlZXM8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIHRpdGxlPVwiSW4gcHJvZ3Jlc3NcIj4xOCkgVHJlZTIzNDwvZGl2PlxyXG4gICAgICAgIFxyXG4gICAgICAgIDxoMj5DaGFwdGVyIDExIOKAlCBIYXNoIFRhYmxlczwvaDI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNoYXNoVGFibGVcIj4xOS0yMCkgSGFzaC9IYXNoRG91YmxlPC9hPjwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjaGFzaENoYWluXCI+MjEpIEhhc2hDaGFpbjwvYT48L2Rpdj5cclxuICAgICAgICBcclxuICAgICAgICA8aDI+Q2hhcHRlciAxMiDigJQgSGVhcHM8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjaGVhcFwiPjIyKSBIZWFwPC9hPjwvZGl2PlxyXG4gICAgICAgIFxyXG4gICAgICAgIDxoMj5DaGFwdGVyIDEzIOKAlCBHcmFwaHM8L2gyPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjZ3JhcGhOXCI+MjMpIEdyYXBoTjwvYT48L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIj48YSBocmVmPVwiI2dyYXBoRFwiPjI0KSBHcmFwaEQ8L2E+PC9kaXY+XHJcbiAgICAgICAgXHJcbiAgICAgICAgPGgyPkNoYXB0ZXIgMTQg4oCUIFdlaWdodGVkIEdyYXBoczwvaDI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCI+PGEgaHJlZj1cIiNncmFwaFdcIj4yNSkgR3JhcGhXPC9hPjwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiPjxhIGhyZWY9XCIjZ3JhcGhEV1wiPjI2KSBHcmFwaERXPC9hPjwvZGl2PlxyXG4gICAgICA8L25hdj5cclxuICAgICAgPHgtdmlldyBjb21wb25lbnQ9XCJwYWdlLXN0YXJ0XCI+PC94LXZpZXc+ICAgICAgXHJcbiAgICAgIDxmb290ZXI+QnVpbHQgYnkgU3RhbmlzbGF2IFByb3Noa2luIHdpdGgg4p2kIGFuZCBXZWJDb21wb25lbnRzPC9mb290ZXI+XHJcbiAgICBgO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUmVuZGVyUm9vdCgpIHtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZmlyc3RVcGRhdGVkKCkge1xyXG4gICAgdmlldyA9IHRoaXMucXVlcnlTZWxlY3RvcigneC12aWV3Jyk7XHJcbiAgICB0aGlzLmxvYWRWaWV3KCk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMubG9hZFZpZXcsIGZhbHNlKTtcclxuICB9XHJcbiAgXHJcbiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XHJcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMubG9hZFZpZXcpO1xyXG4gIH1cclxuXHJcbiAgbG9hZFZpZXcoKSB7XHJcbiAgICBjb25zdCBoYXNoID0gbG9jYXRpb24uaGFzaDtcclxuICAgIGlmIChoYXNoICE9PSAnJykge1xyXG4gICAgICB2aWV3LmNvbXBvbmVudCA9IHJvdXRlc1toYXNoXTtcclxuICAgICAgdmlldy5zY3JvbGxJbnRvVmlldygpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd4LWFwcCcsIFhBcHApOyJdLCJuYW1lcyI6WyJkaXJlY3RpdmUiLCJyZW5kZXIiLCJsaXRSZW5kZXIiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7O0FBYUEsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNCakMsQUFBTyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLO0lBQzFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JCLFVBQVUsQ0FBQyxHQUFHLENB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QUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7TUFDcEUsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztNQUNyRSxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7S0FDcEYsQ0FBQztHQUNIOztFQUVELEVBQUUsWUFBWSxHQUFHO0lBQ2YsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQzs7SUFFcEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztNQUNiLEtBQUssRUFBRSxJQUFJO01BQ1gsR0FBRyxFQUFFLEtBQUs7TUFDVixLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztLQUMzQyxDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7SUFFL0MsSUFBSSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUN2QixJQUFJLFFBQVEsR0FBRyxLQUFLLEdBQUcsQ0FB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S0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7TUFDOUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7TUFDbkUsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7TUFDbkYsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7TUFDeEYsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDdkYsQ0FBQztHQUNIOztFQUVELEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO0lBQzlCLElBQUksT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdkIsSUFBSSxRQUFRLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztJQUN6QixPQUFPLElBQUksRUFBRTtNQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztNQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7TUFDcEMsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFF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QUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO0lBQ3ZDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUU7TUFDcEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO01BQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQy9DO0lBQ0QsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRTtNQUNuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7TUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDOUM7SUFDRCxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFO01BQ3JELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztNQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNoRDtHQUNGOztFQUVELFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO0lBQ3RCLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtNQUNkLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxD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QUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7TUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQ1YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7TUFDOUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUU7UUFDcEMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO09BQzVDO01BQ0QsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNuQztJQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0dBQ2xCOztFQUVELFVBQVUsR0FBRztJQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN6Qzs7RUFFRCxFQUFFLFlBQVksR0FBRztJQUNmLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNmLE1BQU0saUNBQWlDLENBQUM7SUFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJO01BQ2xDLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO01B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QUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRSxPQUFPO01BQ2hELE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQ3ZCLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQ3hCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQzdDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7TUFDdEIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDakUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDL0MsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztNQUN2QixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzQztJQUNELFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLE9BQU8sVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7TUFDNUIsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO01BQ3JDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtRQUM1RSxJQUFJLENBQUMsTUFB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