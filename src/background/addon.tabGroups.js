
'use strict';

import * as core from './core.js'
import * as addon_tabs from './addon.tabs.js'
import * as backup from './backup.js'

import Mutex from '/common/mutex.js'

// internal
let groupUuid = 0;
let groups    = []; // cache
let groupLock = new Mutex();

function newGroupId() {
	return groupUuid += 1;
}

async function saveGroups() {
	const windows = await browser.windows.getAll({});

	await Promise.all(windows.map(async(window) => {
		let windowGroups = [];
		for (const group of groups) {
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
	let unlock = await groupLock.lock();
	if (!groups.find(group => group.id == groupId)) return undefined;
	await unlock();
	return browser.sessions.setWindowValue(windowId, 'activeGroup', groupId);
}

export async function getActiveId(windowId) {
	return browser.sessions.getWindowValue(windowId, 'activeGroup');
}


export async function initialize() {
	const windows = await browser.windows.getAll({});

	for (const window of windows) {
		let windowGroups = await browser.sessions.getWindowValue(window.id, 'groups');

		if (!windowGroups) continue;

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

	browser.windows.onCreated.addListener(windowCreated);
	browser.windows.onRemoved.addListener(windowId => {
		groups = groups.filter(group => group.windowId != windowId);
	});
}


function windowCreated(window) {
	if (!backup.opening) {
		create({}, window.id);
	}
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

	let unlock = await groupLock.lock();

	groups.push(group);
	await saveGroups();

	await unlock();

	await setActiveId(group.windowId, group.id);

	if (info.hasOwnProperty('populate') && info.populate == true) {
		addon_tabs.create({groupId: group.id, windowId: group.windowId});
	}

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onCreated', group: sanitizeGroup(group)});
	      sending.catch(error => {});

	return sanitizeGroup(group);
}

export async function get(groupId) {
	let unlock = await groupLock.lock();
	const group = groups.find(group => group.id == groupId);
	await unlock();
	if (!group) throw Error(`Invalid group ID: ${groupId}`);
	return sanitizeGroup(group);
}


export async function query(info = {}, currentWindowId) {

	if (info.currentWindow == true) {
		info.windowId = currentWindowId;
	}

	let unlock = await groupLock.lock();
	let matchingGroups = groups;
	await unlock();

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

	let unlock = await groupLock.lock();
	const group = groups.find(group => group.id == groupId);
	await unlock();

	if (!group) {
		throw Error(`Invalid group ID: ${groupId}`);
	}

	// remove tabs in group
	const tabs = await browser.tabs.query({currentWindow: true});
	let tabsToRemove = [];

	for (const tab of tabs) {
		tab.groupId = await browser.sessions.getTabValue(tab.id, 'groupId');
		if (tab.groupId == groupId) {
			tabsToRemove.push(tab.id);
		}
	}
	await browser.tabs.remove(tabsToRemove);

	// check if tabs were removed and abort if not (beforeunload was called or something)
	for (const tabId of tabsToRemove) {
		try {
			tab = await browser.tabs.get(tabId);
			return undefined;
		} catch (error) {
			// all good, tab was removed
		}
	}
	// ----

	unlock = await groupLock.lock();

	groups = groups.filter(_group => _group.id != group.id);
	await saveGroups();

	const windowGroups = groups.find(_group => _group.windowId == group.windowId);

	await unlock();

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onRemoved', groupId: groupId, removeInfo: {windowId: group.windowId}});
	      sending.catch(error => {});

	if (windowGroups == undefined) {
		await create({windowId: group.windowId});
	}

	return groupId;
}


export async function update(groupId, info = {}) {

	let unlock = await groupLock.lock();

	let group = groups.find(group => group.id == groupId);
	if (!group) {
		await unlock();
		throw Error(`Invalid group ID: ${groupId}`);
	}

	if (info.hasOwnProperty('title')) {
		group.title = info.title;
	}

	if (info.hasOwnProperty('rect')) {
		group.rect = info.rect;
	}

	group.lastAccessed = (new Date).getTime();

	await saveGroups();

	await unlock();

	const sending = browser.runtime.sendMessage({event: 'browser.tabGroups.onUpdated', group: sanitizeGroup(group)});
	      sending.catch(error => {});

	return sanitizeGroup(group);
}


export async function setGroupValue(groupId, key, value, appId) {

	value = JSON.stringify(value);

	let unlock = await groupLock.lock();

	let group = groups.find(group => group.id == groupId);
	if (!group) {
		await unlock();
		throw Error(`Invalid group ID: ${groupId}`);
	}

	if (!group.hasOwnProperty('sessionStorage')) {
		group.sessionStorage = {};
	}

	if (!group.sessionStorage.hasOwnProperty(appId)) {
		group.sessionStorage[appId] = {};
	}

	group.sessionStorage[appId][key] = value;

	await saveGroups();

	await unlock();

	return;
}


export async function getGroupValue(groupId, key, appId) {

	let unlock = await groupLock.lock();

	let group = groups.find(group => group.id == groupId);
	if (!group) {
		await unlock();
		throw Error(`Invalid group ID: ${groupId}`);
	}

	if (group.hasOwnProperty('sessionStorage')     &&
	    group.sessionStorage.hasOwnProperty(appId) &&
	    group.sessionStorage[appId].hasOwnProperty(key)) {

		let value;
		try {
			value = JSON.parse(group.sessionStorage[appId][key]);
		} catch (error) {
			value = undefined;
		}

		await unlock();

		return value;
	}

	await unlock();

	return undefined;
}


export async function removeGroupValue(groupId, key, appId) {

	let unlock = await groupLock.lock();

	let group = groups.find(group => group.id == groupId);
	if (!group) {
		await unlock();
		throw Error(`Invalid group ID: ${groupId}`);
	}

	if (group.hasOwnProperty('sessionStorage')     &&
	    group.sessionStorage.hasOwnProperty(appId) &&
	    group.sessionStorage[appId].hasOwnProperty(key)) {

		delete group.sessionStorage[appId][key];

		await saveGroups();

		await unlock();

		return;
	}

	await unlock();

	throw Error(`Invalid key: ${key}`);
}
