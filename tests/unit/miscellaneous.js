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

define(["intern!tdd", "intern/chai!assert", "tests/support/parser-test", "lib/libjass"], function (tdd, assert, parserTest, libjass) {
	tdd.suite("Miscellaneous", function () {
		tdd.test("herkz", parserTest("{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
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
		]));

		tdd.test("herkz-fixed", parserTest("{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6)}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogueParts", [
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
		]));

		tdd.test("knk-02", parserTest("{\\\\k0}{\\1c&H35C2BD&}s{\\1c&H53A2C0&}e{\\1c&H757FC4&}i{\\1c&H866EC6&}j{\\1c&H995AC8&}a{\\1c&HBC36CC&}k{\\1c&HD420C8&}u{\\1c&HB942A7&} {\\1c&HA25F8A&}w{\\1c&H799356&}a{\\1c&H63B03A&} {\\1c&H54C723&}k{\\1c&H68C126&}i{\\1c&H7BBC29&}r{\\1c&H8CB82C&}i{\\1c&HA2B230&}s{\\1c&HBEAB34&}a{\\1c&HD8A339&}k{\\1c&HB68D3B&}u{\\1c&HA4813C&} {\\1c&H88703E&}y{\\1c&H665A41&}o{\\1c&H444444&}u", "dialogueParts", [
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
		]));

		tdd.test("klk-01", parserTest("{\\an5\\bord0\\blur1\\p1\\c&H97B9D6&\\pos(143.39,358.77)\\frz334.3\\fscx39\\fscy47\\iclip(m 129 338 l 121 381 110 372 110 331)}m 0 0 l 100 0 100 100 0 100", "dialogueParts", [
			new libjass.parts.Alignment(5),
			new libjass.parts.Border(0),
			new libjass.parts.GaussianBlur(1),
			new libjass.parts.DrawingMode(1),
			new libjass.parts.PrimaryColor(new libjass.parts.Color(214, 185, 151, 1)),
			new libjass.parts.Position(143.39, 358.77),
			new libjass.parts.RotateZ(334.3),
			new libjass.parts.FontScaleX(0.39),
			new libjass.parts.FontScaleY(0.47),
			new libjass.parts.VectorClip(1, [
				new libjass.parts.drawing.MoveInstruction(129, 338),
				new libjass.parts.drawing.LineInstruction(121, 381),
				new libjass.parts.drawing.LineInstruction(110, 372),
				new libjass.parts.drawing.LineInstruction(110, 331)
			], false),
			new libjass.parts.DrawingInstructions([
				new libjass.parts.drawing.MoveInstruction(0, 0),
				new libjass.parts.drawing.LineInstruction(100, 0),
				new libjass.parts.drawing.LineInstruction(100, 100),
				new libjass.parts.drawing.LineInstruction(0, 100)
			])
		]));

		tdd.test("chihaya-16", parserTest("{\\an7\\pos(0,0)\\bord0\\blur0.5\\p1\\c&HFAFAFA&}m 88 644 l 87 681 l 255 681 l 256 643 m 311 643 l 310 681 l 482 681 l 483 641 m 562 641 l 561 679 l 730 676 l 731 640 m 800 638 l 798 677 l 968 676 l 970 639 m 1031 638 l 1028 675 l 1200 674 l 1200 640 {p0}", "dialogueParts", [
			new libjass.parts.Alignment(7),
			new libjass.parts.Position(0, 0),
			new libjass.parts.Border(0),
			new libjass.parts.GaussianBlur(0.5),
			new libjass.parts.DrawingMode(1),
			new libjass.parts.PrimaryColor(new libjass.parts.Color(250, 250, 250)),
			new libjass.parts.DrawingInstructions([
				new libjass.parts.drawing.MoveInstruction(88, 644),
				new libjass.parts.drawing.LineInstruction(87, 681),
				new libjass.parts.drawing.LineInstruction(255, 681),
				new libjass.parts.drawing.LineInstruction(256, 643),
				new libjass.parts.drawing.MoveInstruction(311, 643),
				new libjass.parts.drawing.LineInstruction(310, 681),
				new libjass.parts.drawing.LineInstruction(482, 681),
				new libjass.parts.drawing.LineInstruction(483, 641),
				new libjass.parts.drawing.MoveInstruction(562, 641),
				new libjass.parts.drawing.LineInstruction(561, 679),
				new libjass.parts.drawing.LineInstruction(730, 676),
				new libjass.parts.drawing.LineInstruction(731, 640),
				new libjass.parts.drawing.MoveInstruction(800, 638),
				new libjass.parts.drawing.LineInstruction(798, 677),
				new libjass.parts.drawing.LineInstruction(968, 676),
				new libjass.parts.drawing.LineInstruction(970, 639),
				new libjass.parts.drawing.MoveInstruction(1031, 638),
				new libjass.parts.drawing.LineInstruction(1028, 675),
				new libjass.parts.drawing.LineInstruction(1200, 674),
				new libjass.parts.drawing.LineInstruction(1200, 640)
			]),
			new libjass.parts.Comment("p0")
		]));

		tdd.test("ASS", function () {
			var input =
				"[Script Info]\n; Script generated by Aegisub 2.1.8\n; http://www.aegisub.org/\nTitle:   Default Aegisub file\nScriptType: v4.00+\nWrapStyle:   0\nPlayResX:   1280\nPlayResY:   720\nScaledBorderAndShadow:   yes\nCollisions:   Normal\nVideo Aspect Ratio: 0\nVideo Zoom: 6\nVideo Position: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,50,&H00F1F4F9,&H000000FF,&H000F1115,&H96000000,0,0,0,0,100,100,0,0,1,1.5,0,2,80,80,35,1\nStyle: sign1,Times New Roman,50,&H00FFFFFF,&H000000FF,&H4B000000,&H00000000,0,0,0,0,100,100,0,0,1,1.8,0,8,20,20,15,0\nStyle: sign2,Unifont,42,&H00000000,&H000000FF,&H00FFFFFF,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n\nComment: 4,0:00:23.51,0:00:31.57,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Lorem ipsum\nComment: 4,0:00:31.57,0:00:38.93,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Dolor sit amet, libero magna pellentesque\nComment: 4,0:00:38.93,0:00:55.24,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Morbi wisi risus urna aenean eget tincidunt\n\nDialogue: 1,0:04:23.70,0:04:27.95,sign1,,0000,0000,0000,,{\\c&H1C2B39&\\3c&H1E637A&\\bord0\\blur1.8\\pos(1157,423)}Sociosqu{...ultrices fringilla, tortor sodales interdum aliquam}\nDialogue: 0,0:04:23.70,0:04:27.95,sign1,,0000,0000,0000,,{\\c&H1E637A&\\3c&H1E637A&\\bord8\\blur4\\pos(1157,423)}Sociosqu\nDialogue: 0,0:05:52.83,0:05:56.28,sign2,,0000,0000,0000,,{\\fad(500,0)\\frz352.385\\blur2\\pos(549,501)\\c&HAEA2BB&\\b1}Laoreet vestibulum parturient aliquam per!?\nDialogue: 0,0:00:00.00,0:00:00.00,Default,,0000,0000,0000,,\nDialogue: 0,0:01:15.94,0:01:17.28,Default,,0000,0000,0000,,Eget odio auctor pede porta?\nDialogue: 0,0:01:17.67,0:01:18.52,Default,,0000,0000,0000,,Vestibulum.\n";

			var deferred = this.async(1000);

			libjass.ASS.fromString(input, libjass.Format.ASS).then(function (ass) {
				assert.strictEqual(ass.properties.resolutionX, 1280);
				assert.strictEqual(ass.properties.resolutionY, 720);
				assert.strictEqual(ass.properties.wrappingStyle, libjass.WrappingStyle.SmartWrappingWithWiderTopLine);
				assert.strictEqual(ass.properties.scaleBorderAndShadow, true);

				assert.strictEqual(ass.styles.size, 3);

				assert.strictEqual(ass.styles.get("Default").name, "Default");
				assert.strictEqual(ass.styles.get("Default").italic, false);
				assert.strictEqual(ass.styles.get("Default").bold, false);
				assert.strictEqual(ass.styles.get("Default").underline, false);
				assert.strictEqual(ass.styles.get("Default").strikeThrough, false);
				assert.strictEqual(ass.styles.get("Default").fontName, "Arial");
				assert.strictEqual(ass.styles.get("Default").fontSize, 50);
				assert.strictEqual(ass.styles.get("Default").fontScaleX, 1);
				assert.strictEqual(ass.styles.get("Default").fontScaleY, 1);
				assert.strictEqual(ass.styles.get("Default").letterSpacing, 0);
				assert.strictEqual(ass.styles.get("Default").rotationZ, 0);
				assert.deepEqual(ass.styles.get("Default").primaryColor, new libjass.parts.Color(0xF9, 0xF4, 0xF1));
				assert.deepEqual(ass.styles.get("Default").secondaryColor, new libjass.parts.Color(0xFF, 0x00, 0x00));
				assert.deepEqual(ass.styles.get("Default").outlineColor, new libjass.parts.Color(0x15, 0x11, 0x0F));
				assert.deepEqual(ass.styles.get("Default").shadowColor, new libjass.parts.Color(0x00, 0x00, 0x00, 1 - 0x96 / 255));
				assert.strictEqual(ass.styles.get("Default").outlineThickness, 1.5);
				assert.strictEqual(ass.styles.get("Default").borderStyle, libjass.BorderStyle.Outline);
				assert.strictEqual(ass.styles.get("Default").shadowDepth, 0);
				assert.strictEqual(ass.styles.get("Default").alignment, 2);
				assert.strictEqual(ass.styles.get("Default").marginLeft, 80);
				assert.strictEqual(ass.styles.get("Default").marginRight, 80);
				assert.strictEqual(ass.styles.get("Default").marginVertical, 35);

				assert.strictEqual(ass.dialogues.length, 6);

				assert.strictEqual(ass.dialogues[0].start, 263.700);
				assert.strictEqual(ass.dialogues[0].end, 267.950);
				assert.strictEqual(ass.dialogues[0].style, ass.styles.get("sign1"));
				assert.deepEqual(ass.dialogues[0].parts, [
					new libjass.parts.PrimaryColor(new libjass.parts.Color(0x39, 0x2B, 0x1C)),
					new libjass.parts.OutlineColor(new libjass.parts.Color(0x7A, 0x63, 0x1E)),
					new libjass.parts.Border(0),
					new libjass.parts.GaussianBlur(1.8),
					new libjass.parts.Position(1157, 423),
					new libjass.parts.Text("Sociosqu"),
					new libjass.parts.Comment("...ultrices fringilla, tortor sodales interdum aliquam")
				]);

				assert.strictEqual(ass.dialogues[3].start, 0.000);
				assert.strictEqual(ass.dialogues[3].end, 0.000);
				assert.strictEqual(ass.dialogues[3].style, ass.styles.get("Default"));
				assert.deepEqual(ass.dialogues[3].parts, []);

				assert.strictEqual(ass.dialogues[4].start, 75.940);
				assert.strictEqual(ass.dialogues[4].end, 77.280);
				assert.strictEqual(ass.dialogues[4].style, ass.styles.get("Default"));
				assert.deepEqual(ass.dialogues[4].parts, [
					new libjass.parts.Text("Eget odio auctor pede porta?")
				]);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});

		tdd.test("ASS", function () {
			var input =
				"[Script Info]\n; Script generated by Aegisub 2.1.8\n; http://www.aegisub.org/\nTitle: English\nScriptType: v4.00+\nWrapStyle: 0\nPlayResX: 1280\nPlayResY: 720\nScaledBorderAndShadow: yes\nCollisions: Normal\nX-AntiAlias: 1\nX-Created: 3 hours ago\nX-MediaID: 573382\nX-VideoID:\nX-ScriptID: 54834\nX-LanguageCode: enUS\nX-Language: English (US)\nX-Progress:\nX-Status: Approved\nVideo File: eleifend .mkv\nVideo Aspect Ratio: 0\nVideo Zoom: 2\nVideo Position: 33092\nAudio File: ?video\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,51,&H00FFFFFF,&H000000FF,&H00192D19,&HA0062210,-1,0,0,0,100,100,0,0,1,3,1,2,110,110,40,0\nStyle: op kara,Times New Roman,50,&H00000000,&H000000FF,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,2,0,1,3,3,8,40,40,33,1\nStyle: op trans,Unifont,45,&H00FFFFFF,&H000000FF,&H00131315,&H00000000,-1,0,0,0,95,110,2,0,1,3,0,2,40,40,33,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nComment: 1,0:22:20.06,0:22:20.06,Default,,0000,0000,0000,,{\\blur1.2\\fad(250,300)}Viverra\nComment: 1,0:22:20.06,0:22:20.06,Default,,0000,0000,0000,,{\\blur1.2\\fad(250,300)}Turpis\n\nDialogue: 0,0:10:46.46,0:10:52.13,op trans,,0000,0000,0000,,{\\fad(200,0)}Sapien rhoncus, suscipit posuere in nunc pellentesque\nDialogue: 0,0:10:52.13,0:10:58.82,op trans,,0000,0000,0000,,{}Orci ipsum. Et nunc varius morbi tincidunt urna\nDialogue: 0,0:10:58.82,0:11:04.02,op trans,,0000,0000,0000,,{}Justo sagittis nisl ut non elit leo, aliquam id\nDialogue: 0,0:10:46.46,0:10:46.66,op kara,,0000,0000,0000,fx,{\\fad(200,0)(\\pos(640,33)\\alpha&H00&\\blur2}id maecenas mi in ut varius nunc\nDialogue: 0,0:10:46.66,0:10:46.86,op kara,,0000,0000,0000,fx,{(\\pos(643,30)\\alpha&H00&\\blur2}id maecenas mi in ut varius nunc\nDialogue: 0,0:10:46.86,0:10:47.06,op kara,,0000,0000,0000,fx,{(\\pos(637,37)\\alpha&H00&\\blur1\\bord1}id maecenas mi in ut varius nunc\nDialogue: 0,0:00:03.37,0:00:07.94,Default,,0000,0000,0000,,Sed arcu non wisi sed\\Nante nisl pede aliquam\nDialogue: 0,0:00:08.67,0:00:09.28,Default,,0000,0000,0000,,Porta.\nDialogue: 0,0:00:12.02,0:00:16.02,Default,,0000,0000,0000,,Accumsan ac facilisi, aenean mi,\n";

			var deferred = this.async(1000);

			libjass.ASS.fromString(input, libjass.Format.ASS).then(function (ass) {
				assert.strictEqual(ass.properties.resolutionX, 1280);
				assert.strictEqual(ass.properties.resolutionY, 720);
				assert.strictEqual(ass.properties.wrappingStyle, libjass.WrappingStyle.SmartWrappingWithWiderTopLine);
				assert.strictEqual(ass.properties.scaleBorderAndShadow, true);

				assert.strictEqual(ass.styles.size, 3);

				assert.strictEqual(ass.styles.get("Default").name, "Default");
				assert.strictEqual(ass.styles.get("Default").italic, false);
				assert.strictEqual(ass.styles.get("Default").bold, true);
				assert.strictEqual(ass.styles.get("Default").underline, false);
				assert.strictEqual(ass.styles.get("Default").strikeThrough, false);
				assert.strictEqual(ass.styles.get("Default").fontName, "Arial");
				assert.strictEqual(ass.styles.get("Default").fontSize, 51);
				assert.strictEqual(ass.styles.get("Default").fontScaleX, 1);
				assert.strictEqual(ass.styles.get("Default").fontScaleY, 1);
				assert.strictEqual(ass.styles.get("Default").letterSpacing, 0);
				assert.strictEqual(ass.styles.get("Default").rotationZ, 0);
				assert.deepEqual(ass.styles.get("Default").primaryColor, new libjass.parts.Color(0xFF, 0xFF, 0xFF));
				assert.deepEqual(ass.styles.get("Default").secondaryColor, new libjass.parts.Color(0xFF, 0x00, 0x00));
				assert.deepEqual(ass.styles.get("Default").outlineColor, new libjass.parts.Color(0x19, 0x2D, 0x19));
				assert.deepEqual(ass.styles.get("Default").shadowColor, new libjass.parts.Color(0x10, 0x22, 0x06, 1 - 0xA0 / 255));
				assert.strictEqual(ass.styles.get("Default").outlineThickness, 3);
				assert.strictEqual(ass.styles.get("Default").borderStyle, libjass.BorderStyle.Outline);
				assert.strictEqual(ass.styles.get("Default").shadowDepth, 1);
				assert.strictEqual(ass.styles.get("Default").alignment, 2);
				assert.strictEqual(ass.styles.get("Default").marginLeft, 110);
				assert.strictEqual(ass.styles.get("Default").marginRight, 110);
				assert.strictEqual(ass.styles.get("Default").marginVertical, 40);

				assert.strictEqual(ass.dialogues.length, 9);

				assert.strictEqual(ass.dialogues[0].start, 646.460);
				assert.strictEqual(ass.dialogues[0].end, 652.130);
				assert.strictEqual(ass.dialogues[0].style, ass.styles.get("op trans"));
				assert.deepEqual(ass.dialogues[0].parts, [
					new libjass.parts.Fade(0.2, 0),
					new libjass.parts.Text("Sapien rhoncus, suscipit posuere in nunc pellentesque")
				]);

				assert.strictEqual(ass.dialogues[3].start, 646.460);
				assert.strictEqual(ass.dialogues[3].end, 646.660);
				assert.strictEqual(ass.dialogues[3].style, ass.styles.get("op kara"));
				assert.deepEqual(ass.dialogues[3].parts, [
					new libjass.parts.Fade(0.2, 0),
					new libjass.parts.Comment("("),
					new libjass.parts.Position(640, 33),
					new libjass.parts.Alpha(1 - 0x00 / 255),
					new libjass.parts.GaussianBlur(2),
					new libjass.parts.Text("id maecenas mi in ut varius nunc"),
				]);

				assert.strictEqual(ass.dialogues[6].start, 3.370);
				assert.strictEqual(ass.dialogues[6].end, 7.940);
				assert.strictEqual(ass.dialogues[6].style, ass.styles.get("Default"));
				assert.deepEqual(ass.dialogues[6].parts, [
					new libjass.parts.Text("Sed arcu non wisi sed"),
					new libjass.parts.NewLine(),
					new libjass.parts.Text("ante nisl pede aliquam")
				]);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});

		tdd.test("ASS with BOM", function () {
			var input =
				String.fromCharCode(0xfeff) + "[Script Info]\n; Script generated by Aegisub 2.1.8\n; http://www.aegisub.org/\nTitle:   Default Aegisub file\nScriptType: v4.00+\nWrapStyle:   0\nPlayResX:   1280\nPlayResY:   720\nScaledBorderAndShadow:   yes\nCollisions:   Normal\nVideo Aspect Ratio: 0\nVideo Zoom: 6\nVideo Position: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,50,&H00F1F4F9,&H000000FF,&H000F1115,&H96000000,0,0,0,0,100,100,0,0,1,1.5,0,2,80,80,35,1\nStyle: sign1,Times New Roman,50,&H00FFFFFF,&H000000FF,&H4B000000,&H00000000,0,0,0,0,100,100,0,0,1,1.8,0,8,20,20,15,0\nStyle: sign2,Unifont,42,&H00000000,&H000000FF,&H00FFFFFF,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n\nComment: 4,0:00:23.51,0:00:31.57,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Lorem ipsum\nComment: 4,0:00:31.57,0:00:38.93,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Dolor sit amet, libero magna pellentesque\nComment: 4,0:00:38.93,0:00:55.24,OP,,0000,0000,0000,,{\\blur3\\fad(200,200)}Morbi wisi risus urna aenean eget tincidunt\n\nDialogue: 1,0:04:23.70,0:04:27.95,sign1,,0000,0000,0000,,{\\c&H1C2B39&\\3c&H1E637A&\\bord0\\blur1.8\\pos(1157,423)}Sociosqu{...ultrices fringilla, tortor sodales interdum aliquam}\nDialogue: 0,0:04:23.70,0:04:27.95,sign1,,0000,0000,0000,,{\\c&H1E637A&\\3c&H1E637A&\\bord8\\blur4\\pos(1157,423)}Sociosqu\nDialogue: 0,0:05:52.83,0:05:56.28,sign2,,0000,0000,0000,,{\\fad(500,0)\\frz352.385\\blur2\\pos(549,501)\\c&HAEA2BB&\\b1}Laoreet vestibulum parturient aliquam per!?\nDialogue: 0,0:00:00.00,0:00:00.00,Default,,0000,0000,0000,,\nDialogue: 0,0:01:15.94,0:01:17.28,Default,,0000,0000,0000,,Eget odio auctor pede porta?\nDialogue: 0,0:01:17.67,0:01:18.52,Default,,0000,0000,0000,,Vestibulum.\n";

			var deferred = this.async(1000);

			libjass.ASS.fromString(input, libjass.Format.ASS).then(function (ass) {
				assert.strictEqual(ass.properties.resolutionX, 1280);
				assert.strictEqual(ass.properties.resolutionY, 720);
				assert.strictEqual(ass.properties.wrappingStyle, libjass.WrappingStyle.SmartWrappingWithWiderTopLine);
				assert.strictEqual(ass.properties.scaleBorderAndShadow, true);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});

		tdd.test("SRT", function (done) {
			var input =
				"1\n00:00:10,500 --> 00:00:13,000\nElephant's Dream\n\n2\n00:00:15,000 --> 00:00:18,000 X1:52 X2:303 Y1:438 Y2:453\n<font color=\"cyan\">At the left we can see...</font>";

			var deferred = this.async(1000);

			libjass.ASS.fromString(input, libjass.Format.SRT).then(function (ass) {
				assert.strictEqual(ass.dialogues.length, 2);

				assert.strictEqual(ass.dialogues[0].start, 10.500);
				assert.strictEqual(ass.dialogues[0].end, 13.000);
				assert.deepEqual(ass.dialogues[0].parts, [
					new libjass.parts.Text("Elephant's Dream")
				]);

				assert.strictEqual(ass.dialogues[1].start, 15.000);
				assert.strictEqual(ass.dialogues[1].end, 18.000);
				assert.deepEqual(ass.dialogues[1].parts, [
					new libjass.parts.Text("<font color=\"cyan\">At the left we can see..."),
					new libjass.parts.PrimaryColor(null)
				]);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});

		tdd.test("SRT", function (done) {
			var input =
				"1\n00:01:15,940 --> 00:01:17,280\nHave you secured the key?\nWhy can't people forgive each other\n\n2\n00:01:17,280 --> 00:01:17,670\nWhy can't people forgive each other";

			var deferred = this.async(1000);

			libjass.ASS.fromString(input, libjass.Format.SRT).then(function (ass) {
				assert.strictEqual(ass.dialogues.length, 2);

				assert.strictEqual(ass.dialogues[0].start, 1 * 60 + 15.940);
				assert.strictEqual(ass.dialogues[0].end, 1 * 60 + 17.280);
				assert.deepEqual(ass.dialogues[0].parts, [
					new libjass.parts.Text("Have you secured the key?"),
					new libjass.parts.NewLine(),
					new libjass.parts.Text("Why can't people forgive each other")
				]);

				assert.strictEqual(ass.dialogues[1].start, 1 * 60 + 17.280);
				assert.strictEqual(ass.dialogues[1].end, 1 * 60 + 17.670);
				assert.deepEqual(ass.dialogues[1].parts, [
					new libjass.parts.Text("Why can't people forgive each other")
				]);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});
	});
});
