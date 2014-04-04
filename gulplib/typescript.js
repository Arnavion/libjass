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
		this._diagnostics = [];

		this._scriptSnapshots = Object.create(null);
	};

	Compiler.prototype.addFiles = function (files) {
		var _this = this;

		var resolutionResults = TypeScript.ReferenceResolver.resolve(files, {
			resolveRelativePath: function (file, directory) {
				return path.resolve(directory, file);
			},
			fileExists: fs.existsSync.bind(fs),
			getScriptSnapshot: this._getScriptSnapshot.bind(this),
			getParentDirectory: path.dirname.bind(path)
		}, true);

		resolutionResults.resolvedFiles.unshift({
			path: path.resolve(typeScriptModulePath, "lib.d.ts"),
			referencedFiles: [],
			importedFiles: []
		});

		this._addDiagnostics(resolutionResults.diagnostics);

		this._innerCompiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), innerCompilerSettings);

		resolutionResults.resolvedFiles.forEach(function (resolvedFile) {
			_this._innerCompiler.addFile(resolvedFile.path, _this._getScriptSnapshot(resolvedFile.path), 0, 0, false, resolvedFile.referencedFiles);
		});

		return resolutionResults.resolvedFiles;
	};

	Compiler.prototype.compile = function (outputCodePath, outputSourceMapPath) {
		var iterator = this._innerCompiler.compile(path.resolve.bind(path));
		var outputFiles = [];

		while (iterator.moveNext()) {
			var result = iterator.current();

			this._addDiagnostics(result.diagnostics);

			result.outputFiles.forEach(function (outputFile) {
				var outputPath = null;

				switch (outputFile.fileType) {
					case TypeScript.OutputFileType.JavaScript:
						outputPath = outputCodePath;
						break;

					case TypeScript.OutputFileType.SourceMap:
						outputPath = outputSourceMapPath;
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

		if (this._diagnostics.some(function (diagnostic) { return diagnostic.info().category === 1; })) {
			throw new Error("There were one or more errors.");
		}

		return outputFiles;
	};

	Compiler.prototype.getDocument = function (resolvedFilePath) {
		return this._innerCompiler.getDocument(resolvedFilePath);
	};

	Compiler.prototype._addDiagnostics = function (newDiagnostics) {
		newDiagnostics.forEach(function (diagnostic) {
			var message = diagnostic.message();

			if (diagnostic.fileName()) {
				message = diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): " + message;
			}

			console.error(message);
		});

		this._diagnostics.push.apply(this._diagnostics, newDiagnostics);
	};

	Compiler.prototype._getScriptSnapshot = function (filename) {
		var scriptSnapshot = this._scriptSnapshots[filename];

		if (!scriptSnapshot) {
			var fileContents;

			try  {
				fileContents = fs.readFileSync(filename, { encoding: "utf8" });
			}
			catch (ex) {
				this._addDiagnostics([new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [filename, ex.message])]);
				fileContents = "";
			}

			scriptSnapshot = this._scriptSnapshots[filename] = TypeScript.ScriptSnapshot.fromString(fileContents);
		}

		return scriptSnapshot;
	};

	return Compiler;
}();

exports.Compiler = Compiler;

exports.gulp = function (outputCodePath, outputSourceMapPath) {
	var files = [];

	return Transform(function (file, encoding) {
		files.push(file.path);
	}, function () {
		var _this = this;

		try {
			console.log("Compiling " + JSON.stringify(files) + "...");

			var compiler = new Compiler();

			compiler.addFiles(files);

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

var __extends = function(d, b, m) {
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

	function Function(name, docNode, description, generics, parameters, returnType, isAbstract, isPrivate, isStatic) {
		_super.call(this, name);

		this.docNode = docNode;

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

var Constructor = function (_super) {
	__extends(Constructor, _super);

	function Constructor(name, docNode, description, generics, parameters, baseType, isAbstract, isPrivate) {
		_super.call(this, name);

		this.docNode = docNode;

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
	function Getter(docNode, description, type) {
		this.docNode = docNode;

		this.description = description;

		this.type = type;
	};

	return Getter;
}();

var Setter = function () {
	function Setter(docNode, description, parameters) {
		this.docNode = docNode;

		this.description = description;

		this.parameters = parameters;
	};

	return Setter;
}();

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

	Walker.prototype.visitClassDeclaration = function (node) {
		var name = node.identifier.text();

		var docNode = node.modifiers.item || node.classKeyword;
		var doc = this._parseJSDoc(docNode, NodeType.Constructor);
		if (doc === null) {
			return;
		}

		var modifiers = ((node.modifiers.item ? [node.modifiers.item] : node.modifiers.nodeOrTokens) || []).map(function (modifier) { return modifier.tokenKind; });
		var isPrivate = !modifiers.some(function (modifier) { return modifier === TypeScript.SyntaxKind["ExportKeyword"]; });

		var clazz = this._scope.enter(new Constructor(name, docNode, doc.rootDescription, doc.generics, doc.parameters, doc.baseType, doc.isAbstract, isPrivate));

		clazz.parent.members.push(clazz);

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

		var memberFunction = this._scope.enter(new Function(name, docNode, doc.rootDescription, doc.generics, doc.parameters, doc.returnType, doc.isAbstract, isPrivate, isStatic));

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

		var freeFunction = this._scope.enter(new Function(name, docNode, doc.rootDescription, doc.generics, doc.parameters, doc.returnType, doc.isAbstract, isPrivate, isStatic));

		freeFunction.parent.members.push(freeFunction);

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

		property.getter = new Getter(docNode, doc.rootDescription, doc.returnType);
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

		property.setter = new Setter(docNode, doc.rootDescription, doc.parameters);
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

		var baseType = null;

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

			var firstWordMatch = line.match(/^(\S+)(\s*)/);
			var firstWord = firstWordMatch[1];
			var remainingLine = line.substring(firstWordMatch[0].length);

			if (firstWord[0] === "@") {
				lastRead = null;
			}

			switch (firstWord) {
				case "@abstract":
					isAbstract = true;
					break;

				case "@constructor":
					break;

				case "@extends":
					var result = readType(remainingLine);
					baseType = result[0];
					break;

				case "@memberof":
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

				case "@private":
					break;

				case "@return":
					var result = readType(remainingLine);
					var type = result[0];
					var description = result[1];

					returnType = lastRead = new ReturnType(type, description);

					break;

				case "@static":
					break;

				case "@template":
					generics.push.apply(generics, remainingLine.split(/,/).map(function (word) { return word.trim(); }));
					break;

				case "@type":
					switch (nodeType) {
						case NodeType.Getter:
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
			baseType: baseType,
			returnType: returnType,
			isAbstract: isAbstract
		};
	};

	return Walker;
}(TypeScript.PositionTrackingWalker);

var walk = function (compiler, resolvedFiles) {
	var walker = new Walker();

	// Walk
	resolvedFiles.slice(1).forEach(function (resolvedFile) {
		var document = compiler.getDocument(resolvedFile.path);
		var sourceUnit = document.syntaxTree().sourceUnit();
		sourceUnit.accept(walker);
	});

	// Link base types
	var linkVisitor = function (current) {
		if (current instanceof Constructor) {
			if (current.baseType !== null && current.baseType.constructor === String) {
				var endOfNamespaceIndex = current.baseType.lastIndexOf(".");
				var className = current.baseType.substr(endOfNamespaceIndex + 1);
				current.baseType = walker.namespaces[current.baseType.substr(0, endOfNamespaceIndex)].members.filter(function (member) {
					return member.name === className;
				})[0];
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
	Constructor: Constructor,
	Property: Property,
	Getter: Getter,
	Setter: Setter,
	Parameter: Parameter,
	ReturnType: ReturnType,

	walk: walk
};
