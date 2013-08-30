var fs = require("fs");
var path = require("path");
var UglifyJS = require("uglify-js");

namespace("_default", function () {
	task("tscCompile", [], function () {
		console.log("[" + this.fullName + "]");

		jake.exec(["tsc libjass.ts --out libjass.js --sourcemap --noImplicitAny --target ES5"], { printStdout: true, printStderr: true }, function () {
			fs.readFile("libjass.js", { encoding: "utf8" }, function (error, data) {
				if (error) {
					throw error;
				}

				var code = data;

				fs.readFile("libjass.js.map", { encoding: "utf8" }, function (error, data) {
					if (error) {
						throw error;
					}

					complete({ code: code, sourceMap: JSON.parse(data) });
				});
			});
		});
	}, { async: true });

	task("pegjs", [], function () {
		console.log("[" + this.fullName + "]");

		fs.readFile("ass.pegjs", { encoding: "utf8" }, function (error, data) {
			if (error) {
				throw error;
			}

			var PEG = require("pegjs");

			var parser = PEG.buildParser(data);

			complete("libjass.parser = " + parser.toSource());
		});
	}, { async: true });

	task("combine", ["_default:tscCompile", "_default:pegjs"], function () {
		console.log("[" + this.fullName + "]");

		var compiled = jake.Task["_default:tscCompile"].value;
		var parserSource = jake.Task["_default:pegjs"].value;

		return { code: compiled.code + "\n" + parserSource + "\n//# sourceMappingURL=libjass.js.map", sourceMap: compiled.sourceMap };
	});

	task("writeCode", ["_default:combine"], function () {
		console.log("[" + this.fullName + "]");

		var combined = jake.Task["_default:combine"].value;

		fs.writeFile("libjass.js", combined.code, function (error) {
			if (error) {
				throw error;
			}

			complete();
		});
	}, { async: true });

	task("writeSourceMap", ["_default:combine"], function () {
		console.log("[" + this.fullName + "]");

		var combined = jake.Task["_default:combine"].value;

		fs.writeFile("libjass.js.map", JSON.stringify(combined.sourceMap), function (error) {
			if (error) {
				throw error;
			}

			complete();
		});
	}, { async: true });

	task("minify", ["_default:combine"], function () {
		console.log("[" + this.fullName + "]");

		var combined = jake.Task["_default:combine"].value;

		var firstCommentFound = false; // To detect and preserve the first license header

		var minified = UglifyJS.minify([combined.code], {
			fromString: true,
			inSourceMap: combined.sourceMap,
			outSourceMap: "libjass.min.js.map",
			sourceRoot: null,
			output: {
				comments: function (node, comment) {
					if (!firstCommentFound) {
						firstCommentFound = !firstCommentFound;
						return true;
					}

					return false;
				}
			}
		});

		minified.code += "\n//# sourceMappingURL=libjass.min.js.map";

		return minified;
	});

	task("writeMinifiedCode", ["_default:minify"], function () {
		console.log("[" + this.fullName + "]");

		var minified = jake.Task["_default:minify"].value;

		fs.writeFile("libjass.min.js", minified.code, function (error) {
			if (error) {
				throw error;
			}

			complete();
		});
	}, { async: true });

	task("writeMinifiedSourceMap", ["_default:minify"], function () {
		console.log("[" + this.fullName + "]");

		var minified = jake.Task["_default:minify"].value;

		fs.writeFile("libjass.min.js.map", minified.map, function (error) {
			if (error) {
				throw error;
			}

			complete();
		});
	}, { async: true });
});

desc("Build libjass.js, libjass.min.js and their sourcemaps");
task("default", ["_default:writeCode", "_default:writeSourceMap", "_default:writeMinifiedCode", "_default:writeMinifiedSourceMap"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Clean");
task("clean", function () {
	console.log("[" + this.fullName + "]");

	["libjass.js", "libjass.js.map", "libjass.min.js", "libjass.min.js.map"].forEach(jake.rmRf.bind(jake));
}, { async: true });

task("watch", function () {
	console.log("[" + this.fullName + "]");

	complete();
}, { async: true });
