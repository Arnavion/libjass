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
		}
	};

	Dialogue = function (textOrParts, style, start, end, layer) {
		var that = this;

		var m_style = style;

		var m_start;
		if (start.constructor === String) {
			m_start =
				start.split(":").reduce(function (previousValue, currentValue) {
					return previousValue * 60 + parseFloat(currentValue);
				}, 0);
		}
		else {
			m_start = start;
		}

		var m_end;
		if (end.constructor === String) {
			m_end =
				end.split(":").reduce(function (previousValue, currentValue) {
					return previousValue * 60 + parseFloat(currentValue);
				}, 0);
		}
		else {
			m_end = end;
		}

		var m_sub = null;

		var hasFadeInAndFadeOut = false;
		var childDialogueTextParts;

		var m_layer = ((layer >= 0) ? layer : 0);

		var m_parts =
			(textOrParts instanceof Array) ?
				textOrParts :
				parseDialogue(textOrParts).reduce(function (previous, current) {
					var result;
	
					if (current instanceof Tags.Text && previous.length > 0 && previous[previous.length - 1] instanceof Tags.Text) {
						previous[previous.length - 1].value += current.value;
						result = previous;
					}
					else {
						result = previous.concat(current);
					}

					return result;
				}, []);

		var childDialogueTextParts;
		m_parts.forEach(function (part, index) {
			if (part instanceof Tags.Fade && part.start !== 0 && part.end !== 0) {
				childDialogueTextParts = m_parts.slice(0);
				childDialogueTextParts[index] = new Tags.Fade(0, part.end);
				m_end -= part.end;
				part.end = 0;
			}
		});
		if (childDialogueTextParts) {
			this.childDialogue = new Dialogue(childDialogueTextParts, style, m_end, end, m_layer);
		}

		var m_alignment = m_style.getAlignment();

		var m_ass;

		this.getStart = function () {
			return m_start;
		};

		this.getEnd = function () {
			return m_end;
		};

		this.getAlignment = function () {
			return m_alignment;
		};

		this.getSub = function () {
			return m_sub;
		};

		this.getLayer = function () {
			return m_layer;
		};

		this.setSub = function (sub) {
			m_sub = sub;

			// Magic happens here (TODO: styling)
			if (m_sub !== null) {
				var info = m_ass.getInfo();
				var scaleX = info.getScaleX();
				var scaleY = info.getScaleY();
				var dpi = info.getDPI();

				m_sub.style.marginLeft = (scaleX * m_style.getMarginLeft()) + "px";
				m_sub.style.marginRight = (scaleX * m_style.getMarginRight()) + "px";
				m_sub.style.marginTop = m_sub.style.marginBottom = (scaleX * m_style.getMarginVertical()) + "px";

				var currentFontName = m_style.getFontName();
				var currentFontSize = m_style.getFontSize();

				var currentBold = m_style.getBold() ? "bold" : "";
				var currentItalic = m_style.getItalic();
				var currentUnderline = m_style.getUnderline();

				var currentPrimaryColor = m_style.getPrimaryColor();
				var currentOutlineWidth = m_style.getOutlineWidth();
				var currentOutlineColor = m_style.getOutlineColor();

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

					if (currentBold) {
						currentSpan.style.fontWeight = currentBold;
					}

					if (currentItalic) {
						currentSpan.style.fontStyle = "italic";
					}

					if (currentUnderline) {
						currentSpan.style.textDecoration = "underline";
					}
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
							m_sub.style.mozTransitionDuration = part.start + "s";
							m_sub.style.webkitTransitionDuration = part.start + "s";
							setTimeout(function () {
								m_sub.className = "fad-in";
							}, 0);
						}
						else if (part.end !== 0) {
							m_sub.style.opacity = 1;
							m_sub.style.transitionDuration = part.end + "s";
							m_sub.style.mozTransitionDuration = part.end + "s";
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
		};


		this.setASS = function (ass) {
			m_ass = ass;
			that.setASS = undefined;
		};

		this.toString = function () {
			return "[" + m_start + " - " + m_end + "] " + m_parts.join("");
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
	
	this.Pos = function (x, y) {
		this.x = parseFloat(x);
		this.y = parseFloat(y);
	};
	
	this.Fade = function (start, end) {
		this.start = (parseFloat(start) || 0) / 1000;
		this.end = (parseFloat(end) || 0) / 1000;
	};
}