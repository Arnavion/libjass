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

Array.prototype.sum = function () {
	return this.reduce(function (previous, current) {
		return previous + current;
	}, 0);
};

var Section = (function () {
	var lastSectionNumber = 0;

	return function (name/*, tests... */) {
		var tests = [].slice.call(arguments, 1);

		var number = ++lastSectionNumber;

		Object.defineProperties(this, {
			number: { value: number, enumerable: true },
			name: { value: name, enumerable: true },
			tests: { value: tests, enumerable: true }
		});
	};
})();

var Test = (function () {
	var lastTestNumber = 0;

	return function (name, input, rule, validate) {
		var number = ++lastTestNumber;

		var succeeded = false;
		var exception = null;

		Object.defineProperties(this, {
			number: { value: number, enumerable: true },
			name: { value: name, enumerable: true },
			input: { value: input, enumerable: true },
			rule: { value: rule, enumerable: true },
			validate: { value: validate, enumerable: true },
			succeeded: { get: function () { return succeeded; }, enumerable: true },
			exception: { get: function () { return exception; }, enumerable: true }
		});

		this.execute = function () {
			try {
				var result = null;
				try {
					result = parser.parse(this.input, rule);
				}
				catch (parseException) {
					this.validate(null, parseException);
				}
				if (result !== null) {
					this.validate(result, null);
				}

				succeeded = true;
			}
			catch (testException) {
				exception = testException;
			}
		};
	};
})();

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

var Logger = function (outputDiv) {
	var logDiv = document.createElement("div");
	logDiv.className = "log";

	var errorDiv = document.createElement("div");
	errorDiv.className = "error";

	var sectionDiv = document.createElement("div");
	sectionDiv.className = "section";

	var testDiv = document.createElement("div");
	testDiv.className = "test";

	var runnerLogDiv = document.createElement("div");
	runnerLogDiv.className = "runner-log";

	var runnerErrorDiv = document.createElement("div");
	runnerErrorDiv.className = "runner-error";

	var currentSectionDiv = null;

	this.beginSection = function (section) {
		currentSectionDiv = sectionDiv.cloneNode();
		outputDiv.appendChild(currentSectionDiv);

		console.log("");

		var message = "Section " + section.number + " - \"" + section.name + "\"";
		console.log(message);
		append(runnerLogDiv, message);
	};

	this.endSection = function (section) {
		var numTotal = section.tests.length;
		var numSucceeded = section.tests.map(function (test) { return test.succeeded ? 1 : 0; }).sum();
		var numFailed = numTotal - numSucceeded;

		var message = "Section " + section.number + " - \"" + section.name + "\" - " + numSucceeded + " of " + numTotal + " succeeded.";
		console.log(message);
		append(runnerLogDiv, message);

		if (section.numFailed > 0) {
			var message = "Section " + section.number + " - \"" + section.name + "\" - " + numFailed + " of " + numTotal + " failed.";
			console.log(message);
			append(runnerErrorDiv, message);
		}
	};

	this.writeTest = function (test, section) {
		if (test.succeeded) {
			var message = "Test " + section.number + "." + test.number + " - \"" + test.name + "\" succeeded.";
			console.log(message);
			append(logDiv, message);
		}
		else {
			var message = "Test " + section.number + "." + test.number + " - \"" + test.name + "\" failed: " + ((test.exception !== null) ? test.exception.message : "<No exception>");
			console.error(message);
			append(errorDiv, message);
		}
	};

	this.writeTotal = function (sections) {
		console.log("");

		var numTotal = sections.map(function (section) {
			return section.tests.length;
		}).sum();

		var numSucceeded = sections.map(function (section) {
			return section.tests.map(function (test) { return test.succeeded ? 1 : 0; }).sum();
		}).sum();

		var numFailed = numTotal - numSucceeded;

		var message = "Total - " + numSucceeded + " of " + numTotal + " succeeded.";
		console.log(message);
		append(runnerLogDiv, message);

		if (numFailed > 0) {
			var message = "Total - " + numFailed + " of " + numTotal + " failed.";
			console.log(message);
			append(runnerErrorDiv, message);
		}
	};

	var append = function (messageDivType, message) {
		var messageDiv = messageDivType.cloneNode();

		currentSectionDiv.appendChild(messageDiv);

		messageDiv.appendChild(document.createTextNode(message));
	};
};

var Log = null;

var parser = null;

addEventListener("DOMContentLoaded", function () {
	Log = new Logger(document.querySelector("#output"));

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
	sections.forEach(function (section) {
		Log.beginSection(section);
		section.tests.forEach(function (test) {
			test.execute();
			Log.writeTest(test, section);
		});
		Log.endSection(section);
	});

	Log.writeTotal(sections);
}

var sections = [];
