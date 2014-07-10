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

interface Global {
	Set: { new <T>(): Set<T>; prototype: Set<any> }
	Map: { new <K, V>(): Map<K, V>; prototype: Map<any, any> }
}

declare var global: Global; // Defined as a parameter of the anonymous function wrapper

module libjass {
	/**
	 * Set implementation for browsers that don't support it. Only supports Number and String elements.
	 *
	 * Elements are stored as properties of an object, with names derived from their type.
	 *
	 * @template T
	 */
	class SimpleSet<T> implements Set<T> {
		private _elements: { [key: string]: T };
		private _size: number;

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

			if (!(property in this._elements)) {
				this._size++;
			}

			this._elements[property] = value;

			return this;
		}

		/**
		 */
		clear(): void {
			this._elements = Object.create(null);
			this._size = 0;
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

			return property in this._elements;
		}

		/**
		 * @param {function(T, T, libjass.Set.<T>)} callbackfn A function that is called with each value in the set.
		 */
		forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void {
			Object.keys(this._elements).map((property: string) => {
				var element = this._elements[property];
				callbackfn.call(thisArg, element, element, this);
			});
		}

		delete(value: T): boolean {
			throw new Error("This Set implementation doesn't support delete().");
		}

		/**
		 * @type {number}
		 */
		get size(): number {
			return this._size;
		}

		private _toProperty(value: T): string {
			if (typeof value === "number") {
				return "#" + value;
			}

			if (typeof value === "string") {
				return "'" + value;
			}

			return null;
		}
	}

	/**
	 * Set to browser's implementation of Set if it has one, else set to libjass.SimpleSet
	 *
	 * @type {function(new:Set)}
	 */
	export var Set = global.Set;
	if (Set === undefined || typeof Set.prototype.forEach !== "function") {
		Set = <any>SimpleSet;
	}

	/**
	 * Map implementation for browsers that don't support it. Only supports keys which are of Number or String type, or which have a property called "id".
	 *
	 * Keys and values are stored as properties of an object, with property names derived from the key type.
	 *
	 * @template K, V
	 */
	class SimpleMap<K, V> implements Map<K, V> {
		private _keys: { [key: string]: K };
		private _values: { [key: string]: V };
		private _size: number;

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
				throw new Error("This Map implementation only supports Number and String keys, or keys with an id property.");
			}

			if (!(property in this._keys)) {
				this._size++;
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
				this._size--;
			}

			return result;
		}

		/**
		 */
		clear(): void {
			this._keys = Object.create(null);
			this._values = Object.create(null);
			this._size = 0;
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

		/**
		 * @type {number}
		 */
		get size(): number {
			return this._size;
		}

		private _keyToProperty(key: K): string {
			if (typeof key === "number") {
				return "#" + key;
			}

			if (typeof key === "string") {
				return "'" + key;
			}

			if ((<any>key).id !== undefined) {
				return "!" + (<any>key).id;
			}

			return null;
		}
	}

	/**
	 * Set to browser's implementation of Map if it has one, else set to libjass.SimpleMap
	 *
	 * @type {function(new:Map)}
	 */
	export var Map = global.Map;
	if (Map === undefined || typeof Map.prototype.forEach !== "function") {
		Map = <any>SimpleMap;
	}

	export function mixin(derived: any, mixins: any[]) {
		mixins.forEach((mixin: any) => {
			Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
				derived.prototype[name] = mixin.prototype[name];
			});
		});
	}
}
