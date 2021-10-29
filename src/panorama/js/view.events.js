
'use strict';

import {html}  from './html.js';
import * as core from './view.js';

import './tabGroups-polyfill.js';


export async function groupCreated(tabGroup) {
	if (core.viewWindowId == tabGroup.windowId){

		let tabGroupNode = html.groups.create(tabGroup);

		html.groups.resize(tabGroupNode, tabGroup.rect);
		html.groups.stack(tabGroupNode);

		document.getElementById('groups').appendChild(tabGroupNode);

		html.groups.resizeTitle(tabGroupNode);
		html.groups.fitTabs(tabGroupNode);
	}
}


export async function groupRemoved(tabGroupId, removeInfo) {
	if (core.viewWindowId == removeInfo.windowId) {
		let groupNode = await html.groups.get(tabGroupId);
		if (groupNode) {
			groupNode.remove();
		}
	}
}





export async function tabCreated(tab) {
	if (core.viewWindowId == tab.windowId) {

		let tabGroupNode = html.groups.get(tab.groupId);

		const tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);

		await html.tabs.insert(tabNode, tab);
		
		html.tabs.updateFavicon(tabNode, tab);
		html.groups.fitTabs(tabGroupNode);
	}
}

export async function tabRemoved(tabId, removeInfo) {
	if (core.viewWindowId == removeInfo.windowId && core.viewTabId != tabId){
		html.tabs.get(tabId).remove();
		html.tabs.setActive();
		html.groups.fitTabs();
	}
}

export async function tabUpdated(tabId, changeInfo, tab) {
	
	const tabNode = html.tabs.get(tabId);

	if (core.viewWindowId == tab.windowId){
		html.tabs.update(tabNode, tab);
	}

	if (changeInfo.pinned != undefined) {
		if (changeInfo.pinned) {
			tabNode.remove();
			html.groups.fitTabs();
			html.tabs.setActive();
		} else {
			await tabCreated(tab);
			html.tabs.updateFavicon(tabNode, tab);
		}
	} else {
		html.tabs.updateFavicon(tabNode, tab);
	}
}

export async function tabActivated(activeInfo) {
	html.tabs.setActive();
}

export async function tabMoved(tabId, moveInfo) {

	let tab = await browser.tabs.get(tabId);

	let tabNode = html.tabs.get(tabId);

	await html.tabs.insert(tabNode, tab);

	html.groups.fitTabs();
}

export async function tabAttached(tabId, attachInfo) {
	if (core.viewWindowId == attachInfo.newWindowId){
		var tab = await browser.tabs.get(tabId);
		await tabCreated(tab);
		core.captureThumbnail(tabId);
	}
}

export function tabDetached(tabId, detachInfo) {
	tabRemoved(tabId, {windowId: detachInfo.oldWindowId});
}
