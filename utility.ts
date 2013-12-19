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
	webkitAnimation: string
	webkitAnimationDelay: string
	webkitFilter: string
	webkitTransform: string
	webkitTransformOrigin: string
}

interface Document {
	fullscreenElement: Element
	mozFullScreenElement: Element
	webkitFullscreenElement: Element
}

var global: any = (0, eval)("this");

module libjass {
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
		private _data: Object;

		constructor() {
			this.clear();
		}

		/**
		 * @param {T} value
		 * @return {libjass.Set.<T>} This set
		 */
		add(value: T): Set<T> {
			var property = this._toProperty(value);

			if (property === null) {
				throw new Error("This Set implementation only supports Number and String values.");
			}

			this._data[property] = value;

			return this;
		}

		clear(): void {
			this._data = Object.create(null);
		}

		/**
		 * @param {T} value
		 * @return {boolean}
		 */
		has(value: T): boolean {
			var property = this._toProperty(value);

			if (property === null) {
				return false;
			}

			return property in this._data;
		}

		/**
		 * @param {function(T, T, libjass.Set.<T>)} callbackfn A function that is called with each value in the set.
		 */
		forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void {
			Object.keys(this._data).map((property: string) => {
				var value = this._data[property];
				callbackfn.call(thisArg, value, value, this);
			});
		}

		delete(value: T): boolean {
			throw new Error("This Set implementation doesn't support delete().");
		}

		get size(): number {
			throw new Error("This Set implementation doesn't support size.");
		}

		private _toProperty(value: T): string {
			if (typeof value == "number") {
				return "#" + value;
			}
			else if (typeof value == "string") {
				return "'" + value;
			}

			return null;
		}
	}

	export var Set: {
		new <T>(): Set<T>;
	}

	// Use this browser's implementation of Set if it has one
	if (typeof global.Set !== "undefined" && typeof global.Set.prototype.forEach === "function") {
		Set = global.Set;
	}
	else {
		Set = SimpleSet;
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
		private _keys: { [key: string]: K };
		private _values: { [key: string]: V };

		constructor() {
			this.clear();
		}

		/**
		 * @param {K} key
		 * @return {V}
		 */
		get(key: K): V {
			var property = this._keyToProperty(key);

			if (property === null) {
				return undefined;
			}

			return this._values[property];
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

			return property in this._keys;
		}

		/**
		 * @param {K} key
		 * @param {V} value
		 * @return {libjass.Map.<K, V>} This map
		 */
		set(key: K, value: V): Map<K, V> {
			var property = this._keyToProperty(key);

			if (property === null) {
				throw new Error("This Map implementation only supports Number and String keys.");
			}

			this._keys[property] = key;
			this._values[property] = value;

			return this;
		}

		/**
		 * @param {K} key
		 * @return {boolean} true if the key was present before being deleted, false otherwise
		 */
		delete(key: K): boolean {
			var property = this._keyToProperty(key);

			if (property === null) {
				return false;
			}

			var result = property in this._keys;

			if (result) {
				delete this._keys[property];
				delete this._values[property];
			}

			return result;
		}

		clear(): void {
			this._keys = Object.create(null);
			this._values = Object.create(null);
		}

		/**
		 * @param {function(V, K, libjass.Map.<K, V>)} callbackfn A function that is called with each key and value in the map.
		 */
		forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void {
			var keysArray = Object.keys(this._keys);
			for (var i = 0; i < keysArray.length; i++) {
				var property = keysArray[i];
				callbackfn.call(thisArg, this._values[property], this._keys[property], this);
			}
		}

		get size(): number {
			throw new Error("This Map implementation doesn't support size.");
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
	}

	export var Map: {
		new <K, V>(): Map<K, V>;
	}

	// Use this browser's implementation of Map if it has one
	if (typeof global.Map !== "undefined" && typeof global.Map.prototype.forEach === "function") {
		Map = global.Map;
	}
	else {
		Map = <any>SimpleMap;
	}
}

var module: any;

if (module && module.exports) {
	module.exports = libjass;
}
