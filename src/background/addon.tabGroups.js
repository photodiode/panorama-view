
'use strict';

import * as core from './core.js'
import * as addon_tabs from './addon.tabs.js'

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

function sanitizeGroup(group) {
	return {
		cookieStoreId: group.cookieStoreId,
		id:            group.id,
		title:         group.title,
		windowId:      group.windowId,

		lastAccessed:  group.lastAccessed, // temporary
	}
}
// ----

export async function setActiveId(windowId, groupId) {
	if(!groups.find(group => group.id == groupId)) return undefined;
	return browser.sessions.setWindowValue(windowId, 'activeGroup', groupId);
}

export async function getActiveId(windowId) {
	return browser.sessions.getWindowValue(windowId, 'activeGroup');
}


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
		title:          info.title || browser.i18n.getMessage('defaultGroupName'),
		windowId:       info.windowId,

		lastAccessed: (new Date).getTime(), // temporary
	};

	groups.push(group);
	await saveGroups();

	await setActiveId(group.windowId, group.id);
	
	if (info.hasOwnProperty('populate') && info.populate == true) {
		addon_tabs.create({groupId: group.id, windowId: group.windowId});
	}

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onCreated', group: sanitizeGroup(group)});
	      sending.catch(error => {});

	return sanitizeGroup(group);
}

export async function get(groupId) {
	const group = groups.find(group => group.id == groupId);
	if (!group) throw Error(`Invalid group ID: ${groupId}`);
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
	if (!group) throw Error(`Invalid group ID: ${groupId}`);

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
	if (!group) throw Error(`Invalid group ID: ${groupId}`);

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


export async function setGroupValue(groupId, key, value, appId) {
	
	value = JSON.stringify(value);

	let group = groups.find(group => group.id == groupId);
	if (!group) throw Error(`Invalid group ID: ${groupId}`);

	if (!group.hasOwnProperty('sessionStorage')) {
		group.sessionStorage = {};
	}

	if (!group.sessionStorage.hasOwnProperty(appId)) {
		group.sessionStorage[appId] = {};
	}

	group.sessionStorage[appId][key] = value;

	await saveGroups();

	return;
}


export async function getGroupValue(groupId, key, appId) {

	let group = groups.find(group => group.id == groupId);
	if (!group) throw Error(`Invalid group ID: ${groupId}`);

	if (group.hasOwnProperty('sessionStorage')     &&
	    group.sessionStorage.hasOwnProperty(appId) &&
	    group.sessionStorage[appId].hasOwnProperty(key)) {
		
		let value;
		try {
			value = JSON.parse(group.sessionStorage[appId][key]);
		} catch (error) {
			value = undefined;
		}

		return value;
	}

	return undefined;
}


export async function removeGroupValue(groupId, key, appId) {

	let group = groups.find(group => group.id == groupId);
	if (!group) throw Error(`Invalid group ID: ${groupId}`);

	if (group.hasOwnProperty('sessionStorage')     &&
	    group.sessionStorage.hasOwnProperty(appId) &&
	    group.sessionStorage[appId].hasOwnProperty(key)) {

		delete group.sessionStorage[appId][key];

		await saveGroups();

		return;
	}

	throw Error(`Invalid key: ${key}`);
}
