
'use strict';

export function toRGBA(input) {

	if (!input) return undefined;

	// get computed color
	const tmpElement = document.body.appendChild(document.createElement('tmpColorElement'));
	      tmpElement.style.color = input;

	const computedColor = window.getComputedStyle(tmpElement).color;

	      tmpElement.remove();
	// ----

	let color = computedColor.match(/[\.\d]+/g);

	if (!color) return undefined;

	if (color.length == 3) color.push(1);
	if (color.length != 4) return undefined;

	return [
		Number(color[0]),
		Number(color[1]),
		Number(color[2]),
		Number(color[3])
	];
}

export function toGray(color) {
	return (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
}
