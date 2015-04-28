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

define(["intern"], function (intern) {
	var result = {
		suites: [
			"tests/unit/minified",
			"tests/unit/miscellaneous",
			"tests/unit/polyfills",
			"tests/unit/primitives",
			"tests/unit/tags",
			"tests/unit/webworker"
		],
		functionalSuites: [
			"tests/functional/kfx/kfx"
		],
		excludeInstrumentation: /^(?:tests|node_modules)[/\\]/,
		tunnel: "NullTunnel",
		environments: [
			{ browserName: "chrome" },
			{ browserName: "firefox" },
			{ browserName: "internet explorer", version: "11" }
		],
	};

	if (intern.args.minified === "true") {
		result.loader = {
			map: {
				tests: {
					"lib/libjass": "lib/libjass.min",
					"lib/libjass.js": "lib/libjass.min.js",
				}
			}
		};
	}

	return result;
});
