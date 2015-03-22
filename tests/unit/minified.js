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

define(["intern!tdd", "intern/chai!assert", "lib/libjass", "intern"], function (tdd, assert, libjass, intern) {
	tdd.suite("Minified script-specific tests", function () {
		tdd.test("libjass.js is not minified", function () {
			if (intern.args.minified === "true") {
				this.skip("Not testing libjass.js");
			}

			var boldTag = libjass.parser.parse("b1", "tag_b");
			assert.property(boldTag, "_value");
			assert.strictEqual(boldTag.value, true);
		});

		tdd.test("libjass.min.js is minified", function () {
			if (intern.args.minified !== "true") {
				this.skip("Not testing libjass.min.js");
			}

			var boldTag = libjass.parser.parse("b1", "tag_b");
			assert.notProperty(boldTag, "_value");
			assert.strictEqual(boldTag.value, true);
		});
	});
});
