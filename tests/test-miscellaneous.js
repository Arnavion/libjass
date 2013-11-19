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
		new libjass.tags.Position(311, 4),
		new libjass.tags.GaussianBlur(0.8),
		new libjass.tags.FontSize(40),
		new libjass.tags.Border(0),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Comment("\\t(3820,3820,"),
		new libjass.tags.GaussianBlur(6),
		new libjass.tags.Text("Chi"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(177, 44, 66, 1)),
		new libjass.tags.Text("tose "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Text("Furu")
	]);

	parserTest("herkz-fixed", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6)}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
		new libjass.tags.Position(311, 4),
		new libjass.tags.GaussianBlur(0.8),
		new libjass.tags.FontSize(40),
		new libjass.tags.Border(0),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Transform(3.82, 3.82, null, [new libjass.tags.GaussianBlur(6)]),
		new libjass.tags.Text("Chi"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(177, 44, 66, 1)),
		new libjass.tags.Text("tose "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1)),
		new libjass.tags.Text("Furu")
	]);

	parserTest("knk-02", "{\\\\k0}{\\1c&H35C2BD&}s{\\1c&H53A2C0&}e{\\1c&H757FC4&}i{\\1c&H866EC6&}j{\\1c&H995AC8&}a{\\1c&HBC36CC&}k{\\1c&HD420C8&}u{\\1c&HB942A7&} {\\1c&HA25F8A&}w{\\1c&H799356&}a{\\1c&H63B03A&} {\\1c&H54C723&}k{\\1c&H68C126&}i{\\1c&H7BBC29&}r{\\1c&H8CB82C&}i{\\1c&HA2B230&}s{\\1c&HBEAB34&}a{\\1c&HD8A339&}k{\\1c&HB68D3B&}u{\\1c&HA4813C&} {\\1c&H88703E&}y{\\1c&H665A41&}o{\\1c&H444444&}u", "dialogueParts", [
		new libjass.tags.Comment("\\"),
		new libjass.tags.ColorKaraoke(0),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(189, 194, 53, 1)),
		new libjass.tags.Text("s"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(192, 162, 83, 1)),
		new libjass.tags.Text("e"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(196, 127, 117, 1)),
		new libjass.tags.Text("i"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(198, 110, 134, 1)),
		new libjass.tags.Text("j"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(200, 90, 153, 1)),
		new libjass.tags.Text("a"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(204, 54, 188, 1)),
		new libjass.tags.Text("k"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(200, 32, 212, 1)),
		new libjass.tags.Text("u"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(167, 66, 185, 1)),
		new libjass.tags.Text(" "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(138, 95, 162, 1)),
		new libjass.tags.Text("w"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(86, 147, 121, 1)),
		new libjass.tags.Text("a"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(58, 176, 99, 1)),
		new libjass.tags.Text(" "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(35, 199, 84, 1)),
		new libjass.tags.Text("k"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(38, 193, 104, 1)),
		new libjass.tags.Text("i"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(41, 188, 123, 1)),
		new libjass.tags.Text("r"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(44, 184, 140, 1)),
		new libjass.tags.Text("i"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(48, 178, 162, 1)),
		new libjass.tags.Text("s"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(52, 171, 190, 1)),
		new libjass.tags.Text("a"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(57, 163, 216, 1)),
		new libjass.tags.Text("k"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(59, 141, 182, 1)),
		new libjass.tags.Text("u"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(60, 129, 164, 1)),
		new libjass.tags.Text(" "),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(62, 112, 136, 1)),
		new libjass.tags.Text("y"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(65, 90, 102, 1)),
		new libjass.tags.Text("o"),
		new libjass.tags.PrimaryColor(new libjass.tags.Color(68, 68, 68, 1)),
		new libjass.tags.Text("u")
	]);
});
