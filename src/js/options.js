
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

	commands.forEach(function(command) {
		let input = new_element('input', {value: command.shortcut, type: 'textfield'}, []);
		let label = new_element('label', {content: command.description, for: input.id}, []);
		let reset = new_element('input', {value: 'Reset', type: 'button'}, []);

		input.addEventListener('input', function(e) {
				updateShortcut(input, command.name, e);
		});

		reset.addEventListener('click', (function() {
			return function () {
				resetShortcut(input, command.name);
			};
		}()));

		let commandNode = new_element('div', {}, [label, input, reset]);
		fragment.appendChild(commandNode);
	});

	document.getElementById('keyboardShortcuts').appendChild(fragment);
}

async function getShortcut(name) {
	const commands = browser.commands.getAll();

	for(const command of await commands) {
		if (command.name === name) {
			return command.shortcut;
		}
	}
}

async function resetShortcut(node, name) {
	await browser.commands.reset(name);
	node.classList.remove('error');
	node.value = await getShortcut(name);
}

function updateShortcut(node, name, e) {

	var regex = /^((Ctrl|Alt|Command|MacCtrl)(\+)((Ctrl|Shift|Alt|Command|MacCtrl)(\+))?\b((F12|F11|F10|F9|F8|F7|F6|F5|F4|F3|F1|F1)|(Comma|Period|Home|End|PageUp|PageDown|Space|Insert|Delete|Up|Down|Left|Right)|[A-Z]|[0-9]))$/;

	if (regex.test(e.target.value)) {
		e.target.classList.remove('error');

		browser.commands.update({
			name: name,
			shortcut: e.target.value
		});

	} else {
		e.target.classList.add('error');
	}
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

	const tabs = browser.tabs.query({url: browser.extension.getURL('view.html')});

	for(const tab of await tabs) {
		browser.tabs.reload(tab.id);
	}
}
// ----


// statistics
function formatByteSize(bytes) {
	if(bytes < 1024) return bytes + " bytes";
	else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
	else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
	else return(bytes / 1073741824).toFixed(3) + " GiB";
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
	getStatistics();

	document.getElementById('backupFileInput').addEventListener('change', loadBackup);
	document.getElementById('saveBackupButton').addEventListener('click', saveBackup);

	document.getElementById('useDarkTheme').addEventListener('change', changeTheme);
	browser.tabs.onUpdated.addListener(getStatistics);
}

document.addEventListener('DOMContentLoaded', init);
