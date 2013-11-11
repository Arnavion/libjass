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

suite("Miscellaneous", function () {
	parserTest("herkz", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
		new libjass.tags.Pos(311, 4),
		new libjass.tags.Blur(0.8),
		new libjass.tags.FontSize(40),
		new libjass.tags.Border(0),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Comment("\\t(3820,3820,"),
		new libjass.tags.Blur(6),
		new libjass.tags.Text("Chi"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(177, 44, 66, 1)),
		new libjass.tags.Text("tose "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Text("Furu")
	]);

	parserTest("herkz-fixed", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6)}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
		new libjass.tags.Pos(311, 4),
		new libjass.tags.Blur(0.8),
		new libjass.tags.FontSize(40),
		new libjass.tags.Border(0),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Transform(3.82, 3.82, null, [new libjass.tags.Blur(6)]),
		new libjass.tags.Text("Chi"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(177, 44, 66, 1)),
		new libjass.tags.Text("tose "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Text("Furu")
	]);
});
