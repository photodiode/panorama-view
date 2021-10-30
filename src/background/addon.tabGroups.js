
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
