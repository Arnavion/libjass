"use strict";

var Dialogue = function (id, parts, style, start, end, layer) {
	var m_alignment = style.alignment;

	Object.defineProperties(this, {
		id: { value: id, enumerable: true },
		start: { value: start, enumerable: true },
		end: { value: end, enumerable: true },
		alignment: { value: m_alignment, enumerable: true },
		layer: { value: layer, enumerable: true },
		parts: { value: parts, enumerable: true },
		ass: { writable: true, enumerable: true }
	});

	var m_sub = null;

	// Magic happens here (TODO: styling)
	this.drawTo = function (sub, currentTime) {
		m_sub = sub;

		var info = this.ass.info;
		var scaleX = info.scaleX;
		var scaleY = info.scaleY;
		var dpi = info.dpi;

		var animationEndCallback = m_sub.remove.bind(m_sub);

		m_sub.style.animationName = "dialogue-" + id;
		m_sub.style.animationDuration = (end - start) + "s";
		m_sub.style.animationDelay = (start - currentTime) + "s";
		m_sub.addEventListener("animationend", animationEndCallback, false);

		m_sub.style.webkitAnimationName = "dialogue-" + id;
		m_sub.style.webkitAnimationDuration = (end - start) + "s";
		m_sub.style.webkitAnimationDelay = (start - currentTime) + "s";
		m_sub.addEventListener("webkitAnimationEnd", animationEndCallback, false);

		m_sub.style.marginLeft = (scaleX * style.marginLeft) + "px";
		m_sub.style.marginRight = (scaleX * style.marginRight) + "px";
		m_sub.style.marginTop = m_sub.style.marginBottom = (scaleX * style.marginVertical) + "px";

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
		var currentSpanContainer = m_sub; // Changes to a wrapper if {\pos} is present
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

			currentSpan.style.textDecoration = "";

			if (currentUnderline) {
				currentSpan.style.textDecoration = "underline";
			}

			if (currentStrikethrough) {
				currentSpan.style.textDecoration += " line-through";
			}

			currentSpan.style.fontFamily = "\"" + currentFontName + "\"";
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
			if (part instanceof Tags.Italic) {
				var newItalic = part.value;
				if (currentItalic !== newItalic) {
					currentItalic = newItalic;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Bold) {
				var newBold = part.value;
				if (currentBold !== newBold) {
					currentBold = newBold;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Underline) {
				var newUnderline = part.value;
				if (newUnderline !== currentUnderline) {
					currentUnderline = newUnderline;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Strikeout) {
				var newStrikethrough = part.value;
				if (newStrikethrough !== currentStrikethrough) {
					currentStrikethrough = newStrikethrough;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Border) {
				var newOutlineWidth = part.value;
				if (currentOutlineWidth !== newOutlineWidth) {
					currentOutlineWidth = newOutlineWidth;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Blur) {
				var newBlur = part.value;
				if (currentBlur !== newBlur) {
					currentBlur = newBlur;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.FontName) {
				var newFontName = part.value;
				if (currentFontName !== newFontName) {
					currentFontName = newFontName;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.FontSize) {
				var newFontSize = part.value;
				if (currentFontSize !== newFontSize) {
					currentFontSize = newFontSize;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Frx) {
				transformStyle += " rotateX(" + part.value + "deg)";
			}

			else if (part instanceof Tags.Fry) {
				transformStyle += " rotateY(" + part.value + "deg)";
			}

			else if (part instanceof Tags.Frz) {
				transformStyle += " rotateZ(" + (-1 * part.value) + "deg)";
			}

			else if (part instanceof Tags.Fax) {
				transformStyle += " skewX(" + (45 * part.value) + "deg)";
			}

			else if (part instanceof Tags.Fay) {
				transformStyle += " skewY(" + (45 * part.value) + "deg)";
			}

			else if (part instanceof Tags.PrimaryColor) {
				var newPrimaryColor = part.value;
				if (currentPrimaryColor !== newPrimaryColor) {
					currentPrimaryColor = newPrimaryColor;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.OutlineColor) {
				var newOutlineColor = part.value;
				if (currentOutlineColor !== newOutlineColor) {
					currentOutlineColor = newOutlineColor;
					spanStylesChanged = true;
				}
			}

			else if (part instanceof Tags.Alignment) {
				m_alignment = part.value;
			}

			else if (part instanceof Tags.Reset) {
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
					var newStyle = this.ass.styles.filter(function (style) { return style.name === part.value; })[0];
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

			else if (part instanceof Tags.Pos) {
				m_sub.style.position = "absolute";
				m_sub.style.left = (scaleX * part.x) + "px";
				m_sub.style.top = (scaleY * part.y) + "px";

				var relativeWrapper = document.createElement("div");
				relativeWrapper.style.position = "relative";
				while (m_sub.firstElementChild) {
					relativeWrapper.appendChild(m_sub.firstElementChild);
				}
				relativeWrapper.style.top = ((9 - m_alignment) / 3 * -50) + "% ";
				relativeWrapper.style.left = (((m_alignment - 1) % 3) * -50) + "% ";
				m_sub.appendChild(relativeWrapper);
				currentSpanContainer = relativeWrapper;
			}

			else if (part instanceof Tags.Fade) {
			}

			else if (part instanceof Tags.NewLine) {
				currentSpanContainer.appendChild(document.createElement("br"));
				createNewSpan = true;
			}

			else if (part instanceof Tags.HardSpace) {
				currentSpan.appendChild(document.createTextNode("\u00A0"));
				createNewSpan = true;
			}

			else if (part instanceof Tags.Text) {
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

			var transformOrigin = (((m_alignment - 1) % 3) * 50) + "% " + ((5 - m_alignment) / 3 * 50) + "%";
			currentSpanContainer.style.transformOrigin = transformOrigin;
			currentSpanContainer.style.webkitTransformOrigin = transformOrigin;

			currentSpanContainer.style.perspective = "400";
			currentSpanContainer.style.webkitPerspective = "400";
		}
	};

	this.erase = function () { m_sub = null; };

	this.isDrawn = function () { return m_sub !== null; };

	this.toString = function () {
		return "[" + start.toFixed(3) + "-" + end.toFixed(3) + "] " + parts.join(", ");
	};
};

Dialogue.Parser = function (pegjs) {
	var parser = PEG.buildParser(pegjs);

	this.parse = function (text, rule) {
		return parser.parse(text, rule || "dialogue");
	};
};

(function () {
	var lastDialogueId = -1;

	var animationStyleNode = null;

	/**
	 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
	 */
	var toTime = function (string) {
		return string.split(":").reduce(function (previousValue, currentValue) {
			return previousValue * 60 + parseFloat(currentValue);
		}, 0);
	};

	Dialogue.create = function (parser, text, style, start, end, layer) {
		var id = ++lastDialogueId;
		start = toTime(start);
		end = toTime(end);

		layer = ((layer >= 0) ? layer : 0);

		var parts = parser.parse(text);

		// Merge consecutive text parts into one part
		parts = parts.reduce(function (previous, current) {
			if (current instanceof Tags.Text && previous[previous.length - 1] instanceof Tags.Text) {
				previous[previous.length - 1] = new Tags.Text(previous[previous.length - 1].value + current.value);
			}
			else {
				previous.push(current);
			}

			return previous;
		}, []);

		// Create an animation if there is a part that requires it

		var keyframes = {};
		var addKeyframe = function (step, property, value) {
			step = (100 * (step - start) / (end - start)) + "%";
			keyframes[step] = keyframes[step] || {};
			keyframes[step][property] = value;
		};

		parts.forEach(function (part) {
			if (part instanceof Tags.Fade) {
				if (part.start !== 0) {
					addKeyframe(start, "opacity", "0");
					addKeyframe(start + part.start, "opacity", "1");
				}
				if (part.end !== 0) {
					addKeyframe(end - part.end, "opacity", "1")
					addKeyframe(end, "opacity", "0");
				}
			}
		});

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

			if (animationStyleNode === null) {
				var animationStyleElement = document.createElement("style");
				document.querySelector("head").appendChild(animationStyleElement);

				animationStyleNode = document.createTextNode("");
				animationStyleElement.appendChild(animationStyleNode);
			}

			animationStyleNode.textContent += "@keyframes dialogue-" + id + " {\n" + cssText + "}\n\n" + "@-webkit-keyframes dialogue-" + id + " {\n" + cssText + "}\n\n";
		}

		var result = new Dialogue(id, parts, style, start, end, layer);

		return result;
	};
})();
