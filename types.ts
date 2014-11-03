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
			var styleLine = parser.parseLineIntoTypedTemplate(line, this._stylesFormatSpecifier);
			if (styleLine === null || styleLine.type !== "Style") {
				return;
			}

			var styleTemplate = styleLine.template;

			if (libjass.verboseMode) {
				var repr = "";
				styleTemplate.forEach((value, key) => repr += key + " = " + value + ", ");
				console.log("Read style: " + repr);
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
			var dialogueLine = parser.parseLineIntoTypedTemplate(line, this._dialoguesFormatSpecifier);
			if (dialogueLine === null || dialogueLine.type !== "Dialogue") {
				return;
			}

			var dialogueTemplate = dialogueLine.template;

			if (libjass.verboseMode) {
				var repr = "";
				dialogueTemplate.forEach((value, key) => repr += key + " = " + value + ", ");
				console.log("Read dialogue: " + repr);
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
			if ((<{ [index: string]: any }><any>Format)[Format[type]] !== type) {
				throw new Error("Illegal value of type: " + type);
			}

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
					throw new Error("Illegal value of type: " + type);
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
			if ((<{ [index: string]: any }><any>Format)[Format[type]] !== type) {
				throw new Error("Illegal value of type: " + type);
			}

			var xhr = new XMLHttpRequest();
			var result = ASS.fromStream(new parser.XhrStream(xhr), type);
			xhr.open("GET", url, true);
			xhr.send();
			return result;
		}
	}

	/**
	 * The format of the string passed to {@link libjass.ASS.fromString}
	 */
	export enum Format {
		ASS,
		SRT
	}

	/**
	 * The wrapping style defined in the {@link libjass.ScriptProperties}
	 */
	export enum WrappingStyle {
		SmartWrappingWithWiderTopLine = 0,
		SmartWrappingWithWiderBottomLine = 3,
		EndOfLineWrapping = 1,
		NoLineWrapping = 2,
	}

	/**
	 * This class represents the properties of a {@link libjass.ASS} script.
	 */
	export class ScriptProperties {
		private _resolutionX: number;
		private _resolutionY: number;
		private _wrappingStyle: WrappingStyle;
		private _scaleBorderAndShadow: boolean;

		/**
		 * The horizontal script resolution.
		 *
		 * @type {number}
		 */
		get resolutionX(): number {
			return this._resolutionX;
		}

		/**
		 * The horizontal script resolution.
		 *
		 * @type {number}
		 */
		set resolutionX(value: number) {
			this._resolutionX = value;
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
		 * The vertical script resolution.
		 *
		 * @type {number}
		 */
		set resolutionY(value: number) {
			this._resolutionY = value;
		}

		/**
		 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
		 *
		 * @type {number}
		 */
		get wrappingStyle(): WrappingStyle {
			return this._wrappingStyle;
		}

		/**
		 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
		 *
		 * @type {number}
		 */
		set wrappingStyle(value: WrappingStyle) {
			this._wrappingStyle = value;
		}

		/**
		 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
		 *
		 * @type {boolean}
		 */
		get scaleBorderAndShadow(): boolean {
			return this._scaleBorderAndShadow;
		}

		/**
		 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
		 *
		 * @type {boolean}
		 */
		set scaleBorderAndShadow(value: boolean) {
			this._scaleBorderAndShadow = value;
		}
	}

	/**
	 * The border style defined in the {@link libjass.Style} properties.
	 */
	export enum BorderStyle {
		Outline = 1,
		OpaqueBox = 3,
	}

	/**
	 * This class represents a single global style declaration in a {@link libjass.ASS} script. The styles can be obtained via the {@link libjass.ASS.styles} property.
	 *
	 * @param {!Map.<string, string>} template The template object that contains the style's properties. It is a map of the string values read from the ASS file.
	 * @param {string} template["Name"] The name of the style
	 * @param {string} template["Italic"] -1 if the style is italicized
	 * @param {string} template["Bold"] -1 if the style is bold
	 * @param {string} template["Underline"] -1 if the style is underlined
	 * @param {string} template["StrikeOut"] -1 if the style is struck-through
	 * @param {string} template["Fontname"] The name of the font
	 * @param {string} template["Fontsize"] The size of the font
	 * @param {string} template["ScaleX"] The horizontal scaling of the font
	 * @param {string} template["ScaleY"] The vertical scaling of the font
	 * @param {string} template["Spacing"] The letter spacing of the font
	 * @param {string} template["PrimaryColour"] The primary color
	 * @param {string} template["OutlineColour"] The outline color
	 * @param {string} template["BackColour"] The shadow color
	 * @param {string} template["Outline"] The outline thickness
	 * @param {string} template["Shadow"] The shadow depth
	 * @param {string} template["Alignment"] The alignment number
	 * @param {string} template["MarginL"] The left margin
	 * @param {string} template["MarginR"] The right margin
	 * @param {string} template["MarginV"] The vertical margin
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

		private _rotationZ: number;

		private _primaryColor: parts.Color;
		private _secondaryColor: parts.Color;
		private _outlineColor: parts.Color;
		private _shadowColor: parts.Color;

		private _outlineThickness: number;
		private _borderStyle: BorderStyle;

		private _shadowDepth: number;

		private _alignment: number;

		private _marginLeft: number;
		private _marginRight: number;
		private _marginVertical: number;

		constructor(template: Map<string, string>) {
			this._name = template.get("Name");

			this._italic = template.get("Italic") === "-1";
			this._bold = template.get("Bold") === "-1";
			this._underline = template.get("Underline") === "-1";
			this._strikeThrough = template.get("StrikeOut") === "-1";

			this._fontName = template.get("Fontname");
			this._fontSize = parseFloat(template.get("Fontsize"));

			this._fontScaleX = parseFloat(template.get("ScaleX")) / 100;
			this._fontScaleY = parseFloat(template.get("ScaleY")) / 100;

			this._letterSpacing = parseFloat(template.get("Spacing"));

			this._rotationZ = parseFloat(template.get("Angle"));

			this._primaryColor = <parts.Color>parser.parse(template.get("PrimaryColour"), "colorWithAlpha");
			this._secondaryColor = <parts.Color>parser.parse(template.get("SecondaryColour"), "colorWithAlpha");
			this._outlineColor = <parts.Color>parser.parse(template.get("OutlineColour"), "colorWithAlpha");
			this._shadowColor = <parts.Color>parser.parse(template.get("BackColour"), "colorWithAlpha");

			this._outlineThickness = parseFloat(template.get("Outline"));
			this._borderStyle = parseInt(template.get("BorderStyle"));

			this._shadowDepth = parseFloat(template.get("Shadow"));

			this._alignment = parseInt(template.get("Alignment"));

			this._marginLeft = parseFloat(template.get("MarginL"));
			this._marginRight = parseFloat(template.get("MarginR"));
			this._marginVertical = parseFloat(template.get("MarginV"));
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
		 * The default Z-rotation of this style.
		 *
		 * @type {number}
		 */
		get rotationZ(): number {
			return this._rotationZ;
		}

		/**
		 * The color of this style's font.
		 *
		 * @type {!libjass.parts.Color}
		 */
		get primaryColor(): parts.Color {
			return this._primaryColor;
		}

		/**
		 * The alternate color of this style's font, used in karaoke.
		 *
		 * @type {!libjass.parts.Color}
		 */
		get secondaryColor(): parts.Color {
			return this._secondaryColor;
		}

		/**
		 * The color of this style's outline.
		 *
		 * @type {!libjass.parts.Color}
		 */
		get outlineColor(): parts.Color {
			return this._outlineColor;
		}

		/**
		 * The color of this style's shadow.
		 *
		 * @type {!libjass.parts.Color}
		 */
		get shadowColor(): parts.Color {
			return this._shadowColor;
		}

		/**
		 * The thickness of this style's outline.
		 *
		 * @type {number}
		 */
		get outlineThickness(): number {
			return this._outlineThickness;
		}

		/**
		 * The border style of this style.
		 *
		 * @type {number}
		 */
		get borderStyle(): BorderStyle {
			return this._borderStyle;
		}

		/**
		 * The depth of this style's shadow.
		 *
		 * @type {number}
		 */
		get shadowDepth(): number {
			return this._shadowDepth;
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
	}

	/**
	 * This class represents a dialogue in a {@link libjass.ASS} script.
	 *
	 * @param {!Map.<string, string>} template The template object that contains the dialogue's properties. It is a map of the string values read from the ASS file.
	 * @param {string} template["Style"] The name of the default style of this dialogue
	 * @param {string} template["Start"] The start time
	 * @param {string} template["End"] The end time
	 * @param {string} template["Layer"] The layer number
	 * @param {string} template["Text"] The text of this dialogue
	 * @param {ASS} ass The ASS object to which this dialogue belongs
	 */
	export class Dialogue {
		private static _lastDialogueId = -1;

		private _id: number;

		private _style: Style;

		private _start: number;
		private _end: number;

		private _layer: number;
		private _alignment: number;

		private _rawPartsString: string;
		private _parts: parts.Part[] = null;

		private _sub: HTMLDivElement = null;

		constructor(template: Map<string, string>, ass: ASS) {
			this._id = ++Dialogue._lastDialogueId;

			this._style = ass.styles.get(template.get("Style"));

			this._start = Dialogue._toTime(template.get("Start"));
			this._end = Dialogue._toTime(template.get("End"));

			this._layer = Math.max(parseInt(template.get("Layer")), 0);

			this._rawPartsString = template.get("Text");
		}

		/**
		 * The unique ID of this dialogue. Auto-generated.
		 *
		 * @type {number}
		 */
		get id(): number {
			return this._id;
		}

		/**
		 * The start time of this dialogue.
		 *
		 * @type {number}
		 */
		get start(): number {
			return this._start;
		}

		/**
		 * The end time of this dialogue.
		 *
		 * @type {number}
		 */
		get end(): number {
			return this._end;
		}

		/**
		 * The default style of this dialogue.
		 *
		 * @type {!libjass.Style}
		 */
		get style(): Style {
			return this._style;
		}

		/**
		 * The alignment number of this dialogue.
		 *
		 * @type {number}
		 */
		get alignment(): number {
			if (this._parts === null) {
				this._parsePartsString();
			}

			return this._alignment;
		}

		/**
		 * The layer number of this dialogue.
		 *
		 * @type {number}
		 */
		get layer(): number {
			return this._layer;
		}

		/**
		 * The {@link libjass.parts} of this dialogue.
		 *
		 * @type {!Array.<!libjass.parts.Part>}
		 */
		get parts(): parts.Part[] {
			if (this._parts === null) {
				this._parsePartsString();
			}

			return this._parts;
		}

		/**
		 * @return {string} A simple representation of this dialogue's properties and parts.
		 */
		toString(): string {
			return "#" + this._id + " [" + this._start.toFixed(3) + "-" + this._end.toFixed(3) + "] " + ((this._parts !== null) ? this._parts.join(", ") : this._rawPartsString);
		}

		/**
		 * Parses this dialogue's parts from the raw parts string.
		 */
		private _parsePartsString(): void {
			this._parts = <parts.Part[]>parser.parse(this._rawPartsString, "dialogueParts");

			this._alignment = this._style.alignment;

			this._parts.forEach((part, index) => {
				if (part instanceof parts.Alignment) {
					this._alignment = (<parts.Alignment>part).value;
				}
				else if (part instanceof parts.Move) {
					var movePart = <parts.Move>part;

					if (movePart.t1 === null || movePart.t2 === null) {
						this._parts[index] =
							new parts.Move(
								movePart.x1, movePart.y1, movePart.x2, movePart.y2,
								0, this._end - this._start
							);
					}
				}
				else if (part instanceof parts.Transform) {
					var transformPart = <parts.Transform>part;

					if (transformPart.start === null || transformPart.end === null || transformPart.accel === null) {
						this._parts[index] =
							new parts.Transform(
								(transformPart.start === null) ? 0 : transformPart.start,
								(transformPart.end === null) ? (this._end - this._start) : transformPart.end,
								(transformPart.accel === null) ? 1 : transformPart.accel,
								transformPart.tags
							);
					}
				}
			});

			if (libjass.debugMode) {
				var possiblyIncorrectParses = this._parts.filter(part => part instanceof parts.Comment && (<parts.Comment>part).value.indexOf("\\") !== -1);
				if (possiblyIncorrectParses.length > 0) {
					console.warn(
						"Possible incorrect parse:\n" +
						this._rawPartsString + "\n" +
						"was parsed as\n" +
						this.toString() + "\n" +
						"The possibly incorrect parses are:\n" +
						possiblyIncorrectParses.join("\n")
					);
				}
			}
		}

		/**
		 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
		 *
		 * @param {string} str
		 * @return {number}
		 */
		private static _toTime(str: string): number {
			return str.split(":").reduce<number>((previousValue, currentValue) => previousValue * 60 + parseFloat(currentValue), 0);
		}
	}

	/**
	 * A property.
	 */
	export interface Property {
		/**
		 * @type {string}
		 */
		name: string;

		/**
		 * @type {string}
		 */
		value: string;
	}

	/**
	 * A template object with a particular type.
	 */
	export interface TypedTemplate {
		/**
		 * @type {string}
		 */
		type: string;

		/**
		 * @type {!Map.<string, string>}
		 */
		template: Map<string, string>;
	}
}
