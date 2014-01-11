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

var path = require("path");
var Mocha = require("mocha");

namespace("_test", function () {
	task("run", ["clean", "_default:writeCode"], function (failTaskOnFailure) {
		console.log("[" + this.fullName + "]");

		failTaskOnFailure = (failTaskOnFailure === true) || (failTaskOnFailure === "true");

		var mocha = new Mocha({
			ui: "tdd",
			reporter: "spec",
			loadInNewContext: !failTaskOnFailure
		});

		(new jake.FileList("./tests/test-*.js")).toArray().forEach(function (filename) {
			mocha.addFile(filename);
		});

		mocha.run(function (failures) {
			if (failTaskOnFailure && failures > 0) {
				fail(failures + " test(s) failed.");
			}

			complete();
		});
	}, { async: true });
});

Mocha.prototype.loadFiles = function (fn){
	var self = this;
	var suite = this.suite;
	var pending = this.files.length;

	this.files.forEach(function(file){
		file = path.resolve(file);

		suite.emit('pre-require', global, file, self);

		var fileExports;
		if (!self.options.loadInNewContext) {
			fileExports = require(file);
		}
		else {
			var filePathAsJsString = file.replace(/\\/g, "\\\\");
			var newContextScript = 'var module = new Module("' + filePathAsJsString + '"); module.load("' + filePathAsJsString + '"); module.exports';
			fileExports = require('vm').runInNewContext(newContextScript, {
				Module: module.constructor,
				process: process
			});
		}
		suite.emit('require', fileExports, file, self);

		suite.emit('post-require', global, file, self);

		--pending || (fn && fn());
	});
};
