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
	export class Dialogue {
		private static _lastDialogueId = -1;
		private static _animationStyleElement: HTMLStyleElement = null;

		private _id: number;

		private _style: Style;

		private _start: number;
		private _end: number;

		private _layer: number;
		private _alignment: number;
		private _transformOrigin: string;

		private _parts: tags.Tag[];

		private _sub: HTMLDivElement = null;

		constructor(template: Object, private _info: Info, private _styles: Style[], parser: Parser) {
			this._id = ++Dialogue._lastDialogueId;

			this._style = this._styles.filter(aStyle => aStyle.name === template["Style"])[0];

			this._start = Dialogue._toTime(template["Start"]);
			this._end = Dialogue._toTime(template["End"]);

			this._layer = Math.max(parseInt(template["Layer"]), 0);
			this._alignment = this._style.alignment;
			this._setTransformOrigin();

			this._parts = <tags.Tag[]>parser.parse(template["Text"]);

			if (libjass.debugMode) {
				if (this._parts.some(part => part instanceof tags.Comment && (<tags.Comment>part).value.indexOf("\\") !== -1)) {
					console.warn("Possible incorrect parse: " + this.toString());
				}
			}
		}

		get id(): number {
			return this._id;
		}

		get start(): number {
			return this._start;
		}

		get end(): number {
			return this._end;
		}

		get alignment(): number {
			return this._alignment;
		}

		get layer(): number {
			return this._layer;
		}

		get parts(): tags.Tag[] {
			return this._parts;
		}

		/**
		 * The magic happens here. The subtitle div is rendered and stored. Call draw() to get a clone of the div to display.
		 */
		preRender(): void {
			if (this._sub === null) {
				this._preRender();
			}
		}

		/**
		 * Returns the subtitle div for display. The currentTime is used to shift the animations appropriately, so that at the time the
		 * div is inserted into the DOM and the animations begin, they are in sync with the video time.
		 *
		 * @param {number} currentTime
		 * @return {!HTMLDivElement}
		 */
		draw(currentTime: number): HTMLDivElement {
			if (this._sub === null) {
				if (libjass.debugMode) {
					console.warn("This dialogue was not pre-rendered. Call preRender() before calling draw() so that draw() is faster.");
				}

				this._preRender();
			}

			var sub = <HTMLDivElement>this._sub.cloneNode(true);

			var animationEndCallback: () => void = sub.remove.bind(sub);

			sub.style.webkitAnimationDelay = (this._start - currentTime) + "s";
			sub.addEventListener("webkitAnimationEnd", animationEndCallback, false);

			sub.style.animationDelay = (this._start - currentTime) + "s";
			sub.addEventListener("animationend", animationEndCallback, false);

			return sub;
		}

		/**
		 * @return {string}
		 */
		toString(): string {
			return "#" + this._id + " [" + this._start.toFixed(3) + "-" + this._end.toFixed(3) + "] " + this._parts.join(", ");
		}

		/**
		 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
		 *
		 * @param {string} string
		 * @return {number}
		 */
		private static _toTime(str: string): number {
			return str.split(":").reduce((previousValue, currentValue) => previousValue * 60 + parseFloat(currentValue), 0);
		}

		private static _valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);

		private _preRender(): void {
			var sub = document.createElement("div");

			// Create an animation if there is a part that requires it
			var keyframes = new KeyframeCollection(this._id, this._start, this._end);

			this._parts.forEach(part => {
				if (part instanceof tags.Alignment) {
					this._alignment = (<tags.Alignment>part).value;
					this._setTransformOrigin();
				}

				else if (part instanceof tags.Fade) {
					var fadePart = <tags.Fade>part;
					if (fadePart.start !== 0) {
						keyframes.add(this._start, "opacity", "0");
						keyframes.add(this._start + fadePart.start, "opacity", "1");
					}
					if (fadePart.end !== 0) {
						keyframes.add(this._end - fadePart.end, "opacity", "1");
						keyframes.add(this._end, "opacity", "0");
					}
				}
			});

			if (Dialogue._animationStyleElement === null) {
				Dialogue._animationStyleElement = <HTMLStyleElement>document.querySelector("#animation-styles");
			}
			Dialogue._animationStyleElement.appendChild(document.createTextNode(keyframes.toString()));

			var scaleX = this._info.scaleX;
			var scaleY = this._info.scaleY;
			var dpi = this._info.dpi;

			sub.style.webkitAnimationName = "dialogue-" + this._id;
			sub.style.webkitAnimationDuration = (this._end - this._start) + "s";

			sub.style.animationName = "dialogue-" + this._id;
			sub.style.animationDuration = (this._end - this._start) + "s";

			sub.style.marginLeft = (scaleX * this._style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * this._style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleX * this._style.marginVertical) + "px";

			var divTransformStyle = "";

			var currentSpan: HTMLSpanElement = null;
			var currentSpanStyles: SpanStyles = null;

			var createNewSpan = (): void => {
				if (currentSpanStyles !== null) {
					currentSpanStyles.setStylesOnSpan();
				}

				currentSpan = document.createElement("span");
				sub.appendChild(currentSpan);

				currentSpanStyles = new SpanStyles(currentSpan, this._style, this._transformOrigin, scaleX, scaleY, dpi);
			};
			createNewSpan();

			this._parts.forEach(part => {
				if (part instanceof tags.Italic) {
					currentSpanStyles.italic = (<tags.Italic>part).value;
				}

				else if (part instanceof tags.Bold) {
					currentSpanStyles.bold = (<tags.Bold>part).value;
				}

				else if (part instanceof tags.Underline) {
					currentSpanStyles.underline = (<tags.Underline>part).value;
				}

				else if (part instanceof tags.Strikeout) {
					currentSpanStyles.strikeThrough = (<tags.Strikeout>part).value;
				}

				else if (part instanceof tags.Border) {
					currentSpanStyles.outlineWidth = (<tags.Border>part).value;
				}

				else if (part instanceof tags.Blur) {
					currentSpanStyles.blur = (<tags.Blur>part).value;
				}

				else if (part instanceof tags.FontName) {
					currentSpanStyles.fontName = (<tags.FontName>part).value;
				}

				else if (part instanceof tags.FontSize) {
					currentSpanStyles.fontSize = (<tags.FontSize>part).value;
				}

				else if (part instanceof tags.FontScaleX) {
					currentSpanStyles.fontScaleX = (<tags.FontScaleX>part).value;
				}

				else if (part instanceof tags.FontScaleY) {
					currentSpanStyles.fontScaleY = (<tags.FontScaleY>part).value;
				}

				else if (part instanceof tags.LetterSpacing) {
					currentSpanStyles.letterSpacing = (<tags.LetterSpacing>part).value;
				}

				else if (part instanceof tags.RotateX) {
					divTransformStyle += " rotateX(" + (<tags.RotateX>part).value + "deg)";
				}

				else if (part instanceof tags.RotateY) {
					divTransformStyle += " rotateY(" + (<tags.RotateY>part).value + "deg)";
				}

				else if (part instanceof tags.RotateZ) {
					divTransformStyle += " rotateZ(" + (-1 * (<tags.RotateZ>part).value) + "deg)";
				}

				else if (part instanceof tags.SkewX) {
					divTransformStyle += " skewX(" + (45 * (<tags.SkewX>part).value) + "deg)";
				}

				else if (part instanceof tags.SkewY) {
					divTransformStyle += " skewY(" + (45 * (<tags.SkewY>part).value) + "deg)";
				}

				else if (part instanceof tags.PrimaryColor) {
					currentSpanStyles.primaryColor = (<tags.PrimaryColor>part).value;
				}

				else if (part instanceof tags.OutlineColor) {
					currentSpanStyles.outlineColor = (<tags.OutlineColor>part).value;
				}

				else if (part instanceof tags.Alpha) {
					currentSpanStyles.primaryAlpha = (<tags.Alpha>part).value;
					currentSpanStyles.outlineAlpha = (<tags.Alpha>part).value;
				}

				else if (part instanceof tags.PrimaryAlpha) {
					currentSpanStyles.primaryAlpha = (<tags.PrimaryAlpha>part).value;
				}

				else if (part instanceof tags.OutlineAlpha) {
					currentSpanStyles.outlineAlpha = (<tags.OutlineAlpha>part).value;
				}

				else if (part instanceof tags.Alignment) {
					// Already handled at the beginning of draw()
				}

				else if (part instanceof tags.Reset) {
					var newStyleName = (<tags.Reset>part).value;
					var newStyle: Style = null;
					if (newStyleName !== null) {
						newStyle = this._styles.filter(style => style.name === newStyleName)[0];
					}
					currentSpanStyles.reset(newStyle);
				}

				else if (part instanceof tags.Pos) {
					// Will be handled at the end of draw()
				}

				else if (part instanceof tags.Fade) {
					// Already handled at the beginning of draw()
				}

				else if (part instanceof tags.NewLine) {
					sub.appendChild(document.createElement("br"));
					createNewSpan();
				}

				else if (part instanceof tags.HardSpace) {
					currentSpan.appendChild(document.createTextNode("\u00A0"));
					createNewSpan();
				}

				else if (part instanceof tags.Text || (libjass.debugMode && part instanceof tags.Comment)) {
					currentSpan.appendChild(document.createTextNode((<tags.Text>part).value));
					createNewSpan();
				}
			});

			if (divTransformStyle) {
				sub.style.webkitTransform = divTransformStyle;
				sub.style.webkitTransformOrigin = this._transformOrigin;

				sub.style.transform = divTransformStyle;
				sub.style.transformOrigin = this._transformOrigin;
			}

			this._parts.some(part => {
				if (part instanceof tags.Pos) {
					var posPart = <tags.Pos>part;

					var absoluteWrapper = document.createElement("div");
					absoluteWrapper.style.position = "absolute";
					absoluteWrapper.style.left = (scaleX * posPart.x) + "px";
					absoluteWrapper.style.top = (scaleY * posPart.y) + "px";

					sub.style.position = "relative";

					var relativeTop: number;
					var relativeLeft: number;
					switch (this._alignment) {
						case 1: relativeLeft =    0; relativeTop = -100; break;
						case 2: relativeLeft =  -50; relativeTop = -100; break;
						case 3: relativeLeft = -100; relativeTop = -100; break;
						case 4: relativeLeft =    0; relativeTop =  -50; break;
						case 5: relativeLeft =  -50; relativeTop =  -50; break;
						case 6: relativeLeft = -100; relativeTop =  -50; break;
						case 7: relativeLeft =    0; relativeTop =    0; break;
						case 8: relativeLeft =  -50; relativeTop =    0; break;
						case 9: relativeLeft = -100; relativeTop =    0; break;
					}
					sub.style.left = relativeLeft + "%";
					sub.style.top = relativeTop + "%";

					absoluteWrapper.appendChild(sub);

					sub = absoluteWrapper;

					return true;
				}

				return false;
			});

			sub.setAttribute("data-dialogue-id", String(this._id));

			this._sub = sub;
		}

		private _setTransformOrigin(): void {
			var transformOriginX: number;
			var transformOriginY: number;

			switch (this._alignment) {
				case 1: transformOriginX =   0; transformOriginY = 100; break;
				case 2: transformOriginX =  50; transformOriginY = 100; break;
				case 3: transformOriginX = 100; transformOriginY = 100; break;
				case 4: transformOriginX =   0; transformOriginY =  50; break;
				case 5: transformOriginX =  50; transformOriginY =  50; break;
				case 6: transformOriginX = 100; transformOriginY =  50; break;
				case 7: transformOriginX =   0; transformOriginY =   0; break;
				case 8: transformOriginX =  50; transformOriginY =   0; break;
				case 9: transformOriginX = 100; transformOriginY =   0; break;
			}

			this._transformOrigin = transformOriginX + "% " + transformOriginY + "%";
		}
	}

	class KeyframeCollection {
		/** @type {!Object.<string, !Object.<string, string>>} */
		private _keyframes: Object = {};

		constructor(private _id: number, private _start: number, private _end: number) { }

		/**
		 * @param {number} time
		 * @param {string} property
		 * @param {string} value
		 */
		add(time: number, property: string, value: string) {
			var step = (100 * (time - this._start) / (this._end - this._start)) + "%";
			this._keyframes[step] = this._keyframes[step] || {};
			this._keyframes[step][property] = value;
		}

		/**
		 * Creates a CSS3 animations representation of this keyframe collection.
		 *
		 * @return {string}
		 */
		toString(): string {
			var result = "";

			var steps = Object.keys(this._keyframes);
			if (steps.length > 0) {
				var cssText = "";

				steps.forEach(step => {
					cssText += "\t" + step + " {\n";
					var properties: Object = this._keyframes[step];
					Object.keys(properties).forEach(property => {
						cssText += "\t\t" + property + ": " + properties[property] + ";\n";
					});
					cssText += "\t}\n";
				});

				result =
					"@-webkit-keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n" +
					"@keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n";
			}

			return result;
		}
	}

	class SpanStyles {
		private _italic: boolean = null;
		private _bold: Object = null;
		private _underline: boolean = null;
		private _strikeThrough: boolean = null;

		private _outlineWidth: number = null;

		private _fontScaleX: number = null;
		private _fontScaleY: number = null;

		private _letterSpacing: number = null;

		private _fontName: string = null;
		private _fontSize: number = null;

		private _primaryColor: tags.Color = null;
		private _outlineColor: tags.Color = null;

		private _primaryAlpha: number = null;
		private _outlineAlpha: number = null;

		private _blur: number = 0;

		constructor(private _span: HTMLSpanElement, private _style: Style, private _transformOrigin: string, private _scaleX: number, private _scaleY: number, private _dpi: number) {
			this.reset();
		}

		reset(newStyle: Style = this._style): void {
			this._italic = SpanStyles._valueOrDefault(this._italic, newStyle.italic);
			this._bold = SpanStyles._valueOrDefault(this._bold, newStyle.bold);
			this._underline = SpanStyles._valueOrDefault(this._underline, newStyle.underline);
			this._strikeThrough = SpanStyles._valueOrDefault(this._strikeThrough, newStyle.strikethrough);

			this._outlineWidth = SpanStyles._valueOrDefault(this._outlineWidth, newStyle.outlineWidth);

			this._fontName = SpanStyles._valueOrDefault(this._fontName, newStyle.fontName);
			this._fontSize = SpanStyles._valueOrDefault(this._fontSize, newStyle.fontSize);

			this._letterSpacing = SpanStyles._valueOrDefault(this._letterSpacing, newStyle.letterSpacing);

			this._primaryColor = SpanStyles._valueOrDefault(this._primaryColor, newStyle.primaryColor);
			this._outlineColor = SpanStyles._valueOrDefault(this._outlineColor, newStyle.outlineColor);

			this._primaryAlpha = null;
			this._outlineAlpha = null;
		}

		setStylesOnSpan(): void {
			if (this._italic) {
				this._span.style.fontStyle = "italic";
			}

			if (this._bold === true) {
				this._span.style.fontWeight = "bold";
			}
			else if (this._bold !== false) {
				this._span.style.fontWeight = <string>this._bold;
			}

			var textDecoration = "";
			if (this._underline) {
				textDecoration = "underline";
			}
			if (this._strikeThrough) {
				textDecoration += " line-through";
			}
			this._span.style.textDecoration = textDecoration.trim();

			this._span.style.fontFamily = this._fontName;
			this._span.style.fontSize = ((72 / this._dpi) * this._scaleY * this._fontSize) + "px";
			this._span.style.lineHeight = (this._scaleY * this._fontSize) + "px";

			this._span.style.webkitTransform = "scaleX(" + this._fontScaleX + ") scaleY(" + this._fontScaleY + ")";
			this._span.style.webkitTransformOrigin = this._transformOrigin;
			this._span.style.transform = "scaleX(" + this._fontScaleX + ") scaleY(" + this._fontScaleY + ")";
			this._span.style.transformOrigin = this._transformOrigin;

			this._span.style.letterSpacing = (this._scaleX * this._letterSpacing) + "px";

			this._span.style.color = this._primaryColor.withAlpha(this._primaryAlpha).toString();

			var blurRadius = this._scaleX * this._outlineWidth;
			if (this._blur > 0) {
				blurRadius = this._blur / 2;
			}
			var textShadowColor = this._outlineColor.withAlpha(this._outlineAlpha).toString();
			this._span.style.textShadow = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
				.map(pair => pair[0] + "px " + pair[1] + "px " + blurRadius + "px " + textShadowColor).join(", ");
		}

		set italic(value: boolean) {
			this._italic = value;
		}

		set bold(value: Object) {
			this._bold = value;
		}

		set underline(value: boolean) {
			this._underline = value;
		}

		set strikeThrough(value: boolean) {
			this._strikeThrough = value;
		}

		set outlineWidth(value: number) {
			this._outlineWidth = value;
		}

		set blur(value: number) {
			this._blur = value;
		}

		set fontName(value: string) {
			this._fontName = value;
		}

		set fontSize(value: number) {
			this._fontSize = value;
		}

		set fontScaleX(value: number) {
			this._fontScaleX = value;
		}

		set fontScaleY(value: number) {
			this._fontScaleY = value;
		}

		set letterSpacing(value: number) {
			this._letterSpacing = value;
		}

		set primaryColor(value: tags.Color) {
			this._primaryColor = value;
		}

		set outlineColor(value: tags.Color) {
			this._outlineColor = value;
		}

		set primaryAlpha(value: number) {
			this._primaryAlpha = value;
		}

		set outlineAlpha(value: number) {
			this._outlineAlpha = value;
		}

		private static _valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);
	}
}
