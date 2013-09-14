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

		var compilerOutput;

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

				compilerOutput[file] = contents;
			}
		});

		compiler.compilationSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
		compiler.compilationSettings.mapSourceFiles = true;
		compiler.compilationSettings.noImplicitAny = true;

		return function (inputFilenames, outputFilename) {
			console.log("Compiling " + JSON.stringify(inputFilenames) + " to " + outputFilename + "...");

			compiler.fileNameToSourceFile = new TypeScript.StringHashTable();

			compilerOutput = Object.create(null);

			compiler.inputFiles = inputFilenames;
			compiler.compilationSettings.outFileOption = outputFilename;

			try {
				compiler.batchCompile();
				console.log("Compile succeeded.");
			}
			catch (ex) {
				if (ex instanceof Error) {
					throw ex;
				}
				else {
					throw new Error("Internal compiler error: " + ex.stack + "\n");
				}
			}

			return compilerOutput;
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

		UglifyJS.base54.reset();


		// Parse
		var root = null;
		root = UglifyJS.parse(compiled.code, {
			filename: "libjass.js",
			toplevel: root
		});
		root = UglifyJS.parse(parserSource, {
			filename: "ass.pegjs.js",
			toplevel: root
		});

		root.figure_out_scope();


		// Remove some things from the AST
		var nodesToRemove;

		nodesToRemove = [];

		// 1. All but the first top-level "var libjass;"
		var firstVarLibjassFound = false;
		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node instanceof UglifyJS.AST_Var && node.definitions[0].name.name === "libjass") {
				if (firstVarLibjassFound === false) {
					firstVarLibjassFound = true;
				}
				else {
					nodesToRemove.push({ node: node, parent: root.body });
				}
			}
		}));

		// Repeat because removing some declarations may make others unreferenced
		for (;;) {
			// 2. Unreferenced variable and function declarations, and unreferenced terminal function arguments
			root.walk(new UglifyJS.TreeWalker(function (node, descend) {
				if (node instanceof UglifyJS.AST_SymbolDeclaration && node.unreferenced()) {
					if (node instanceof UglifyJS.AST_SymbolFunarg) {
						if (this.parent().argnames.indexOf(node) === this.parent().argnames.length - 1) {
							nodesToRemove.push({ node: node, parent: this.parent().argnames });
						}
					}
					else if (node instanceof UglifyJS.AST_SymbolVar) {
						nodesToRemove.push({ node: this.parent(), parent: this.parent(1).definitions });
						if (this.parent(1).definitions.length === 1) {
							nodesToRemove.push({ node: this.parent(1), parent: this.parent(2).body });
						}
					}
					else if (node instanceof UglifyJS.AST_SymbolDefun) {
						nodesToRemove.push({ node: this.parent(), parent: this.parent(1).body });
					}
				}
			}));

			if (nodesToRemove.length === 0) {
				break;
			}

			nodesToRemove.forEach(function (node) {
				node.parent.splice(node.parent.indexOf(node.node), 1);
			});

			nodesToRemove = [];

			root.figure_out_scope();
		}


		// Output
		var firstLicenseHeaderFound = false; // To detect and preserve the first license header

		var output = {
			source_map: UglifyJS.SourceMap({
				file: "libjass.js.map",
				orig: compiled.sourceMap,
				root: ""
			}),
			beautify: true,
			comments: {
				test: function (comment) {
					if (comment.indexOf("Copyright") !== -1) {
						if (!firstLicenseHeaderFound) {
							firstLicenseHeaderFound = true;
							return true;
						}
						else {
							return false;
						}
					}

					return true;
				}
			}
		};

		var stream = UglifyJS.OutputStream(output);
		root.print(stream);

		return {
			code: stream.toString() + "\n//# sourceMappingURL=libjass.js.map",
			sourceMap: JSON.parse(output.source_map.toString())
		};
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

		UglifyJS.base54.reset();


		// Parse
		var root = null;
		root = UglifyJS.parse(combined.code, {
			filename: "libjass.js",
			toplevel: root
		});

		root.figure_out_scope();


		// Suppress some warnings
		var originalWarn = UglifyJS.AST_Node.warn;
		UglifyJS.AST_Node.warn = function (text, properties) {
			if (
				(text === "{type} {name} is declared but not referenced [{file}:{line},{col}]" && properties.type === "Symbol" && properties.name === "offset" && properties.col === 39) ||
				(text === "Eval is used [{file}:{line},{col}]" && properties.file === "libjass.js" && properties.line === 23)
			) {
				return;
			}

			originalWarn.call(UglifyJS.AST_Node, text, properties);
		};

		// Warnings
		root.scope_warnings({
			func_arguments: false
		});


		// Compress
		var compressor = UglifyJS.Compressor({
			warnings: true
		});
		root = root.transform(compressor);


		// Mangle
		root.figure_out_scope();
		root.compute_char_frequency();
		root.mangle_names();


		// Mangle private members
		var occurrences = Object.create(null);

		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_PropAccess &&
				typeof node.property === "string" &&
				node.property.indexOf("_") === 0 &&
				node.property !== "__iterator__"
			) {
				var occurrence = occurrences[node.property];
				if (occurrence === undefined) {
					occurrences[node.property] = 1;
				}
				else {
					occurrences[node.property]++;
				}
			}
		}));

		var identifiers = Object.keys(occurrences);
		identifiers.sort(function (first, second) { return occurrences[second] - occurrences[first]; });

		var generatedIdentifiers = occurrences;

		var validIdentifierCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789";
		var toIdentifier = function (index) {
			var result = validIdentifierCharacters[(index % validIdentifierCharacters.length)];
			index = (index / validIdentifierCharacters.length) | 0;

			while (index > 0) {
				index--;
				result = validIdentifierCharacters[index % validIdentifierCharacters.length] + result;
				index = (index / validIdentifierCharacters.length) | 0;
			}

			return "_" + result;
		};

		identifiers.forEach(function (identifier, index) {
			generatedIdentifiers[identifier] = toIdentifier(index);
		});

		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_PropAccess &&
				typeof node.property === "string" &&
				node.property in generatedIdentifiers
			) {
				node.property = generatedIdentifiers[node.property];
			}
		}));


		// Output
		var firstLicenseHeaderFound = false; // To detect and preserve the first license header

		var output = {
			source_map: UglifyJS.SourceMap({
				file: "libjass.min.js.map",
				orig: combined.sourceMap,
				root: ""
			}),
			comments: {
				test: function (comment) {
					if (!firstLicenseHeaderFound && comment.indexOf("Copyright") !== -1) {
						firstLicenseHeaderFound = true;
						return true;
					}

					return false;
				}
			}
		};

		var stream = UglifyJS.OutputStream(output);
		root.print(stream);

		return {
			code: stream.toString() + "\n//# sourceMappingURL=libjass.min.js.map",
			sourceMap: JSON.parse(output.source_map.toString())
		};
	});

	task("writeMinifiedCode", ["_default:minify"], function () {
		console.log("[" + this.fullName + "]");

		var minified = jake.Task["_default:minify"].value;

		fs.writeFileSync("libjass.min.js", minified.code);
	});

	task("writeMinifiedSourceMap", ["_default:minify"], function () {
		console.log("[" + this.fullName + "]");

		var minified = jake.Task["_default:minify"].value;

		fs.writeFileSync("libjass.min.js.map", JSON.stringify(minified.sourceMap));
	});
});

desc("Build libjass.js, libjass.min.js and their sourcemaps");
task("default", ["_default:writeCode", "_default:writeSourceMap", "_default:writeMinifiedCode", "_default:writeMinifiedSourceMap"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Clean");
task("clean", [], function () {
	console.log("[" + this.fullName + "]");

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

desc("Test");
task("test", [], function () {
	var Mocha = require("mocha");

	var mocha = new Mocha({
		ui: "tdd"
	});
	fs.readdirSync("./tests/").filter(function (filename) {
		if (filename.indexOf("test-") === 0) {
			var extensionIndex = filename.lastIndexOf(".js");
			if (extensionIndex !== -1 && extensionIndex === filename.length - ".js".length) {
				return true;
			}
		}

		return false;
	}).forEach(function (filename) {
		mocha.addFile("./tests/" + filename);
	});

	mocha.run();
	// .\node_modules\.bin\mocha -u tdd tests/test*.js
});
