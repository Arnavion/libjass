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

Array.prototype.partition = function (predicate) {
	var trueResult = [];
	var falseResult = [];
	this.forEach(function (el, i) {
		if (predicate(el, i)) {
			trueResult.push(el);
		}
		else {
			falseResult.push(el);
		}
	});
	return [trueResult, falseResult];
};

function Set() {
	var that = this;
	var data = {};

	this.add = function (element) {
		data[">" + element] = true;
	};

	this.forEach = function (callback, thisArg) {
		var i = 0;
		thisArg = thisArg || that;
		for (var element in data) {
			if (element.startsWith(">")) {
				callback.call(thisArg, element, i, this);
				++i;
			}
		}
	};
}