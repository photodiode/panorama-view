
'use strict';

export function setGroupId(tabId, groupId) {
	return browser.sessions.setTabValue(tabId, 'groupId', groupId);
}

export async function getGroupId(tabId) {
	return browser.sessions.getTabValue(tabId, 'groupId');
}
