
'use strict';

export function Color(input, input_b, input_c, input_d) {

	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 1;

	if (typeof input == 'string') {

		// get computed color
		const tmpElement = document.body.appendChild(document.createElement('tmpColorElement'));
		      tmpElement.style.color = input;

		const computedColor = window.getComputedStyle(tmpElement).color;

		      tmpElement.remove();
		// ----

		let color = computedColor.match(/[\.\d]+/g);

		if (!color) color = [0, 0, 0, 1];

		if (color.length == 3) color.push(1);
		if (color.length != 4) color = [0, 0, 0, 1];

		this.r = Number(color[0]) / 255;
		this.g = Number(color[1]) / 255;
		this.b = Number(color[2]) / 255;
		this.a = Number(color[3]);

	} else if (input != undefined &&
	           input_b != undefined &&
	           input_c != undefined &&
	           input_d != undefined) {

		this.r = input;
		this.g = input_b;
		this.b = input_c;
		this.a = input_d;
	}

	this.toCSS = function() {
		return `rgba(${this.r * 255}, ${this.g * 255}, ${this.b * 255}, ${this.a})`;
	};

	this.mix = function(that) {
		const lerp = function(a, b, t){
			return a * (1 - t) + b * t;
		}
		return new Color(
			lerp(this.r, that.r, that.a),
			lerp(this.g, that.g, that.a),
			lerp(this.b, that.b, that.a),
			Math.max(this.a, that.a),
		);
	};

	this.toGrayscale = function() {
		const gray = (0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b);
		return new Color(gray, gray, gray, this.a);
	};

	this.distance = function(that) {
		const r = that.r - this.r;
		const g = that.g - this.g;
		const b = that.b - this.b;
		return Math.sqrt(r*r + g*g + b*b) / 1.7320508075688772;
	}

}
