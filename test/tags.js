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
	new Test("True", "b1", "tag_b", new libjass.tags.Bold(true)),

	new Test("False", "b0", "tag_b", new libjass.tags.Bold(false)),

	new Test("100", "b100", "tag_b", new libjass.tags.Bold(100)),

	new Test("900", "b900", "tag_b", new libjass.tags.Bold(900)),

	new Test("null", "b", "tag_b", new libjass.tags.Bold(null)),

	new Test("2", "b2", "tag_b", null),

	new Test("10", "b10", "tag_b", null),

	new Test("150", "b150", "tag_b", null),

	new Test("Enclosed tag", "{\\b1}", "enclosedTags", [new libjass.tags.Bold(true)]),

	new Test("Enclosed tag", "{\\b0}", "enclosedTags", [new libjass.tags.Bold(false)]),

	new Test("Enclosed tag", "{\\b100}", "enclosedTags", [new libjass.tags.Bold(100)]),

	new Test("Enclosed tag", "{\\b900}", "enclosedTags", [new libjass.tags.Bold(900)]),

	new Test("Enclosed tag", "{\\b}", "enclosedTags", [new libjass.tags.Bold(null)]),

	new Test("Enclosed tag", "{\\b2}", "enclosedTags", [new libjass.tags.Bold(null), new libjass.tags.Comment("2")]),

	new Test("Enclosed tag", "{\\b10}", "enclosedTags", [new libjass.tags.Bold(null), new libjass.tags.Comment("0")]),

	new Test("Enclosed tag", "{\\b150}", "enclosedTags", [new libjass.tags.Bold(null), new libjass.tags.Comment("50")])
));

sections.push(new Section("Primary color tag - \\c or \\1c",
	new Test("Just the tag", "1c&H3F171F&", "tag_1c", new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))),

	new Test("Just the tag", "c&H3F171F&", "tag_c", new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))),

	new Test("Enclosed tag", "{\\c&H3F171F&}", "enclosedTags", [new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))]),

	new Test("Dialogue", "{\\c&H3F171F&}", "dialogue", [new libjass.tags.PrimaryColor(new libjass.tags.Color(31, 23, 63, 1))])
));

sections.push(new Section("Alpha tag - \\alpha",
	new Test("Just the tag", "alpha&H00&", "tag_alpha", new libjass.tags.Alpha(1))
));
