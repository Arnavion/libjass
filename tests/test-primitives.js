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

suite("Primitives", function () {
	suite("Color", function () {
		parserTest("Starts with &H", "&H3F171F&", "color", new libjass.parts.Color(31, 23, 63, 1));

		parserTest("Starts with H", "&3F171F&", "color", new libjass.parts.Color(31, 23, 63, 1));

		parserTest("Eight digits", "&H3F171F00&", "color", new libjass.parts.Color(0, 31, 23, 1));

		parserTest("Eight digits, non-zero alpha", "&H3F171FFF&", "color", new libjass.parts.Color(255, 31, 23, 1));
	});

	suite("Alpha", function () {
		parserTest("Starts with &H", "&HFF&", "alpha", 0);

		parserTest("Starts with &", "&FF&", "alpha", 0);

		parserTest("Starts with &H, one digit", "&HF&", "alpha", (1-15/255));

		parserTest("Starts with &H, one digit", "&H0&", "alpha", 1);

		parserTest("Starts with &, one digit", "&F&", "alpha", (1-15/255));

		parserTest("Starts with &, one digit", "&0&", "alpha", 1);

		parserTest("Starts with &H, doesn't end with &", "&HF&", "alpha", (1-15/255));

		parserTest("Starts with &H, doesn't end with &", "&H0&", "alpha", 1);

		parserTest("Starts with &, doesn't end with &", "&F", "alpha", (1-15/255));

		parserTest("Starts with &, doesn't end with &", "&0", "alpha", 1);

		parserTest("Doesn't start with &, doesn't end with &", "0", "alpha", 1);

		parserTest("Starts with H", "H0", "alpha", 1);
	});

	suite("ColorWithAlpha", function () {
		parserTest("AABBGGRR", "&H00434441", "colorWithAlpha", new libjass.parts.Color(65, 68, 67, 1));

		parserTest("AABBGGRR", "&HF0434441", "colorWithAlpha", new libjass.parts.Color(65, 68, 67, (1 - 240 / 255)));

		parserTest("AABBGGRR", "&HFF434441", "colorWithAlpha", new libjass.parts.Color(65, 68, 67, 0));
	});
});
