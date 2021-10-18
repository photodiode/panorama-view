
'use strict';

import {addon} from './addon.js';
import * as core from './core.js';

export async function handleCommands(command) {
	switch (command) {
		case 'toggle_panorama_view': {
			toggleView();
			break;
		}
		case 'new_tab_group': {
			addon.tabGroups.create();
			break;
		}
		case 'next_group': {
			const windowId = (await browser.windows.getCurrent()).id;
			const groups = await browser.sessions.getWindowValue(windowId, 'groups');

			let activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
			let activeIndex = groups.findIndex(function(group){ return group.id === activeGroup; });
			let newIndex = (activeIndex + 1) % groups.length;

			activeGroup = groups[newIndex].id;
			await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);

			await core.toggleVisibleTabs(windowId, activeGroup, true);

			break;
		}
		case 'previous_group': {
			const windowId = (await browser.windows.getCurrent()).id;
			const groups = await browser.sessions.getWindowValue(windowId, 'groups');

			let activeGroup = (await browser.sessions.getWindowValue(windowId, 'activeGroup'));
			let activeIndex = groups.findIndex(function(group){ return group.id === activeGroup; });
			let newIndex = activeIndex - 1;
			    newIndex = (newIndex < 0) ? groups.length-1 : newIndex;

			activeGroup = groups[newIndex].id;
			await browser.sessions.setWindowValue(windowId, 'activeGroup', activeGroup);

			await core.toggleVisibleTabs(windowId, activeGroup, true);

			break;
		}
		default:
			console.log('Unknown command');
	}
}
