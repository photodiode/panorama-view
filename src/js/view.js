
'use strict';

/**
 * Helper function to create a new element with the given attributes and children
 */
function new_element(name, attributes, children) {

	const e = document.createElement(name);

	for(const key in attributes) {
		if(key == 'content') {
			e.appendChild(document.createTextNode(attributes[key]));
		}else{
			e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
		}
	}

	for(const child of children || []) {
		e.appendChild(child);
	}

	return e;
}

var view = {
	windowId: -1,
	tabId: -1,
	groupsNode: null,
	dragIndicator: null,
	config: null,
	tabs: {},
};

async function captureThumbnail(tabId) {

	var data = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 25});
	var img = new Image;

	img.onload = async function() {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		canvas.width = 500;
		canvas.height = canvas.width * (this.height / this.width);

		//ctx.imageSmoothingEnabled = true;
		//ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

		var thumbnail = canvas.toDataURL('image/jpeg', 0.7);

		updateThumbnail(tabId, thumbnail);
		browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);
	};

	img.src = data;
}

async function captureTabs() {
	const tabs = await browser.tabs.query({currentWindow: true, discarded: false});
	for(const tab of tabs) {
		await captureThumbnail(tab.id);
	}
}

/**
 * Initialize the Panorama View tab
 *
 * This displays all the groups and the tabs in them, and sets up listeners
 * to respond to user actions and react to changes
 */
async function initView() {
	view.config = await browser.runtime.sendMessage("init");
	view.windowId = (await browser.windows.getCurrent()).id;
	view.tabId = (await browser.tabs.getCurrent()).id;
	view.groupsNode = document.getElementById('groups');

	view.dragIndicator = new_element('div', {class: 'drag_indicator'});
	view.groupsNode.appendChild(view.dragIndicator);

	await groups.init();

	// init Nodes
	await initTabNodes();
	await initGroupNodes();

	// set all listeners

	// Listen for clicks on new group button
	document.getElementById('newGroup').addEventListener('click', createGroup, false);

	// Listen for middle clicks in background to open new group
	document.getElementById('groups').addEventListener('auxclick', async function(event) {
		event.preventDefault();
		event.stopPropagation();

		if ( event.target != document.getElementById('groups') ) return; // ignore middle clicks in foreground
		if ( event.button != 1 ) return; // middle mouse

		createGroup();
	}, false);

	document.addEventListener('visibilitychange', function() {
		if(document.hidden) {
			browser.tabs.onUpdated.removeListener(captureThumbnail);
		}else{
			browser.tabs.onUpdated.addListener(captureThumbnail);
		}
	}, false);

	// Listen for tabs being added/removed/switched/etc. and update appropriately
	browser.tabs.onCreated.addListener(tabCreated);
	browser.tabs.onRemoved.addListener(tabRemoved);
	browser.tabs.onUpdated.addListener(tabUpdated);
	browser.tabs.onMoved.addListener(tabMoved);
	browser.tabs.onAttached.addListener(tabAttached);
	browser.tabs.onDetached.addListener(tabDetached);
	browser.tabs.onActivated.addListener(tabActivated);
}


document.addEventListener('DOMContentLoaded', initView, false);


async function createGroup() {
	var group = await groups.create();
	makeGroupNode(group);
	var groupElement = groupNodes[group.id].group
	view.groupsNode.appendChild(groupElement);
	updateGroupFit(group);
	groupElement.scrollIntoView({behavior: "smooth"});
}

async function tabCreated(tab) {
	if(view.windowId == tab.windowId){
		makeTabNode(tab);
		updateTabNode(tab);
		updateFavicon(tab);

		// Wait for background script to assign this tab to a group
		var groupId = undefined;
		while(groupId === undefined) {
			groupId = await view.tabs.getGroupId(tab.id);
		}

		var group = groups.get(groupId);
		await insertTab(tab);
		updateGroupFit(group);
	}
}

async function tabRemoved(tabId, removeInfo) {
	if(view.windowId == removeInfo.windowId && view.tabId != tabId){
		deleteTabNode(tabId);
		groups.forEach(updateGroupFit);
	}
}

async function tabUpdated(tabId, changeInfo, tab) {
	if(view.windowId == tab.windowId){
		updateTabNode(tab);
		updateFavicon(tab);
	}
}

async function tabMoved(tabId, moveInfo) {
	if(view.windowId == moveInfo.windowId){
		var tab = await browser.tabs.get(tabId);
		await insertTab(tab);
		groups.forEach(updateGroupFit);
	}
}

async function tabAttached(tabId, attachInfo) {
	console.log('tab attached', attachInfo.newWindowId);
	if(view.windowId == attachInfo.newWindowId){
		var tab = await browser.tabs.get(tabId);
		await tabCreated(tab);
		groups.forEach(updateGroupFit);
	}
}

async function tabDetached(tabId, detachInfo) {
	console.log('tab detached', detachInfo.oldWindowId);
	if(view.windowId == detachInfo.oldWindowId){
		deleteTabNode(tabId);
		groups.forEach(updateGroupFit);
	}
}

async function tabActivated(activeInfo) {
	setActiveTabNode();
}
