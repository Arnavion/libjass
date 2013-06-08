tests.push(["Color",
	["BBGGRR", "&H3F171F&", "color", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(31, 23, 63, 1)");
	}],

	["AABBGGRR", "&H00434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, 1)");
	}],

	["AABBGGRR", "&HF0434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, " + (1 - 240 / 255) + ")");
	}],

	["AABBGGRR", "&HFF434441", "colorWithAlpha", function (result, parseException) {
		Assert.SuccessfulParse(arguments, String);
		Assert.Equals(result, "rgba(65, 68, 67, 0)");
	}],
]);
