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

var FileTransform = require("async-build").FileTransform;

var Run = (function () {
	function Run(entry, outputLibraryName, unusedVarsToIgnore) {
		this._entry = path.resolve(entry).replace(/\\/g, "/");
		this._outputLibraryName = outputLibraryName;
		this._unusedVarsToIgnore = unusedVarsToIgnore;

		this._root = UglifyJS.parse(
			'(function (root, factory) {\n' +
			'	var global = this;\n' +
			'\n' +
			'	if (typeof define === "function" && define.amd) {\n' +
			'		define([], function() {\n' +
			'			return factory(global);\n' +
			'		});\n' +
			'	}\n' +
			'	else if (typeof exports === "object" && typeof module === "object") {\n' +
			'		module.exports = factory(global);\n' +
			'	}\n' +
			'	else if (typeof exports === "object") {\n' +
			'		exports.libjass = factory(global);\n' +
			'	}\n' +
			'	else {\n' +
			'		root.libjass = factory(global);\n' +
			'	}\n' +
			'})(this, function (global) {\n' +
			'	"use strict";\n' +
			'	return (function (modules) {\n' +
			'		var installedModules = Object.create(null);\n' +
			'		function require(moduleId) {\n' +
			'			if (installedModules[moduleId]) {\n' +
			'				return installedModules[moduleId];\n' +
			'			}\n' +
			'\n' +
			'			var exports = installedModules[moduleId] = Object.create(null);\n' +
			'			modules[moduleId](exports, require);\n' +
			'			return exports;\n' +
			'		}\n' +
			'\n' +
			'		return require(0);\n' +
			'	})([\n' +
			'	]);\n' +
			'});');

		this._root.figure_out_scope({ screw_ie8: true });

		this._licenseHeader = null;

		this._outputModulesArray = this._root.body[0].body.args[1].body[1].value.args[0].elements;

		this._modules = Object.create(null);

		this._rootSourceMap = UjsSourceMap({ file: this._outputLibraryName + ".js", root: "" });
	}

	Run.prototype.addFile = function (file) {
		var _this = this;

		var moduleName = (path.extname(file.path) === ".map") ? file.path.substr(0, file.path.length - ".js.map".length) : file.path.substr(0, file.path.length - ".js".length);
		if (!(moduleName in this._modules)) {
			this._modules[moduleName] = { id: null, root: null };
		}

		var module = this._modules[moduleName];

		var filenameWithoutExtension = path.relative(path.join(this._entry, ".."), moduleName).replace(/\\/g, "/");
		var tsFilename = filenameWithoutExtension + ".ts";
		var jsFilename = filenameWithoutExtension + ".js";

		switch (path.extname(file.path)) {
			case ".js":
				module.root = UglifyJS.parse(file.contents.toString(), {
					filename: jsFilename,
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
				var sourceMapContents = JSON.parse(file.contents.toString());
				sourceMapContents.sources[0] = tsFilename;
				sourceMapContents.file = jsFilename;
				this._rootSourceMap.addInput(sourceMapContents);
				this._rootSourceMap.get().setSourceContent(tsFilename, fs.readFileSync(moduleName + ".ts", { encoding: "utf8" }));
				break;
		}
	};

	Run.prototype.build = function (outputStream) {
		var _this = this;

		// Assign IDs to all modules
		var moduleNames = Object.keys(this._modules);
		moduleNames.sort(function (name1, name2) { return (name1 === name2) ? 0 : (name1 < name2 ? -1 : 1); });
		moduleNames.unshift.apply(moduleNames, moduleNames.splice(moduleNames.indexOf(this._entry), 1));

		moduleNames.forEach(function (moduleName, index) {
			_this._modules[moduleName].id = index;
		});


		// Merge modules
		moduleNames.forEach(function (moduleName) {
			var module = _this._modules[moduleName];

			module.root.body.forEach(function (statement) {
				if (statement instanceof UglifyJS.AST_Var && statement.definitions.length === 1) {
					if (
						statement.definitions[0].value instanceof UglifyJS.AST_Call &&
						statement.definitions[0].value.expression.name === "require"
					) {
						var importRelativePath = statement.definitions[0].value.args[0].value;
						var importAbsolutePath = path.join(moduleName, "..", importRelativePath).replace(/\\/g, "/");
						var stringArg = statement.definitions[0].value.args[0];
						var importedModule = _this._modules[importAbsolutePath];
						if (importedModule === undefined) {
							importedModule = _this._modules[importAbsolutePath + "/index"];
						}
						statement.definitions[0].value.args[0] = new UglifyJS.AST_Number({ start: stringArg.start, end: stringArg.end, value: importedModule.id });
					}
					else if (statement.definitions[0].name.name === "__extends") {
						var importAbsolutePath = path.join(_this._entry, "..", "utility", "ts-helpers").replace(/\\/g, "/");
						statement.definitions[0].value = UglifyJS.parse('require(' + _this._modules[importAbsolutePath].id + ').__extends').body[0].body;
					}
					else if (statement.definitions[0].name.name === "__decorate") {
						var importAbsolutePath = path.join(_this._entry, "..", "utility", "ts-helpers").replace(/\\/g, "/");
						statement.definitions[0].value = UglifyJS.parse('require(' + _this._modules[importAbsolutePath].id + ').__decorate').body[0].body;
					}
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


		// Move var statements at the end of blocks (generated by TS for rest parameters) to the start of the block.
		// This is needed to prevent unreachable-code warnings from UJS
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_Block &&
				node.body[node.body.length - 1] instanceof UglifyJS.AST_Var
			) {
				node.body.unshift(node.body.pop());
			}
		}));


		// Split multiple vars per declaration into one var per declaration
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_Var &&
				node.definitions.length > 1 &&
				this.parent() instanceof UglifyJS.AST_Block
			) {
				var parent = this.parent().body;
				parent.splice.apply(parent, [parent.indexOf(node), 1].concat(node.definitions.map(function (definition) {
					return new UglifyJS.AST_Var({ start: node.start, end: node.end, definitions: [definition] });
				})));
			}
		}));


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
			source_map: _this._rootSourceMap,
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

		outputStream.push({
			path: _this._outputLibraryName + ".js",
			contents: Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL=" + _this._outputLibraryName + ".js.map")])
		});

		outputStream.push({
			path: _this._outputLibraryName + ".js.map",
			contents: new Buffer(_this._rootSourceMap.get().toString())
		});

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
	build: function (entry, outputLibraryName, unusedVarsToIgnore) {
		var run = new Run(entry, outputLibraryName, unusedVarsToIgnore);

		return new FileTransform(function (file) {
			run.addFile(file);
		}, function () {
			run.build(this);
		});
	},

	watch: function (entry, outputLibraryName, unusedVarsToIgnore) {
		var files = Object.create(null);

		return new FileTransform(function (file) {
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

		return new FileTransform(function (file) {
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
				root = UglifyJS.mangle_properties(root, {
					regex: /^_/
				});


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

				codeFile.contents = Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL="), new Buffer(sourceMapFile.path)]);
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

var SourceMap = require.cache[require.resolve("uglify-js")].require("source-map");

function UjsSourceMap(options) {
	var orig_maps = Object.create(null);

	var generator = new SourceMap.SourceMapGenerator({
		file: options.file,
		sourceRoot: options.root,
	});

	return {
		addInput: function (rawSourceMap) {
			var consumer = new SourceMap.SourceMapConsumer(rawSourceMap);
			orig_maps[consumer.file] = consumer;
		},
		add: function (source, gen_line, gen_col, orig_line, orig_col, name) {
			var originalMap;
			if (source) {
				originalMap = orig_maps[source];
			}
			else {
				source = "?";
			}

			if (originalMap) {
				var info = originalMap.originalPositionFor({
					line: orig_line,
					column: orig_col
				});

				if (info.source === null) {
					return;
				}

				source = info.source;
				orig_line = info.line;
				orig_col = info.column;
				name = info.name || name;
			}

			generator.addMapping({
				generated : { line: gen_line, column: gen_col },
				original  : { line: orig_line, column: orig_col },
				source    : source,
				name      : name
			});
		},
		get: function () { return generator; },
		toString: function () { return generator.toString(); },
	};
}

var originalSymbolUnreferenced = UglifyJS.AST_Symbol.prototype.unreferenced;

// Workaround for https://github.com/mishoo/UglifyJS2/issues/789 - Nodes explicitly marked with ujs:unreferenced will not be warned for.
UglifyJS.AST_Symbol.prototype.unreferenced = function () {
	if (this.start.comments_before.length > 0 && this.start.comments_before[0].value.trim() === "ujs:unreferenced") {
		return false;
	}

	return originalSymbolUnreferenced.call(this);
};
