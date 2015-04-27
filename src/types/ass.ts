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

import { Dialogue } from "./dialogue";
import { Style } from "./style";
import { ScriptProperties } from "./script-properties";

import { Format } from "./misc";

import { verboseMode } from "../settings";

import * as parser from "../parser/index";
import { parseLineIntoTypedTemplate } from "../parser/misc";
import { ReadableStream } from "./parser/streams";

import { Map } from "../utility/map";
import { Promise } from "../utility/promise";

/**
 * This class represents an ASS script. It contains the {@link libjass.ScriptProperties}, an array of {@link libjass.Style}s, and an array of {@link libjass.Dialogue}s.
 */
export class ASS {
	private _properties: ScriptProperties = new ScriptProperties();
	private _styles: Map<string, Style> = new Map<string, Style>();
	private _dialogues: Dialogue[] = [];

	private _stylesFormatSpecifier: string[] = null;
	private _dialoguesFormatSpecifier: string[] = null;

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
	 * The format specifier for the styles section.
	 *
	 * @type {!Array.<string>}
	 */
	get stylesFormatSpecifier(): string[] {
		return this._stylesFormatSpecifier;
	}

	/**
	 * The format specifier for the styles section.
	 *
	 * @type {!Array.<string>}
	 */
	get dialoguesFormatSpecifier(): string[] {
		return this._dialoguesFormatSpecifier;
	}

	/**
	 * The format specifier for the events section.
	 *
	 * @type {!Array.<string>}
	 */
	set stylesFormatSpecifier(value: string[]) {
		this._stylesFormatSpecifier = value;
	}

	/**
	 * The format specifier for the events section.
	 *
	 * @type {!Array.<string>}
	 */
	set dialoguesFormatSpecifier(value: string[]) {
		this._dialoguesFormatSpecifier = value;
	}

	constructor() {
		// Deprecated constructor argument
		if (arguments.length === 1) {
			throw new Error("Constructor `new ASS(rawASS)` has been deprecated. Use `ASS.fromString(rawASS)` instead.");
		}
	}

	/**
	 * Add a style to this ASS script.
	 *
	 * @param {string} line The line from the script that contains the new style.
	 */
	addStyle(line: string): void {
		var styleLine = parseLineIntoTypedTemplate(line, this._stylesFormatSpecifier);
		if (styleLine === null || styleLine.type !== "Style") {
			return;
		}

		var styleTemplate = styleLine.template;

		if (verboseMode) {
			var repr = "";
			styleTemplate.forEach((value, key) => repr += `${ key } = ${ value }, `);
			console.log(`Read style: ${ repr }`);
		}

		// Create the dialogue and add it to the dialogues array
		var style = new Style(styleTemplate);
		this._styles.set(style.name, style);
	}

	/**
	 * Add an event to this ASS script.
	 *
	 * @param {string} line The line from the script that contains the new event.
	 */
	addEvent(line: string): void {
		var dialogueLine = parseLineIntoTypedTemplate(line, this._dialoguesFormatSpecifier);
		if (dialogueLine === null || dialogueLine.type !== "Dialogue") {
			return;
		}

		var dialogueTemplate = dialogueLine.template;

		if (verboseMode) {
			var repr = "";
			dialogueTemplate.forEach((value, key) => repr += `${ key } = ${ value }, `);
			console.log(`Read dialogue: ${ repr }`);
		}

		// Create the dialogue and add it to the dialogues array
		this.dialogues.push(new Dialogue(dialogueTemplate, this));
	}

	/**
	 * Creates an ASS object from the raw text of an ASS script.
	 *
	 * @param {string} raw The raw text of the script.
	 * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
	 * @return {!Promise.<!libjass.ASS>}
	 */
	static fromString(raw: string, type: Format = Format.ASS): Promise<ASS> {
		return ASS.fromStream(new parser.StringStream(raw), type);
	}

	/**
	 * Creates an ASS object from the given {@link libjass.parser.Stream}.
	 *
	 * @param {!libjass.parser.Stream} stream The stream to parse the script from
	 * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromStream(stream: parser.Stream, type: Format = Format.ASS): Promise<ASS> {
		switch (type) {
			case Format.ASS:
				return new parser.StreamParser(stream).ass;
			case Format.SRT:
				return new parser.SrtStreamParser(stream).ass;
			default:
				throw new Error(`Illegal value of type: ${ type }`);
		}
	}

	/**
	 * Creates an ASS object from the given URL.
	 *
	 * @param {string} url The URL of the script.
	 * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromUrl(url: string, type: Format = Format.ASS): Promise<ASS> {
		var xhr = new XMLHttpRequest();
		var result = ASS.fromStream(new parser.XhrStream(xhr), type);
		xhr.open("GET", url, true);
		xhr.send();
		return result;
	}

	/**
	 * Creates an ASS object from the given ReadableStream.
	 *
	 * @param {!ReadableStream} stream
	 * @param {string="utf-8"} encoding
	 * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
	 * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
	 */
	static fromReadableStream(stream: ReadableStream, encoding: string = "utf-8", type: Format = Format.ASS): Promise<ASS> {
		return ASS.fromStream(new parser.BrowserReadableStream(stream, encoding), type);
	}
}
