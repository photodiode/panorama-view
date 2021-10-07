
'use strict';

// migrate to transformable groups
export async function migrate() {

	const windows = await browser.windows.getAll({});

	for (const window of windows) {
		let groups = await browser.sessions.getWindowValue(window.id, 'groups');

		// no need to migrate
		if (groups == undefined) return;
		if (groups[0].title != undefined) return;

		// remove old panorama view tabs
		let extensionTabs = await browser.tabs.query({url: browser.runtime.getURL("view.html")});
		for (let tab of extensionTabs) {
			browser.tabs.remove(tab.id);
		}
		// ----

		// update tab groups object
		for (let i in groups) {
			groups[i].title       = groups[i].name;
			groups[i].lastUpdated = groups[i].lastMoved;
		}
		await browser.sessions.setWindowValue(window.id, 'groups', groups);
	}
}
