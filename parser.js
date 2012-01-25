"use strict";

var ASS = function (info, styles, dialogues) {
	var m_info = info;
	var m_styles = styles;
	var m_dialogues = dialogues;

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

var Style = function (name, alignment, primaryColor, fontName, fontSize) {
	var m_name = name;
	var m_alignment = alignment;
	var m_primaryColor = primaryColor;
	var m_fontName = fontName;
	var m_fontSize = fontSize;

	var m_ass;

	this.getName = function () {
		return m_name;
	};

	this.getAlignment = function () {
		return m_alignment;
	};

	this.getPrimaryColor = function () {
		return m_primaryColor;
	};

	this.getFontName = function () {
		return m_fontName;
	};

	this.getFontSize = function () {
		return m_fontSize;
	};

	this.setASS = function (ass) {
		m_ass = ass;
	};
};

var parseASS = function (rawASS) {
	var info;
	var styles = [];
	var dialogues = [];

	var assLines = rawASS.split("\n");
	var i;

	var playResX;
	var playResY;
	for (i = 0; i < assLines.length && assLines[i] !== "[Script Info]"; ++i);
	if (i < assLines.length) {
		assLines.slice(i + 1).some(function (line, index) {
			if (line.startsWith("PlayResX:")) {
				playResX = parseInt(line.substring("PlayResX:".length).trim(), 10);
			}
			else if (line.startsWith("PlayResY:")) {
				playResY = parseInt(line.substring("PlayResY:".length).trim(), 10);
			}

			var result = (playResX !== undefined && playResY !== undefined);
			if (result) {
				i = index;
			}
			return result;
		});
	}
	if (playResX !== undefined && playResY !== undefined) {
		info = new Info(playResX, playResY);
	}

	for (; i < assLines.length && assLines[i] !== "[V4+ Styles]"; ++i);
	if ((i + 1) < assLines.length) {
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
			var primaryColorIndex = styleFormatParts.indexOf("PrimaryColour");
			var fontNameIndex = styleFormatParts.indexOf("Fontname");
			var fontSizeIndex = styleFormatParts.indexOf("Fontsize");

			assLines.slice(i + styleFormatLineIndex + 2).some(function (line, index) {
				var result = false;

				if (line.startsWith("Style:")) {
					var lineParts = line.substring("Style:".length).trimLeft().split(",");
					styles.push(
						new Style(
							lineParts[nameIndex],
							lineParts[alignmentIndex],
							lineParts[primaryColorIndex].match(/&H([0-9a-fA-F]{8})/)[1].toRGBA(),
							lineParts[fontNameIndex],
							lineParts[fontSizeIndex]
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
	}

	for (; i < assLines.length && assLines[i] !== "[Events]"; ++i);
	if ((i + 1) < assLines.length) {
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
	}

	var ass = new ASS(info, styles, dialogues);
	info.setASS(ass);
	styles.forEach(function (style) { style.setASS(ass); });
	dialogues.forEach(function (dialogue) { dialogue.setASS(ass); });
	return ass;
}