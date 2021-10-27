
'use strict';

import * as colors from '../common/colors.js';

export async function set(theme) {
	
	const storage = await browser.storage.local.get();
	let themeType = storage.themeOverride;
	
	if (!themeType) {
		if (!theme) theme = await browser.theme.getCurrent();
		if (theme && theme.colors) {

			const color = colors.toRGBA(theme.colors.frame);
			if (color) {
				if (colors.toGray(color) < 0.5) {
					themeType = 'dark';
				} else {
					themeType = 'light';
				}
			}
		}
	}
	
	if (!themeType) {
		if (window.matchMedia('(prefers-color-scheme: dark)')) {
			themeType = 'dark';
		} else {
			themeType = 'light';
		}
	}

	if (themeType == 'dark') {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
	}
}
