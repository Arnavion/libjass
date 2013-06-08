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
	Object.defineProperties(this, {
		info: { value: info, enumerable: true },
		styles: { value: styles, enumerable: true },
		dialogues: { value: dialogues, enumerable: true }
	});

	// Set the ass property of each of the Dialogue objects
	dialogues.forEach(function (dialogue) {
		dialogue.ass = this;
	}, this);
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

	Object.defineProperties(this, {
		scaleX: { get: function () { return scaleX; }, enumerable: true },
		scaleY: { get: function () { return scaleY; }, enumerable: true },
		dpi: { writable: true, enumerable: true }
	});
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
	Object.defineProperties(this, {
		name: { value: name, enumerable: true },
		italic: { value: italic, enumerable: true },
		bold: { value: bold, enumerable: true },
		underline: { value: underline, enumerable: true },
		strikethrough: { value: strikethrough, enumerable: true },
		outlineWidth: { value: outlineWidth, enumerable: true },
		fontName: { value: fontName, enumerable: true },
		fontSize: { value: fontSize, enumerable: true },
		primaryColor: { value: primaryColor, enumerable: true },
		outlineColor: { value: outlineColor, enumerable: true },
		alignment: { value: alignment, enumerable: true },
		marginLeft: { value: marginLeft, enumerable: true },
		marginRight: { value: marginRight, enumerable: true },
		marginVertical: { value: marginVertical, enumerable: true }
	});
};

// Parses the raw ASS string into an ASS object
ASS.parse = function (rawASS, dialogueParser) {
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
	Iterator(rawASS.replace(/\r$/gm, "").split("\n").toIterable().map(function (entry) {
		return entry[1];
	}).skipWhile(function (line) {
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
				dialogueParser.parse(lineParts[primaryColorIndex], "colorWithAlpha"),
				dialogueParser.parse(lineParts[outlineColorIndex], "colorWithAlpha"),
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
	})).forEach(function (line) {
		// Read all the dialogues and add them to the dialogues array
		if (line.startsWith("Dialogue:")) {
			var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
			dialogues.push(Dialogue.create(
				dialogueParser,
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

ASS.Tags = new function () {
	this.TagPrototype = function (name, propertyNames) {
		this.toString = function () {
			var that = this;
			return (
				name + " { " +
				propertyNames.map(function (name) {
					return name + ": " + that[name]
				}).join(", ") + ((propertyNames.length > 0) ? " " : "") +
				"}"
			);
		};
	}

	this.Tag = function (name) {
		var propertyNames = [].slice.call(arguments, 1);

		var result = function () {
			var values = arguments;
			var that = this;
			Object.defineProperty(this, "name", { value: name, enumerable: true });
			propertyNames.forEach(function (name, index) {
				Object.defineProperty(that, name, { value: values[index], enumerable: true });
			});
		};

		result.prototype = new this.TagPrototype(name, propertyNames);

		return result;
	};

	this.Comment = this.Tag("Comment", "value");

	this.HardSpace = this.Tag("HardSpace");

	this.NewLine = this.Tag("NewLine");

	this.Text = this.Tag("Text", "value");

	this.Italic = this.Tag("Italic", "value");
	this.Bold = this.Tag("Bold", "value");
	this.Underline = this.Tag("Underline", "value");
	this.Strikeout = this.Tag("Strikeout", "value");

	this.Border = this.Tag("Border", "value");

	this.Blur = this.Tag("Blur", "value");

	this.FontName = this.Tag("FontName", "value");
	this.FontSize = this.Tag("FontSize", "value");

	this.Frx = this.Tag("Frx", "value");
	this.Fry = this.Tag("Fry", "value");
	this.Frz = this.Tag("Frz", "value");
	this.Fax = this.Tag("Fax", "value");
	this.Fay = this.Tag("Fay", "value");

	this.PrimaryColor = this.Tag("PrimaryColor", "value");
	this.OutlineColor = this.Tag("OutlineColor", "value");

	this.Alpha = this.Tag("Alpha", "value");
	this.PrimaryAlpha = this.Tag("PrimaryAlpha", "value");
	this.OutlineAlpha = this.Tag("OutlineAlpha", "value");

	this.Alignment = this.Tag("Alignment", "value");

	this.Reset = this.Tag("Reset", "value");

	this.Pos = this.Tag("Pos", "x", "y");

	this.Fade = this.Tag("Fade", "start", "end");
};
