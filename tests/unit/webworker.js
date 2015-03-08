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

define(["intern!tdd", "intern/chai!assert", "../../lib/libjass.js"], function (tdd, assert, libjass) {
	var workerChannel = null;

	tdd.suite("Web worker", function () {
		if (libjass.webworker.supported) {
			workerChannel = libjass.webworker.createWorker("../../lib/libjass.js");
		}

		tdd.test("Parse", function () {
			if (!libjass.webworker.supported) {
				this.skip("Parse: Web workers not supported in this environment.");
			}

			return workerChannel.request(libjass.webworker.WorkerCommands.Parse, {
				input: "{\\an8}Are {\\i1}you{\\i0} the one who stole the clock?!",
				rule: "dialogueParts"
			}).then(function (value) {
				assert.deepEqual(value, [
					new libjass.parts.Alignment(8),
					new libjass.parts.Text("Are "),
					new libjass.parts.Italic(true),
					new libjass.parts.Text("you"),
					new libjass.parts.Italic(false),
					new libjass.parts.Text(" the one who stole the clock?!")
				]);
			});
		});

		tdd.test("Parse failure", function () {
			if (!libjass.webworker.supported) {
				this.skip("Parse: Web workers not supported in this environment.");
			}

			return workerChannel.request(libjass.webworker.WorkerCommands.Parse, {
				input: "a4",
				rule: "tag_a"
			}).then(function (value) {
				throw new Error("Expected parse to fail.");
			}, function (reason) {
				assert.strictEqual(reason.message, "Parse failed.");
			});
		});
	});
});
