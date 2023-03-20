
'use strict';

import {newElement} from '/common/html.js'
import * as drag from './view.drag.js'
import * as core from './view.js'


export function create(tab) {

	const thumbnail = newElement('img', {class: 'thumbnail'});
	const favicon   = newElement('img', {class: 'favicon'});
	const close     = newElement('div', {class: 'close'});
	const title     = newElement('span');
	const titleSpan = newElement('div', {class: 'title'}, [title]);
	const context   = newElement('div', {class: 'context'})

	const container = newElement('div', {class: 'container'}, [favicon, thumbnail, close, titleSpan]);

	const node = newElement('div', {href: '', class: 'tab', draggable: 'true', 'data-id': tab.id, title: '', tabindex: 0}, [container, context]);

	node.addEventListener('click', (event) => {
		event.preventDefault();
		if (event.ctrlKey) {
			drag.selectTab(tab.id);

		} else {
			browser.tabs.update(tab.id, {active: true});
		}
	}, false);

	node.addEventListener('keydown', (event) => {
		if (event.key == 'Enter') {
			if (event.ctrlKey) {
				drag.selectTab(tab.id);

			} else {
				browser.tabs.update(tab.id, {active: true});
			}
		}
	}, false);

	// showDefaults not yet working for tabs :C
	/*node.addEventListener('contextmenu', () => {
		browser.menus.overrideContext({
			context: 'tab',
			tabId: tab.id
		});
	}, { capture: true });*/

	node.addEventListener('auxclick', (event) => {
		event.preventDefault();
		if (event.button == 1) { // middle mouse
			browser.tabs.remove(tab.id);
		}
	}, false);

	node.addEventListener('keyup', (event) => {
		event.preventDefault();
		if (event.ctrlKey && event.key == 'Delete') {
			browser.tabs.remove(tab.id);
		}
	}, false);

	close.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		browser.tabs.remove(tab.id);
	}, false);

	node.addEventListener('dragstart', drag.tabDragStart, false);
	node.addEventListener('drop', drag.tabDrop, false);
	node.addEventListener('dragend', drag.tabDragEnd, false);

	return node;
}

export function get(tabId) {
	return document.querySelector(`.tab[data-id="${tabId}"]`);
}

export async function update(tabNode, tab) {
	if (tabNode) {
		tabNode.querySelector('.title span').textContent = tab.title;

		if (tab.cookieStoreId != 'firefox-default') {
			const contextInfo = await browser.contextualIdentities.get(tab.cookieStoreId);

			tabNode.querySelector('.context').style.backgroundColor = contextInfo.colorCode;
			tabNode.querySelector('.context').title = contextInfo.name;
		}

		tabNode.title = tab.title + ((tab.url.substr(0, 5) != 'data:') ? ' - ' + decodeURI(tab.url) : '');

		if (tab.discarded) {
			tabNode.classList.add('inactive');
		} else {
			tabNode.classList.remove('inactive');
		}
	}
}

export async function updateFavicon(tabNode, tab) {
	if (tabNode) {
		if (tab.favIconUrl &&
		    tab.favIconUrl.substr(0, 22) != 'chrome://mozapps/skin/' &&
		    tab.favIconUrl != tab.url) {
			tabNode.querySelector('.favicon').src = tab.favIconUrl;
		}
	}
}


export async function updateThumbnail(tabNode, tabId, thumbnail) {
	if (tabNode) {
		if (!thumbnail) thumbnail = await browser.sessions.getTabValue(tabId, 'thumbnail');
		if (thumbnail)  tabNode.querySelector('.thumbnail').src = thumbnail;
	}
}

export async function setActive() {

	let tabs;
	try {
		tabs = await browser.tabs.query({currentWindow: true});
	} catch (error) {
		return;
	}

	tabs.sort((tabA, tabB) => {
		return tabB.lastAccessed - tabA.lastAccessed;
	});

	const activeTabId = (tabs[0].url.includes(browser.runtime.getURL('panorama/view.html'))) ? tabs[1].id : tabs[0].id ;

	const tabNode    = get(activeTabId);
	const activeNode = document.querySelector('.tab.active');

	if (activeNode) activeNode.classList.remove('active');
	if (tabNode) {
		tabNode.classList.add('active');
		tabNode.focus();
	}
}

export async function insert(tabNode, tab) {

	const tabGroupNode = document.querySelector(`.group[data-id="${tab.groupId}"]`);

	const tabs = await browser.tabs.query({windowId: core.viewWindowId});

	let lastTab = undefined;
	for (const _tab of tabs) {

		if (_tab.groupId != tab.groupId) continue;

		if (_tab.id == tab.id) {

			const tabGroupTabsNode = tabGroupNode.querySelector('.tabs');

			if (tabGroupTabsNode.children.length == 1) {
				tabGroupTabsNode.insertAdjacentElement('afterbegin', tabNode);
			} else {
				if (!lastTab) {
					tabGroupTabsNode.insertAdjacentElement('afterbegin', tabNode);
				} else if (lastTab.groupId == tab.groupId) {
					get(lastTab.id).insertAdjacentElement('afterend', tabNode);
				} else {
					tabGroupTabsNode.insertAdjacentElement('afterbegin', tabNode);
				}
			}
		}
		lastTab = _tab;
	}
}
