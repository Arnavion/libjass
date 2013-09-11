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
			 * @return {Color} Returns a new Color instance with the same color but the provided alpha.
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

		export interface Tag {
			toString(): string;
		}

		export class TagBase implements Tag {
			constructor(private _name: string, ... private _propertyNames: string[]) { }

			/**
			 * @return {string}
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

		export class Comment extends TagBase {
			constructor(private _value: string) {
				super("Comment", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class HardSpace extends TagBase {
			constructor() {
				super("HardSpace");
			}
		}

		export class NewLine extends TagBase {
			constructor() {
				super("NewLine");
			}
		}

		export class Text extends TagBase {
			constructor(private _value: string) {
				super("Text", "value");
			}

			get value(): string {
				return this._value;
			}
		}

		export class Italic extends TagBase {
			constructor(private _value: boolean) {
				super("Italic", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}
		export class Bold extends TagBase {
			constructor(private _value: Object) {
				super("Bold", "value");
			}

			get value(): Object {
				return this._value;
			}
		}
		export class Underline extends TagBase {
			constructor(private _value: boolean) {
				super("Underline", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}
		export class StrikeThrough extends TagBase {
			constructor(private _value: boolean) {
				super("StrikeThrough", "value");
			}

			get value(): boolean {
				return this._value;
			}
		}

		export class Border extends TagBase {
			constructor(private _value: number) {
				super("Border", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class BorderX extends TagBase {
			constructor(private _value: number) {
				super("BorderX", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class BorderY extends TagBase {
			constructor(private _value: number) {
				super("BorderY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Blur extends TagBase {
			constructor(private _value: number) {
				super("Blur", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class FontName extends TagBase {
			constructor(private _value: string) {
				super("FontName", "value");
			}

			get value(): string {
				return this._value;
			}
		}
		export class FontSize extends TagBase {
			constructor(private _value: number) {
				super("FontSize", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class FontScaleX extends TagBase {
			constructor(private _value: number) {
				super("FontScaleX", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class FontScaleY extends TagBase {
			constructor(private _value: number) {
				super("FontScaleX", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class LetterSpacing extends TagBase {
			constructor(private _value: number) {
				super("LetterSpacing", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class RotateX extends TagBase {
			constructor(private _value: number) {
				super("RotateX", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class RotateY extends TagBase {
			constructor(private _value: number) {
				super("RotateY", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class RotateZ extends TagBase {
			constructor(private _value: number) {
				super("RotateZ", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class SkewX extends TagBase {
			constructor(private _value: number) {
				super("SkewX", "value");
			}

			get value() {
				return this._value;
			}
		}
		export class SkewY extends TagBase {
			constructor(private _value: number) {
				super("SkewY", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class PrimaryColor extends TagBase {
			constructor(private _value: Color) {
				super("PrimaryColor", "value");
			}

			get value(): Color {
				return this._value;
			}
		}
		export class OutlineColor extends TagBase {
			constructor(private _value: Color) {
				super("OutlineColor", "value");
			}

			get value(): Color {
				return this._value;
			}
		}

		export class Alpha extends TagBase {
			constructor(private _value: number) {
				super("Alpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class PrimaryAlpha extends TagBase {
			constructor(private _value: number) {
				super("PrimaryAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}
		export class OutlineAlpha extends TagBase {
			constructor(private _value: number) {
				super("OutlineAlpha", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Alignment extends TagBase {
			constructor(private _value: number) {
				super("Alignment", "value");
			}

			get value(): number {
				return this._value;
			}
		}

		export class Reset extends TagBase {
			constructor(private _value: string) {
				super("Reset", "value");
			}

			get value(): string {
				return this._value;
			}
		}

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
