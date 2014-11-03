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
	 * @type {function(new:Set.<T>)}
	 */
	Set: {
		new <T>(): Set<T>; prototype: Set<any>
	};

	/**
	 * @type {function(new:Map.<K, V>)}
	 */
	Map: {
		new <K, V>(): Map<K, V>; prototype: Map<any, any>
	};

	/**
	 * @type {function(new:Promise.<T>, function(T), function(*)), resolve: function(T):!Promise.<T>}}
	 */
	Promise: {
		new <T>(resolver: (fulfill: (value: T) => void, reject: (reason: any) => void) => void): Promise<T>;

		resolve<T>(value: T): Promise<T>;
	};
}

declare var global: Global; // Defined as a parameter of the anonymous function wrapper

module libjass {
	/**
	 * Set implementation for browsers that don't support it. Only supports Number and String elements.
	 *
	 * Elements are stored as properties of an object, with names derived from their type.
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
	 */
	class SimplePromise<T> implements Promise<T> {
		private _state: SimplePromiseState = SimplePromiseState.PENDING;

		private _thens: { propagateFulfilling: (value: T) => void; propagateRejection: (reason: any) => void }[] = [];
		private _pendingPropagateTimeout: number = null;

		private _alreadyFulfilledValue: T = null;
		private _alreadyRejectedReason: any = null;

		constructor(private _resolver: (resolve: (value: T) => void, reject: (reason: any) => void) => void) {
			try {
				_resolver(value => this._resolve(value), reason => this._reject(reason));
			}
			catch (ex) {
				this._reject(ex);
			}
		}

		/**
		 * @param {function(T):(U|Promise.<U>)} fulfilledHandler
		 * @param {?function(*):(U|Promise.<U>)} rejectedHandler
		 * @return {!Promise.<U>}
		 */
		then<U>(fulfilledHandler: (value: T) => U, rejectedHandler: (reason: any) => U): Promise<U> {
			fulfilledHandler = (typeof fulfilledHandler === "function") ? fulfilledHandler : null;
			rejectedHandler = (typeof rejectedHandler === "function") ? rejectedHandler : null;

			if (fulfilledHandler === null && rejectedHandler === null) {
				return <any>this;
			}

			if (fulfilledHandler === null) {
				fulfilledHandler = value => <U><any>value;
			}

			if (rejectedHandler === null) {
				rejectedHandler = (reason): U => { throw reason; };
			}

			var result = new SimplePromise<U>((resolve, reject) => {
				this._thens.push({
					propagateFulfilling: value => {
						try {
							resolve(fulfilledHandler(value));
						}
						catch (ex) {
							reject(ex);
						}
					}, propagateRejection: reason => {
						try {
							resolve(rejectedHandler(reason));
						}
						catch (ex) {
							reject(ex);
						}
					}
				});
			});

			if ((this._state === SimplePromiseState.FULFILLED || this._state === SimplePromiseState.REJECTED) && this._pendingPropagateTimeout === null) {
				this._pendingPropagateTimeout = setTimeout(() => this._propagateResolution(), 0);
			}

			return result;
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
		 * @param {T} value
		 * @return {!Promise.<T>}
		 */
		static resolve<T>(value: T): Promise<T> {
			return new SimplePromise<T>(resolve => resolve(value));
		}

		/**
		 * @param {T} value
		 */
		private _resolve(value: T): void {
			try {
				if (<any>value === this) {
					throw new TypeError("2.3.1");
				}

				var thenMethod = SimplePromise._getThenMethod<T>(value);
				if (thenMethod === null) {
					this._fulfill(value);
					return;
				}

				var alreadyCalled = false;

				thenMethod.call(
					<Promise<T>><any>value,
					(value: T) => {
						if (alreadyCalled) {
							return;
						}
						alreadyCalled = true;

						this._resolve(value);
					},
					(reason: any) => {
						if (alreadyCalled) {
							return;
						}
						alreadyCalled = true;

						this._reject(reason);
					});
			}
			catch (ex) {
				if (alreadyCalled) {
					return;
				}

				this._reject(ex);
			}
		}

		/**
		 * @param {T} value
		 */
		private _fulfill(value: T): void {
			if (this._state !== SimplePromiseState.PENDING) {
				return;
			}

			this._state = SimplePromiseState.FULFILLED;
			this._alreadyFulfilledValue = value;

			if (this._pendingPropagateTimeout === null) {
				this._pendingPropagateTimeout = setTimeout(() => this._propagateResolution(), 0);
			}
		}

		/**
		 * @param {*} reason
		 */
		private _reject(reason: any): void {
			if (this._state !== SimplePromiseState.PENDING) {
				return;
			}

			this._state = SimplePromiseState.REJECTED;
			this._alreadyRejectedReason = reason;

			if (this._pendingPropagateTimeout === null) {
				this._pendingPropagateTimeout = setTimeout(() => this._propagateResolution(), 0);
			}
		}

		/**
		 * @param {!*} obj
		 * @return {?function(function(T):T, function(*):T):!Promise.<T>}
		 */
		private static _getThenMethod<T>(obj: any): (fulfilledHandler: (value: T) => T, rejectedHandler: (reason: any) => T) => Promise<T> {
			if (typeof obj !== "object" && typeof obj !== "function") {
				return null;
			}

			if (obj === null || obj === undefined) {
				return null;
			}

			var then: any = obj.then;
			if (typeof then !== "function") {
				return null;
			}

			return then;
		}

		/**
		 * Propagates the result of the current promise to all its children.
		 */
		private _propagateResolution(): void {
			this._pendingPropagateTimeout = null;

			if (this._state === SimplePromiseState.FULFILLED) {
				while (this._thens.length > 0) {
					var nextThen = this._thens.shift();
					nextThen.propagateFulfilling(this._alreadyFulfilledValue);
				}
			}
			else if (this._state === SimplePromiseState.REJECTED) {
				while (this._thens.length > 0) {
					var nextThen = this._thens.shift();
					nextThen.propagateRejection(this._alreadyRejectedReason);
				}
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
	 * A deferred promise.
	 */
	export class DeferredPromise<T> {
		private _promise: Promise<T>;
		private _resolve: (value: T) => void;
		private _reject: (reason: any) => void;

		constructor() {
			this._promise = new Promise<T>((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});
		}

		/**
		 * @type {!Promise.<T>}
		 */
		get promise(): Promise<T> {
			return this._promise;
		}

		/**
		 * @param {T} value
		 */
		resolve(value: T): void {
			this._resolve(value);
		}

		/**
		 * @param {*} reason
		 */
		reject(reason: any): void {
			this._reject(reason);
		}
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
