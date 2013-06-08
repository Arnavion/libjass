tests.push(["Miscellaneous",
	["herkz", "{\\pos(311,4)\\blur0.8\\fs40\\bord0\\c&H3F171F&\\t(3820,3820,\\blur6}Chi{\\c&H422CB1&}tose {\\c&H3F171F&}Furu", "dialogue", function (result, parseException) {
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
	}],
]);
