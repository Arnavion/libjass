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

import types = require("./misc");
import valueOrDefault = types.valueOrDefault;
import BorderStyle = types.BorderStyle;

import parser = require("../parser");

import parts = require("../parts/index");

import map = require("../utility/map");

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
class Style {
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

	constructor(template: map.Map<string, string>) {
		this._name = template.get("Name");
		if (this._name === undefined || this._name === null || this._name.constructor !== String) {
			throw new Error("Style doesn't have a name.");
		}

		this._italic = template.get("Italic") === "-1";
		this._bold = template.get("Bold") === "-1";
		this._underline = template.get("Underline") === "-1";
		this._strikeThrough = template.get("StrikeOut") === "-1";

		this._fontName = template.get("Fontname");
		this._fontSize = valueOrDefault(template, "Fontsize", parseFloat, value => !isNaN(value), "50");

		this._fontScaleX = valueOrDefault(template, "ScaleX", parseFloat, value => !isNaN(value), "100") / 100;
		this._fontScaleY = valueOrDefault(template, "ScaleY", parseFloat, value => !isNaN(value), "100") / 100;

		this._letterSpacing = valueOrDefault(template, "Spacing", parseFloat, value => !isNaN(value), "0");

		this._rotationZ = valueOrDefault(template, "Angle", parseFloat, value => !isNaN(value), "0");

		this._primaryColor = valueOrDefault(template, "PrimaryColour", str => <parts.Color>parser.parse(str, "colorWithAlpha"), null, "&H0000FFFF");
		this._secondaryColor = valueOrDefault(template, "SecondaryColour", str => <parts.Color>parser.parse(str, "colorWithAlpha"), null, "&H00000000");
		this._outlineColor = valueOrDefault(template, "OutlineColour", str => <parts.Color>parser.parse(str, "colorWithAlpha"), null, "&H00000000");
		this._shadowColor = valueOrDefault(template, "BackColour", str => <parts.Color>parser.parse(str, "colorWithAlpha"), null, "&H00000000");

		this._outlineThickness = valueOrDefault(template, "Outline", parseFloat, value => !isNaN(value), "1");
		this._borderStyle = valueOrDefault(template, "BorderStyle", parseInt, value => !isNaN(value), "1");

		this._shadowDepth = valueOrDefault(template, "Shadow", parseFloat, value => !isNaN(value), "1");

		this._alignment = valueOrDefault(template, "Alignment", parseInt, value => !isNaN(value), "2");

		this._marginLeft = valueOrDefault(template, "MarginL", parseFloat, value => !isNaN(value), "80");
		this._marginRight = valueOrDefault(template, "MarginR", parseFloat, value => !isNaN(value), "80");
		this._marginVertical = valueOrDefault(template, "MarginV", parseFloat, value => !isNaN(value), "35");
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

export = Style;
