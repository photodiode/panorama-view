
'use strict';

// internal
let windowIdCurrent = (async function(){
	return (await browser.windows.getCurrent()).id;
})();
// ----

export async function getActiveGroupId(windowId) {
	return await browser.sessions.getWindowValue(await windowIdCurrent, 'activeGroup') || null;
}

export async function setActiveGroupId(windowId, tabGroupId) {
	await browser.sessions.setWindowValue(await windowIdCurrent, 'activeGroup', tabGroupId);
}

export function create(createInfo) {
	return browser.runtime.sendMessage({
		action: 'browser.tabGroups.create',
		info:   createInfo
	});
}

export function remove(tabGroupId) {
	return browser.runtime.sendMessage({
		action: 'browser.tabGroups.remove',
		info:   tabGroupId
	});
}

export function query(queryInfo) {
	return browser.runtime.sendMessage({
		action: 'browser.tabGroups.query',
		info:   queryInfo
	});
}

export function update(tabGroupId, updateInfo) {
	return browser.runtime.sendMessage({
		action: 'browser.tabGroups.update',
		id:     tabGroupId,
		info:   updateInfo
	});
}

export async function get(tabGroupId) {
	return query({windowId: await windowIdCurrent, id: tabGroupId});
}
