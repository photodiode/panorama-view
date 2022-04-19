
'use strict';

import * as html    from '/common/html.js'
import * as plurals from '/common/plurals.js'

import * as backups from '/background/backup.js'


function getDateString(date) {

	date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // time-zone fix

	let dateString = date.toISOString();
	    dateString = dateString.replaceAll('-', '');
	    dateString = dateString.replaceAll('T', '-');
	    dateString = dateString.replaceAll(':', '');
	    dateString = dateString.replace(/\..*/, '');
	    
	return dateString;
}


// backup
async function saveBackup() {

	const backup = await backups.create();

	const blob     = new Blob([JSON.stringify(backup, null, '\t')], {type : 'application/json'});
	const dataUrl  = window.URL.createObjectURL(blob);
	const filename = 'panorama-view-backup-' + getDateString(new Date()) + '.json';

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
			alert(browser.i18n.getMessage('optionLoadError'));
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


function fillBackupSelection(autoBackups) {
	
	const elements = document.getElementById('selectBackup').querySelectorAll('.auto');

	for (const element of elements) {
		element.remove();
	}
	
	for (let i in autoBackups) {
		const time = new Date(autoBackups[i].time);
		selectBackup.appendChild(html.newElement('option', {content: `Auto Backup ${time.toLocaleString()}`, value: i, class: 'auto'}));
	}
}


export async function createUI() {

	document.getElementById('saveBackup').addEventListener('click', saveBackup);

	// load backup list
	document.getElementById('loadBackup').addEventListener('click', loadBackup);
	
	const backupFileInput = document.getElementById('backupFileInput');
	const selectBackup    = document.getElementById('selectBackup');

	backupFileInput.addEventListener('change', (e) => {
		const filename = e.target.value.split(/(\\|\/)/g).pop();
		const file = html.newElement('option', {content: filename, value: 'file'});
		selectBackup.appendChild(file);
		selectBackup.value = 'file';
	});
	
	selectBackup.addEventListener('input', (e) => {
		if (e.target.value == 'browse') {
			backupFileInput.click();
		}
	});

	selectBackup.addEventListener('mousedown', async(e) => {
		autoBackups = await backups.get();
		fillBackupSelection(autoBackups);

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
			return browser.i18n.getMessage('optionAutomaticBackupIntervalNever');
		} else {
			return plurals.parse(browser.i18n.getMessage('optionAutomaticBackupIntervalValue', [hours, minutes]));
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
}
