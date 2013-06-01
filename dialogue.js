"use strict";

var createDialogueParser;
var Dialogue;
var createDialogues;

(function () {
	var parseDialogue;

	createDialogueParser = function (pegjs) {
		var dialogueParser = PEG.buildParser(pegjs);

		parseDialogue = function (text) {
			return dialogueParser.parse(text, "dialogue");
		};
	};

	Dialogue = function (textOrParts, style, start, end, layer) {
		if (start.constructor === String) {
			start = start.toTime();
		}

		if (end.constructor === String) {
			end = end.toTime();
		}

		layer = ((layer >= 0) ? layer : 0);

		var m_parts =
			(textOrParts.constructor === String) ?
				parseDialogue(textOrParts).reduce(function (previous, current) {
					var result;
	
					if (current instanceof Tags.Text && previous[previous.length - 1] instanceof Tags.Text) {
						previous[previous.length - 1].value += current.value;
						result = previous;
					}
					else {
						result = previous.concat(current);
					}

					return result;
				}, []) :
				textOrParts;

		var childDialogueTextParts;
		var oldEnd;
		m_parts.forEach(function (part, index) {
			if (part instanceof Tags.Fade && part.start !== 0 && part.end !== 0) {
				childDialogueTextParts = m_parts.slice(0);
				childDialogueTextParts[index] = new Tags.Fade(0, part.end);
				oldEnd = end;
				end -= part.end;
				part.end = 0;
			}
		});
		if (childDialogueTextParts) {
			this.childDialogue = new Dialogue(childDialogueTextParts, style, end, oldEnd, layer);
		}

		var m_alignment = style.alignment;

		var m_ass;

		Object.defineProperty(this, "start", { value: start });
		Object.defineProperty(this, "end", { value: end });
		Object.defineProperty(this, "alignment", { value: m_alignment });
		Object.defineProperty(this, "layer", { value: layer });
		Object.defineProperty(this, "parts", { value: m_parts });

		var m_sub = null;
		Object.defineProperty(this, "sub", { get: function () { return m_sub; }, set: function (sub) {
			m_sub = sub;

			// Magic happens here (TODO: styling)
			if (m_sub !== null) {
				var info = m_ass.info;
				var scaleX = info.scaleX;
				var scaleY = info.scaleY;
				var dpi = info.dpi;

				m_sub.style.marginLeft = (scaleX * style.marginLeft) + "px";
				m_sub.style.marginRight = (scaleX * style.marginRight) + "px";
				m_sub.style.marginTop = m_sub.style.marginBottom = (scaleX * style.marginVertical) + "px";

				var currentItalic = style.italic;
				var currentBold = style.bold ? "bold" : "";
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

					if (currentBold) {
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

				m_parts.forEach(function (part) {
					if (part instanceof Tags.Italic) {
						var newItalic = part.value;
						if (currentItalic !== newItalic) {
							currentItalic = newItalic;
							spanStylesChanged = true;
						}
					}

					else if (part instanceof Tags.Bold) {
						var newBold;
						switch (part.value) {
							case true: newBold = "bold"; break;
							case false: newBold = ""; break;
							default: newBold = part.value; break;
						}
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
						var newPrimaryColor = "#" + part.value;
						if (currentPrimaryColor !== newPrimaryColor) {
							currentPrimaryColor = newPrimaryColor;
							spanStylesChanged = true;
						}
					}

					else if (part instanceof Tags.OutlineColor) {
						var newOutlineColor = "#" + part.value;
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
							var newStyle = m_ass.styles.filter(function (style) { return style.name === part.value; })[0];
							currentItalic = newStyle.italic;
							switch (newStyle.bold) {
							case true:
								currentBold = "bold";
								break;
							case false:
								currentBold = "";
								break;
							default :
								currentBold = newStyle.bold.value;
								break;
							}
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
						if (part.start !== 0) {
							m_sub.style.opacity = 0;
							m_sub.style.transitionDuration = part.start + "s";
							m_sub.style.MozTransitionDuration = part.start + "s";
							m_sub.style.webkitTransitionDuration = part.start + "s";
							setTimeout(function () {
								m_sub.className = "fad-in";
							}, 0);
						}
						else if (part.end !== 0) {
							m_sub.style.opacity = 1;
							m_sub.style.transitionDuration = part.end + "s";
							m_sub.style.MozTransitionDuration = part.end + "s";
							m_sub.style.webkitTransitionDuration = part.end + "s";
							setTimeout(function () {
								m_sub.classname = "fad-out";
							}, 0);
						}
					}

					else if (part instanceof Tags.NewLine) {
						currentSpanContainer.appendChild(document.createElement("br"));
						createNewSpan = true;
					}

					else if (part instanceof Tags.HardSpace) {
						currentSpan.appendChild(document.createTextNode("&#160;"));
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
					currentSpanContainer.style.MozTransform = transformStyle;
					currentSpanContainer.style.webkitTransform = transformStyle;

					var transformOrigin = (((m_alignment - 1) % 3) * 50) + "% " + ((5 - m_alignment) / 3 * 50) + "%";
					currentSpanContainer.style.transformOrigin = transformOrigin;
					currentSpanContainer.style.MozTransformOrigin = transformOrigin;
					currentSpanContainer.style.webkitTransformOrigin = transformOrigin;

					currentSpanContainer.style.webkitPerspective = "400";
				}
			}
		} });
		Object.defineProperty(this, "ass", { get: function () { return m_ass; }, set: function (ass) {
			m_ass = ass;
		} });

		this.toString = function () {
			return "[" + start + " - " + end + "] " + m_parts.join("");
		};
	};

	createDialogues = function (text, style, start, end, layer) {
		var result = [new Dialogue(text, style, start, end, layer)];

		while (result[result.length - 1].childDialogue) {
			result.push(result[result.length - 1].childDialogue);
			result[result.length - 2].childDialogue = undefined;
		}

		return result;
	};
})();

var Tags = new function () {
	this.Comment = function (value) {
		this.value = value;
	};

	this.HardSpace = function () {
	};

	this.NewLine = function () {
	};

	this.Text = function (value) {
		this.value = value;
	};

	this.Tag = function (func) {
		return function (value) {
			if (value === "") {
				this.value = null;
			}
			else if (func) {
				this.value = func(value);
			}
			else {
				this.value = value;
			}
		};
	};

	this.Italic = this.Tag(function (value) {
		if (value === "1") {
			return true;
		}
		else if (value === "0") {
			return false;
		}
	});
	this.Bold = this.Tag(function (value) {
		if (value === "1") {
			return true;
		}
		else if (value === "0") {
			return false;
		}
		else {
			return parseFloat(value);
		}
	});
	this.Underline = this.Tag(function (value) {
		if (value === "1") {
			return true;
		}
		else if (value === "0") {
			return false;
		}
	});
	this.Strikeout = this.Tag();

	this.Border = this.Tag(parseFloat);

	this.Blur = this.Tag(parseFloat);

	this.FontName = this.Tag();
	this.FontSize = this.Tag(parseFloat);

	this.Frx = this.Tag(parseFloat);
	this.Fry = this.Tag(parseFloat);
	this.Frz = this.Tag(parseFloat);
	this.Fax = this.Tag(parseFloat);
	this.Fay = this.Tag(parseFloat);

	this.PrimaryColor = this.Tag();
	this.OutlineColor = this.Tag();

	this.Alpha = this.Tag();
	this.PrimaryAlpha = this.Tag();
	this.OutlineAlpha = this.Tag();

	this.Alignment = this.Tag(parseInt);

	this.Reset = this.Tag();

	this.Pos = function (x, y) {
		this.x = parseFloat(x);
		this.y = parseFloat(y);
	};

	this.Fade = function (start, end) {
		this.start = (parseFloat(start) || 0) / 1000;
		this.end = (parseFloat(end) || 0) / 1000;
	};
};
