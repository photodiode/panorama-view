
'use strict';

// migrate to transformable groups
export async function migrate() {
	
	// remove old panorama view tabs
	let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL('view.html')});
	for (let tab of extensionTabs) {
		browser.tabs.remove(tab.id);
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
}
