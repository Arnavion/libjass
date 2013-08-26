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
			tests: { value: tests, enumerable: true },
			total: { get: function () { return this.tests.length; }, enumerabe: true },
			passed: { get: function () { return this.tests.map(function (test) { return (test.passed === true) ? 1 : 0; }).sum(); }, enumerabe: true },
			failed: { get: function () { return this.tests.map(function (test) { return (test.passed === false) ? 1 : 0; }).sum(); }, enumerabe: true }
		});
	};
})();

var Test = (function () {
	var lastTestNumber = 0;

	return function (name, input, rule, expected) {
		var number = ++lastTestNumber;

		var passed = null;
		var exception = null;

		Object.defineProperties(this, {
			number: { value: number, enumerable: true },
			name: { value: name, enumerable: true },
			input: { value: input, enumerable: true },
			rule: { value: rule, enumerable: true },
			expected: { value: expected, enumerable: true },
			passed: { get: function () { return passed; }, enumerable: true },
			exception: { get: function () { return exception; }, enumerable: true }
		});

		this.execute = function () {
			try {
				passed = false;

				var actual = null;

				try {
					actual = libjass.parser.parse(this.input, rule);
				}
				catch (parseException) {
					if (expected === null) {
						passed = true;
						return;
					}
					else {
						throw new Error("Expected parse to succeed but it threw an exception: " + parseException.message);
					}
				}

				if (expected === null) {
					throw new Error("Expected parse to fail.");
				}
				else if (actual === null) {
					throw new Error("Parse failed without throwing an exception.");
				}

				Assert.AreEqual(expected, actual);

				passed = true;
			}
			catch (testException) {
				exception = testException;
			}
		};
	};
})();

var Assert = new function () {
	this.AreEqual = function (expected, actual) {
		if (expected === undefined) {
			throw new Error("Expected should not be undefined");
		}

		if (actual === undefined) {
			throw new Error("Actual should not be undefined");
		}

		if (expected === null && actual === null) {
			return;
		}

		if (expected === null) {
			throw new Error("Expected null but got [" + actual + "]");
		}

		if (actual === null) {
			throw new Error("Expected [" + expected + "] but got null")
		}

		if (expected.constructor !== actual.constructor) {
			throw new Error("Parse result is of wrong type.");
		}

		switch(typeof expected) {
			case "boolean":
			case "number":
			case "string":
				if (expected !== actual) {
					throw new Error("Expected [" + expected + "] but got [" + actual + "]");
				}
				break;

			case "object":
				Object.keys(expected).forEach(function (property) {
					Assert.AreEqual(expected[property], actual[property]);
				});
				break;

			default:
				throw new Error("Unrecognized type: " + typeof expected);
		}
	};
};

var Logger = function (outputDiv) {
	var testDiv = document.createElement("div");
	testDiv.className = "test";

	var sectionElement = document.createElement("fieldset");
	sectionElement.className = "section";
	sectionElement.appendChild(document.createElement("legend"));

	var totalDiv = document.createElement("div");

	var currentSectionElement = null;

	this.beginSection = function (section) {
		currentSectionElement = sectionElement.cloneNode(true);
		outputDiv.appendChild(currentSectionElement);

		var message = "Section " + section.number + " - \"" + section.name + "\"";
		console.group(message);
		currentSectionElement.querySelector("legend").appendChild(document.createTextNode(message));
	};

	this.endSection = function (section) {
		var numTotal = section.total;
		var numPassed = section.passed;
		var numFailed = section.failed;

		var currentSectionLegend = currentSectionElement.querySelector("legend");

		var message = numPassed + " of " + numTotal + " tests passed.";
		console.log(message);

		if (numFailed > 0) {
			var message = numFailed + " of " + numTotal + " tests failed.";
			console.warn(message);
			currentSectionLegend.appendChild(document.createTextNode(" - " + message));
			currentSectionElement.className += " failed";
		}
		else {
			currentSectionElement.className += " passed";
		}

		console.groupEnd();
	};

	this.writeTest = function (test, section) {
		if (test.passed) {
			var message = "Test " + section.number + "." + test.number + " - \"" + test.name + "\" - " + test.rule + " [ " + test.input + " ] ";
			console.log(message);
			append(testDiv, message).className += " passed";
		}
		else {
			var message = "Test " + section.number + "." + test.number + " - \"" + test.name + "\" - " + test.rule + " [ " + test.input + " ] " + " : " + ((test.exception !== null) ? test.exception.message : "<No exception>");
			console.warn(message);
			append(testDiv, message).className += " failed";
		}
	};

	this.writeTotal = function (sections) {
		currentSectionElement = sectionElement.cloneNode(true);
		outputDiv.appendChild(currentSectionElement);
		currentSectionElement.className = "total";

		console.group("Total");
		currentSectionElement.querySelector("legend").appendChild(document.createTextNode("Total"));

		var numTotal = sections.map(function (section) { return section.total; }).sum();
		var numPassed = sections.map(function (section) { return section.passed; }).sum();
		var numFailed = sections.map(function (section) { return section.failed; }).sum();

		var message = numPassed + " of " + numTotal + " tests passed.";
		console.log(message);
		append(totalDiv, message).className = "passed";

		if (numFailed > 0) {
			var message = numFailed + " of " + numTotal + " tests failed.";
			console.warn(message);
			append(totalDiv, message).className = "failed";
		}
	};

	var append = function (messageDivType, message) {
		var messageDiv = messageDivType.cloneNode();

		currentSectionElement.appendChild(messageDiv);

		messageDiv.appendChild(document.createTextNode(message));

		return messageDiv;
	};
};

var Log = null;

addEventListener("DOMContentLoaded", function () {
	Log = new Logger(document.querySelector("#output"));

	sections.forEach(function (section) {
		Log.beginSection(section);
		section.tests.forEach(function (test) {
			test.execute();
			Log.writeTest(test, section);
		});
		Log.endSection(section);
	});

	Log.writeTotal(sections);
}, false);

var sections = [];
