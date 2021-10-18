
'use strict';

import * as groups from './html.groups.js';
import * as tabs   from './html.tabs.js';

export let html = {
	newElement: newElement,
	groups:     groups,
	tabs:       tabs
};

export function newElement(name, attributes, children) {

	const e = document.createElement(name);

	for (const key in attributes) {
		if (key == 'content') {
			e.appendChild(document.createTextNode(attributes[key]));
		} else {
			e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
		}
	}

	for (const child of children || []) {
		e.appendChild(child);
	}

	return e;
}
