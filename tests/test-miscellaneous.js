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
		new libjass.parts.Position(311, 4),
		new libjass.parts.GaussianBlur(0.8),
		new libjass.parts.FontSize(40),
		new libjass.parts.Border(0),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)),
		new libjass.parts.Comment("\\t(3820,3820,"),
		new libjass.parts.GaussianBlur(6),
		new libjass.parts.Text("Chi"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(177, 44, 66, 1)),
		new libjass.parts.Text("tose "),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)),
		new libjass.parts.Text("Furu")
	]);

	parserTest("herkz-fixed", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6)}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
		new libjass.parts.Position(311, 4),
		new libjass.parts.GaussianBlur(0.8),
		new libjass.parts.FontSize(40),
		new libjass.parts.Border(0),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)),
		new libjass.parts.Transform(3.82, 3.82, null, [new libjass.parts.GaussianBlur(6)]),
		new libjass.parts.Text("Chi"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(177, 44, 66, 1)),
		new libjass.parts.Text("tose "),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(31, 23, 63, 1)),
		new libjass.parts.Text("Furu")
	]);

	parserTest("knk-02", "{\\\\k0}{\\1c&H35C2BD&}s{\\1c&H53A2C0&}e{\\1c&H757FC4&}i{\\1c&H866EC6&}j{\\1c&H995AC8&}a{\\1c&HBC36CC&}k{\\1c&HD420C8&}u{\\1c&HB942A7&} {\\1c&HA25F8A&}w{\\1c&H799356&}a{\\1c&H63B03A&} {\\1c&H54C723&}k{\\1c&H68C126&}i{\\1c&H7BBC29&}r{\\1c&H8CB82C&}i{\\1c&HA2B230&}s{\\1c&HBEAB34&}a{\\1c&HD8A339&}k{\\1c&HB68D3B&}u{\\1c&HA4813C&} {\\1c&H88703E&}y{\\1c&H665A41&}o{\\1c&H444444&}u", "dialogueParts", [
		new libjass.parts.Comment("\\"),
		new libjass.parts.ColorKaraoke(0),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(189, 194, 53, 1)),
		new libjass.parts.Text("s"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(192, 162, 83, 1)),
		new libjass.parts.Text("e"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(196, 127, 117, 1)),
		new libjass.parts.Text("i"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(198, 110, 134, 1)),
		new libjass.parts.Text("j"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(200, 90, 153, 1)),
		new libjass.parts.Text("a"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(204, 54, 188, 1)),
		new libjass.parts.Text("k"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(200, 32, 212, 1)),
		new libjass.parts.Text("u"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(167, 66, 185, 1)),
		new libjass.parts.Text(" "),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(138, 95, 162, 1)),
		new libjass.parts.Text("w"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(86, 147, 121, 1)),
		new libjass.parts.Text("a"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(58, 176, 99, 1)),
		new libjass.parts.Text(" "),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(35, 199, 84, 1)),
		new libjass.parts.Text("k"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(38, 193, 104, 1)),
		new libjass.parts.Text("i"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(41, 188, 123, 1)),
		new libjass.parts.Text("r"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(44, 184, 140, 1)),
		new libjass.parts.Text("i"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(48, 178, 162, 1)),
		new libjass.parts.Text("s"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(52, 171, 190, 1)),
		new libjass.parts.Text("a"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(57, 163, 216, 1)),
		new libjass.parts.Text("k"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(59, 141, 182, 1)),
		new libjass.parts.Text("u"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(60, 129, 164, 1)),
		new libjass.parts.Text(" "),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(62, 112, 136, 1)),
		new libjass.parts.Text("y"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(65, 90, 102, 1)),
		new libjass.parts.Text("o"),
		new libjass.parts.PrimaryColor(new libjass.parts.Color(68, 68, 68, 1)),
		new libjass.parts.Text("u")
	]);
});
