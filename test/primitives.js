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

suite("Primitives", function () {
	suite("Color", function () {
		parserTest("BBGGRR", "&H3F171F&", "color", new libjass.tags.Color(31, 23, 63, 1));

		parserTest("AABBGGRR", "&H00434441", "colorWithAlpha", new libjass.tags.Color(65, 68, 67, 1));

		parserTest("AABBGGRR", "&HF0434441", "colorWithAlpha", new libjass.tags.Color(65, 68, 67, (1 - 240 / 255)));

		parserTest("AABBGGRR", "&HFF434441", "colorWithAlpha", new libjass.tags.Color(65, 68, 67, 0));
	});
});
