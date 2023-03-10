
'use strict';

import {addon} from './addon.js'
import * as core from './core.js'

import {handleCommands} from './commands.js'

import * as backup from './backup.js'

import {migrate} from './migrate.js'



/** Make sure each window has a group */
async function setupWindows() {

	const windows = browser.windows.getAll({});

	for (const window of await windows) {
		const groups = await addon.tabGroups.query({windowId: window.id});
		if (groups.length == 0) {
			await addon.tabGroups.create({windowId: window.id});
		}
	}
}

/** Put any tabs that do not have a group into the active group */
async function salvageGrouplessTabs() {

	const windows = await browser.windows.getAll({populate: true});

	for (const window of windows) {
		const groups = await addon.tabGroups.query({windowId: window.id});

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


async function init() {

	// tab groups ----
	await migrate(); // keep until everyone's on 0.9.0

	await addon.initialize();

	browser.commands.onCommand.addListener(handleCommands);

	await setupWindows();
	await salvageGrouplessTabs();

	await salvageGrouplessTabs();

	// auto bakup
	backup.start();
	// ----


	// panorama view ----

	// meny entries
	browser.menus.create({
		id:       'newTabGroup',
		title:    browser.i18n.getMessage('newTabGroup'),
		contexts: ['browser_action']
	});

	browser.menus.onClicked.addListener(async(info, tab) => {
		if (info.menuItemId == 'newTabGroup') {
			const group = await addon.tabGroups.create({populate: true}, (await browser.windows.getCurrent()).id);
		}
	});
	// ----

	// remove any panorama views there might be, we need a fresh connection to handle messages
	let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL('panorama/view.html')});
	for (let tab of extensionTabs) {
		browser.tabs.remove(tab.id);
	}
	// ----

	browser.browserAction.onClicked.addListener(core.toggleView);
}

init();
