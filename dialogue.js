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

"use strict";

/**
 * @constructor
 * @param {string} text
 * @param {string} style
 * @param {number} start
 * @param {number} end
 * @param {number} layer
 * @param {{parse: function(string, string=): !(Object|string)}} parser
 * @param {!Info} info
 * @param {!Array.<!Style>} styles
 */
var Dialogue = (function () {
	var lastDialogueId = -1;

	var animationStyleElement = null;

	return function (text, style, start, end, layer, parser, info, styles) {
		var id = ++lastDialogueId;

		var parts = parser.parse(text);

		var alignment = style.alignment;

		Object.defineProperties(this, {
			id: { value: id, enumerable: true },
			start: { value: start, enumerable: true },
			end: { value: end, enumerable: true },
			alignment: { get: function () { return alignment; }, enumerable: true },
			layer: { value: layer, enumerable: true },
			parts: { value: parts, enumerable: true }
		});

		// Magic happens here (TODO: styling)
		/**
		 * @param {number} currentTime
		 * @return {!HTMLDivElement}
		 */
		this.draw = function (currentTime) {
			var sub = /** @type {HTMLDivElement} */ (document.createElement("div"));

			sub.dialogue = this;

			// Create an animation if there is a part that requires it
			var keyframes = new Dialogue.KeyframeCollection(id, start, end);

			parts.forEach(function (part) {
				if (part instanceof ASS.Tags.Alignment) {
					alignment = part.value;
				}

				else if (part instanceof ASS.Tags.Fade) {
					if (part.start !== 0) {
						keyframes.add(start, "opacity", "0");
						keyframes.add(start + part.start, "opacity", "1");
					}
					if (part.end !== 0) {
						keyframes.add(end - part.end, "opacity", "1")
						keyframes.add(end, "opacity", "0");
					}
				}
			});

			if (animationStyleElement === null) {
				animationStyleElement = document.querySelector("#animation-styles");
			}
			animationStyleElement.appendChild(document.createTextNode(keyframes.toCSS()));

			var scaleX = info.scaleX;
			var scaleY = info.scaleY;
			var dpi = info.dpi;

			var animationEndCallback = sub.remove.bind(sub);

			sub.style.animationName = "dialogue-" + id;
			sub.style.animationDuration = (end - start) + "s";
			sub.style.animationDelay = (start - currentTime) + "s";
			sub.addEventListener("animationend", animationEndCallback, false);

			sub.style.webkitAnimationName = "dialogue-" + id;
			sub.style.webkitAnimationDuration = (end - start) + "s";
			sub.style.webkitAnimationDelay = (start - currentTime) + "s";
			sub.addEventListener("webkitAnimationEnd", animationEndCallback, false);

			sub.style.marginLeft = (scaleX * style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleX * style.marginVertical) + "px";

			var currentItalic = style.italic;
			var currentBold = style.bold;
			var currentUnderline = style.underline;
			var currentStrikethrough = style.strikethrough;

			var currentOutlineWidth = style.outlineWidth;

			var currentFontName = style.fontName;
			var currentFontSize = style.fontSize;

			var currentPrimaryColor = style.primaryColor;
			var currentOutlineColor = style.outlineColor;

			var currentBlur = 0;
			var transformStyle = "";
			var currentSpanContainer = sub; // Changes to a wrapper if {\pos} is present
			var currentSpan;

			var createNewSpan = true;
			var updateSpanStyles = function () {
				if (createNewSpan) {
					currentSpan = document.createElement("span");
					currentSpanContainer.appendChild(currentSpan);
					createNewSpan = false;
				}

				var valueOrDefault = function (newValue, defaultValue) {
					return (newValue !== null) ? newValue : defaultValue;
				};

				currentItalic = valueOrDefault(currentItalic, style.italic);
				currentBold = valueOrDefault(currentBold, style.bold);
				currentUnderline = valueOrDefault(currentUnderline, style.underline);
				currentStrikethrough = valueOrDefault(currentStrikethrough, style.strikethrough);
				currentOutlineWidth = valueOrDefault(currentOutlineWidth, style.outlineWidth);
				currentFontName = valueOrDefault(currentFontName, style.fontName);
				currentFontSize = valueOrDefault(currentFontSize, style.fontSize);
				currentPrimaryColor = valueOrDefault(currentPrimaryColor, style.primaryColor);
				currentOutlineColor = valueOrDefault(currentOutlineColor, style.outlineColor);

				if (currentItalic) {
					currentSpan.style.fontStyle = "italic";
				}

				if (currentBold === true) {
					currentSpan.style.fontWeight = "bold";
				}
				else if (currentBold !== false) {
					currentSpan.style.fontWeight = currentBold;
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
				currentSpan.style.textShadow =
					[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(function (pair) {
						return pair[0] + "px " + pair[1] + "px " + blurRadius + "px " + currentOutlineColor;
					}).join(", ");
			};
			updateSpanStyles();

			var spanStylesChanged = false;

			parts.forEach(function (part) {
				if (part instanceof ASS.Tags.Italic) {
					var newItalic = part.value;
					if (currentItalic !== newItalic) {
						currentItalic = newItalic;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Bold) {
					var newBold = part.value;
					if (currentBold !== newBold) {
						currentBold = newBold;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Underline) {
					var newUnderline = part.value;
					if (newUnderline !== currentUnderline) {
						currentUnderline = newUnderline;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Strikeout) {
					var newStrikethrough = part.value;
					if (newStrikethrough !== currentStrikethrough) {
						currentStrikethrough = newStrikethrough;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Border) {
					var newOutlineWidth = part.value;
					if (currentOutlineWidth !== newOutlineWidth) {
						currentOutlineWidth = newOutlineWidth;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Blur) {
					var newBlur = part.value;
					if (currentBlur !== newBlur) {
						currentBlur = newBlur;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.FontName) {
					var newFontName = part.value;
					if (currentFontName !== newFontName) {
						currentFontName = newFontName;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.FontSize) {
					var newFontSize = part.value;
					if (currentFontSize !== newFontSize) {
						currentFontSize = newFontSize;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Frx) {
					transformStyle += " rotateX(" + part.value + "deg)";
				}

				else if (part instanceof ASS.Tags.Fry) {
					transformStyle += " rotateY(" + part.value + "deg)";
				}

				else if (part instanceof ASS.Tags.Frz) {
					transformStyle += " rotateZ(" + (-1 * part.value) + "deg)";
				}

				else if (part instanceof ASS.Tags.Fax) {
					transformStyle += " skewX(" + (45 * part.value) + "deg)";
				}

				else if (part instanceof ASS.Tags.Fay) {
					transformStyle += " skewY(" + (45 * part.value) + "deg)";
				}

				else if (part instanceof ASS.Tags.PrimaryColor) {
					var newPrimaryColor = part.value;
					if (currentPrimaryColor !== newPrimaryColor) {
						currentPrimaryColor = newPrimaryColor;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.OutlineColor) {
					var newOutlineColor = part.value;
					if (currentOutlineColor !== newOutlineColor) {
						currentOutlineColor = newOutlineColor;
						spanStylesChanged = true;
					}
				}

				else if (part instanceof ASS.Tags.Alignment) {
				}

				else if (part instanceof ASS.Tags.Reset) {
					if (part.value === null) {
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
						var newStyle = styles.filter(function (style) { return style.name === part.value; })[0];
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

				else if (part instanceof ASS.Tags.Pos) {
					sub.style.position = "absolute";
					sub.style.left = (scaleX * part.x) + "px";
					sub.style.top = (scaleY * part.y) + "px";

					var relativeWrapper = document.createElement("div");

					relativeWrapper.style.position = "relative";
					relativeWrapper.style.top = ((9 - alignment) / 3 * -50) + "% ";
					relativeWrapper.style.left = (((alignment - 1) % 3) * -50) + "% ";

					while (sub.firstElementChild) {
						relativeWrapper.appendChild(sub.firstElementChild);
					}

					sub.appendChild(relativeWrapper);

					currentSpanContainer = relativeWrapper;
				}

				else if (part instanceof ASS.Tags.Fade) {
				}

				else if (part instanceof ASS.Tags.NewLine) {
					currentSpanContainer.appendChild(document.createElement("br"));
					createNewSpan = true;
				}

				else if (part instanceof ASS.Tags.HardSpace) {
					currentSpan.appendChild(document.createTextNode("\u00A0"));
					createNewSpan = true;
				}

				else if (part instanceof ASS.Tags.Text || (ASS.debugMode && part instanceof ASS.Tags.Comment)) {
					currentSpan.appendChild(document.createTextNode(part.value));
					createNewSpan = true;
				}

				if (spanStylesChanged) {
					updateSpanStyles();
				}
			});

			if (transformStyle) {
				currentSpanContainer.style.transform = transformStyle;
				currentSpanContainer.style.webkitTransform = transformStyle;

				var transformOrigin = (((alignment - 1) % 3) * 50) + "% " + ((5 - alignment) / 3 * 50) + "%";
				currentSpanContainer.style.transformOrigin = transformOrigin;
				currentSpanContainer.style.webkitTransformOrigin = transformOrigin;

				currentSpanContainer.style.perspective = "400";
				currentSpanContainer.style.webkitPerspective = "400";
			}

			return sub;
		};
	};
})();

/** @type {number} */
Dialogue.prototype.id;
/** @type {number} */
Dialogue.prototype.start;
/** @type {number} */
Dialogue.prototype.end;
/** @type {number} */
Dialogue.prototype.alignment;
/** @type {number} */
Dialogue.prototype.layer;
/** @type {!Array.<!Object>} */
Dialogue.prototype.parts;

/**
 * @return {string}
 */
Dialogue.prototype.toString = function () {
	return "[" + this.start.toFixed(3) + "-" + this.end.toFixed(3) + "] " + this.parts.join(", ");
};

/** @type {Dialogue} */
HTMLDivElement.prototype.dialogue;

/**
 * @constructor
 * @param {number} id
 * @param {number} start
 * @param {number} end
 */
Dialogue.KeyframeCollection = function (id, start, end) {
	/** @type {!Object.<string, !Object.<string, string>>} */
	var keyframes = {};

	/**
	 * @param {number} time
	 * @param {string} property
	 * @param {string} value
	 */
	this.add = function (time, property, value) {
		var step = (100 * (time - start) / (end - start)) + "%";
		keyframes[step] = keyframes[step] || {};
		keyframes[step][property] = value;
	};

	/**
	 * @return {string}
	 */
	this.toCSS = function () {
		var result = "";

		var steps = Object.keys(keyframes);
		if (steps.length > 0) {
			var cssText = "";

			steps.forEach(function (step) {
				cssText += "\t" + step + " {\n";
				var properties = keyframes[step];
				Object.keys(properties).forEach(function (property) {
					cssText += "\t\t" + property + ": " + properties[property] + ";\n";
				});
				cssText += "\t}\n";
			});

			result = "@keyframes dialogue-" + id + " {\n" + cssText + "}\n\n" + "@-webkit-keyframes dialogue-" + id + " {\n" + cssText + "}\n\n";
		}

		return result;
	};
};
