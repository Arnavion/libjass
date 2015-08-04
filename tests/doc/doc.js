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

define(["intern!tdd", "intern/chai!assert", "intern/dojo/node!fs", "intern/dojo/node!path", "intern/dojo/node!sax"], function (tdd, assert, fs, path, sax) {
	tdd.suite("Documentation tests", function () {
		var ids = [];
		var hrefs = [];

		tdd.before(function () {
			var parser = sax.parser(true);

			parser.onopentag = function (node) {
				if (node.name === "a" && node.attributes.href[0] === "#") {
					hrefs.push(node.attributes.href.substr(1));
				}

				if (node.attributes.id !== undefined) {
					ids.push(node.attributes.id);
				}
			};

			parser.onerror = function (error) { throw error; };

			parser.write(fs.readFileSync(require.toUrl("../libjass-gh-pages/api.xhtml"), { encoding: "utf8" })).close();
		});

		tdd.test("api.xhtml", function () {
			var brokenLinks = hrefs.filter(function (href) {
				return ids.indexOf(href) === -1;
			});

			assert.equal(brokenLinks.length, 0, "Broken link(s): " + brokenLinks.map(function (href) { return '"' + href + '"'; }).join(", "));
		});

		tdd.test("README.md", function () {
			var regex = /\[[^\]]+\]\(http:\/\/arnavion\.github\.io\/libjass\/api\.xhtml#([^)]+)\)/g;
			var brokenLinks = [];

			var readme = fs.readFileSync(require.toUrl("./README.md"), { encoding: "utf8" });

			var match;
			while ((match = regex.exec(readme)) !== null) {
				if (ids.indexOf(match[1]) === -1) {
					brokenLinks.push(match[1]);
				}
			}

			assert.equal(brokenLinks.length, 0, "Broken link(s): " + brokenLinks.map(function (href) { return '"' + href + '"'; }).join(", "));
		});

		tdd.test("@{link} tags in the source", function () {
			var regex = /\{@link ([^}]+)\}/g;
			var brokenLinks = [];

			var libjassJs = fs.readFileSync(require.toUrl("./lib/libjass.js"), { encoding: "utf8" });

			var match;
			while ((match = regex.exec(libjassJs)) !== null) {
				if (ids.indexOf(match[1]) === -1) {
					brokenLinks.push(match[1]);
				}
			}

			assert.equal(brokenLinks.length, 0, "Broken link(s): " + brokenLinks.map(function (href) { return '"' + href + '"'; }).join(", "));
		});
	});
});
