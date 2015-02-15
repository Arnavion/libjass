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

var libjass = require("../../lib/libjass.js");
var parserTest = require("../parser-test.js");

suite("Tags", function () {
	suite("Bold tag - \\b", function () {
		test("True", parserTest("b1", "tag_b", new libjass.parts.Bold(true)));

		test("False", parserTest("b0", "tag_b", new libjass.parts.Bold(false)));

		test("100", parserTest("b100", "tag_b", new libjass.parts.Bold(100)));

		test("900", parserTest("b900", "tag_b", new libjass.parts.Bold(900)));

		test("null", parserTest("b", "tag_b", new libjass.parts.Bold(null)));

		test("2", parserTest("b2", "tag_b", null));

		test("10", parserTest("b10", "tag_b", null));

		test("150", parserTest("b150", "tag_b", null));

		test("Enclosed tag", parserTest("{\\b1}", "enclosedTags", [new libjass.parts.Bold(true)]));

		test("Enclosed tag", parserTest("{\\b0}", "enclosedTags", [new libjass.parts.Bold(false)]));

		test("Enclosed tag", parserTest("{\\b100}", "enclosedTags", [new libjass.parts.Bold(100)]));

		test("Enclosed tag", parserTest("{\\b900}", "enclosedTags", [new libjass.parts.Bold(900)]));

		test("Enclosed tag", parserTest("{\\b}", "enclosedTags", [new libjass.parts.Bold(null)]));

		test("Enclosed tag", parserTest("{\\b2}", "enclosedTags", [new libjass.parts.Bold(null), new libjass.parts.Comment("2")]));

		test("Enclosed tag", parserTest("{\\b10}", "enclosedTags", [new libjass.parts.Bold(true), new libjass.parts.Comment("0")]));

		test("Enclosed tag", parserTest("{\\b150}", "enclosedTags", [new libjass.parts.Bold(true), new libjass.parts.Comment("50")]));
	});

	suite("Italics tag - \\i", function () {
		test("True", parserTest("i1", "tag_i", new libjass.parts.Italic(true)));

		test("False", parserTest("i0", "tag_i", new libjass.parts.Italic(false)));

		test("null", parserTest("i", "tag_i", new libjass.parts.Italic(null)));
	});

	suite("Primary color tags - \\c and \\1c", function () {
		test("Just the tag", parserTest("1c&H3F171F&", "tag_1c", new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))));

		test("Just the tag", parserTest("c&H3F171F&", "tag_c", new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))));

		test("Enclosed tag", parserTest("{\\c&H3F171F&}", "enclosedTags", [new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))]));

		test("Dialogue", parserTest("{\\c&H3F171F&}", "dialogueParts", [new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1))]));
	});

	suite("Alpha tag - \\alpha", function () {
		test("Just the tag", parserTest("alpha&H00&", "tag_alpha", new libjass.parts.Alpha(1)));

		test("Just the tag", parserTest("alpha00", "tag_alpha", new libjass.parts.Alpha(1)));
	});

	suite("Font size tag - \\fs", function () {
		test("5", parserTest("fs5", "tag_fs", new libjass.parts.FontSize(5)));

		test("null", parserTest("fs", "tag_fs", new libjass.parts.FontSize(null)));

		test("Plus 5", parserTest("fs+5", "tag_fsplus", new libjass.parts.FontSizePlus(5)));

		test("Plus null", parserTest("fs+", "tag_fsplus", null));

		test("Minus 5", parserTest("fs-5", "tag_fsminus", new libjass.parts.FontSizeMinus(5)));

		test("Minus null", parserTest("fs-", "tag_fsminus", null));
	});

	suite("Transform tag - \\t", function () {
		test("No tags", parserTest("{\\t(100,200)}", "enclosedTags", [new libjass.parts.Comment("\\t(100,200)")]));
	});

	suite("Clip tags - \\clip and \\iclip", function () {
		test("Rectangular clip", parserTest("{\\clip(100,200,300,400)}", "enclosedTags", [new libjass.parts.RectangularClip(100, 200, 300, 400, true)]));

		test("Vector clip", parserTest("{\\clip(m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [
			new libjass.parts.VectorClip(1, [
				new libjass.parts.drawing.MoveInstruction(129, 338),
				new libjass.parts.drawing.LineInstruction(121, 381),
				new libjass.parts.drawing.LineInstruction(110, 372),
				new libjass.parts.drawing.LineInstruction(110, 331)
			], true)
		]));

		test("Vector clip with scale", parserTest("{\\clip(1, m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [
			new libjass.parts.VectorClip(1, [
				new libjass.parts.drawing.MoveInstruction(129, 338),
				new libjass.parts.drawing.LineInstruction(121, 381),
				new libjass.parts.drawing.LineInstruction(110, 372),
				new libjass.parts.drawing.LineInstruction(110, 331)
			], true)
		]));

		test("Inverted rectangular clip", parserTest("{\\iclip(100,200,300,400)}", "enclosedTags", [
			new libjass.parts.RectangularClip(100, 200, 300, 400, false)
		]));

		test("Inverted vector clip", parserTest("{\\iclip(m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [
			new libjass.parts.VectorClip(1, [
				new libjass.parts.drawing.MoveInstruction(129, 338),
				new libjass.parts.drawing.LineInstruction(121, 381),
				new libjass.parts.drawing.LineInstruction(110, 372),
				new libjass.parts.drawing.LineInstruction(110, 331)
			], false)
		]));

		test("Inverted vector clip with scale", parserTest("{\\iclip(1, m 129 338 l 121 381 110 372 110 331)}", "enclosedTags", [
			new libjass.parts.VectorClip(1, [
				new libjass.parts.drawing.MoveInstruction(129, 338),
				new libjass.parts.drawing.LineInstruction(121, 381),
				new libjass.parts.drawing.LineInstruction(110, 372),
				new libjass.parts.drawing.LineInstruction(110, 331)
			], false)
		]));
	});

	suite("Drawing instructions", function () {
		test("Normal", parserTest("m 984 425 l 985 445 l 985 542 l 973 544 b 983 524 987 496 984 459", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425),
			new libjass.parts.drawing.LineInstruction(985, 445),
			new libjass.parts.drawing.LineInstruction(985, 542),
			new libjass.parts.drawing.LineInstruction(973, 544),
			new libjass.parts.drawing.CubicBezierCurveInstruction(983, 524, 987, 496, 984, 459)
		]));

		test("Re-use previous instruction", parserTest("m 984 425 l 985 445 985 542 973 544 b 983 524 987 496 984 459", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425),
			new libjass.parts.drawing.LineInstruction(985, 445),
			new libjass.parts.drawing.LineInstruction(985, 542),
			new libjass.parts.drawing.LineInstruction(973, 544),
			new libjass.parts.drawing.CubicBezierCurveInstruction(983, 524, 987, 496, 984, 459)
		]));

		test("Leading space", parserTest(" m 984 425", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]));

		test("Terminal space", parserTest("m 984 425 ", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]));

		test("Space on both ends", parserTest(" m 984 425 ", "drawingInstructions", [
			new libjass.parts.drawing.MoveInstruction(984, 425)
		]));

		test("Empty", parserTest("", "drawingInstructions", []));

		test("One space", parserTest(" ", "drawingInstructions", []));

		test("Two spaces", parserTest(" ", "drawingInstructions", []));
	});
});
