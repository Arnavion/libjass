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

///<reference path="utility.ts" />
///<reference path="dialogue.ts" />

"use strict";

module libjass {
	export class ASS {
		private _info: Info;
		private _styles: Style[];
		private _dialogues: Dialogue[];

		/**
		 * This class represents an ASS script. It contains a Info object with global information about the script,
		 * an array of Styles, and an array of Dialogues.
		 *
		 * @constructor
		 * @param {string} rawASS
		 * @param {{parse: function(string, string=): !*}} dialogueParser
		 */
		constructor(rawASS: string, dialogueParser: DialogueParser) {
			// Info variables
			var playResX = -1;
			var playResY = -1;

			// Style variables
			this._styles = [];

			// The indices of the various constituents of a Style in a "Style: " line
			var nameIndex = -1;
			var italicIndex = -1;
			var boldIndex = -1;
			var underlineIndex = -1;
			var strikethroughIndex = -1;
			var outlineWidthIndex = -1;
			var fontNameIndex = -1;
			var fontSizeIndex = -1;
			var primaryColorIndex = -1;
			var outlineColorIndex = -1;
			var alignmentIndex = -1;
			var marginLeftIndex = -1;
			var marginRightIndex = -1;
			var marginVerticalIndex = -1;

			// Dialogue variables
			this._dialogues = [];

			// The indices of the various constituents of a Dialogue in a "Dialogue: " line
			var styleIndex = -1;
			var startIndex = -1;
			var endIndex = -1;
			var textIndex = -1;
			var layerIndex = -1;


			// Remove all lines and make an iterable for all the lines in the script file.
			var lines = rawASS.replace(/\r$/gm, "").split("\n").toIterable().map((entry: Array) => entry[1]);


			// Get script info from the script info section
			Iterator(
				ASS._readSection(lines, "Script Info")
					// Take all the lines till the script resolution is found
					.takeWhile((line: string) => playResX === -1 || playResY === -1)
			).forEach((line: string) => {
				// Parse the horizontal script resolution line
				if (line.startsWith("PlayResX:")) {
					playResX = parseInt(line.substring("PlayResX:".length).trim());
				}
				// Parse the vertical script resolution line
				else if (line.startsWith("PlayResY:")) {
					playResY = parseInt(line.substring("PlayResY:".length).trim());
				}
			});

			if (playResX !== -1 && playResY !== -1) {
				// Create the script info object
				this._info = new Info(playResX, playResY);
			}
			else {
				throw new Error("Script does not contain script resolution.");
			}


			// Get styles from the styles section
			Iterator(ASS._readSection(lines, "V4+ Styles")).forEach((line: string) => {
				// If this is the format line
				if (line.startsWith("Format:")) {
					// Parse the format line
					var styleFormatParts = line.substring("Format:".length).split(",").map(formatPart => formatPart.trim());
					nameIndex = styleFormatParts.indexOf("Name");
					italicIndex = styleFormatParts.indexOf("Italic");
					boldIndex = styleFormatParts.indexOf("Bold");
					underlineIndex = styleFormatParts.indexOf("Underline");
					strikethroughIndex = styleFormatParts.indexOf("StrikeOut");
					outlineWidthIndex = styleFormatParts.indexOf("Outline");
					fontNameIndex = styleFormatParts.indexOf("Fontname");
					fontSizeIndex = styleFormatParts.indexOf("Fontsize");
					primaryColorIndex = styleFormatParts.indexOf("PrimaryColour");
					outlineColorIndex = styleFormatParts.indexOf("OutlineColour");
					alignmentIndex = styleFormatParts.indexOf("Alignment");
					marginLeftIndex = styleFormatParts.indexOf("MarginL");
					marginRightIndex = styleFormatParts.indexOf("MarginR");
					marginVerticalIndex = styleFormatParts.indexOf("MarginV");
				}

				// else if this is a style line
				else if (line.startsWith("Style:")) {
					if (
						nameIndex === -1 ||
						italicIndex === -1 ||
						boldIndex === -1 ||
						underlineIndex === -1 ||
						strikethroughIndex === -1 ||
						outlineWidthIndex === -1 ||
						fontNameIndex === -1 ||
						fontSizeIndex === -1 ||
						primaryColorIndex === -1 ||
						outlineColorIndex === -1 ||
						alignmentIndex === -1 ||
						marginLeftIndex === -1 ||
						marginRightIndex === -1 ||
						marginVerticalIndex === -1
					) {
						throw new Error("All required line styles not found.");
					}

					var lineParts = line.substring("Style:".length).trimLeft().split(",");
					// Create the style and add it into the styles array
					this._styles.push(new Style(
						lineParts[nameIndex],
						lineParts[italicIndex] === "-1",
						lineParts[boldIndex] === "-1",
						lineParts[underlineIndex] === "-1",
						lineParts[strikethroughIndex] === "-1",
						parseFloat(lineParts[outlineWidthIndex]),
						lineParts[fontNameIndex],
						parseFloat(lineParts[fontSizeIndex]),
						<string>dialogueParser.parse(lineParts[primaryColorIndex], "colorWithAlpha"),
						<string>dialogueParser.parse(lineParts[outlineColorIndex], "colorWithAlpha"),
						parseInt(lineParts[alignmentIndex]),
						parseFloat(lineParts[marginLeftIndex]),
						parseFloat(lineParts[marginRightIndex]),
						parseFloat(lineParts[marginVerticalIndex])
					));
				}
			});


			// Get dialogues from the events section
			Iterator(ASS._readSection(lines, "Events")).forEach((line: string) => {
				// If this is a format line
				if (line.startsWith("Format:")) {
					var dialogueFormatParts = line.substring("Format:".length).split(",").map(formatPart => formatPart.trim());
					styleIndex = dialogueFormatParts.indexOf("Style");
					startIndex = dialogueFormatParts.indexOf("Start");
					endIndex = dialogueFormatParts.indexOf("End");
					textIndex = dialogueFormatParts.indexOf("Text");
					layerIndex = dialogueFormatParts.indexOf("Layer");
				}

				// else if this is a dialogue line
				else if (line.startsWith("Dialogue:")) {
					if (
						styleIndex === -1 ||
						startIndex === -1 ||
						endIndex === -1 ||
						textIndex === -1 ||
						layerIndex === -1
					) {
						throw new Error("All required event styles not found.");
					}

					var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
					// Create the dialogue and add it to the dialogues array
					this._dialogues.push(new Dialogue(
						lineParts.slice(textIndex).join(","),
						this._styles.filter(aStyle => aStyle.name === lineParts[styleIndex])[0],
						ASS._toTime(lineParts[startIndex]),
						ASS._toTime(lineParts[endIndex]),
						Math.max(parseInt(lineParts[layerIndex]), 0),
						dialogueParser,
						this._info,
						this._styles
					));
				}

				return false;
			});
		}

		get info(): Info {
			return this._info;
		}

		get styles(): Style[] {
			return this._styles;
		}

		get dialogues(): Dialogue[] {
			return this._dialogues;
		}

		private static _readSection(lines: Iterable, sectionName: string): Iterable {
			return lines
				// Skip all lines till the script info section begins
				.skipWhile((line: string) => line !== "[" + sectionName + "]")
				// Skip the section header
				.skip(1)
				// Take all the lines till the script resolution is found or the script info section ends
				.takeWhile((line: string) => !line.startsWith("["));
		}

		/**
		 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
		 *
		 * @param {string} string
		 * @return {number}
		 */
		private static _toTime(str: string): number {
			return str.split(":").reduce((previousValue, currentValue) => previousValue * 60 + parseFloat(currentValue), 0);
		}
	}

	/**
	 * This class represents the global information about the ASS script. It is obtained via the ASS.info property.
	 *
	 * @constructor
	 * @param {number} playResX The horizontal script resolution
	 * @param {number} playResY The vertical script resolution
	 */
	export class Info {
		private _scaleX: number;
		private _scaleY: number;
		private _dpi: number;

		constructor(private _playResX: number, private _playResY: number) { }

		/**
		 * This method takes in the actual video height and width and prepares the scaleX and scaleY
		 * properties according to the script resolution.
		 *
		 * @param {number} videoWidth The width of the video, in pixels
		 * @param {number} videoHeight The height of the video, in pixels
		 */
		scaleTo(videoWidth: number, videoHeight: number): void {
			this._scaleX = videoWidth / this._playResX;
			this._scaleY = videoHeight / this._playResY;
		}

		get scaleX(): number {
			return this._scaleX;
		}

		get scaleY(): number {
			return this._scaleY;
		}

		get dpi(): number {
			return this._dpi;
		}
		set dpi(value: number) {
			this._dpi = value;
		}
	};

	/**
	 * This class represents a single global style declaration in an ASS script. The styles can be obtained via the ASS.styles property.
	 *
	 * @constructor
	 * @param {string} name The name of the style
	 * @param {boolean} italic true if the style is italicized
	 * @param {(boolean|number)} bold true if the style is bolded, false if it isn't, or a numerical weight
	 * @param {boolean} underline true if the style is underlined
	 * @param {boolean} strikethrough true if the style is struck-through
	 * @param {number} outlineWidth The outline width, in pixels
	 * @param {string} fontName The name of the font
	 * @param {number} fontSize The size of the font, in pixels
	 * @param {string} primaryColor The primary color, as a CSS rgba string
	 * @param {string} outlineColor The outline color, as a CSS rgba string
	 * @param {number} alignment The alignment, as an integer
	 * @param {number} marginLeft The left margin
	 * @param {number} marginRight The right margin
	 * @param {number} marginVertical The vertical margin
	 */
	export class Style {
		constructor(
			private _name: string,
			private _italic: boolean, private _bold: Object, private _underline: boolean, private _strikethrough: boolean,
			private _outlineWidth: number,
			private _fontName: string, private _fontSize: number,
			private _primaryColor: string, private _outlineColor: string,
			private _alignment: number,
			private _marginLeft: number, private _marginRight: number, private _marginVertical: number) { }

		get name(): string {
			return this._name;
		}

		get italic(): boolean {
			return this._italic;
		}

		get bold(): Object {
			return this._bold;
		}

		get underline(): boolean {
			return this._underline;
		}

		get strikethrough(): boolean {
			return this._strikethrough;
		}

		get outlineWidth(): number {
			return this._outlineWidth;
		}

		get fontName(): string {
			return this._fontName;
		}

		get fontSize(): number {
			return this._fontSize;
		}

		get primaryColor(): string {
			return this._primaryColor;
		}

		get outlineColor(): string {
			return this._outlineColor;
		}

		get alignment(): number {
			return this._alignment;
		}

		get marginLeft(): number {
			return this._marginLeft;
		}

		get marginRight(): number {
			return this._marginRight;
		}

		get marginVertical(): number {
			return this._marginVertical;
		}
	};

	export var debugMode: boolean = false;

	export module tags {
		export interface Tag {
			toString(): string;
		}

		export class TagBase implements Tag {
			constructor(private _name: string, ... private _propertyNames: string[]) { }

			/**
			 * @return {string}
			 */
			toString(): string {
				return (
					this._name + " { " +
					this._propertyNames.map(name => name + ": " + this[name]).join(", ") +
					((this._propertyNames.length > 0) ? " " : "") +
					"}"
				);
			}
		}

		export class Comment extends TagBase {
			constructor(private _value: string) {
				super("Comment", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class HardSpace extends TagBase {
			constructor() {
				super("HardSpace");
			}
		}

		export class NewLine extends TagBase {
			constructor() {
				super("NewLine");
			}
		}

		export class Text extends TagBase {
			constructor(private _value: string) {
				super("Text", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class Italic extends TagBase {
			constructor(private _value: boolean) {
				super("Italic", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}
		export class Bold extends TagBase {
			constructor(private _value: Object) {
				super("Bold", "value");
			}

			get value(): Object {
				return this._value;
			}
		}
		export class Underline extends TagBase {
			constructor(private _value: boolean) {
				super("Underline", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}
		export class Strikeout extends TagBase {
			constructor(private _value: boolean) {
				super("Strikeout", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}

		export class Border extends TagBase {
			constructor(private _value: number) {
				super("Border", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Blur extends TagBase {
			constructor(private _value: number) {
				super("Blur", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class FontName extends TagBase {
			constructor(private _value: string) {
				super("FontName", "value");
			}

			get value(): string {
				return this._value;
			}
		}
		export class FontSize extends TagBase {
			constructor(private _value: number) {
				super("FontSize", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Frx extends TagBase {
			constructor(private _value: number) {
				super("Frx", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class Fry extends TagBase {
			constructor(private _value: number) {
				super("Fry", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class Frz extends TagBase {
			constructor(private _value: number) {
				super("Frz", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class Fax extends TagBase {
			constructor(private _value: number) {
				super("Fax", "value");
			}

			get value() {
				return this._value;
			}
		}
		export class Fay extends TagBase {
			constructor(private _value: number) {
				super("Fay", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class PrimaryColor extends TagBase {
			constructor(private _value: string) {
				super("PrimaryColor", "value");
			}

			get value(): string {
				return this._value;
			}
		}
		export class OutlineColor extends TagBase {
			constructor(private _value: string) {
				super("OutlineColor", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class Alpha extends TagBase {
			constructor(private _value: number) {
				super("Alpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class PrimaryAlpha extends TagBase {
			constructor(private _value: number) {
				super("PrimaryAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class OutlineAlpha extends TagBase {
			constructor(private _value: number) {
				super("OutlineAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Alignment extends TagBase {
			constructor(private _value: number) {
				super("Alignment", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Reset extends TagBase {
			constructor(private _value: string) {
				super("Reset", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class Pos extends TagBase {
			constructor(private _x: number, private _y: number) {
				super("Pos", "x", "y");
			}

			get x(): number {
				return this._x;
			}

			get y(): number {
				return this._y;
			}
		}

		export class Fade extends TagBase {
			constructor(private _start: number, private _end: number) {
				super("Fade", "start", "end");
			}

			get start(): number {
				return this._start;
			}

			get end(): number {
				return this._end;
			}
		}
	}
}
