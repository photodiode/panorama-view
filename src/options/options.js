
'use strict';

import * as html   from '../common/html.js';
import * as theme  from './theme.js';
import * as backup from './backup.js';


// commands
async function getCommands() {

	let commands = await browser.commands.getAll();
	let fragment = document.createDocumentFragment();

	for (let command of commands) {
	
		let platformInfo = await browser.runtime.getPlatformInfo();
		let shortcut = command.shortcut || 'Not set';

		if (platformInfo.os == 'mac') {
			shortcut = shortcut.replace('Ctrl', 'Command');
			shortcut = shortcut.replace('MacCtrl', 'Ctrl');
			shortcut = shortcut.replace('Alt', 'Option');
		}
		
		shortcut = shortcut.replaceAll('+', ' + ');
		
		let span  = html.newElement('span', {content: shortcut});
		let label = html.newElement('label', {content: command.description});

		let commandNode = html.newElement('div', {}, [label, span]);
		fragment.appendChild(commandNode);
	}

	document.getElementById('keyboardShortcuts').appendChild(fragment);
}
// ----


// statistics
function formatByteSize(bytes) {
	if      (bytes < 1024)       return (bytes)                         + ' bytes';
	else if (bytes < 1048576)    return (bytes / 1024).toFixed(2)       + ' KiB';
	else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2)    + ' MiB';
	else                         return (bytes / 1073741824).toFixed(2) + ' GiB';
};

async function getStatistics() {

	const tabs = await browser.tabs.query({});

	let totalSize = 0;
	let numActiveTabs = 0;

	for (const tab of tabs) {
		const thumbnail = await browser.sessions.getTabValue(tab.id, 'thumbnail');

		if (thumbnail)      totalSize += thumbnail.length;
		if (!tab.discarded) numActiveTabs++;
	}

	document.getElementById('thumbnailCacheSize').textContent = formatByteSize(totalSize);
	document.getElementById('numberOfTabs').textContent = `${tabs.length} (${numActiveTabs} active)`;
}
// ----


document.addEventListener('DOMContentLoaded', () => {

	theme.set();
	
	browser.theme.onUpdated.addListener(({newTheme, windowId}) => {
		theme.set(newTheme);
	});

	getCommands();
	getStatistics();

	backup.createUI();

	browser.tabs.onUpdated.addListener(getStatistics);
});
