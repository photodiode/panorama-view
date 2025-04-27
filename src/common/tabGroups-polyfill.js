
'use strict';

if (!browser.tabGroups) {

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
				for (const i in this.listeners) {
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

	// browser.tabGroups
	const tabGroups_onCreated = new listenerObject();
	//const tabGroups_onMoved = new listenerObject();
	const tabGroups_onRemoved = new listenerObject();
	const tabGroups_onUpdated = new listenerObject();

	const panoramaViewId = '{60e27487-c779-464c-8698-ad481b718d5f}';

	browser.tabGroups = {
		create: (createInfo) => {
			return browser.runtime.sendMessage(panoramaViewId, {
				action: 'browser.tabGroups.create',
				info:    createInfo
			});
		},
		get: (groupId) => {
			return browser.runtime.sendMessage(panoramaViewId, {
				action:  'browser.tabGroups.get',
				groupId:  groupId
			});
		},
		/*move: (queryInfo) => {
			return browser.runtime.sendMessage(panoramaViewId, {
				action: 'browser.tabGroups.move',
				groupId: groupId,
				info:    moveInfo
			});
		},*/
		query: (queryInfo) => {
			return browser.runtime.sendMessage(panoramaViewId, {
				action: 'browser.tabGroups.query',
				info:    queryInfo
			});
		},
		remove: (groupId) => {
			return browser.runtime.sendMessage(panoramaViewId, {
				action: 'browser.tabGroups.remove',
				groupId: groupId
			});
		},
		update: (groupId, updateInfo) => {
			return browser.runtime.sendMessage(panoramaViewId, {
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

	// browser.tabs hijack
	const tabs_onCreated = new listenerObject();
	const tabs_onUpdated = new listenerObject();

	browser.tabs.create = (createInfo) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.tabs.create',
			info:   createInfo
		});
	}
	browser.tabs.get = (tabId) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.tabs.get',
			tabId:   tabId
		});
	}
	const browser_tabs_getCurrent = browser.tabs.getCurrent;
	browser.tabs.getCurrent = () => {
		return browser_tabs_getCurrent().then(tab => browser.tabs.get(tab.id));
	}
	browser.tabs.move = (tabIds, moveInfo) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.tabs.move',
			tabIds:  tabIds,
			info:    moveInfo
		});
	}
	browser.tabs.query = (queryInfo) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.tabs.query',
			info:   queryInfo
		});
	}

	browser.tabs.onCreated = tabs_onCreated.functions;
	browser.tabs.onUpdated = tabs_onUpdated.functions;
	// ----

	// browser.sessions additions
	browser.sessions.setGroupValue = (groupId, key, value) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.sessions.setGroupValue',
			groupId: groupId,
			key:     key,
			value:   value
		});
	}
	browser.sessions.getGroupValue = (groupId, key) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.sessions.getGroupValue',
			groupId: groupId,
			key:     key
		});
	}
	browser.sessions.removeGroupValue = (groupId, key) => {
		return browser.runtime.sendMessage(panoramaViewId, {
			action: 'browser.sessions.removeGroupValue',
			groupId: groupId,
			key:     key
		});
	}
	// ----

	// event listeners
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (sender.id != panoramaViewId) return;
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
	// ----
}
