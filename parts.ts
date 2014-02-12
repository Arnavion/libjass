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

module libjass.parts {
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

		/**
		 * The red component of this color as a number between 0 and 255.
		 *
		 * @type {number}
		 */
		get red(): number {
			return this._red;
		}

		/**
		 * The green component of this color as a number between 0 and 255.
		 *
		 * @type {number}
		 */
		get green(): number {
			return this._green;
		}

		/**
		 * The blue component of this color as a number between 0 and 255.
		 *
		 * @type {number}
		 */
		get blue(): number {
			return this._blue;
		}

		/**
		 * The alpha component of this color as a number between 0 and 1, where 0 means transparent and 1 means opaque.
		 *
		 * @type {number}
		 */
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
			return "rgba(" + this._red + ", " + this._green + ", " + this._blue + ", " + this._alpha.toFixed(3) + ")";
		}
	}

	/**
	 * The base interface of the ASS tag classes.
	 */
	export interface Part { }

	/**
	 * A comment, i.e., any text enclosed in {} that is not understood as an ASS tag.
	 *
	 * @constructor
	 * @param {string} value The text of this comment
	 *
	 * @memberof libjass.parts
	 */
	export class Comment {
		constructor(private _value: string) { }

		/**
		 * The value of this comment.
		 *
		 * @type {string}
		 */
		get value(): string {
			return this._value;
		}
	}

	/**
	 * A block of text, i.e., any text not enclosed in {}. Also includes \h.
	 *
	 * @constructor
	 * @param {string} value The content of this block of text
	 *
	 * @memberof libjass.parts
	 */
	export class Text {
		constructor(private _value: string) { }

		/**
		 * The value of this text part.
		 *
		 * @type {string}
		 */
		get value(): string {
			return this._value;
		}

		toString(): string {
			return "Text { value: " + this._value.replace(/\u00A0/g, "\\h") + " }";
		}
	}

	/**
	 * A newline character \N.
	 *
	 * @constructor
	 *
	 * @memberof libjass.parts
	 */
	export class NewLine {
	}

	/**
	 * An italic tag {\i}
	 *
	 * @constructor
	 * @param {?boolean} value {\i1} -> true, {\i0} -> false, {\i} -> null
	 *
	 * @memberof libjass.parts
	 */
	export class Italic {
		constructor(private _value: boolean) { }

		/**
		 * The value of this italic tag.
		 *
		 * @type {?boolean}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Bold {
		constructor(private _value: Object) { }

		/**
		 * The value of this bold tag.
		 *
		 * @type {?boolean|?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Underline {
		constructor(private _value: boolean) { }

		/**
		 * The value of this underline tag.
		 *
		 * @type {?boolean}
		 */
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
	 * @memberof libjass.parts
	 */
	export class StrikeThrough {
		constructor(private _value: boolean) { }

		/**
		 * The value of this strike-through tag.
		 *
		 * @type {?boolean}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Border {
		constructor(private _value: number) { }

		/**
		 * The value of this border tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class BorderX {
		constructor(private _value: number) { }

		/**
		 * The value of this horizontal border tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class BorderY {
		constructor(private _value: number) { }

		/**
		 * The value of this vertical border tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Shadow {
		constructor(private _value: number) { }

		/**
		 * The value of this shadow tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ShadowX {
		constructor(private _value: number) { }

		/**
		 * The value of this horizontal shadow tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ShadowY {
		constructor(private _value: number) { }

		/**
		 * The value of this vertical shadow tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Blur {
		constructor(private _value: number) { }

		/**
		 * The value of this blur tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class GaussianBlur {
		constructor(private _value: number) { }

		/**
		 * The value of this Gaussian blur tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class FontName {
		constructor(private _value: string) { }

		/**
		 * The value of this font name tag.
		 *
		 * @type {?string}
		 */
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
	 * @memberof libjass.parts
	 */
	export class FontSize {
		constructor(private _value: number) { }

		/**
		 * The value of this font size tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class FontScaleX {
		constructor(private _value: number) { }

		/**
		 * The value of this horizontal font scaling tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class FontScaleY {
		constructor(private _value: number) { }

		/**
		 * The value of this vertical font scaling tag.
		 *
		 * @type {?number}
		 */
		get value(): number {
			return this._value;
		}
	}

	/**
	 * A letter-spacing tag {\fsp}
	 *
	 * @constructor
	 * @param {?number} value {\fsp###} -> spacing (number), {\fsp} -> null
	 *
	 * @memberof libjass.parts
	 */
	export class LetterSpacing {
		constructor(private _value: number) { }

		/**
		 * The value of this letter-spacing tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class RotateX {
		constructor(private _value: number) { }

		/**
		 * The value of this X-axis rotation tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class RotateY {
		constructor(private _value: number) { }

		/**
		 * The value of this Y-axis rotation tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class RotateZ {
		constructor(private _value: number) { }

		/**
		 * The value of this Z-axis rotation tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class SkewX {
		constructor(private _value: number) { }

		/**
		 * The value of this X-axis shearing tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class SkewY {
		constructor(private _value: number) { }

		/**
		 * The value of this Y-axis shearing tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class PrimaryColor {
		constructor(private _value: Color) { }

		/**
		 * The value of this primary color tag.
		 *
		 * @type {libjass.parts.Color}
		 */
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
	 * @memberof libjass.parts
	 */
	export class SecondaryColor {
		constructor(private _value: Color) { }

		/**
		 * The value of this secondary color tag.
		 *
		 * @type {libjass.parts.Color}
		 */
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
	 * @memberof libjass.parts
	 */
	export class OutlineColor {
		constructor(private _value: Color) { }

		/**
		 * The value of this outline color tag.
		 *
		 * @type {libjass.parts.Color}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ShadowColor {
		constructor(private _value: Color) { }

		/**
		 * The value of this shadow color tag.
		 *
		 * @type {libjass.parts.Color}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Alpha {
		constructor(private _value: number) { }

		/**
		 * The value of this alpha tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class PrimaryAlpha {
		constructor(private _value: number) { }

		/**
		 * The value of this primary alpha tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class SecondaryAlpha {
		constructor(private _value: number) { }

		/**
		 * The value of this secondary alpha tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class OutlineAlpha {
		constructor(private _value: number) { }

		/**
		 * The value of this outline alpha tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ShadowAlpha {
		constructor(private _value: number) { }

		/**
		 * The value of this shadow alpha tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Alignment {
		constructor(private _value: number) { }

		/**
		 * The value of this alignment tag.
		 *
		 * @type {?number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ColorKaraoke {
		constructor(private _duration: number) { }

		/**
		 * The duration of this color karaoke tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class SweepingColorKaraoke {
		constructor(private _duration: number) { }

		/**
		 * The duration of this sweeping color karaoke tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class OutlineKaraoke {
		constructor(private _duration: number) { }

		/**
		 * The duration of this outline karaoke tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class WrappingStyle {
		constructor(private _value: libjass.WrappingStyle) { }

		/**
		 * The value of this wrapping style tag.
		 *
		 * @type {number}
		 */
		get value(): libjass.WrappingStyle {
			return this._value;
		}
	}

	/**
	 * A style reset tag {\r}
	 *
	 * @constructor
	 * @param {?string} value {\r###} -> style name (string), {\r} -> null
	 *
	 * @memberof libjass.parts
	 */
	export class Reset {
		constructor(private _value: string) { }

		/**
		 * The value of this style reset tag.
		 *
		 * @type {?string}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Position {
		constructor(private _x: number, private _y: number) { }

		/**
		 * The x value of this position tag.
		 *
		 * @type {number}
		 */
		get x(): number {
			return this._x;
		}

		/**
		 * The y value of this position tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Move {
		constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _t1: number, private _t2: number) { }

		/**
		 * The starting x value of this move tag.
		 *
		 * @type {number}
		 */
		get x1(): number {
			return this._x1;
		}

		/**
		 * The starting y value of this move tag.
		 *
		 * @type {number}
		 */
		get y1(): number {
			return this._y1;
		}

		/**
		 * The ending x value of this move tag.
		 *
		 * @type {number}
		 */
		get x2(): number {
			return this._x2;
		}

		/**
		 * The ending y value of this move tag.
		 *
		 * @type {number}
		 */
		get y2(): number {
			return this._y2;
		}

		/**
		 * The start time of this move tag.
		 *
		 * @type {number}
		 */
		get t1(): number {
			return this._t1;
		}

		/**
		 * The end time value of this move tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class RotationOrigin {
		constructor(private _x: number, private _y: number) { }

		/**
		 * The x value of this rotation origin tag.
		 *
		 * @type {number}
		 */
		get x(): number {
			return this._x;
		}

		/**
		 * The y value of this rotation origin tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class Fade {
		constructor(private _start: number, private _end: number) { }

		/**
		 * The start time of this fade tag.
		 *
		 * @type {number}
		 */
		get start(): number {
			return this._start;
		}

		/**
		 * The end time of this fade tag.
		 *
		 * @type {number}
		 */
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
	 * @memberof libjass.parts
	 */
	export class ComplexFade {
		constructor(
			private _a1: number, private _a2: number, private _a3: number,
			private _t1: number, private _t2: number, private _t3: number, private _t4: number
		) { }

		/**
		 * The alpha value of this complex fade tag at time t2.
		 *
		 * @type {number}
		 */
		get a1(): number {
			return this._a1;
		}

		/**
		 * The alpha value of this complex fade tag at time t3.
		 *
		 * @type {number}
		 */
		get a2(): number {
			return this._a2;
		}

		/**
		 * The alpha value of this complex fade tag at time t4.
		 *
		 * @type {number}
		 */
		get a3(): number {
			return this._a3;
		}

		/**
		 * The starting time of this complex fade tag.
		 *
		 * @type {number}
		 */
		get t1(): number {
			return this._t1;
		}

		/**
		 * The first intermediate time of this complex fade tag.
		 *
		 * @type {number}
		 */
		get t2(): number {
			return this._t2;
		}

		/**
		 * The second intermediate time of this complex fade tag.
		 *
		 * @type {number}
		 */
		get t3(): number {
			return this._t3;
		}

		/**
		 * The ending time of this complex fade tag.
		 *
		 * @type {number}
		 */
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
	 * @param {!Array.<!libjass.parts.Tag>} tags
	 *
	 * @memberof libjass.parts
	 */
	export class Transform {
		constructor(private _start: number, private _end: number, private _accel: number, private _tags: Part[]) { }

		/**
		 * The starting time of this transform tag.
		 *
		 * @type {number}
		 */
		get start(): number {
			return this._start;
		}

		/**
		 * The ending time of this transform tag.
		 *
		 * @type {number}
		 */
		get end(): number {
			return this._end;
		}

		/**
		 * The acceleration of this transform tag.
		 *
		 * @type {number}
		 */
		get accel(): number {
			return this._accel;
		}

		/**
		 * The tags animated by this transform tag.
		 *
		 * @type {!Array.<!libjass.parts.Tag>}
		 */
		get tags(): Part[] {
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
	 * @memberof libjass.parts
	 */
	export class RectangularClip {
		constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _inside: boolean) { }

		/**
		 * The X coordinate of the starting position of this rectangular clip tag.
		 *
		 * @type {number}
		 */
		get x1(): number {
			return this._x1;
		}

		/**
		 * The Y coordinate of the starting position of this rectangular clip tag.
		 *
		 * @type {number}
		 */
		get y1(): number {
			return this._y1;
		}

		/**
		 * The X coordinate of the ending position of this rectangular clip tag.
		 *
		 * @type {number}
		 */
		get x2(): number {
			return this._x2;
		}

		/**
		 * The Y coordinate of the ending position of this rectangular clip tag.
		 *
		 * @type {number}
		 */
		get y2(): number {
			return this._y2;
		}

		/**
		 * Whether this rectangular clip tag clips the region it encloses or the region it excludes.
		 *
		 * @type {boolean}
		 */
		get inside(): boolean {
			return this._inside;
		}
	}

	/**
	 * A vector clip tag {\clip} or {\iclip}
	 *
	 * @constructor
	 * @param {number} scale
	 * @param {!Array.<!libjass.parts.drawing.Instruction>} instructions
	 * @param {boolean} inside
	 *
	 * @memberof libjass.parts
	 */
	export class VectorClip {
		constructor(private _scale: number, private _instructions: drawing.Instruction[], private _inside: boolean) { }

		/**
		 * The scale of this vector clip tag.
		 *
		 * @type {number}
		 */
		get scale(): number {
			return this._scale;
		}

		/**
		 * The clip commands of this vector clip tag.
		 *
		 * @type {string}
		 */
		get instructions(): drawing.Instruction[] {
			return this._instructions;
		}

		/**
		 * Whether this vector clip tag clips the region it encloses or the region it excludes.
		 *
		 * @type {boolean}
		 */
		get inside(): boolean {
			return this._inside;
		}
	}

	/**
	 * A drawing mode tag {\p}
	 *
	 * @constructor
	 * @param {number} scale
	 *
	 * @memberof libjass.parts
	 */
	export class DrawingMode {
		constructor(private _scale: number) { }

		/**
		 * The scale of this drawing mode tag.
		 *
		 * @type {number}
		 */
		get scale(): number {
			return this._scale;
		}
	}

	/**
	 * A drawing mode baseline offset tag {\pbo}
	 *
	 * @constructor
	 * @param {number} value
	 *
	 * @memberof libjass.parts
	 */
	export class DrawingBaselineOffset {
		constructor(private _value: number) { }

		/**
		 * The value of this drawing mode baseline offset tag.
		 *
		 * @type {number}
		 */
		get value(): number {
			return this._value;
		}
	}

	/**
	 * A pseudo-part representing text interpreted as drawing instructions
	 *
	 * @constructor
	 * @param {!Array.<!libjass.parts.drawing.Instruction>} instructions
	 *
	 * @memberof libjass.parts
	 */
	export class DrawingInstructions {
		constructor(private _instructions: drawing.Instruction[]) { }

		/**
		 * The instructions contained in this drawing instructions part.
		 *
		 * @type {!Array.<!libjass.parts.drawing.Instruction>}
		 */
		get instructions(): drawing.Instruction[] {
			return this._instructions;
		}
	}

	export module drawing {
		/**
		 * The base interface of the drawing instructions.
		 */
		export interface Instruction { }

		/**
		 * An instruction to move to a particular position.
		 *
		 * @constructor
		 * @param {number} x
		 * @param {number} y
		 *
		 * @memberof libjass.parts.drawing
		 */
		export class MoveInstruction implements Instruction {
			constructor(private _x: number, private _y: number) { }

			/**
			 * The X position of this move instruction.
			 *
			 * @type {number}
			 */
			get x(): number {
				return this._x;
			}

			/**
			 * The Y position of this move instruction.
			 *
			 * @type {number}
			 */
			get y(): number {
				return this._y;
			}
		}

		/**
		 * An instruction to draw a line to a particular position.
		 *
		 * @constructor
		 * @param {number} x
		 * @param {number} y
		 *
		 * @memberof libjass.parts.drawing
		 */
		export class LineInstruction implements Instruction {
			constructor(private _x: number, private _y: number) { }

			/**
			 * The X position of this line instruction.
			 *
			 * @type {number}
			 */
			get x(): number {
				return this._x;
			}

			/**
			 * The Y position of this line instruction.
			 *
			 * @type {number}
			 */
			get y(): number {
				return this._y;
			}
		}

		/**
		 * An instruction to draw a cubic bezier curve to a particular position, with two given control points.
		 *
		 * @constructor
		 * @param {number} x1
		 * @param {number} y1
		 * @param {number} x2
		 * @param {number} y2
		 * @param {number} x3
		 * @param {number} y3
		 *
		 * @memberof libjass.parts.drawing
		 */
		export class CubicBezierCurveInstruction implements Instruction {
			constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _x3: number, private _y3: number) { }

			/**
			 * The X position of the first control point of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get x1(): number {
				return this._x1;
			}

			/**
			 * The Y position of the first control point of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get y1(): number {
				return this._y1;
			}

			/**
			 * The X position of the second control point of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get x2(): number {
				return this._x2;
			}

			/**
			 * The Y position of the second control point of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get y2(): number {
				return this._y2;
			}

			/**
			 * The ending X position of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get x3(): number {
				return this._x3;
			}

			/**
			 * The ending Y position of this cubic bezier curve instruction.
			 *
			 * @type {number}
			 */
			get y3(): number {
				return this._y3;
			}
		}
	}

	var addToString = function (ctor: Function, ctorName: string) {
		if (!ctor.prototype.hasOwnProperty("toString")) {
			var propertyNames = Object.getOwnPropertyNames(ctor.prototype).filter(property => property !== "constructor");

			ctor.prototype.toString = function () {
				return (
					ctorName + " { " +
					propertyNames.map(name => name + ": " + (<any>this)[name]).join(", ") +
					((propertyNames.length > 0) ? " " : "") +
					"}"
				);
			}
		}
	};

	Object.keys(libjass.parts).forEach(key => {
		var value = (<any>libjass.parts)[key];
		if (value instanceof Function) {
			addToString(value, key);
		}
	});

	Object.keys(libjass.parts.drawing).forEach(key => {
		var value = (<any>libjass.parts.drawing)[key];
		if (value instanceof Function) {
			addToString(value, "Drawing" + key);
		}
	});
}
