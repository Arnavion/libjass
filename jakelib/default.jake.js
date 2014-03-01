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

		root = root.wrap_enclose(['((typeof module !== "undefined") && module.exports) || (this.libjass = {}):libjass', '((typeof global !== "undefined") && global) || this:global']);

		root.figure_out_scope({ screw_ie8: true });


		// Remove some things from the AST
		var nodesToRemove;

		nodesToRemove = [];

		// 1. All the top-level "var libjass;"
		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node instanceof UglifyJS.AST_Var && node.definitions[0].name.name === "libjass") {
				nodesToRemove.push({ node: node, parent: this.parent().body });
			}
		}));

		// 2. All but the first top-level "var __extends = ..."
		var firstVarExtendsFound = false;
		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node instanceof UglifyJS.AST_Var && node.definitions[0].name.name === "__extends") {
				if (firstVarExtendsFound === false) {
					firstVarExtendsFound = true;
					// Remove the check for this.__extends
					node.definitions[0].value = node.definitions[0].value.right;
				}
				else {
					nodesToRemove.push({ node: node, parent: this.parent().body });
				}
			}
		}));

		// Repeat because removing some declarations may make others unreferenced
		for (;;) {
			// 3. Unreferenced variable and function declarations, and unreferenced terminal function arguments
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

			root.figure_out_scope({ screw_ie8: true });
		}

		// 4. Rename all function arguments that begin with _ to not have the _.
		// This converts the TypeScript syntax of declaring private members in the constructor declaration `function Color(private _red: number, ...)` to `function Color(red, ...)`
		// so that it matches the JSDoc (and looks nicer).
		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_SymbolFunarg &&
				node.thedef.name[0] === "_" &&
				node.thedef.name !== "_super" // Don't rename _super (used in TypeScript's inheritance shim) to super. super is a reserved word.
			) {
				node.thedef.name = node.thedef.name.slice(1);
			}
		}));

		// Output
		var firstLicenseHeaderFound = false; // To detect and preserve the first license header

		var output = {
			source_map: UglifyJS.SourceMap({
				file: "libjass.js.map",
				orig: compiled.sourceMap,
				root: ""
			}),
			beautify: true,
			comments: function (node, comment) {
				// If this is a license header
				if (comment.value.indexOf("Copyright") !== -1) {
					if (!firstLicenseHeaderFound) {
						firstLicenseHeaderFound = true;
					}
					else {
						// This isn't the first license header. Strip it.
						return false;
					}
				}

				// If this is a TypeScript reference comment, strip it.
				if (comment.value.substr(0, "/<reference path=".length) === "/<reference path=") {
					return false;
				}

				/* Align multi-line comments correctly.
				 * TypeScript shifts them one space left, and UJS shifts them four spaces left,
				 * so shift each line except the first five spaces right.
				 */
				if (comment.type === "comment2") {
					var lines = comment.value.split("\n");
					lines = [lines[0]].concat(lines.slice(1).map(function (line) { return '     ' + line; }));
					comment.value = lines.join('\n');
				}

				return true;
			}
		};

		fs.readdirSync(".").filter(function (filename) { return path.extname(filename) === ".ts"; }).forEach(function (filename) {
			output.source_map.get().setSourceContent(filename, fs.readFileSync(filename, { encoding: "utf8"}));
		});

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

		root.figure_out_scope({ screw_ie8: true });


		// Suppress some warnings
		var originalWarn = UglifyJS.AST_Node.warn;
		UglifyJS.AST_Node.warn = function (text, properties) {
			if (
				(text === "Couldn't figure out mapping for {file}:{line},{col} \u2192 {cline},{ccol} [{name}]" && properties.file === "libjass.js" && properties.line === 1 && properties.col === 0 && properties.cline === 1 && properties.ccol === 1)
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
			warnings: true,
			screw_ie8: true
		});
		root = root.transform(compressor);


		// Mangle
		root.figure_out_scope({ screw_ie8: true });
		root.compute_char_frequency();
		root.mangle_names({ screw_ie8: true });


		// Mangle private members
		var occurrences = Object.create(null);

		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_PropAccess &&
				typeof node.property === "string" &&
				node.property[0] === "_" && node.property[1] !== "_"
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
			},
			screw_ie8: true
		};

		fs.readdirSync(".").filter(function (filename) { return path.extname(filename) === ".ts"; }).forEach(function (filename) {
			output.source_map.get().setSourceContent(filename, fs.readFileSync(filename, { encoding: "utf8"}));
		});

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

// Workaround for https://github.com/mishoo/UglifyJS2/issues/436
// Derived from lib/sourcemap.js in UglifyJS2 source
UglifyJS.SourceMap = function SourceMap(options) {
	options.orig_line_diff = 0;
	options.dest_line_diff = 0;

	var generator = new UglifyJS.MOZ_SourceMap.SourceMapGenerator({
		file: options.file,
		sourceRoot: options.root
	});

	var orig_map = options.orig && new UglifyJS.MOZ_SourceMap.SourceMapConsumer(options.orig);

	function add(source, gen_line, gen_col, orig_line, orig_col, name) {
		if (orig_map) {
			var info = orig_map.originalPositionFor({
				line: orig_line,
				column: orig_col
			});

			if (info.line === null && info.column === null) {
				return;
			}

			source = info.source;
			orig_line = info.line;
			orig_col = info.column;
			name = info.name;
		}

		generator.addMapping({
			generated : { line: gen_line + options.dest_line_diff, column: gen_col },
			original  : { line: orig_line + options.orig_line_diff, column: orig_col },
			source    : source,
			name      : name
		});
	};

	return {
		add: add,
		get: function() { return generator },
		toString: function() { return generator.toString() }
	};
};
