"use strict";

var ASS = function (info, styles, dialogues) {
	var that = this;

	info.ass = that;

	styles.forEach(function (style) {
		style.ass = that;
	});

	dialogues.forEach(function (dialogue) {
		dialogue.ass = that;
	});

	Object.defineProperty(this, "info", { value: info });
	Object.defineProperty(this, "styles", { value: styles });
	Object.defineProperty(this, "dialogues", { value: dialogues });
};

var Info = function (playResX, playResY) {
	var that = this;

	var scaleX;
	var scaleY;

	this.scaleTo = function (videoWidth, videoHeight) {
		scaleX = videoWidth / playResX;
		scaleY = videoHeight / playResY;
	};

	Object.defineProperty(this, "scaleX", { get: function () { return scaleX; } });
	Object.defineProperty(this, "scaleY", { get: function () { return scaleY; } });
	Object.defineProperty(this, "dpi", { writable: true });
	Object.defineProperty(this, "ass", { writable: true });
};

var Style = function (name, italic, bold, underline, strikethrough, outlineWidth, fontName, fontSize, primaryColor, outlineColor, alignment, marginLeft, marginRight, marginVertical) {
	Object.defineProperty(this, "name", { value: name });
	Object.defineProperty(this, "italic", { value: italic });
	Object.defineProperty(this, "bold", { value: bold });
	Object.defineProperty(this, "underline", { value: underline });
	Object.defineProperty(this, "strikethrough", { value: strikethrough });
	Object.defineProperty(this, "outlineWidth", { value: outlineWidth });
	Object.defineProperty(this, "fontName", { value: fontName });
	Object.defineProperty(this, "fontSize", { value: fontSize });
	Object.defineProperty(this, "primaryColor", { value: primaryColor });
	Object.defineProperty(this, "outlineColor", { value: outlineColor });
	Object.defineProperty(this, "alignment", { value: alignment });
	Object.defineProperty(this, "marginLeft", { value: marginLeft });
	Object.defineProperty(this, "marginRight", { value: marginRight });
	Object.defineProperty(this, "marginVertical", { value: marginVertical });
	Object.defineProperty(this, "ass", { writable: true });
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
			playResX = parseInt(line.substring("PlayResX:".length).trim());
		}
		else if (line.startsWith("PlayResY:")) {
			playResY = parseInt(line.substring("PlayResY:".length).trim());
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
		var italicIndex = styleFormatParts.indexOf("Italic");
		var boldIndex = styleFormatParts.indexOf("Bold");
		var underlineIndex = styleFormatParts.indexOf("Underline");
		var strikethroughIndex = styleFormatParts.indexOf("Strikeout");
		var outlineWidthIndex = styleFormatParts.indexOf("Outline");
		var fontNameIndex = styleFormatParts.indexOf("Fontname");
		var fontSizeIndex = styleFormatParts.indexOf("Fontsize");
		var primaryColorIndex = styleFormatParts.indexOf("PrimaryColour");
		var outlineColorIndex = styleFormatParts.indexOf("OutlineColour");
		var alignmentIndex = styleFormatParts.indexOf("Alignment");
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
						lineParts[italicIndex] === "-1",
						lineParts[boldIndex] === "-1",
						lineParts[underlineIndex] === "-1",
						lineParts[strikethroughIndex] === "-1",
						parseFloat(lineParts[outlineWidthIndex]),
						lineParts[fontNameIndex],
						parseFloat(lineParts[fontSizeIndex]),
						lineParts[primaryColorIndex].match(/&H([0-9a-fA-F]{8})/)[1].toRGBA(),
						lineParts[outlineColorIndex].match(/&H([0-9a-fA-F]{8})/)[1].toRGBA(),
						parseInt(lineParts[alignmentIndex]),
						parseInt(lineParts[marginLeftIndex]),
						parseInt(lineParts[marginRightIndex]),
						parseInt(lineParts[marginVerticalIndex])
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
					styles.filter(function (aStyle) { return aStyle.name === lineParts[styleIndex]; })[0],
					lineParts[startIndex],
					lineParts[endIndex],
					parseInt(lineParts[layerIndex])));
			}
			else if (line.startsWith("[")) {
				result = true;
			}

			return result;
		});
	}

	dialogues.sort(function (dialogue1, dialogue2) { return dialogue1.start - dialogue2.start; });

	return new ASS(info, styles, dialogues);
}