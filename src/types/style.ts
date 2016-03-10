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

import { valueOrDefault, BorderStyle } from "./misc";

import { parse } from "../parser/parse";

import { Color } from "../parts";

import { registerClass as serializable } from "../serialization";

import { Map } from "../utility/map";

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
@serializable
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

	private _primaryColor: Color;
	private _secondaryColor: Color;
	private _outlineColor: Color;
	private _shadowColor: Color;

	private _outlineThickness: number;
	private _borderStyle: BorderStyle;

	private _shadowDepth: number;

	private _alignment: number;

	private _marginLeft: number;
	private _marginRight: number;
	private _marginVertical: number;

	constructor(template: Map<string, string>) {
		{
			const normalizedTemplate = new Map<string, string>();
			template.forEach((value, key) => {
				normalizedTemplate.set(key.toLowerCase(), value);
			});
			template = normalizedTemplate;
		}

		this._name = template.get("name");
		if (this._name === undefined || this._name === null || this._name.constructor !== String) {
			throw new Error("Style doesn't have a name.");
		}
		this._name = this._name.replace(/^\*+/, "");

		this._italic = !!valueOrDefault(template, "italic", parseFloat, value => !isNaN(value), "0");
		this._bold = !!valueOrDefault(template, "bold", parseFloat, value => !isNaN(value), "0");
		this._underline = !!valueOrDefault(template, "underline", parseFloat, value => !isNaN(value), "0");
		this._strikeThrough = !!valueOrDefault(template, "strikeout", parseFloat, value => !isNaN(value), "0");

		this._fontName = valueOrDefault(template, "fontname", str => str, value => value.constructor === String, "sans-serif");
		this._fontSize = valueOrDefault(template, "fontsize", parseFloat, value => !isNaN(value), "18");

		this._fontScaleX = valueOrDefault(template, "scalex", parseFloat, value => value >= 0, "100") / 100;
		this._fontScaleY = valueOrDefault(template, "scaley", parseFloat, value => value >= 0, "100") / 100;

		this._letterSpacing = valueOrDefault(template, "spacing", parseFloat, value => value >= 0, "0");

		this._rotationZ = valueOrDefault(template, "angle", parseFloat, value => !isNaN(value), "0");

		this._primaryColor = valueOrDefault(template, "primarycolour", str => parse(str, "colorWithAlpha") as Color, null, "&H00FFFFFF");
		this._secondaryColor = valueOrDefault(template, "secondarycolour", str => parse(str, "colorWithAlpha") as Color, null, "&H00FFFF00");
		this._outlineColor = valueOrDefault(template, "outlinecolour", str => parse(str, "colorWithAlpha") as Color, null, "&H00000000");
		this._shadowColor = valueOrDefault(template, "backcolour", str => parse(str, "colorWithAlpha") as Color, null, "&H80000000");

		this._outlineThickness = valueOrDefault(template, "outline", parseFloat, value => value >= 0, "2");
		this._borderStyle = valueOrDefault(template, "borderstyle", parseInt, value => (BorderStyle as any)[(BorderStyle as any)[value]] === value, "1");

		this._shadowDepth = valueOrDefault(template, "shadow", parseFloat, value => value >= 0, "3");

		this._alignment = valueOrDefault(template, "alignment", parseInt, value => value >= 1 && value <= 9, "2");

		this._marginLeft = valueOrDefault(template, "marginl", parseFloat, value => !isNaN(value), "20");
		this._marginRight = valueOrDefault(template, "marginr", parseFloat, value => !isNaN(value), "20");
		this._marginVertical = valueOrDefault(template, "marginv", parseFloat, value => !isNaN(value), "20");
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
	get primaryColor(): Color {
		return this._primaryColor;
	}

	/**
	 * The alternate color of this style's font, used in karaoke.
	 *
	 * @type {!libjass.parts.Color}
	 */
	get secondaryColor(): Color {
		return this._secondaryColor;
	}

	/**
	 * The color of this style's outline.
	 *
	 * @type {!libjass.parts.Color}
	 */
	get outlineColor(): Color {
		return this._outlineColor;
	}

	/**
	 * The color of this style's shadow.
	 *
	 * @type {!libjass.parts.Color}
	 */
	get shadowColor(): Color {
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
