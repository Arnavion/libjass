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

///<reference path="./map-references.d.ts" />

/**
 * Map implementation for browsers that don't support it. Only supports keys which are of Number or String type, or which have a property called "id".
 *
 * Keys and values are stored as properties of an object, with property names derived from the key type.
 *
 * @param {!Array.<!Array.<*>>=} iterable Only an array of elements (where each element is a 2-tuple of key and value) is supported.
 */
class SimpleMap<K, V> implements Map<K, V> {
	private _keys: { [key: string]: K };
	private _values: { [key: string]: V };
	private _size: number;

	constructor(iterable?: Iterable<[K, V]>) {
		this.clear();

		if (Array.isArray(iterable)) {
			(<[K, V][]>iterable).forEach(element => this.set(element[0], element[1]));
		}
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
	 * @param {*} thisArg
	 */
	forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void {
		var keysArray = Object.keys(this._keys);
		for (var i = 0; i < keysArray.length; i++) {
			var property = keysArray[i];
			callbackfn.call(thisArg, this._values[property], this._keys[property], this);
		}
	}

	/**
	 * @return {!Iterator.<!Array.<*>>}
	 */
	entries(): Iterator<[K, V]> {
		throw new Error("This Map implementation doesn't support entries().");
	}

	/**
	 * @return {!Iterator.<K>}
	 */
	keys(): Iterator<K> {
		throw new Error("This Map implementation doesn't support keys().");
	}

	/**
	 * @return {!Iterator.<V>}
	 */
	values(): Iterator<V> {
		throw new Error("This Map implementation doesn't support values().");
	}

	/**
	 * @type {number}
	 */
	get size(): number {
		return this._size;
	}

	/**
	 * Converts the given key into a property name for the internal map.
	 *
	 * @param {K} key
	 * @return {string}
	 */
	private _keyToProperty(key: K): string {
		if (typeof key === "number") {
			return `#${ key }`;
		}

		if (typeof key === "string") {
			return `'${ key }`;
		}

		if ((<any>key).id !== undefined) {
			return `!${ (<any>key).id }`;
		}

		return null;
	}
}

/**
 * Set to browser's implementation of Map if it has one, else set to {@link libjass.SimpleMap}
 *
 * @type {function(new:Map, !Array.<!Array.<*>>=)}
 */
var Map = global.Map;
if (Map === undefined || typeof Map.prototype.forEach !== "function" || new Map([[1, "foo"], [2, "bar"]]).size !== 2) {
	Map = <any>SimpleMap;
}

export = Map;
