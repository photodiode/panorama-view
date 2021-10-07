
'use strict';

import {addon} from './addon.js';
import {html}  from './html.js';
import * as drag from './view.drag.js';

document.addEventListener('DOMContentLoaded', initialize, false);


let viewWindowId = undefined;
let viewTabId    = undefined;


async function initialize() {
	
	viewWindowId = (await browser.windows.getCurrent()).id;
	viewTabId    = (await browser.tabs.getCurrent()).id;
	
	/*const theme = await browser.theme.getCurrent();
	
	if (theme && theme.colors) {
		console.log(theme.colors);
		const colors = [
			`--color-background: ${theme.colors.popup_border}`
		];
		document.body.setAttribute('style', colors.join(';'));
	}*/

	await initializeTabGroupNodes();
	await initializeTabNodes();
	
	captureThumbnails();
	
	document.getElementById('newGroup').addEventListener('click', function() {
		addon.tabGroups.create();
	}, false);
	
	document.addEventListener('visibilitychange', function() {
		if(document.hidden) {
			browser.tabs.onUpdated.removeListener(captureThumbnail);
		}else{
			browser.tabs.onUpdated.addListener(captureThumbnail);
		}
	}, false);
	
	browser.runtime.onMessage.addListener(handleEvents);
	
	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onRemoved.addListener(tabRemoved);
	browser.tabs.onUpdated.addListener(tabUpdated);

	browser.tabs.onActivated.addListener(tabActivated);

	browser.tabs.onMoved.addListener(tabMoved);

	browser.tabs.onAttached.addListener(tabAttached);
	browser.tabs.onDetached.addListener(tabDetached);
	
	document.addEventListener('click', drag.clearTabSelection, true);
	
	document.getElementById('groups').addEventListener('dragover', drag.viewDragOver, false);
	document.getElementById('groups').addEventListener('drop', drag.viewDrop, false);

	window.addEventListener("resize", fitTabs);
}


async function initializeTabGroupNodes() {

	let tabGroups = addon.tabGroups.query({windowId: viewWindowId});

	for (let tabGroup of await tabGroups) {

		let tabGroupNode = html.groups.create(tabGroup);

		html.groups.resize(tabGroupNode, tabGroup.rect);
		html.groups.stack(tabGroupNode);
		
		document.getElementById('groups').appendChild(tabGroupNode);

		html.groups.resizeTitle(tabGroupNode);
	}
	
	fitTabs();
}

function fitTabs() {
	for (let tabGroupNode of document.getElementById('groups').childNodes) {
		html.groups.fitTabs(tabGroupNode);
	}
}

async function initializeTabNodes() {

	let tabs      = await browser.tabs.query({currentWindow: true});
	let tabGroups = await addon.tabGroups.query();
	
	var fragments = {};
	for (let tabGroup of tabGroups) {
		fragments[tabGroup.id] = document.createDocumentFragment();
	}

	for (let tab of tabs) {
		
		tab.groupId = await addon.tabs.getGroupId(tab.id);

		let tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);
		html.tabs.updateThumbnail(tabNode, tab.id);
		
		updateFavicon(tab, tabNode);

		if (fragments[tab.groupId]) {
			fragments[tab.groupId].appendChild(tabNode);
		}
	}
	
	for (let tabGroup of tabGroups) {
		let tabGroupNode = html.groups.get(tabGroup.id);
		if (tabGroupNode) {
			tabGroupNode.querySelector('.tabs').prepend(fragments[tabGroup.id]);
		}
	}

	fitTabs();

	html.tabs.setActive();
}


async function captureThumbnail(tabId) {
	const thumbnail = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 70, scale: 0.25});
	html.tabs.updateThumbnail(html.tabs.get(tabId), tabId, thumbnail);
	browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);
}

async function captureThumbnails() {
	let tabs = browser.tabs.query({currentWindow: true, discarded: false, pinned: false, highlighted: false});

	for(const tab of await tabs) {
		await captureThumbnail(tab.id); // await to lessen strain on browser
	}
}

async function testImage(url) {
	return new Promise(function (resolve, reject) {

		let img = new Image();

		img.onerror = img.onabort = function () {
			reject("error");
		};

		img.onload = function () {
			resolve("success");
		};

		img.src = url;
	});
}

async function updateFavicon(tab, tabNode) {

	tabNode = tabNode || html.tabs.get(tab.id);
	
	//console.log('favicon', tab.id, tabNode);
	
	if (!tabNode) return;

	let faviconNode = tabNode.querySelector('.favicon');

	if (faviconNode) {
		if (tab.favIconUrl &&
			tab.favIconUrl.substr(0, 22) != 'chrome://mozapps/skin/' &&
			tab.favIconUrl != tab.url) {
			testImage(tab.favIconUrl).then(
				_ => {
					faviconNode.style.backgroundImage = 'url(' + tab.favIconUrl + ')';
					faviconNode.classList.add('visible');
				}, _ => {
					faviconNode.removeAttribute("style");
					faviconNode.classList.remove('visible');
				}
			);
		} else {
			faviconNode.removeAttribute("style");
			faviconNode.classList.remove('visible');
		}
	}
}




function handleEvents(message, sender, sendResponse) {

	if (message.windowId != viewWindowId) return;

	switch (message.event) {
		case 'browser.tabGroups.onCreated': {
			groupCreated(message.data);
			break;
		}
		case 'browser.tabGroups.onRemoved': {
			groupRemoved(message.data);
			break;
		}
		case 'browser.tabGroups.onUpdated': {
			break;
		}
		default:
			console.log('Unknown event');
	}
}


async function groupCreated(tabGroup) {

	let tabGroupNode = html.groups.create(tabGroup);

	html.groups.resize(tabGroupNode, tabGroup.rect);
	html.groups.stack(tabGroupNode);

	document.getElementById('groups').appendChild(tabGroupNode);

	html.groups.resizeTitle(tabGroupNode);
	html.groups.fitTabs(tabGroupNode);
}


async function groupRemoved(tabGroupId) {
	let groupNode = await html.groups.get(tabGroupId);
	if (groupNode) {
		groupNode.remove();
	}
}





async function tabCreated(tab) {
	if (viewWindowId == tab.windowId){

		tab.groupId = await addon.tabs.getGroupId(tab.id);

		let tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);

		await html.tabs.insert(tabNode, tab);
		
		updateFavicon(tab);

		let tabGroupNode = html.groups.get(tab.groupId);
		html.groups.fitTabs(tabGroupNode);
	}
}

async function tabRemoved(tabId, removeInfo) {
	if (viewWindowId == removeInfo.windowId && viewTabId != tabId){
		html.tabs.get(tabId).remove();
		html.tabs.setActive();
		fitTabs();
	}
}

async function tabUpdated(tabId, changeInfo, tab) {

	if (viewWindowId == tab.windowId){
		html.tabs.update(html.tabs.get(tabId), tab);
	}

	if (changeInfo.pinned != undefined) {
		if (changeInfo.pinned) {
			html.tabs.get(tabId).remove();
			fitTabs();
			html.tabs.setActive();
		} else {
			
			// wait for the group id to be updated
			let tabGroupId = -1;
			while (tabGroupId == -1) {
				tabGroupId = await addon.tabs.getGroupId(tabId);
			}
			
			await tabCreated(tab);
			captureThumbnail(tabId);
			updateFavicon(tab);
		}
	} else {
		captureThumbnail(tabId);
		updateFavicon(tab);
	}
}

async function tabActivated(activeInfo) {
	html.tabs.setActive();
}

export async function tabMoved(tabId, moveInfo) {

	let tab = await browser.tabs.get(tabId);
	    tab.groupId = await addon.tabs.getGroupId(tab.id);

	let tabNode = html.tabs.get(tabId);

	await html.tabs.insert(tabNode, tab);

	fitTabs();
}

async function tabAttached(tabId, attachInfo) {
	if (viewWindowId == attachInfo.newWindowId){
		var tab = await browser.tabs.get(tabId);
		await tabCreated(tab);
		captureThumbnail(tabId);
	}
}

function tabDetached(tabId, detachInfo) {
	tabRemoved(tabId, {windowId: detachInfo.oldWindowId});
}
