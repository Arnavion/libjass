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
///<reference path="tags.ts" />

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
			var playResX: number = null;
			var playResY: number = null;

			// Style variables
			this._styles = [];

			// The indices of the various constituents of a Style in a "Style: " line
			var nameIndex: number = null;
			var italicIndex: number = null;
			var boldIndex: number = null;
			var underlineIndex: number = null;
			var strikethroughIndex: number = null;
			var outlineWidthIndex: number = null;
			var fontNameIndex: number = null;
			var fontSizeIndex: number = null;
			var primaryColorIndex: number = null;
			var outlineColorIndex: number = null;
			var alignmentIndex: number = null;
			var marginLeftIndex: number = null;
			var marginRightIndex: number = null;
			var marginVerticalIndex: number = null;

			// Dialogue variables
			this._dialogues = [];

			// The indices of the various constituents of a Dialogue in a "Dialogue: " line
			var styleIndex: number = null;
			var startIndex: number = null;
			var endIndex: number = null;
			var textIndex: number = null;
			var layerIndex: number = null;


			// Remove all lines and make an iterable for all the lines in the script file.
			var lines = rawASS.replace(/\r$/gm, "").split("\n").toIterable().map((entry: Array) => entry[1]);


			// Get script info from the script info section
			Iterator(ASS._readSection(lines, "Script Info")).forEach((line: string) => {
				// Parse the horizontal script resolution line
				if (line.startsWith("PlayResX:")) {
					playResX = parseInt(line.substring("PlayResX:".length).trim());
				}
				// Parse the vertical script resolution line
				else if (line.startsWith("PlayResY:")) {
					playResY = parseInt(line.substring("PlayResY:".length).trim());
				}
			});

			if (playResX !== null && playResY !== null) {
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
						nameIndex === null ||
						italicIndex === null ||
						boldIndex === null ||
						underlineIndex === null ||
						strikethroughIndex === null ||
						outlineWidthIndex === null ||
						fontNameIndex === null ||
						fontSizeIndex === null ||
						primaryColorIndex === null ||
						outlineColorIndex === null ||
						alignmentIndex === null ||
						marginLeftIndex === null ||
						marginRightIndex === null ||
						marginVerticalIndex === null
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
						<tags.Color>dialogueParser.parse(lineParts[primaryColorIndex], "colorWithAlpha"),
						<tags.Color>dialogueParser.parse(lineParts[outlineColorIndex], "colorWithAlpha"),
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
						styleIndex === null ||
						startIndex === null ||
						endIndex === null ||
						textIndex === null ||
						layerIndex === null
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
			private _primaryColor: tags.Color, private _outlineColor: tags.Color,
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

		get primaryColor(): tags.Color {
			return this._primaryColor;
		}

		get outlineColor(): tags.Color {
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
}
