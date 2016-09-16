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

import { debugMode } from "../settings";

import { ASS } from "../types/ass";
import { Style } from "../types/style";
import { Dialogue } from "../types/dialogue";
import { Attachment, AttachmentType } from "../types/attachment";

import { Map } from "../utility/map";

import { Promise, DeferredPromise } from "../utility/promise";

import { parseLineIntoProperty } from "./misc";
import { Stream } from "./streams";

enum Section {
	ScriptInfo,
	Styles,
	Events,
	Fonts,
	Graphics,
	Other,
	EOF,
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
	private _currentSection: Section = Section.ScriptInfo;
	private _currentAttachment: Attachment | null = null;

	constructor(private _stream: Stream) {
		this._stream.nextLine().then(line => this._onNextLine(line), reason => {
			this._minimalDeferred.reject(reason);
			this._deferred.reject(reason);
		});
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
	 * @type {number}
	 */
	private get currentSection(): Section {
		return this._currentSection;
	}

	/**
	 * @type {number}
	 */
	private set currentSection(value: Section) {
		if (this._currentAttachment !== null) {
			this._ass.addAttachment(this._currentAttachment);
			this._currentAttachment = null;
		}

		if (this._currentSection === Section.ScriptInfo && value !== Section.ScriptInfo) {
			// Exiting script info section
			this._minimalDeferred.resolve(this._ass);
		}

		if (value === Section.EOF) {
			const scriptProperties = this._ass.properties;
			if (scriptProperties.resolutionX === undefined || scriptProperties.resolutionY === undefined) {
				// Malformed script.
				this._minimalDeferred.reject("Malformed ASS script.");
				this._deferred.reject("Malformed ASS script.");
			}
			else {
				this._minimalDeferred.resolve(this._ass);
				this._deferred.resolve(this._ass);
			}
		}

		this._currentSection = value;
	}

	/**
	 * @param {string} line
	 */
	private _onNextLine(line: string | null): void {
		if (line === null) {
			this.currentSection = Section.EOF;
			return;
		}

		if (line[line.length - 1] === "\r") {
			line = line.substr(0, line.length - 1);
		}

		if (line.charCodeAt(0) === 0xfeff && this._shouldSwallowBom) {
			line = line.substr(1);
		}

		this._shouldSwallowBom = false;

		if (line === "") {
			// Ignore empty lines.
		}

		else if (line[0] === ";" && this._currentAttachment === null) {
			// Lines starting with ; are comments, unless reading an attachment.
		}

		else if (line === "[Script Info]") {
			this.currentSection = Section.ScriptInfo;
		}
		else if (line === "[V4+ Styles]" || line === "[V4 Styles]") {
			this.currentSection = Section.Styles;
		}
		else if (line === "[Events]") {
			this.currentSection = Section.Events;
		}
		else if (line === "[Fonts]") {
			this.currentSection = Section.Fonts;
		}
		else if (line === "[Graphics]") {
			this.currentSection = Section.Graphics;
		}
		else {
			if (this._currentAttachment === null && line[0] === "[" && line[line.length - 1] === "]") {
				/* This looks like the start of a new section. The section name is unrecognized if it is.
				 * Since there's no current attachment being parsed it's definitely the start of a new section.
				 * If an attachment is being parsed, this might be part of the attachment.
				 */
				this.currentSection = Section.Other;
			}

			switch (this.currentSection) {
				case Section.ScriptInfo:
					const property = parseLineIntoProperty(line);
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

				case Section.Styles:
					if (this._ass.stylesFormatSpecifier === null) {
						const property = parseLineIntoProperty(line);
						if (property !== null && property.name === "Format") {
							this._ass.stylesFormatSpecifier = property.value.split(",").map(str => str.trim());
						}
						else {
							// Ignore any non-format lines
						}
					}
					else {
						try {
							this._ass.addStyle(line);
						}
						catch (ex) {
							if (debugMode) {
								console.error(`Could not parse style from line ${ line } - ${ ex.stack || ex }`);
							}
						}
					}
					break;

				case Section.Events:
					if (this._ass.dialoguesFormatSpecifier === null) {
						const property = parseLineIntoProperty(line);
						if (property !== null && property.name === "Format") {
							this._ass.dialoguesFormatSpecifier = property.value.split(",").map(str => str.trim());
						}
						else {
							// Ignore any non-format lines
						}
					}
					else {
						try {
							this._ass.addEvent(line);
						}
						catch (ex) {
							if (debugMode) {
								console.error(`Could not parse event from line ${ line } - ${ ex.stack || ex }`);
							}
						}
					}
					break;

				case Section.Fonts:
				case Section.Graphics:
					const startOfNewAttachmentRegex = (this.currentSection === Section.Fonts) ? /^fontname:(.+)/ : /^filename:(.+)/;
					const startOfNewAttachment = startOfNewAttachmentRegex.exec(line);

					if (startOfNewAttachment !== null) {
						// Start of new attachment

						if (this._currentAttachment !== null) {
							this._ass.addAttachment(this._currentAttachment);
							this._currentAttachment = null;
						}

						this._currentAttachment = new Attachment(startOfNewAttachment[1].trim(), (this.currentSection === Section.Fonts) ? AttachmentType.Font : AttachmentType.Graphic);
					}
					else if (this._currentAttachment !== null) {
						try {
							this._currentAttachment.contents += uuencodedToBase64(line);
						}
						catch (ex) {
							if (debugMode) {
								console.error(`Encountered error while reading font ${ this._currentAttachment.filename }: %o`, ex);
							}

							this._currentAttachment = null;
						}
					}
					else {
						// Ignore.
					}
					break;

				case Section.Other:
					// Ignore other sections.
					break;

				default:
					throw new Error(`Unhandled state ${ this.currentSection }`);
			}
		}

		this._stream.nextLine().then(line => this._onNextLine(line), reason => {
			this._minimalDeferred.reject(reason);
			this._deferred.reject(reason);
		});
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

	private _shouldSwallowBom: boolean = true;

	private _currentDialogueNumber: string | null = null;
	private _currentDialogueStart: string | null = null;
	private _currentDialogueEnd: string | null = null;
	private _currentDialogueText: string | null = null;

	constructor(private _stream: Stream) {
		this._stream.nextLine().then(line => this._onNextLine(line), reason => {
			this._deferred.reject(reason);
		});

		this._ass.properties.resolutionX = 1280;
		this._ass.properties.resolutionY = 720;
		this._ass.properties.wrappingStyle = 1;
		this._ass.properties.scaleBorderAndShadow = true;

		const newStyle = new Style(new Map([["Name", "Default"], ["FontSize", "36"]]));
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
	private _onNextLine(line: string | null): void {
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

		if (line.charCodeAt(0) === 0xfeff && this._shouldSwallowBom) {
			line = line.substr(1);
		}

		this._shouldSwallowBom = false;

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
				const match = /^(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)/.exec(line);
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

		this._stream.nextLine().then(line => this._onNextLine(line), reason => {
			this._deferred.reject(reason);
		});
	}
}

/**
 * Converts a uuencoded string to a base64 string.
 *
 * @param {string} str
 * @return {string}
 */
function uuencodedToBase64(str: string): string {
	let result = "";

	for (let i = 0; i < str.length; i++) {
		const charCode = str.charCodeAt(i) - 33;

		if (charCode < 0 || charCode > 63) {
			throw new Error(`Out-of-range character code ${ charCode } at index ${ i } in string ${ str }`);
		}
		if (charCode < 26) {
			result += String.fromCharCode("A".charCodeAt(0) + charCode);
		}
		else if (charCode < 52) {
			result += String.fromCharCode("a".charCodeAt(0) + charCode - 26);
		}
		else if (charCode < 62) {
			result += String.fromCharCode("0".charCodeAt(0) + charCode - 52);
		}
		else if (charCode === 62) {
			result += "+";
		}
		else {
			result += "/";
		}
	}

	return result;
}
