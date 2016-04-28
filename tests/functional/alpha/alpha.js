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

define(["intern!tdd", "require", "tests/support/test-page"], function (tdd, require, TestPage) {
	tdd.suite("alpha", function () {
		tdd.test("Basic", function () {
			var testPage = new TestPage(this.remote, require.toUrl("tests/support/browser-test-page.html"), "/tests/functional/alpha/alpha.ass", 1280, 720, "rgb(47, 163, 254)");
			return testPage
				.prepare()
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(1, require.toUrl("./alpha-1.png")); })
				.then(function (testPage) { return testPage.done(); });
		});
	});
});
