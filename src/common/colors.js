
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

export function mix(a, b) {
	const lerp = function(a, b, t){
		return a * (1 - t) + b * t;
	}
	return [
		lerp(a[0], b[0], b[3]),
		lerp(a[1], b[1], b[3]),
		lerp(a[2], b[2], b[3]),
		Math.max(a[3], b[3]),
	];
}