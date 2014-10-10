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

var libjass = require("../libjass.js");
var assert = require("assert");

libjass.debugMode = true;

var parserTest = function (description, input, rule, expected) {
	var result = test(description, function () {
		var actual = null;

		try {
			actual = libjass.parser.parse(input, rule);
		}
		catch (parseException) {
			if (expected === null) {
				return;
			}
			else {
				throw new Error("Expected parse to succeed but it threw an exception: " + parseException.stack);
			}
		}

		if (expected === null) {
			throw new Error("Expected parse to fail.");
		}
		else if (actual === null) {
			throw new Error("Parse failed without throwing an exception.");
		}

		assert.deepEqual(actual, expected);
	});

	result.customProperties = Object.create(null);
	result.customProperties.input = input;
	result.customProperties.rule = rule;

	return result;
};

parserTest.skip = function (description, input, rule, expected) {
	var result = test(description); // Could use test.skip but Mocha's implementation has a bug - it doesn't return the Test object

	result.customProperties = Object.create(null);
	result.customProperties.input = input;
	result.customProperties.rule = rule;

	return result;
};

if (typeof module !== "undefined") {
	module.exports = parserTest;
}
