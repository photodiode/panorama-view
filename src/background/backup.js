
'use strict';

import {addon} from './addon.js';
import * as core from './core.js';


export async function create() {
	
	let makeTabData = (tab) => {
		return {
			url:           tab.url,
			title:         tab.title,
			cookieStoreId: tab.cookieStoreId
		};
	};

	let backup = {
		file: {
			type: 'panoramaView',
			version: 2
		},
		windows: []
	};

	const windows = await browser.windows.getAll({populate: true});

	for (const window of windows) {

		const groups = await browser.sessions.getWindowValue(window.id, 'groups');
		groups.sort((a, b) => {
			return a.lastAccessed - b.lastAccessed;
		});

		let pinnedTabs = [];
		let tabGroups  = [];
		
		for (let tab of window.tabs) {
			tab.groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

			if (tab.pinned) {
				pinnedTabs.push(makeTabData(tab));
			}
		}

		for (const group of groups) {
			
			let tabGroup = {
				title: group.title,
				rect:  {x: group.rect.x, y: group.rect.y, w: group.rect.w, h: group.rect.h},
				tabs:  []
			}
			
			for (const tab of window.tabs) {
				if (tab.groupId == group.id) {
					tabGroup.tabs.push(makeTabData(tab));
				}
			}

			tabGroups.push(tabGroup);
		}

		backup.windows.push({
			pinnedTabs: pinnedTabs,
			tabGroups:  tabGroups
		});
	}

	return backup;
}

export let opening = false;

export async function open(backup) {

	let createTab = async(_tab, windowId, tabGroupId) => {

		let tabFailed = false;

		const tab = await browser.tabs.create({
			url:           _tab.url,
			title:         _tab.title,
			active:        false,
			discarded:     true,
			windowId:      windowId,
			cookieStoreId: _tab.cookieStoreId
		}).catch((err) => {
			console.log(err);
			tabFailed = true;
		});

		if (tabFailed) return;

		await addon.tabs.setGroupId(tab.id, tabGroupId);
		
		if (tabGroupId == -1) {
			await browser.tabs.update({pinned: true}); // it gets unpinned somehow
		}
	};

	if (backup.file.type != 'panoramaView') return 'Unknown backup type';
	if (backup.file.version != 2)           return 'Unknown backup version';

	opening = true;

	for (const _window of backup.windows) {

		const window = await browser.windows.create({});
		const firstTabId = window.tabs[0].id;

		for (const tab of _window.pinnedTabs) {
			await createTab(tab, window.id, -1);
		}

		let z = 0;
		for (const _tabGroup of _window.tabGroups) {
			const tabGroup = await addon.tabGroups.create({
				windowId:     window.id,
				title:        _tabGroup.title,
				rect:         _tabGroup.rect,
				empty:        true,
				lastAccessed: z
			});

			z++;

			for (const tab of _tabGroup.tabs) {
				await createTab(tab, window.id, tabGroup.id);
			}
		}

		browser.tabs.remove(firstTabId);
	}

	opening = false;
}


// auto backup
let autoBackupInterval;

export async function start() {
	const interval = await getInterval();
	if (interval > 0) {
		autoBackupInterval = window.setInterval(autoBackup, interval * 60000);
	}
}

export function stop() {
	window.clearInterval(autoBackupInterval);
}

export async function setInterval(interval) {
	stop();
	await browser.storage.local.set({autoBackupInterval: interval});
	start();
}

export async function getInterval() {
	return (await browser.storage.local.get('autoBackupInterval')).autoBackupInterval || 0;
}

export async function get() {
	return (await browser.storage.local.get('autoBackup')).autoBackup || [];
}

async function autoBackup() {

	let storage = await browser.storage.local.get('autoBackup');
	
	if (!storage.autoBackup) {
		storage.autoBackup = [];
	}
	
	let backup = {
		time: (new Date).getTime(),
		data: await create()
	}
	
	storage.autoBackup.unshift(backup);
	
	if (storage.autoBackup.length > 3) {
		storage.autoBackup.pop();
	}

	browser.storage.local.set(storage);
}

