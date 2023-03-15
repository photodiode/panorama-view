
'use strict';

import {html}  from './html.js'
import * as core from './view.js'


export async function groupCreated(group) {
	if (core.viewWindowId == group.windowId){

		const tabGroupNode = html.groups.create(group);

		const rect = {x: 0.3, y: 0.3, w: 0.4, h: 0.4};
		browser.sessions.setGroupValue(group.id, 'rect', rect);

		html.groups.resize(tabGroupNode, rect);
		html.groups.stack(tabGroupNode);

		document.getElementById('groups').appendChild(tabGroupNode);

		html.groups.fitTabs(tabGroupNode);
	}
}


export async function groupRemoved(tabGroupId, removeInfo) {
	if (core.viewWindowId == removeInfo.windowId) {
		const groupNode = await html.groups.get(tabGroupId);
		if (groupNode) {
			groupNode.remove();
		}
	}
}


export async function tabCreated(tab) {
	if (core.viewWindowId == tab.windowId) {

		const tabGroupNode = html.groups.get(tab.groupId);

		const tabNode = html.tabs.create(tab);
		html.tabs.update(tabNode, tab);
		html.tabs.updateThumbnail(tabNode, tab.id);

		await html.tabs.insert(tabNode, tab);

		html.tabs.updateFavicon(tabNode, tab);
		html.groups.fitTabs(tabGroupNode);
	}
}

export async function tabRemoved(tabId, removeInfo) {
	if (core.viewWindowId == removeInfo.windowId && core.viewTabId != tabId){
		let tabNode = html.tabs.get(tabId);

		tabNode.remove();

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
			if (tabNode) tabNode.remove();
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
	if (core.viewWindowId == moveInfo.windowId) {

		const tab = await browser.tabs.get(tabId);

		const tabNode = html.tabs.get(tabId);

		await html.tabs.insert(tabNode, tab);

		html.groups.fitTabs();
	}
}

export async function tabAttached(tabId, attachInfo) {
	if (core.viewWindowId == attachInfo.newWindowId) {
		const tab = await browser.tabs.get(tabId);
		await tabCreated(tab);
		core.captureThumbnail(tab.id);
	}
}

export function tabDetached(tabId, detachInfo) {
	if (core.viewWindowId == detachInfo.oldWindowId) {
		tabRemoved(tabId, {windowId: detachInfo.oldWindowId});
	}
}
