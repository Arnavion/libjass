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

///<reference path="libjass.ts" />

"use strict";

interface CSSStyleDeclaration {
	webkitAnimationDelay: string
	webkitAnimationDuration: string
	webkitAnimationName: string
	webkitTransform: string
	webkitTransformOrigin: string
	webkitPerspective: string
}

interface Document {
	fullscreenElement: Element
	mozFullScreenElement: Element
	webkitFullscreenElement: Element
}

interface HTMLDivElement {
	remove(): void
}

interface Iterator {
	next(): any
	forEach(func: (element: any) => void): void
	toArray(): Array
}

interface String {
	startsWith(str: string): boolean
}

interface Window {
	Iterator(collection: any, keysOnly?: boolean): Iterator
	StopIteration: any
	Set: {
		new (): Set<any>
	}
}

declare function Iterator(collection: any, keysOnly?: boolean): Iterator
declare var StopIteration: any

/**
 * @param {string} str
 * @return {boolean} true if this string starts with str
 */
String.prototype.startsWith = function (str: string): boolean {
	return (<string>this).indexOf(str) === 0;
};

if (parseInt("010") !== 10) {
	// This browser doesn't parse strings with leading 0's as decimal. Replace its parseInt with an implementation that does.

	var oldParseInt = parseInt;

	/**
	 * An alternative parseInt that defaults to parsing input in base 10 if the second parameter is undefined.
	 *
	 * @param {string} s
	 * @param {number=} radix
	 * @return {number}
	 */
	(<any>window).parseInt = (s: string, radix?: number): number => {
		// If str starts with 0x, then it is to be parsed as base 16 even if the second parameter is not given.
		if (radix === undefined) {
			if (s.startsWith("0x")) {
				radix = 16;
			}
			else {
				radix = 10;
			}
		}
		return oldParseInt(s, radix);
	}
}

HTMLDivElement.prototype.remove = function (): void {
	if (this.parentElement !== null) {
		this.parentElement.removeChild(this);
	}
};

module libjass {
	/**
	 * Set implementation for browsers that don't support it. Only supports Number and String elements.
	 *
	 * Elements are stored as properties of an object, with names derived from their type.
	 */
	class SimpleSet<T> implements Set<T> {
		private _data: Object = Object.create(null);

		/**
		 * @constructor
		 */
		constructor() { }

		/**
		 * @param {T} value
		 */
		add(value: T): Set<T> {
			var key = this._toKey(value);

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
			var key = this._toKey(value);

			if (key === null) {
				return false;
			}

			return key in this._data;
		}

		forEach(callbackfn: (value: string, index: string, set: Set<string>) => void, thisArg?: any): void {
			if (typeof thisArg === "undefined") {
				thisArg = window;
			}

			Object.keys(this._data).map((key: string) => {
				return this._data[key];
			}).forEach((value: Object, index: number) => {
				callbackfn.call(thisArg, value, value, this);
			});
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

		private _toKey(value: T): string {
			if (typeof value == "number") {
				return "#" + value;
			}
			else if (typeof value == "string") {
				return "'" + value;
			}

			return null;
		}
	}

	if (!window.Set || !window.Set.prototype.forEach) {
		window.Set = SimpleSet;
	}
}
