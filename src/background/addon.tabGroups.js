
'use strict';

import * as addon_tabs from "./addon.tabs.js";
import * as core from "./core.js";

// internal
async function newTabGroupId(windowId) {
	let groupIndex = await browser.sessions.getWindowValue(windowId, 'groupIndex');
	let tabGroupId = groupIndex || 0;
	await browser.sessions.setWindowValue(windowId, 'groupIndex', tabGroupId + 1);

	return tabGroupId;
}

export async function getTabGroups(windowId) {
	let groups = await browser.sessions.getWindowValue(windowId, 'groups');
	if (groups == undefined) {
		groups = [];
	}
	return groups;
}

export async function setTabGroups(windowId, tabGroups) {
	await browser.sessions.setWindowValue(windowId, 'groups', tabGroups);
}

export async function getActiveId(windowId) {
	return browser.sessions.getWindowValue(windowId, 'activeGroup');
}

export async function setActiveId(windowId, tabGroupId) {
	return browser.sessions.setWindowValue(windowId, 'activeGroup', tabGroupId);
}

async function handleActions(message, sender, sendResponse) {

	let response;

	switch (message.action) {
		case 'browser.tabGroups.create': {
			response = await create(message.info);
			break;
		}
		case 'browser.tabGroups.remove': {
			response = await remove(message.info);
			break;
		}
		case 'browser.tabGroups.query': {
			response = await query(message.info);
			break;
		}
		case 'browser.tabGroups.update': {
			response = await update(message.id, message.info);
			break;
		}
		default:
			console.log('Unknown action');
	}

	return response;
}
// ----


export function initialize() {
	browser.runtime.onMessage.addListener(handleActions);
}


export async function create(createInfo = {}) {

	createInfo.windowId = createInfo.windowId || (await browser.windows.getCurrent()).id;
	createInfo.rect = createInfo.rect || {x: 0.3, y: 0.3, w: 0.4, h: 0.4};
	
	const tabGroupId = await newTabGroupId(createInfo.windowId);

	const tabGroup = {
		id:           tabGroupId,
		title:        createInfo.title       || 'Untitled',
		containerId:  createInfo.containerId || 'firefox-default',

		lastUpdated: (new Date).getTime(),
		rect:        createInfo.rect // temporary
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

	browser.runtime.sendMessage({event: "browser.tabGroups.onCreated", windowId: createInfo.windowId, data: tabGroup});

	return tabGroup;
}


export async function remove(tabGroupId) {
	
	// remove tabs in group
	const tabs = browser.tabs.query({currentWindow: true});
	
	for (let tab of await tabs) {
		tab.groupId = await addon_tabs.getGroupId(tab.id);
		if (tab.groupId == tabGroupId) {
			browser.tabs.remove(tab.id);
		}
	}
	// ----

	const windowId = (await browser.windows.getCurrent()).id
	let tabGroups = await getTabGroups(windowId);

	for (let i = 0; i < tabGroups.length; i++) {
		if (tabGroups[i].id == tabGroupId) {
			tabGroups.splice(i, 1);
			break;
		}
	}
	await setTabGroups(windowId, tabGroups);

	if (tabGroups.length == 0) {
		await create({windowId: windowId, empty: false});
	}

	browser.runtime.sendMessage({event: "browser.tabGroups.onRemoved", windowId: windowId, data: tabGroupId});

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
		updatedTabGroup.lastUpdated = (new Date).getTime();
	}
	
	await setTabGroups(windowId, tabGroups);

	browser.runtime.sendMessage({event: "browser.tabGroups.onUpdated", windowId: windowId, data: updatedTabGroup});

	return updatedTabGroup;
}
