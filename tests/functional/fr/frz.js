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
	tdd.suite("fr", function () {
		tdd.test("frz", function () {
			var testPage = new TestPage(this.remote, require.toUrl("tests/support/browser-test-page.html"), "/tests/functional/fr/frz.ass", 1280, 720);
			return testPage
				.prepare()
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(0.5, require.toUrl("./frz-01.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(1.5, require.toUrl("./frz-02.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(2.5, require.toUrl("./frz-03.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(3.5, require.toUrl("./frz-04.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(4.5, require.toUrl("./frz-05.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(5.5, require.toUrl("./frz-06.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(6.5, require.toUrl("./frz-07.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(7.5, require.toUrl("./frz-08.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(8.5, require.toUrl("./frz-09.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(9.5, require.toUrl("./frz-10.png")); })
				.then(function (testPage) { return testPage.done(); });
		});
	});
});
