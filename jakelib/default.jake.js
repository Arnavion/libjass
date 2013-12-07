var fs = require("fs");
var path = require("path");
var UglifyJS = require("uglify-js");

namespace("_default", function () {
	task("typeScript", ["_typescript:getCompilerFactory"], function () {
		console.log("[" + this.fullName + "]");

		var Compiler = jake.Task["_typescript:getCompilerFactory"].value;

		var compiler = new Compiler();

		return compiler.compile(["libjass.ts"]);
	});

	task("fixup", ["_default:typeScript"], function () {
		console.log("[" + this.fullName + "]");

		var compiled = jake.Task["_default:typeScript"].value;

		UglifyJS.base54.reset();


		// Parse
		var root = UglifyJS.parse(compiled.code, {
			filename: "libjass.js",
			toplevel: null
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
			sourceMap: output.source_map.toString()
		};
	});

	task("writeCode", ["_default:fixup"], function () {
		console.log("[" + this.fullName + "]");

		var fixedUp = jake.Task["_default:fixup"].value;

		fs.writeFileSync("libjass.js", fixedUp.code);
	});

	task("writeSourceMap", ["_default:fixup"], function () {
		console.log("[" + this.fullName + "]");

		var fixedUp = jake.Task["_default:fixup"].value;

		fs.writeFileSync("libjass.js.map", fixedUp.sourceMap);
	});

	task("minify", ["_default:fixup"], function () {
		console.log("[" + this.fullName + "]");

		var fixedUp = jake.Task["_default:fixup"].value;

		UglifyJS.base54.reset();


		// Parse
		var root = null;
		root = UglifyJS.parse(fixedUp.code, {
			filename: "libjass.js",
			toplevel: root
		});

		root.figure_out_scope();


		// Suppress some warnings
		var originalWarn = UglifyJS.AST_Node.warn;
		UglifyJS.AST_Node.warn = function (text, properties) {
			if (
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
				node.property.indexOf("_") === 0
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
				orig: fixedUp.sourceMap,
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
			sourceMap: output.source_map.toString()
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

		fs.writeFileSync("libjass.min.js.map", minified.sourceMap);
	});
});
