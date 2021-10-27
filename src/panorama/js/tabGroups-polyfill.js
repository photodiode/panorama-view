
//'use strict';

if (!browser.hasOwnProperty('tabGroups')) {

	function listenerObject() {
		this.listeners = [];
		this.functions = {
			addListener: (listener) => {
				this.listeners.push(listener);
			},
			hasListener: (listener) => {
				return this.listeners.find(listener) != undefined;
			},
			removeListener: (listener) => {
				const i = this.listeners.findIndex(listener);
				if (i != -1) this.listeners.splice(i, 1);
			}
		};
		this.call = (...data) => {
			this.listeners.forEach(listener => {
				console.log(data);
				listener.apply(this, data);
			});
		}
	}

	// tabGroups
	let tabGroups_onCreated = new listenerObject();
	let tabGroups_onRemoved = new listenerObject();
	let tabGroups_onUpdated = new listenerObject();

	browser.tabGroups = {
		get: (groupId) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.get',
				info:   groupId
			});
		},
		query: (queryInfo) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.query',
				info:   queryInfo
			});
		},
		update: (groupId, updateInfo) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.update',
				id:     groupId,
				info:   updateInfo
			});
		},
		onCreated: tabGroups_onCreated.functions,
		onRemoved: tabGroups_onRemoved.functions,
		onUpdated: tabGroups_onUpdated.functions
	}
	// ----
	
	// tabs
	let tabs_onCreated = new listenerObject();
	let tabs_onUpdated = new listenerObject();
	
	browser.tabs.create = (createInfo) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.create',
			info:   createInfo
		});
	}
	browser.tabs.query = (queryInfo) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.query',
			info:   queryInfo
		});
	}
	
	
	browser.tabs.onCreated = tabs_onCreated.functions;
	//browser.tabs.onUpdated = tabs_onUpdated.functions;
	// ----

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch (message.event) {
			case 'browser.tabGroups.onCreated': {
				tabGroups_onCreated.call(message.data);
				break;
			}
			case 'browser.tabGroups.onRemoved': {
				tabGroups_onRemoved.call(message.data.groupId, message.data.removeInfo);
				break;
			}
			case 'browser.tabGroups.onUpdated': {
				tabGroups_onUpdated.call(message.data);
				break;
			}

			case 'browser.tabs.onCreated': {
				tabs_onCreated.call(message.data);
				break;
			}
			case 'browser.tabs.onUpdated': {
				tabs_onUpdated.call(message.data.tabId, message.data.changeInfo, message.data.tab);
				break;
			}
			default:
				break;
		}
	});
}
