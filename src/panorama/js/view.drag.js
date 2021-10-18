
'use strict';

import {addon} from './addon.js';
import {html}  from './html.js';


let selectedTabs = [];



async function moveTabs(e, windowId, tabGroupId, index) {

	let tabIds = [];
	for (const tabIdData of e.dataTransfer.items) {
		const tabId = Number(e.dataTransfer.getData(tabIdData.type));
		tabIds.push(tabId);
	}

	browser.tabs.move(tabIds, {index: index, windowId: windowId});
	
	for (let tabId of tabIds) {
		addon.tabs.setGroupId(tabId, tabGroupId);
	}
}


// view events
export function viewDragOver(e) {
	e.preventDefault(); // Necessary. Allows us to drop.
	e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
	return false;
}

export async function viewDrop(e) {
	e.stopPropagation();
	
	const currentWindowId = (await browser.windows.getCurrent()).id;
	const tabGroup = await addon.tabGroups.create({windowId: currentWindowId});

	// move the tab node
	let groupNode = html.groups.get(tabGroup.id);

	for (const tabIdData of e.dataTransfer.items) {
		const tabId = Number(e.dataTransfer.getData(tabIdData.type));
		
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			groupNode.querySelector('.newtab').insertAdjacentElement('beforebegin', tabNode);
		}
	}

	for (let tabGroupNode of document.getElementById('groups').childNodes) {
		html.groups.fitTabs(tabGroupNode);
	}
	// ----
	
	moveTabs(e, currentWindowId, tabGroup.id, -1);

	return false;
}
// ----

// group events
export function groupDragOver(e) {
	e.preventDefault(); // Necessary. Allows us to drop.
	e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
	return false;
}

export async function groupDrop(e) {
	e.stopPropagation();
	
	let groupNode = e.target;
	while (!groupNode.classList.contains('group')) {
		if (groupNode.classList.contains('tab')) return false;
		groupNode = groupNode.parentNode;
	}
	
	// move the tab node
	for (const tabIdData of e.dataTransfer.items) {
		const tabId = Number(e.dataTransfer.getData(tabIdData.type));
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			groupNode.querySelector('.newtab').insertAdjacentElement('beforebegin', tabNode);
		}
	}

	for (let tabGroupNode of document.getElementById('groups').childNodes) {
		html.groups.fitTabs(tabGroupNode);
	}
	// ----

	const tabGroupId = Number(groupNode.id.substr(8));
	const currentWindowId = (await browser.windows.getCurrent()).id;
	
	moveTabs(e, currentWindowId, tabGroupId, -1);
	
	return false;
}
// ----

// tab events
export function selectTab(tabId) {

	const tabNode = html.tabs.get(tabId);
	
	const i = selectedTabs.indexOf(tabId);
	
	if (i >= 0) {
		selectedTabs.splice(i, 1);
		tabNode.classList.remove('selected');
	} else {
		selectedTabs.push(tabId);
		tabNode.classList.add('selected');
	}
	
	// sort by index
	let tabNodes = document.querySelectorAll('.tab');
	let tabIds = [];
	
	for (const node of tabNodes) {
		const id = Number(node.id.substr(3));
		if (selectedTabs.includes(id)) {
			tabIds.push(id);
		}
	}
	
	selectedTabs = tabIds;
	// ----
}

export function clearTabSelection(e) {
	if (selectedTabs.length > 0 && !e.ctrlKey) {

		for (const tabId of selectedTabs) {
			const tabNode = html.tabs.get(tabId);
			if (tabNode) {
				tabNode.classList.remove('selected');
			}
		}
		selectedTabs = [];
	}
}

export function tabDragStart(e) {

	e.dataTransfer.effectAllowed = 'move';
	
	if (selectedTabs.length == 0) {
		selectTab(Number(this.id.substr(3)));
	}

	for (const i in selectedTabs) {
		const tabNode = html.tabs.get(selectedTabs[i]);

		e.dataTransfer.setData('text/panorama-view-tab-id-'+i, selectedTabs[i]);
		
		tabNode.classList.add('drag');
	}
	

	const rect = this.getBoundingClientRect();

	e.dataTransfer.setDragImage(
		this,
		(rect.width / 2),
		(rect.height / 2)
	);
}

export async function tabDrop(e) {
	e.stopPropagation();
	
	// get target tab
	let tabNode = e.target;
	while (!tabNode.classList.contains('tab')) {
		tabNode = tabNode.parentNode;
	}
	// ----

	// get taget tab group ID
	let groupNode = e.target;
	while (!groupNode.classList.contains('group')) {
		groupNode = groupNode.parentNode;
	}
	const tabGroupId = Number(groupNode.id.substr(8));
	// ----


	const rect = tabNode.getBoundingClientRect();
	let dropBefore = true;
	
	if (groupNode.querySelector('.tabs').classList.contains('list')) {
		if (e.clientY > rect.top+(rect.height/2)) {
			dropBefore = false;
		}
	} else {
		if (e.clientX > rect.left+(rect.width/2)) {
			dropBefore = false;
		}
	}
	
	

	// move the tab node
	for (const tabIdData of e.dataTransfer.items) {
		const tabId = Number(e.dataTransfer.getData(tabIdData.type));
		const _tabNode = html.tabs.get(tabId);
		if (_tabNode) {
			if (dropBefore) {
				tabNode.insertAdjacentElement('beforebegin', _tabNode);
			} else {
				tabNode.insertAdjacentElement('afterend', _tabNode);
			}
		}
	}

	for (let tabGroupNode of document.getElementById('groups').childNodes) {
		html.groups.fitTabs(tabGroupNode);
	}
	// ----
	
	
	const tabId = Number(tabNode.id.substr(3));
	const tab = await browser.tabs.get(tabId);
	
	const currentWindowId = (await browser.windows.getCurrent()).id;

	// find new index
	let toIndex = Number(tab.index);
	
	const fromTabId = Number(e.dataTransfer.getData(e.dataTransfer.items[0].type));
	let fromIndex = (await browser.tabs.get(fromTabId)).index;
	
	if (fromIndex < toIndex) {
		if (dropBefore) {
			toIndex--;
		}
	} else {
		if (!dropBefore) {
			toIndex++;
		}
	}
	// ----
	
	moveTabs(e, currentWindowId, tabGroupId, toIndex);
	
	return false;
}

export function tabDragEnd(e) {
	for (const tabIdData of e.dataTransfer.items) {
		const tabId = Number(e.dataTransfer.getData(tabIdData.type));
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			tabNode.classList.remove('drag');
		}
	}
	clearTabSelection(e);
}
// ----
