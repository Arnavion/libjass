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
