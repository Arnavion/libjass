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
	/**
	 * Removes a DOM element from its parent node.
	 *
	 * @param {Element} element The element to remove
	 *
	 * @memberof libjass
	 */
	export function removeElement(element: Element): void {
		if (element !== null && element.parentNode !== null) {
			element.parentNode.removeChild(element);
		}
	}

	/**
	 * Set implementation for browsers that don't support it. Only supports Number and String elements.
	 *
	 * Elements are stored as properties of an object, with names derived from their type.
	 *
	 * @constructor
	 * @template T
	 *
	 * @private
	 * @memberof libjass
	 */
	class SimpleSet<T> implements Set<T> {
		private _data: Object = Object.create(null);

		constructor() { }

		/**
		 * @param {T} value
		 * @return {Set.<T>} This set
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

		/**
		 * @param {function(T, T, Set<T>)} callbackfn A function that is called with each value in the set.
		 */
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

	/**
	 * Map implementation for browsers that don't support it. Only supports Number and String keys.
	 *
	 * Keys and values are stored as properties of an object, with property names derived from the key type.
	 *
	 * @constructor
	 * @template K, V
	 *
	 * @private
	 * @memberof libjass
	 */
	class SimpleMap<K, V> implements Map<K, V> {
		private _data: Object = Object.create(null);

		constructor() { }

		/**
		 * @param {K} key
		 * @return {V}
		 */
		get(key: K): V {
			var property = this._keyToProperty(key);

			if (property === null) {
				return undefined;
			}

			return this._data[property];
		}

		/**
		 * @param {K} key
		 * @return {boolean}
		 */
		has(key: K): boolean {
			var property = this._keyToProperty(key);

			if (property === null) {
				return false;
			}

			return property in this._data;
		}

		/**
		 * @param {K} key
		 * @param {V} value
		 * @return {Map.<K, V>} This map
		 */
		set(key: K, value: V): Map<K, V> {
			var property = this._keyToProperty(key);

			if (property === null) {
				throw new Error("This Set implementation only supports string and number values.");
			}

			this._data[property] = value;

			return this;
		}

		/**
		 * @param {function(V, K, Map<K, V>)} callbackfn A function that is called with each key and value in the map.
		 */
		forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void {
			Object.keys(this._data).forEach((property: string, index: number): void => {
				callbackfn.call(thisArg, this._data[property], this._propertyToKey(property), this);
			});
		}

		delete(key: K): boolean {
			throw new Error("This Set implementation doesn't support delete().");
		}

		clear(): void {
			throw new Error("This Set implementation doesn't support clear().");
		}

		get size(): number {
			throw new Error("This Set implementation doesn't support size.");
		}

		private _keyToProperty(key: K): string {
			if (typeof key == "number") {
				return "#" + key;
			}
			else if (typeof key == "string") {
				return "'" + key;
			}

			return null;
		}

		private _propertyToKey(property: string): Object {
			if (property[0] === "#") {
				return parseInt(property);
			}
			else if (property[0] === "'") {
				return property.substr(1);
			}

			return null;
		}
	}

	if (typeof Map === "undefined" || typeof Map.prototype.forEach !== "function") {
		global.Map = SimpleMap;
	}
}

var module: any;

if (module && module.exports) {
	module.exports = libjass;
}
