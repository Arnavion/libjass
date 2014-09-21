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

interface Promise<T> {
	/**
	 * @param {function(T):U} fulfilledHandler
	 * @param {?function(*):U} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler: (value: T) => U, rejectedHandler?: (reason: any) => U): Promise<U>;

	/**
	 * @param {function(T):!Promise.<U>} fulfilledHandler
	 * @param {?function(*):!Promise.<U>} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler: (value: T) => Promise<U>, rejectedHandler?: (reason: any) => Promise<U>): Promise<U>;

	/**
	 * @param {function(T):U} fulfilledHandler
	 * @param {?function(*):!Promise.<U>} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler: (value: T) => U, rejectedHandler?: (reason: any) => Promise<U>): Promise<U>;

	/**
	 * @param {function(T):!Promise.<U>} fulfilledHandler
	 * @param {?function(*):U} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler: (value: T) => Promise<U>, rejectedHandler?: (reason: any) => U): Promise<U>;
}

interface Global {
	/**
	 * @type {function(new: Set.<T>)}
	 */
	Set: { new <T>(): Set<T>; prototype: Set<any> }

	/**
	 * @type {function(new: Map.<T>)}
	 */
	Map: { new <K, V>(): Map<K, V>; prototype: Map<any, any> }

	/**
	 * @type {function(new: Promise.<T>}}
	 */
	Promise: { new <T>(resolver: (fulfill: (value: T) => void, reject: (reason: any) => void) => void): Promise<T> }
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
				return "#" + value;
			}

			if (typeof value === "string") {
				return "'" + value;
			}

			return null;
		}
	}

	/**
	 * Set to browser's implementation of Set if it has one, else set to {@link libjass.SimpleSet}
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
	 * Set to browser's implementation of Map if it has one, else set to {@link libjass.SimpleMap}
	 *
	 * @type {function(new:Map)}
	 */
	export var Map = global.Map;
	if (Map === undefined || typeof Map.prototype.forEach !== "function") {
		Map = <any>SimpleMap;
	}

	/**
	 * Promise implementation for browsers that don't support it.
	 *
	 * @param {function(function(T), function(*))} resolver
	 *
	 * @template T
	 */
	class SimplePromise<T> implements Promise<T> {
		private _state: SimplePromiseState = SimplePromiseState.PENDING;

		private _thens: { emitFulfill: (value: T) => void; emitReject: (reason: any) => void }[] = [];

		private _alreadyFulfilledValue: T = null;
		private _alreadyRejectedReason: any = null;

		constructor(private _resolver: (resolve: (value: T) => void, reject: (reason: any) => void) => void) {
			try {
				this._resolver(value => {
					if (this._state !== SimplePromiseState.PENDING) {
						return;
					}

					this._state = SimplePromiseState.FULFILLED;

					this._alreadyFulfilledValue = value;

					setTimeout(() => this._emitFulfill(), 0);
				}, reason => {
					if (this._state !== SimplePromiseState.PENDING) {
						return;
					}

					this._state = SimplePromiseState.REJECTED;

					this._alreadyRejectedReason = reason;

					setTimeout(() => this._emitReject(), 0);
				});
			}
			catch (ex) {
				this._state = SimplePromiseState.REJECTED;

				if (this._state !== SimplePromiseState.PENDING) {
					return;
				}

				this._alreadyRejectedReason = ex;

				setTimeout(() => this._emitReject(), 0);
			}
		}

		/**
		 * @param {function(T):U} fulfilledHandler
		 * @param {function(*):U} rejectedHandler
		 * @return {!Promise.<U>}
		 *
		 * @template U
		 */
		then<U>(fulfilledHandler: (value: T) => U, rejectedHandler: (reason: any) => U): Promise<U> {
			fulfilledHandler = (typeof fulfilledHandler === "function") ? fulfilledHandler : null;
			rejectedHandler = (typeof fulfilledHandler === "function") ? rejectedHandler : null;

			if (fulfilledHandler === null && rejectedHandler === null) {
				return <any>this;
			}

			if (!fulfilledHandler) {
				fulfilledHandler = <any>((value: T) => value);
			}

			if (!rejectedHandler) {
				rejectedHandler = <any>((reason: any) => { throw reason; });
			}

			return new SimplePromise<U>((resolve, reject) => {
				this._thens.push({
					emitFulfill: value => {
						try {
							var fulfilledHandlerResult = fulfilledHandler(value);
						}
						catch (ex) {
							reject(ex);
							return;
						}

						if (SimplePromise._isPromise(fulfilledHandlerResult)) {
							var onFulfillResultPromise = <Promise<U>><any>(fulfilledHandlerResult);
							onFulfillResultPromise.then(resolve, reject);
						}
						else {
							resolve(fulfilledHandlerResult);
						}
					}, emitReject: reason => {
						try {
							var rejectedHandlerResult = rejectedHandler(reason);
						}
						catch (ex) {
							reject(ex);
							return;
						}

						if (SimplePromise._isPromise(rejectedHandlerResult)) {
							var onRejectResultPromise = <Promise<U>><any>(rejectedHandlerResult);
							onRejectResultPromise.then(resolve, reject);
						}
						else {
							resolve(rejectedHandlerResult);
						}
					}
				});

				if (this._state === SimplePromiseState.FULFILLED) {
					setTimeout(() => this._emitFulfill(), 0);
				}
				else if (this._state === SimplePromiseState.REJECTED) {
					setTimeout(() => this._emitReject(), 0);
				}
			});
		}

		/**
		 * @return {boolean}
		 */
		isFulfilled(): boolean {
			return (this._state !== SimplePromiseState.FULFILLED);
		}

		/**
		 * @return {boolean}
		 */
		isRejected(): boolean {
			return (this._state !== SimplePromiseState.REJECTED);
		}

		/**
		 * @return {boolean}
		 */
		isPending(): boolean {
			return (this._state !== SimplePromiseState.PENDING);
		}

		/**
		 * @return {T}
		 */
		value(): T {
			if (this._state !== SimplePromiseState.FULFILLED) {
				throw new Error("This promise is not in FULFILLED state.");
			}

			return this._alreadyFulfilledValue;
		}

		/**
		 * @return {*}
		 */
		reason(): any {
			if (this._state !== SimplePromiseState.REJECTED) {
				throw new Error("This promise is not in FULFILLED state.");
			}

			return this._alreadyRejectedReason;
		}

		/**
		 * @param {!*} obj
		 * @return {boolean}
		 */
		private static _isPromise(obj: any): boolean {
			return obj && (typeof obj.then === "function");
		}

		private _emitFulfill(): void {
			while (this._thens.length > 0) {
				var nextThen = this._thens.shift();
				nextThen.emitFulfill(this._alreadyFulfilledValue);
			}
		}

		private _emitReject(): void {
			while (this._thens.length > 0) {
				var nextThen = this._thens.shift();
				nextThen.emitReject(this._alreadyRejectedReason);
			}
		}
	}

	/**
	 * The state of the {@link libjass.SimplePromise}
	 */
	enum SimplePromiseState {
		PENDING = 0,
		FULFILLED = 1,
		REJECTED = 2,
	}

	/**
	 * Set to browser's implementation of Promise if it has one, else set to {@link libjass.SimplePromise}
	 *
	 * @type {function(new:Promise)}
	 */
	export var Promise = global.Promise;
	if (Promise === undefined) {
		Promise = <any>SimplePromise;
	}

	/**
	 * Adds properties of the given mixins' prototypes to the given class's prototype.
	 *
	 * @param {!*} clazz
	 * @param {!Array.<*>} mixins
	 */
	export function mixin(clazz: any, mixins: any[]): void {
		mixins.forEach((mixin: any) => {
			Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
				clazz.prototype[name] = mixin.prototype[name];
			});
		});
	}

	/**
	 * Debug mode. When true, libjass logs some debug messages.
	 *
	 * @type {boolean}
	 */
	export var debugMode: boolean = false;

	/**
	 * Verbose debug mode. When true, libjass logs some more debug messages. This setting is independent of {@link libjass.debugMode}
	 *
	 * @type {boolean}
	 */
	export var verboseMode: boolean = false;
}
