"use strict";

if (String.prototype.trimLeft === undefined) {
	String.prototype.trimLeft = function () {
		return this.match(/^\W*(.+)$/)[1];
	};
}

String.prototype.startsWith = function (str) {
	return this.indexOf(str) === 0;
};

String.prototype.endsWith = function (str) {
	return this.indexOf(str) === this.length - str.length;
};

String.prototype.toRGB = function () {
	return this.split(/([0-9a-fA-F]{2})/).reverse().join("");
};

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

(function () {
	var oldParseInt = window.parseInt;

	window.parseInt = function (str) {
		return oldParseInt(str, arguments[1] || (!str.startsWith("0x") && 10));
	};
})();

window.Set = function () {
	var that = this;
	var data = {};

	this.add = function (element) {
		data[">" + element] = true;
	};

	this.has = function (element) {
		return !!data[">" + element];
	};

	this.forEach = function (callback, thisArg) {
		var i = 0;
		thisArg = thisArg || that;
		for (var element in data) {
			if (element.startsWith(">")) {
				callback.call(thisArg, element.substring(1), i, this);
				++i;
			}
		}
	};

	this.toArray = function () {
		var result = [];
		this.forEach(function (element) {
			result.push(element);
		});
		return result;
	};
}