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

var fs = require("fs");
var path = require("path");

var Mocha = require("mocha");

console.log("Running tests...");

var mocha = new Mocha({
	ui: "tdd",
	reporter: "spec"
});

fs.readdirSync("./tests/")
.filter(function (filename) { return filename.match(/^test-.*\.js$/) !== null; })
.forEach(function (filename) { mocha.addFile(path.resolve("./tests", filename)); });

mocha.run(function (failures) {
	if (failures > 0) {
		throw new Error(failures + " test(s) failed.");
	}
});
