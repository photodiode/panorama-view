
'use strict';

// migrate to transformable groups
export async function migrate() {

	// migrate to version 0.9.0
	// remove old panorama view tabs
	let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL('view.html')});
	if (extensionTabs) {
		for (let tab of extensionTabs) {
			browser.tabs.remove(tab.id);
		}
	}
	// ----

	const windows = await browser.windows.getAll({});

	for (const window of windows) {
		let groups = await browser.sessions.getWindowValue(window.id, 'groups');

		if (groups) {
			for (let group of groups) {
				if (group.title == undefined) {
					group.title        = group.name;
					group.lastAccessed = group.lastMoved;
				}
			}
			await browser.sessions.setWindowValue(window.id, 'groups', groups);
		}
	}
	// ----

	// migrate from 0.9.3 to 0.9.4 (copy rect data to new location)
	for (const window of windows) {
		let groups = await browser.sessions.getWindowValue(window.id, 'groups');

		if (groups) {
			for (let group of groups) {
				if (!group.hasOwnProperty('sessionStorage') && group.hasOwnProperty('rect')) {
					group.sessionStorage = {};
					group.sessionStorage[browser.runtime.id] = {};
					group.sessionStorage[browser.runtime.id]['rect'] = JSON.stringify(group.rect);
					//delete group['rect']; // maybe at some point
				}
			}
			await browser.sessions.setWindowValue(window.id, 'groups', groups);
		}

	}
	// ----
}
