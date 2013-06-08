var Assert = new function () {
	this.SuccessfulParse = function (args, expectedType) {
		if (args[1] !== null) {
			throw new Error("Expected parse to succeed but it threw an exception: " + args[1].message);
		}
		else if (args[0] === null || args[0] === undefined) {
			throw new Error("Parse failed without throwing an exception.");
		}

		this.IsInstanceOf(args[0], expectedType);
	};

	this.UnsuccessfulParse = function (args) {
		if (args[1] === null) {
			throw new Error("Expected parse to fail.");
		}
		else if (args[0] !== null) {
			throw new Error("Parse failed and threw an exception but also returned a result.");
		}
	};

	this.IsInstanceOf = function (result, type) {
		if (!(result instanceof type) && (result !== null) && (result !== undefined) && result.constructor !== type) {
			throw new Error("Parse result is of wrong type.");
		}
	};

	this.Equals = function (actual, expected) {
		if (expected !== actual) {
			throw new Error("Expected [" + expected + "] but got [" + actual + "]");
		}
	};
};

var parser = null;

addEventListener("DOMContentLoaded", function () {
	var parserRequest = new XMLHttpRequest();
	parserRequest.open("GET", "../ass.pegjs", true);
	parserRequest.addEventListener("readystatechange", function () {
		if (parserRequest.readyState === XMLHttpRequest.DONE) {
			parser = PEG.buildParser(parserRequest.responseText);
			parserLoaded();
		}
	}, false);
	parserRequest.send(null);
}, false);

var parserLoaded = function () {
	var numSucceeded = 0;
	var numFailed = 0;

	tests.forEach(function (section, sectionNumber) {
		sectionNumber++;

		var numSectionSucceeded = 0;
		var numSectionFailed = 0;

		var sectionName = section[0];

		console.log("");
		console.log("Section " + sectionNumber + " - \"" + sectionName + "\"");

		section.slice(1).forEach(function (test, testNumber) {
			testNumber++;

			var testName = test[0];
			var input = test[1];
			var rule = test[2];
			var validate = test[3];

			try {
				var result = null;
				try {
					result = parser.parse(input, rule);
				}
				catch (parseException) {
					validate(null, parseException);
				}
				if (result !== null) {
					validate(result, null);
				}

				console.log("Test " + sectionNumber + "." + testNumber + " - \"" + testName + "\" succeeded.");
				numSectionSucceeded++;
				numSucceeded++;
			}
			catch (testException) {
				console.error("Test " + sectionNumber + "." + testNumber + " - \"" + testName + "\" failed: " + testException.message);
				numSectionFailed++;
				numFailed++;
			}
		});

		console.log("Section " + sectionNumber + " - \"" + sectionName + "\" - " + numSectionSucceeded + " of " + (numSectionSucceeded + numSectionFailed) + " succeeded.");
		if (numSectionFailed > 0) {
			console.error("Section " + sectionNumber + " - \"" + sectionName + "\" - " + numSectionFailed + " of " + (numSectionSucceeded + numSectionFailed) + " failed.");
		}
	});

	console.log("Total - " + numSucceeded + " of " + (numSucceeded + numFailed) + " succeeded.");
	if (numFailed > 0) {
		console.error("Total - " + numFailed + " of " + (numSucceeded + numFailed) + " failed.");
	}
}

var tests = [];
