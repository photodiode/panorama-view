
function convertBackup(tgData) {

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
				lastAccessed: tab.lastAccessed,
				pinned: false,
			});
		}
	}

	return data;
}

var background = browser.extension.getBackgroundPage()

async function openBackup(data) {

	background.openingBackup = true;

	for(var wi in data.windows) {

		var groups = [];

		for(var gi in data.windows[wi].groups) {
			groups.push({
				id: data.windows[wi].groups[gi].id,
				name: data.windows[wi].groups[gi].name,
				containerId: 'firefox-default',
				rect: data.windows[wi].groups[gi].rect,
				tabCount: 0,
			});
		}

		const window = await browser.windows.create({});

		await browser.sessions.setWindowValue(window.id, 'groups', groups);
		await browser.sessions.setWindowValue(window.id, 'activeGroup', data.windows[wi].activeGroup);
		await browser.sessions.setWindowValue(window.id, 'groupIndex', data.windows[wi].groupIndex);

		for(var ti in data.windows[wi].tabs) {

			var tab = await browser.tabs.create({
				url: data.windows[wi].tabs[ti].url,
				active: false,
				windowId: window.id,
				pinned: data.windows[wi].tabs[ti].pinned || false,
			}).catch((err) => { console.log(err); });

			if(tab) {
				await browser.sessions.setTabValue(tab.id, 'groupId', data.windows[wi].tabs[ti].groupId);
				//await browser.tabs.discard(tab.id);
			}
		}

		var pwTab = await browser.tabs.create({url: "/view.html", active: true, windowId: window.id});
		await browser.sessions.setTabValue(pwTab.id, 'groupId', -1);
	}
	background.openingBackup = false;
}

function loadBackup(input) {

	const file = input.target.files[0];

	if(file.type == 'application/json') {

		const reader = new FileReader();

		reader.onload = function(json) {
			var data = JSON.parse(json.target.result);

			// panorama view backup
			if(data.file && data.file.type == 'panoramaView' && data.file.version == 1) {

				// nothing to do..

			// if it's a tab groups backup
			}else if((data.version && data.version[0] == 'tabGroups' || data.version && data.version[0] == 'sessionrestore') && data.version[1] == 1) {
				data = convertBackup(data);
			}else{
				alert('Invalid file');
				return;
			}

			//console.log(JSON.stringify(data, null, 4));
			openBackup(data);
		};

		reader.readAsText(file);
	}else{
		alert('Invalid file');
	}
}

function makeDateString() {

	var pad = function(num) {
		var s = '00' + num;
		return s.substr(-2);
	};

	var date = new Date();
	var string = '';

	string += pad(date.getFullYear());
	string += pad(date.getMonth() + 1);
	string += pad(date.getDate());
	string += '-';
	string += pad(date.getHours());
	string += pad(date.getMinutes());
	string += pad(date.getSeconds());

	return string;
}

async function saveBackup() {

	var data = {
		file: {
			type: 'panoramaView',
			version: 1
		},
		windows: []
	};

	const windows = await browser.windows.getAll({});

	for(const wi in windows) {

		const groups = await browser.sessions.getWindowValue(windows[wi].id, 'groups');
		const groupIndex = await browser.sessions.getWindowValue(windows[wi].id, 'groupIndex');
		const activeGroup = await browser.sessions.getWindowValue(windows[wi].id, 'activeGroup');

		data.windows[wi] = {groups: [], tabs: [], activeGroup: activeGroup, groupIndex: groupIndex};

		for(const gi in groups) {
			data.windows[wi].groups.push({
				id: groups[gi].id,
				name: groups[gi].name,
				rect: groups[gi].rect,
			});
		}

		const tabs = browser.tabs.query({windowId: windows[wi].id});
		for(const tab of await tabs) {

			var groupId = await browser.sessions.getTabValue(tab.id, 'groupId');

			if(groupId != -1) {
				var entry = {
					url: tab.url,
					title: tab.title,
					groupId: groupId,
					index: tab.index,
					lastAccessed: tab.lastAccessed,
				}

				if (tab.pinned === true) {
					entry.pinned = tab.pinned
				}

				data.windows[wi].tabs.push(entry);
			}
		}
	}

	var blob = new Blob([JSON.stringify(data, null, '\t')], {type : 'application/json'});
	var dataUrl = window.URL.createObjectURL(blob);

	var filename = 'panoramaView-backup-' + makeDateString() + '.json';

	await browser.downloads.download({
		url: dataUrl,
		filename: filename,
		conflictAction: 'uniquify',
		saveAs: true
	});
}
