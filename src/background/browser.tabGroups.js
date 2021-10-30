
'use strict';

import * as core from './core.js';

// internal
let groupUuid = 0;
let groups    = []; // cache

function newGroupId() {
	return groupUuid += 1;
}

async function saveGroups() {
	const windows = await browser.windows.getAll({});
	
	await Promise.all(windows.map(async(window) => {
		let windowGroups = [];
		for (let group of groups) {
			if (group.windowId == window.id) {
				windowGroups.push(group);
			}
		}
		await browser.sessions.setWindowValue(window.id, 'groups', windowGroups);
	}));
}

async function setActiveGroup(windowId, groupId) {
	return browser.sessions.setWindowValue(windowId, 'activeGroup', groupId);
}

function sanitizeGroup(group) {
	return {
		cookieStoreId: group.cookieStoreId,
		id:            group.id,
		title:         group.title,
		windowId:      group.windowId,

		lastAccessed:  group.lastAccessed, // temporary
		rect:          group.rect || {x: 0.3, y: 0.3, w: 0.4, h: 0.4} // temporary
	}
}
// ----

export async function initialize() {
	const windows = await browser.windows.getAll({});

	for (const window of windows) {
		let windowGroups = await browser.sessions.getWindowValue(window.id, 'groups');

		for (let group of windowGroups) {
			group.windowId = window.id;

			if (group.id > groupUuid) {
				groupUuid = group.id;
			}
		}

		if (windowGroups) {
			groups = groups.concat(windowGroups);
		}
	}

	browser.windows.onCreated.addListener(window => create({}, window.id));
	browser.windows.onRemoved.addListener(windowId => {
		groups = groups.filter(group => group.windowId != windowId);
	});
}

export async function create(info = {}, currentWindowId) {

	info.windowId = info.windowId || currentWindowId;

	const group = {
		cookieStoreId:  info.cookieStoreId || 'firefox-default',
		id:             newGroupId(),
		sessionStorage: {},
		title:          info.title || 'Untitled',
		windowId:       info.windowId,

		lastAccessed: (new Date).getTime(), // temporary
		rect:         info.rect             // temporary
	};

	groups.push(group);
	await saveGroups();

	await setActiveGroup(group.windowId, group.id);

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onCreated', group: sanitizeGroup(group)});
	      sending.catch(error => {});

	return sanitizeGroup(group);
}

export async function get(groupId) {
	const group = groups.find(group => group.id == groupId);
	if (!group) return undefined;
	return sanitizeGroup(group);
}

export async function query(info = {}, currentWindowId) {

	if (info.currentWindow == true) {
		info.windowId = currentWindowId;
	}

	let matchingGroups = groups;

	if (info.hasOwnProperty('windowId')) {
		matchingGroups = matchingGroups.filter(group => group.windowId == info.windowId);
	}

	if (info.hasOwnProperty('id')) {
		matchingGroups = matchingGroups.filter(group => group.id == info.id);
	}

	if (info.hasOwnProperty('title')) {
		matchingGroups = matchingGroups.filter(group => group.title == info.title);
	}

	return matchingGroups.map(group => sanitizeGroup(group));
}

export async function remove(groupId) {
	
	const group = groups.find(group => group.id == groupId);
	if (!group) return undefined;
	
	// remove tabs in group
	const tabs = await browser.tabs.query({currentWindow: true});
	let tabsToRemove = [];

	for (const tab of tabs) {
		tab.groupId = await browser.sessions.getTabValue(tab.id, 'groupId');
		if (tab.groupId == groupId) {
			tabsToRemove.push(tab.id);
		}
	}
	const removing = browser.tabs.remove(tabsToRemove); //!\ check for error and don't remove group if all tabs are not closed
	// I might not be able to check if the tabs ACTUALLY got removed..
	// beforeunload and such
	// removing.then(() => { console.log('removed'); }, (error) => { console.log(error);});
	// ----
	
	groups = groups.filter(_group => _group.id != group.id);
	if ((await query({currentWindow: true}, group.windowId)).length == 0) {
		await create({windowId: group.windowId});
	} else {
		await saveGroups();
	}

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onRemoved', groupId: groupId, removeInfo: {windowId: group.windowId}});
	      sending.catch(error => {});

	return groupId;
}

export async function update(groupId, info = {}) {

	let group = groups.find(group => group.id == groupId);
	if (!group) return undefined;

	if (info.hasOwnProperty('title')) {
		group.title = info.title;
	}

	if (info.hasOwnProperty('rect')) {
		group.rect = info.rect;
	}
	
	group.lastAccessed = (new Date).getTime();
	
	await saveGroups();

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onUpdated', group: sanitizeGroup(group)});
	      sending.catch(error => {});
	
	return sanitizeGroup(group);
}
