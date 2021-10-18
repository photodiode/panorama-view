
'use strict';

import * as backups from '../background/backup.js';

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
		
		let span  = new_element('span', {content: shortcut});
		let label = new_element('label', {content: command.description});

		let commandNode = new_element('div', {}, [label, span]);
		fragment.appendChild(commandNode);
	}

	document.getElementById('keyboardShortcuts').appendChild(fragment);
}
// ----


// backup
async function saveBackup() {

	const backup = await backups.create();

	// get date string
	const date = new Date();
	      date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // time-zone fix

	let dateString = date.toISOString();
	    dateString = dateString.replaceAll('-', '');
	    dateString = dateString.replaceAll('T', '-');
	    dateString = dateString.replaceAll(':', '');
	    dateString = dateString.replace(/\..*/, '');
	// ----

	const blob     = new Blob([JSON.stringify(backup, null, '\t')], {type : 'application/json'});
	const dataUrl  = window.URL.createObjectURL(blob);
	const filename = 'panorama-view-backup-' + dateString + '.json';

	const onComplete = (delta) => {
		if (delta.state && delta.state.current == 'complete') {
			window.URL.revokeObjectURL(dataUrl);
			browser.downloads.onChanged.removeListener(onComplete);
		}
	};

	browser.downloads.onChanged.addListener(onComplete);

	browser.downloads.download({
		url: dataUrl,
		filename: filename,
		conflictAction: 'uniquify',
		saveAs: true
	});
}

let autoBackups = [];

async function loadBackup() {
	
	const selectBackup = document.getElementById('selectBackup');
	
	if (selectBackup.value == 'false') {
		return;
	} else if (selectBackup.value == 'file') {
		
		const file = document.getElementById('backupFileInput').files[0];
	
		if (!file) return;

		if (file.type != 'application/json') {
			alert('Invalid file type');
			return;
		}

		const reader = new FileReader();

		reader.onload = (json) => {
			let backup = JSON.parse(json.target.result);

			if ((backup.version && backup.version[0] == 'tabGroups' || backup.version && backup.version[0] == 'sessionrestore') && backup.version[1] == 1) {
				// convert from old tab groups backup to version 1 (legacy)
				backup = convertTG(backup);
			}
			
			if (backup.file && backup.file.type == 'panoramaView' && backup.file.version == 1) {
				// convert from panormama view backup version 1
				backup = convertV1(backup);
			}

			backups.open(backup);
		};

		reader.readAsText(file);
		
	} else {
		
		const i = Number(selectBackup.value);
		
		if (i < 0 || i > 3) {
			return;
		}
		
		backups.open(autoBackups[i].data);
	}
}

function convertV1(data) {

	let makeTabData = (tab) => {
		return {
			url:           tab.url,
			title:         tab.title,
			cookieStoreId: 'firefox-default'
		};
	};

	let backup = {
		file: {
			type: 'panoramaView',
			version: 2
		},
		windows: []
	};
	
	for (const window of data.windows) {

		let pinnedTabs = [];
		let tabGroups  = [];
		
		for (let tab of window.tabs) {
			if (tab.pinned) {
				pinnedTabs.push(makeTabData(tab));
			}
		}

		for (const group of window.groups) {
			
			let tabGroup = {
				title: group.name,
				rect:  {x: group.rect.x, y: group.rect.y, w: group.rect.w, h: group.rect.h},
				tabs:  []
			}
			
			for (const tab of window.tabs) {
				if (tab.groupId == group.id) {
					tabGroup.tabs.push(makeTabData(tab));
				}
			}

			tabGroups.push(tabGroup);
		}

		backup.windows.push({
			pinnedTabs: pinnedTabs,
			tabGroups:  tabGroups
		});
	}

	return backup;
}

function convertTG(tgData) {
	var data = {
		file: {
			type: 'panoramaView',
			version: 1
		},
		windows: []
	};

	for(var wi in tgData.windows) {

		const tabviewGroup = JSON.parse(tgData.windows[wi].extData['tabview-group']);
		const tabviewGroups = JSON.parse(tgData.windows[wi].extData['tabview-groups']);

		data.windows[wi] = {groups: [], tabs: [], activeGroup: tabviewGroups.activeGroupId, groupIndex: tabviewGroups.nextID};

		for(const gkey in tabviewGroup) {
			data.windows[wi].groups.push({
				id: tabviewGroup[gkey].id,
				name: tabviewGroup[gkey].title,
				rect: {x: 0, y: 0, w: 0.25, h: 0.5},
			});
		}

		for(const ti in tgData.windows[wi].tabs) {

			var tab = tgData.windows[wi].tabs[ti];

			data.windows[wi].tabs.push({
				url: tab.entries[0].url,
				title: tab.entries[0].title,
				groupId: JSON.parse(tab.extData['tabview-tab']).groupID,
				index: Number(ti),
				pinned: false,
			});
		}
	}

	return data;
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

		if (thumbnail) {
			totalSize += thumbnail.length;
		}

		if (!tab.discarded) {
			numActiveTabs++;
		}
	}

	document.getElementById('thumbnailCacheSize').textContent = formatByteSize(totalSize);
	document.getElementById('numberOfTabs').textContent = `${tabs.length} (${numActiveTabs} active)`;
}
// ----


function fillBackupSelection(autoBackups) {
	
	const elements = document.getElementById('selectBackup').querySelectorAll('.auto');

	for (const element of elements) {
		element.remove();
	}
	
	for (let i in autoBackups) {
		const time = new Date(autoBackups[i].time);
		selectBackup.appendChild(new_element('option', {content: `Auto Backup ${time.toLocaleString()}`, value: i, class: 'auto'}));
	}
}


async function init() {

	getCommands();
	getStatistics();

	document.getElementById('saveBackup').addEventListener('click', saveBackup);

	// load backup list
	document.getElementById('loadBackup').addEventListener('click', loadBackup);
	
	const backupFileInput = document.getElementById('backupFileInput');
	const selectBackup    = document.getElementById('selectBackup');
	
	autoBackups = await backups.get();
	
	fillBackupSelection(autoBackups);

	backupFileInput.addEventListener('change', (e) => {
		const filename = e.target.value.split(/(\\|\/)/g).pop();
		const file = new_element('option', {content: filename, value: 'file'});
		selectBackup.appendChild(file);
		selectBackup.value = 'file';
	});
	
	selectBackup.addEventListener('input', (e) => {
		if (e.target.value == 'browse') {
			backupFileInput.click();
		}
	});

	selectBackup.addEventListener('mousedown', (e) => {
		const file = e.target.querySelector('[value="file"]')
		if (file) file.remove();
		backupFileInput.value = null;
	});
	// ----
	
	// Auto-Backup
	const autoBackup         = document.getElementById('autoBackup');
	const autoBackupInterval = document.getElementById('autoBackupInterval');

	autoBackup.value = await backups.getInterval();
	
	const formatTime = (value) => {
		const hours   = Math.floor(value / 60);          
		const minutes = value % 60;
		if (hours == 0 && minutes == 0) {
			return `Never`;
		} else if (hours == 0) {
			return `${minutes}min`;
		} else if (minutes == 0) {
			return `${hours} hour${(hours > 1) ? 's' : ''}`;
		}  else {
			return `${hours}h ${minutes}min`;
		}
	}

	autoBackupInterval.textContent = formatTime(autoBackup.value);

	autoBackup.addEventListener('input', function() {
		autoBackupInterval.textContent = formatTime(autoBackup.value);
	});

	autoBackup.addEventListener('mouseup', function() {
		backups.setInterval(autoBackup.value);
	});
	// ----

	browser.tabs.onUpdated.addListener(getStatistics);
	//document.addEventListener('visibilitychange', getStatistics);
}

document.addEventListener('DOMContentLoaded', init);
