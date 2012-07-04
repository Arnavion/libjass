"use strict";

/**
 * This class represents an ASS script. It contains a {@link Info} object with global information about the script,
 * an array of {@link Style}s, and an array of {@link Dialogue}s.
 * 
 * @param info The {@link Info} object
 * @param styles The array of {@link Style} objects
 * @param dialogues The array of {@link Dialogue} objects
 */
var ASS = function (info, styles, dialogues) {
	// Set the ass property of the Info object, each of the Style objects and each of the Dialogue objects
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

/**
 * This class represents the global information about the ASS script. It is obtained via the {@link ASS#info} property.
 * 
 * @param playResX The horizontal script resolution
 * @param playResY The vertical script resolution
 */
var Info = function (playResX, playResY) {
	var scaleX;
	var scaleY;

	/**
	 * This method takes in the actual video height and width and prepares the {@link #scaleX} and {@link #scaleY}
	 * properties according to the script resolution.
	 * 
	 * @param videoWidth The width of the video, in pixels
	 * @param videoHeight The height of the video, in pixels
	 */
	this.scaleTo = function (videoWidth, videoHeight) {
		scaleX = videoWidth / playResX;
		scaleY = videoHeight / playResY;
	};

	Object.defineProperty(this, "scaleX", { get: function () { return scaleX; } });
	Object.defineProperty(this, "scaleY", { get: function () { return scaleY; } });
	Object.defineProperty(this, "dpi", { writable: true });
	Object.defineProperty(this, "ass", { writable: true });
};

/**
 * This class represents a single global style declaration in an ASS script. The styles can be obtained via the
 * {@link ASS#styles} property.
 * 
 * @param name The name of the style
 * @param italic <code>true</code> if the style is italicized
 * @param bold <code>true</code> if the style is bolded
 * @param underline <code>true</code> if the style is underlined
 * @param strikethrough <code>true</code> if the style is struck-through
 * @param outlineWidth The outline width, in pixels
 * @param fontName The name of the font
 * @param fontSize The size of the font, in pixels
 * @param primaryColor The primary color, as a CSS rgba string
 * @param outlineColor The outline color, as a CSS rgba string
 * @param alignment The alignment, as an integer
 * @param marginLeft The left margin
 * @param marginRight The right margin
 * @param marginVertical The vertical margin
 */
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

// Parses the raw ASS string into an ASS object
var parseASS = function (rawASS) {
	var styles = [];
	var dialogues = [];

	// Info variables
	var playResX;
	var playResY;

	// The indices of the various constituents of a Style in a "Style: " line
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

	// The indices of the various constituents of a Dialogue in a "Dialogue: " line
	var styleIndex;
	var startIndex;
	var endIndex;
	var textIndex;
	var layerIndex;

	// Remove all \r's. Then for each line...
	rawASS.replace(/\r$/gm, "").split("\n").toEnumerable().skipWhile(function (line) {
		// Skip all lines till the script info section begins
		return line !== "[Script Info]";
	}).skipWhile(function (line) {
		// Read until the script info section ends and the styles section begins
		var result = line !== "[V4+ Styles]";

		// Parse the horizontal script resolution line
		if (line.startsWith("PlayResX:")) {
			playResX = parseInt(line.substring("PlayResX:".length).trim());
		}
		// Parse the vertical script resolution line
		else if (line.startsWith("PlayResY:")) {
			playResY = parseInt(line.substring("PlayResY:".length).trim());
		}

		return result;
	}).skipWhile(function (line) {
		// In the styles section, skip till we find the format specifier line
		var result = !line.startsWith("Format:");

		// If we've found it, parse it to get the indices of the constituents of a Style object
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
		// Read all the styles till the styles section ends and the events section starts
		var result = !line.startsWith("[Events]");

		// If this is a style line
		if (line.startsWith("Style:")) {
			var lineParts = line.substring("Style:".length).trimLeft().split(",");
			// Create the style and add it into the styles array
			styles.push(new Style(
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
				parseFloat(lineParts[marginLeftIndex]),
				parseFloat(lineParts[marginRightIndex]),
				parseFloat(lineParts[marginVerticalIndex])
			));
		}

		return result;
	}).skipWhile(function (line) {
		// In the events section, skip till we find the format specifier line
		var result = !line.startsWith("Format:");

		// If we've found it, parse it to get the indices of the constituents of a Dialogue object
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
		// Read all the dialogues and add them to the dialogues array
		if (line.startsWith("Dialogue:")) {
			var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
			dialogues = dialogues.concat(createDialogues(
				lineParts.slice(textIndex).join(","),
				styles.filter(function (aStyle) { return aStyle.name === lineParts[styleIndex]; })[0],
				lineParts[startIndex],
				lineParts[endIndex],
				parseInt(lineParts[layerIndex])
			));
		}
	});

	// Create the script info object
	var info = new Info(playResX, playResY);

	// Sort the dialogues array by start time
	dialogues.sort(function (dialogue1, dialogue2) { return dialogue1.start - dialogue2.start; });

	// Return an ASS object with the info, list of styles and list of dialogues parsed from the raw ASS string
	return new ASS(info, styles, dialogues);
}