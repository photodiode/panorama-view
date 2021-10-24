
'use strict';

import * as colors from '../../common/colors.js';

export async function set(theme) {

	if (!theme) theme = await browser.theme.getCurrent();

	let darkTheme = false;

	if (theme && theme.colors) {
		if (colors.toGray(colors.toRGBA(theme.colors.frame)) < 0.5) {
			darkTheme = true;
		}
	} else if (window.matchMedia('(prefers-color-scheme: dark)')) {
		darkTheme = true;
	}

	if (darkTheme) {
		document.body.classList.add('dark');
		document.getElementById('favicon').href = '../gfx/icon_light.svg';
	} else {
		document.body.classList.remove('dark');
		document.getElementById('favicon').href = '../gfx/icon_dark.svg';
	}
}

export async function setAll(theme) {

	if (!theme) theme = await browser.theme.getCurrent();
	
	console.log(theme.colors);

	if (theme && theme.colors) {
		
		const colors = [
			`--color-background: ${theme.colors.sidebar}`,
			`--color-text: ${theme.colors.sidebar_text}`
		];
		document.body.setAttribute('style', colors.join(';'));
		
		
		
	}
}
