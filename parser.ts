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

"use strict";

module libjass {
	export interface Parser {
		parse(input: string, startRule?: string): any
	}

	export var parser: Parser;

	export class ASS {
		private _resolutionX: number;
		private _resolutionY: number;

		private _scaleX: number;
		private _scaleY: number;

		private _dpi: number;

		private _styles: Style[] = [];
		private _dialogues: Dialogue[] = [];

		/**
		 * This class represents an ASS script. It contains a Info object with global information about the script,
		 * an array of Styles, and an array of Dialogues.
		 *
		 * @constructor
		 * @param {string} rawASS
		 */
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
					var styleTemplate: Object = line.template;

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
					var dialogueTemplate: Object = line.template;

					if (libjass.verboseMode) {
						console.log("Read dialogue: " + JSON.stringify(dialogueTemplate), dialogueTemplate);
					}

					// Create the dialogue and add it to the dialogues array
					this._dialogues.push(new Dialogue(dialogueTemplate, this));
				}
			});
		}

		get resolutionX(): number {
			return this._resolutionX;
		}

		get resolutionY(): number {
			return this._resolutionY;
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

		get styles(): Style[] {
			return this._styles;
		}

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

		constructor(template: Object) {
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

		get strikeThrough(): boolean {
			return this._strikeThrough;
		}

		get fontName(): string {
			return this._fontName;
		}

		get fontSize(): number {
			return this._fontSize;
		}

		get fontScaleX(): number {
			return this._fontScaleX;
		}

		get fontScaleY(): number {
			return this._fontScaleY;
		}

		get letterSpacing(): number {
			return this._letterSpacing;
		}

		get primaryColor(): tags.Color {
			return this._primaryColor;
		}

		get outlineColor(): tags.Color {
			return this._outlineColor;
		}

		get outlineWidth(): number {
			return this._outlineWidth;
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
	export var verboseMode: boolean = false;
}
