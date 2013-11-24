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
	export module parts {
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
		 * @memberof libjass.parts
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
			 * @param {?number} value The new alpha. If null, the existing alpha is used.
			 * @return {!libjass.parts.Color} Returns a new Color instance with the same color but the provided alpha.
			 */
			withAlpha(value: number): Color {
				if (value !== null) {
					return new Color(this._red, this._green, this._blue, value);
				}

				return this;
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
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A shadow tag {\shad}
		 *
		 * @constructor
		 * @param {?number} value {\shad###} -> depth (number), {\shad} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class Shadow extends TagBase {
			constructor(private _value: number) {
				super("Shadow", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A horizontal shadow tag {\xshad}
		 *
		 * @constructor
		 * @param {?number} value {\xshad###} -> depth (number), {\xshad} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ShadowX extends TagBase {
			constructor(private _value: number) {
				super("ShadowX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A vertical shadow tag {\yshad}
		 *
		 * @constructor
		 * @param {?number} value {\yshad###} -> depth (number), {\yshad} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ShadowY extends TagBase {
			constructor(private _value: number) {
				super("ShadowY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A blur tag {\be}
		 *
		 * @constructor
		 * @param {?number} value {\be###} -> strength (number), {\be} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A Gaussian blur tag {\blur}
		 *
		 * @constructor
		 * @param {?number} value {\blur###} -> strength (number), {\blur} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class GaussianBlur extends TagBase {
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A Z-axis rotation tag {\fr} or {\frz}
		 *
		 * @constructor
		 * @param {?number} value {\frz###} -> angle (number), {\frz} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 *
		 * @constructor
		 * @param {?number} value {\fax###} -> angle (number), {\fax} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A primary color tag {\c} or {\1c}
		 *
		 * @constructor
		 * @param {libjass.parts.Color} value {\1c###} -> color (Color), {\1c} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A secondary color tag {\2c}
		 *
		 * @constructor
		 * @param {libjass.parts.Color} value {\2c###} -> color (Color), {\2c} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class SecondaryColor extends TagBase {
			constructor(private _value: Color) {
				super("SecondaryColor", "value");
			}

			get value(): Color {
				return this._value;
			}
		}

		/**
		 * An outline color tag {\3c}
		 *
		 * @constructor
		 * @param {libjass.parts.Color} value {\3c###} -> color (Color), {\3c} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A shadow color tag {\4c}
		 *
		 * @constructor
		 * @param {libjass.parts.Color} value {\4c###} -> color (Color), {\4c} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ShadowColor extends TagBase {
			constructor(private _value: Color) {
				super("ShadowColor", "value");
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A secondary alpha tag {\2a}
		 *
		 * @constructor
		 * @param {?number} value {\2a###} -> alpha (number), {\2a} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class SecondaryAlpha extends TagBase {
			constructor(private _value: number) {
				super("SecondaryAlpha", "value");
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A shadow alpha tag {\4a}
		 *
		 * @constructor
		 * @param {?number} value {\4a###} -> alpha (number), {\4a} -> null
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ShadowAlpha extends TagBase {
			constructor(private _value: number) {
				super("ShadowAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * An alignment tag {\an} or {\a}
		 *
		 * @constructor
		 * @param {number} value {\an###} -> alignment (number)
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * A color karaoke tag {\k}
		 *
		 * @constructor
		 * @param {number} duration {\k###} -> duration (number)
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ColorKaraoke extends TagBase {
			constructor(private _duration: number) {
				super("ColorKaraoke", "duration");
			}

			get duration(): number {
				return this._duration;
			}
		}

		/**
		 * A sweeping color karaoke tag {\K} or {\kf}
		 *
		 * @constructor
		 * @param {number} duration {\kf###} -> duration (number)
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class SweepingColorKaraoke extends TagBase {
			constructor(private _duration: number) {
				super("SweepingColorKaraoke", "duration");
			}

			get duration(): number {
				return this._duration;
			}
		}

		/**
		 * An outline karaoke tag {\ko}
		 *
		 * @constructor
		 * @param {number} duration {\ko###} -> duration (number)
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class OutlineKaraoke extends TagBase {
			constructor(private _duration: number) {
				super("OutlineKaraoke", "duration");
			}

			get duration(): number {
				return this._duration;
			}
		}

		/**
		 * A wrapping style tag {\q}
		 *
		 * @constructor
		 * @param {number} value {\q###} -> style (number)
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class WrappingStyle extends TagBase {
			constructor(private _value: number) {
				super("WrappingStyle", "value");
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class Position extends TagBase {
			constructor(private _x: number, private _y: number) {
				super("Position", "x", "y");
			}

			get x(): number {
				return this._x;
			}

			get y(): number {
				return this._y;
			}
		}

		/**
		 * A movement tag {\move}
		 *
		 * @constructor
		 * @param {number} x1
		 * @param {number} y1
		 * @param {number} x2
		 * @param {number} y2
		 * @param {number} t1
		 * @param {number} t2
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class Move extends TagBase {
			constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _t1: number, private _t2: number) {
				super("Move", "x1", "y1", "x2", "y2", "t1", "t2");
			}

			get x1(): number {
				return this._x1;
			}

			get y1(): number {
				return this._y1;
			}

			get x2(): number {
				return this._x2;
			}

			get y2(): number {
				return this._y2;
			}

			get t1(): number {
				return this._t1;
			}

			get t2(): number {
				return this._t2;
			}
		}

		/**
		 * A rotation origin tag {\org}
		 *
		 * @constructor
		 * @param {number} x
		 * @param {number} y
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class RotationOrigin extends TagBase {
			constructor(private _x: number, private _y: number) {
				super("RotationOrigin", "x", "y");
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
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
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

		/**
		 * A complex fade tag {\fade}
		 *
		 * @constructor
		 * @param {number} a1
		 * @param {number} a2
		 * @param {number} a3
		 * @param {number} t1
		 * @param {number} t2
		 * @param {number} t3
		 * @param {number} t4
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class ComplexFade extends TagBase {
			constructor(
				private _a1: number, private _a2: number, private _a3: number,
				private _t1: number, private _t2: number, private _t3: number, private _t4: number
			) {
				super("ComplexFade", "a1", "a2", "a3", "t1", "t2", "t3", "t4");
			}

			get a1(): number {
				return this._a1;
			}

			get a2(): number {
				return this._a2;
			}

			get a3(): number {
				return this._a3;
			}

			get t1(): number {
				return this._t1;
			}

			get t2(): number {
				return this._t2;
			}

			get t3(): number {
				return this._t3;
			}

			get t4(): number {
				return this._t4;
			}
		}

		/**
		 * A transform tag {\t}
		 *
		 * @constructor
		 * @param {number} start
		 * @param {number} end
		 * @param {number} accel
		 * @param {Array.<libjass.parts.Tag>} tags
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class Transform extends TagBase {
			constructor(private _start: number, private _end: number, private _accel: number, private _tags: Tag[]) {
				super("Transform", "start", "end", "accel", "tags");
			}

			get start(): number {
				return this._start;
			}

			get end(): number {
				return this._end;
			}

			get accel(): number {
				return this._accel;
			}

			get tags(): Tag[] {
				return this._tags;
			}
		}

		/**
		 * A rectangular clip tag {\clip} or {\iclip}
		 *
		 * @constructor
		 * @param {number} x1
		 * @param {number} y1
		 * @param {number} x2
		 * @param {number} y2
		 * @param {boolean} inside
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class RectangularClip extends TagBase {
			constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _inside: boolean) {
				super("RectangularClip", "x1", "y1", "x2", "y2", "inside");
			}

			get x1(): number {
				return this._x1;
			}

			get y1(): number {
				return this._y1;
			}

			get x2(): number {
				return this._x2;
			}

			get y2(): number {
				return this._y2;
			}

			get inside(): boolean {
				return this._inside;
			}
		}

		/**
		 * A vector clip tag {\clip} or {\iclip}
		 *
		 * @constructor
		 * @param {number} scale
		 * @param {string} commands
		 * @param {boolean} inside
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class VectorClip extends TagBase {
			constructor(private _scale: number, private _commands: string, private _inside: boolean) {
				super("VectorClip", "scale", "commands", "inside");
			}

			get scale(): number {
				return this._scale;
			}

			get commands(): string {
				return this._commands;
			}

			get inside(): boolean {
				return this._inside;
			}
		}

		/**
		 * A drawing mode tag {\p}
		 *
		 * @constructor
		 * @param {number} value
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class DrawingMode extends TagBase {
			constructor(private _value: number) {
				super("DrawingMode", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		/**
		 * A drawing mode baseline offset tag {\pbo}
		 *
		 * @constructor
		 * @param {number} value
		 *
		 * @extends {libjass.parts.TagBase}
		 * @memberof libjass.parts
		 */
		export class DrawingBaselineOffset extends TagBase {
			constructor(private _value: number) {
				super("DrawingBaselineOffset", "value");
			}

			get value(): number {
				return this._value;
			}
		}
	}
}
