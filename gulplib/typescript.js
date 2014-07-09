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
var vm = require("vm");

var Vinyl = require("vinyl");

var Transform = require("./helpers.js").Transform;

var typeScriptModulePath = path.resolve("./node_modules/typescript/bin");
var typeScriptJsPath = path.join(typeScriptModulePath, "typescript.js");

var TypeScript = {};
vm.runInNewContext(fs.readFileSync(typeScriptJsPath, { encoding: "utf8" }) + "module.exports = TypeScript;", {
	module: Object.defineProperty(Object.create(null), "exports", {
		get: function () { return TypeScript; },
		set: function (value) { TypeScript = value; }
	}),
	require: require,
	process: process,
	__filename: typeScriptJsPath,
	__dirname: typeScriptModulePath
});

exports.TS = TypeScript;

var innerCompilerSettings = new TypeScript.CompilationSettings();
innerCompilerSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
innerCompilerSettings.mapSourceFiles = true;
innerCompilerSettings.noImplicitAny = true;
innerCompilerSettings.outFileOption = "output.js";

innerCompilerSettings = TypeScript.ImmutableCompilationSettings.fromCompilationSettings(innerCompilerSettings);

var Compiler = function () {
	function Compiler() {
		this._scriptSnapshots = Object.create(null);

		this._innerCompiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), innerCompilerSettings);

		this.addFile(path.resolve(typeScriptModulePath, "lib.d.ts"));
	};

	Compiler.prototype.addFile = function (file) {
		var _this = this;

		var filename = file;
		if (file.constructor !== String) {
			filename = file.path;
		}

		var newFiles = [];

		if (this._innerCompiler.getDocument(filename) === null) {
			// This is a new file. Add all the resolutionResults that are new files (including this one).

			var resolutionResults = this._resolve(filename);

			resolutionResults.resolvedFiles.forEach(function (resolvedFile) {
				if (_this._innerCompiler.getDocument(resolvedFile.path) === null) {

					_this._innerCompiler.addFile(resolvedFile.path, _this._getScriptSnapshot(resolvedFile.path), 0, 0, false, resolvedFile.referencedFiles);

					newFiles.push(resolvedFile.path);
				}
			});
		}
		else {
			// This is an existing file that's being updated.

			this._innerCompiler.updateFile(filename, this._newScriptSnapshot(filename), 0, false, null);

			var resolutionResults = this._resolve(filename);

			resolutionResults.resolvedFiles.forEach(function (resolvedFile) {
				if (_this._innerCompiler.getDocument(resolvedFile.path) === null) {
					_this._innerCompiler.addFile(resolvedFile.path, _this._getScriptSnapshot(resolvedFile.path), 0, 0, false, resolvedFile.referencedFiles);

					newFiles.push(resolvedFile.path);
				}
			});
		}

		return newFiles;
	};

	Compiler.prototype.removeFile = function (filename) {
		this._innerCompiler.removeFile(filename);
	};

	Compiler.prototype.compile = function (outputCodePath, outputSourceMapPath) {
		var iterator = this._innerCompiler.compile(path.resolve.bind(path));
		var outputFiles = [];

		var error = false;

		while (iterator.moveNext()) {
			var result = iterator.current();

			error = error || this._writeDiagnostics(result.diagnostics);

			result.outputFiles.forEach(function (outputFile) {
				var outputPath = null;

				switch (outputFile.fileType) {
					case TypeScript.OutputFileType.JavaScript:
						outputPath = outputCodePath;
						break;

					case TypeScript.OutputFileType.SourceMap:
						outputPath = outputSourceMapPath;
						var sourceMapObject = JSON.parse(outputFile.text);
						sourceMapObject.sourceRoot = null;
						outputFile.text = JSON.stringify(sourceMapObject);
						break;

					default:
						return;
				}

				outputFiles.push(new Vinyl({
					base: "/",
					path: outputPath,
					contents: new Buffer(outputFile.text)
				}));
			});
		}

		if (error) {
			throw new Error("There were one or more errors.");
		}

		return outputFiles;
	};

	Compiler.prototype.getDocument = function (filename) {
		return this._innerCompiler.getDocument(filename);
	};

	Compiler.prototype._resolve = function (filename) {
		var resolutionResults = TypeScript.ReferenceResolver.resolve([filename], {
			resolveRelativePath: function (file, directory) {
				return path.resolve(directory, file);
			},
			fileExists: fs.existsSync.bind(fs),
			getScriptSnapshot: this._getScriptSnapshot.bind(this),
			getParentDirectory: path.dirname.bind(path)
		}, true);

		if (this._writeDiagnostics(resolutionResults.diagnostics)) {
			throw new Error("File resolution failed for " + JSON.stringify(filename));
		}

		return resolutionResults;
	};

	Compiler.prototype._writeDiagnostics = function (diagnostics) {
		diagnostics.forEach(function (diagnostic) {
			var message = diagnostic.message();

			if (diagnostic.fileName()) {
				message = diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): " + message;
			}

			console.error(message);
		});

		return diagnostics.some(function (diagnostic) { return diagnostic.info().category === TypeScript.DiagnosticCategory.Error; });
	};

	Compiler.prototype._getScriptSnapshot = function (filename) {
		var scriptSnapshot = this._scriptSnapshots[filename];

		if (scriptSnapshot) {
			return scriptSnapshot;
		}

		return this._newScriptSnapshot(filename);
	};

	Compiler.prototype._newScriptSnapshot = function (filename) {
		var fileContents = fs.readFileSync(filename, { encoding: "utf8" });

		return this._scriptSnapshots[filename] = TypeScript.ScriptSnapshot.fromString(fileContents);
	};

	return Compiler;
}();

exports.Compiler = Compiler;

function flatten(arrays) {
	return arrays.reduce(function (previous, current) { return previous.concat(current); }, []);
}

exports.gulp = function (outputCodePath, outputSourceMapPath, astModifier) {
	var compiler = new Compiler();

	var filenames = [];
	var allFiles = [];

	return Transform(function (file, encoding) {
		filenames.push(file.path);
		allFiles.push.apply(allFiles, compiler.addFile(file));
	}, function () {
		var _this = this;

		try {
			console.log("Compiling " + JSON.stringify(filenames) + "...");

			if (astModifier !== undefined) {
				astModifier(exports.AST.walk(compiler, allFiles));
			}

			var outputFiles = compiler.compile(outputCodePath, outputSourceMapPath);

			console.log("Compile succeeded.");

			outputFiles.forEach(function (file) {
				_this.push(file);
			});
		}
		catch (ex) {
			if (ex instanceof Error) {
				throw ex;
			}
			else {
				throw new Error("Internal compiler error: " + ex.stack + "\n");
			}
		}
	});
};

exports.watch = function (outputCodePath, outputSourceMapPath) {
	var compiler = new Compiler();

	var filenames = [];
	var allFiles = [];

	return Transform(function (file) {
		filenames.push(file.path);
		allFiles.push.apply(allFiles, compiler.addFile(file));
	}, function (callback) {
		var _this = this;

		var outputFiles = compiler.compile(outputCodePath, outputSourceMapPath);

		console.log("Compile succeeded.");

		console.log("Listening for changes...");

		allFiles.forEach(function (filename) {
			watchFile(filename, fileChangedCallback, fileDeletedCallback);
		});

		function fileChangedCallback(filename) {
			try {
				compiler.addFile(filename).forEach(function (changed) {
					if (changed !== filename) {
						watchFile(changed, fileChangedCallback, fileDeletedCallback);
					}
				});

				compile();
			}
			catch (ex) {
				console.error("Compile failed." + ex.stack);
			}
		}

		function fileDeletedCallback(filename) {
			try {
				compiler.removeFile(filename);
				compile();
			}
			catch (ex) {
				console.error("Compile failed." + ex.stack);
			}
		}

		function compile() {
			console.log("Compiling " + JSON.stringify(filenames) + "...");

			var outputFiles = compiler.compile(outputCodePath, outputSourceMapPath);

			console.log("Compile succeeded.");

			outputFiles.forEach(function (file) {
				_this.push(file);
			});
		}
	});
};

var watchFile = function (filename, onChange, onDelete) {
	var alreadyCalled = false;

	function watchFileCallback(currentFile, previousFile) {
		if (currentFile.mtime >= previousFile.mtime) {
			if (alreadyCalled) { return; }

			alreadyCalled = true;

			setTimeout(function () { alreadyCalled = false; }, 100);

			onChange(filename);
		}
		else {
			fs.unwatchFile(filename, watchFileCallback);

			onDelete(filename);
		}
	}

	fs.watchFile(filename, { interval: 500 }, watchFileCallback);
};

var __extends = function(d, b) {
	for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	function __() {
		this.constructor = d;
	}
	__.prototype = b.prototype;
	d.prototype = new __();
};

var Scoped = function () {
	function Scoped(name) {
		this.name = name;

		this.parent = null;
	};

	Object.defineProperty(Scoped.prototype, "fullName", {
		get: function () {
			return ((this.parent !== null) ? (this.parent.fullName + ".") : "") + this.name;
		},
		enumerable: true,
		configurable: true
	});

	Scoped.prototype.toString = function () {
		return this.fullName;
	};

	return Scoped;
}();

var Namespace = function (_super) {
	__extends(Namespace, _super);

	function Namespace(name) {
		_super.call(this, name);

		this.members = [];
	};

	return Namespace;
}(Scoped);

var Function = function (_super) {
	__extends(Function, _super);

	function Function(name, astNode, description, generics, parameters, returnType, isAbstract, isPrivate, isStatic) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.parameters = parameters;

		this.returnType = returnType;

		this.isAbstract = isAbstract;
		this.isPrivate = isPrivate;
		this.isStatic = isStatic;
	};

	return Function;
}(Scoped);

var Interface = function (_super) {
	__extends(Interface, _super);

	function Interface(name, astNode, description, generics, baseType, isPrivate) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.baseType = baseType;

		this.isPrivate = isPrivate;

		this.members = [];
	};

	return Interface;
}(Scoped);

var Constructor = function (_super) {
	__extends(Constructor, _super);

	function Constructor(name, astNode, description, generics, parameters, baseType, isAbstract, isPrivate) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.parameters = parameters;

		this.baseType = baseType;

		this.isAbstract = isAbstract;
		this.isPrivate = isPrivate;

		this.members = [];
	};

	return Constructor;
}(Scoped);

var Property = function (_super) {
	__extends(Property, _super);

	function Property(name) {
		_super.call(this, name);

		this.getter = null;

		this.setter = null;
	};

	return Property;
}(Scoped);

var Getter = function () {
	function Getter(astNode, description, type) {
		this.astNode = astNode;

		this.description = description;

		this.type = type;
	};

	return Getter;
}();

var Setter = function () {
	function Setter(astNode, description, parameters) {
		this.astNode = astNode;

		this.description = description;

		this.parameters = parameters;
	};

	return Setter;
}();

var Variable = function (_super) {
	__extends(Variable, _super);

	function Variable(name, astNode, description, type) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.type = type;
	};

	return Variable;
}(Scoped);

var Parameter = function () {
	function Parameter(name, type, description) {
		this.name = name;
		this.type = type;
		this.description = description;

		this.subParameters = [];
	};

	return Parameter;
}();

var ReturnType = function () {
	function ReturnType(type, description) {
		this.type = type;
		this.description = description;
	};

	return ReturnType;
}();

var NodeType = function () {
	var NodeType = Object.create(null);

	NodeType[NodeType["Function"] = 0] = "Function";
	NodeType[NodeType["Constructor"] = 1] = "Constructor";
	NodeType[NodeType["Getter"] = 2] = "Getter";
	NodeType[NodeType["Setter"] = 3] = "Setter";
	NodeType[NodeType["Variable"] = 4] = "Variable";
	NodeType[NodeType["Interface"] = 5] = "Interface";

	return NodeType;
}();

var WalkerScope = function () {
	function WalkerScope() {
		this._scopes = [];
	}

	Object.defineProperty(WalkerScope.prototype, "current", {
		get: function () {
			return (this._scopes.length > 0) ? this._scopes[this._scopes.length - 1] : null;
		},
		enumerable: true,
		configurable: true
	});

	WalkerScope.prototype.enter = function (scope) {
		scope.parent = this.current;

		this._scopes.push(scope);

		return scope;
	};

	WalkerScope.prototype.leave = function () {
		this._scopes.pop();
	};

	return WalkerScope;
}();

var Walker = function (_super) {
	__extends(Walker, _super);

	function Walker() {
		_super.call(this);

		this._scope = new WalkerScope();

		this.namespaces = Object.create(null);
	};

	Walker.prototype.visitModuleDeclaration = function (node) {
		var _this = this;

		var nameParts = node.stringLiteral ? [node.stringLiteral.text()] : this._getModuleName(node.name);

		nameParts.forEach(function (namePart) {
			var namespace = _this._scope.enter(new Namespace(namePart));

			var existingNamespace = _this.namespaces[namespace.fullName];
			if (existingNamespace !== undefined) {
				_this._scope.leave();
				_this._scope.enter(existingNamespace);
			}
			else {
				_this.namespaces[namespace.fullName] = namespace;
			}
		});

		_super.prototype.visitModuleDeclaration.call(this, node);

		nameParts.forEach(function () {
			_this._scope.leave();
		});
	};

	Walker.prototype.visitInterfaceDeclaration = function (node) {
		var name = node.identifier.text();

		var docNode = node.modifiers.item || node.interfaceKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Interface);
		if (doc === null) {
			return;
		}

		var extendsClause = node.heritageClauses.toArray().filter(function (heritageClause) {
			return heritageClause.extendsOrImplementsKeyword.tokenKind === TypeScript.SyntaxKind.ExtendsKeyword;
		})[0] || null;
		var baseType = null;
		if (extendsClause !== null) {
			baseType = extendsClause.typeNames.item.fullText().trim();
		}
		var modifiers = ((node.modifiers.item ? [node.modifiers.item] : node.modifiers.nodeOrTokens) || []).map(function (modifier) { return modifier.tokenKind; });
		var isPrivate = !modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["ExportKeyword"]; });

		var interface = this._scope.enter(new Interface(name, node, doc.rootDescription, doc.generics, baseType, isPrivate));

		if (interface.parent !== null) {
			interface.parent.members.push(interface);
		}

		_super.prototype.visitInterfaceDeclaration.call(this, node);

		this._scope.leave();
	};

	Walker.prototype.visitClassDeclaration = function (node) {
		var name = node.identifier.text();

		var docNode = node.modifiers.item || node.classKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Constructor);
		if (doc === null) {
			return;
		}

		var extendsClause = node.heritageClauses.toArray().filter(function (heritageClause) {
			return heritageClause.extendsOrImplementsKeyword.tokenKind === TypeScript.SyntaxKind.ExtendsKeyword;
		})[0] || null;
		var baseType = null;
		if (extendsClause !== null) {
			baseType = extendsClause.typeNames.item.fullText().trim();
		}
		var modifiers = ((node.modifiers.item ? [node.modifiers.item] : node.modifiers.nodeOrTokens) || []).map(function (modifier) { return modifier.tokenKind; });
		var isPrivate = !modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["ExportKeyword"]; });

		var clazz = this._scope.enter(new Constructor(name, node, doc.rootDescription, doc.generics, doc.parameters, baseType, doc.isAbstract, isPrivate));

		if (clazz.parent !== null) {
			clazz.parent.members.push(clazz);
		}

		_super.prototype.visitClassDeclaration.call(this, node);

		this._scope.leave();
	};

	Walker.prototype.visitMemberFunctionDeclaration = function (node) {
		var name = node.propertyName.text();

		var docNode = node.modifiers.item || (node.modifiers.nodeOrTokens && node.modifiers.nodeOrTokens[0]) || node.propertyName;
		var doc = this._parseJSDoc(docNode, NodeType.Function);
		if (doc === null) {
			return;
		}

		var modifiers = ((node.modifiers.item ? [node.modifiers.item] : node.modifiers.nodeOrTokens) || []).map(function (modifier) { return modifier.tokenKind; });
		var isPrivate = modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["PrivateKeyword"]; });
		var isStatic = modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["StaticKeyword"]; });

		var memberFunction = this._scope.enter(new Function(name, node, doc.rootDescription, doc.generics, doc.parameters, doc.returnType, doc.isAbstract, isPrivate, isStatic));

		memberFunction.parent.members.push(memberFunction);

		this._scope.leave();
	};

	Walker.prototype.visitFunctionDeclaration = function (node) {
		var name = node.identifier.text();

		var docNode = node.modifiers.item || node.functionKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Function);
		if (doc === null) {
			return;
		}

		var modifiers = ((node.modifiers.item ? [node.modifiers.item] : node.modifiers.nodeOrTokens) || []).map(function (modifier) { return modifier.tokenKind; });
		var isPrivate = modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["PrivateKeyword"]; });
		var isStatic = modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["StaticKeyword"]; });

		var freeFunction = this._scope.enter(new Function(name, node, doc.rootDescription, doc.generics, doc.parameters, doc.returnType, doc.isAbstract, isPrivate, isStatic));

		if (freeFunction.parent !== null) {
			freeFunction.parent.members.push(freeFunction);
		}

		this._scope.leave();
	};

	Walker.prototype.visitGetAccessor = function (node) {
		var name = node.propertyName.text();

		var docNode = node.modifiers.item || node.getKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Getter);
		if (doc === null) {
			return;
		}

		var clazz = this._scope.current;

		var property = clazz.members.filter(function (member) { return member.name === name; })[0];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members.push(property);

			this._scope.leave();
		}

		property.getter = new Getter(node, doc.rootDescription, doc.returnType);
	};

	Walker.prototype.visitSetAccessor = function (node) {
		var name = node.propertyName.text();

		var docNode = node.modifiers.item || node.setKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Setter);
		if (doc === null) {
			return;
		}

		var clazz = this._scope.current;

		var property = clazz.members.filter(function (member) { return member.name === name; })[0];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members.push(property);

			this._scope.leave();
		}

		property.setter = new Setter(node, doc.rootDescription, doc.parameters);
	};

	Walker.prototype.visitMemberVariableDeclaration = function (node) {
		var name = node.variableDeclarator.propertyName.text();

		var docNode = node.variableDeclarator.propertyName;
		var doc = this._parseJSDoc(docNode, NodeType.Variable);
		if (doc === null) {
			return;
		}

		var variable = this._scope.enter(new Variable(name, node, doc.rootDescription, doc.returnType));

		variable.parent.members.push(variable);

		this._scope.leave();
	};

	Walker.prototype.visitVariableStatement = function (node) {
		var name = node.variableDeclaration.variableDeclarators.item.propertyName.text();

		var docNode = node.modifiers.item;
		var doc = this._parseJSDoc(docNode, NodeType.Variable);
		if (doc === null) {
			return;
		}

		var variable = this._scope.enter(new Variable(name, node.variableDeclaration.variableDeclarators.item, doc.rootDescription, doc.returnType));

		variable.parent.members.push(variable);

		this._scope.leave();
	};

	Walker.prototype._getModuleName = function (name) {
		if (name.kind() === TypeScript.SyntaxKind.QualifiedName) {
			return this._getModuleName(name.left).concat(name.right.text());
		}

		return [name.text()];
	};

	Walker.prototype._parseJSDoc = function (docNode, nodeType) {
		if (docNode === undefined) {
			return null;
		}

		var comment = docNode.fullText();

		var commentStartIndex = comment.indexOf("/**");
		var commentEndIndex = comment.lastIndexOf("*/");

		if (commentStartIndex === -1 || commentEndIndex === -1) {
			return null;
		}

		var lines = comment.substring(commentStartIndex + 2, commentEndIndex).split("\n").map(function (line) {
			var match = line.match(/^[ \t]*\* (.*)*/);
			if (match === null) {
				return "";
			}
			return match[1];
		}).filter(function (line) {
			return line.length > 0;
		});

		var isAbstract = false;

		var generics = [];
		var parameters = [];
		var returnType = null;

		var rootDescription = "";

		var lastRead = null;

		lines.forEach(function (line) {
			var readType = function (remainingLine) {
				if (remainingLine[0] !== "{") {
					throw new Error("Missing type in line: [" + line + "]");
				}

				var index = -1;
				var numberOfUnterminatedBraces = 0;
				for (var i = 0; i < remainingLine.length; i++) {
					if (remainingLine[i] === "{") {
						numberOfUnterminatedBraces++;
					}
					else if (remainingLine[i] === "}") {
						numberOfUnterminatedBraces--;

						if (numberOfUnterminatedBraces === 0) {
							index = i;
							break;
						}
					}
				}

				if (index === -1) {
					throw new Error("Unterminated type specifier.");
				}

				var type = remainingLine.substr(1, index - 1);
				remainingLine = remainingLine.substr(index + 1).trimLeft();

				return [type, remainingLine];
			};

			var firstWordMatch = line.match(/^\s*(\S+)(\s*)/);
			var firstWord = firstWordMatch[1];
			var remainingLine = line.substring(firstWordMatch[0].length);

			if (firstWord[0] === "@") {
				lastRead = null;
			}

			switch (firstWord) {
				case "@abstract":
					isAbstract = true;
					break;

				case "@param":
					var result = readType(remainingLine);
					var type = result[0];
					remainingLine = result[1];

					var nameMatch = remainingLine.match(/(\S+)\s*/);
					var name = nameMatch[1];

					var description = remainingLine.substr(nameMatch[0].length);

					var subParameterMatch = name.match(/^(?:(.+)\.([^\.]+))|(?:(.+)\[("[^\[\]"]+")\])$/);
					if (subParameterMatch === null) {
						parameters.push(lastRead = new Parameter(name, type, description));
					}
					else {
						var parentName = subParameterMatch[1] || subParameterMatch[3];
						var childName = subParameterMatch[2] || subParameterMatch[4];
						var parentParameter = parameters.filter(function (parameter) { return parameter.name === parentName; })[0];
						parentParameter.subParameters.push(new Parameter(childName, type, description));
					}
					break;

				case "@return":
					var result = readType(remainingLine);
					var type = result[0];
					var description = result[1];

					returnType = lastRead = new ReturnType(type, description);

					break;

				case "@template":
					generics.push.apply(generics, remainingLine.split(/,/).map(function (word) { return word.trim(); }));
					break;

				case "@type":
					switch (nodeType) {
						case NodeType.Getter:
						case NodeType.Variable:
							var result = readType(remainingLine);
							var type = result[0];

							returnType = lastRead = type;
							break;

						case NodeType.Setter:
							var result = readType(remainingLine);
							var type = result[0];

							parameters.push(lastRead = new Parameter("value", type, ""));
							break;
					}
					break;

				default:
					if (lastRead !== null) {
						lastRead.description += " " + line;
					}
					else {
						rootDescription += ((rootDescription.length > 0) ? " " : "") + line;
					}
					break;
			}
		});

		return {
			rootDescription: rootDescription,
			generics: generics,
			parameters: parameters,
			returnType: returnType,
			isAbstract: isAbstract
		};
	};

	return Walker;
}(TypeScript.PositionTrackingWalker);

var walk = function (compiler, resolvedFilenames) {
	var walker = new Walker();

	// Walk
	resolvedFilenames.forEach(function (resolvedFilename) {
		var document = compiler.getDocument(resolvedFilename);
		var sourceUnit = document.syntaxTree().sourceUnit();
		sourceUnit.accept(walker);
	});

	// Link base types
	var linkVisitor = function (current) {
		if (current instanceof Interface || current instanceof Constructor) {
			if (current.baseType !== null && current.baseType.constructor === String) {
				var existingBaseType = null;
				for (var ns = current.parent; existingBaseType === null; ns = ns.parent) {
					var fullName = ((ns !== null) ? (ns.fullName + ".") : "") + current.baseType;

					var endOfNamespaceIndex = fullName.lastIndexOf(".");

					var existingNamespace = walker.namespaces[fullName.substr(0, endOfNamespaceIndex)];

					if (existingNamespace !== undefined) {
						var className = fullName.substr(endOfNamespaceIndex + 1);

						existingBaseType = existingNamespace.members.filter(function (member) {
							return member.name === className;
						})[0] || null;
					}

					if (ns === null) {
						break;
					}
				}

				if (existingBaseType === null) {
					console.warn("Base type [" + current.baseType + "] of type [" + current.fullName + "] not found.");
				}
				else {
					current.baseType = existingBaseType;
				}
			}
		}
		else if (current instanceof Namespace) {
			current.members.forEach(linkVisitor);
		}
	};
	Object.keys(walker.namespaces).forEach(function (namespaceName) { linkVisitor(walker.namespaces[namespaceName]); });

	// Return types
	return walker.namespaces;
};

exports.AST = {
	Namespace: Namespace,
	Function: Function,
	Interface: Interface,
	Constructor: Constructor,
	Property: Property,
	Getter: Getter,
	Setter: Setter,
	Variable: Variable,
	Parameter: Parameter,
	ReturnType: ReturnType,

	walk: walk
};

Object.keys(TypeScript.SyntaxTreeToAstVisitor.prototype).forEach(function (key) {
	if (key.substr(0, "visit".length) !== "visit") {
		return;
	}

	var originalFunction = TypeScript.SyntaxTreeToAstVisitor.prototype[key];
	if (originalFunction.length !== 1) {
		return;
	}

	TypeScript.SyntaxTreeToAstVisitor.prototype[key] = function (node) {
		var result = originalFunction.call(this, node);

		if (node && node["gulp-typescript-new-comment"]) {
			result["gulp-typescript-new-comment"] = node["gulp-typescript-new-comment"];
		}

		return result;
	};
});

var originalEmitComments = TypeScript.Emitter.prototype.emitComments;
TypeScript.Emitter.prototype.emitComments = function (ast, pre, onlyPinnedOrTripleSlashComments) {
	if (ast["gulp-typescript-new-comment"]) {
		var trivia = ast.preComments()[0]._trivia;

		var originalFullText = trivia.fullText();

		var commentEndIndex = originalFullText.lastIndexOf("*/");
		var fullText = originalFullText.substr(0, commentEndIndex);

		fullText += "*\n";
		ast["gulp-typescript-new-comment"].forEach(function (line) {
			fullText += "* " + line + "\n";
		});
		ast["gulp-typescript-new-comment"] = undefined;

		trivia._fullText = fullText + originalFullText.substr(commentEndIndex);
		trivia._fullWidth = trivia._fullText.length;
	}

	return originalEmitComments.apply(this, arguments);
};
