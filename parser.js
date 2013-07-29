/**
 * libjass
 *
 * https://github.com/Arnavion/libjass
 *
 * Copyright 2013 Arnav Singh
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * This class represents an ASS script. It contains a Info object with global information about the script,
 * an array of Styles, and an array of Dialogues.
 *
 * @constructor
 * @param {!Info} info The Info object
 * @param {!Array.<!Style>} styles The array of Style objects
 * @param {!Array.<!Dialogue>} dialogues The array of Dialogue objects
 */
var ASS = function (info, styles, dialogues) {
	Object.defineProperties(this, {
		info: { value: info, enumerable: true },
		styles: { value: styles, enumerable: true },
		dialogues: { value: dialogues, enumerable: true }
	});
};

/** @type {!Info} */
ASS.prototype.info;
/** @type {!Array.<!Style>} */
ASS.prototype.styles;
/** @type {!Array.<!Dialogue>} */
ASS.prototype.dialogues;

/**
 * This class represents the global information about the ASS script. It is obtained via the ASS.info property.
 *
 * @constructor
 * @param {number} playResX The horizontal script resolution
 * @param {number} playResY The vertical script resolution
 */
var Info = function (playResX, playResY) {
	var scaleX;
	var scaleY;

	/**
	 * This method takes in the actual video height and width and prepares the scaleX and scaleY
	 * properties according to the script resolution.
	 *
	 * @param {number} videoWidth The width of the video, in pixels
	 * @param {number} videoHeight The height of the video, in pixels
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

/** @type {number} */
Info.prototype.scaleX;
/** @type {number} */
Info.prototype.scaleY;
/** @type {number} */
Info.prototype.dpi;

/**
 * This class represents a single global style declaration in an ASS script. The styles can be obtained via the ASS.styles property.
 *
 * @constructor
 * @param {string} name The name of the style
 * @param {boolean} italic true if the style is italicized
 * @param {boolean} bold <code>true</code> if the style is bolded
 * @param {boolean} underline <code>true</code> if the style is underlined
 * @param {boolean} strikethrough <code>true</code> if the style is struck-through
 * @param {number} outlineWidth The outline width, in pixels
 * @param {string} fontName The name of the font
 * @param {number} fontSize The size of the font, in pixels
 * @param {string} primaryColor The primary color, as a CSS rgba string
 * @param {string} outlineColor The outline color, as a CSS rgba string
 * @param {number} alignment The alignment, as an integer
 * @param {number} marginLeft The left margin
 * @param {number} marginRight The right margin
 * @param {number} marginVertical The vertical margin
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

/** @type {string} */
Style.prototype.name;
/** @type {boolean} */
Style.prototype.italic;
/** @type {boolean} */
Style.prototype.bold;
/** @type {boolean} */
Style.prototype.underline;
/** @type {boolean} */
Style.prototype.strikethrough;
/** @type {number} */
Style.prototype.outlineWidth;
/** @type {string} */
Style.prototype.fontName;
/** @type {number} */
Style.prototype.fontSize;
/** @type {string} */
Style.prototype.primaryColor;
/** @type {string} */
Style.prototype.outlineColor;
/** @type {number} */
Style.prototype.alignment;
/** @type {number} */
Style.prototype.marginLeft;
/** @type {number} */
Style.prototype.marginRight;
/** @type {number} */
Style.prototype.marginVertical;


/**
 * Parses the raw ASS string into an ASS object
 *
 * @param {string} rawASS
 * @param {{parse: function(string, string=): !(Object|string)}} dialogueParser
 * @return {ASS}
 */
ASS.parse = function (rawASS, dialogueParser) {
	// Info variables
	var info = null;
	var playResX = -1;
	var playResY = -1;

	// Style variables
	var styles = [];

	// The indices of the various constituents of a Style in a "Style: " line
	var nameIndex = -1;
	var italicIndex = -1;
	var boldIndex = -1;
	var underlineIndex = -1;
	var strikethroughIndex = -1;
	var outlineWidthIndex = -1;
	var fontNameIndex = -1;
	var fontSizeIndex = -1;
	var primaryColorIndex = -1;
	var outlineColorIndex = -1;
	var alignmentIndex = -1;
	var marginLeftIndex = -1;
	var marginRightIndex = -1;
	var marginVerticalIndex = -1;

	// Dialogue variables
	var dialogues = [];

	// The indices of the various constituents of a Dialogue in a "Dialogue: " line
	var styleIndex = -1;
	var startIndex = -1;
	var endIndex = -1;
	var textIndex = -1;
	var layerIndex = -1;


	// Remove all lines and make an iterable for all the lines in the script file.
	var lines = rawASS.replace(/\r$/gm, "").split("\n").toIterable().map(function (entry) {
		return entry[1];
	});

	var skipOneLine = true;

	Iterator(lines.skipWhile(function (line) {
		// Skip all lines till the script info section begins
		return line !== "[Script Info]";
	}).skipWhile(function (line) {
		if (skipOneLine) {
			skipOneLine = !skipOneLine;
			return true;
		}
		
		return false;
	}).takeWhile(function (line) {
		// Take all the lines till the script resolution is found or the script info section ends
		return (playResX === -1 || playResY === -1) && !line.startsWith("[");
	})).forEach(function (line) {
		// Parse the horizontal script resolution line
		if (line.startsWith("PlayResX:")) {
			playResX = parseInteger(line.substring("PlayResX:".length).trim());
		}
		// Parse the vertical script resolution line
		else if (line.startsWith("PlayResY:")) {
			playResY = parseInteger(line.substring("PlayResY:".length).trim());
		}

		if (playResX !== -1 && playResY !== -1) {
			// Create the script info object
			info = new Info(playResX, playResY);
		}
	});

	if (info === null) {
		throw new Error("Script does not contain script resolution.");
	}
	
	info = /** type {!Info} */ (info); // To tell closure compiler info can't be null now.


	skipOneLine = true;

	Iterator(lines.skipWhile(function (line) {
		// Skip all lines till the line styles section begins
		return line !== "[V4+ Styles]";
	}).skipWhile(function (line) {
		if (skipOneLine) {
			skipOneLine = !skipOneLine;
			return true;
		}
		
		return false;
	}).takeWhile(function (line) {
		// Take all the lines till the lines styles section ends
		return !line.startsWith("[");
	})).forEach(function (line) {
		// If this is the format line
		if (line.startsWith("Format:")) {
			// Parse the format line
			var styleFormatParts = line.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
			nameIndex = styleFormatParts.indexOf("Name");
			italicIndex = styleFormatParts.indexOf("Italic");
			boldIndex = styleFormatParts.indexOf("Bold");
			underlineIndex = styleFormatParts.indexOf("Underline");
			strikethroughIndex = styleFormatParts.indexOf("StrikeOut");
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
		
		// else if this is a style line
		else if (line.startsWith("Style:")) {
			if (
				nameIndex == -1 ||
				italicIndex == -1 ||
				boldIndex == -1 ||
				underlineIndex == -1 ||
				strikethroughIndex == -1 ||
				outlineWidthIndex == -1 ||
				fontNameIndex == -1 ||
				fontSizeIndex == -1 ||
				primaryColorIndex == -1 ||
				outlineColorIndex == -1 ||
				alignmentIndex == -1 ||
				marginLeftIndex == -1 ||
				marginRightIndex == -1 ||
				marginVerticalIndex == -1
			) {
				throw new Error("All required line styles not found.");
			}

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
				/** @type {string} */ (dialogueParser.parse(lineParts[primaryColorIndex], "colorWithAlpha")),
				/** @type {string} */ (dialogueParser.parse(lineParts[outlineColorIndex], "colorWithAlpha")),
				parseInteger(lineParts[alignmentIndex]),
				parseFloat(lineParts[marginLeftIndex]),
				parseFloat(lineParts[marginRightIndex]),
				parseFloat(lineParts[marginVerticalIndex])
			));
		}
	});


	skipOneLine = true;

	Iterator(lines.skipWhile(function (line) {
		// Skip all lines till the events section begins
		return line !== "[Events]";
	}).skipWhile(function (line) {
		if (skipOneLine) {
			skipOneLine = !skipOneLine;
			return true;
		}
		
		return false;
	}).takeWhile(function (line) {
		// Take all the lines till the events section ends
		return !line.startsWith("[");
	})).forEach(function (line) {
		// If this is a format line
		if (line.startsWith("Format:")) {
			var dialogueFormatParts = line.substring("Format:".length).split(",").map(function (formatPart) { return formatPart.trim(); });
			styleIndex = dialogueFormatParts.indexOf("Style");
			startIndex = dialogueFormatParts.indexOf("Start");
			endIndex = dialogueFormatParts.indexOf("End");
			textIndex = dialogueFormatParts.indexOf("Text");
			layerIndex = dialogueFormatParts.indexOf("Layer");
		}

		// else if this is a dialogue line
		else if (line.startsWith("Dialogue:")) {
			if (
				styleIndex == -1 ||
				startIndex == -1 ||
				endIndex == -1 ||
				textIndex == -1 ||
				layerIndex == -1
			) {
				throw new Error("All required event styles not found.");
			}

			var lineParts = line.substring("Dialogue:".length).trimLeft().split(",");
			// Create the dialogue and add it to the dialogues array
			dialogues.push(new Dialogue(
				lineParts.slice(textIndex).join(","),
				styles.filter(function (aStyle) { return aStyle.name === lineParts[styleIndex]; })[0],
				toTime(lineParts[startIndex]),
				toTime(lineParts[endIndex]),
				Math.max(parseInteger(lineParts[layerIndex]), 0),
				dialogueParser,
				info,
				styles
			));
		}

		return false;
	});

	// Return an ASS object with the info, list of styles and list of dialogues parsed from the raw ASS string
	return new ASS(info, styles, dialogues);
}

ASS.Tags = new /** @constructor */ function () {
	/**
	 * @constructor
	 * @param {string} name
	 * @param {!Array.<string>} propertyNames
	 */
	this.TagPrototype = function (name, propertyNames) {
		/**
		 * @return {string}
		 */
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

	/**
	 * @param {string} name
	 * @param {...string} var_args
	 * @return {function(...[(number|string|Object)])}
	 */
	this.Tag = function (name, var_args) {
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

/**
 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
 *
 * @param {string} string
 * @return {number}
 */
var toTime = function (string) {
	return string.split(":").reduce(function (previousValue, currentValue) {
		return previousValue * 60 + parseFloat(currentValue);
	}, 0);
};

window["ASS"] = ASS;
window["ASS"]["Tags"] = ASS.Tags;
window["ASS"]["Tags"]["Comment"] = ASS.Tags.Comment;
window["ASS"]["Tags"]["HardSpace"] = ASS.Tags.HardSpace;
window["ASS"]["Tags"]["NewLine"] = ASS.Tags.NewLine;
window["ASS"]["Tags"]["Text"] = ASS.Tags.Text;
window["ASS"]["Tags"]["Italic"] = ASS.Tags.Italic;
window["ASS"]["Tags"]["Bold"] = ASS.Tags.Bold;
window["ASS"]["Tags"]["Underline"] = ASS.Tags.Underline;
window["ASS"]["Tags"]["Strikeout"] = ASS.Tags.Strikeout;
window["ASS"]["Tags"]["Border"] = ASS.Tags.Border;
window["ASS"]["Tags"]["Blur"] = ASS.Tags.Blur;
window["ASS"]["Tags"]["FontName"] = ASS.Tags.FontName;
window["ASS"]["Tags"]["FontSize"] = ASS.Tags.FontSize;
window["ASS"]["Tags"]["Frx"] = ASS.Tags.Frx;
window["ASS"]["Tags"]["Fry"] = ASS.Tags.Fry;
window["ASS"]["Tags"]["Frz"] = ASS.Tags.Frz;
window["ASS"]["Tags"]["Fax"] = ASS.Tags.Fax;
window["ASS"]["Tags"]["Fay"] = ASS.Tags.Fay;
window["ASS"]["Tags"]["PrimaryColor"] = ASS.Tags.PrimaryColor;
window["ASS"]["Tags"]["OutlineColor"] = ASS.Tags.OutlineColor;
window["ASS"]["Tags"]["Alpha"] = ASS.Tags.Alpha;
window["ASS"]["Tags"]["PrimaryAlpha"] = ASS.Tags.PrimaryAlpha;
window["ASS"]["Tags"]["OutlineAlpha"] = ASS.Tags.OutlineAlpha;
window["ASS"]["Tags"]["Alignment"] = ASS.Tags.Alignment;
window["ASS"]["Tags"]["Reset"] = ASS.Tags.Reset;
window["ASS"]["Tags"]["Pos"] = ASS.Tags.Pos;
window["ASS"]["Tags"]["Fade"] = ASS.Tags.Fade;
