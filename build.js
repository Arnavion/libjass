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
var stream = require("stream");

var async = require("async");

var task = require("async-build");

(function () {
	var _TypeScript = null;
	var _UglifyJS = null;
	var _npm = null;

	Object.defineProperties(global, {
		TypeScript: { get: function () { return _TypeScript || (_TypeScript = require("./build/typescript/index.js")); } },
		UglifyJS: { get: function () { return _UglifyJS || (_UglifyJS = require("./build/uglify.js")); } },
		npm: { get: function () { return _npm || (_npm = require("npm")); } },
	});
})();

task("build-tools", function (callback) {
	async.every(["./build/typescript/typescript.d.ts", "./build/typescript/index.js", "./build/doc.js"], fs.exists.bind(fs), function (allExist) {
		if (allExist) {
			callback();
			return;
		}

		var typescriptPath = path.join(require.resolve("typescript"), "..", "..");

		async.waterfall([
			async.parallel.bind(async, [
				fs.readFile.bind(fs, path.join(typescriptPath, "lib", "typescript.d.ts"), "utf8"),
				fs.readFile.bind(fs, "./build/typescript/extras.d.ts", "utf8")
			]),
			function (results, callback) {
				var newDts = results[0] + "\n\n" + results[1];
				fs.writeFile("./build/typescript/typescript.d.ts", newDts, "utf8", callback);
			},
			function (callback) {
				npm.load(function () {
					npm.commands["run-script"](["build"], callback);
				});
			}
		], callback);
	});
});

task("default", ["libjass.js", "libjass.min.js"]);

task("version.ts", function (callback) {
	fs.exists("./src/version.ts", function (exists) {
		if (exists) {
			callback();
			return;
		}

		async.waterfall([
			fs.readFile.bind(fs, "./package.json"),
			function (buffer, callback) {
				try {
					var packageJson = JSON.parse(buffer);
					var versionString = packageJson.version;
					var versionParts = versionString.split(".").map(function (num) { return parseInt(num); });
					var versionFileContents =
						"/* tslint:disable */\n" +
						"\n" +
						"/**\n" +
						" * The version of libjass. An array like\n" +
						" *\n" +
						" *     [\"0.12.0\", 0, 12, 0]\n" +
						" *\n" +
						" * @type {!Array.<string|number>}\n" +
						" */\n" +
						"export const version = " + JSON.stringify([versionString].concat(versionParts)) + ";\n";
					callback(null, versionFileContents);
				}
				catch (ex) {
					callback(ex);
				}
			},
			function (contents, callback) {
				fs.writeFile("./src/version.ts", contents, "utf8", callback);
			}
		], callback);
	});
});

task("libjass.js", ["build-tools", "version.ts"], function (callback) {
	fs.exists("./lib/libjass.js", function (exists) {
		if (exists) {
			callback();
			return;
		}

		callback(null, task.src("./src/tsconfig.json")
			.pipe(TypeScript.build("./src/index.ts", "libjass"))
			.pipe(UglifyJS.build("libjass", ["AttachmentType", "BorderStyle", "ClockEvent", "Format", "WorkerCommands", "WrappingStyle"]))
			.pipe(task.dest("./lib")));
	});
});

task("libjass.min.js", ["libjass.js"], function (callback) {
	fs.exists("./lib/libjass.min.js", function (exists) {
		if (exists) {
			callback();
			return;
		}

		callback(null, task.src(["./lib/libjass.js", "./lib/libjass.js.map"], { relativeTo: "./lib" })
			.pipe(UglifyJS.minify())
			.pipe(task.dest("./lib")));
	});
});

task("clean", task.clean(["./src/version.ts", "./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.min.js", "./lib/libjass.min.js.map"]));

task("watch", ["build-tools", "version.ts"], function (callback) {
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

		task.src("./src/tsconfig.json")
			.pipe(TypeScript.watch("./src/index.ts", "libjass"))
			.pipe(UglifyJS.watch("libjass", ["BorderStyle", "ClockEvent", "Format", "WorkerCommands", "WrappingStyle"]))
			.pipe(task.dest("./lib"))
			.pipe(new task.FileTransform(function (file) {
				if (file.path === "libjass.js") {
					runTest();
				}
			}));

		task.watch("./tests/unit/", runTest);
	});
});

task("test-lib", ["libjass.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-lib"], callback);
	});
});

task("test-minified", ["libjass.min.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-minified"], callback);
	});
});

// Start Selenium server with
//    java.exe -jar .\selenium-server-standalone-2.48.2.jar -Dwebdriver.ie.driver=IEDriverServer.exe -Dwebdriver.chrome.driver=chromedriver.exe
task("test-browser", ["libjass.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-browser"], callback);
	});
});

task("test", ["test-lib", "test-minified"]);

task("demo", ["libjass.js"], function () {
	return task.src(["./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.css"], { relativeTo: "./lib" }).pipe(task.dest("../libjass-gh-pages/demo/"));
});

task("doc", ["make-doc", "test-doc"]);

task("make-doc", ["build-tools", "version.ts"], function () {
	var Doc = require("./build/doc.js");

	return task.src("./src/tsconfig.json")
		.pipe(Doc.build("./api.xhtml", "./src/index.ts", "libjass"))
		.pipe(task.dest("../libjass-gh-pages/"));
});

task("test-doc", ["make-doc", "libjass.js"], function (callback) {
	npm.load(function () {
		npm.commands["run-script"](["test-doc"], callback);
	});
});

task("dist", ["libjass.js", "libjass.min.js", "test", "test-browser", "demo", "doc"], function (callback) {
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

	async.series([
		// Clean dist/
		task.clean(Object.keys(files).concat(["./dist/package.json"])),

		// Create dist/ if necessary
		function (callback) {
			fs.mkdir("./dist", function (err) {
				if (err && err.code !== "EEXIST") {
					callback(err);
					return;
				}

				callback();
			});
		},

		// Copy all files except package.json
		async.forEachOf.bind(async, files, function (inputFilename, outputFilename, callback) {
			async.waterfall([fs.readFile.bind(fs, inputFilename), fs.writeFile.bind(fs, outputFilename)], callback);
		}),

		// Copy package.json
		async.waterfall.bind(async, [
			fs.readFile.bind(fs, "./package.json"),
			function (data, callback) {
				try {
					var packageJson = JSON.parse(data);
					packageJson.devDependencies = undefined;
					packageJson.private = undefined;
					packageJson.scripts = undefined;
					packageJson.main = "libjass.js";
				}
				catch (ex) {
					callback(ex);
					return;
				}

				callback(null, new Buffer(JSON.stringify(packageJson, null, "\t")));
			},
			fs.writeFile.bind(fs, "./dist/package.json")
		])
	], callback);
});

task.runArgv(function (err) {
	if (err) {
		process.exit(1);
	}
});
