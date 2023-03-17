
'use strict';

import '/common/tabGroups-polyfill.js'

import {html}  from './html.js'

import * as theme  from '/common/theme.js'
import * as events from './view.events.js'
import * as drag   from './view.drag.js'


export let viewWindowId = undefined;
export let viewTabId    = undefined;

let viewLastAccessed = 0;

export let options = {
	themeOverride: false,
	listView:      false
};

document.addEventListener('DOMContentLoaded', async() => {

	viewWindowId = (await browser.windows.getCurrent()).id;
	viewTabId    = (await browser.tabs.getCurrent()).id;

	// get options
	const storage = await browser.storage.local.get();
	if (storage.hasOwnProperty('themeOverride')) {
		options.themeOverride = storage.themeOverride;
	}
	if (storage.hasOwnProperty('listView')) {
		options.listView = storage.listView;
	}
	// ----

	theme.set(options.themeOverride);

	await initializeTabGroupNodes();
	await initializeTabNodes();

	captureThumbnails();

	// view events
	document.getElementById('groups').addEventListener('dblclick', (event) => {
		if (event.target == document.getElementById('groups')) {
			browser.tabGroups.create();
		}
	}, false);

	document.getElementById('groups').addEventListener('auxclick', (event) => {
		if (event.target == document.getElementById('groups') && event.button == 1) {
			browser.tabGroups.create();
		}
	}, false);

	document.addEventListener('visibilitychange', async() => {
		if (document.hidden) {
			browser.tabs.onUpdated.removeListener(captureThumbnail);
			viewLastAccessed = (new Date).getTime();
		} else {
			await captureThumbnails();
			browser.tabs.onUpdated.addListener(captureThumbnail, {properties: ['url', 'status']});
		}
	}, false);

	browser.theme.onUpdated.addListener(({newTheme, windowId}) => {
		theme.set(options.themeOverride, newTheme);
	});
	// ----

	// theme update
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch (message.event) {
			case 'addon.options.onUpdated': {
				if (message.data.hasOwnProperty('themeOverride')) {
					options.themeOverride = message.data.themeOverride;
					theme.set(options.themeOverride);
				}
				if (message.data.hasOwnProperty('listView')) {
					options.listView = message.data.listView;
					html.groups.fitTabs();
				}
				break;
			}
			default:
				break;
		}
	});
	// ----

	// search
	/*const search = document.querySelector('#search input');
	let searchIndex = {};

	search.addEventListener('focus', async function(event) {
		const tabNodes = document.querySelectorAll('.tab');

		await tabNodes.forEach(async(tabNode) => {
			searchIndex[tabNode.id.substr(3)] = tabNode.querySelector('.title span').textContent.toLowerCase();
		});
	}, false);

	search.addEventListener('input', async function(event) {
		let hits = [];
		for (const [id, title] of Object.entries(searchIndex)) {
			if (title.includes(this.value.toLowerCase())) {
				hits.push(id);
			}
		}
		console.log(hits);
	}, false);

	search.addEventListener('keydown', function(event) {
		if(event.keyCode == 13) {
			search.blur();
		}
	}, false);*/
	// ----

	// tab group events
	browser.tabGroups.onCreated.addListener(events.groupCreated);
	browser.tabGroups.onRemoved.addListener(events.groupRemoved);
	// ----

	// tab events
	browser.tabs.onCreated.addListener(events.tabCreated);
	browser.tabs.onRemoved.addListener(events.tabRemoved);
	browser.tabs.onUpdated.addListener(events.tabUpdated), {properties: ['favIconUrl', 'pinned', 'title', 'url', 'discarded', 'status']};

	browser.tabs.onActivated.addListener(events.tabActivated);

	browser.tabs.onMoved.addListener(events.tabMoved);

	browser.tabs.onAttached.addListener(events.tabAttached);
	browser.tabs.onDetached.addListener(events.tabDetached);
	// ----

	// drag events
	document.addEventListener('click', drag.clearTabSelection, true);

	document.getElementById('groups').addEventListener('dragover', drag.viewDragOver, false);
	document.getElementById('groups').addEventListener('drop', drag.viewDrop, false);
	// ----

	const groupResize = function () {
		html.groups.fitTabs();
	}

	new ResizeObserver(groupResize).observe(document.getElementById('groups'));
});


async function initializeTabGroupNodes() {

	const groups = await browser.tabGroups.query({windowId: viewWindowId});

	await Promise.all(groups.map(async(group) => {
		const tabGroupNode = html.groups.create(group);

		let rect = await browser.sessions.getGroupValue(group.id, 'rect');

		if (!rect) {
			rect = {x: 0, y: 0, w: 0.5, h: 0.5};
			await browser.sessions.setGroupValue(group.id, 'rect', rect);
		}

		html.groups.resize(tabGroupNode, rect);
		html.groups.stack(tabGroupNode);

		document.getElementById('groups').appendChild(tabGroupNode);
	}));
}


async function initializeTabNodes() {

	const tabs = await browser.tabs.query({currentWindow: true});

	let nodes = {
		'pinned': document.getElementById('pinned'),
		'groupless': document.getElementById('groupless')
	};

	for (const groupNode of document.getElementById('groups').children) {
		nodes[groupNode.dataset.id] = groupNode.querySelector('.newtab');
	}

	for (const tab of tabs) {

		let tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);
		html.tabs.updateThumbnail(tabNode, tab.id);

		html.tabs.updateFavicon(tabNode, tab);

		if (tab.pinned == true) {
			nodes['pinned'].appendChild(tabNode);

		} else if (nodes.hasOwnProperty(tab.groupId)) {
			nodes[tab.groupId].insertAdjacentElement('beforebegin', tabNode);

		} else {
			nodes['groupless'].appendChild(tabNode);
		}
	}

	html.groups.fitTabs();
	html.tabs.setActive();
}


export async function captureThumbnail(tabId, changeInfo, tab) {
	const thumbnail = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 80, scale: 0.25});
	html.tabs.updateThumbnail(html.tabs.get(tabId), tabId, thumbnail);
	browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);
}

async function captureThumbnails() {
	const tabs = browser.tabs.query({currentWindow: true, discarded: false, pinned: false, highlighted: false});

	for(const tab of await tabs) {
		if (tab.lastAccessed > viewLastAccessed) {
			await captureThumbnail(tab.id);
		}
	}
}





