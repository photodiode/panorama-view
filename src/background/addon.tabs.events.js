
'use strict';

import {addon} from './addon.js';
import * as core from './core.js';

import * as backup from './backup.js';


export function handleTabEvents() {
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
			while (tab.groupId == undefined) {
				tab.groupId = await addon.tabGroups.getActiveId(tab.windowId);
			}
		}
	}
	
	addon.tabs.setGroupId(tab.id, tab.groupId);

	const sending = browser.runtime.sendMessage({event: 'browser.tabs.onCreated', tab: tab});
	      sending.catch(error => {});
}


async function attached(tabId, attachInfo) {
	
	const panoramaViewTab = await core.getPanoramaViewTab();

	if (panoramaViewTab && panoramaViewTab.active) {
		browser.tabs.hide(tabId);
	}
	
	const tabGroupId = await addon.tabs.getGroupId(tabId);

	if (tabGroupId == undefined) {

		let activeGroup = undefined;

		while (activeGroup == undefined) {
			activeGroup = await addon.tabGroups.getActiveId(attachInfo.newWindowId);
		}
		addon.tabs.setGroupId(tabId, activeGroup);
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
		const start = (new Date).getTime();
		while (tab.groupId == undefined) {
			tab.groupId = await addon.tabs.getGroupId(tab.id);
			if (((new Date).getTime() - start) > 50) break; // timeout
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
				while (tabGroupId == undefined) {
					tabGroupId = await addon.tabGroups.getActiveId(activeInfo.windowId);
				}
			}
			// ----

			addon.tabGroups.setActiveId(tab.windowId, tabGroupId);
		}
		core.toggleVisibleTabs(tab.windowId, tabGroupId);
	}
}
