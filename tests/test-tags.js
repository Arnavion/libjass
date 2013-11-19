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
		parserTest("True", "b1", "tag_b", new libjass.tags.Bold(true));

		parserTest("False", "b0", "tag_b", new libjass.tags.Bold(false));

		parserTest("100", "b100", "tag_b", new libjass.tags.Bold(100));

		parserTest("900", "b900", "tag_b", new libjass.tags.Bold(900));

		parserTest("null", "b", "tag_b", new libjass.tags.Bold(null));

		parserTest("2", "b2", "tag_b", null);

		parserTest("10", "b10", "tag_b", null);

		parserTest("150", "b150", "tag_b", null);

		parserTest("Enclosed tag", "{\\b1}", "enclosedTags", [new libjass.tags.Bold(true)]);

		parserTest("Enclosed tag", "{\\b0}", "enclosedTags", [new libjass.tags.Bold(false)]);

		parserTest("Enclosed tag", "{\\b100}", "enclosedTags", [new libjass.tags.Bold(100)]);

		parserTest("Enclosed tag", "{\\b900}", "enclosedTags", [new libjass.tags.Bold(900)]);

		parserTest("Enclosed tag", "{\\b}", "enclosedTags", [new libjass.tags.Bold(null)]);

		parserTest("Enclosed tag", "{\\b2}", "enclosedTags", [new libjass.tags.Bold(null), new libjass.tags.Comment("2")]);

		parserTest("Enclosed tag", "{\\b10}", "enclosedTags", [new libjass.tags.Bold(true), new libjass.tags.Comment("0")]);

		parserTest("Enclosed tag", "{\\b150}", "enclosedTags", [new libjass.tags.Bold(true), new libjass.tags.Comment("50")]);
	});

	suite("Primary color tag - \\c or \\1c", function () {
		parserTest("Just the tag", "1c&H3F171F&", "tag_1c", new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)));

		parserTest("Just the tag", "c&H3F171F&", "tag_c", new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)));

		parserTest("Enclosed tag", "{\\c&H3F171F&}", "enclosedTags", [new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))]);

		parserTest("Dialogue", "{\\c&H3F171F&}", "dialogueParts", [new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))]);
	});

	suite("Alpha tag - \\alpha", function () {
		parserTest("Just the tag", "alpha&H00&", "tag_alpha", new libjass.tags.Alpha(1));
	});

	suite("Transform tag - \\t", function () {
		parserTest("No tags", "{\\t(100,200)}", "enclosedTags", [new libjass.tags.Comment("\\t(100,200)")]);
	});
});
