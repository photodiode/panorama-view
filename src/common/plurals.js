
'use strict';

const pluralRule       = new Intl.PluralRules(browser.i18n.getUILanguage());
const pluralCategories = pluralRule.resolvedOptions().pluralCategories; // zero, one, two, few, many, other

export function parse(message) {

	const plurals = message.matchAll(/[0-9]+\{[^\}]*\}/g);

	for (const match of plurals) {
		// parse
		const plural = match[0].replaceAll(/\s*,\s*/g, ','); // clean up whitespace around commas

		const countString = plural.match(/[^\{]*/).pop();
		const listString  = plural.substring(countString.length+1, plural.length-1);

		const count = parseInt(countString, 10);
		const list  = listString.split(',');
		// ----

		const ruleIndex = pluralCategories.indexOf(pluralRule.select(count));
		const output    = list[ruleIndex] || list[0];

		message = message.replace(match[0], output);
	}
	return message;
}
