
'use strict';

export function setGroupId(tabId, groupId) {
	return browser.sessions.setTabValue(tabId, 'groupId', groupId);
}

export async function getGroupId(tabId) {
	let tabGroupId = undefined;
	while(tabGroupId == undefined) {
		tabGroupId = await browser.sessions.getTabValue(tabId, 'groupId');
	}
	return tabGroupId;
}
