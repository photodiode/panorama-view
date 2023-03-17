
'use strict';

import {newElement} from '/common/html.js'
import * as plurals from '/common/plurals.js'

import * as drag from './view.drag.js'
import {options} from './view.js'


export function create(group) {

	// edges
	const top    = newElement('div', {class: 'top'});
	const right  = newElement('div', {class: 'right'});
	const bottom = newElement('div', {class: 'bottom'});
	const left   = newElement('div', {class: 'left'});

	// corners
	const top_right    = newElement('div', {class: 'top_right'});
	const bottom_right = newElement('div', {class: 'bottom_right'});
	const bottom_left  = newElement('div', {class: 'bottom_left'});
	const top_left     = newElement('div', {class: 'top_left'});

	// header
	const name     = newElement('span', {class: 'name', content: group.title});
	const input    = newElement('input', {type: 'text', value: group.title});
	const tabCount = newElement('span', {class: 'tab_count'});
	const close    = newElement('div', {class: 'close'});

	const header = newElement('div', {class: 'header'}, [name, input, tabCount, close]);
	// ----

	// newtab
	const newtab = newElement('div', {class: 'newtab'}, [newElement('div', {class: 'border'})]);

	// group
	const tabs   = newElement('div', {class: 'tabs transition'}, [newtab]);
	const resize = newElement('div', {class: 'resize'}, [top, right, bottom, left, top_right, bottom_right, bottom_left, top_left]);
	const node   = newElement('div', {class: 'group', 'data-id': group.id}, [resize, header, tabs]);
	// ----

	close.addEventListener('click', function(event) {
		event.stopPropagation();

		const childNodes = tabs.childNodes;
		const tabCount = childNodes.length-1;

		let closing = false;

		if (tabCount > 0) {
			if (window.confirm(plurals.parse(browser.i18n.getMessage('pvCloseGroupConfirmation', tabCount)))) {
				closing = true;
			}
		} else {
			closing = true;
		}

		if (closing) {
			browser.tabGroups.remove(group.id).then((removedId) => {
				if (removedId != undefined) node.remove();
			});
		}
	}, false);

	tabs.addEventListener('click', function(event) {
		event.stopPropagation();
	}, false);

	newtab.addEventListener('click', async function(event) {
		event.stopPropagation();
		await browser.tabs.create({active: true, groupId: group.id});
	}, false);

	// move
	var moveFunc = function(event) {
		if (event.buttons == 1) { // only move on left click
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 1, 1, 1, 1, header);
		}
	};
	header.addEventListener('mousedown', moveFunc, false);

	// renaming groups
	var editing = false;

	header.addEventListener('dblclick', function(event) {
		if(!editing) {
			editing = true;

			header.removeEventListener('mousedown', moveFunc, false);

			//header.classList.add('edit');
			input.setSelectionRange(0, input.value.length);
			input.focus();
		}
	}, false);

	input.addEventListener('input', function(event) {
		name.textContent = this.value;
	}, false);

	input.addEventListener('keydown', function(event) {
		if(event.keyCode == 13) {
			input.blur();
		}
	}, false);

	input.addEventListener('blur', function(event) {
		input.setSelectionRange(0, 0);

		browser.tabGroups.update(group.id, {title: input.value});

		header.addEventListener('mousedown', moveFunc, false);

		editing = false;
	}, false);

	const titleResize = function () {
		input.style.width = name.getBoundingClientRect().width + 'px';
	}

	new ResizeObserver(titleResize).observe(name);
	// ----

	tabs.addEventListener('dragover', drag.groupDragOver, false);
	tabs.addEventListener('drop', drag.groupDrop, false);

	// resize
	top.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 1, 0, 0, 0, this);
		}
	}, false);

	right.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 0, 1, 0, 0, this);
		}
	}, false);

	bottom.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 0, 0, 1, 0, this);
		}
	}, false);

	left.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 0, 0, 0, 1, this);
		}
	}, false);

	top_right.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 1, 1, 0, 0, this);
		}
	}, false);

	bottom_right.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 0, 1, 1, 0, this);
		}
	}, false);

	bottom_left.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 0, 0, 1, 1, this);
		}
	}, false);

	top_left.addEventListener('mousedown', function(event) {
		if (event.buttons == 1) {
			event.preventDefault();
			event.stopPropagation();
			groupTransform(group, node, 1, 0, 0, 1, this);
		}
	}, false);

	return node;
}

export function get(tabGroupId) {
	return document.querySelector(`.group[data-id="${tabGroupId}"]`);
}

export async function resize(node, rect) {
	node.style.top    = (rect.y * 100) + '%';
	node.style.left   = (rect.x * 100) + '%';
	node.style.width  = (rect.w * 100) + '%';
	node.style.height = (rect.h * 100) + '%';
}

export async function stack(node, tabGroup) {
	const tabGroupId = parseInt(node.dataset.id);

	tabGroup = tabGroup || await browser.tabGroups.get(tabGroupId);

	node.style.zIndex = Math.floor(tabGroup.lastAccessed / 100).toString().substr(-9);
}

function getFit(param) {

	let w = 0;
	let h = 0;
	let area = 0;

	for (let x = param.amount; x >= 1; x--) {

		let y = Math.ceil(param.amount / x)

		let a = (param.width - (x * (param.marginX*2))) / x;
		a = Math.min(a, param.max);
		let b = (a * param.ratio);

		if (b * y >  param.height - (y * (param.marginY*2)) || b > param.max) {
			b = (param.height - (y * (param.marginY*2))) / y
			b = Math.min(b, param.max);
			a = b / param.ratio;
		}

		let tmp_area = a * b;

		if (tmp_area > area) {
			area = tmp_area;
			w = a;
			h = b;
		}
	}

	let fits = true;
	if (w < param.min || h < param.min) {
		fits = false;
	}

	return {fits: fits, width: w - 0.01, ratio: param.ratio};
}

export function fitTabs(tabGroupNode) {
	if (tabGroupNode == undefined) {
		document.getElementById('groups').childNodes.forEach(async(tabGroupNode) => {
			fitTabsInGroup(tabGroupNode);
		});
	} else {
		fitTabsInGroup(tabGroupNode);
	}
}

export function fitTabsInGroup(tabGroupNode) {

	const tabsNode   = tabGroupNode.querySelector('.tabs');
	const tabNodes = tabsNode.childNodes;

	tabGroupNode.querySelector('.tab_count').textContent = tabNodes.length - 1;

	// fit
	let rect = tabsNode.getBoundingClientRect();

	let fit = getFit({
		width: rect.width,
		height: rect.height,

		marginX: 4,
		marginY: 4,

		min: 70,
		max: 375,

		ratio: window.innerHeight / window.innerWidth,

		amount: tabNodes.length,
	});

	// squished view
	if (!fit.fits){
		fit = getFit({
			width: rect.width,
			height: rect.height,

			marginX: 4,
			marginY: 4,

			min: 60,
			max: 160,

			ratio: (1 + fit.ratio + fit.ratio) / 3,

			amount: tabNodes.length,
		});
	}

	// square view
	if (!fit.fits){
		fit = getFit({
			width: rect.width,
			height: rect.height,

			marginX: 4,
			marginY: 4,

			min: 20,
			max: 100,

			ratio: 1,

			amount: tabNodes.length,
		});
	}


	let w = fit.width;
	let h = w * fit.ratio;
	if (w < 20) w = 20;
	if (h < 20) h = 20;

	// icon view
	let size = 'normal';

	if (w < 60) size = 'small';
	if (w < 40) size = 'tiny';

	if (w < 24 && options.listView == true) {
		size = 'list';
	}


	tabsNode.classList.remove('small');
	tabsNode.classList.remove('tiny');
	tabsNode.classList.remove('list');

	if (size == 'small') {
		tabsNode.classList.add('small');
	} else if (size == 'tiny') {
		tabsNode.classList.add('tiny');
	} else if (size == 'list') {
		tabsNode.classList.add('list');
	}

	tabNodes.forEach(async(tabNode, index) => {
		tabNode.style.width  = w + 'px';
		tabNode.style.height = h + 'px';
	});
}


async function groupTransform(group, node, top, right, bottom, left, elem) {

	const snapValue = function(a, b, dst) {
		if (a >= b - dst && a <= b + dst){
			return b;
		} else {
			return a;
		}
	};

	document.body.setAttribute('style', 'cursor: ' + window.getComputedStyle(elem).cursor);

	const groupsRect = document.getElementById('groups').getBoundingClientRect();

	group.rect = await browser.sessions.getGroupValue(group.id, 'rect');

	const minw = 100 / groupsRect.width;
	const minh = 80 / groupsRect.height;

	const snap_dstx = 5 / groupsRect.width;
	const snap_dsty = 5 / groupsRect.height;

	const clamp = function(num, min, max) {
		return num <= min ? min : num >= max ? max : num;
	};

	let first = true;
	let x, y, lx, ly;

	let rect = {};

	const onmousemove = function(event) {
		event.preventDefault();
		x = event.pageX / groupsRect.width;
		y = event.pageY / groupsRect.height;

		if (first) {
			lx = x;
			ly = y;
			first = false;
			browser.sessions.setGroupValue(group.id, 'rect', group.rect);
			browser.tabGroups.update(group.id, {}).then(group => stack(node, group));
		}

		rect.x = group.rect.x;
		rect.y = group.rect.y;
		rect.w = Math.max(group.rect.w, minw);
		rect.h = Math.max(group.rect.h, minh);

		let rect_i = rect.x + rect.w;
		let rect_j = rect.y + rect.h;

		if (top)    { rect.y += (y - ly); }
		if (right)  { rect_i += (x - lx); }
		if (bottom) { rect_j += (y - ly); }
		if (left)   { rect.x += (x - lx); }

		// snap (seems a bit over complicated, but it works for now)
		for (const tabGroupNode of document.getElementById('groups').childNodes) {

			if (node != tabGroupNode) {

				const _rect = {
					x: parseFloat(tabGroupNode.style.left)   / 100,
					y: parseFloat(tabGroupNode.style.top)    / 100,
					w: parseFloat(tabGroupNode.style.width)  / 100,
					h: parseFloat(tabGroupNode.style.height) / 100
				}

				if (top && bottom) {
					rect.y = snapValue(rect.y, _rect.y, snap_dsty);
					rect.y = snapValue(rect.y, _rect.y + _rect.h, snap_dsty);

					rect.y = snapValue(rect.y + rect.h, _rect.y, snap_dsty) - rect.h;
					rect.y = snapValue(rect.y + rect.h, _rect.y + _rect.h, snap_dsty) - rect.h;
				} else if (top) {
					rect.y = snapValue(rect.y, _rect.y, snap_dsty);
					rect.y = snapValue(rect.y, _rect.y + _rect.h, snap_dsty);
				} else if (bottom) {
					rect_j = snapValue(rect_j, _rect.y, snap_dsty);
					rect_j = snapValue(rect_j, _rect.y + _rect.h, snap_dsty);
				}

				if (left && right) {
					rect.x = snapValue(rect.x, _rect.x, snap_dstx);
					rect.x = snapValue(rect.x, _rect.x + _rect.w, snap_dstx);

					rect.x = snapValue(rect.x + rect.w, _rect.x, snap_dstx) - rect.w;
					rect.x = snapValue(rect.x + rect.w, _rect.x + _rect.w, snap_dstx) - rect.w;
				} else if (left) {
					rect.x = snapValue(rect.x, _rect.x, snap_dstx);
					rect.x = snapValue(rect.x, _rect.x + _rect.w, snap_dstx);
				} else if (right) {
					rect_i = snapValue(rect_i, _rect.x, snap_dstx);
					rect_i = snapValue(rect_i, _rect.x + _rect.w, snap_dstx);
				}
			}
		}
		// ----

		if (top && right && bottom && left) {
			if (rect.x < 0) {
				rect.x = 0;
				rect_i = rect.x + rect.w;
			}
			if (rect_i > 1) {
				rect_i = 1;
				rect.x = rect_i - rect.w;
			}

			if (rect.y < 0) {
				rect.y = 0;
				rect_j = rect.y + rect.h;
			}
			if (rect_j > 1) {
				rect_j = 1;
				rect.y = rect_j - rect.h;
			}
		} else {
			if (left)   { rect.x = clamp(rect.x, 0, rect_i-minw); }
			if (right)  { rect_i = clamp(rect_i, rect.x+minw, 1); }

			if (top)    { rect.y = clamp(rect.y, 0, rect_j-minh); }
			if (bottom) { rect_j = clamp(rect_j, rect.y+minh, 1); }

			rect.w = Math.max(rect_i - rect.x, minw);
			rect.h = Math.max(rect_j - rect.y, minh);
		}

		resize(node, rect);
		fitTabs(node);
	}

	const onmouseup = () => {
		if(rect.x !== undefined) {
			browser.sessions.setGroupValue(group.id, 'rect', rect);
		}

		document.body.removeAttribute('style');

		document.removeEventListener('mousemove', onmousemove);
		document.removeEventListener('mouseup', onmouseup);
	};

	document.addEventListener('mousemove', onmousemove, false);
	document.addEventListener('mouseup', onmouseup, false);

}
