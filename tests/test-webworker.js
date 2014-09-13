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

suite("Web worker", function () {
	var workerChannel = null;

	setup(function () {
		if (libjass.webworker.supported) {
			workerChannel = libjass.webworker.createWorker("../libjass.js");
		}
	});

	suite("Parse", function () {
		if (libjass.webworker.supported) {
			test("Parse", function (done) {
				this.customProperties = {
					rule: "dialogueParts",
					input: "{\\an8}Are {\\i1}you{\\i0} the one who stole the clock?!"
				};

				workerChannel.request(libjass.webworker.WorkerCommands.Parse, {
					input: this.customProperties.input,
					rule: this.customProperties.rule
				}).then(function (value) {
					try {
						assert.deepEqual(value, [
							new libjass.parts.Alignment(8),
							new libjass.parts.Text("Are "),
							new libjass.parts.Italic(true),
							new libjass.parts.Text("you"),
							new libjass.parts.Italic(false),
							new libjass.parts.Text(" the one who stole the clock?!")
						]);

						done();
					}
					catch (ex) {
						done(ex);
					}
				}, function (reason) {
					done(reason);
				});
			});
		}
		else {
			test("Parse: Web workers not supported in this environment.");
		}

		if (libjass.webworker.supported) {
			test("Parse failure", function (done) {
				this.customProperties = {
					rule: "tag_a",
					input: "a4"
				};

				workerChannel.request(libjass.webworker.WorkerCommands.Parse, {
					input: this.customProperties.input,
					rule: this.customProperties.rule
				}).then(function (value) {
					done(new Error("Expected parse to fail."));
				}, function (reason) {
					done();
				});
			});
		}
		else {
			test("Parse failure: Web workers not supported in this environment.");
		}
	});
});
