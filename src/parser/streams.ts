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

import { Promise, DeferredPromise } from "../utility/promise";


/**
 * An interface for a stream.
 */
export interface Stream {
	/**
	 * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the stream is exhausted.
	 */
	nextLine(): Promise<string>;
}

/**
 * A {@link libjass.parser.Stream} that reads from a string in memory.
 *
 * @param {string} str The string
 */
export class StringStream implements Stream {
	private _readTill: number = 0;

	constructor(private _str: string) { }

	/**
	 * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the string has been completely read.
	 */
	nextLine(): Promise<string> {
		var result: Promise<string> = null;

		if (this._readTill < this._str.length) {
			var nextNewLinePos = this._str.indexOf("\n", this._readTill);
			if (nextNewLinePos !== -1) {
				result = Promise.resolve(this._str.substring(this._readTill, nextNewLinePos));
				this._readTill = nextNewLinePos + 1;
			}
			else {
				result = Promise.resolve(this._str.substr(this._readTill));
				this._readTill = this._str.length;
			}
		}
		else {
			result = Promise.resolve<string>(null);
		}

		return result;
	}
}

/**
 * A {@link libjass.parser.Stream} that reads from an XMLHttpRequest object.
 *
 * @param {!XMLHttpRequest} xhr The XMLHttpRequest object. Make sure to not call .open() on this object before passing it in here,
 * since event handlers cannot be registered after open() has been called.
 */
export class XhrStream implements Stream {
	private _readTill: number = 0;
	private _pendingDeferred: DeferredPromise<string> = null;

	constructor(private _xhr: XMLHttpRequest) {
		_xhr.addEventListener("progress", event => this._onXhrProgress(event), false);
		_xhr.addEventListener("loadend", event => this._onXhrLoadEnd(event), false);
	}

	/**
	 * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the stream is exhausted.
	 */
	nextLine(): Promise<string> {
		if (this._pendingDeferred !== null) {
			throw new Error("XhrStream only supports one pending unfulfilled read at a time.");
		}

		var deferred = this._pendingDeferred = new DeferredPromise<string>();

		this._tryResolveNextLine();

		return deferred.promise;
	}

	/**
	 * @param {!ProgressEvent} event
	 */
	private _onXhrProgress(event: ProgressEvent): void {
		if (this._pendingDeferred === null) {
			return;
		}

		this._tryResolveNextLine();
	}

	/**
	 * @param {!ProgressEvent} event
	 */
	private _onXhrLoadEnd(event: ProgressEvent): void {
		if (this._pendingDeferred === null) {
			return;
		}

		this._tryResolveNextLine();
	}

	/**
	 */
	private _tryResolveNextLine(): void {
		var response = this._xhr.responseText;

		var nextNewLinePos = response.indexOf("\n", this._readTill);
		if (nextNewLinePos !== -1) {
			this._pendingDeferred.resolve(response.substring(this._readTill, nextNewLinePos));
			this._readTill = nextNewLinePos + 1;
			this._pendingDeferred = null;
		}

		else if (this._xhr.readyState === XMLHttpRequest.DONE) {
			// No more data. This is the last line.
			if (this._readTill < response.length) {
				this._pendingDeferred.resolve(response.substr(this._readTill));
				this._readTill = response.length;
			}
			else {
				this._pendingDeferred.resolve(null);
			}

			this._pendingDeferred = null;
		}
	}
}
