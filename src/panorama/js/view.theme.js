
'use strict';

import * as colors from '../../common/colors.js';

import {options} from './view.js';

export async function set(theme) {

	let themeType = options.themeOverride;
	
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
