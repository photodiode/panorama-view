
'use strict';

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
		
		let span  = new_element('span', {content: shortcut}, []);
		let label = new_element('label', {content: command.description, for: span.id}, []);

		let commandNode = new_element('div', {}, [label, span]);
		fragment.appendChild(commandNode);
	}

	document.getElementById('keyboardShortcuts').appendChild(fragment);
}
// ----


// theme
async function getTheme() {

	let storage = await browser.storage.local.get('useDarkTheme');

	if (storage.useDarkTheme === true) {
		document.getElementById('useDarkTheme').checked = true;
	}
}

async function changeTheme() {

	browser.storage.local.set({useDarkTheme: document.getElementById('useDarkTheme').checked});

	const tabs = browser.tabs.query({url: browser.runtime.getURL('panorama/view.html')});

	for(const tab of await tabs) {
		browser.tabs.reload(tab.id);
	}
}

async function getBackdropFilters() {

	let storage = await browser.storage.local.get('useBackdropFilters');

	if (storage.useBackdropFilters === true) {
		document.getElementById('useBackdropFilters').checked = true;
	}
}

async function changeBackdropFilters() {

	browser.storage.local.set({useBackdropFilters: document.getElementById('useBackdropFilters').checked});

	const tabs = browser.tabs.query({url: browser.runtime.getURL('panorama/view.html')});

	for(const tab of await tabs) {
		browser.tabs.reload(tab.id);
	}
}
// ----


// statistics
function formatByteSize(bytes) {
	if(bytes < 1024) return bytes + " bytes";
	else if(bytes < 1048576) return(bytes / 1024).toFixed(2) + " KiB";
	else if(bytes < 1073741824) return(bytes / 1048576).toFixed(2) + " MiB";
	else return(bytes / 1073741824).toFixed(2) + " GiB";
};

async function getStatistics() {

	const tabs = await browser.tabs.query({});

	let totalSize = 0;
	let numActiveTabs = 0;

	for(const tab of tabs) {

		let thumbnail = await browser.sessions.getTabValue(tab.id, 'thumbnail');

		if(thumbnail) {
			totalSize += thumbnail.length;
		}
		if(!tab.discarded) {
			numActiveTabs++;
		}
	}

	document.getElementById('thumbnailCacheSize').innerHTML = '';
	document.getElementById('thumbnailCacheSize').appendChild(document.createTextNode(formatByteSize(totalSize)));

	document.getElementById('numberOfTabs').innerHTML = '';
	document.getElementById('numberOfTabs').appendChild(document.createTextNode(tabs.length + ' (' + numActiveTabs + ' active)'));
}
// ----


async function init() {

	getCommands();
	getTheme();
	getBackdropFilters();
	getStatistics();

	document.getElementById('backupFileInput').addEventListener('change', loadBackup);
	document.getElementById('saveBackupButton').addEventListener('click', saveBackup);

	document.getElementById('useDarkTheme').addEventListener('change', changeTheme);
	document.getElementById('useBackdropFilters').addEventListener('change', changeBackdropFilters);

	// Auto-Backup
	startAutoBackup(); // Start on load
	document.getElementById('useAutoBackup').addEventListener('change', changeAutoBackup);
	document.getElementById('loadAutomaticBackup').addEventListener('click', loadAutomaticBackup);

	browser.tabs.onUpdated.addListener(getStatistics);
	//document.addEventListener('visibilitychange', getStatistics);
}

document.addEventListener('DOMContentLoaded', init);
