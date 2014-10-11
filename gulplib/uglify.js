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

var Transform = require("./helpers.js").Transform;

module.exports = {
	fixup: function () {
		var codeFile = null;
		var sourceMapFile = null;

		return Transform(function (file) {
			switch (path.extname(file.path)) {
				case ".js":
					codeFile = file;
					break;
				case ".map":
					sourceMapFile = file;
					break;
			}

			if (codeFile !== null && sourceMapFile !== null) {
				UglifyJS.base54.reset();


				// Parse
				var root = UglifyJS.parse(codeFile.contents.toString(), {
					filename: path.basename(codeFile.path),
					toplevel: null
				});

				root = root.wrap_enclose(['(typeof module !== "undefined") ? module.exports : (this.libjass = {}):libjass', '(typeof global !== "undefined") ? global : this:global']);

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

					nodesToRemove.forEach(function (tuple) {
						tuple.parent.splice(tuple.parent.indexOf(tuple.node), 1);
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

				// 5. Fixup anonymous functions to print a space after "function"
				root.walk(new UglifyJS.TreeWalker(function (node, descend) {
					if (node instanceof UglifyJS.AST_Lambda && !node.name) {
						node.name = Object.create(UglifyJS.AST_Node.prototype);
						node.name.print = function () { };
					}
				}));

				// Output
				var firstLicenseHeaderFound = false; // To detect and preserve the first license header

				var output = {
					source_map: UglifyJS.SourceMap({
						file: path.basename(sourceMapFile.path),
						orig: sourceMapFile.contents.toString()
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

						// UJS shifts multi-line comments four spaces left, so shift each line except the first one four spaces right.
						if (comment.type === "comment2") {
							var lines = comment.value.split("\n");
							lines = [lines[0]].concat(lines.slice(1).map(function (line) { return '    ' + line; }));
							comment.value = lines.join('\n');
						}

						return true;
					}
				};

				var stream = UglifyJS.OutputStream(output);
				root.print(stream);

				codeFile.contents = Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL="), new Buffer(sourceMapFile.relative)]);
				this.push(codeFile);

				output.source_map.get()._sources.toArray().forEach(function (filename) {
					output.source_map.get().setSourceContent(filename, fs.readFileSync(filename, { encoding: "utf8"}));
				});

				sourceMapFile.contents = new Buffer(output.source_map.toString());
				this.push(sourceMapFile);

				codeFile = null;
				sourceMapFile = null;
			}
		});
	},

	minify: function () {
		var codeFile = null;
		var sourceMapFile = null;

		return Transform(function (file) {
			switch (path.extname(file.path)) {
				case ".js":
					codeFile = file;
					break;
				case ".map":
					sourceMapFile = file;
					break;
			}

			if (codeFile !== null && sourceMapFile !== null) {
				UglifyJS.base54.reset();


				// Parse
				var root = null;
				root = UglifyJS.parse(codeFile.contents.toString(), {
					filename: path.basename(codeFile.path),
					toplevel: root
				});

				root.figure_out_scope({ screw_ie8: true });


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
						node.property[0] === "_" &&
						node.property[1] !== "_" && // Doesn't start with two leading underscores
						node.property !== "_classTag" // webworker serializer uses this property by name, so it shouldn't be changed.
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
						file: path.basename(sourceMapFile.path),
						orig: sourceMapFile.contents.toString()
					}),
					comments: function (node, comment) {
						if (!firstLicenseHeaderFound && comment.value.indexOf("Copyright") !== -1) {
							firstLicenseHeaderFound = true;

							// Align the license header correctly.
							var lines = comment.value.split("\n");
							lines = [lines[0]].concat(lines.slice(1).map(function (line) { return line.replace(/^ +/g, " "); }));
							comment.value = lines.join('\n');

							return true;
						}

						return false;
					},
					screw_ie8: true
				};

				var stream = UglifyJS.OutputStream(output);
				root.print(stream);

				codeFile.path = codeFile.path.replace(/\.js$/, ".min.js");
				sourceMapFile.path = sourceMapFile.path.replace(/\.js\.map$/, ".min.js.map");

				codeFile.contents = Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL="), new Buffer(sourceMapFile.relative)]);
				this.push(codeFile);

				output.source_map.get()._sources.toArray().forEach(function (filename) {
					output.source_map.get().setSourceContent(filename, fs.readFileSync(filename, { encoding: "utf8"}));
				});

				sourceMapFile.contents = new Buffer(output.source_map.toString());
				this.push(sourceMapFile);

				codeFile = null;
				sourceMapFile = null;
			}
		});
	}
};

var originalSymbolUnreferenced = UglifyJS.AST_Symbol.prototype.unreferenced;

UglifyJS.AST_Symbol.prototype.unreferenced = function () {
	if (this.start.comments_before.length > 0 && this.start.comments_before[0].value.trim() === "ujs:unreferenced") {
		return false;
	}

	if (this instanceof UglifyJS.AST_SymbolCatch) {
		return false;
	}

	return originalSymbolUnreferenced.call(this);
};
