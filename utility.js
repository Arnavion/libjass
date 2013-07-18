/**
 * libjass
 *
 * https://github.com/Arnavion/libjass
 *
 * Copyright 2013 Arnav Singh
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
			return Iterator(Object.keys(data).toIterable().map(function (entry) {
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

HTMLDivElement.prototype.remove = function () {
	if (this.parentElement !== null) {
		this.parentElement.removeChild(this);
	}
};
