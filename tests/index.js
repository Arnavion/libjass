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

var require = function (name) {
	if (name === "../lib/libjass.js" || name === "../../lib/libjass.js") {
		return window.libjass;
	}
	else if (name === "assert") {
		return assert;
	}
	else if (name === "../parser-test.js") {
		return parserTest;
	}
	else {
		throw new Error("Cannot require unmocked module: " + name);
	}
};

mocha.setup("tdd");

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

assert.deepEqual = function (actual, expected) {
	if (expected === undefined && actual === undefined) {
		return;
	}

	if (expected === undefined) {
		throw new Error("Expected undefined but got [" + actual + "]");
	}

	if (actual === undefined) {
		throw new Error("Expected [" + expected + "] but got undefined");
	}

	if (expected === null && actual === null) {
		return;
	}

	if (expected === null) {
		throw new Error("Expected null but got [" + actual + "]");
	}

	if (actual === null) {
		throw new Error("Expected [" + expected + "] but got null");
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
