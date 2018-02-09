
'use strict';

var tabNodes = {};

async function initTabNodes() {

	await view.tabs.forEach(async function(tab) {
		makeTabNode(tab);
		updateTabNode(tab);
		updateFavicon(tab);
		updateThumbnail(tab.id);
	});
	setActiveTabNode();
}

function makeTabNode(tab) {

	var favicon = new_element('div', {class: 'favicon'});
	var close = new_element('div', {class: 'close', title: 'Close Tab'});
	var name = new_element('div', {class: 'name'});

	var inner = new_element('div', {class: 'inner'}, [
		favicon,
		close,
		name
	])

	var node = new_element('div', {class: 'tab', draggable: 'true', tabId: tab.id}, [inner]);

	node.addEventListener('click', async function(event) {
		event.preventDefault();
		event.stopPropagation();

		await browser.tabs.update(tab.id, {active: true});
	}, false);

	node.addEventListener('auxclick', function(event) {
		event.preventDefault();
		event.stopPropagation();

		if (event.button == 1) { // middle mouse
			browser.tabs.remove(tab.id);
		}
	}, false);

	close.addEventListener('click', function(event) {
		event.stopPropagation();
		browser.tabs.remove(tab.id);
	}, false);

	node.addEventListener('dragstart', tabDragStart, false);
	node.addEventListener('dragenter', tabDragEnter, false);
	node.addEventListener('dragover', tabDragOver, false);
	node.addEventListener('dragleave', tabDragLeave, false);
	node.addEventListener('drop', tabDrop, false);
	node.addEventListener('dragend', tabDragEnd, false);

	tabNodes[tab.id] = {
		tab: node,
		inner: inner,
		favicon: favicon,
		close: close,
		name: name
	};
}

async function updateTabNode(tab) {

	var node = tabNodes[tab.id];

	if(node) {
		node.name.innerHTML = '';
		node.name.appendChild(document.createTextNode(tab.title));

		node.inner.title = tab.title + ' - ' + tab.url;

		if(tab.discarded) {
			node.tab.classList.add('inactive');
		}else{
			node.tab.classList.remove('inactive');
		}
	}
}

async function setActiveTabNode() {

	var lastActive = -1;
	var lastAccessed = 0;

	await view.tabs.forEach(async function(tab) {

		tabNodes[tab.id].tab.classList.remove('selected');

		if(tab.lastAccessed > lastAccessed && tab.id != view.tabId) {
			lastAccessed = tab.lastAccessed;
			lastActive = tab.id;
		}
	});

	tabNodes[lastActive].tab.classList.add('selected');
}

function deleteTabNode(tabId) {
	if(tabNodes[tabId]) {
		tabNodes[tabId].tab.parentNode.removeChild(tabNodes[tabId].tab);
		delete tabNodes[tabId];
	}
}

async function updateThumbnail(tabId) {
	var node = tabNodes[tabId];

	if ( node ) {
		const thumbnail = await browser.tabs.captureTab( tabId, { format: 'jpeg', quality: 25 } );
		node.inner.style.backgroundImage = 'url(' + thumbnail + ')';
	}
}

async function testImage(url) {
	return new Promise(function (resolve, reject) {

		var img = new Image();

		img.onerror = img.onabort = function () {
			reject("error");
		};

		img.onload = function () {
			resolve("success");
		};

		img.src = url;
	});
}

async function updateFavicon(tab) {

	var node = tabNodes[tab.id];

	if(node) {
		if(tab.favIconUrl &&
			tab.favIconUrl.substr(0, 22) != 'chrome://mozapps/skin/' &&
			tab.favIconUrl != tab.url) {
			testImage(tab.favIconUrl).then(
				_ => {
					node.favicon.style.backgroundImage = 'url(' + tab.favIconUrl + ')';
					node.favicon.classList.add('visible');
				}, _ => {
					node.favicon.style.backgroundImage = '';
					node.favicon.classList.remove('visible');
				}
			);
		}else{
			node.favicon.classList.remove('visible');
		}
	}
}
