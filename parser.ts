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
	export interface Parser {
		parse(input: string, startRule?: string): any
	}

	export class ASS {
		private _info: Info;
		private _styles: Style[] = [];
		private _dialogues: Dialogue[] = [];

		/**
		 * This class represents an ASS script. It contains a Info object with global information about the script,
		 * an array of Styles, and an array of Dialogues.
		 *
		 * @constructor
		 * @param {string} rawASS
		 * @param {{parse: function(string, string=): !*}} parser
		 */
		constructor(rawASS: string, parser: Parser) {
			// Make an iterable for all the lines in the script file.
			var lines = rawASS.replace(/\r$/gm, "").split("\n").toIterable().map((entry: any[]) => <string>entry[1]);


			// Create the script info object
			var infoTemplate = {};

			// Get script info key-value pairs from the script info section
			Iterator(ASS._readSectionLines(lines, "Script Info")).forEach((keyValuePair: string[]) => {
				infoTemplate[keyValuePair[0]] = keyValuePair[1];
			});
			this._info = new Info(infoTemplate);


			// Get styles from the styles section
			Iterator(ASS._readSectionTemplates(lines, "V4+ Styles")).forEach((templateEntry: any[]) => {
				var templateType: string = templateEntry[0];
				if (templateType === "Style") {
					var template: Object = templateEntry[1];

					if (libjass.debugMode) {
						console.log("Read style: " + JSON.stringify(template));
					}

					// Create the style and add it into the styles array
					this._styles.push(new Style(template, parser));
				}
			});


			// Get dialogues from the events section
			Iterator(ASS._readSectionTemplates(lines, "Events")).forEach((templateEntry: any[]) => {
				var templateType: string = templateEntry[0];
				if (templateType === "Dialogue") {
					var template: Object = templateEntry[1];

					if (libjass.debugMode) {
						console.log("Read dialogue: " + JSON.stringify(template));
					}

					// Create the dialogue and add it to the dialogues array
					this._dialogues.push(new Dialogue(template, this._info, this._styles, parser));
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

		/**
		 * Returns an Iterable of the key-value pairs in the lines in the script from the given section.
		 *
		 * @param {Iterable} lines The lines of the script
		 * @param {string} sectionName The name of the section to parse
		 * @return {Iterable} An Iterable of key-value pairs. Each key-value pair is an array of two strings, the key and the value.
		 */
		private static _readSectionLines(lines: Iterable, sectionName: string): Iterable {
			return lines
				// Skip all lines till the script info section begins
				.skipWhile((line: string) => line !== "[" + sectionName + "]")
				// Skip the section header
				.skip(1)
				// Take all the lines till the section ends
				.takeWhile((line: string) => !line.startsWith("["))
				// Parse the line into a key-value pair
				.map((line: string): string[] => {
					var match = /^([^:]+):\s*(.+)/.exec(line);

					if (match !== null) {
						return [match[1], match[2]];
					}

					return null;
				})
				.filter((keyValuePair: string[]) => keyValuePair !== null);
		}

		/**
		 * Returns an Iterable of the templates in the lines in the script from the given section.
		 *
		 * @param {Iterable} lines The lines of the script
		 * @param {string} sectionName The name of the section to parse
		 * @return {Iterable} An Iterable of template entries. Each template is an array whose first element is the template type and the second element is the template object.
		 */
		private static _readSectionTemplates(lines: Iterable, sectionName: string): Iterable {
			var formatParts: string[] = null;

			return ASS._readSectionLines(lines, sectionName).map((keyValuePair: string[]) => {
				var key = keyValuePair[0];
				var value = keyValuePair[1];

				// If this is a format line, parse its constituents...
				if (key === "Format") {
					formatParts = value.split(",").map((formatPart: string) => formatPart.trim());
					return null;
				}

				// ... else parse this line according to the format constituents
				if (formatParts === null) {
					throw new Error("Format specification not found.");
				}

				var template: Object = {};

				var lineParts = value.split(",");
				if (lineParts.length > formatParts.length) {
					lineParts[formatParts.length - 1] = lineParts.slice(formatParts.length - 1).join(",");
				}

				formatParts.forEach((key, index) => {
					template[key] = lineParts[index];
				});

				return [key, template];
			}).filter((templateEntry: Array) => templateEntry !== null);
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
		private _playResX: number;
		private _playResY: number;

		private _scaleX: number;
		private _scaleY: number;

		private _dpi: number;

		constructor(template: Object) {
			// Parse the horizontal script resolution
			this._playResX = parseInt(template["PlayResX"]);

			// Parse the vertical script resolution
			this._playResY = parseInt(template["PlayResY"]);
		}

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
		private _name: string;

		private _italic: boolean;
		private _bold: Object;
		private _underline: boolean;
		private _strikethrough: boolean;

		private _outlineWidth: number;

		private _fontName: string;
		private _fontSize: number;

		private _primaryColor: tags.Color;
		private _outlineColor: tags.Color;

		private _alignment: number;

		private _marginLeft: number;
		private _marginRight: number;
		private _marginVertical: number;

		constructor(template: Object, parser: Parser) {
			this._name = template["Name"];

			this._italic = template["Italic"] === "-1";
			this._bold = template["Bold"] === "-1";
			this._underline = template["Underline"] === "-1";
			this._strikethrough = template["StrikeOut"] === "-1";

			this._outlineWidth = parseFloat(template["Outline"]);

			this._fontName = template["Fontname"];
			this._fontSize = parseFloat(template["Fontsize"]);

			this._primaryColor = <tags.Color>parser.parse(template["PrimaryColour"], "colorWithAlpha");
			this._outlineColor = <tags.Color>parser.parse(template["OutlineColour"], "colorWithAlpha");

			this._alignment = parseInt(template["Alignment"]);

			this._marginLeft = parseFloat(template["MarginL"]);
			this._marginRight = parseFloat(template["MarginR"]);
			this._marginVertical = parseFloat(template["MarginV"]);
		}

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
