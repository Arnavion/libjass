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

var childProcess = require("child_process");
var fs = require("fs");
var gulp = require("gulp");
var path = require("path");

var Vinyl = require("vinyl");

var Transform = require("./gulplib/helpers.js").Transform;

Object.defineProperties(global, {
	Doc: { get: function () { return require("./gulplib/doc.js"); } },
	Mocha: { get: function () { return require("mocha"); } },
	TypeScript: { get: function () { return require("./gulplib/typescript.js"); } },
	UglifyJS: { get: function () { return require("./gulplib/uglify.js"); } },
});

gulp.task("default", ["libjass.js", "libjass.min.js"]);

gulp.task("libjass.js", function (callback) {
	if (fs.existsSync("./libjass.js")) {
		return callback(null);
	}

	return gulp.src("./libjass.ts").pipe(TypeScript.gulp("/libjass.js", "/libjass.js.map")).pipe(UglifyJS.fixup()).pipe(gulp.dest("."));
});

gulp.task("libjass.min.js", ["libjass.js"], function (callback) {
	if (fs.existsSync("./libjass.min.js")) {
		return callback(null);
	}

	var input = Object.create(null);

	return gulp.src(["./libjass.js", "./libjass.js.map"]).pipe(UglifyJS.minify()).pipe(gulp.dest("."));
});

gulp.task("clean", function () {
	["libjass.js", "libjass.js.map", "libjass.min.js", "libjass.min.js.map"].forEach(function (file) {
		try {
			fs.unlinkSync(file);
		}
		catch (ex) {
			if (ex.code !== "ENOENT") {
				throw ex;
			}
		}
	});
});

gulp.task("test", ["libjass.js"], function (callback) {
	var mocha = new Mocha({
		ui: "tdd",
		reporter: "spec"
	});

	gulp.src("./tests/test-*.js").pipe(Transform(function (file) {
		mocha.addFile(file.path);
	}, function () {
		mocha.run(function (failures) {
			if (failures > 0) {
				callback(new Error(failures + " test(s) failed."));
			}
			else {
				callback(null);
			}
		});
	}));
});

gulp.task("watch", function (callback) {
	var spawnSubProcess = function () {
		var pathToGulp = path.resolve("./node_modules/.bin/gulp");
		var subProcess = childProcess.exec(pathToGulp + " _watch");
		subProcess.stdout.pipe(process.stdout);
		subProcess.stderr.pipe(process.stderr);
		subProcess.addListener("exit", function (code, signal) {
			spawnSubProcess();
		});
	};

	spawnSubProcess();
});

gulp.task("_watch", function () {
	return gulp.watch(["./*.ts", "./tests/*.js"], ["clean", "libjass.js", "test"]);
});

gulp.task("doc", ["libjass.js"], function () {
	return gulp.src("./libjass.js").pipe(Doc("/api.xhtml")).pipe(gulp.dest("../libjass-gh-pages/"));
});
