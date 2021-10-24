
'use strict';

export function toRGBA(input) {
	// get computed color
	const tmpElement = document.body.appendChild(document.createElement('tmpColorElement'));
	      tmpElement.style.color = input;

	const computedColor = window.getComputedStyle(tmpElement).color;

	      tmpElement.remove();
	// ----

	let color = computedColor.match(/[\.\d]+/g);

	if (!color) color = [0, 0, 0, 0];
	if (!input) color = [0, 0, 0, 0];

	if (color.length == 3) color.push(1);
	if (color.length != 4) color = [0, 0, 0, 0];

	return {
		r: Number(color[0]),
		g: Number(color[1]),
		b: Number(color[2]),
		a: Number(color[3])
	};
}

export function toGray(color) {
	return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}
