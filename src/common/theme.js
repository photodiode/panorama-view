
'use strict';

import * as colors from '/common/colors.js'


const useDark = window.matchMedia("(prefers-color-scheme: dark)");


export async function set(themeType, theme) {

	if (!themeType) {
		if (!theme) theme = await browser.theme.getCurrent();
		console.log(theme);
		if (theme && theme.colors) {

			/*const color = colors.toRGBA(theme.colors.frame);
			//console.log("Theme selection color:", color, colors.toGray(color));
			if (color) {
				if (colors.toGray(color) < 0.5) {
					themeType = 'dark';
				} else {
					themeType = 'light';
				}
			}*/

			setAll(theme);
			themeType = 'custom';
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
	document.body.className = themeType;
}

async function setAll(theme) {

	if (!theme) theme = await browser.theme.getCurrent();

	if (theme && theme.colors) {

		let color_tab_overlay = colors.toRGBA(theme.colors.toolbar_field);
		    color_tab_overlay[3] = 0.8;

		const style = [
			`--color-background: ${theme.colors.frame}`,
			`--color-text: ${theme.colors.toolbar_field_text}`,

			`--color-group-background: ${theme.colors.toolbar}`,
			`--color-group-border: ${theme.colors.toolbar_bottom_separator ? theme.colors.toolbar_bottom_separator : 'rgba(0, 0, 0, 0.3)'}`,
			`--color-group-count-background: ${theme.colors.toolbar_field}`,

			`--color-tab: ${theme.colors.toolbar_field}`,
			`--color-tab-overlay: rgba(${color_tab_overlay.join(',')})`,
			`--color-tab-hover: rgba(255, 255, 255, 0.3)`,
			`--color-tab-active: ${(theme.colors.appmenu_info_icon_color) ? theme.colors.appmenu_info_icon_color : theme.colors.tab_line}` //appmenu_info_icon_color
		];

		var stylesheet = new CSSStyleSheet();
		stylesheet.insertRule(`.custom { ${style.join(';')} }`);
		console.log(stylesheet);
		document.adoptedStyleSheets = [stylesheet];
	}
}
