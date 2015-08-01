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
	tdd.suite("kfx", function () {
		tdd.test("Basic", function () {
			var testPage = new TestPage(this.remote, require.toUrl("tests/support/browser-test-page.html"), "/tests/functional/kfx/kfx.ass", 256, 144);
			return testPage
				.prepare()
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(1.5, require.toUrl("./kfx-1.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(2.5, require.toUrl("./kfx-2.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(3.5, require.toUrl("./kfx-3.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(4.5, require.toUrl("./kfx-4.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(5.5, require.toUrl("./kfx-5.png")); })
				.then(function (testPage) { return testPage.seekAndCompareScreenshot(6.5, require.toUrl("./kfx-6.png")); });
		});
	});
});
