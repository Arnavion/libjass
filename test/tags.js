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

sections.push(new Section("Bold tag - \\b",
	new Test("True", "b1", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, true);
	}),

	new Test("False", "b0", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, false);
	}),

	new Test("100", "b100", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, 100);
	}),

	new Test("900", "b900", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, 900);
	}),

	new Test("null", "b", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, null);
	}),

	new Test("2", "b2", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}),

	new Test("10", "b10", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}),

	new Test("150", "b150", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}),

	new Test("Enclosed tag", "{\\b1}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);
	}),

	new Test("Enclosed tag", "{\\b0}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, false);
	}),

	new Test("Enclosed tag", "{\\b100}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, 100);
	}),

	new Test("Enclosed tag", "{\\b900}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, 900);
	}),

	new Test("Enclosed tag", "{\\b}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, null);
	}),

	new Test("Enclosed tag", "{\\b2}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, null);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "2");
	}),

	new Test("Enclosed tag", "{\\b10}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "0");
	}),

	new Test("Enclosed tag", "{\\b150}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "50");
	})
));

sections.push(new Section("Primary color tag - \\c or \\1c",
	new Test("Just the tag", "c&H3F171F&", "primaryColorTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.PrimaryColor);
		Assert.Equals(result.value, "rgba(31, 23, 63, 1)");
	}),

	new Test("Enclosed tag", "{\\c&H3F171F&}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.PrimaryColor);
		Assert.Equals(result[0].value, "rgba(31, 23, 63, 1)");
	}),

	new Test("Dialogue", "{\\c&H3F171F&}", "dialogue", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.PrimaryColor);
		Assert.Equals(result[0].value, "rgba(31, 23, 63, 1)");
	})
));
