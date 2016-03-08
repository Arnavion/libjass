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

define(["intern", "intern/dojo/has!host-node?tests/support/encoded-firefox-profile!"], function (intern, encodedFirefoxProfile) {
	var result = {
		suites: [
			"tests/unit/attachments",
			"tests/unit/manual-clock",
			"tests/unit/minified",
			"tests/unit/miscellaneous",
			"tests/unit/polyfills",
			"tests/unit/primitives",
			"tests/unit/serialization",
			"tests/unit/tags",
			"tests/unit/webworker"
		],
		functionalSuites: [
			"tests/functional/alpha/alpha",
			"tests/functional/auto-clock",
			"tests/functional/fsc/fsc",
			"tests/functional/kfx/kfx",
			"tests/functional/outlines/outlines",
			"tests/functional/outlines/subpixel",
			"tests/functional/r/alpha",
			"tests/functional/t/alpha"
		],
		loaderOptions: {
			packages: [{
				name: "libjass",
				location: "lib",
				main: (intern.args.minified === "true") ? "libjass.min" : "libjass",
			}]
		},
		excludeInstrumentation: /^(?:tests|node_modules)\//,
		tunnel: "NullTunnel",
		environments: [
			{ browserName: "chrome" },
			//{ browserName: "firefox", firefox_profile: encodedFirefoxProfile },
			{ browserName: "internet explorer", version: "11" }
		],
	};

	return result;
});
