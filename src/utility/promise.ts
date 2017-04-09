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

export interface Thenable<T> {
	/** @type {function(this:!Thenable.<T>, function(T|!Thenable.<T>), function(*))} */
	then: ThenableThen<T>;
}

export interface ThenableThen<T> {
	/** @type {function(this:!Thenable.<T>, function(T|!Thenable.<T>), function(*))} */
	(this: Thenable<T>, resolve: ((resolution: T | Thenable<T>) => void) | undefined, reject: ((reason: any) => void) | undefined): void;
}

export interface Promise<T> extends Thenable<T> {
	/**
	 * @param {function(T):!Thenable.<U>} onFulfilled
	 * @param {?function(*):(U|!Thenable.<U>)} onRejected
	 * @return {!Promise.<U>}
	 */
	then<U>(onFulfilled: (value: T) => Thenable<U> | undefined, onRejected?: (reason: any) => U | Thenable<U>): Promise<U>;

	/**
	 * @param {function(T):U} onFulfilled
	 * @param {?function(*):(U|!Thenable.<U>)} onRejected
	 * @return {!Promise.<U>}
	 */
	then<U>(onFulfilled: (value: T) => U | undefined, onRejected?: (reason: any) => U | Thenable<U>): Promise<U>;

	/**
	 * @param {function(*):(T|!Thenable.<T>)} onRejected
	 * @return {!Promise.<T>}
	 */
	catch(onRejected: (reason: any) => T | Thenable<T>): Promise<T>;
}

// Based on https://github.com/petkaantonov/bluebird/blob/1b1467b95442c12378d0ea280ede61d640ab5510/src/schedule.js
const enqueueJob = (function (): (callback: () => void) => void {
	const MutationObserver = global.MutationObserver || global.WebkitMutationObserver;

	if (global.process !== undefined && typeof global.process.nextTick === "function") {
		const process = global.process;
		return (callback: () => void) => {
			process.nextTick(callback);
		};
	}
	else if (MutationObserver !== undefined) {
		const pending: (() => void)[] = [];
		let currentlyPending = false;

		const div = document.createElement("div");

		const observer = new MutationObserver(() => {
			const processing = pending.splice(0, pending.length);

			for (const callback of processing) {
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

/**
 * Promise implementation for browsers that don't support it.
 *
 * @param {function(function(T|!Thenable.<T>), function(*))} executor
 */
class SimplePromise<T> {
	/**
	 * @param {T|!Thenable.<T>} value
	 * @return {!Promise.<T>}
	 */
	static resolve<T>(value: T | Thenable<T>): Promise<T> {
		if (value instanceof SimplePromise) {
			return value;
		}

		return new Promise<T>(resolve => resolve(value));
	}

	/**
	 * @param {*} reason
	 * @return {!Promise.<T>}
	 */
	static reject<T>(reason: any): Promise<T> {
		return new Promise<T>((/* ujs:unreferenced */ resolve, reject) => reject(reason));
	}

	/**
	 * @param {!Array.<T|!Thenable.<T>>} values
	 * @return {!Promise.<!Array.<T>>}
	 */
	static all<T>(values: (T | Thenable<T>)[]): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			const result: T[] = [];

			let numUnresolved = values.length;
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
			}, reject));
		});
	}

	/**
	 * @param {!Array.<T|!Thenable.<T>>} values
	 * @return {!Promise.<T>}
	 */
	static race<T>(values: (T | Thenable<T>)[]): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			for (const value of values) {
				Promise.resolve(value).then(resolve, reject);
			}
		});
	}

	private _state: SimplePromiseState = SimplePromiseState.PENDING;

	private _fulfillReactions: FulfilledPromiseReaction<T, any>[] = [];
	private _rejectReactions: RejectedPromiseReaction<any>[] = [];

	private _fulfilledValue: T | null = null;
	private _rejectedReason: any = null;

	constructor(executor: (resolve: (resolution: T | Thenable<T>) => void, reject: (reason: any) => void) => void) {
		if (typeof executor !== "function") {
			throw new TypeError(`typeof executor !== "function"`);
		}

		const { resolve, reject } = this._createResolvingFunctions();
		try {
			executor(resolve, reject);
		}
		catch (ex) {
			reject(ex);
		}
	}

	/**
	 * @param {?function(T):(U|!Thenable.<U>)} onFulfilled
	 * @param {?function(*):(U|!Thenable.<U>)} onRejected
	 * @return {!Promise.<U>}
	 */
	then<U>(onFulfilled: ((value: T) => U | Thenable<U>) | undefined, onRejected?: (reason: any) => U | Thenable<U>): Promise<U> {
		const resultCapability = new DeferredPromise<U>();

		if (typeof onFulfilled !== "function") {
			onFulfilled = (value: T) => value as any as U;
		}

		if (typeof onRejected !== "function") {
			onRejected = (reason: any): U => { throw reason; };
		}

		const fulfillReaction: FulfilledPromiseReaction<T, U> = {
			capabilities: resultCapability,
			handler: onFulfilled,
		};

		const rejectReaction: RejectedPromiseReaction<U> = {
			capabilities: resultCapability,
			handler: onRejected,
		};

		switch (this._state) {
			case SimplePromiseState.PENDING:
				this._fulfillReactions.push(fulfillReaction);
				this._rejectReactions.push(rejectReaction);
				break;

			case SimplePromiseState.FULFILLED:
				this._enqueueFulfilledReactionJob(fulfillReaction, this._fulfilledValue!);
				break;

			case SimplePromiseState.REJECTED:
				this._enqueueRejectedReactionJob(rejectReaction, this._rejectedReason);
				break;
		}

		return resultCapability.promise;
	}

	/**
	 * @param {function(*):(T|!Thenable.<T>)} onRejected
	 * @return {!Promise.<T>}
	 */
	catch(onRejected: (reason: any) => T | Thenable<T>): Promise<T> {
		return this.then(undefined, onRejected);
	}

	/**
	 * @return {{ resolve(T|!Thenable.<T>), reject(*) }}
	 */
	private _createResolvingFunctions(): { resolve(resolution: T | Thenable<T>): void; reject(reason: any): void; } {
		let alreadyResolved = false;

		const resolve = (resolution: T | Thenable<T>): void => {
			if (alreadyResolved) {
				return;
			}

			alreadyResolved = true;

			if (resolution === this) {
				this._reject(new TypeError(`resolution === this`));
				return;
			}

			if (resolution === null || (typeof resolution !== "object" && typeof resolution !== "function")) {
				this._fulfill(resolution as T);
				return;
			}

			try {
				var then = (resolution as Thenable<T>).then;
			}
			catch (ex) {
				this._reject(ex);
				return;
			}

			if (typeof then !== "function") {
				this._fulfill(resolution as T);
				return;
			}

			enqueueJob(() => this._resolveWithThenable(resolution as Thenable<T>, then));
		};

		const reject = (reason: any): void => {
			if (alreadyResolved) {
				return;
			}

			alreadyResolved = true;

			this._reject(reason);
		};

		return { resolve, reject };
	}

	/**
	 * @param {!Thenable.<T>} thenable
	 * @param {{function(this:!Thenable.<T>, function(T|!Thenable.<T>), function(*))}} then
	 */
	private _resolveWithThenable(thenable: Thenable<T>, then: ThenableThen<T>): void {
		const { resolve, reject } = this._createResolvingFunctions();

		try {
			then.call(thenable, resolve, reject);
		}
		catch (ex) {
			reject(ex);
		}
	}

	/**
	 * @param {T} value
	 */
	private _fulfill(value: T): void {
		const reactions = this._fulfillReactions;

		this._fulfilledValue = value;
		this._fulfillReactions = [];
		this._rejectReactions = [];
		this._state = SimplePromiseState.FULFILLED;

		for (const reaction of reactions) {
			this._enqueueFulfilledReactionJob(reaction, value);
		}
	}

	/**
	 * @param {*} reason
	 */
	private _reject(reason: any): void {
		const reactions = this._rejectReactions;

		this._rejectedReason = reason;
		this._fulfillReactions = [];
		this._rejectReactions = [];
		this._state = SimplePromiseState.REJECTED;

		for (const reaction of reactions) {
			this._enqueueRejectedReactionJob(reaction, reason);
		}
	}

	/**
	 * @param {!FulfilledPromiseReaction.<T, *>} reaction
	 * @param {T} value
	 */
	private _enqueueFulfilledReactionJob(reaction: FulfilledPromiseReaction<T, any>, value: T): void {
		enqueueJob(() => {
			const { capabilities: { resolve, reject }, handler } = reaction;

			let handlerResult: any | Thenable<any>;

			try {
				handlerResult = handler(value);
			}
			catch (ex) {
				reject(ex);
				return;
			}

			resolve(handlerResult);
		});
	}

	/**
	 * @param {!RejectedPromiseReaction.<*>} reaction
	 * @param {*} reason
	 */
	private _enqueueRejectedReactionJob(reaction: RejectedPromiseReaction<any>, reason: any): void {
		enqueueJob(() => {
			const { capabilities: { resolve, reject }, handler } = reaction;

			let handlerResult: any | Thenable<any>;

			try {
				handlerResult = handler(reason);
			}
			catch (ex) {
				reject(ex);
				return;
			}

			resolve(handlerResult);
		});
	}
}

/**
 * Set to the global implementation of Promise if the environment has one, else set to {@link ./utility/promise.SimplePromise}
 *
 * Can be set to a value using {@link libjass.configure}
 *
 * Set it to null to force {@link ./utility/promise.SimplePromise} to be used even if a global Promise is present.
 *
 * @type {function(new:Promise)}
 */
export var Promise: {
	new <T>(init: (resolve: (value: T | Thenable<T>) => void, reject: (reason: any) => void) => void): Promise<T>;
	prototype: Promise<any>;
	resolve<T>(value: T | Thenable<T>): Promise<T>;
	reject<T>(reason: any): Promise<T>;
	all<T>(values: (T | Thenable<T>)[]): Promise<T[]>;
	race<T>(values: (T | Thenable<T>)[]): Promise<T>;
} = global.Promise || SimplePromise;

declare var global: {
	Promise?: typeof Promise;
	MutationObserver?: typeof MutationObserver;
	WebkitMutationObserver?: typeof MutationObserver;
	process?: {
		nextTick(callback: () => void): void;
	}
};

interface FulfilledPromiseReaction<T, U> {
	/** @type {!libjass.DeferredPromise.<U>} */
	capabilities: DeferredPromise<U>;

	/**
	 * @param {T} value
	 * @return {U|!Thenable.<U>}
	 */
	handler(value: T): U | Thenable<U>;
}

interface RejectedPromiseReaction<U> {
	/** @type {!libjass.DeferredPromise.<U>} */
	capabilities: DeferredPromise<U>;

	/**
	 * @param {*} reason
	 * @return {U|!Thenable.<U>}
	 */
	handler(reason: any): U | Thenable<U>;
}

/**
 * The state of the {@link ./utility/promise.SimplePromise}
 */
enum SimplePromiseState {
	PENDING = 0,
	FULFILLED = 1,
	REJECTED = 2,
}

/**
 * Sets the Promise implementation used by libjass to the provided one. If null, {@link ./utility/promise.SimplePromise} is used.
 *
 * @param {?function(new:Promise)} value
 */
export function setImplementation(value: typeof Promise | null): void {
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
	/**
	 * @type {function(T|!Thenable.<T>)}
	 */
	resolve: (value: T | Thenable<T>) => void;

	/**
	 * @type {function(*)} reason
	 */
	reject: (reason: any) => void;

	private _promise: Promise<T>;

	constructor() {
		this._promise = new Promise<T>((resolve, reject) => {
			Object.defineProperties(this, {
				resolve: { value: resolve, enumerable: true },
				reject: { value: reject, enumerable: true },
			});
		});
	}

	/**
	 * @type {!Promise.<T>}
	 */
	get promise(): Promise<T> {
		return this._promise;
	}
}

/**
 * Returns a promise that resolves to the first (in iteration order) promise that fulfills, and rejects if all the promises reject.
 *
 * @param {!Array.<!Promise.<T>>} promises
 * @return {!Promise.<T>}
 */
export function first<T>(promises: Promise<T>[]): Promise<T> {
	return first_rec(promises, []);
}

/**
 * @param {!Array.<!Promise.<T>>} promises
 * @param {!Array.<*>} previousRejections
 * @return {!Promise.<T>}
 */
function first_rec<T>(promises: Promise<T>[], previousRejections: any[]): Promise<T> {
	if (promises.length === 0) {
		return Promise.reject(previousRejections);
	}

	const [head, ...tail] = promises;
	return head.catch(reason => first_rec(tail, previousRejections.concat(reason)));
}

/**
 * Returns a promise that resolves to the first (in time order) promise that fulfills, and rejects if all the promises reject.
 *
 * @param {!Array.<!Promise.<T>>} promises
 * @return {!Promise.<T>}
 */
export function any<T>(promises: Promise<T>[]): Promise<T> {
	return new Promise<T>((resolve, reject) =>
		Promise.all<any>(promises.map(promise => promise.then(resolve, reason => reason))).then(reject));
}

/**
 * Returns a promise that runs the given callback when the promise has resolved regardless of whether it fulfilled or rejected.
 *
 * @param {!Promise.<T>} promise
 * @param {function()} body
 * @return {!Promise.<T>}
 */
export function lastly<T>(promise: Promise<T>, body: () => void): Promise<T> {
	return promise.then<any>(value => {
		body();
		return value;
	}, reason => {
		body();
		throw reason;
	});
}
