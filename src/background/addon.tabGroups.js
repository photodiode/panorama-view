
'use strict';

import * as addon_tabs from './addon.tabs.js';
import * as core from './core.js';

// internal
async function getCurrentWindowId() {
	return (await browser.windows.getCurrent()).id;
}

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

	createInfo.windowId = createInfo.windowId || await getCurrentWindowId();
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
	
	tabGroup.windowId = createInfo.windowId;

	browser.runtime.sendMessage({event: 'browser.tabGroups.onCreated', data: tabGroup});

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
	const removing = browser.tabs.remove(tabsToRemove); //!\ check for error and don't remove group if all tabs are not closed
	// I might not be able to check if the tabs ACTUALLY got removed..
	// beforeunload and such
	// removing.then(() => { console.log('removed'); }, (error) => { console.log(error);});
	// ----

	const windowId = await getCurrentWindowId()
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

	browser.runtime.sendMessage({event: 'browser.tabGroups.onRemoved', data: {groupId: tabGroupId, removeInfo: {windowId: windowId}}});

	return tabGroupId;
}

export async function get(tabGroupId) {
	if (tabGroupId == undefined) return;

	const windowId  = await getCurrentWindowId();
	let   tabGroups = await getTabGroups(windowId);

	let tabGroup = tabGroups.find((tabGroup) => { return tabGroup.id == tabGroupId; });
	if (!tabGroup) return;

	tabGroup.windowId = windowId;

	return tabGroup;
}


export async function query(queryInfo = {}) {

	let matchingTabGroups = [];
	
	if (queryInfo.windowId) {
		matchingTabGroups = matchingTabGroups.concat(await getTabGroups(queryInfo.windowId));
	} else if (queryInfo.currentWindow) {
		const currentWindowId = await getCurrentWindowId();
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

	return matchingTabGroups;
}


export async function update(tabGroupId, updateInfo = {}) {

	const windowId = await getCurrentWindowId()
	let tabGroups = await getTabGroups(windowId);

	let tabGroup = tabGroups.find((tabGroup) => { return tabGroup.id == tabGroupId; });
	if (!tabGroup) return;

	if (updateInfo.hasOwnProperty('title')) {
		tabGroup.title = updateInfo.title;
	}

	if (updateInfo.hasOwnProperty('rect')) {
		tabGroup.rect = updateInfo.rect;
	}
	
	tabGroup.lastAccessed = (new Date).getTime();
	
	await setTabGroups(windowId, tabGroups);
	
	tabGroup.windowId = windowId;

	browser.runtime.sendMessage({event: 'browser.tabGroups.onUpdated', data: tabGroup});
	
	return tabGroup;
}
