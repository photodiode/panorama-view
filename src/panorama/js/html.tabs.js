
'use strict';

import {newElement} from './html.js';
import {addon} from './addon.js';
import * as drag from './view.drag.js';


export function create(tab) {

	let thumbnail     = newElement('div', {class: 'thumbnail'});
	let favicon       = newElement('div', {class: 'favicon'});
	let close         = newElement('div', {class: 'close'});
	let title         = newElement('span');
	let nameContainer = newElement('div', {class: 'title'}, [title]);

	let node = newElement('div', {class: 'tab', draggable: 'true', id: 'tab'+tab.id, title: ""}, [favicon, thumbnail, close, nameContainer]);

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
	/*node.addEventListener('dragenter', tabDragEnter, false);
	node.addEventListener('dragover', tabDragOver, false);
	node.addEventListener('dragleave', tabDragLeave, false);*/
	node.addEventListener('drop', drag.tabDrop, false);
	node.addEventListener('dragend', drag.tabDragEnd, false);
	
	return node;
}

export function get(tabId) {
	return document.getElementById('tab'+tabId);
}

export async function update(tabNode, tab) {

	if(tabNode) {
		tabNode.querySelector('.title span').innerHTML = '';
		tabNode.querySelector('.title span').appendChild(document.createTextNode(tab.title));

		tabNode.title = tab.title + ((tab.url.substr(0, 5) !== 'data:') ? ' - ' + decodeURI(tab.url) : '');

		if(tab.discarded) {
			tabNode.classList.add('inactive');
		}else{
			tabNode.classList.remove('inactive');
		}
	}
}

export async function updateThumbnail(tabNode, tabId, thumbnail) {

	let formatThumbnail = function(data) {
		return (data) ? 'url(' + data + ')' : '';
	}

	if (tabNode) {
		if (!thumbnail) thumbnail = await browser.sessions.getTabValue(tabId, 'thumbnail');
		tabNode.querySelector('.thumbnail').style.backgroundImage = formatThumbnail(thumbnail);
	}
}

export async function setActive() {
	
	var lastActiveTabId = -1;
	var lastAccessed = 0;

	let tabs = browser.tabs.query({currentWindow: true});
	
	for (let tab of await tabs) {
		tab.groupId = await addon.tabs.getGroupId(tab.id);
		if (tab.lastAccessed > lastAccessed && tab.groupId >= 0) {
			lastAccessed = tab.lastAccessed;
			lastActiveTabId = tab.id;
		}
	}

	let tabNode    = get(lastActiveTabId);
	let activeNode = document.querySelector('.tab.active');

	if (activeNode) {
		activeNode.classList.remove('active');
	}

	if (tabNode) {
		tabNode.classList.add('active');
	}
}

export async function insert(tabNode, tab) {

	let tabGroupNode = document.getElementById('tabGroup'+tab.groupId);

	let tabs = await browser.tabs.query({currentWindow: true});

	let lastTab = undefined;
	for (let _tab of tabs) {
		
		_tab.groupId = await addon.tabs.getGroupId(_tab.id);
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
