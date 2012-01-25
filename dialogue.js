"use strict";

var Dialogue;
var createDialogues;

(function () {
	var alignmentRegex = /^\{\\an([1-9])\}$/;
	var colorRegex = /^\{\\1?c&H([0-9a-fA-F]{6})&$\}/;
	var borderColorRegex = /^\{\\3c&H([0-9a-fA-F]{6})&\}$/;
	var fadRegex = /^\{\\fad\(([0-9]+),([0-9]+)\)\}$/;
	var blurRegex = /^\{\\blur([0-9])\}$/;
	var italicsRegex = /^\{\\i([01])\}$/;

	Dialogue = function (text, style, start, end, layer) {
		var m_style = style;

		var m_start;
		if (start.constructor === String) {
			var startParts = start.split(":");
			m_start = startParts[0] * 60 * 60 + startParts[1] * 60 + startParts[2] * 1;
		}
		else {
			m_start = start;
		}

		var m_end;
		if (end.constructor === String) {
			var endParts = end.split(":");
			m_end = endParts[0] * 60 * 60 + endParts[1] * 60 + endParts[2] * 1;
		}
		else {
			m_end = end;
		}

		var m_sub = null;

		var hasFadeInAndFadeOut = false;
		var childDialogueTextParts;

		var m_layer = ((layer >= 0) ? layer : 0);

		var m_textParts = [];
		text.split(/(\{[^}]*\})/).filter(function (textPart) {
			return textPart !== "" && (!textPart.startsWith("{") || textPart.startsWith("{\\"));
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
				var currentFontName = m_style.getFontName();
				var currentFontSize = m_style.getFontSize();
				var currentBorderColor = null; // TODO: Read default from styles
				var currentColor = m_style.getPrimaryColor();
				var currentBlur = 0; // TODO: Read default from styles
				var currentItalics = false; // TODO: Read default from styles

				var currentSpan;
				var spanAlreadyHasContent = true;
				var createNewSpan = function () {
					if (spanAlreadyHasContent) {
						currentSpan = document.createElement("span");
						m_sub.appendChild(currentSpan);
						spanAlreadyHasContent = false;
					}

					currentSpan.style.fontFamily = "\"" + currentFontName + "\"";
					currentSpan.style.fontSize = (m_ass.getInfo().getScaleY() * currentFontSize) + "px";

					currentSpan.style.color = currentColor;

					var blurRadius = 1;
					if (currentBlur > 0) {
						blurRadius = currentBlur / 2;
					}
					currentSpan.style.textShadow =
						"1px 1px " + blurRadius + "px " + currentBorderColor + ", " +
						"1px -1px " + blurRadius + "px " + currentBorderColor + ", " +
						"-1px 1px " + blurRadius + "px " + currentBorderColor + ", " +
						"-1px -1px " + blurRadius + "px " + currentBorderColor;

					if (currentItalics) {
						currentSpan.style.fontStyle = "italic";
					}
				};
				createNewSpan();

				var spanStylesChanged = false;

				m_textParts.forEach(function (textPart) {
					var matchResult;

					if (matchResult = alignmentRegex.exec(textPart)) {
						m_alignment = matchResult[1];
					}

					else if (matchResult = colorRegex.exec(textPart)) {
						var newColor = "#" + matchResult[1].toRGB();
						if (currentColor !== newColor) {
							currentColor = newColor;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = borderColorRegex.exec(textPart)) {
						var newBorderColor = "#" + matchResult[1].toRGB();;
						if (currentBorderColor !== newBorderColor) {
							currentBorderColor = newBorderColor;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = fadRegex.exec(textPart)) {
						if (matchResult[1] !== "0") {
							m_sub.className = "fad-in";
							m_sub.style.webkitTransitionDuration = (matchResult[1] / 1000) + "s";
							m_sub.style.mozTransitionDuration = (matchResult[1] / 1000) + "s";
							m_sub.style.transitionDuration = (matchResult[1] / 1000) + "s";
							setTimeout(function () {
								m_sub.style.opacity = 1;
							}, 1);
						}
						else if (matchResult[2] !== "0") {
							m_sub.classname = "fad-out";
							m_sub.style.webkitTransitionDuration = (matchResult[2] / 1000) + "s";
							m_sub.style.mozTransitionDuration = (matchResult[2] / 1000) + "s";
							m_sub.style.transitionDuration = (matchResult[2] / 1000) + "s";
							setTimeout(function () {
								m_sub.style.opacity = 0;
							}, 1);
						}
					}

					else if (matchResult = blurRegex.exec(textPart)) {
						var newBlur = matchResult[1];
						if (currentBlur !== newBlur) {
							currentBlur = newBlur;
							spanStylesChanged = true;
						}
					}

					else if (matchResult = italicsRegex.exec(textPart)) {
						var newItalics = (parseInt(matchResult[1], 10) === 1);
						if (currentItalics !== newItalics) {
							currentItalics = newItalics;
							spanStylesChanged = true;
						}
					}

					else {
						currentSpan.appendChild(document.createTextNode(textPart));
						spanAlreadyHasContent = true;
					}

					if (spanStylesChanged) {
						createNewSpan();
					}
				});
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
			result[result.length - 2].childDialogue = null;
		}

		return result;
	};
})();