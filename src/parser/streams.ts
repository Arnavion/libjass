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

import { ASS } from "../types/ass";
import { Style } from "../types/style";
import { Dialogue } from "../types/dialogue";
import { Property, TypedTemplate } from "../types/misc";

import { Map } from "../utility/map";

import { Promise, DeferredPromise } from "../utility/promise";

import { parseLineIntoProperty } from "./misc";

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
 * @param {!XMLHttpRequest} xhr The XMLHttpRequest object
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

/**
 * A parser that parses an {@link libjass.ASS} object from a {@link libjass.parser.Stream}.
 *
 * @param {!libjass.parser.Stream} stream The {@link libjass.parser.Stream} to parse
 */
export class StreamParser {
	private _ass: ASS = new ASS();
	private _minimalDeferred: DeferredPromise<ASS> = new DeferredPromise<ASS>();
	private _deferred: DeferredPromise<ASS> = new DeferredPromise<ASS>();

	private _shouldSwallowBom: boolean = true;
	private _currentSectionName: string = null;

	constructor(private _stream: Stream) {
		this._stream.nextLine().then(line => this._onNextLine(line));
	}

	/**
	 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the script properties of the ASS script have been parsed from the stream. Styles and events have not necessarily been
	 * parsed at the point this promise becomes resolved.
	 */
	get minimalASS(): Promise<ASS> {
		return this._minimalDeferred.promise;
	}

	/**
	 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the entire stream has been parsed.
	 */
	get ass(): Promise<ASS> {
		return this._deferred.promise;
	}

	/**
	 * @param {string} line
	 */
	private _onNextLine(line: string): void {
		if (line === null) {
			this._minimalDeferred.resolve(this._ass);
			this._deferred.resolve(this._ass);
			return;
		}

		if (line[line.length - 1] === "\r") {
			line = line.substr(0, line.length - 1);
		}

		if (line.charCodeAt(0) === 0xfeff && this._shouldSwallowBom) {
			line = line.substr(1);
		}

		this._shouldSwallowBom = false;

		if (line === "" || line[0] === ";") {
			// Ignore empty lines and comments
		}

		else if (line[0] === "[" && line[line.length - 1] === "]") {
			// Start of new section

			if (this._currentSectionName === "Script Info") {
				// Exiting script info section
				this._minimalDeferred.resolve(this._ass);
			}

			this._currentSectionName = line.substring(1, line.length - 1);
		}

		else {
			switch (this._currentSectionName) {
				case "Script Info":
					var property = parseLineIntoProperty(line);
					if (property !== null) {
						switch (property.name) {
							case "PlayResX":
								this._ass.properties.resolutionX = parseInt(property.value);
								break;
							case "PlayResY":
								this._ass.properties.resolutionY = parseInt(property.value);
								break;
							case "WrapStyle":
								this._ass.properties.wrappingStyle = parseInt(property.value);
								break;
							case "ScaledBorderAndShadow":
								this._ass.properties.scaleBorderAndShadow = (property.value === "yes");
								break;
						}
					}
					break;

				case "V4+ Styles":
					if (this._ass.stylesFormatSpecifier === null) {
						var property = parseLineIntoProperty(line);
						if (property !== null && property.name === "Format") {
							this._ass.stylesFormatSpecifier = property.value.split(",").map(str => str.trim());
						}
						else {
							// Ignore any non-format lines
						}
					}
					else {
						this._ass.addStyle(line);
					}
					break;

				case "Events":
					if (this._ass.dialoguesFormatSpecifier === null) {
						var property = parseLineIntoProperty(line);
						if (property !== null && property.name === "Format") {
							this._ass.dialoguesFormatSpecifier = property.value.split(",").map(str => str.trim());
						}
						else {
							// Ignore any non-format lines
						}
					}
					else {
						this._ass.addEvent(line);
					}
					break;

				default:
					// Ignore other sections
					break;
			}
		}

		this._stream.nextLine().then(line => this._onNextLine(line));
	}
}

/**
 * A parser that parses an {@link libjass.ASS} object from a {@link libjass.parser.Stream} of an SRT script.
 *
 * @param {!libjass.parser.Stream} stream The {@link libjass.parser.Stream} to parse
 */
export class SrtStreamParser {
	private _ass: ASS = new ASS();
	private _deferred: DeferredPromise<ASS> = new DeferredPromise<ASS>();

	private _currentDialogueNumber: string = null;
	private _currentDialogueStart: string = null;
	private _currentDialogueEnd: string = null;
	private _currentDialogueText: string = null;

	constructor(private _stream: Stream) {
		this._stream.nextLine().then(line => this._onNextLine(line));

		this._ass.properties.resolutionX = 1280;
		this._ass.properties.resolutionY = 720;
		this._ass.properties.wrappingStyle = 1;
		this._ass.properties.scaleBorderAndShadow = true;

		var newStyle = new Style(new Map([["Name", "Default"]]));
		this._ass.styles.set(newStyle.name, newStyle);
	}

	/**
	 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the entire stream has been parsed.
	 */
	get ass(): Promise<ASS> {
		return this._deferred.promise;
	}

	/**
	 * @param {string} line
	 */
	private _onNextLine(line: string): void {
		if (line === null) {
			if (this._currentDialogueNumber !== null && this._currentDialogueStart !== null && this._currentDialogueEnd !== null && this._currentDialogueText !== null) {
				this._ass.dialogues.push(new Dialogue(new Map([
					["Style", "Default"],
					["Start", this._currentDialogueStart],
					["End", this._currentDialogueEnd],
					["Text", this._currentDialogueText],
				]), this._ass));
			}

			this._deferred.resolve(this._ass);
			return;
		}

		if (line[line.length - 1] === "\r") {
			line = line.substr(0, line.length - 1);
		}

		if (line === "") {
			if (this._currentDialogueNumber !== null && this._currentDialogueStart !== null && this._currentDialogueEnd !== null && this._currentDialogueText !== null) {
				this._ass.dialogues.push(new Dialogue(new Map([
					["Style", "Default"],
					["Start", this._currentDialogueStart],
					["End", this._currentDialogueEnd],
					["Text", this._currentDialogueText],
				]), this._ass));
			}

			this._currentDialogueNumber = this._currentDialogueStart = this._currentDialogueEnd = this._currentDialogueText = null;
		}
		else {
			if (this._currentDialogueNumber === null) {
				if (/^\d+$/.test(line)) {
					this._currentDialogueNumber = line;
				}
			}
			else if (this._currentDialogueStart === null && this._currentDialogueEnd === null) {
				var match = /^(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)/.exec(line);
				if (match !== null) {
					this._currentDialogueStart = match[1].replace(",", ".");
					this._currentDialogueEnd = match[2].replace(",", ".");
				}
			}
			else {
				line = line
					.replace(/<b>/g, "{\\b1}").replace(/\{b\}/g, "{\\b1}")
					.replace(/<\/b>/g, "{\\b0}").replace(/\{\/b\}/g, "{\\b0}")
					.replace(/<i>/g, "{\\i1}").replace(/\{i\}/g, "{\\i1}")
					.replace(/<\/i>/g, "{\\i0}").replace(/\{\/i\}/g, "{\\i0}")
					.replace(/<u>/g, "{\\u1}").replace(/\{u\}/g, "{\\u1}")
					.replace(/<\/u>/g, "{\\u0}").replace(/\{\/u\}/g, "{\\u0}")
					.replace(
						/<font color="#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})">/g,
						(/* ujs:unreferenced */ substring: string, red: string, green: string, blue: string) => `{\c&H${ blue }${ green }${ red }&}`
					).replace(/<\/font>/g, "{\\c}");

				if (this._currentDialogueText !== null) {
					this._currentDialogueText += "\\N" + line;
				}
				else {
					this._currentDialogueText = line;
				}
			}
		}

		this._stream.nextLine().then(line => this._onNextLine(line));
	}
}
