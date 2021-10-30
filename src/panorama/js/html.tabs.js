
'use strict';

import {newElement} from '/common/html.js'
import * as drag from './view.drag.js'
import * as core from './view.js'


export function create(tab) {

	let thumbnail     = newElement('img', {class: 'thumbnail'});
	let favicon       = newElement('img', {class: 'favicon'});
	let close         = newElement('div', {class: 'close'});
	let title         = newElement('span');
	let nameContainer = newElement('div', {class: 'title'}, [title]);

	let node = newElement('div', {class: 'tab', draggable: 'true', id: 'tab'+tab.id, title: ''}, [favicon, thumbnail, close, nameContainer]);

	node.addEventListener('click', function(event) {
		event.preventDefault();
		event.stopPropagation();
		
		if (event.ctrlKey) {
			drag.selectTab(tab.id);
		} else {
			browser.tabs.update(tab.id, {active: true});
		}
	}, false);

	node.addEventListener('auxclick', function(event) {
		event.preventDefault();
		event.stopPropagation();

		if (event.button == 1) { // middle mouse
			browser.tabs.remove(tab.id);
		}
	}, false);

	close.addEventListener('click', function(event) {
		event.stopPropagation();
		browser.tabs.remove(tab.id);
	}, false);

	node.addEventListener('dragstart', drag.tabDragStart, false);
	node.addEventListener('drop', drag.tabDrop, false);
	node.addEventListener('dragend', drag.tabDragEnd, false);
	
	return node;
}

export function get(tabId) {
	return document.getElementById('tab'+tabId);
}

export async function update(tabNode, tab) {
	if (tabNode) {
		tabNode.querySelector('.title span').textContent = tab.title;

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

	let tabs = await browser.tabs.query({currentWindow: true});
	
	tabs.sort((tabA, tabB) => {
		return tabB.lastAccessed - tabA.lastAccessed;
	});
	
	const activeTabId = (tabs[0].url == browser.runtime.getURL('panorama/view.html')) ? tabs[1].id : tabs[0].id ;

	const tabNode    = get(activeTabId);
	const activeNode = document.querySelector('.tab.active');

	if (activeNode) activeNode.classList.remove('active');
	if (tabNode)    tabNode.classList.add('active');
}

export async function insert(tabNode, tab) {

	let tabGroupNode = document.getElementById('tabGroup'+tab.groupId);

	let tabs = await browser.tabs.query({windowId: core.viewWindowId});

	let lastTab = undefined;
	for (let _tab of tabs) {

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
