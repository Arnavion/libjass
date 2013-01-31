"use strict";

// String.trimLeft for browsers which don't support it
if (String.prototype.trimLeft === undefined) {
	String.prototype.trimLeft = function () {
		return this.match(/^\s*(.*)$/)[1];
	};
}

/**
 * @param str
 * @return <code>true</code> if this string starts with <code>str<code>
 */
String.prototype.startsWith = function (str) {
	return this.indexOf(str) === 0;
};

/**
 * @param str
 * @return <code>true</code> if this string ends with <code>str<code>
 */
String.prototype.endsWith = function (str) {
	return this.indexOf(str) === this.length - str.length;
};

/**
 * Converts this string into a CSS rgb color string. This string must be 6 hexadecimal digits in the form BBGGRR.
 */
String.prototype.toRGB = function () {
	return this.split(/([0-9a-fA-F]{2})/).reverse().join("");
};

/**
 * Converts this string into a CSS rgba color string. This string must be 8 hexadecimal digits in the form AABBGGRR.
 */
String.prototype.toRGBA = function () {
	return (
		"rgba(" +
		this.split(/([0-9a-fA-F]{2})/).filter(function (part) {
			return part !== "";
		}).map(function (part, index) {
			var result = parseInt(part, 16);
			if (index === 0) {
				result = 1 - result / 255;
			}
			return result;
		}).reverse().join(",") +
		")"
	);
};

/**
 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
 */
String.prototype.toTime = function () {
	return this.split(":").reduce(function (previousValue, currentValue) {
		return previousValue * 60 + parseFloat(currentValue);
	}, 0);
};

// Replace the in-built parseInt with one which always parses to base 10 ints if the second parameter is undefined
(function () {
	var oldParseInt = window.parseInt;

	window.parseInt = function (str) {
		// If str starts with 0x, then it is to be parsed as base 16 even if the second parameter is not given.
		// PEGjs requires this.
		return oldParseInt(str, arguments[1] || (!str.startsWith("0x") && 10));
	};
})();

/* Set and Set.iterator implementation for browsers that don't support them. Only supports String elements.
 * Elements are stored as properties of an object, prefixed with the ">" character to avoid collisions with pre-defined
 * properties.
 */
if (!window.Set || !window.Set.prototype.iterator) {
	window.Set = function () {
		var data = {};

		this.add = function (element) {
			data[">" + element] = true;
		};

		this.has = function (element) {
			return data.hasOwnProperty(">" + element);
		};

		this.iterator = function () {
			return Iterator(Object.keys(data).toEnumerable().map(function (entry) {
				return entry[1];
			}).filter(function (property) {
				return property.startsWith(">");
			}).map(function (property) {
				return property.substring(1);
			}));
		};
	};
	
	Set.prototype = new Set();
	Set.prototype.__iterator__ = Set.prototype.iterator;
}

/**
 * Converts this set into an array.
 * 
 * @return An array of the elements of this set
 */
window.Set.prototype.toArray = function () {
	return this.iterator().toArray();
};