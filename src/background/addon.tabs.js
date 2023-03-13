
'use strict';

export function setGroupId(tabId, groupId) {
	return browser.sessions.setTabValue(tabId, 'groupId', groupId);
}

export function getGroupId(tabId) {
	return browser.sessions.getTabValue(tabId, 'groupId');
}

export async function getGroupIdTimeout(tabId, timeout) {
	let groupId = undefined;
	const start = (new Date).getTime();
	while (groupId == undefined && (((new Date).getTime() - start) < timeout)) {
		groupId = await browser.sessions.getTabValue(tabId, 'groupId');
	}
	return groupId;
}


export async function create(info) {

	let groupId = undefined;

	if (info.hasOwnProperty('groupId')) {
		groupId = info.groupId;
		delete info.groupId;
	}

	let tab;
	try {
		tab = await browser.tabs.create(info);
	} catch (error) {
		throw Error(error);
	}

	// wait for onCreated to add a groupId if none is set
	if (groupId == undefined) {
		groupId = await getGroupIdTimeout(tab.id, 100); // random timeout
	}

	setGroupId(tab.id, groupId);
	tab.groupId = groupId;

	return tab;
}


export async function get(tabId) {

	let tab;
	try {
		tab = await browser.tabs.get(tabId);
	} catch (error) {
		throw Error(error);
	}

	tab.groupId = await getGroupIdTimeout(tab.id, 100);

	return tab;
}


export async function move(tabIds, info) {

	let groupId = undefined;

	if (info.hasOwnProperty('groupId')) {
		groupId = info.groupId;
		delete info.groupId;
	}

	let tabs;
	try {
		tabs = await browser.tabs.move(tabIds, info);
	} catch (error) {
		throw Error(error);
	}

	if (groupId != undefined) {
		if (Array.isArray(tabIds)) {
			await Promise.all(tabIds.map(async(tabId) => {
				await setGroupId(tabId, groupId);
			}));
		} else {
			await setGroupId(tabIds, groupId);
		}
	}

	if (groupId != undefined) {
		for (let tab of tabs) {
			tab.groupId = groupId;
		}
	} else {
		await Promise.all(tabs.map(async(tab) => {
			tab.groupId = await getGroupId(tab.id);
		}));
	}

	return tabs;
}


export async function query(info) {

	let groupId = undefined;

	if (info.hasOwnProperty('groupId')) {
		groupId = info.groupId;
		delete info.groupId;
	}

	let tabs;
	try {
		tabs = await browser.tabs.query(info);
	} catch (error) {
		throw Error(error);
	}

	await Promise.all(tabs.map(async(tab) => {
		tab.groupId = await getGroupId(tab.id);
	}));

	if (groupId != undefined) {
		tabs = tabs.filter(tab => (tab.groupId == groupId));
	}

	return tabs;
}
