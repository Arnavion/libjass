"use strict";

var ASS = function (info, styles, dialogues) {
	info.ass = this;

	styles.forEach(function (style) {
		style.ass = this;
	}, this);

	dialogues.forEach(function (dialogue) {
		dialogue.ass = this;
	}, this);

	Object.defineProperty(this, "info", { value: info });
	Object.defineProperty(this, "styles", { value: styles });
	Object.defineProperty(this, "dialogues", { value: dialogues });
};

var Info = function (playResX, playResY) {
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
	var styles = [];
	var dialogues = [];

	var playResX;
	var playResY;

	var nameIndex;
	var italicIndex;
	var boldIndex;
	var underlineIndex;
	var strikethroughIndex;
	var outlineWidthIndex;
	var fontNameIndex;
	var fontSizeIndex;
	var primaryColorIndex;
	var outlineColorIndex;
	var alignmentIndex;
	var marginLeftIndex;
	var marginRightIndex;
	var marginVerticalIndex;

	var styleIndex;
	var startIndex;
	var endIndex;
	var textIndex;
	var layerIndex;

	rawASS.replace(/\r$/gm, "").split("\n").toEnumerable().skipWhile(function (line) {
		return line !== "[Script Info]";
	}).skipWhile(function (line) {
		var result = line !== "[V4+ Styles]";

		if (line.startsWith("PlayResX:")) {
			playResX = parseInt(line.substring("PlayResX:".length).trim());
		}
		else if (line.startsWith("PlayResY:")) {
			playResY = parseInt(line.substring("PlayResY:".length).trim());
		}

		return result;
	}).skipWhile(function (line) {
		var result = !line.startsWith("Format:");

		if (!result) {
			var styleFormatParts = line.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
			nameIndex = styleFormatParts.indexOf("Name");
			italicIndex = styleFormatParts.indexOf("Italic");
			boldIndex = styleFormatParts.indexOf("Bold");
			underlineIndex = styleFormatParts.indexOf("Underline");
			strikethroughIndex = styleFormatParts.indexOf("Strikeout");
			outlineWidthIndex = styleFormatParts.indexOf("Outline");
			fontNameIndex = styleFormatParts.indexOf("Fontname");
			fontSizeIndex = styleFormatParts.indexOf("Fontsize");
			primaryColorIndex = styleFormatParts.indexOf("PrimaryColour");
			outlineColorIndex = styleFormatParts.indexOf("OutlineColour");
			alignmentIndex = styleFormatParts.indexOf("Alignment");
			marginLeftIndex = styleFormatParts.indexOf("MarginL");
			marginRightIndex = styleFormatParts.indexOf("MarginR");
			marginVerticalIndex = styleFormatParts.indexOf("MarginV");
		}

		return result;
	}).skipWhile(function (line) {
		var result = !line.startsWith("[Events]");

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

		return result;
	}).skipWhile(function (line) {
		var result = !line.startsWith("Format:");

		if (!result) {
			var dialogueFormatParts = line.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
			styleIndex = dialogueFormatParts.indexOf("Style");
			startIndex = dialogueFormatParts.indexOf("Start");
			endIndex = dialogueFormatParts.indexOf("End");
			textIndex = dialogueFormatParts.indexOf("Text");
			layerIndex = dialogueFormatParts.indexOf("Layer");
		}

		return result;
	}).forEach(function (line) {
		if (line.startsWith("Dialogue:")) {
			var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
			dialogues = dialogues.concat(createDialogues(
					lineParts.slice(textIndex).join(","),
					styles.filter(function (aStyle) { return aStyle.name === lineParts[styleIndex]; })[0],
					lineParts[startIndex],
					lineParts[endIndex],
					parseInt(lineParts[layerIndex])));
		}
	});

	var info = new Info(playResX, playResY);

	dialogues.sort(function (dialogue1, dialogue2) { return dialogue1.start - dialogue2.start; });

	return new ASS(info, styles, dialogues);
}