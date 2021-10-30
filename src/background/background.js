
'use strict';

import * as tabGroups from './browser.tabGroups.js'

import {addon} from './addon.js'
import * as core from './core.js'

import {handleCommands} from './commands.js'
import {handleTabEvents} from './tabEvents.js'

import * as backup from './backup.js'

import {migrate} from './migrate.js'



/** Make sure each window has a group */
async function setupWindows() {

	const windows = browser.windows.getAll({});

	for (const window of await windows) {
		const groups = await tabGroups.query({windowId: window.id});
		if (groups.length == 0) {
			await tabGroups.create({windowId: window.id, rect: {x: 0, y: 0, w: 0.5, h: 0.5}});
		}
	}
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {

	const windows = await browser.windows.getAll({populate: true});

	for (const window of windows) {
		const groups = await tabGroups.query({windowId: window.id});

		for (const tab of window.tabs) {

			if (tab.pinned) {
				addon.tabs.setGroupId(tab.id, -1);
			} else {
				const tabGroupId = await addon.tabs.getGroupId(tab.id);

				if (tabGroupId != -1) {
					const tabGroupExists = groups.find((tabGroup) => { return tabGroup.id == tabGroupId; });
					if (!tabGroupExists) {
						const activeGroup = await addon.tabGroups.getActiveId(tab.windowId);
						addon.tabs.setGroupId(tab.id, activeGroup);
					}
				}
			}
		}
	}
}


function handleActions(message, sender, sendResponse) {
	
	if (!message.action) return;

	let response;

	switch (message.action) {
		case 'browser.tabGroups.create': {
			response = tabGroups.create(message.info, sender.tab.windowId);
			break;
		}
		case 'browser.tabGroups.get': {
			response = tabGroups.get(message.groupId);
			break;
		}
		case 'browser.tabGroups.query': {
			response = tabGroups.query(message.info, sender.tab.windowId);
			break;
		}
		case 'browser.tabGroups.remove': {
			response = tabGroups.remove(message.groupId);
			break;
		}
		case 'browser.tabGroups.update': {
			response = tabGroups.update(message.groupId, message.info);
			break;
		}

		case 'browser.tabs.create': {
			response = addon.tabs.create(message.info);
			break;
		}
		case 'browser.tabs.get': {
			response = addon.tabs.get(message.tabId);
			break;
		}
		case 'browser.tabs.move': {
			response = addon.tabs.move(message.tabIds, message.info);
			break;
		}
		case 'browser.tabs.query': {
			response = addon.tabs.query(message.info);
			break;
		}
		default:
			console.log(`Unknown action (${message.action})`);
	}

	return response;
}


async function init() {
	
	await tabGroups.initialize();

	await setupWindows();
	await salvageGrouplessTabs();

	await migrate(); // keep until everyone's on 0.9.0

	handleTabEvents();

	browser.commands.onCommand.addListener(handleCommands);
	browser.browserAction.onClicked.addListener(core.toggleView);
	
	await salvageGrouplessTabs();

	// meny entries
	browser.menus.create({
		id: 'newTabGroup',
		title: 'New Tab Group',
		contexts: ['browser_action']
	});

	browser.menus.onClicked.addListener(async(info, tab) => {
		if (info.menuItemId == 'newTabGroup') {
			tabGroups.create({}, (await browser.windows.getCurrent()).id);
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
