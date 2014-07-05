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

var libjass = require("../libjass.js");
var parserTest = require("./parser-test.js");

suite("Tags", function () {
	suite("Bold tag - \\b", function () {
		parserTest("True", "b1", "tag_b", new libjass.parts.Bold(true));

		parserTest("False", "b0", "tag_b", new libjass.parts.Bold(false));

		parserTest("100", "b100", "tag_b", new libjass.parts.Bold(100));

		parserTest("900", "b900", "tag_b", new libjass.parts.Bold(900));

		parserTest("null", "b", "tag_b", new libjass.parts.Bold(null));

		parserTest("2", "b2", "tag_b", null);

		parserTest("10", "b10", "tag_b", null);

		parserTest("150", "b150", "tag_b", null);

		parserTest("Enclosed tag", "{\\b1}", "enclosedTags", [new libjass.parts.Bold(true)]);

		parserTest("Enclosed tag", "{\\b0}", "enclosedTags", [new libjass.parts.Bold(false)]);

		parserTest("Enclosed tag", "{\\b100}", "enclosedTags", [new libjass.parts.Bold(100)]);

		parserTest("Enclosed tag", "{\\b900}", "enclosedTags", [new libjass.parts.Bold(900)]);

		parserTest("Enclosed tag", "{\\b}", "enclosedTags", [new libjass.parts.Bold(null)]);

		parserTest("Enclosed tag", "{\\b2}", "enclosedTags", [new libjass.parts.Bold(null), new libjass.parts.Comment("2")]);

		parserTest("Enclosed tag", "{\\b10}", "enclosedTags", [new libjass.parts.Bold(true), new libjass.parts.Comment("0")]);

		parserTest("Enclosed tag", "{\\b150}", "enclosedTags", [new libjass.parts.Bold(true), new libjass.parts.Comment("50")]);
	});

	suite("Italics tag - \\i", function () {
		parserTest("True", "i1", "tag_i", new libjass.parts.Italic(true));

		parserTest("False", "i0", "tag_i", new libjass.parts.Italic(false));

		parserTest("null", "i", "tag_i", new libjass.parts.Italic(null));
	});

	suite("Primary color tags - \\c and \\1c", function () {
		parserTest("Just the tag", "1c&H3F171F&", "tag_1c", new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)));

		parserTest("Just the tag", "c&H3F171F&", "tag_c", new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)));

		parserTest("Enclosed tag", "{\\c&H3F171F&}", "enclosedTags", [new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))]);

		parserTest("Dialogue", "{\\c&H3F171F&}", "dialogueParts", [new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))]);
	});

	suite("Alpha tag - \\alpha", function () {
		parserTest("Just the tag", "alpha&H00&", "tag_alpha", new libjass.parts.Alpha(1));

		parserTest("Just the tag", "alpha00", "tag_alpha", new libjass.parts.Alpha(1));
	});

	suite("Font size tag - \\fs", function () {
		parserTest("5", "fs5", "tag_fs", new libjass.parts.FontSize(5));

		parserTest("null", "fs", "tag_fs", new libjass.parts.FontSize(null));

		parserTest("Plus 5", "fs+5", "tag_fsplus", new libjass.parts.FontSizePlus(5));

		parserTest("Plus null", "fs+", "tag_fsplus", null);

		parserTest("Minus 5", "fs-5", "tag_fsminus", new libjass.parts.FontSizeMinus(5));

		parserTest("Minus null", "fs-", "tag_fsminus", null);
	});

	suite("Transform tag - \\t", function () {
		parserTest("No tags", "{\\t(100,200)}", "enclosedTags", [new libjass.parts.Comment("\\t(100,200)")]);
	});

	suite("Clip tags - \\clip and \\iclip", function () {
		parserTest("Rectangular clip", "{\\clip(100,200,300,400)}", "enclosedTags", [new libjass.parts.RectangularClip(100, 200, 300, 400, true)]);

		parserTest("Vector clip", "{\\clip(m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [new libjass.parts.VectorClip(1, [
			new libjass.parts.drawing.MoveInstruction(129, 338),
			new libjass.parts.drawing.LineInstruction(121, 381),
			new libjass.parts.drawing.LineInstruction(110, 372),
			new libjass.parts.drawing.LineInstruction(110, 331)
		], true)]);

		parserTest("Vector clip with scale", "{\\clip(1, m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [new libjass.parts.VectorClip(1, [
			new libjass.parts.drawing.MoveInstruction(129, 338),
			new libjass.parts.drawing.LineInstruction(121, 381),
			new libjass.parts.drawing.LineInstruction(110, 372),
			new libjass.parts.drawing.LineInstruction(110, 331)
		], true)]);

		parserTest("Inverted rectangular clip", "{\\iclip(100,200,300,400)}", "enclosedTags", [new libjass.parts.RectangularClip(100, 200, 300, 400, false)]);

		parserTest("Inverted vector clip", "{\\iclip(m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [new libjass.parts.VectorClip(1, [
			new libjass.parts.drawing.MoveInstruction(129, 338),
			new libjass.parts.drawing.LineInstruction(121, 381),
			new libjass.parts.drawing.LineInstruction(110, 372),
			new libjass.parts.drawing.LineInstruction(110, 331)
		], false)]);

		parserTest("Inverted vector clip with scale", "{\\iclip(1, m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [new libjass.parts.VectorClip(1, [
			new libjass.parts.drawing.MoveInstruction(129, 338),
			new libjass.parts.drawing.LineInstruction(121, 381),
			new libjass.parts.drawing.LineInstruction(110, 372),
			new libjass.parts.drawing.LineInstruction(110, 331)
		], false)]);
	});

	suite("Drawing instructions", function () {
		parserTest("Normal", "m 984 425 l 985 445 l 985 542 l 973 544 b 983 524 987 496 984 459", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425),
			new libjass.parts.drawing.LineInstruction(985, 445),
			new libjass.parts.drawing.LineInstruction(985, 542),
			new libjass.parts.drawing.LineInstruction(973, 544),
			new libjass.parts.drawing.CubicBezierCurveInstruction(983, 524, 987, 496, 984, 459)
		]);

		parserTest("Re-use previous instruction", "m 984 425 l 985 445 985 542 973 544 b 983 524 987 496 984 459", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425),
			new libjass.parts.drawing.LineInstruction(985, 445),
			new libjass.parts.drawing.LineInstruction(985, 542),
			new libjass.parts.drawing.LineInstruction(973, 544),
			new libjass.parts.drawing.CubicBezierCurveInstruction(983, 524, 987, 496, 984, 459)
		]);

		parserTest("Leading space", " m 984 425", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]);

		parserTest("Terminal space", "m 984 425 ", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]);

		parserTest("Space on both ends", " m 984 425 ", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]);

		parserTest("Empty", "", "drawingInstructions", [
		]);

		parserTest("One space", " ", "drawingInstructions", [
		]);

		parserTest("Two spaces", " ", "drawingInstructions", [
		]);
	});
});
