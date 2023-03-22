
'use strict';

import {Color} from '/common/colors.js'


const useDark = window.matchMedia("(prefers-color-scheme: dark)");


function isNull(array) {
	for (let i = 0; i < array.length; i++) {
		if (array[i] == null || array[i] == null) {
			console.log(i);
			return true;
		}
	}
	return false;
}


export async function set(themeType, theme) {

	if (themeType == 'custom') {
		if (!theme) theme = await browser.theme.getCurrent();

		if (theme && theme.colors && !isNull([
			theme.colors.frame,
			theme.colors.toolbar_field_text,
			theme.colors.toolbar,
			theme.colors.toolbar_text,
			theme.colors.toolbar_field,
			theme.colors.tab_line
		])) {
			setAll(theme);
		} else {
			themeType = undefined;
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

function priority(array) {
	for (let i = 0; i < array.length; i++) {
		if (array[i] != undefined) {
			return array[i];
		}
	}
}

async function setAll(theme) {

	if (!theme) theme = await browser.theme.getCurrent();

	if (theme && theme.colors) {

		let background = new Color(theme.colors.frame);

		let shadow = new Color(theme.colors.toolbar_field_text);
		    shadow.a = 0.15;

		let group = background.mix(new Color(theme.colors.toolbar));

		let group_text = new Color(theme.colors.toolbar_text);

		let group_border = shadow;
		if (background.toGrayscale().r < 0.4) {
			group_border = group.mix(new Color(1, 1, 1, 0.1));
		}

		let tab = new Color(theme.colors.toolbar_field);

		let tab_text = new Color(theme.colors.toolbar_field_text);

		let tab_overlay = new Color(theme.colors.toolbar_field);
		    tab_overlay.a = 0.8;

		let tab_hover = new Color(theme.colors.toolbar_field_text);
		    tab_hover.a = 0.3;

		let tab_active = new Color(theme.colors.tab_line);
		if ((tab_active.distance(tab) < 0.3 &&
		     tab_active.distance(group) < 0.3) ||
		     tab_active.a < 0.1) {
			tab_active = new Color(priority([theme.colors.toolbar_text, theme.colors.toolbar_field_text]));
		}

		const style = `.custom {
	--color-background: ${background.toCSS()};
	--color-shadow: ${shadow.toCSS()};

	--color-group: ${group.toCSS()};
	--color-group-text: ${group_text.toCSS()};
	--color-group-border: ${group_border.toCSS()};

	--color-tab: ${tab.toCSS()};
	--color-tab-text: ${tab_text.toCSS()};
	--color-tab-overlay: ${tab_overlay.toCSS()};
	--color-tab-hover: ${tab_hover.toCSS()};
	--color-tab-active: ${tab_active.toCSS()};
}`;

		let stylesheet = new CSSStyleSheet();
		stylesheet.insertRule(style);
		document.adoptedStyleSheets = [stylesheet];
	}
}
