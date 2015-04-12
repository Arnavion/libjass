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

var gulp = require("gulp");

var helpers = require("./gulplib/helpers.js");
var Transform = helpers.Transform;

(function () {
	var _TypeScript = null;
	var _UglifyJS = null;
	var _npm = null;

	Object.defineProperties(global, {
		TypeScript: { get: function () { return _TypeScript || (_TypeScript = require("./gulplib/typescript.js")); } },
		UglifyJS: { get: function () { return _UglifyJS || (_UglifyJS = require("./gulplib/uglify.js")); } },
		npm: { get: function () { return _npm || (_npm = require("npm")); } },
	});
})();

gulp.task("default", ["libjass.js", "libjass.min.js"]);

gulp.task("libjass.js", function () {
	if (fs.existsSync("./lib/libjass.js")) {
		return;
	}

	return gulp.src("./src/tsconfig.json")
		.pipe(TypeScript.gulp("./src/index.ts", "libjass"))
		.pipe(UglifyJS.gulp("./src/index", "libjass", ["BorderStyle", "Format", "WorkerCommands", "WrappingStyle"]))
		.pipe(gulp.dest("./lib"));
});

gulp.task("libjass.min.js", ["libjass.js"], function () {
	if (fs.existsSync("./lib/libjass.min.js")) {
		return;
	}

	return gulp.src(["./lib/libjass.js", "./lib/libjass.js.map"])
		.pipe(UglifyJS.minify())
		.pipe(gulp.dest("./lib"));
});

gulp.task("clean", function () {
	["./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.min.js", "./lib/libjass.min.js.map"].forEach(function (file) {
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

gulp.task("watch", ["clean"], function (callback) {
	npm.load(function () {
		var testRunning = false;
		var rerunTest = false;

		var startTest = function () {
			npm.commands["run-script"](["test-lib"], function () {
				testRunning = false;

				if (rerunTest) {
					startTest();
					rerunTest = false;
				}
			});

			testRunning = true;
		};

		var runTest = function () {
			if (!testRunning) {
				startTest();
			}
			else {
				rerunTest = true;
			}
		};

		gulp.src("./src/tsconfig.json")
			.pipe(TypeScript.watch("./src/index.ts", "libjass"))
			.pipe(UglifyJS.watch("./src/index", "libjass", ["BorderStyle", "Format", "WorkerCommands", "WrappingStyle"]))
			.pipe(gulp.dest("./lib"))
			.pipe(Transform(function (file) {
				if (path.basename(file.path) === "libjass.js") {
					runTest();
				}
			}));

		gulp.watch(["./tests/unit/*.js"], { debounceDelay: 1 }, function () {
			runTest();
		});
	});
});

gulp.task("test-lib", ["libjass.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-lib"], callback);
	});
});

gulp.task("test-minified", ["libjass.min.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-minified"], callback);
	});
});

gulp.task("test", ["test-lib", "test-minified"]);

gulp.task("demo", ["libjass.js"], function () {
	return gulp.src(["./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.css"]).pipe(gulp.dest("../libjass-gh-pages/demo/"));
});

gulp.task("doc", ["libjass.js"], function () {
	var Doc = require("./gulplib/doc.js");

	return gulp.src("./src/tsconfig.json")
		.pipe(Doc("./api.xhtml", "./src/index.ts", "libjass"))
		.pipe(gulp.dest("../libjass-gh-pages/"));
});

gulp.task("dist", ["clean", "default", "test", "demo", "doc"], function () {
	var inputFiles = [
		"./README.md", "./CHANGELOG.md", "./LICENSE",
		"./lib/libjass.js", "./lib/libjass.js.map",
		"./lib/libjass.min.js", "./lib/libjass.min.js.map",
		"./lib/libjass.css"
	];

	var files = Object.create(null);
	inputFiles.forEach(function (filename) {
		files["./dist/" + path.basename(filename)] = filename;
	});

	// Clean dist/
	Object.keys(files).concat("./dist/package.json").forEach(function (file) {
		try {
			fs.unlinkSync(file);
		}
		catch (ex) {
			if (ex.code !== "ENOENT") {
				throw ex;
			}
		}
	});

	// Create dist/ if necessary
	try {
		fs.mkdirSync("./dist");
	}
	catch (ex) {
		if (ex.code !== "EEXIST") {
			throw ex;
		}
	}

	// Copy all files except package.json
	Object.keys(files).forEach(function (outputFilename) {
		var inputFilename = files[outputFilename];
		var contents = fs.readFileSync(inputFilename);
		fs.writeFileSync(outputFilename, contents);
	});

	// Copy package.json
	var packageJson = fs.readFileSync("./package.json");
	packageJson = JSON.parse(packageJson);

	packageJson.devDependencies = undefined;
	packageJson.private = undefined;
	packageJson.scripts = undefined;
	packageJson.main = "libjass.js";

	packageJson = JSON.stringify(packageJson, null, "\t");
	fs.writeFileSync("./dist/package.json", packageJson, { encoding: "utf8" });
});
