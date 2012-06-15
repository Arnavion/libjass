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

String.prototype.toTime = function () {
	return this.split(":").reduce(function (previousValue, currentValue) {
		return previousValue * 60 + parseFloat(currentValue);
	}, 0);
};

(function () {
	var oldParseInt = window.parseInt;

	window.parseInt = function (str) {
		return oldParseInt(str, arguments[1] || (!str.startsWith("0x") && 10));
	};
})();

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
			return Object.keys(data).toEnumerable().filter(function (property) {
				return property.startsWith(">");
			}).map(function (property) {
				return property.substring(1);
			});
		};
	};
}

window.Set.prototype.forEach = function (callback) {
	this.iterator().forEach(callback);
};

window.Set.prototype.toArray = function () {
	var result = [];
	this.forEach(function (element) {
		result.push(element);
	});
	return result;
};