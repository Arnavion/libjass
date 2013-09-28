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

///<reference path="libjass.ts" />

module libjass {
	export interface Parser {
		parse(input: string, startRule?: string): any
	}

	export var parser: Parser;

	/**
	 * This class represents an ASS script. It contains information about the script, an array of Styles, and an array of Dialogues.
	 *
	 * @constructor
	 * @param {string} rawASS The raw text of the ASS script.
	 *
	 * @memberof libjass
	 */
	export class ASS {
		private _resolutionX: number;
		private _resolutionY: number;

		private _scaleX: number;
		private _scaleY: number;

		private _dpi: number;

		private _styles: Style[] = [];
		private _dialogues: Dialogue[] = [];

		constructor(rawASS: string) {
			rawASS = rawASS.replace(/\r$/gm, "");

			var script = libjass.parser.parse(rawASS, "script");

			// Get the script info template
			var infoTemplate: Object = script["Script Info"];

			if (libjass.verboseMode) {
				console.log("Read script info: " + JSON.stringify(infoTemplate), infoTemplate);
			}

			// Parse the horizontal script resolution
			this._resolutionX = parseInt(infoTemplate["PlayResX"]);

			// Parse the vertical script resolution
			this._resolutionY = parseInt(infoTemplate["PlayResY"]);

			// Get styles from the styles section
			script["V4+ Styles"].forEach((line: any) => {
				if (line.type === "Style") {
					var styleTemplate: Template = line.template;

					if (libjass.verboseMode) {
						console.log("Read style: " + JSON.stringify(styleTemplate), styleTemplate);
					}

					// Create the style and add it to the styles array
					this._styles.push(new Style(styleTemplate));
				}
			});

			// Get dialogues from the events section
			script["Events"].forEach((line: any) => {
				if (line.type === "Dialogue") {
					var dialogueTemplate: Template = line.template;

					if (libjass.verboseMode) {
						console.log("Read dialogue: " + JSON.stringify(dialogueTemplate), dialogueTemplate);
					}

					// Create the dialogue and add it to the dialogues array
					this._dialogues.push(new Dialogue(dialogueTemplate, this));
				}
			});
		}

		/**
		 * The horizontal script resolution.
		 *
		 * @type {number}
		 */
		get resolutionX(): number {
			return this._resolutionX;
		}

		/**
		 * The vertical script resolution.
		 *
		 * @type {number}
		 */
		get resolutionY(): number {
			return this._resolutionY;
		}

		/**
		 * After calling ASS.scaleTo(), this is the multiplicative factor to scale horizontal script resolution to video resolution.
		 *
		 * @type {number}
		 */
		get scaleX(): number {
			return this._scaleX;
		}

		/**
		 * After calling ASS.scaleTo(), this is the multiplicative factor to scale vertical script resolution to video resolution.
		 *
		 * @type {number}
		 */
		get scaleY(): number {
			return this._scaleY;
		}

		/**
		 * The DPI of the target device.
		 *
		 * @type {number}
		 */
		get dpi(): number {
			return this._dpi;
		}
		set dpi(value: number) {
			this._dpi = value;
		}

		/**
		 * The styles in this script.
		 *
		 * @type {!Array.<!libjass.Style>}
		 */

		get styles(): Style[] {
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
		 * This method takes in the actual video height and width and prepares the scaleX and scaleY
		 * properties according to the script resolution.
		 *
		 * @param {number} videoWidth The width of the video, in pixels
		 * @param {number} videoHeight The height of the video, in pixels
		 */
		scaleTo(videoWidth: number, videoHeight: number): void {
			this._scaleX = videoWidth / this._resolutionX;
			this._scaleY = videoHeight / this._resolutionY;

			// Any dialogues which have been rendered need to be re-rendered.
			this._dialogues.forEach(dialogue => {
				dialogue.unPreRender();
			});
		}
	}

	/**
	 * This class represents a single global style declaration in an ASS script. The styles can be obtained via the ASS.styles property.
	 *
	 * @constructor
	 * @param {!Object} template The template object that contains the style's properties. It is a map of the string values read from the ASS file.
	 * @param {string} template["Name"] The name of the style
	 * @param {string} template["Italic"] -1 if the style is italicized
	 * @param {string} template["Bold"] -1 if the style is bold
	 * @param {string} template["Underline"] -1 if the style is underlined
	 * @param {string} template["StrikeOut"] -1 if the style is struck-through
	 * @param {string} template["OutlineWidth"] The outline width
	 * @param {string} template["Fontname"] The name of the font
	 * @param {string} template["Fontsize"] The size of the font
	 * @param {string} template["ScaleX"] The horizontal scaling of the font
	 * @param {string} template["ScaleY"] The vertical scaling of the font
	 * @param {string} template["Spacing"] The letter spacing of the font
	 * @param {string} template["PrimaryColor"] The primary color
	 * @param {string} template["OutlineColor"] The outline color
	 * @param {string} template["Outline"] The outline width
	 * @param {string} template["Alignment"] The alignment number
	 * @param {string} template["MarginL"] The left margin
	 * @param {string} template["MarginR"] The right margin
	 * @param {string} template["MarginV"] The vertical margin
	 *
	 * @memberof libjass
	 */
	export class Style {
		private _name: string;

		private _italic: boolean;
		private _bold: boolean;
		private _underline: boolean;
		private _strikeThrough: boolean;

		private _fontName: string;
		private _fontSize: number;

		private _fontScaleX: number;
		private _fontScaleY: number;

		private _letterSpacing: number;

		private _primaryColor: tags.Color;
		private _outlineColor: tags.Color;

		private _outlineWidth: number;

		private _alignment: number;

		private _marginLeft: number;
		private _marginRight: number;
		private _marginVertical: number;

		constructor(template: Template) {
			this._name = template["Name"];

			this._italic = template["Italic"] === "-1";
			this._bold = template["Bold"] === "-1";
			this._underline = template["Underline"] === "-1";
			this._strikeThrough = template["StrikeOut"] === "-1";

			this._fontName = template["Fontname"];
			this._fontSize = parseFloat(template["Fontsize"]);

			this._fontScaleX = parseFloat(template["ScaleX"]) / 100;
			this._fontScaleY = parseFloat(template["ScaleY"]) / 100;

			this._letterSpacing = parseFloat(template["Spacing"]);

			this._primaryColor = <tags.Color>parser.parse(template["PrimaryColour"], "colorWithAlpha");
			this._outlineColor = <tags.Color>parser.parse(template["OutlineColour"], "colorWithAlpha");

			this._outlineWidth = parseFloat(template["Outline"]);

			this._alignment = parseInt(template["Alignment"]);

			this._marginLeft = parseFloat(template["MarginL"]);
			this._marginRight = parseFloat(template["MarginR"]);
			this._marginVertical = parseFloat(template["MarginV"]);
		}

		/**
		 * The name of this style.
		 *
		 * @type {string}
		 */
		get name(): string {
			return this._name;
		}

		/**
		 * Whether this style is italicized or not.
		 *
		 * @type {string}
		 */
		get italic(): boolean {
			return this._italic;
		}

		/**
		 * Whether this style is bold or not.
		 *
		 * @type {boolean}
		 */
		get bold(): boolean {
			return this._bold;
		}

		/**
		 * Whether this style is underlined or not.
		 *
		 * @type {boolean}
		 */
		get underline(): boolean {
			return this._underline;
		}

		/**
		 * Whether this style is struck-through or not.
		 *
		 * @type {boolean}
		 */
		get strikeThrough(): boolean {
			return this._strikeThrough;
		}

		/**
		 * The name of this style's font.
		 *
		 * @type {string}
		 */
		get fontName(): string {
			return this._fontName;
		}

		/**
		 * The size of this style's font.
		 *
		 * @type {number}
		 */
		get fontSize(): number {
			return this._fontSize;
		}

		/**
		 * The horizontal scaling of this style's font.
		 *
		 * @type {number}
		 */
		get fontScaleX(): number {
			return this._fontScaleX;
		}

		/**
		 * The vertical scaling of this style's font.
		 *
		 * @type {number}
		 */
		get fontScaleY(): number {
			return this._fontScaleY;
		}

		/**
		 * The letter spacing scaling of this style's font.
		 *
		 * @type {number}
		 */
		get letterSpacing(): number {
			return this._letterSpacing;
		}

		/**
		 * The color of this style's font.
		 *
		 * @type {!libjass.tags.Color}
		 */
		get primaryColor(): tags.Color {
			return this._primaryColor;
		}

		/**
		 * The color of this style's outline.
		 *
		 * @type {!libjass.tags.Color}
		 */
		get outlineColor(): tags.Color {
			return this._outlineColor;
		}

		/**
		 * The width of this style's outline.
		 *
		 * @type {number}
		 */
		get outlineWidth(): number {
			return this._outlineWidth;
		}

		/**
		 * The alignment of dialogues of this style.
		 *
		 * @type {number}
		 */
		get alignment(): number {
			return this._alignment;
		}

		/**
		 * The left margin of dialogues of this style.
		 *
		 * @type {number}
		 */
		get marginLeft(): number {
			return this._marginLeft;
		}

		/**
		 * The right margin of dialogues of this style.
		 *
		 * @type {number}
		 */
		get marginRight(): number {
			return this._marginRight;
		}

		/**
		 * The vertical margin of dialogues of this style.
		 *
		 * @type {number}
		 */
		get marginVertical(): number {
			return this._marginVertical;
		}
	};

	/**
	 * A template object. It is a map of string keys and string values.
	 */
	export interface Template {
		[key: string]: string;
	}

	/**
	 * Debug mode. When true, libjass logs some debug messages.
	 *
	 * @type {boolean}
	 */
	export var debugMode: boolean = false;

	/**
	 * Verbose debug mode. When true, libjass logs some more debug messages. This setting is independent of debugMode.
	 *
	 * @type {boolean}
	 */
	export var verboseMode: boolean = false;
}
