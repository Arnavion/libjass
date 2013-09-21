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

var global: any = (0, eval)("this");

module libjass {
	export function removeElement(element: Element): void {
		if (element.parentNode !== null) {
			element.parentNode.removeChild(element);
		}
	}

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
		 * @return {boolean}
		 */
		has(value: T): boolean {
			var key = this._toKey(value);

			if (key === null) {
				return false;
			}

			return key in this._data;
		}

		forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void {
			Object.keys(this._data).map((key: string) => {
				return this._data[key];
			}).forEach((value: T, index: number) => {
				callbackfn.call(thisArg, value, value, this);
			});
		}

		delete(value: T): boolean {
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

	if (typeof Set === "undefined" || typeof Set.prototype.forEach !== "function") {
		global.Set = SimpleSet;
	}
}

var module: any;

if (module && module.exports) {
	module.exports = libjass;
}
