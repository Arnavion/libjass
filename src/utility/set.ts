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

///<reference path="./set-references.d.ts" />

/**
 * Set implementation for browsers that don't support it. Only supports Number and String elements.
 *
 * Elements are stored as properties of an object, with names derived from their type.
 *
 * @param {!Array.<T>=} iterable Only an array of values is supported.
 */
class SimpleSet<T> implements Set<T> {
	private _elements: { [key: string]: T };
	private _size: number;

	constructor(iterable?: Iterable<T>) {
		this.clear();

		if (Array.isArray(iterable)) {
			(<T[]>iterable).forEach(value => this.add(value));
		}
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
	 * @param {*} thisArg
	 */
	forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void {
		Object.keys(this._elements).map((property: string) => {
			var element = this._elements[property];
			callbackfn.call(thisArg, element, element, this);
		});
	}

	/**
	 * Not implemented.
	 *
	 * @param {T} value
	 * @return {boolean}
	 */
	delete(value: T): boolean {
		throw new Error("This Set implementation doesn't support delete().");
	}

	/**
	 * @return {!Iterator.<!Array.<T>>}
	 */
	entries(): Iterator<[T, T]> {
		throw new Error("This Set implementation doesn't support entries().");
	}

	/**
	 * @return {!Iterator.<T>}
	 */
	keys(): Iterator<T> {
		throw new Error("This Set implementation doesn't support keys().");
	}

	/**
	 * @return {!Iterator.<T>}
	 */
	values(): Iterator<T> {
		throw new Error("This Set implementation doesn't support values().");
	}

	/**
	 * @type {number}
	 */
	get size(): number {
		return this._size;
	}

	/**
	 * Converts the given value into a property name for the internal map.
	 *
	 * @param {T} value
	 * @return {string}
	 */
	private _toProperty(value: T): string {
		if (typeof value === "number") {
			return `#${ value }`;
		}

		if (typeof value === "string") {
			return `'${ value }`;
		}

		return null;
	}
}

/**
 * Set to browser's implementation of Set if it has one, else set to {@link libjass.SimpleSet}
 *
 * @type {function(new:Set, !Array.<T>=)}
 */
var Set = global.Set;
if (Set === undefined || typeof Set.prototype.forEach !== "function" || new Set([1, 2]).size !== 2) {
	Set = <any>SimpleSet;
}

export = Set;
