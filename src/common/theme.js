
'use strict';

import * as colors from '/common/colors.js'


const useDark = window.matchMedia("(prefers-color-scheme: dark)");


export async function set(themeType, theme) {

	if (!themeType) {
		if (!theme) theme = await browser.theme.getCurrent();
		//console.log(theme);
		if (theme && theme.colors) {

			const color = colors.toRGBA(theme.colors.frame);
			//console.log("Theme selection color:", color, colors.toGray(color));
			if (color) {
				if (colors.toGray(color) < 0.5) {
					themeType = 'dark';
				} else {
					themeType = 'light';
				}
			}
		}
	}

	if (themeType) {
		update(themeType);
		useDark.removeEventListener('change', darkToggle);
	} else {
		darkToggle(useDark);
		useDark.addEventListener('change', darkToggle);
	}
}

function darkToggle(dark) {
	if (dark.matches) {
		update('dark');
	} else {
		update('light');
	}
}

function update(themeType) {
	if (themeType == 'dark') {
		document.body.classList.add('dark');
		document.getElementById('favicon').href = '../gfx/icon_light.svg';
	} else {
		document.body.classList.remove('dark');
		document.getElementById('favicon').href = '../gfx/icon_dark.svg';
	}
}

/*export async function setAll(theme) {

	if (!theme) theme = await browser.theme.getCurrent();

	console.log(theme.colors);

	if (theme && theme.colors) {

		const colors = [
			`--color-background: ${theme.colors.sidebar}`,
			`--color-text: ${theme.colors.sidebar_text}`
		];
		document.body.setAttribute('style', colors.join(';'));
		
		
		
	}
}*/
