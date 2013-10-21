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
	export module tags {
		/**
		 * Represents a CSS color with red, green, blue and alpha components.
		 *
		 * Instances of this class are immutable.
		 *
		 * @constructor
		 * @param {number} red
		 * @param {number} green
		 * @param {number} blue
		 * @param {number=1} alpha
		 *
		 * @memberof libjass.tags
		 */
		export class Color {
			constructor(private _red: number, private _green: number, private _blue: number, private _alpha: number = 1) { }

			get red(): number {
				return this._red;
			}

			get green(): number {
				return this._green;
			}

			get blue(): number {
				return this._blue;
			}

			get alpha(): number {
				return this._alpha;
			}

			/**
			 * @param {number} value The new alpha. If null, the existing alpha is used.
			 * @return {!libjass.tags.Color} Returns a new Color instance with the same color but the provided alpha.
			 */
			withAlpha(value: number): Color {
				return new Color(this._red, this._green, this._blue, (value !== null) ? value : this._alpha);
			}

			/**
			 * @return {string} The CSS representation "rgba(...)" of this color.
			 */
			toString(): string {
				return "rgba(" + this._red + ", " + this._green + ", " + this._blue + ", " + this._alpha + ")";
			}
		}

		/**
		 * The base interface of the ASS tag classes.
		 */
		export interface Tag {
			toString(): string;
		}

		/**
		 * The base class of the ASS tag classes.
		 *
		 * @constructor
		 *
		 * @param {string} name
		 * @param {...string} propertyNames
		 *
		 * @abstract
		 * @memberof libjass.tags
		 */
		export class TagBase implements Tag {
			constructor(private _name: string, ... private _propertyNames: string[]) { }

			/**
			 * @return {string} A simple representation of this tag's name and properties.
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

		/**
		 * A comment, i.e., any text enclosed in {} that is not understood as an ASS tag.
		 *
		 * @constructor
		 * @param {string} value The text of this comment
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Comment extends TagBase {
			constructor(private _value: string) {
				super("Comment", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		/**
		 * A hard space \h
		 *
		 * @constructor
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class HardSpace extends TagBase {
			constructor() {
				super("HardSpace");
			}
		}

		/**
		 * A newline \N
		 *
		 * @constructor
		 * @param {string} value The text of this comment
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class NewLine extends TagBase {
			constructor() {
				super("NewLine");
			}
		}

		/**
		 * A block of text, i.e., any text not enclosed in {}.
		 *
		 * @constructor
		 * @param {string} value The content of this block of text
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Text extends TagBase {
			constructor(private _value: string) {
				super("Text", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		/**
		 * An italic tag {\i}
		 *
		 * @constructor
		 * @param {?boolean} value {\i1} -> true, {\i0} -> false, {\i} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Italic extends TagBase {
			constructor(private _value: boolean) {
				super("Italic", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}

		/**
		 * A bold tag {\b}
		 *
		 * @constructor
		 * @param {*} value {\b1} -> true, {\b0} -> false, {\b###} -> weight of the bold (number), {\b} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Bold extends TagBase {
			constructor(private _value: Object) {
				super("Bold", "value");
			}

			get value(): Object {
				return this._value;
			}
		}

		/**
		 * An underline tag {\u}
		 *
		 * @constructor
		 * @param {?boolean} value {\u1} -> true, {\u0} -> false, {\u} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Underline extends TagBase {
			constructor(private _value: boolean) {
				super("Underline", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}

		/**
		 * A strike-through tag {\s}
		 *
		 * @constructor
		 * @param {?boolean} value {\s1} -> true, {\s0} -> false, {\s} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class StrikeThrough extends TagBase {
			constructor(private _value: boolean) {
				super("StrikeThrough", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}

		/**
		 * A border tag {\bord}
		 *
		 * @constructor
		 * @param {?number} value {\bord###} -> width (number), {\bord} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Border extends TagBase {
			constructor(private _value: number) {
				super("Border", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A horizontal border tag {\xbord}
		 *
		 * @constructor
		 * @param {?number} value {\xbord###} -> width (number), {\xbord} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class BorderX extends TagBase {
			constructor(private _value: number) {
				super("BorderX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A vertical border tag {\ybord}
		 *
		 * @constructor
		 * @param {?number} value {\ybord###} -> height (number), {\ybord} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class BorderY extends TagBase {
			constructor(private _value: number) {
				super("BorderY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A blur tag {\blur}
		 *
		 * @constructor
		 * @param {?number} value {\blur###} -> strength (number), {\blur} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Blur extends TagBase {
			constructor(private _value: number) {
				super("Blur", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A font name tag {\fn}
		 *
		 * @constructor
		 * @param {?string} value {\fn###} -> name (string), {\fn} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class FontName extends TagBase {
			constructor(private _value: string) {
				super("FontName", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		/**
		 * A font size tag {\fs}
		 *
		 * @constructor
		 * @param {?number} value {\fs###} -> size (number), {\fs} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class FontSize extends TagBase {
			constructor(private _value: number) {
				super("FontSize", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A horizontal font scaling tag {\fscx}
		 *
		 * @constructor
		 * @param {?number} value {\fscx###} -> scale (number), {\fscx} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class FontScaleX extends TagBase {
			constructor(private _value: number) {
				super("FontScaleX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A vertical font scaling tag {\fscy}
		 *
		 * @constructor
		 * @param {?number} value {\fscy###} -> scale (number), {\fscy} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class FontScaleY extends TagBase {
			constructor(private _value: number) {
				super("FontScaleX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A letter spacing tag {\fsp}
		 *
		 * @constructor
		 * @param {?number} value {\fsp###} -> spacing (number), {\fsp} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class LetterSpacing extends TagBase {
			constructor(private _value: number) {
				super("LetterSpacing", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * An X-axis rotation tag {\frx}
		 *
		 * @constructor
		 * @param {?number} value {\frx###} -> angle (number), {\frx} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class RotateX extends TagBase {
			constructor(private _value: number) {
				super("RotateX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A Y-axis rotation tag {\fry}
		 *
		 * @constructor
		 * @param {?number} value {\fry###} -> angle (number), {\fry} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class RotateY extends TagBase {
			constructor(private _value: number) {
				super("RotateY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A Z-axis rotation tag {\frz}
		 *
		 * @constructor
		 * @param {?number} value {\frz###} -> angle (number), {\frz} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class RotateZ extends TagBase {
			constructor(private _value: number) {
				super("RotateZ", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * An X-axis shearing tag {\fax}
		 * A comment, i.e., any text enclosed in {} that is not understood as an ASS tag.
		 *
		 * @constructor
		 * @param {?number} value {\fax###} -> angle (number), {\fax} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class SkewX extends TagBase {
			constructor(private _value: number) {
				super("SkewX", "value");
			}

			get value() {
				return this._value;
			}
		}

		/**
		 * A Y-axis shearing tag {\fay}
		 *
		 * @constructor
		 * @param {?number} value {\fay###} -> angle (number), {\fay} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class SkewY extends TagBase {
			constructor(private _value: number) {
				super("SkewY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A primary color tag {\c} and {\1c}
		 *
		 * @constructor
		 * @param {Color} value {\1c###} -> color (Color), {\1c} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class PrimaryColor extends TagBase {
			constructor(private _value: Color) {
				super("PrimaryColor", "value");
			}

			get value(): Color {
				return this._value;
			}
		}

		/**
		 * An outline color tag {\3c}
		 *
		 * @constructor
		 * @param {Color} value {\3c###} -> color (Color), {\3c} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class OutlineColor extends TagBase {
			constructor(private _value: Color) {
				super("OutlineColor", "value");
			}

			get value(): Color {
				return this._value;
			}
		}

		/**
		 * An alpha tag {\alpha}
		 *
		 * @constructor
		 * @param {?number} value {\alpha###} -> alpha (number), {\alpha} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Alpha extends TagBase {
			constructor(private _value: number) {
				super("Alpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A primary alpha tag {\1a}
		 *
		 * @constructor
		 * @param {?number} value {\1a###} -> alpha (number), {\1a} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class PrimaryAlpha extends TagBase {
			constructor(private _value: number) {
				super("PrimaryAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * An outline alpha tag {\3a}
		 *
		 * @constructor
		 * @param {?number} value {\3a###} -> alpha (number), {\3a} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class OutlineAlpha extends TagBase {
			constructor(private _value: number) {
				super("OutlineAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * An alignment tag {\an}
		 *
		 * @constructor
		 * @param {?number} value {\an###} -> alignment (number), {\an} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Alignment extends TagBase {
			constructor(private _value: number) {
				super("Alignment", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A style reset tag {\r}
		 *
		 * @constructor
		 * @param {?string} value {\r###} -> style name (string), {\r} -> null
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
		export class Reset extends TagBase {
			constructor(private _value: string) {
				super("Reset", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		/**
		 * A position tag {\pos}
		 *
		 * @constructor
		 * @param {number} x
		 * @param {number} y
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
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

		/**
		 * A simple fade tag {\fad}
		 *
		 * @constructor
		 * @param {number} start
		 * @param {number} end
		 *
		 * @extends {libjass.tags.TagBase}
		 * @memberof libjass.tags
		 */
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
