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

var SourceMap = require("uglify-js/node_modules/source-map");
var UglifyJS = require("uglify-js");
var Vinyl = require("vinyl");

var makeTransform = require("./helpers.js").makeTransform;

var Run = (function () {
	function Run(entry, outputLibraryName, unusedVarsToIgnore) {
		this._entry = path.resolve(entry).replace(/\\/g, "/");
		this._outputLibraryName = outputLibraryName;
		this._unusedVarsToIgnore = unusedVarsToIgnore;

		this._root = UglifyJS.parse(
			'(function (root, factory) {\n' +
			'	var global = this;\n' +
			'	if (typeof exports === "object" && typeof module === "object") {\n' +
			'		module.exports = factory(global);\n' +
			'	}\n' +
			'	else if (typeof define === "function" && define.amd) {\n' +
			'		define(function() {\n' +
			'			return factory(global);\n' +
			'		});\n' +
			'	}\n' +
			'	else if (typeof exports === "object") {\n' +
			'		exports["libjass"] = factory(global);\n' +
			'	}\n' +
			'	else {\n' +
			'		root["libjass"] = factory(global);\n' +
			'	}\n' +
			'})(this, function (global) {\n' +
			'	"use strict";\n' +
			'	return (function (modules) {\n' +
			'		var installedModules = Object.create(null);\n' +
			'		function require(moduleId) {\n' +
			'			if (installedModules[moduleId]) {\n' +
			'				return installedModules[moduleId].exports;\n' +
			'			}\n' +
			'\n' +
			'			var module = installedModules[moduleId] = {\n' +
			'				exports: Object.create(null),\n' +
			'				id: moduleId,\n' +
			'				loaded: false,\n' +
			'			};\n' +
			'\n' +
			'			modules[moduleId](module.exports, require);\n' +
			'			module.loaded = true;\n' +
			'			return module.exports;\n' +
			'		}\n' +
			'\n' +
			'		return require(0);\n' +
			'	})([\n' +
			'	]);\n' +
			'});', {
			filename: this._outputLibraryName + ".js"
		});

		this._root.figure_out_scope({ screw_ie8: true });

		this._licenseHeader = null;

		this._outputModulesArray = this._root.body[0].body.args[1].body[1].value.args[0].elements;

		this._modules = Object.create(null);

		this._rootSourceMap = new UjsSourceMap(this._outputLibraryName + ".js", "");
	}

	Run.prototype.addFile = function (file) {
		var _this = this;

		var moduleName = (path.extname(file.path) === ".map") ? file.path.substr(0, file.path.length - ".js.map".length) : file.path.substr(0, file.path.length - ".js".length);
		if (!(moduleName in this._modules)) {
			this._modules[moduleName] = { id: null, root: null };
		}

		var module = this._modules[moduleName];

		var filenameForSourceMap = path.relative(path.join(this._entry, ".."), moduleName + ".ts").replace(/\\/g, "/");

		switch (path.extname(file.path)) {
			case ".js":
				module.root = UglifyJS.parse(file.contents.toString(), {
					filename: filenameForSourceMap,
					toplevel: null,
				});

				if (this._licenseHeader === null) {
					module.root.walk(new UglifyJS.TreeWalker(function (node, descend) {
						if (_this._licenseHeader !== null) {
							return;
						}

						if (node.start) {
							(node.start.comments_before || []).some(function (comment, i) {
								if (comment.value.indexOf("Copyright") !== -1) {
									_this._licenseHeader = comment;
									_this._licenseHeader.value = _this._licenseHeader.value.split("\n").map(function (line) { return line.replace(/^\t/, ""); }).join("\n");
									node.start.comments_before.splice(i, 1);
									return true;
								}
								return false;
							});
						}
					}));
					this._root.start.comments_before = [this._licenseHeader];
					this._root.start.nlb = true;
				}
				break;
			case ".map":
				this._rootSourceMap.addInput(filenameForSourceMap, fs.readFileSync(moduleName + ".ts", { encoding: "utf8" }), file.contents);
				module.codeBuffer = undefined;
				break;
		}
	};

	Run.prototype.build = function (outputStream) {
		var _this = this;

		// Assign IDs to all modules
		var moduleNames = Object.keys(this._modules);
		moduleNames.sort(function (name1, name2) { return (name1 === name2) ? 0 : (name1 < name2 ? -1 : 1); });

		this._modules[this._entry].id = 0;

		var id = 1;
		moduleNames.forEach(function (moduleName) {
			if (moduleName !== _this._entry) {
				_this._modules[moduleName].id = id++;
			}
		});


		// Merge modules
		moduleNames.forEach(function (moduleName) {
			var module = _this._modules[moduleName];

			module.root.body.forEach(function (statement) {
				if (
					statement instanceof UglifyJS.AST_Var &&
					statement.definitions.length === 1 &&
					statement.definitions[0].value instanceof UglifyJS.AST_Call &&
					statement.definitions[0].value.expression.name === "require"
				) {
					var importRelativePath = statement.definitions[0].value.args[0].value;
					var importAbsolutePath = path.join(moduleName, "..", importRelativePath).replace(/\\/g, "/");
					var stringArg = statement.definitions[0].value.args[0];
					statement.definitions[0].value.args[0] = new UglifyJS.AST_Number({ start: stringArg.start, end: stringArg.end, value: _this._modules[importAbsolutePath].id });
				}
			});

			var wrapper = UglifyJS.parse('/* ' + module.id + ' ./' + path.relative(path.join(_this._entry, ".."), moduleName).replace(/\\/g, "/") + ' */ function x(exports, require) { }');
			var func = wrapper.body[0];
			func.body = module.root.body;
			func.name = null;
			_this._outputModulesArray.push(func);
		});

		this._root.figure_out_scope({ screw_ie8: true });


		// Set if there are any unused variables apart from the ones in unusedVarsToIgnore
		var haveUnusedVars = false;

		// Remove some things from the AST
		var nodesToRemove;

		nodesToRemove = [];


		// Fixup anonymous functions to print a space after "function"
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node instanceof UglifyJS.AST_Lambda && !node.name) {
				node.name = Object.create(UglifyJS.AST_Node.prototype);
				node.name.print = function () { };
			}
		}));


		// Fix alignment of multi-line block comments
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node.start && node.start.comments_before) {
				node.start.comments_before.forEach(function (comment) {
					if (comment === _this._licenseHeader) {
						return;
					}

					var lines = comment.value.split("\n");
					if (lines.length < 2) {
						return;
					}

					var indent = "         "; // 9 spaces
					for (var i = 0; i < comment.col; i++) {
						indent += " ";
					}
					lines[lines.length - 1] = lines[lines.length - 1].replace(/\s+$/, indent);
					comment.value = [lines[0]].concat(lines.slice(1).map(function (line) { return line.replace(/^\s+/, indent); })).join("\n");
				});
			}
		}));


		this._root.figure_out_scope({ screw_ie8: true });


		// Repeat because removing some declarations may make others unreferenced
		for (;;) {
			// Unreferenced variable and function declarations, and unreferenced terminal function arguments
			this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
				if (node instanceof UglifyJS.AST_SymbolDeclaration && node.unreferenced()) {
					if (node instanceof UglifyJS.AST_SymbolFunarg) {
						if (this.parent().argnames.indexOf(node) === this.parent().argnames.length - 1) {
							nodesToRemove.push({ node: node, parent: this.parent().argnames });
						}
					}
					else if (node instanceof UglifyJS.AST_SymbolVar) {
						if (_this._unusedVarsToIgnore.indexOf(node.name) !== -1) {
							nodesToRemove.push({ node: this.parent(), parent: this.parent(1).definitions });
							if (this.parent(1).definitions.length === 1) {
								nodesToRemove.push({ node: this.parent(1), parent: this.parent(2).body });
							}
						}
						else {
							haveUnusedVars = true;
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

			this._root.figure_out_scope({ screw_ie8: true });
		}


		// Rename all function arguments that begin with _ to not have the _.
		// This converts the TypeScript syntax of declaring private members in the constructor declaration `function Color(private _red: number, ...)` to `function Color(red, ...)`
		// so that it matches the JSDoc (and looks nicer).
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_SymbolFunarg &&
				node.thedef.name[0] === "_" &&
				node.thedef.name[1] !== "_" &&
				node.thedef.name !== "_super" // Don't rename _super (used in TypeScript's inheritance shim) to super. super is a reserved word.
			) {
				node.thedef.name = node.thedef.name.slice(1);
			}
		}));


		// Output
		var output = {
			source_map: _this._rootSourceMap.asUjsOutputSourceMap(),
			beautify: true,
			comments: function (node, comment) {
				// If this is the first license header, keep it.
				if (comment === _this._licenseHeader) {
					return true;
				}

				// If this is a license header, remove it.
				if (comment.value.indexOf("Copyright") !== -1) {
					return false;
				}

				// If this is a TypeScript reference comment, strip it.
				if (comment.value.substr(0, "/<reference path=".length) === "/<reference path=") {
					return false;
				}

				return true;
			}
		};

		var stream = UglifyJS.OutputStream(output);
		this._root.print(stream);

		outputStream.push(new Vinyl({
			path: _this._outputLibraryName + ".js",
			contents: Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL=" + _this._outputLibraryName + ".js.map")])
		}));

		outputStream.push(new Vinyl({
			path: _this._outputLibraryName + ".js.map",
			contents: _this._rootSourceMap.toBuffer()
		}));

		// Print unused variables
		if (haveUnusedVars) {
			this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
				if (node instanceof UglifyJS.AST_SymbolVar && node.unreferenced()) {
					if (_this._unusedVarsToIgnore.indexOf(node.name) === -1) {
						console.warn("Unused variable %s at %s:%s:%s", node.name, node.start.file, node.start.line, node.start.col);
					}
				}
			}));
		}
	};

	return Run;
})();

module.exports = {
	gulp: function (entry, outputLibraryName, unusedVarsToIgnore) {
		var run = new Run(entry, outputLibraryName, unusedVarsToIgnore);

		return makeTransform(function (file) {
			run.addFile(file);
		}, function () {
			run.build(this);
		});
	},

	watch: function (entry, outputLibraryName, unusedVarsToIgnore) {
		var files = Object.create(null);

		return makeTransform(function (file) {
			if (file.path !== "END") {
				files[file.path] = file;
			}
			else {
				var run = new Run(entry, outputLibraryName, unusedVarsToIgnore);
				Object.keys(files).forEach(function (filename) {
					run.addFile(files[filename]);
				});
				run.build(this);
			}
		});
	},

	minify: function () {
		var codeFile = null;
		var sourceMapFile = null;

		return makeTransform(function (file) {
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

				var inputSourceMapObject = JSON.parse(sourceMapFile.contents.toString());
				var outputSourceMapObject = output.source_map.get();
				outputSourceMapObject._sources.toArray().forEach(function (filename, i) {
					outputSourceMapObject.setSourceContent(filename, inputSourceMapObject.sourcesContent[i]);
				});

				sourceMapFile.contents = new Buffer(output.source_map.toString());
				this.push(sourceMapFile);

				codeFile = null;
				sourceMapFile = null;
			}
		});
	}
};

var UjsSourceMap = (function () {
	function UjsSourceMap(outputFilename, sourceRoot) {
		this._outputFilename = outputFilename;
		this._inputs = Object.create(null);

		this._generator = new SourceMap.SourceMapGenerator({
			file: outputFilename,
			sourceRoot: sourceRoot,
		});
	}

	UjsSourceMap.prototype.addInput = function (codeFilename, code, sourceMapContents) {
		this._inputs[codeFilename] = new SourceMap.SourceMapConsumer(sourceMapContents.toString());
		this._generator.setSourceContent(codeFilename, code);
	};

	UjsSourceMap.prototype.asUjsOutputSourceMap = function () {
		var _this = this;

		return {
			add: function (source, gen_line, gen_col, orig_line, orig_col, name) {
				if (source === _this._outputFilename || source === "?") {
					return;
				}
				var info = _this._inputs[source].originalPositionFor({
					line: orig_line,
					column: orig_col
				});

				if (info.source === null) {
					return;
				}

				_this._generator.addMapping({
					generated: { line: gen_line, column: gen_col },
					original: { line: info.line, column: info.column },
					source: source,
					name: info.name || name
				});
			},
			get: function () { return _this._generator; },
			toString: function () { return _this._generator.toString(); },
		};
	};

	UjsSourceMap.prototype.toBuffer = function () {
		return new Buffer(this._generator.toString());
	};

	return UjsSourceMap;
})();

var originalSymbolUnreferenced = UglifyJS.AST_Symbol.prototype.unreferenced;

UglifyJS.AST_Symbol.prototype.unreferenced = function () {
	if (this.start.comments_before.length > 0 && this.start.comments_before[0].value.trim() === "ujs:unreferenced") {
		return false;
	}

	if (this.name === "module" || this.name === "exports") {
		return false;
	}

	return originalSymbolUnreferenced.call(this);
};
