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

///<reference path="iterators.ts" />

"use strict";

interface Window {
	Iterator(collection: any, keysOnly?: boolean): Iterator
	StopIteration: any
	Set: {
		new(): Set
	}
	parseInteger(s: string, radix?: number): number
}

declare function Iterator(collection: any, keysOnly?: boolean): Iterator
declare var StopIteration: any
declare function parseInteger(s: string, radix?: number): number

interface Iterator {
	next(): any
	forEach(func: (element: any) => void): void
	toArray(): Array
}

interface Set<T> {
	iterator(): Iterator
}

interface CSSStyleDeclaration {
	webkitAnimationDelay: string
	webkitAnimationDuration: string
	webkitAnimationName: string
	webkitTransform: string
	webkitTransformOrigin: string
	webkitPerspective: string
}


interface String {
	trimLeft(): string
	startsWith(str: string): boolean
	endsWith(str: string): boolean
}

interface HTMLDivElement {
	remove(): void
}

interface DialogueParser {
	parse(input: string, startRule?: string): Object
}

// String.trimLeft for browsers which don't support it
if (typeof String.prototype.trimLeft !== "function") {
	/**
	 * @return {string}
	 */
	String.prototype.trimLeft = function (): string {
		return (<string>this).match(/^\s*(.*)$/)[1];
	};
}

/**
 * @param {string} str
 * @return {boolean} true if this string starts with str
 */
String.prototype.startsWith = function (str: string): boolean {
	return (<string>this).indexOf(str) === 0;
};

/**
 * @param {string} str
 * @return {boolean} true if this string ends with str
 */
String.prototype.endsWith = function (str: string) {
	var self: string = this;
	var index = self.indexOf(str);
	return index !== -1 && index === self.length - str.length;
};

/**
 * An alternative to window.parseInt that defaults to parsing input in base 10 if the second parameter is undefined.
 *
 * @param {string} s
 * @param {number=} radix
 * @return {number}
 */
window.parseInteger = (s: string, radix?: number) => {
	// If str starts with 0x, then it is to be parsed as base 16 even if the second parameter is not given.
	if (radix === undefined) {
		if (s.startsWith("0x")) {
			radix = 16;
		}
		else {
			radix = 10;
		}
	}
	return parseInt(s, radix);
};

module libjass {
	/**
	 * Set and Set.iterator implementation for browsers that don't support them. Only supports Number and String elements.
	 * Elements are stored as properties of an object, with derived names that won't clash with pre-defined properties.
	 */
	class SimpleSet<T> implements Set<T> {
		private _data: Object = {};

		/**
		 * @constructor
		 */
		constructor() { }

		/**
		 * @param {T} value
		 */
		add(value: T): Set<T> {
			var key = this.toKey(value);

			if (key === null) {
				throw new Error("This Set implementation only supports string and number values.");
			}

			this._data[key] = value;

			return this;
		}

		/**
		 * @param {T} value
		 * @return boolean
		 */
		has(value: T): boolean {
			var key = this.toKey(value);

			if (key === null) {
				return false;
			}

			return this._data.hasOwnProperty(key);
		}

		/**
		 * @return {{next: function(): string}}
		 */
		__iterator__(): Iterator {
			return Iterator(
				Object.keys(this._data).toIterable()
					.map((entry: Array): string => String(entry[1]))
					.filter(key => this.isKey(key))
					.map((key: string): string => this._data[key])
				);
		}

		/**
		 * @return {{next: function(): string}}
		 */
		iterator(): Iterator {
			return Iterator(this);
		}

		delete(value: string): boolean {
			throw new Error("This Set implementation doesn't support delete().");
		}

		clear(): void {
			throw new Error("This Set implementation doesn't support clear().");
		}

		get size(): number {
			throw new Error("This Set implementation doesn't support size.");
		}

		forEach(callbackfn: (value: string, index: string, set: Set<string>) => void, thisArg?: any): void {
			throw new Error("This Set implementation doesn't support forEach().");
		}

		private toKey(value: T): string {
			if (typeof value == "number") {
				return "#" + value;
			}
			else if (typeof value == "string") {
				return "'" + value;
			}

			return null;
		}

		private isKey(key: string): boolean {
			return this._data.hasOwnProperty(key) && (key.startsWith("#") || key.startsWith("'"));
		}
	}

	if (!window.Set || (!window.Set.prototype.iterator && !window.Set.prototype.forEach)) {
		window.Set = SimpleSet;
	}
	else if (!window.Set.prototype.iterator && window.Set.prototype.forEach) {
		/**
		 * Set.iterator implementation for browsers that support Set and Set.forEach but not Set.iterator (IE11).
		 */
		window.Set.prototype.iterator = function (): Iterator {
			var self = <Set>this;
			var elements: any[] = [];
			self.forEach((value: any) => {
				elements.push(value);
			});
			return Iterator(elements.toIterable().map((entry: Array) => entry[1]));
		};
	}
}

HTMLDivElement.prototype.remove = function (): void {
	if (this.parentElement !== null) {
		this.parentElement.removeChild(this);
	}
};
