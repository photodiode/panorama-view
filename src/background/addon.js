
'use strict';

import * as tabGroups from './addon.tabGroups.js';
import * as tabs      from './addon.tabs.js';
import * as tabEvents from './addon.tabs.events.js'

import * as backup from './backup.js'

export let addon = {
	tabGroups: tabGroups,
	tabs:      tabs,

	initialize: async() => {
		await tabGroups.initialize();
		await tabEvents.initialize();

		browser.runtime.onMessage.addListener(handleActions);
	}
};

function handleActions(message, sender, sendResponse) {

	if (!message.action) return;

	let response;

	switch (message.action) {
		case 'browser.tabGroups.create': {
			response = addon.tabGroups.create(message.info, sender.tab.windowId);
			break;
		}
		case 'browser.tabGroups.get': {
			response = addon.tabGroups.get(message.groupId);
			break;
		}
		case 'browser.tabGroups.query': {
			response = addon.tabGroups.query(message.info, sender.tab.windowId);
			break;
		}
		case 'browser.tabGroups.remove': {
			response = addon.tabGroups.remove(message.groupId);
			break;
		}
		case 'browser.tabGroups.update': {
			response = addon.tabGroups.update(message.groupId, message.info);
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

		case 'browser.sessions.setGroupValue': {
			response = addon.tabGroups.setGroupValue(message.groupId, message.key, message.value, sender.id);
			break;
		}
		case 'browser.sessions.getGroupValue': {
			response = addon.tabGroups.getGroupValue(message.groupId, message.key, sender.id);
			break;
		}
		case 'browser.sessions.removeGroupValue': {
			response = addon.tabGroups.removeGroupValue(message.groupId, message.key, sender.id);
			break;
		}

		case 'addon.backup.create': {
			response = backup.create(sender.id);
			break;
		}
		case 'addon.backup.getInterval': {
			response = backup.getInterval();
			break;
		}
		case 'addon.backup.setInterval': {
			response = backup.setInterval(message.interval);
			break;
		}
		case 'addon.backup.getBackups': {
			response = backup.getBackups();
			break;
		}

		default:
			console.log(`Unknown action (${message.action})`);
	}
	return response;
}
