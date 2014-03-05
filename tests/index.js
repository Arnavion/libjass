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

var rootSuites = [];
var suite = null;
var setup = null;
var test = null;

var require = function (name) {
	if (name === "../libjass.js") {
		return libjass;
	}
	else if (name === "assert") {
		return assert;
	}
	else if (name === "./parser-test.js") {
		return parserTest;
	}
	else {
		throw new Error("Cannot require unmocked module: " + name);
	}
};

(function () {
	var Suite = function (name, parent) {
		this.name = name;

		this.children = [];

		this.parent = parent;

		if (this.parent !== null) {
			this.parent.children.push(this);
			this.number = this.parent.number + "." + this.parent.children.length;
		}

		else {
			rootSuites.push(this);
			this.number = String(rootSuites.length);
		}
	};

	Object.defineProperties(Suite.prototype, {
		total: { get: function () {
			return this.children.reduce(function (previous, current) {
				if (current instanceof Suite) {
					return previous + current.total;
				}
				else {
					return previous + 1;
				}
			}, 0);
		}, enumerable: true },

		passed: { get: function () {
			return this.children.reduce(function (previous, current) {
				if (current instanceof Suite) {
					return previous + current.passed;
				}
				else {
					return previous + ((current.passed === true) ? 1 : 0);
				}
			}, 0);
		}, enumerable: true },

		failed: { get: function () {
			return this.children.reduce(function (previous, current) {
				if (current instanceof Suite) {
					return previous + current.failed;
				}
				else {
					return previous + ((current.passed === false) ? 1 : 0);
				}
			}, 0);
		}, enumerable: true },
	});

	Suite.prototype.run = function (logger) {
		logger.beginSuite(this);

		this.children.forEach(function (child) { child.run(logger); });

		logger.endSuite(this);
	};

	var Test = function (description, body, parent) {
		this.description = description;
		this.body = body;

		parent.children.push(this);

		this.number = parent.number + "." + parent.children.length;

		this.passed = null;
		this.exception = null;
	};

	Test.prototype.run = function (logger) {
		if (this.body) {
			this.passed = false;

			try {
				this.body();

				this.passed = true;
			}
			catch (testException) {
				this.exception = testException;
			}
		}

		logger.writeTest(this);
	};

	var currentSuite = null;

	suite = function (name, body) {
		var newSuite = new Suite(name, currentSuite);

		currentSuite = newSuite;
		body();
		currentSuite = newSuite.parent;

		return newSuite;
	};

	test = function (description, body) {
		return new Test(description, body, currentSuite);
	};
})();

var assert = new function () {
	this.deepEqual = function (actual, expected) {
		if (expected === undefined && actual === undefined) {
			return;
		}

		if (expected === undefined) {
			throw new Error("Expected undefined but got [" + actual + "]");
		}

		if (actual === undefined) {
			throw new Error("Expected [" + expected + "] but got undefined")
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

		if (expected.constructor !== actual.constructor && actual.constructor !== undefined) {
			throw new Error("Expected value of type [" + expected.constructor.name + "] but got value of type [" + actual.constructor.name + "].");
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
				if (Array.isArray(expected)) {
					if (!Array.isArray(actual)) {
						throw new Error("Expected an array but got [" + actual + "]");
					}

					if (expected.length !== actual.length) {
						throw new Error("Expected an array of length " + expected.length + " but got array of length " + actual.length);
					}

					var i;
					for (i = 0; i < expected.length; i++) {
						assert.deepEqual(actual[i], expected[i]);
					}
				}

				else {
					var expectedProperties = Object.keys(expected);
					var actualProperties = Object.keys(actual);
					expectedProperties.sort();
					actualProperties.sort();

					assert.deepEqual(actualProperties, expectedProperties);

					expectedProperties.forEach(function (property) {
						assert.deepEqual(actual[property], expected[property]);
					});
				}
				break;

			default:
				throw new Error("Unrecognized type: " + typeof expected);
		}
	};
};

var Logger = function (outputDiv) {
	var testDiv = document.createElement("div");
	testDiv.className = "test";

	var suiteElement = document.createElement("fieldset");
	suiteElement.className = "suite";
	suiteElement.appendChild(document.createElement("legend"));

	var totalDiv = document.createElement("div");

	var currentSuiteElement = outputDiv;

	this.beginSuite = function (suite) {
		var newSectionElement = suiteElement.cloneNode(true);
		currentSuiteElement.appendChild(newSectionElement);
		currentSuiteElement = newSectionElement;

		var message = "Suite " + suite.number + " - \"" + suite.name + "\"";
		console.group(message);
		currentSuiteElement.querySelector("legend").appendChild(document.createTextNode(message));
	};

	this.endSuite = function (suite) {
		var numTotal = suite.total;
		var numPassed = suite.passed;
		var numFailed = suite.failed;

		var message = numPassed + " of " + numTotal + " tests passed";

		console.log(message);

		if (numFailed > 0) {
			var message = numFailed + " of " + numTotal + " tests failed";

			console.warn(message);

			currentSuiteElement.querySelector("legend").appendChild(document.createTextNode(" - " + message));
			currentSuiteElement.className += " failed";
		}
		else {
			currentSuiteElement.className += " passed";
		}

		if (numTotal > numPassed + numFailed) {
			var message = (numTotal - (numPassed + numFailed)) + " of " + numTotal + " tests skipped";

			console.log(message);

			currentSuiteElement.querySelector("legend").appendChild(document.createTextNode(" - " + message));
		}

		currentSuiteElement = currentSuiteElement.parentElement;
		console.groupEnd();
	};

	this.writeTest = function (test) {
		if (test.passed === true) {
			var message = "Test " + test.number + " - \"" + test.description + "\" - " + test.customProperties.rule + " [ " + test.customProperties.input + " ] ";
			console.log(message);
			append(testDiv, message).className += " passed";
		}
		else if (test.passed === false) {
			var message = "Test " + test.number + " - \"" + test.description + "\" - " + test.customProperties.rule + " [ " + test.customProperties.input + " ] " + " : " + ((test.exception !== null) ? test.exception.message : "<No exception>");
			console.warn(message);
			append(testDiv, message).className += " failed";
		}
		else {
			var message = "Test " + test.number + " - \"" + test.description + "\" - " + test.customProperties.rule + " [ " + test.customProperties.input + " ] " + " : Skipped";
			console.log(message);
			append(testDiv, message).className += " skipped";
		}
	};

	this.writeTotal = function (suites) {
		currentSuiteElement = suiteElement.cloneNode(true);
		outputDiv.appendChild(currentSuiteElement);
		currentSuiteElement.className = "total";

		console.group("Total");
		currentSuiteElement.querySelector("legend").appendChild(document.createTextNode("Total"));

		var numTotal = suites.map(function (section) { return section.total; }).sum();
		var numPassed = suites.map(function (section) { return section.passed; }).sum();
		var numFailed = suites.map(function (section) { return section.failed; }).sum();

		var message = numPassed + " of " + numTotal + " tests passed.";
		console.log(message);
		append(totalDiv, message).className = "passed";

		if (numFailed > 0) {
			var message = numFailed + " of " + numTotal + " tests failed.";
			console.warn(message);
			append(totalDiv, message).className = "failed";
		}

		if (numTotal > numPassed + numFailed) {
			var message = (numTotal - (numPassed + numFailed)) + " of " + numTotal + " tests skipped.";
			console.warn(message);
			append(totalDiv, message).className = "skipped";
		}

		console.groupEnd();
	};

	var append = function (messageDivType, message) {
		var messageDiv = messageDivType.cloneNode();

		currentSuiteElement.appendChild(messageDiv);

		messageDiv.appendChild(document.createTextNode(message));

		return messageDiv;
	};
};

addEventListener("DOMContentLoaded", function () {
	var logger = new Logger(document.querySelector("#output"));

	rootSuites.forEach(function (suite) { suite.run(logger); });

	logger.writeTotal(rootSuites);
}, false);
