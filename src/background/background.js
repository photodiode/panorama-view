
'use strict';

import {addon} from './addon.js';
import * as core from "./core.js";

import {handleCommands} from './commands.js';
import {handleTabEvents} from './tabEvents.js';

import {migrate} from './migrate.js';

var openingBackup = false;



/** Make sure each window has a group */
async function setupWindows() {

	const windows = browser.windows.getAll({});

	for(const window of await windows) {
		createGroupInWindow(window);
	}
}

/** Create the first group in a window
 * This handles new windows and, during installation, existing windows
 * that do not yet have a group */
async function createGroupInWindow(window) {
	if (!openingBackup) {
		const groups = await addon.tabGroups.query({windowId: window.id});
		if (groups.length == 0) {
			await addon.tabGroups.create({windowId: window.id, title: 'Default', rect: {x: 0, y: 0, w: 0.5, h: 0.5}, empty: true});
		}
	}
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {

	// make array of all groups for quick look-up
	let windowMap = {};
	const windows = await browser.windows.getAll({});

	for (const window of windows) {
		windowMap[window.id] = {groups: await addon.tabGroups.query({windowId: window.id})};
	}

	// check all tabs
	const tabs = browser.tabs.query({});

	for (const tab of await tabs) {
		const groupId = await addon.tabs.getGroupId(tab.id);

		let groupExists = false;
		for (let i in windowMap[tab.windowId].groups) {
			if(windowMap[tab.windowId].groups[i].id == groupId) {
				groupExists = true;
				break;
			}
		}
		if (!groupExists && groupId != -1) {
			const activeGroup = await addon.tabGroups.getActiveId(tab.windowId);
			addon.tabs.setGroupId(tab.id, activeGroup);
		}
	}
}


async function init() {

	await setupWindows();
	await salvageGrouplessTabs();

	await migrate(); //keep until everyone are on 0.8.0
	
	// meny entries
	browser.menus.create({
		id: "newTabGroup",
		title: "New Tab Group",
		contexts: ["browser_action"]
	});

	browser.menus.onClicked.addListener(async(info, tab) => {
		if (info.menuItemId == 'newTabGroup') {
			addon.tabGroups.create();
		}
	});
	// ----

	addon.tabGroups.initialize();
	
	// remove any panorama views there might be, we need a fresh connection to handle messages
	let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL("panorama/view.html")});
	for (let tab of extensionTabs) {
		browser.tabs.remove(tab.id);
	}
	// ----
	
	browser.commands.onCommand.addListener(handleCommands);
	browser.browserAction.onClicked.addListener(core.toggleView);

	browser.windows.onCreated.addListener(createGroupInWindow);

	handleTabEvents();
}

init();
