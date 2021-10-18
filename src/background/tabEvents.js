
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
	if (!backup.opening) {
		if (!core.openingPanoramaView) {
			// Normal case: everything except the Panorama View tab
			// If the tab does not have a group, set its group to the current group
			const tabGroupId = await addon.tabs.getGroupId(tab.id);

			if (tabGroupId == undefined) {

				let activeGroup = undefined;

				while (activeGroup == undefined) {
					activeGroup = await addon.tabGroups.getActiveId(tab.windowId);
				}
				addon.tabs.setGroupId(tab.id, activeGroup);
			}
		} else {
			// Opening the Panorama View tab
			// Make sure it's in the special group
			core.setOpeningPanoramaView(false);
			addon.tabs.setGroupId(tab.id, -1);
		}
	}
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
	if (changeInfo.pinned != undefined) {
		if (changeInfo.pinned) {
			addon.tabs.setGroupId(tabId, -1);
		} else {
			const activeGroupId = await addon.tabGroups.getActiveId(tab.windowId);
			addon.tabs.setGroupId(tabId, activeGroupId);
			
			const panoramaViewTab = await core.getPanoramaViewTab();

			if (panoramaViewTab && panoramaViewTab.active) {
				browser.tabs.hide(tabId);
			}
		}
	}
}


async function activated(activeInfo) {

	const tab = await browser.tabs.get(activeInfo.tabId);

	if (!tab.pinned) {
		// Set the window's active group to the new active tab's group
		let activeGroupId = undefined;
		while (activeGroupId == undefined) {
			activeGroupId = await addon.tabs.getGroupId(activeInfo.tabId);
		}
		
		if (activeGroupId != -1) {
			addon.tabGroups.setActiveId(tab.windowId, activeGroupId);
		}

		core.toggleVisibleTabs(tab.windowId, activeGroupId);
	}
}
