tests.push(["Bold tag - \\b",
	["True", "b1", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, true);
	}],

	["False", "b0", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, false);
	}],

	["100", "b100", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, 100);
	}],

	["900", "b900", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, 900);
	}],

	["null", "b", "boldTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.Bold);
		Assert.Equals(result.value, null);
	}],

	["2", "b2", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}],

	["10", "b10", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}],

	["150", "b150", "boldTag", function (result, parseException) {
		Assert.UnsuccessfulParse(arguments);
	}],

	["Enclosed tag", "{\\b1}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);
	}],

	["Enclosed tag", "{\\b0}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, false);
	}],

	["Enclosed tag", "{\\b100}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, 100);
	}],

	["Enclosed tag", "{\\b900}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, 900);
	}],

	["Enclosed tag", "{\\b}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, null);
	}],

	["Enclosed tag", "{\\b2}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, null);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "2");
	}],

	["Enclosed tag", "{\\b10}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "0");
	}],

	["Enclosed tag", "{\\b150}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 2);

		Assert.IsInstanceOf(result[0], ASS.Tags.Bold);
		Assert.Equals(result[0].value, true);

		Assert.IsInstanceOf(result[1], ASS.Tags.Comment);
		Assert.Equals(result[1].value, "50");
	}],
]);

tests.push(["Primary color tag - \\c or \\1c",
	["Just the tag", "c&H3F171F&", "primaryColorTag", function (result, parseException) {
		Assert.SuccessfulParse(arguments, ASS.Tags.PrimaryColor);
		Assert.Equals(result.value, "rgba(31, 23, 63, 1)");
	}],

	["Enclosed tag", "{\\c&H3F171F&}", "enclosedTags", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.PrimaryColor);
		Assert.Equals(result[0].value, "rgba(31, 23, 63, 1)");
	}],

	["Dialogue", "{\\c&H3F171F&}", "dialogue", function (result, parseException) {
		Assert.SuccessfulParse(arguments, Array);
		Assert.Equals(result.length, 1);

		Assert.IsInstanceOf(result[0], ASS.Tags.PrimaryColor);
		Assert.Equals(result[0].value, "rgba(31, 23, 63, 1)");
	}],
]);
