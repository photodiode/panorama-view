
'use strict';

import {html}  from './html.js'


let selectedTabs = [];



async function moveTabs(tabIds, windowId, tabGroupId, index) {
	browser.tabs.move(tabIds, {index: index, windowId: windowId, groupId: tabGroupId});
}


function getTabIds(e) {
	return JSON.parse(e.dataTransfer.getData('application/x-panorama-view-tab-list'));
}


// view events
export function viewDragOver(e) {
	e.preventDefault(); // Necessary. Allows us to drop.
	e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
	return false;
}

export async function viewDrop(e) {
	e.preventDefault();
	const tabIds = getTabIds(e);
	e.stopPropagation();

	const currentWindowId = (await browser.windows.getCurrent()).id;
	const tabGroup = await browser.tabGroups.create({windowId: currentWindowId});

	// move the tab node
	const groupNode = html.groups.get(tabGroup.id);

	for (const tabId of tabIds) {
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			groupNode.querySelector('.newtab').insertAdjacentElement('beforebegin', tabNode);
		}
	}

	html.groups.fitTabs();
	// ----

	moveTabs(tabIds, currentWindowId, tabGroup.id, -1);

	clearTabDragCSS(e);

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
	e.preventDefault();
	const tabIds = getTabIds(e);
	e.stopPropagation();

	let groupNode = e.target.closest('.group');

	// move the tab node
	for (const tabId of tabIds) {
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			groupNode.querySelector('.newtab').insertAdjacentElement('beforebegin', tabNode);
		}
	}

	html.groups.fitTabs();
	// ----

	const tabGroupId = parseInt(groupNode.dataset.id);
	const currentWindowId = (await browser.windows.getCurrent()).id;

	moveTabs(tabIds, currentWindowId, tabGroupId, -1);

	clearTabDragCSS(e);

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
	const tabNodes = document.querySelectorAll('.tab');
	let tabIds = [];

	for (const node of tabNodes) {
		const id = parseInt(node.dataset.id);
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

	const tabId = parseInt(this.dataset.id);
	if (!selectedTabs.includes(tabId)) {
		clearTabSelection(e);
	}

	if (selectedTabs.length == 0) {
		selectTab(tabId);
	}

	for (const i in selectedTabs) {
		const tabNode = html.tabs.get(selectedTabs[i]);
		      tabNode.classList.add('drag');
	}

	e.dataTransfer.setData('application/x-panorama-view-tab-list', JSON.stringify(selectedTabs));

	//e.dataTransfer.setData('text/x-moz-url', urlTitleList.join('\r\n'));
	//e.dataTransfer.setData('text/uri-list',  uriList.join('\r\n'));
	//e.dataTransfer.setData('text/plain',     uriList.join('\r\n'));
	//e.dataTransfer.setData('text/html',      links.join('\r\n')); // <a href="url">title</a>

	const rect = this.getBoundingClientRect();

	e.dataTransfer.setDragImage(
		this,
		(rect.width / 2),
		(rect.height / 2)
	);
}

export async function tabDrop(e) {
	e.preventDefault();
	const tabIds = getTabIds(e);
	e.stopPropagation();

	// get target tab
	const tabNode = e.target.closest('.tab');
	if (!tabNode) return false;

	const tab = await browser.tabs.get(parseInt(tabNode.dataset.id));
	// ----

	// abort if you drop over moved tab
	if (tabIds.includes(tab.id)) return false;
	// ----

	// get taget tab group ID
	const groupNode = e.target.closest('.group');
	const tabGroupId = parseInt(groupNode.dataset.id);
	// ----


	const rect = tabNode.getBoundingClientRect();
	let dropBefore = true;

	if (groupNode.querySelector('.tabs.list')) {
		if (e.clientY > rect.top+(rect.height/2)) {
			dropBefore = false;
		}
	} else {
		if (e.clientX > rect.left+(rect.width/2)) {
			dropBefore = false;
		}
	}


	// move the tab node
	for (const tabId of tabIds) {
		if (tabId == tab.id) return false; // abort if you drop over moved tab
		const _tabNode = html.tabs.get(tabId);
		if (_tabNode) {
			if (dropBefore) {
				tabNode.insertAdjacentElement('beforebegin', _tabNode);
			} else {
				tabNode.insertAdjacentElement('afterend', _tabNode);
			}
		}
	}

	html.groups.fitTabs();
	// ----

	const currentWindowId = (await browser.windows.getCurrent()).id;

	// find new index
	let toIndex = tab.index;

	const fromTabId = tabIds[0];
	const fromIndex = (await browser.tabs.get(fromTabId)).index;

	if (fromIndex < toIndex) {
		if (dropBefore) {
			toIndex -= 1;
		}
	} else {
		if (!dropBefore) {
			toIndex += 1;
		}
	}
	// ----

	moveTabs(tabIds, currentWindowId, tabGroupId, toIndex);

	clearTabDragCSS(e);

	return false;
}

function clearTabDragCSS(e) {
	const tabIds = getTabIds(e);
	for (const tabId of tabIds) {
		const tabNode = html.tabs.get(tabId);
		if (tabNode) {
			tabNode.classList.remove('drag');
		}
	}
}

export function tabDragEnd(e) {
	clearTabSelection(e);
}
// ----
