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

import { parseLineIntoTypedTemplate } from "../parser/misc";
import { SrtStreamParser, StreamParser } from "../parser/stream-parsers";
import { BrowserReadableStream, Stream, StringStream, XhrStream } from "../parser/streams";

import { registerClass as serializable } from "../serialization";

import { debugMode, verboseMode } from "../settings";

import { Map } from "../utility/map";
import { Promise } from "../utility/promise";

import { Attachment } from "./attachment";
import { Dialogue } from "./dialogue";
import { Format } from "./misc";
import { ScriptProperties } from "./script-properties";
import { Style } from "./style";

/**
 * This class represents an ASS script. It contains the {@link libjass.ScriptProperties}, an array of {@link libjass.Style}s, and an array of {@link libjass.Dialogue}s.
 */
@serializable
export class ASS {
	/**
	 * Creates an ASS object from the raw text of an ASS script.
	 *
	 * @param {string} raw The raw text of the script.
	 * @param {(number|string)=0} type The type of the script. One of the {@link libjass.Format} constants, or one of the strings "ass" and "srt".
	 * @return {!Promise.<!libjass.ASS>}
	 */
	static fromString(raw: string, type: Format | "ass" | "srt" = Format.ASS): Promise<ASS> {
		return ASS.fromStream(new StringStream(raw), type);
	}

	/**
	 * Creates an ASS object from the given {@link libjass.parser.Stream}.
	 *
	 * @param {!libjass.parser.Stream} stream The stream to parse the script from
	 * @param {(number|string)=0} type The type of the script. One of the {@link libjass.Format} constants, or one of the strings "ass" and "srt".
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromStream(stream: Stream, type: Format | "ass" | "srt" = Format.ASS): Promise<ASS> {
		switch (type) {
			case Format.ASS:
			case "ass":
				return new StreamParser(stream).ass;
			case Format.SRT:
			case "srt":
				return new SrtStreamParser(stream).ass;
			default:
				throw new Error(`Invalid value of type: ${ type }`);
		}
	}

	/**
	 * Creates an ASS object from the given URL.
	 *
	 * @param {string} url The URL of the script.
	 * @param {(number|string)=0} type The type of the script. One of the {@link libjass.Format} constants, or one of the strings "ass" and "srt".
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromUrl(url: string, type: Format | "ass" | "srt" = Format.ASS): Promise<ASS> {
		let fetchPromise: Promise<ASS>;

		if (typeof global.fetch === "function" && BrowserReadableStream.isSupported()) {
			fetchPromise = global.fetch(url).then(response => {
				if (response.ok === false || (response.ok === undefined && (response.status === undefined || response.status < 200 || response.status > 299))) {
					throw new Error(`HTTP request for ${ url } failed with status code ${ response.status }`);
				}

				return ASS.fromReadableStream(response.body, "utf-8", type);
			});
		}
		else {
			fetchPromise = Promise.reject<ASS>(new Error("Not supported."));
		}

		return fetchPromise.catch(reason => {
			if (debugMode) {
				console.log("fetch() failed, falling back to XHR: %o", reason);
			}

			const xhr = new XMLHttpRequest();
			const result = ASS.fromStream(new XhrStream(xhr), type);
			xhr.open("GET", url, true);
			xhr.send();
			return result;
		});
	}

	/**
	 * Creates an ASS object from the given ReadableStream.
	 *
	 * @param {!ReadableStream} stream
	 * @param {string="utf-8"} encoding
	 * @param {(number|string)=0} type The type of the script. One of the {@link libjass.Format} constants, or one of the strings "ass" and "srt".
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromReadableStream(stream: ReadableStream, encoding: string = "utf-8", type: Format | "ass" | "srt" = Format.ASS): Promise<ASS> {
		return ASS.fromStream(new BrowserReadableStream(stream, encoding), type);
	}

	/**
	 * Custom deserialization for ASS objects.
	 *
	 * @param {!*} obj
	 * @return {!libjass.ASS}
	 */
	static fromJSON(obj: any): ASS {
		const result: ASS = Object.create(ASS.prototype);

		result._properties = obj._properties;

		result._styles = new Map<string, Style>();
		for (const name of Object.keys(obj._styles)) {
			const style = obj._styles[name];
			result._styles.set(name, style);
		}

		result._dialogues = obj._dialogues;
		result._attachments = obj._attachments;
		result._stylesFormatSpecifier = obj._stylesFormatSpecifier;
		result._dialoguesFormatSpecifier = obj._dialoguesFormatSpecifier;

		return result;
	}

	private _properties: ScriptProperties = new ScriptProperties();
	private _styles: Map<string, Style> = new Map<string, Style>();
	private _dialogues: Dialogue[] = [];
	private _attachments: Attachment[] = [];

	private _stylesFormatSpecifier: string[] | null = null;
	private _dialoguesFormatSpecifier: string[] | null = null;

	/**
	 * The properties of this script.
	 *
	 * @type {!libjass.ScriptProperties}
	 */
	get properties(): ScriptProperties {
		return this._properties;
	}

	/**
	 * The styles in this script.
	 *
	 * @type {!Map.<string, !libjass.Style>}
	 */
	get styles(): Map<string, Style> {
		return this._styles;
	}

	/**
	 * The dialogues in this script.
	 *
	 * @type {!Array.<!libjass.Dialogue>}
	 */
	get dialogues(): Dialogue[] {
		return this._dialogues;
	}

	/**
	 * The attachments of this script.
	 *
	 * @type {!Array.<!libjass.Attachment>}
	 */
	get attachments(): Attachment[] {
		return this._attachments;
	}

	/**
	 * The format specifier for the styles section.
	 *
	 * @type {Array.<string>}
	 */
	get stylesFormatSpecifier(): string[] | null {
		return this._stylesFormatSpecifier;
	}

	/**
	 * The format specifier for the events section.
	 *
	 * @type {Array.<string>}
	 */
	set stylesFormatSpecifier(value: string[] | null) {
		this._stylesFormatSpecifier = value;
	}

	/**
	 * The format specifier for the styles section.
	 *
	 * @type {Array.<string>}
	 */
	get dialoguesFormatSpecifier(): string[] | null {
		return this._dialoguesFormatSpecifier;
	}

	/**
	 * The format specifier for the events section.
	 *
	 * @type {Array.<string>}
	 */
	set dialoguesFormatSpecifier(value: string[] | null) {
		this._dialoguesFormatSpecifier = value;
	}

	constructor() {
		// Deprecated constructor argument
		if (arguments.length === 1) {
			throw new Error("Constructor `new ASS(rawASS)` has been deprecated. Use `ASS.fromString(rawASS)` instead.");
		}

		this._styles.set("Default", new Style(new Map([["Name", "Default"]])));
	}

	/**
	 * Add a style to this ASS script.
	 *
	 * @param {string} line The line from the script that contains the new style.
	 */
	addStyle(line: string): void {
		if (this._stylesFormatSpecifier === null) {
			throw new Error("stylesFormatSpecifier is not set.");
		}

		const styleLine = parseLineIntoTypedTemplate(line, this._stylesFormatSpecifier);
		if (styleLine === null || styleLine.type !== "Style") {
			return;
		}

		const styleTemplate = styleLine.template;

		if (verboseMode) {
			let repr = "";
			styleTemplate.forEach((value, key) => repr += `${ key } = ${ value }, `);
			console.log(`Read style: ${ repr }`);
		}

		// Create the dialogue and add it to the dialogues array
		const style = new Style(styleTemplate);
		this._styles.set(style.name, style);
	}

	/**
	 * Add an event to this ASS script.
	 *
	 * @param {string} line The line from the script that contains the new event.
	 */
	addEvent(line: string): void {
		if (this._dialoguesFormatSpecifier === null) {
			throw new Error("dialoguesFormatSpecifier is not set.");
		}

		const dialogueLine = parseLineIntoTypedTemplate(line, this._dialoguesFormatSpecifier);
		if (dialogueLine === null || dialogueLine.type !== "Dialogue") {
			return;
		}

		const dialogueTemplate = dialogueLine.template;

		if (verboseMode) {
			let repr = "";
			dialogueTemplate.forEach((value, key) => repr += `${ key } = ${ value }, `);
			console.log(`Read dialogue: ${ repr }`);
		}

		// Create the dialogue and add it to the dialogues array
		this.dialogues.push(new Dialogue(dialogueTemplate, this));
	}

	/**
	 * Add an attachment to this ASS script.
	 *
	 * @param {!libjass.Attachment} attachment
	 */
	addAttachment(attachment: Attachment): void {
		this._attachments.push(attachment);
	}

	/**
	 * Custom JSON serialization for ASS objects.
	 *
	 * @return {!*}
	 */
	toJSON(): any {
		const result = Object.create(null);

		result._properties = this._properties;

		result._styles = Object.create(null);
		this._styles.forEach((style, name) => result._styles[name] = style);

		result._dialogues = this._dialogues;
		result._attachments = this._attachments;
		result._stylesFormatSpecifier = this._stylesFormatSpecifier;
		result._dialoguesFormatSpecifier = this._dialoguesFormatSpecifier;

		result._classTag = (ASS.prototype as any)._classTag;

		return result;
	}
}
