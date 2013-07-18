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

sections.push(new Section("Color",
	new Test("BBGGRR", "&H3F171F&", "color", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(31, 23, 63, 1)");
	}),

	new Test("AABBGGRR", "&H00434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, 1)");
	}),

	new Test("AABBGGRR", "&HF0434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, " + (1 - 240 / 255) + ")");
	}),

	new Test("AABBGGRR", "&HFF434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, 0)");
	})
));
