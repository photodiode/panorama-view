
'use strict';

import {addon} from './addon.js';
import * as core from './core.js';

import {handleCommands} from './commands.js';
import {handleTabEvents} from './tabEvents.js';

import * as backup from './backup.js';

import {migrate} from './migrate.js';



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
	if (!backup.opening) {
		const groups = await addon.tabGroups.query({windowId: window.id});
		if (groups.length == 0) {
			await addon.tabGroups.create({windowId: window.id, title: 'Default', rect: {x: 0, y: 0, w: 0.5, h: 0.5}, empty: true});
		}
	}
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {

	const windows = await browser.windows.getAll({populate: true});

	for (const window of windows) {
		const tabGroups = await addon.tabGroups.query({windowId: window.id});

		for (const tab of window.tabs) {

			if (tab.pinned) {
				addon.tabs.setGroupId(tab.id, -1);
			} else {
				const tabGroupId = await addon.tabs.getGroupId(tab.id);

				if (tabGroupId != -1) {
					const tabGroupExists = tabGroups.find((tabGroup) => { return tabGroup.id == tabGroupId; });
					if (!tabGroupExists) {
						const activeGroup = await addon.tabGroups.getActiveId(tab.windowId);
						addon.tabs.setGroupId(tab.id, activeGroup);
					}
				}
			}
		}
	}
}


async function handleActions(message, sender, sendResponse) {
	
	if (!message.action) return;

	let response;

	switch (message.action) {
		case 'browser.tabGroups.create': {
			response = await addon.tabGroups.create(message.info);
			break;
		}
		case 'browser.tabGroups.remove': {
			response = await addon.tabGroups.remove(message.info);
			break;
		}
		case 'browser.tabGroups.query': {
			response = await addon.tabGroups.query(message.info);
			break;
		}
		case 'browser.tabGroups.update': {
			response = await addon.tabGroups.update(message.id, message.info);
			break;
		}
		default:
			console.log(`Unknown action (${message.action})`);
	}

	return response;
}


async function init() {

	await setupWindows();
	await salvageGrouplessTabs();

	await migrate(); // keep until everyone's on 0.9.0

	handleTabEvents();

	browser.commands.onCommand.addListener(handleCommands);
	browser.browserAction.onClicked.addListener(core.toggleView);

	browser.windows.onCreated.addListener(createGroupInWindow);
	
	await salvageGrouplessTabs();

	// meny entries
	browser.menus.create({
		id: 'newTabGroup',
		title: 'New Tab Group',
		contexts: ['browser_action']
	});

	browser.menus.onClicked.addListener(async(info, tab) => {
		if (info.menuItemId == 'newTabGroup') {
			addon.tabGroups.create();
		}
	});
	// ----

	browser.runtime.onMessage.addListener(handleActions);

	// remove any panorama views there might be, we need a fresh connection to handle messages
	let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL('panorama/view.html')});
	for (let tab of extensionTabs) {
		browser.tabs.remove(tab.id);
	}
	// ----
	
	// auto bakup
	backup.start();
	// ----
}

init();
