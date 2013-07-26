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
	/**
	 * @return {string}
	 * @suppress {duplicate} Closure compiler thinks this is redefining its own exposed API despite the check for undefined above
	 */
	String.prototype.trimLeft = function () {
		return this.match(/^\s*(.*)$/)[1];
	};
}

/**
 * @param {string} str
 * @return {boolean} true if this string starts with str
 */
String.prototype.startsWith = function (str) {
	return this.indexOf(str) === 0;
};

/**
 * @param {string} str
 * @return {boolean} true if this string ends with str
 */
String.prototype.endsWith = function (str) {
	return this.indexOf(str) === this.length - str.length;
};

/**
 * An alternative to window.parseInt that defaults to parsing input in base 10 if the second parameter is undefined.
 *
 * @param {string} str
 * @param {number=} opt_base
 * @return {number}
 */
window["parseInteger"] = function (str, opt_base) {
	// If str starts with 0x, then it is to be parsed as base 16 even if the second parameter is not given.
	// PEGjs requires this.
	if (opt_base === undefined) {
		if (str.startsWith("0x")) {
			opt_base = 16;
		}
		else {
			opt_base = 10;
		}
	}
	return parseInt(str, opt_base);
};

/* Set and Set.iterator implementation for browsers that don't support them. Only supports String elements.
 * Elements are stored as properties of an object, prefixed with the ">" character to avoid collisions with pre-defined
 * properties.
 */
if (!window["Set"] || !window["Set"].prototype.iterator) {
	/**
	 * @constructor
	 */
	window["Set"] = function () {
		var data = {};

		/**
		 * @param {string} element
		 */
		this.add = function (element) {
			data[">" + element] = true;
		};

		/**
		 * @param {string} element
		 * @return boolean
		 */
		this.has = function (element) {
			return data.hasOwnProperty(">" + element);
		};

		/**
		 * @return {{next: function(): Object}}
		 */
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
