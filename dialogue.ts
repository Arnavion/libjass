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

///<reference path="utility.ts" />
///<reference path="parser.ts" />

"use strict";

module libjass {
	export class Dialogue {
		private static _lastDialogueId = -1;
		private static _animationStyleElement: HTMLStyleElement = null;

		private _id: number;
		private _alignment: number;
		private _parts: tags.Tag[];

		/**
		 * @constructor
		 * @param {string} text
		 * @param {string} style
		 * @param {number} start
		 * @param {number} end
		 * @param {number} layer
		 * @param {{parse: function(string, string=): !*}} parser
		 * @param {!Info} info
		 * @param {!Array.<!Style>} styles
		 */
		constructor(text: string, private _style: Style, private _start: number, private _end: number, private _layer: number, parser: DialogueParser, private _info: Info, private _styles: Style[]) {
			this._id = ++Dialogue._lastDialogueId;
			this._parts = <tags.Tag[]>parser.parse(text);

			this._alignment = this._style.alignment;

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

		// Magic happens here (TODO: styling)
		/**
		 * @param {number} currentTime
		 * @return {!HTMLDivElement}
		 */
		draw(currentTime: number): HTMLDivElement {
			var sub = document.createElement("div");

			sub.setAttribute("data-dialogue-id", String(this._id));

			// Create an animation if there is a part that requires it
			var keyframes = new KeyframeCollection(this._id, this._start, this._end);

			this._parts.forEach(part => {
				if (part instanceof tags.Alignment) {
					this._alignment = (<tags.Alignment>part).value;
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
			Dialogue._animationStyleElement.appendChild(document.createTextNode(keyframes.toCSS()));

			var scaleX = this._info.scaleX;
			var scaleY = this._info.scaleY;
			var dpi = this._info.dpi;

			var animationEndCallback: () => void = sub.remove.bind(sub);

			sub.style.animationName = "dialogue-" + this._id;
			sub.style.animationDuration = (this._end - this._start) + "s";
			sub.style.animationDelay = (this._start - currentTime) + "s";
			sub.addEventListener("animationend", animationEndCallback, false);

			sub.style.webkitAnimationName = "dialogue-" + this._id;
			sub.style.webkitAnimationDuration = (this._end - this._start) + "s";
			sub.style.webkitAnimationDelay = (this._start - currentTime) + "s";
			sub.addEventListener("webkitAnimationEnd", animationEndCallback, false);

			sub.style.marginLeft = (scaleX * this._style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * this._style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleX * this._style.marginVertical) + "px";

			var currentItalic = this._style.italic;
			var currentBold = this._style.bold;
			var currentUnderline = this._style.underline;
			var currentStrikethrough = this._style.strikethrough;

			var currentOutlineWidth = this._style.outlineWidth;

			var currentFontName = this._style.fontName;
			var currentFontSize = this._style.fontSize;

			var currentPrimaryColor = this._style.primaryColor;
			var currentOutlineColor = this._style.outlineColor;

			var currentBlur = 0;
			var transformStyle = "";
			var currentSpanContainer = sub; // Changes to a wrapper if {\pos} is present
			var currentSpan: HTMLSpanElement;

			var createNewSpan = true;
			var updateSpanStyles = (): void => {
				if (createNewSpan) {
					currentSpan = document.createElement("span");
					currentSpanContainer.appendChild(currentSpan);
					createNewSpan = false;
				}

				currentItalic = valueOrDefault(currentItalic, this._style.italic);
				currentBold = valueOrDefault(currentBold, this._style.bold);
				currentUnderline = valueOrDefault(currentUnderline, this._style.underline);
				currentStrikethrough = valueOrDefault(currentStrikethrough, this._style.strikethrough);
				currentOutlineWidth = valueOrDefault(currentOutlineWidth, this._style.outlineWidth);
				currentFontName = valueOrDefault(currentFontName, this._style.fontName);
				currentFontSize = valueOrDefault(currentFontSize, this._style.fontSize);
				currentPrimaryColor = valueOrDefault(currentPrimaryColor, this._style.primaryColor);
				currentOutlineColor = valueOrDefault(currentOutlineColor, this._style.outlineColor);

				if (currentItalic) {
					currentSpan.style.fontStyle = "italic";
				}

				if (currentBold === true) {
					currentSpan.style.fontWeight = "bold";
				}
				else if (currentBold !== false) {
					currentSpan.style.fontWeight = <string>currentBold;
				}

				var textDecoration = "";
				if (currentUnderline) {
					textDecoration = "underline";
				}
				if (currentStrikethrough) {
					textDecoration += " line-through";
				}
				currentSpan.style.textDecoration = textDecoration.trim();

				currentSpan.style.fontFamily = currentFontName;
				currentSpan.style.fontSize = ((72 / dpi) * scaleY * currentFontSize) + "px";
				currentSpan.style.lineHeight = (scaleY * currentFontSize) + "px";

				currentSpan.style.color = currentPrimaryColor;

				var blurRadius = scaleX * currentOutlineWidth;
				if (currentBlur > 0) {
					blurRadius = currentBlur / 2;
				}
				currentSpan.style.textShadow = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
					.map(pair => pair[0] + "px " + pair[1] + "px " + blurRadius + "px " + currentOutlineColor).join(", ");
			};
			updateSpanStyles();

			var spanStylesChanged = false;

			this._parts.forEach(part => {
				if (part instanceof tags.Italic) {
					var newItalic = (<tags.Italic>part).value;
					if (currentItalic !== newItalic) {
						currentItalic = newItalic;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Bold) {
					var newBold = (<tags.Bold>part).value;
					if (currentBold !== newBold) {
						currentBold = newBold;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Underline) {
					var newUnderline = (<tags.Underline>part).value;
					if (newUnderline !== currentUnderline) {
						currentUnderline = newUnderline;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Strikeout) {
					var newStrikethrough = (<tags.Strikeout>part).value;
					if (newStrikethrough !== currentStrikethrough) {
						currentStrikethrough = newStrikethrough;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Border) {
					var newOutlineWidth = (<tags.Border>part).value;
					if (currentOutlineWidth !== newOutlineWidth) {
						currentOutlineWidth = newOutlineWidth;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Blur) {
					var newBlur = (<tags.Blur>part).value;
					if (currentBlur !== newBlur) {
						currentBlur = newBlur;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.FontName) {
					var newFontName = (<tags.FontName>part).value;
					if (currentFontName !== newFontName) {
						currentFontName = newFontName;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.FontSize) {
					var newFontSize = (<tags.FontSize>part).value;
					if (currentFontSize !== newFontSize) {
						currentFontSize = newFontSize;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Frx) {
					transformStyle += " rotateX(" + (<tags.Frx>part).value + "deg)";
				}

				else if (part instanceof tags.Fry) {
					transformStyle += " rotateY(" + (<tags.Fry>part).value + "deg)";
				}

				else if (part instanceof tags.Frz) {
					transformStyle += " rotateZ(" + (-1 * (<tags.Frz>part).value) + "deg)";
				}

				else if (part instanceof tags.Fax) {
					transformStyle += " skewX(" + (45 * (<tags.Fax>part).value) + "deg)";
				}

				else if (part instanceof tags.Fay) {
					transformStyle += " skewY(" + (45 * (<tags.Fay>part).value) + "deg)";
				}

				else if (part instanceof tags.PrimaryColor) {
					var newPrimaryColor = (<tags.PrimaryColor>part).value;
					if (currentPrimaryColor !== newPrimaryColor) {
						currentPrimaryColor = newPrimaryColor;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.OutlineColor) {
					var newOutlineColor = (<tags.OutlineColor>part).value;
					if (currentOutlineColor !== newOutlineColor) {
						currentOutlineColor = newOutlineColor;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Alignment) {
				}

				else if (part instanceof tags.Reset) {
					var resetPart = <tags.Reset>part;
					if (resetPart.value === null) {
						currentItalic = null;
						currentBold = null;
						currentUnderline = null;
						currentStrikethrough = null;
						currentOutlineWidth = null;
						currentFontName = null;
						currentFontSize = null;
						currentPrimaryColor = null;
						currentOutlineColor = null;
						spanStylesChanged = true;
					}
					else {
						var newStyle = this._styles.filter(style => style.name === resetPart.value)[0];
						currentItalic = newStyle.italic;
						currentBold = newStyle.bold;
						currentUnderline = newStyle.underline;
						currentStrikethrough = newStyle.strikethrough;
						currentOutlineWidth = newStyle.outlineWidth;
						currentFontName = newStyle.fontName;
						currentFontSize = newStyle.fontSize;
						currentPrimaryColor = newStyle.primaryColor;
						currentOutlineColor = newStyle.outlineColor;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof tags.Pos) {
					var posPart = <tags.Pos>part;
					sub.style.position = "absolute";
					sub.style.left = (scaleX * posPart.x) + "px";
					sub.style.top = (scaleY * posPart.y) + "px";

					var relativeWrapper = document.createElement("div");

					relativeWrapper.style.position = "relative";
					relativeWrapper.style.top = ((9 - this._alignment) / 3 * -50) + "% ";
					relativeWrapper.style.left = (((this._alignment - 1) % 3) * -50) + "% ";

					while (sub.firstElementChild) {
						relativeWrapper.appendChild(sub.firstElementChild);
					}

					sub.appendChild(relativeWrapper);

					currentSpanContainer = relativeWrapper;
				}

				else if (part instanceof tags.Fade) {
				}

				else if (part instanceof tags.NewLine) {
					currentSpanContainer.appendChild(document.createElement("br"));
					createNewSpan = true;
				}

				else if (part instanceof tags.HardSpace) {
					currentSpan.appendChild(document.createTextNode("\u00A0"));
					createNewSpan = true;
				}

				else if (part instanceof tags.Text || (ASS.debugMode && part instanceof tags.Comment)) {
					currentSpan.appendChild(document.createTextNode((<tags.Text>part).value));
					createNewSpan = true;
				}

				if (spanStylesChanged) {
					updateSpanStyles();
				}
			});

			if (transformStyle) {
				currentSpanContainer.style.transform = transformStyle;
				currentSpanContainer.style.webkitTransform = transformStyle;

				var transformOrigin = (((this._alignment - 1) % 3) * 50) + "% " + ((2 - (((this._alignment - 1) / 3) | 0)) * 50) + "%";
				currentSpanContainer.style.transformOrigin = transformOrigin;
				currentSpanContainer.style.webkitTransformOrigin = transformOrigin;

				currentSpanContainer.style.perspective = "400";
				currentSpanContainer.style.webkitPerspective = "400";
			}

			return sub;
		}

		/**
		 * @return {string}
		 */
		toString(): string {
			return "[" + this._start.toFixed(3) + "-" + this._end.toFixed(3) + "] " + this._parts.join(", ");
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
		 * @return {string}
		 */
		toCSS(): string {
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

				result = "@keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n" + "@-webkit-keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n";
			}

			return result;
		}
	}

	var valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);
}
