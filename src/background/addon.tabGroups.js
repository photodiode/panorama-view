
'use strict';

import * as addon_tabs from './addon.tabs.js';
import * as core from './core.js';

// internal
async function newTabGroupId(windowId) {
	let groupIndex = await browser.sessions.getWindowValue(windowId, 'groupIndex');
	let tabGroupId = groupIndex || 0;
	await browser.sessions.setWindowValue(windowId, 'groupIndex', tabGroupId + 1);

	return tabGroupId;
}

async function getTabGroups(windowId) {
	let groups = await browser.sessions.getWindowValue(windowId, 'groups');
	if (groups == undefined) {
		groups = [];
	}
	return groups;
}

async function setTabGroups(windowId, tabGroups) {
	await browser.sessions.setWindowValue(windowId, 'groups', tabGroups);
}
// ----

export async function getActiveId(windowId) {
	return browser.sessions.getWindowValue(windowId, 'activeGroup');
}

export async function setActiveId(windowId, tabGroupId) {

	let tabGroups = await getTabGroups(windowId);

	const i = tabGroups.findIndex((tabGroup) => { return tabGroup.id == tabGroupId; });
	if (i != -1) tabGroups[i].lastAccessed = (new Date).getTime();

	await setTabGroups(windowId, tabGroups);

	return browser.sessions.setWindowValue(windowId, 'activeGroup', tabGroupId);
}


export async function create(createInfo = {}) {

	createInfo.windowId = createInfo.windowId || (await browser.windows.getCurrent()).id;
	createInfo.rect = createInfo.rect || {x: 0.3, y: 0.3, w: 0.4, h: 0.4};
	
	const tabGroupId = await newTabGroupId(createInfo.windowId);

	const tabGroup = {
		id:           tabGroupId,
		title:        createInfo.title       || 'Untitled',
		containerId:  createInfo.containerId || 'firefox-default',

		lastAccessed: (new Date).getTime(),
		rect:         createInfo.rect // temporary
	};

	// update tab groups in window
	let tabGroups = await getTabGroups(createInfo.windowId);
	tabGroups.push(tabGroup);
	await setTabGroups(createInfo.windowId, tabGroups);
	// ----

	// update active tab group in window
	await setActiveId(createInfo.windowId, tabGroup.id);
	// ----

	const panoramaViewTab = await core.getPanoramaViewTab();
	if ((!panoramaViewTab || !panoramaViewTab.active) && !createInfo.empty) {
		browser.tabs.create({});
	}

	browser.runtime.sendMessage({event: 'browser.tabGroups.onCreated', windowId: createInfo.windowId, data: tabGroup});

	return tabGroup;
}


export async function remove(tabGroupId) {
	
	// remove tabs in group
	const tabs = await browser.tabs.query({currentWindow: true});
	
	let tabsToRemove = [];
	
	for (let tab of tabs) {
		tab.groupId = await addon_tabs.getGroupId(tab.id);
		if (tab.groupId == tabGroupId) {
			tabsToRemove.push(tab.id);
		}
	}
	browser.tabs.remove(tabsToRemove); //!\ check for error and don't remove group if all tabs are not closed
	// ----

	const windowId = (await browser.windows.getCurrent()).id
	let tabGroups = await getTabGroups(windowId);

	const i = tabGroups.findIndex((tabGroup) => { return tabGroup.id == tabGroupId; });
	if (i != -1) tabGroups.splice(i, 1);

	await setTabGroups(windowId, tabGroups);
	
	// set new active group
	let activeGroup = await getActiveId(windowId);
	if (activeGroup == tabGroupId) {
		tabGroups.sort((a, b) => {
			return a.lastAccessed - b.lastAccessed;
		});
		await setActiveId(windowId, tabGroups[0].id);
	}
	// ----

	if (tabGroups.length == 0) {
		await create({windowId: windowId, empty: false});
	}

	browser.runtime.sendMessage({event: 'browser.tabGroups.onRemoved', windowId: windowId, data: tabGroupId});

	return tabGroupId;
}


export async function query(queryInfo) {

	queryInfo = queryInfo || {};

	let matchingTabGroups = [];
	
	if (queryInfo.windowId) {
		matchingTabGroups = matchingTabGroups.concat(await getTabGroups(queryInfo.windowId));
	} else if (queryInfo.currentWindow) {
		const currentWindowId = (await browser.windows.getCurrent()).id;
		matchingTabGroups = matchingTabGroups.concat(await getTabGroups(currentWindowId));
	} else {
		const windows = await browser.windows.getAll({windowTypes: ['normal']});
		for(const window of windows) {
			matchingTabGroups = matchingTabGroups.concat(await getTabGroups(window.id));
		}
	}
	
	if (queryInfo.id) {
		for (let tabGroup of matchingTabGroups) {
			if (queryInfo.id == tabGroup.id) {
				matchingTabGroups = tabGroup;
			}
		}
	}
	
	if (queryInfo.populate) {
		// get tabs in group
	}

	return matchingTabGroups;
}


export async function update(tabGroupId, updateInfo) {

	updateInfo = updateInfo || {};
	
	let updatedTabGroup = undefined;

	const windowId = (await browser.windows.getCurrent()).id
	let tabGroups = await getTabGroups(windowId);

	for (let tabGroup of tabGroups) {
		if (tabGroup.id == tabGroupId) {

			for (const key in updateInfo) {
				if (tabGroup[key]) {
					tabGroup[key] = updateInfo[key];
				}
			}
			
			updatedTabGroup = tabGroup;

			break;
		}
	}
	
	if (updatedTabGroup) {
		updatedTabGroup.lastAccessed = (new Date).getTime();
	}
	
	await setTabGroups(windowId, tabGroups);

	browser.runtime.sendMessage({event: 'browser.tabGroups.onUpdated', windowId: windowId, data: updatedTabGroup});

	return updatedTabGroup;
}
