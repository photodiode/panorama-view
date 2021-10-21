
'use strict';

import {addon} from './addon.js';
import {html}  from './html.js';

import * as drag from './view.drag.js';
import * as events from './view.events.js';

document.addEventListener('DOMContentLoaded', initialize, false);


export let viewWindowId = undefined;
export let viewTabId    = undefined;



/*if (browser.tabGroups == undefined) {
	browser.tabGroups = {
		get: () => {
			return 32;
		}
	};
	
	console.log(browser.tabGroups.get());
}*/



async function initialize() {
	
	viewWindowId = (await browser.windows.getCurrent()).id;
	viewTabId    = (await browser.tabs.getCurrent()).id;
	
	setTheme();

	await initializeTabGroupNodes();
	await initializeTabNodes();
	
	captureThumbnails();
	
	// view events
	document.getElementById('groups').addEventListener('dblclick', (event) => {
		if (event.target == document.getElementById('groups')) {
			addon.tabGroups.create();
		}
	}, false);

	document.getElementById('groups').addEventListener('auxclick', (event) => {
		if (event.target == document.getElementById('groups') && event.button == 1) {
			addon.tabGroups.create();
		}
	}, false);
	
	document.addEventListener('visibilitychange', async() => {
		if (document.hidden) {
			browser.tabs.onUpdated.removeListener(captureThumbnail);
			viewLastAccessed = (new Date).getTime();
		} else {
			await captureThumbnails();
			browser.tabs.onUpdated.addListener(captureThumbnail);
		}
	}, false);

	window.addEventListener('resize', () => {
		html.groups.fitTabs();
	});
	
	browser.theme.onUpdated.addListener(async({theme, windowId}) => {
		setTheme(theme);
	});
	// ----
	
	// tab group events
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.windowId != viewWindowId) return;
		switch (message.event) {
			case 'browser.tabGroups.onCreated': {
				events.groupCreated(message.data);
				break;
			}
			case 'browser.tabGroups.onRemoved': {
				events.groupRemoved(message.data);
				break;
			}
			default:
				break;
		}
	});
	// ----
	
	// tab events
	browser.tabs.onCreated.addListener(events.tabCreated);
	browser.tabs.onRemoved.addListener(events.tabRemoved);
	browser.tabs.onUpdated.addListener(events.tabUpdated);

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
}


function toRGBA(input) {
	// get computed color
	const tmpElement = document.body.appendChild(document.createElement('tmpColorElement'));
	      tmpElement.style.color = input;

	const computedColor = window.getComputedStyle(tmpElement).color;

	      tmpElement.remove();
	// ----

	let color = computedColor.match(/[\.\d]+/g);

	if (!color) return undefined;

	if (color.length == 3) color.push(1);
	if (color.length != 4) color = [0, 0, 0, 0];

	return {
		r: Number(color[0]),
		g: Number(color[1]),
		b: Number(color[2]),
		a: Number(color[3])
	};
}

async function setTheme(theme) {

	if (!theme) {
		theme = await browser.theme.getCurrent();
	}

	const toGray = (color) => {
		return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
	}
	
	if (theme && theme.colors) {
		if (toGray(toRGBA(theme.colors.frame)) < 0.5) {
			document.body.classList.add('dark');
			document.getElementById('favicon').href = '../gfx/icon_light.svg';
		} else {
			document.body.classList.remove('dark');
			document.getElementById('favicon').href = '../gfx/icon_dark.svg';
		}
	}
}


async function initializeTabGroupNodes() {

	let tabGroups = await addon.tabGroups.query({windowId: viewWindowId});

	for (let tabGroup of tabGroups) {

		let tabGroupNode = html.groups.create(tabGroup);

		html.groups.resize(tabGroupNode, tabGroup.rect);
		html.groups.stack(tabGroupNode);
		
		document.getElementById('groups').appendChild(tabGroupNode);

		html.groups.resizeTitle(tabGroupNode);
	}
	
	html.groups.fitTabs();
}


async function initializeTabNodes() {

	let tabs = await browser.tabs.query({currentWindow: true});
	
	var fragments = {};
	
	await Promise.all(tabs.map(async(tab) => {
		tab.groupId = await addon.tabs.getGroupId(tab.id);
	}));

	for (let tab of tabs) {

		let tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);
		html.tabs.updateThumbnail(tabNode, tab.id);
		
		html.tabs.updateFavicon(tabNode, tab);
		
		if (!fragments[tab.groupId]) {
			fragments[tab.groupId] = document.createDocumentFragment();
		}

		fragments[tab.groupId].appendChild(tabNode);
	}
	
	for (const tabGroupId in fragments) {
		let tabGroupNode = html.groups.get(tabGroupId);
		if (tabGroupNode) {
			tabGroupNode.querySelector('.tabs').prepend(fragments[tabGroupId]);
		}
	}

	html.groups.fitTabs();

	html.tabs.setActive();
}


export async function captureThumbnail(tabId, changeInfo, tab) {
	const thumbnail = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 70, scale: 0.25});
	html.tabs.updateThumbnail(html.tabs.get(tabId), tabId, thumbnail);
	browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);
}

let viewLastAccessed = 0;

async function captureThumbnails() {
	let tabs = browser.tabs.query({currentWindow: true, discarded: false, pinned: false, highlighted: false});

	for(const tab of await tabs) {
		if (tab.lastAccessed > viewLastAccessed) {
			await captureThumbnail(tab.id);
		}
	}
}





