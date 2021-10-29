
'use strict';

export async function setActiveGroupId(windowId, tabGroupId) {
	await browser.sessions.setWindowValue((await browser.windows.getCurrent()).id, 'activeGroup', tabGroupId);
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
