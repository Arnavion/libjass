"use strict";

var ASS = function (info, styles, dialogues) {
	var m_info = info;
	var m_styles = styles;
	var m_dialogues = dialogues;

	var that = this;

	m_info.setASS(that);
	m_info.setASS = undefined;

	m_styles.forEach(function (style) {
		style.setASS(that);
		style.setASS = undefined;
	});

	m_dialogues.forEach(function (dialogue) {
		dialogue.setASS(that);
		dialogue.setASS = undefined;
	});

	this.getInfo = function () {
		return m_info;
	};

	this.getStyles = function () {
		return m_styles;
	};

	this.getDialogues = function () {
		return m_dialogues;
	};
};

var Info = function (playResX, playResY) {
	var m_playResX = playResX;
	var m_playResY = playResY;

	var m_scaleX;
	var m_scaleY;
	var m_ass;

	this.scaleTo = function (videoWidth, videoHeight) {
		m_scaleX = videoWidth / m_playResX;
		m_scaleY = videoHeight / m_playResY;
	};

	this.getScaleX = function () {
		return m_scaleX;
	};

	this.getScaleY = function () {
		return m_scaleY;
	};

	this.setASS = function (ass) {
		m_ass = ass;
	};
};

var Style = function (name, alignment, fontName, fontSize, bold, italic, underline, primaryColor, outlineWidth, outlineColor, marginLeft, marginRight, marginVertical) {
	var m_name = name;
	var m_alignment = alignment;
	var m_fontName = fontName;
	var m_fontSize = fontSize;
	var m_bold = bold;
	var m_italic = italic;
	var m_underline = underline;
	var m_primaryColor = primaryColor;
	var m_outlineWidth = outlineWidth;
	var m_outlineColor = outlineColor;
	var m_marginLeft = marginLeft;
	var m_marginRight = marginRight;
	var m_marginVertical = marginVertical;

	var m_ass;

	this.getName = function () {
		return m_name;
	};

	this.getAlignment = function () {
		return m_alignment;
	};

	this.getFontName = function () {
		return m_fontName;
	};

	this.getFontSize = function () {
		return m_fontSize;
	};

	this.getBold = function () {
		return m_bold;
	};

	this.getItalic = function () {
		return m_italic;
	};

	this.getUnderline = function () {
		return m_underline;
	};

	this.getPrimaryColor = function () {
		return m_primaryColor;
	};

	this.getOutlineWidth = function () {
		return m_outlineWidth;
	};

	this.getOutlineColor = function () {
		return m_outlineColor;
	};

	this.getMarginLeft = function () {
		return m_marginLeft;
	};

	this.getMarginRight = function () {
		return m_marginRight;
	};

	this.getMarginVertical = function () {
		return m_marginVertical;
	};

	this.setASS = function (ass) {
		m_ass = ass;
	};
};

var parseASS = function (rawASS) {
	var info;
	var styles = [];
	var dialogues = [];

	var assLines = rawASS.replace(/\r$/gm, "").split("\n");
	var i;

	var playResX;
	var playResY;
	for (i = 0; i < assLines.length && assLines[i] !== "[Script Info]"; ++i);
	assLines.slice(i + 1).every(function (line, index) {
		if (line.startsWith("PlayResX:")) {
			playResX = parseInt(line.substring("PlayResX:".length).trim(), 10);
		}
		else if (line.startsWith("PlayResY:")) {
			playResY = parseInt(line.substring("PlayResY:".length).trim(), 10);
		}

		var result = (playResX === undefined || playResY === undefined);
		if (result) {
			i = index;
		}
		return result;
	});
	if (playResX !== undefined && playResY !== undefined) {
		info = new Info(playResX, playResY);
	}

	for (; i < assLines.length && assLines[i] !== "[V4+ Styles]"; ++i);
	var styleFormatLineIndex;
	if (assLines.slice(i + 1).some(function (line, index) {
		var result = line.startsWith("Format:");
		if (result) {
			styleFormatLineIndex = index;
		}
		return result;
	})) {
		var styleFormatLine = assLines[i + styleFormatLineIndex + 1];
		var styleFormatParts = styleFormatLine.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
		var nameIndex = styleFormatParts.indexOf("Name");
		var alignmentIndex = styleFormatParts.indexOf("Alignment");
		var fontNameIndex = styleFormatParts.indexOf("Fontname");
		var fontSizeIndex = styleFormatParts.indexOf("Fontsize");
		var boldIndex = styleFormatParts.indexOf("Bold");
		var italicIndex = styleFormatParts.indexOf("Italic");
		var underlineIndex = styleFormatParts.indexOf("Underline");
		var primaryColorIndex = styleFormatParts.indexOf("PrimaryColour");
		var outlineWidthIndex = styleFormatParts.indexOf("Outline");
		var outlineColorIndex = styleFormatParts.indexOf("OutlineColour");
		var marginLeftIndex = styleFormatParts.indexOf("MarginL");
		var marginRightIndex = styleFormatParts.indexOf("MarginR");
		var marginVerticalIndex = styleFormatParts.indexOf("MarginV");

		assLines.slice(i + styleFormatLineIndex + 2).some(function (line, index) {
			var result = false;

			if (line.startsWith("Style:")) {
				var lineParts = line.substring("Style:".length).trimLeft().split(",");
				styles.push(
					new Style(
						lineParts[nameIndex],
						parseInt(lineParts[alignmentIndex], 10),
						lineParts[fontNameIndex],
						parseFloat(lineParts[fontSizeIndex]),
						lineParts[boldIndex] === "-1",
						lineParts[italicIndex] === "-1",
						lineParts[underlineIndex] === "-1",
						lineParts[primaryColorIndex].match(/&H([0-9a-fA-F]{8})/)[1].toRGBA(),
						parseFloat(lineParts[outlineWidthIndex]),
						lineParts[outlineColorIndex].match(/&H([0-9a-fA-F]{8})/)[1].toRGBA(),
						parseInt(lineParts[marginLeftIndex], 10),
						parseInt(lineParts[marginRightIndex], 10),
						parseInt(lineParts[marginVerticalIndex], 10)
					)
				);
			}
			else if (line.startsWith("[")) {
				result = true;
				i += index + 1;
			}

			return result;
		});
	}

	for (; i < assLines.length && assLines[i] !== "[Events]"; ++i);
	var dialogueFormatLineIndex;
	if (assLines.slice(i + 1).some(function (line, lineIndex) {
		var result = line.startsWith("Format:");
		if (result) {
			dialogueFormatLineIndex = lineIndex;
		}
		return result;
	})) {
		var dialogueFormatLine = assLines[i + dialogueFormatLineIndex + 1];
		var dialogueFormatParts = dialogueFormatLine.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
		var styleIndex = dialogueFormatParts.indexOf("Style");
		var startIndex = dialogueFormatParts.indexOf("Start");
		var endIndex = dialogueFormatParts.indexOf("End");
		var textIndex = dialogueFormatParts.indexOf("Text");
		var layerIndex = dialogueFormatParts.indexOf("Layer");

		assLines.slice(i + dialogueFormatLineIndex + 2).some(function (line) {
			var result = false;

			if (line.startsWith("Dialogue:")) {
				var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
				dialogues = dialogues.concat(createDialogues(
					lineParts.slice(textIndex).join(","),
					styles.filter(function (aStyle) { return aStyle.getName() === lineParts[styleIndex]; })[0],
					lineParts[startIndex],
					lineParts[endIndex],
					lineParts[layerIndex]));
			}
			else if (line.startsWith("[")) {
				result = true;
			}

			return result;
		});
	}

	dialogues.sort(function (dialogue) { return dialogue.getStart(); });

	return new ASS(info, styles, dialogues);
}