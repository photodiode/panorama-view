
'use strict';

import {addon} from './addon.js'
import * as core from './core.js'

import {handleCommands} from './commands.js'

import * as backup from './backup.js'

import {migrate} from './migrate.js'



// make sure each window has a group
async function setupWindows() {

	const windows = browser.windows.getAll({});

	for (const window of await windows) {
		const groups = await addon.tabGroups.query({windowId: window.id});
		if (groups.length == 0) {
			await addon.tabGroups.create({windowId: window.id});
		}
	}
}

// put any tabs that do not have a group into the active group
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

	// tab groups
	await migrate(); // keep until everyone's on 0.9.4

	await addon.initialize();

	browser.commands.onCommand.addListener(handleCommands);

	await setupWindows();
	await salvageGrouplessTabs();

	await salvageGrouplessTabs();

	// auto bakup
	backup.start();
	// ----


	// panorama view

	// new group menu entry
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

	// move tab to group menu
	/*browser.menus.create({
		id:       'moveTabToGroup',
		title:    browser.i18n.getMessage('moveTabToGroup'),
		contexts: ['tab']
	});

	let groupList = [];

	browser.menus.onShown.addListener(async(info, clickedTab) => {
		if (info.menuIds.includes('moveTabToGroup')) {
			let groups = await addon.tabGroups.query();

			groups = groups.sort((a, b) => a.title.localeCompare(b.title));

			groups.forEach((group, i) => {
				browser.menus.create({
					parentId: 'moveTabToGroup',
					id:       `group ${i}`,
					title:    group.title,
					onclick:  async() => {
						const tabs = await addon.tabs.query({highlighted: true});
						let tabIds = [];
						tabs.forEach((tab) => {
							tabIds.push(tab.id);
						});
						if (tabIds.length == 1 && tabIds[0] != clickedTab.id) tabIds[0] = clickedTab.id;
						if (!tabIds.includes(clickedTab.id)) tabIds.push(clickedTab.id);
						await addon.tabs.move(tabIds, {index: -1, windowId: group.windowId, groupId: group.id});
						browser.tabs.hide(tabIds);
					}
				});
				groupList.push(`group ${i}`);
			});

			browser.menus.refresh()
		}
	});

	browser.menus.onHidden.addListener(() => {
		groupList.forEach((groupId, i) => {
			browser.menus.remove(groupId);
		});
		groupList = [];
	});*/
	// ----

	// remove any panorama views there might be, we need a fresh connection to handle messages
	const extensionTabs = await browser.tabs.query({url: browser.runtime.getURL('panorama/view.html')});
	if (extensionTabs) {
		for (const tab of extensionTabs) {
			browser.tabs.remove(tab.id);
		}
	}
	// ----

	browser.browserAction.onClicked.addListener(core.toggleView);
}

init();
