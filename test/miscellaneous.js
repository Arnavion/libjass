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

sections.push(new Section("Miscellaneous",
	new Test("herkz", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogue", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 6);

		Assert.IsInstanceOf(result[0], ASS.Tags.Comment);
		Assert.Equals(result[0].value, "\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6");

		Assert.IsInstanceOf(result[1], ASS.Tags.Text);
		Assert.Equals(result[1].value, "Chi");

		Assert.IsInstanceOf(result[2], ASS.Tags.PrimaryColor);
		Assert.Equals(result[2].value, "rgba(177, 44, 66, 1)");

		Assert.IsInstanceOf(result[3], ASS.Tags.Text);
		Assert.Equals(result[3].value, "tose ");

		Assert.IsInstanceOf(result[4], ASS.Tags.PrimaryColor);
		Assert.Equals(result[4].value, "rgba(31, 23, 63, 1)");

		Assert.IsInstanceOf(result[5], ASS.Tags.Text);
		Assert.Equals(result[5].value, "Furu");
	})
));
