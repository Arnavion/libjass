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

/**
 * Map implementation for browsers that don't support it. Only supports keys which are of Number or String type, or which have a property called "id".
 *
 * Keys and values are stored as properties of an object, with property names derived from the key type.
 *
 * @param {!Array.<!Array.<*>>=} iterable Only an array of elements (where each element is a 2-tuple of key and value) is supported.
 */
class SimpleMap<K, V> {
	private _keys: { [key: string]: K };
	private _values: { [key: string]: V };
	private _size: number;

	constructor(iterable?: [K, V][]) {
		this.clear();

		if (iterable === undefined) {
			return;
		}

		if (!Array.isArray(iterable)) {
			throw new Error("Non-array iterables are not supported by the SimpleMap constructor.");
		}

		for (const element of iterable) {
			this.set(element[0], element[1]);
		}
	}

	/**
	 * @param {K} key
	 * @return {V}
	 */
	get(key: K): V {
		const property = this._keyToProperty(key);

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
		const property = this._keyToProperty(key);

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
		const property = this._keyToProperty(key);

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
		const property = this._keyToProperty(key);

		if (property === null) {
			return false;
		}

		const result = property in this._keys;

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
		for (const property of Object.keys(this._keys)) {
			callbackfn.call(thisArg, this._values[property], this._keys[property], this);
		}
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

declare const global: {
	Map?: typeof SimpleMap;
};

export interface Map<K, V> {
	/**
	 * @param {K} key
	 * @return {V}
	 */
	get(key: K): V;

	/**
	 * @param {K} key
	 * @return {boolean}
	 */
	has(key: K): boolean;

	/**
	 * @param {K} key
	 * @param {V} value
	 * @return {libjass.Map.<K, V>} This map
	 */
	set(key: K, value?: V): Map<K, V>;

	/**
	 * @param {K} key
	 * @return {boolean} true if the key was present before being deleted, false otherwise
	 */
	delete(key: K): boolean;

	/**
	 */
	clear(): void;

	/**
	 * @param {function(V, K, libjass.Map.<K, V>)} callbackfn A function that is called with each key and value in the map.
	 * @param {*} thisArg
	 */
	forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;

	/**
	 * @type {number}
	 */
	size: number;
}

/**
 * Set to the global implementation of Map if the environment has one, else set to {@link ./utility/map.SimpleMap}
 *
 * Set it to null to force {@link ./utility/map.SimpleMap} to be used even if a global Map is present.
 *
 * @type {function(new:Map, !Array.<!Array.<*>>=)}
 */
export var Map: {
	new <K, V>(iterable?: [K, V][]): Map<K, V>;
	prototype: Map<any, any>;
} = global.Map;

if (Map === undefined || typeof Map.prototype.forEach !== "function" || (() => {
	try {
		return new Map([[1, "foo"], [2, "bar"]]).size !== 2;
	}
	catch (ex) {
		return true;
	}
})()) {
	Map = SimpleMap;
}

/**
 * Sets the Map implementation used by libjass to the provided one. If null, {@link ./utility/map.SimpleMap} is used.
 *
 * @param {?function(new:Map, !Array.<!Array.<*>>=)} value
 */
export function setImplementation(value: typeof Map): void {
	if (value !== null) {
		Map = value;
	}
	else {
		Map = SimpleMap;
	}
}
