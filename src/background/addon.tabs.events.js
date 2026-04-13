
'use strict';

import {addon} from './addon.js';
import * as core from './core.js';

import * as backup from './backup.js';

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


export function initialize() {
	browser.tabs.onCreated.addListener(created);
	browser.tabs.onUpdated.addListener(updated);

	browser.tabs.onAttached.addListener(attached);

	browser.tabs.onActivated.addListener(activated);
}




async function created(tab) {

	tab.groupId = undefined;

	if (core.openingPanoramaView) {
		core.setOpeningPanoramaView(false);
		tab.groupId = -1;

	} else if (tab.pinned) {
		tab.groupId = -1;

	} else {
		if (tab.groupId == undefined) {
			tab.groupId = await addon.tabs.getGroupIdTimeout(tab.id, 100); // random timeout
		}
		// check if group exists
		const groups = await addon.tabGroups.query({windowId: tab.windowId});
		const groupsExists = groups.find(group => group.id == tab.groupId);

		if (!groupsExists) {
			tab.groupId = undefined;
			for (let delay = 5; tab.groupId == undefined && delay <= 160; delay *= 2) {
				tab.groupId = await addon.tabGroups.getActiveId(tab.windowId);
				if (tab.groupId == undefined) await sleep(delay);
			}
		}
	}

	await addon.tabs.setGroupId(tab.id, tab.groupId);

	const sending = browser.runtime.sendMessage({event: 'browser.tabs.onCreated', tab: tab});
	      sending.catch(error => {});
}


async function attached(tabId, attachInfo) {

	const panoramaViewTab = await core.getPanoramaViewTab();

	if (panoramaViewTab && panoramaViewTab.active) {
		browser.tabs.hide(tabId);
	}

	const tabGroupId = await addon.tabs.getGroupId(tabId);

	// Check if the tab's group exists in the NEW window
	// Firefox 148+ preserves session data when tabs move between windows (Bug 2002643 fix),
	// so the tab may have a groupId from the old window that doesn't exist in the new window
	let groupExistsInNewWindow = false;
	if (tabGroupId != undefined && tabGroupId != -1) {
		const groups = await addon.tabGroups.query({windowId: attachInfo.newWindowId});
		groupExistsInNewWindow = groups.some(group => group.id == tabGroupId);
	}

	if (tabGroupId == undefined || !groupExistsInNewWindow) {

		let activeGroup = undefined;

		for (let delay = 5; activeGroup == undefined && delay <= 160; delay *= 2) {
			activeGroup = await addon.tabGroups.getActiveId(attachInfo.newWindowId);
			if (activeGroup == undefined) await sleep(delay);
		}
		await addon.tabs.setGroupId(tabId, activeGroup);

		if (!(panoramaViewTab && panoramaViewTab.active)) {
			browser.tabs.show(tabId);
		}
	}
}


async function updated(tabId, changeInfo, tab) {

	tab.groupId = undefined;

	if (changeInfo.hasOwnProperty('pinned')) {
		if (changeInfo.pinned == true) {
			tab.groupId = -1;
			addon.tabs.setGroupId(tabId, tab.groupId);
		} else {
			const activeGroupId = await addon.tabGroups.getActiveId(tab.windowId);
			addon.tabs.setGroupId(tabId, activeGroupId);

			const panoramaViewTab = await core.getPanoramaViewTab();

			if (panoramaViewTab && panoramaViewTab.active) {
				browser.tabs.hide(tabId);
			}
		}
	}

	if (tab.groupId == undefined) {
		for (let delay = 5; tab.groupId == undefined && delay <= 80; delay *= 2) {
			tab.groupId = await addon.tabs.getGroupId(tab.id);
			if (tab.groupId == undefined) await sleep(delay);
		}
	}

	const sending = browser.runtime.sendMessage({event: 'browser.tabs.onUpdated', tabId: tabId, changeInfo: changeInfo, tab: tab});
	      sending.catch(error => {});
}


async function activated(activeInfo) {

	const tab = await browser.tabs.get(activeInfo.tabId);

	if (!tab.pinned) {

		// Set the window's active group to the new active tab's group
		let tabGroupId = await addon.tabs.getGroupIdTimeout(activeInfo.tabId, 100); // random timeout

		if (tabGroupId != -1) {
			// check if group exists
			const groups = await addon.tabGroups.query({windowId: activeInfo.windowId});
			const groupsExists = groups.find(group => group.id == tabGroupId);

			if (!groupsExists) {
				tabGroupId = undefined;
				for (let delay = 5; tabGroupId == undefined && delay <= 160; delay *= 2) {
					tabGroupId = await addon.tabGroups.getActiveId(activeInfo.windowId);
					if (tabGroupId == undefined) await sleep(delay);
				}
				await addon.tabs.setGroupId(activeInfo.tabId, tabGroupId);
			}
			// ----

			if (tabGroupId != undefined) {
				addon.tabGroups.setActiveId(tab.windowId, tabGroupId);
			}
		}
		if (tabGroupId != undefined) {
			core.toggleVisibleTabs(tab.windowId, tabGroupId);
		}
	}
}
