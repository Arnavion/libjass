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

export interface ReadableStream {
	/**
	 * @return {!ReadableStreamReader}
	 */
	getReader(): ReadableStreamReader;
}

interface ReadableStreamReader {
	/**
	 * @return {!Promise.<{ value?: Uint8Array, done: boolean }>}
	 */
	read(): Promise<{ value: Uint8Array; done: boolean; }>;
}

export interface TextDecoder {
	/**
	 * @param {!ArrayBuffer|!ArrayBufferView} input
	 * @param {{ stream: boolean }} options
	 * @return {string}
	 */
	decode(input: ArrayBuffer | ArrayBufferView, options: { stream: boolean }): string;
}
export interface TextDecoderConstructor {
	new (encoding: string, options: { ignoreBOM: boolean }): TextDecoder;

	/**
	 * @type {!TextDecoder}
	 */
	prototype: TextDecoder;
}

declare const global: {
	/**
	 * @type {!TextDecoderConstructor}
	 */
	TextDecoder?: TextDecoderConstructor;
};

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
		let result: Promise<string> = null;

		if (this._readTill < this._str.length) {
			const nextNewLinePos = this._str.indexOf("\n", this._readTill);
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

		const deferred = this._pendingDeferred = new DeferredPromise<string>();

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
		const response = this._xhr.responseText;

		const nextNewLinePos = response.indexOf("\n", this._readTill);
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

/**
 * A {@link libjass.parser.Stream} that reads from a ReadableStream object.
 *
 * @param {!ReadableStream} stream
 * @param {string} encoding
 */
export class BrowserReadableStream implements Stream {
	private _reader: ReadableStreamReader;
	private _decoder: TextDecoder;
	private _buffer: string = "";
	private _pendingDeferred: DeferredPromise<string> = null;

	constructor(stream: ReadableStream, encoding: string) {
		this._reader = stream.getReader();
		this._decoder = new global.TextDecoder(encoding, { ignoreBOM: true });
	}

	/**
	 * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the stream is exhausted.
	 */
	nextLine(): Promise<string> {
		if (this._pendingDeferred !== null) {
			throw new Error("BrowserReadableStream only supports one pending unfulfilled read at a time.");
		}

		const deferred = this._pendingDeferred = new DeferredPromise<string>();

		this._tryResolveNextLine();

		return deferred.promise;
	}

	/**
	 */
	private _tryResolveNextLine(): void {
		const nextNewLinePos = this._buffer.indexOf("\n");
		if (nextNewLinePos !== -1) {
			this._pendingDeferred.resolve(this._buffer.substr(0, nextNewLinePos));
			this._buffer = this._buffer.substr(nextNewLinePos + 1);
			this._pendingDeferred = null;
		}

		else {
			this._reader.read().then(next => {
				const { value, done } = next;

				if (!done) {
					this._buffer += this._decoder.decode(value, { stream: true });
					this._tryResolveNextLine();
				}
				else {
					// No more data.
					if (this._buffer.length === 0) {
						this._pendingDeferred.resolve(null);
					}
					else {
						this._pendingDeferred.resolve(this._buffer);
						this._buffer = "";
					}

					this._pendingDeferred = null;
				}
			});
		}
	}
}
