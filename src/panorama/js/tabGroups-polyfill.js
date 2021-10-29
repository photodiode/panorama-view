
'use strict';

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
				for (let i in this.listeners) {
					if (listener === this.listeners[i]) {
						this.listeners.splice(i, 1);
						break;
					}
				}
			}
		};
		this.call = (...data) => {
			this.listeners.forEach(listener => {
				listener(...data);
			});
		}
	}

	// tabGroups
	let tabGroups_onCreated = new listenerObject();
	//let tabGroups_onMoved = new listenerObject();
	let tabGroups_onRemoved = new listenerObject();
	let tabGroups_onUpdated = new listenerObject();

	browser.tabGroups = {
		get: (groupId) => {
			return browser.runtime.sendMessage({
				action:  'browser.tabGroups.get',
				groupId:  groupId
			});
		},
		/*move: (queryInfo) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.move',
				groupId: groupId,
				info:    moveInfo
			});
		},*/
		query: (queryInfo) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.query',
				info:    queryInfo
			});
		},
		update: (groupId, updateInfo) => {
			return browser.runtime.sendMessage({
				action: 'browser.tabGroups.update',
				groupId: groupId,
				info:    updateInfo
			});
		},
		onCreated: tabGroups_onCreated.functions,
		//onMoved: tabGroups_onMoved.functions,
		onRemoved: tabGroups_onRemoved.functions,
		onUpdated: tabGroups_onUpdated.functions
	}
	// ----
	
	// tabs hijack
	let tabs_onCreated = new listenerObject();
	let tabs_onUpdated = new listenerObject();

	browser.tabs.create = (createInfo) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.create',
			info:   createInfo
		});
	}
	/*browser.tabs.get = (tabId) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.get',
			tabId:   tabId
		});
	}*/
	/*browser.tabs.getCurrent = () => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.getCurrent'
		});
	}*/
	/*browser.tabs.group = (tabIds, groupId) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.group',
			tabIds:  tabIds,
			groupId: groupId
		});
	}*/
	browser.tabs.query = (queryInfo) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.query',
			info:   queryInfo
		});
	}
	/*browser.tabs.ungroup = (tabIds, groupId) => {
		return browser.runtime.sendMessage({
			action: 'browser.tabs.ungroup',
			tabIds:  tabIds
		});
	}*/

	browser.tabs.onCreated = tabs_onCreated.functions;
	browser.tabs.onUpdated = tabs_onUpdated.functions;
	// ----

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch (message.event) {
			case 'browser.tabGroups.onCreated': {
				tabGroups_onCreated.call(message.group);
				break;
			}
			/*case 'browser.tabGroups.onMoved': {
				tabGroups_onMoved.call(message.groupId, message.moveInfo);
				break;
			}*/
			case 'browser.tabGroups.onRemoved': {
				tabGroups_onRemoved.call(message.groupId, message.removeInfo);
				break;
			}
			case 'browser.tabGroups.onUpdated': {
				tabGroups_onUpdated.call(message.group);
				break;
			}

			case 'browser.tabs.onCreated': {
				tabs_onCreated.call(message.tab);
				break;
			}
			case 'browser.tabs.onUpdated': {
				tabs_onUpdated.call(message.tabId, message.changeInfo, message.tab);
				break;
			}
			default:
				break;
		}
	});
}
