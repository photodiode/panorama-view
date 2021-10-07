
'use strict';

import {addon} from './addon.js';

export let openingPanoramaView = false;


export function setOpeningPanoramaView(value) {
	openingPanoramaView = value;
}


export function getPanoramaViewURL() {
	return browser.runtime.getURL("panorama/view.html");
}


export async function getPanoramaViewTab() {
	const tabs = await browser.tabs.query({url: getPanoramaViewURL(), currentWindow: true});
	if (tabs.length > 0) {
		return tabs[0];
	} else {
		return undefined;
	}
}


// Show and hide the appropriate tabs
export async function toggleVisibleTabs(windowId, activeGroupId, noTabSelected) {

	const tabs = await browser.tabs.query({windowId: windowId});

	let showTabIds = [];
	let hideTabIds = [];

	let showTabs = [];

	await Promise.all(tabs.map(async(tab) => {
		const groupId = await addon.tabs.getGroupId(tab.id);

		if (groupId != activeGroupId) {
			hideTabIds.push(tab.id);
		} else {
			showTabIds.push(tab.id);
			showTabs.push(tab);
		}
	}));

	if (noTabSelected) {
		showTabs.sort((tabA, tabB) => {
			return tabB.lastAccessed - tabA.lastAccessed;
		});
		browser.tabs.update(showTabs[0].id, {active: true});
	}

	browser.tabs.hide(hideTabIds);
	browser.tabs.show(showTabIds);
}


export async function toggleView() {
	
	const panoramaViewTab = await getPanoramaViewTab();

	if (panoramaViewTab != undefined) {

		const currentTab = (await browser.tabs.query({active: true, currentWindow: true}))[0];

		// switch to last accessed tab in window
		if (panoramaViewTab.id == currentTab.id) {
			let tabs = await browser.tabs.query({currentWindow: true});

			tabs.sort((tabA, tabB) => {
				return tabB.lastAccessed - tabA.lastAccessed;
			});
			// skip first tab which will be the panorama view
			if (tabs.length > 1) {
				browser.tabs.update(tabs[1].id, {active: true});
			}
		// switch to Panorama View tab
		} else {
			browser.tabs.update(panoramaViewTab.id, {active: true});
		}
	// if there is no Panorama View tab, make one
	} else {
		openingPanoramaView = true;
		browser.tabs.create({url: "/panorama/view.html", active: true});
	}
}
