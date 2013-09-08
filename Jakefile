var fs = require("fs");
var path = require("path");
var UglifyJS = require("uglify-js");

namespace("_default", function () {
	var tscJsResolvedPath = path.resolve("./node_modules/typescript/bin/tsc.js");

	task("tscRequire", [], function () {
		console.log("[" + this.fullName + "]");

		var vm = require("vm");

		var data = fs.readFileSync(tscJsResolvedPath, { encoding: "utf8" });

		data =
			data.substr(0, data.lastIndexOf("})(TypeScript || (TypeScript = {}));") + "})(TypeScript || (TypeScript = {}));".length) +
			"module.exports = TypeScript;";

		var TypeScript = {};
		vm.runInNewContext(data, {
			module: Object.defineProperty(Object.create(null), "exports", {
				get: function () { return TypeScript; },
				set: function (value) { TypeScript = value; }
			}),
			require: require,
			process: process,
			__filename: tscJsResolvedPath,
			__dirname:  path.dirname(tscJsResolvedPath)
		});

		return TypeScript;
	});

	task("tscCreate", ["_default:tscRequire"], function () {
		console.log("[" + this.fullName + "]");

		var TypeScript = jake.Task["_default:tscRequire"].value;

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
				return tscJsResolvedPath;
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
				file = path.relative(".", file);

				output[file] = contents;
			}
		});

		var output;

		compiler.compilationSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
		compiler.compilationSettings.mapSourceFiles = true;
		compiler.compilationSettings.noImplicitAny = true;

		return function (inputFilenames, outputFilename) {
			output = Object.create(null);

			compiler.inputFiles = inputFilenames;
			compiler.compilationSettings.outFileOption = outputFilename;
			compiler.batchCompile();

			return output;
		};
	});

	task("tscCompile", ["_default:tscCreate"], function () {
		console.log("[" + this.fullName + "]");

		var compile = jake.Task["_default:tscCreate"].value;

		var output = compile(["libjass.ts"], "libjass.js");

		return { code: output["libjass.js"], sourceMap: JSON.parse(output["libjass.js.map"]) };
	});

	task("pegjs", [], function () {
		console.log("[" + this.fullName + "]");

		var PEG = require("pegjs");

		var data = fs.readFileSync("ass.pegjs", { encoding: "utf8" });

		var parser = PEG.buildParser(data);

		return "libjass.parser = " + parser.toSource();
	});

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

		fs.writeFileSync("libjass.js", combined.code);
	});

	task("writeSourceMap", ["_default:combine"], function () {
		console.log("[" + this.fullName + "]");

		var combined = jake.Task["_default:combine"].value;

		fs.writeFileSync("libjass.js.map", JSON.stringify(combined.sourceMap));
	});

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

		fs.writeFileSync("libjass.min.js", minified.code);
	});

	task("writeMinifiedSourceMap", ["_default:minify"], function () {
		console.log("[" + this.fullName + "]");

		var minified = jake.Task["_default:minify"].value;

		fs.writeFileSync("libjass.min.js.map", minified.map);
	});
});

desc("Build libjass.js, libjass.min.js and their sourcemaps");
task("default", ["_default:writeCode", "_default:writeSourceMap", "_default:writeMinifiedCode", "_default:writeMinifiedSourceMap"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Clean");
task("clean", [], function () {
	console.log("[" + this.fullName + "]");

	["libjass.js", "libjass.js.map", "libjass.min.js", "libjass.min.js.map"].forEach(fs.unlinkSync.bind(fs));
});
