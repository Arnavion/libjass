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
	function Run(outputLibraryName, unusedVarsToIgnore) {
		this._outputLibraryName = outputLibraryName;
		this._unusedVarsToIgnore = unusedVarsToIgnore;

		this._root = UglifyJS.parse(fs.readFileSync(path.resolve(__filename, "..", "umd-wrapper.js"), "utf8"));

		this._root.figure_out_scope({ screw_ie8: true });

		this._toInsert = null;

		this._rootSourceMap = null;
	}

	Run.prototype.addFile = function (file) {
		switch (path.extname(file.path)) {
			case ".js":
				try {
					this._toInsert = UglifyJS.parse(file.contents.toString(), {
						filename: path.basename(file.path),
						toplevel: null,
					}).body;
				}
				catch (ex) {
					if (ex instanceof UglifyJS.JS_Parse_Error) {
						throw new Error("UglifyJS parse error: " + ex.toString() + "\n");
					}

					throw ex;
				}
				break;

			case ".map":
				var rawSourceMap = JSON.parse(file.contents.toString());

				this._rootSourceMap = UglifyJS.SourceMap({
					file: this._outputLibraryName + ".js",
					root: "",
					orig: rawSourceMap,
				});

				var generator = this._rootSourceMap.get();

				rawSourceMap.sources.forEach(function (sourceRelativePath, index) {
					generator.setSourceContent(sourceRelativePath, rawSourceMap.sourcesContent[index]);
				});

				break;
		}
	};

	Run.prototype.build = function (outputStream) {
		var _this = this;


		// Splice in the TS output into the UMD wrapper.
		var insertionParent = this._root.body[0].body.args[1].body;

		this._toInsert.reverse();
		for (var i = this._toInsert.length - 1; i >= 0; i--) {
			var node = this._toInsert[i];
			if (node instanceof UglifyJS.AST_Var) {
				for (var j = 0; j < node.definitions.length; j++) {
					var definition = node.definitions[j];
					if (definition.name.name === "__extends" || definition.name.name === "__decorate") {
						definition.value = definition.value.right;
					}
				}

				insertionParent.splice(-1, 0, node);
				this._toInsert.splice(i, 1);
			}
		}

		insertionParent.splice.apply(insertionParent, [-1, 0].concat(this._toInsert));


		// Fixups
		for (var i = 0; i < this._toInsert.length; i++) {
			var node = this._toInsert[i];
			if (node instanceof UglifyJS.AST_Statement && node.body instanceof UglifyJS.AST_Call && node.body.expression.name === "define") {
				var defineCall = node.body;

				defineCall.expression.name = "def";

				if (defineCall.args[1].elements[0].value !== "require") {
					throw new Error("Expected first dep to be require");
				}
				defineCall.args[1].elements.shift();
				defineCall.args[2].argnames.shift();

				if (defineCall.args[1].elements[0].value !== "exports") {
					throw new Error("Expected second dep to be exports");
				}
				defineCall.args[1].elements.shift();
				defineCall.args[2].argnames.push(defineCall.args[2].argnames.shift());
			}
		}


		// Remove all license headers except the one from the UMD wrapper
		var firstLicenseHeader = null;
		this._root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (node.start) {
				(node.start.comments_before || []).some(function (comment, i) {
					if (comment.value.indexOf("Copyright") !== -1) {
						if (firstLicenseHeader === null) {
							firstLicenseHeader = comment;
						}
						else if (comment !== firstLicenseHeader) {
							node.start.comments_before.splice(i, 1);
						}

						return true;
					}

					return false;
				});
			}
		}));


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
					if (comment.value.indexOf("Copyright") !== -1) {
						return;
					}

					var lines = comment.value.split("\n");
					if (lines.length < 2) {
						return;
					}

					var indent = "     "; // 5 spaces
					for (var i = 0; i < comment.col; i++) {
						indent += " ";
					}
					lines[lines.length - 1] = lines[lines.length - 1].replace(/\s+$/, indent);
					comment.value = [lines[0]].concat(lines.slice(1).map(function (line) { return line.replace(/^\s+/, indent); })).join("\n");
				});
			}
		}));


		this._root.figure_out_scope({ screw_ie8: true });


		// Remove some things from the AST
		var nodesToRemove = [];

		// Set if there are any unused variables apart from the ones in unusedVarsToIgnore
		var haveUnusedVars = false;

		// Repeat because removing some declarations may make others unreferenced
		for (;;) {
			this._root.figure_out_scope({ screw_ie8: true });

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
			source_map: this._rootSourceMap,
			ascii_only: true,
			beautify: true,
			comments: true,
		};

		var stream = UglifyJS.OutputStream(output);
		this._root.print(stream);

		outputStream.push({
			path: this._outputLibraryName + ".js",
			contents: Buffer.concat([new Buffer(stream.toString()), new Buffer("\n//# sourceMappingURL=" + this._outputLibraryName + ".js.map")])
		});

		outputStream.push({
			path: this._outputLibraryName + ".js.map",
			contents: new Buffer(this._rootSourceMap.get().toString())
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
	build: function (outputLibraryName, unusedVarsToIgnore) {
		var run = new Run(outputLibraryName, unusedVarsToIgnore);

		return new FileTransform(function (file) {
			run.addFile(file);
		}, function () {
			run.build(this);
		});
	},

	watch: function (outputLibraryName, unusedVarsToIgnore) {
		var files = Object.create(null);

		return new FileTransform(function (file) {
			if (file.path !== "END") {
				files[file.path] = file;
			}
			else {
				var run = new Run(outputLibraryName, unusedVarsToIgnore);
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
					ascii_only: true,
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

var originalSymbolUnreferenced = UglifyJS.AST_Symbol.prototype.unreferenced;

// Workaround for https://github.com/mishoo/UglifyJS2/issues/789 - Nodes explicitly marked with ujs:unreferenced will not be warned for.
UglifyJS.AST_Symbol.prototype.unreferenced = function () {
	if (this.start.comments_before.length > 0 && this.start.comments_before[0].value.trim() === "ujs:unreferenced") {
		return false;
	}

	return originalSymbolUnreferenced.call(this);
};
