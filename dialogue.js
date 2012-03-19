"use strict";

var Dialogue;
var createDialogues;

(function () {
	var alignmentRegex = /^\{\\an([1-9])\}$/;

	var fontNameRegex = /^\{\\fn([^\\\}]+)\}$/;
	var fontSizeRegex = /^\{\\fs(\d+(?:\.\d+)?)\}$/;

	var boldRegex = /^\{\\b([01])\}$/;
	var boldWeightRegex = /^\{\\b(?:[1-9]00)\}$/;
	var italicRegex = /^\{\\i([01])\}$/;

	var primaryColorRegex = /^\{\\1?c&H([0-9a-fA-F]{6})&\}$/;
	var borderRegex = /^\{\\bord(\d+(?:\.\d+)?)\}$/;
	var outlineColorRegex = /^\{\\3c&H([0-9a-fA-F]{6})&\}$/;

	var blurRegex = /^\{\\blur(\d+(?:\.\d+)?)\}$/;

	var posRegex = /^\{\\pos\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)\}$/;

	var frxRegex = /^\{\\frx(-?\d+(?:\.\d+)?)\}$/;
	var fryRegex = /^\{\\fry(-?\d+(?:\.\d+)?)\}$/;
	var frzRegex = /^\{\\frz(-?\d+(?:\.\d+)?)\}$/;
	var faxRegex = /^\{\\fax(-?\d+(?:\.\d+)?)\}$/;
	var fayRegex = /^\{\\fay(-?\d+(?:\.\d+)?)\}$/;

	var fadRegex = /^\{\\fad\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)\}$/;

	Dialogue = function (text, style, start, end, layer) {
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

		var m_textParts = [];
		text.split(/(\{[^}]*\})|(\\N)/).filter(function (textPart) {
			return textPart !== undefined && textPart !== "" && (!textPart.startsWith("{") || textPart.startsWith("{\\"));
		}).map(function (textPart) {
			var result = [textPart];

			if (textPart.startsWith("{") && textPart.endsWith("}")) {
				result =
					textPart.split(/\\([^\\\}]*)/).filter(function (textSubPart) {
						return textSubPart !== "" && textSubPart !== "{" && textSubPart !== "}";
					}).map(function (textSubPart) {
						return "{\\" + textSubPart + "}";
					});
			}

			return result;
		}).forEach(function (textParts) {
			textParts.forEach(function(textPart) {
				var fadMatch = fadRegex.exec(textPart);
				if (!fadMatch || fadMatch[2] === "0" || fadMatch[1] === "0") {
					m_textParts.push(textPart);
					if (hasFadeInAndFadeOut) {
						childDialogueTextParts.push(textPart);
					}
				}
				else {
					hasFadeInAndFadeOut = true;
					childDialogueTextParts = m_textParts.slice(0);
					childDialogueTextParts.push("{\\fad(0," + fadMatch[2] + ")}");
					if (fadMatch[1] && fadMatch[1] !== "0") {
						m_textParts.push("{\\fad(" + fadMatch[1] + ",0)}");
						m_end -= (fadMatch[2] / 1000);
					}
				}
			});
		});

		if (hasFadeInAndFadeOut) {
			this.childDialogue = new Dialogue(childDialogueTextParts.join(""), style, m_end, end, m_layer);
		}

		var m_alignment = m_style.getAlignment();

		var m_ass;

		var that = this;

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
				var styleInfo = m_ass.getInfo();
				var scaleX = styleInfo.getScaleX();
				var scaleY = styleInfo.getScaleY();

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
					currentSpan.style.fontSize = ((84 / 96) * scaleY * currentFontSize) + "px";
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

				m_textParts.forEach(function (textPart) {
					var matchResult;

					if (matchResult = alignmentRegex.exec(textPart)) {
						m_alignment = parseInt(matchResult[1], 10);
					}

					else if (matchResult = fontNameRegex.exec(textPart)) {
						var newFontName = matchResult;
						if (currentFontName !== newFontName) {
							currentFontName = newFontName;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = fontSizeRegex.exec(textPart)) {
						var newFontSize = parseFloat(matchResult[1]);
						if (currentFontSize !== newFontSize) {
							currentFontSize = newFontSize;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = boldRegex.exec(textPart)) {
						var newBold = ((matchResult[1] === "1") ? "bold" : "");
						if (currentBold !== newBold) {
							currentBold = newBold;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = boldWeightRegex.exec(textPart)) {
						var newBold = matchResult[1];
						if (currentBold !== newBold) {
							currentBold = newBold;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = italicRegex.exec(textPart)) {
						var newItalic = (parseInt(matchResult[1], 10) === 1);
						if (currentItalic !== newItalic) {
							currentItalic = newItalic;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = primaryColorRegex.exec(textPart)) {
						var newPrimaryColor = "#" + matchResult[1].toRGB();
						if (currentPrimaryColor !== newPrimaryColor) {
							currentPrimaryColor = newPrimaryColor;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = borderRegex.exec(textPart)) {
						var newOutlineWidth = parseFloat(matchResult[1]);
						if (currentOutlineWidth !== newOutlineWidth) {
							currentOutlineWidth = newOutlineWidth;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = outlineColorRegex.exec(textPart)) {
						var newOutlineColor = "#" + matchResult[1].toRGB();;
						if (currentOutlineColor !== newOutlineColor) {
							currentOutlineColor = newOutlineColor;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = blurRegex.exec(textPart)) {
						var newBlur = parseFloat(matchResult[1]);
						if (currentBlur !== newBlur) {
							currentBlur = newBlur;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = posRegex.exec(textPart)) {
						m_sub.style.position = "absolute";
						m_sub.style.left = (scaleX * parseFloat(matchResult[1])) + "px";
						m_sub.style.top = (scaleY * parseFloat(matchResult[2])) + "px";

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

					else if (matchResult = frxRegex.exec(textPart)) {
						transformStyle += " rotateX(" + matchResult[1] + "deg)";
					}

					else if (matchResult = fryRegex.exec(textPart)) {
						transformStyle += " rotateY(" + matchResult[1] + "deg)";
					}

					else if (matchResult = frzRegex.exec(textPart)) {
						transformStyle += " rotateZ(" + (-1 * parseFloat(matchResult[1])) + "deg)";
					}

					else if (matchResult = faxRegex.exec(textPart)) {
						transformStyle += " skewX(" + (45 * parseFloat(matchResult[1])) + "deg)";
					}

					else if (matchResult = fayRegex.exec(textPart)) {
						transformStyle += " skewY(" + (45 * parseFloat(matchResult[1])) + "deg)";
					}

					else if (matchResult = fadRegex.exec(textPart)) {
						if (matchResult[1] !== "0") {
							m_sub.style.opacity = 0;
							m_sub.style.transitionDuration = (parseFloat(matchResult[1]) / 1000) + "s";
							m_sub.style.mozTransitionDuration = (parseFloat(matchResult[1]) / 1000) + "s";
							m_sub.style.webkitTransitionDuration = (parseFloat(matchResult[1]) / 1000) + "s";
							setTimeout(function () {
								m_sub.className = "fad-in";
							}, 0);
						}
						else if (matchResult[2] !== "0") {
							m_sub.style.opacity = 1;
							m_sub.style.transitionDuration = (parseFloat(matchResult[2]) / 1000) + "s";
							m_sub.style.mozTransitionDuration = (parseFloat(matchResult[2]) / 1000) + "s";
							m_sub.style.webkitTransitionDuration = (parseFloat(matchResult[2]) / 1000) + "s";
							setTimeout(function () {
								m_sub.classname = "fad-out";
							}, 0);
						}
					}

					else if (textPart === "\\N") {
						currentSpanContainer.appendChild(document.createElement("br"));
						createNewSpan = true;
					}

					else {
						currentSpan.appendChild(document.createTextNode(textPart));
						createNewSpan = true;
					}

					if (spanStylesChanged) {
						updateSpanStyles();
					}
				});

				if (transformStyle) {
					currentSpanContainer.style.transform = transformStyle;
					currentSpanContainer.style.mozTransform = transformStyle;
					currentSpanContainer.style.webkitTransform = transformStyle;

					var transformOrigin = (((m_alignment - 1) % 3) * 50) + "% " + ((5 - m_alignment) / 3 * 50) + "%";
					currentSpanContainer.style.transformOrigin = transformOrigin;
					currentSpanContainer.style.mozTransformOrigin = transformOrigin;
					currentSpanContainer.style.webkitTransformOrigin = transformOrigin;

					currentSpanContainer.style.webkitPerspective = "400";
				}
			}
		};


		this.setASS = function (ass) {
			m_ass = ass;
		};

		this.toString = function () {
			return "[" + m_start + " - " + m_end + "] " + m_textParts.join("");
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