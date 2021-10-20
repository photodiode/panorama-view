
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
	
	//alert('To create a new Tab Group you can\n- Double click on an empty space\n- Drag a Tab to an empty space\n- Right click the Panorama View button and choose "New Tab Group"');
}


async function setTheme(theme) {

	if (!theme) {
		theme = await browser.theme.getCurrent();
	}

	let toGray = (input) => {
		const div = document.createElement('div');
		      div.style.color = input;

		const color = div.style.color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);

		if (color) {
			return (0.2126 * color[1] + 0.7152 * color[2] + 0.0722 * color[3]) / 255;
		} else {
			return 1;
		}
	}
	
	if (theme && theme.colors) {
		if (toGray(theme.colors.frame) < 0.5) {
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





