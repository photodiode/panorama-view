# How to contribute

## Translations
To make a translation a new folder with the name of the [Language Code](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/LanguageCode) has to be made inside "_locales".  
This folder should contain a file called "messages.json" ([MDN documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference))  


### Plurals
Plural list: `$1{tab, tabs}`

The parsing uses JavaScript's [Intl.PluralRules.select()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules/select) function with the current locale to get one of the categories `zero`, `one`, `two`, `few`, `many` and `other` according to [these rules](https://developer.mozilla.org.cach3.com/en/Localization_and_Plurals).

Example sentence:

`This group has $1{one tab, $1 tabs}.`

English (en-*) only has two categories (`one`, `other`) so only two list entries are needed.

Output:

- 0: "This group has 0 tabs."
- 1: "This group has one tab."
- 2: "This group has 2 tabs."
- 8: "This group has 8 tabs."
