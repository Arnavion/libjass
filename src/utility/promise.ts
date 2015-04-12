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
 * Promise implementation for browsers that don't support it.
 *
 * @param {function(function(T), function(*))} resolver
 */
class SimplePromise<T> {
	private _state: SimplePromiseState = SimplePromiseState.PENDING;

	private _thens: { propagateFulfilling: (value: T) => void; propagateRejection: (reason: any) => void }[] = [];
	private _propagateIsPending: boolean = false;

	private _alreadyFulfilledValue: T = null;
	private _alreadyRejectedReason: any = null;

	constructor(private _resolver: (resolve: (value: T | Promise<T>) => void, reject: (reason: any) => void) => void) {
		try {
			_resolver(value => this._resolve(value), reason => this._reject(reason));
		}
		catch (ex) {
			this._reject(ex);
		}
	}

	/**
	 * @param {?function(T):(U|Promise.<U>)} fulfilledHandler
	 * @param {?function(*):(U|Promise.<U>)} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler?: (value: T) => U | Promise<U>, rejectedHandler?: (reason: any) => U | Promise<U>): Promise<U> {
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

		var result = new Promise<U>((resolve, reject) => {
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

		this._propagateResolution();

		return result;
	}

	/**
	 * @param {function(*):(T|Promise.<T>)} rejectedHandler
	 * @return {!Promise.<T>}
	 */
	catch(rejectedHandler?: (reason: any) => T | Promise<T>): Promise<T> {
		return this.then(null, rejectedHandler);
	}

	/**
	 * @return {boolean}
	 */
	isFulfilled(): boolean {
		return this._state === SimplePromiseState.FULFILLED;
	}

	/**
	 * @return {boolean}
	 */
	isRejected(): boolean {
		return this._state === SimplePromiseState.REJECTED;
	}

	/**
	 * @return {boolean}
	 */
	isPending(): boolean {
		return this._state === SimplePromiseState.PENDING;
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
	 * @param {T|!Promise.<T>} value
	 * @return {!Promise.<T>}
	 */
	static resolve<T>(value: T | Promise<T>): Promise<T> {
		if (value instanceof SimplePromise) {
			return value;
		}

		return new Promise<T>(resolve => resolve(value));
	}

	/**
	 * @param {!Array.<T|!Promise.<T>>} values
	 * @return {!Promise.<!Array.<T>>}
	 */
	static all<T>(values: (T | Promise<T>)[]): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			var result: T[] = [];

			var numUnresolved = values.length;
			if (numUnresolved === 0) {
				resolve(result);
				return;
			}

			values.forEach((value, index) => Promise.resolve(value).then(value => {
				result[index] = value;
				numUnresolved--;

				if (numUnresolved === 0) {
					resolve(result);
				}
			}), reject);
		});
	}

	/**
	 * @param {T|!Promise.<T>} value
	 */
	private _resolve(value: T | Promise<T>): void {
		var alreadyCalled = false;

		try {
			if (value === this) {
				throw new TypeError("2.3.1");
			}

			var thenMethod = SimplePromise._getThenMethod<T>(value);
			if (thenMethod === null) {
				this._fulfill(<T>value);
				return;
			}

			thenMethod.call(
				<Promise<T>>value,
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

		this._propagateResolution();
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

		this._propagateResolution();
	}

	/**
	 * @param {!*} obj
	 * @return {?function(function(T):(T|!Promise.<T>), function(*):(T|!Promise.<T>)):!Promise.<T>}
	 */
	private static _getThenMethod<T>(obj: any): (fulfilledHandler: (value: T) => T | Promise<T>, rejectedHandler: (reason: any) => T | Promise<T>) => Promise<T> {
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
		if (this._state === SimplePromiseState.PENDING) {
			return;
		}

		if (this._propagateIsPending) {
			return;
		}
		this._propagateIsPending = true;

		SimplePromise._nextTick(() => {
			this._propagateIsPending = false;

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
		});
	}

	// Based on https://github.com/petkaantonov/bluebird/blob/1b1467b95442c12378d0ea280ede61d640ab5510/src/schedule.js
	private static _nextTick: (callback: () => void) => void = (function () {
		var MutationObserver = global.MutationObserver || global.WebkitMutationObserver;
		if (global.process !== undefined && typeof global.process.nextTick === "function") {
			return (callback: () => void) => {
				global.process.nextTick(callback);
			};
		}
		else if (MutationObserver !== undefined) {
			var pending: (() => void)[] = [];
			var currentlyPending = false;

			var div = document.createElement("div");

			var observer = new MutationObserver(() => {
				var processing = pending;
				pending = [];

				for (let callback of processing) {
					callback();
				}

				currentlyPending = false;

				if (pending.length > 0) {
					div.classList.toggle("foo");
					currentlyPending = true;
				}
			});

			observer.observe(div, { attributes: true });

			return (callback: () => void) => {
				pending.push(callback);

				if (!currentlyPending) {
					div.classList.toggle("foo");
					currentlyPending = true;
				}
			};
		}
		else {
			return (callback: () => void) => setTimeout(callback, 0);
		}
	})();
}

/**
 * The state of the {@link ./utility/promise.SimplePromise}
 */
enum SimplePromiseState {
	PENDING = 0,
	FULFILLED = 1,
	REJECTED = 2,
}

declare var global: {
	Promise?: typeof SimplePromise;
	MutationObserver?: typeof MutationObserver;
	WebkitMutationObserver?: typeof MutationObserver;
	process?: {
		nextTick(callback: () => void): void;
	}
};

export interface Promise<T> {
	/**
	 * @param {?function(T):(U|Promise.<U>)} fulfilledHandler
	 * @param {?function(*):(U|Promise.<U>)} rejectedHandler
	 * @return {!Promise.<U>}
	 */
	then<U>(fulfilledHandler?: (value: T) => U | Promise<U>, rejectedHandler?: (reason: any) => U | Promise<U>): Promise<U>;

	/**
	 * @param {function(*):(T|Promise.<T>)} rejectedHandler
	 * @return {!Promise.<T>}
	 */
	catch(rejectedHandler?: (reason: any) => T | Promise<T>): Promise<T>
}

/**
 * Set to the global implementation of Promise if the environment has one, else set to {@link ./utility/promise.SimplePromise}
 *
 * Set it to null to force {@link ./utility/promise.SimplePromise} to be used even if a global Promise is present.
 *
 * @type {function(new:Promise)}
 */
export var Promise: {
	new <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
	prototype: Promise<any>;
	resolve<T>(value: T | Promise<T>): Promise<T>;
	all<T>(values: (T | Promise<T>)[]): Promise<T[]>;
} = global.Promise;

if (Promise === undefined) {
	Promise = SimplePromise;
}

/**
 * Sets the Promise implementation used by libjass to the provided one. If null, {@link ./utility/promise.SimplePromise} is used.
 *
 * @param {?function(new:Promise)} value
 */
export function setImplementation(value: typeof Promise): void {
	if (value !== null) {
		Promise = value;
	}
	else {
		Promise = SimplePromise;
	}
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
