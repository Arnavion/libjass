var fs = require("fs");
var path = require("path");
var UglifyJS = require("uglify-js");

namespace("_default", function () {
	task("tscCreate", [], function () {
		console.log("[" + this.fullName + "]");

		fs.readFile("./node_modules/typescript/bin/tsc.js", { encoding: "utf8" }, function (error, data) {
			if (error) {
				throw error;
			}

			data =
				data.substr(0, data.lastIndexOf("})(TypeScript || (TypeScript = {}));") + "})(TypeScript || (TypeScript = {}));".length) +
				"module.exports = TypeScript;";

			var m = new module.constructor();
			m._compile(data, "./node_modules/typescript/bin/tsc.js");

			var TypeScript = m.exports;

			var compiler = new TypeScript.BatchCompiler({
				arguments: [],
				directoryExists: function (path) {
					return fs.existsSync(path) && fs.statSync(path).isDirectory();
				},
				dirName: function (file) {
					var result = path.dirname(file);
					if (result === file) {
						result = null;
					}
					return result;
				},
				fileExists: fs.existsSync.bind(fs),
				getExecutingFilePath: function () {
					return "./node_modules/typescript/bin/tsc.js";
				},
				quit: function (code) {
					if (code !== 0) {
						throw new Error("TypeScript compiler exited with code " + code);
					}
				},
				readFile: function (file, codepage) {
					return {
						contents: fs.readFileSync(file, { encoding: "utf8" }),
						byteOrderMark: 0
					};
				},
				resolvePath: path.resolve.bind(path),
				stdout: {
					Write: process.stdout.write.bind(process.stderr),
					WriteLine: console.log.bind(console)
				},
				stderr: {
					Write: process.stderr.write.bind(process.stderr),
					WriteLine: console.error.bind(console)
				},
				writeFile: function (file, contents, writeByteOrderMark) {
					file = path.basename(file);

					if (file === "libjass.js") {
						output.code = contents;
					}
					else if (file === "libjass.js.map") {
						output.sourceMap = JSON.parse(contents);
					}
					else {
						throw new Error("Unrecognized output file: " + file);
					}
				}
			});

			var output = {
				code: null,
				sourceMap: null
			};

			compiler.compilationSettings.codeGenTarget = 1; // ES5
			compiler.compilationSettings.noImplicitAny = true;

			compiler.inputFiles = ["libjass.ts"];
			compiler.compilationSettings.outFileOption = "libjass.js";
			compiler.compilationSettings.mapSourceFiles = true;

			complete(function () {
				output.code = output.sourceMap = null;
				compiler.batchCompile();
				return output;
			});
		});
	}, { async: true });

	task("tscCompile", ["_default:tscCreate"], function () {
		console.log("[" + this.fullName + "]");

		var compile = jake.Task["_default:tscCreate"].value;

		var output = compile();

		complete(output);
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

		var output = UglifyJS.minify([compiled.code, parserSource], {
			fromString: true,
			compress: false,
			mangle: false,
			inSourceMap: compiled.sourceMap,
			outSourceMap: "libjass.js.map",
			output: {
				beautify: true,
				comments: true
			}
		});

		return { code: output.code + "\n//# sourceMappingURL=libjass.js.map", sourceMap: JSON.parse(output.map) };
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
			warnings: true,
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
task("clean", [], function () {
	console.log("[" + this.fullName + "]");

	["libjass.js", "libjass.js.map", "libjass.min.js", "libjass.min.js.map"].forEach(jake.rmRf.bind(jake));
}, { async: true });

task("watch", ["_default:tscCreate"], function () {
	console.log("[" + this.fullName + "]");

	complete();
}, { async: true });
