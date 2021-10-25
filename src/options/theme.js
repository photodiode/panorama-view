
'use strict';

import * as colors from '../common/colors.js';

export async function set(theme) {

	let darkTheme = false;
	
	const storage = await browser.storage.local.get();
	
	if (storage.themeOverride == undefined) {
		if (!theme) theme = await browser.theme.getCurrent();

		if (theme && theme.colors) {
			if (colors.toGray(colors.toRGBA(theme.colors.frame)) < 0.5) {
				darkTheme = true;
			}
		} else if (window.matchMedia('(prefers-color-scheme: dark)')) {
			darkTheme = true;
		}
	} else {
		if (storage.themeOverride == 'dark') {
			darkTheme = true;
		}
	}

	if (darkTheme) {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
	}
}
