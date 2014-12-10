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
var typeScriptJsPath = path.join(typeScriptModulePath, "tsc.js");

var ts = {};
vm.runInNewContext(fs.readFileSync(typeScriptJsPath, { encoding: "utf8" }).replace(
	"writeCommentRange(currentSourceFile, writer, comment, newLine);",
	"ts.gulpTypeScriptWriteCommentRange(currentSourceFile, writer, comment, newLine, writeCommentRange);"
).replace(
	"ts.executeCommandLine(sys.args);",
	"module.exports = ts;"
), {
	module: Object.defineProperty(Object.create(null), "exports", {
		get: function () { return ts; },
		set: function (value) { ts = value; },
	}),
	require: require,
	process: process,
	__filename: typeScriptJsPath,
	__dirname: typeScriptModulePath
});

var __extends = function (d, b) {
	for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	function __() {
		this.constructor = d;
	}
	__.prototype = b.prototype;
	d.prototype = new __();
};

var CompilerHost = function () {
	function CompilerHost() {
		this._outputCodePath = null;
		this._outputSourceMapPath = null;
		this._outputStream = null;
	}

	CompilerHost.prototype.setOutputs = function (codePath, sourceMapPath, stream) {
		this._outputCodePath = codePath;
		this._outputSourceMapPath = sourceMapPath;
		this._outputStream = stream;
	};

	// ts.CompilerHost members

	CompilerHost.prototype.getSourceFile = function (filename, languageVersion, onError) {
		var text;
		try {
			text = fs.readFileSync(filename, { encoding: "utf8" });
		}
		catch (ex) {
			onError(ex.message);
			text = "";
		}

		return ts.createSourceFile(filename, text, ts.ScriptTarget.ES5);
	};

	CompilerHost.prototype.getDefaultLibFilename = function () { return path.join(typeScriptModulePath, "lib.dom.d.ts"); };

	CompilerHost.prototype.writeFile = function (filename, data, writeByteOrderMark, onError) {
		var outputPath = null;

		switch (filename) {
			case "output.js":
				outputPath = this._outputCodePath;
				break;

			case "output.js.map":
				outputPath = this._outputSourceMapPath;
				break;

			default:
				return;
		}

		this._outputStream.push(new Vinyl({
			base: "/",
			path: outputPath,
			contents: new Buffer(data)
		}));
	};

	CompilerHost.prototype.getCurrentDirectory = function () { return path.resolve("."); };

	CompilerHost.prototype.getCanonicalFileName = function (filename) { return ts.normalizeSlashes(path.resolve(filename)); };

	CompilerHost.prototype.useCaseSensitiveFileNames = function () { return true; };

	CompilerHost.prototype.getNewLine = function () { return "\n"; };

	return CompilerHost;
}();

var WatchCompilerHost = function (_super) {
	__extends(WatchCompilerHost, _super);
	function WatchCompilerHost() {
		_super.call(this);

		this._sourceFiles = Object.create(null);
	}

	WatchCompilerHost.prototype.markFileChanged = function (filename) {
		delete this._sourceFiles[filename];
	};

	WatchCompilerHost.prototype.getSourceFile = function (filename, languageVersion, onError) {
		if (filename in this._sourceFiles) {
			return this._sourceFiles[filename];
		}

		var result = _super.prototype.getSourceFile.call(this, filename, languageVersion, onError);
		this._sourceFiles[filename] = result;
		return result;
	};

	return WatchCompilerHost;
}(CompilerHost);

var Compiler = function () {
	function Compiler(host) {
		if (host === undefined) {
			host = new CompilerHost();
		}

		var _this = this;

		this._options = {
			module: ts.ModuleKind.None,
			out: "output.js",
			noImplicitAny: true,
			sourceMap: true,
			target: ts.ScriptTarget.ES5,
		};

		this._filenames = [];

		this._host = host;

		this._program = null;
	}

	Compiler.prototype.addFile = function (file) {
		var filename = file;
		if (file.constructor !== String) {
			filename = file.path;
		}

		this._filenames.push(filename);
	};

	Compiler.prototype.compile = function () {
		this._program = ts.createProgram(this._filenames, this._options, this._host);

		var errors = this._program.getDiagnostics();
		var error = this._reportErrors(errors);
		if (error) {
			throw new Error("There were one or more errors.");
		}
	};

	Compiler.prototype.writeFiles = function (outputCodePath, outputSourceMapPath, outputStream) {
		var checker = this._program.getTypeChecker(true);

		var semanticErrors = checker.getDiagnostics();
		if (this._reportErrors(semanticErrors)) {
			throw new Error("There were one or more errors.");
		}

		this._host.setOutputs(outputCodePath, outputSourceMapPath, outputStream);

		var emitErrors = checker.emitFiles().errors;
		if (this._reportErrors(emitErrors)) {
			throw new Error("There were one or more errors.");
		}
	};

	Compiler.prototype.getSourceFiles = function () {
		return this._program.getSourceFiles();
	};

	Compiler.prototype._reportErrors = function (errors) {
		errors.forEach(function (error) {
			var message = error.messageText;

			if (error.file) {
				var position = error.file.getLineAndCharacterFromPosition(error.start);
				message = error.file.filename + "(" + position.line + "," + position.character + "): " + message;
			}

			console.error(message);
		});

		return errors.some(function (error) { return error.category === ts.DiagnosticCategory.Error; });
	};

	return Compiler;
}();

exports.Compiler = Compiler;

exports.gulp = function (outputCodePath, outputSourceMapPath, astModifier) {
	var compiler = new Compiler();

	var filenames = [];

	return Transform(function (file, encoding) {
		filenames.push(file.path);
		compiler.addFile(file);
	}, function () {
		try {
			console.log("Compiling " + JSON.stringify(filenames) + "...");

			compiler.compile();

			if (astModifier !== undefined) {
				astModifier(exports.AST.walk(compiler));
			}

			compiler.writeFiles(outputCodePath, outputSourceMapPath, this);

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
	});
};

exports.watch = function (outputCodePath, outputSourceMapPath) {
	var compilerHost = new WatchCompilerHost();

	var filenames = [];

	return Transform(function (file) {
		filenames.push(file.path);
	}, function (callback) {
		var _this = this;

		var compiler = compile();

		compiler.getSourceFiles().forEach(function (sourceFile) {
			watchFile(sourceFile.filename, fileChangedCallback, fileChangedCallback);
		});

		console.log("Listening for changes...");

		var changedFiles = [];

		function fileChangedCallback(filename) {
			compilerHost.markFileChanged(filename);

			if (changedFiles.length === 0) {
				setTimeout(function () {
					processChangedFiles();
				}, 100);
			}

			changedFiles.push(filename);
		}

		function processChangedFiles() {
			changedFiles = [];

			compile();
		}

		function compile() {
			try {
				console.log("Compiling " + JSON.stringify(filenames) + "...");

				var compiler = new Compiler(compilerHost);

				filenames.forEach(function (filename) {
					compiler.addFile(filename);
				});

				compiler.compile();
				compiler.writeFiles(outputCodePath, outputSourceMapPath, _this);

				console.log("Compile succeeded.");

				return compiler;
			}
			catch (ex) {
				console.error("Compile failed." + ex.stack);

				return null;
			}
		}
	});
};

var watchFile = function (filename, onChange, onDelete) {
	function watchFileCallback(currentFile, previousFile) {
		if (currentFile.mtime >= previousFile.mtime) {
			onChange(filename);
		}
		else {
			fs.unwatchFile(filename, watchFileCallback);

			onDelete(filename);
		}
	}

	fs.watchFile(filename, { interval: 500 }, watchFileCallback);
};

var Scoped = function () {
	function Scoped(name) {
		this.name = name;

		this.parent = null;
	}

	Object.defineProperty(Scoped.prototype, "fullName", {
		get: function () {
			if (this.parent === null) {
				return this.name;
			}

			if (this.parent instanceof Namespace) {
				return this.parent.getMemberFullName(this);
			}

			return this.parent.fullName + "." + this.name;
		},
		enumerable: true,
		configurable: true
	});

	return Scoped;
}();

var Namespace = function (_super) {
	__extends(Namespace, _super);

	function Namespace(name) {
		_super.call(this, name);

		this.members = [];
	}

	Namespace.prototype.getMemberFullName = function (member) {
		return this.fullName + "." + member.name;
	};

	return Namespace;
}(Scoped);

var Function = function (_super) {
	__extends(Function, _super);

	function Function(name, astNode, description, generics, parameters, returnType, isAbstract, isPrivate, isProtected, isStatic) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.parameters = parameters;

		this.returnType = returnType;

		this.isAbstract = isAbstract;
		this.isPrivate = isPrivate;
		this.isProtected = isProtected;
		this.isStatic = isStatic;
	}

	return Function;
}(Scoped);

var Interface = function (_super) {
	__extends(Interface, _super);

	function Interface(name, astNode, description, generics, baseTypes, isPrivate) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.baseTypes = baseTypes;

		this.isPrivate = isPrivate;

		this.members = [];
	}

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
	}

	return Constructor;
}(Scoped);

var Property = function (_super) {
	__extends(Property, _super);

	function Property(name) {
		_super.call(this, name);

		this.getter = null;

		this.setter = null;
	}

	return Property;
}(Scoped);

var Getter = function () {
	function Getter(astNode, description, type) {
		this.astNode = astNode;
		this.description = description;
		this.type = type;
	}

	return Getter;
}();

var Setter = function () {
	function Setter(astNode, description, type) {
		this.astNode = astNode;
		this.description = description;
		this.type = type;
	}

	return Setter;
}();

var Variable = function (_super) {
	__extends(Variable, _super);

	function Variable(name, astNode, description, type) {
		_super.call(this, name);

		this.astNode = astNode;
		this.description = description;
		this.type = type;
	}

	return Variable;
}(Scoped);

var Parameter = function () {
	function Parameter(name, description, type) {
		this.name = name;
		this.description = description;
		this.type = type;

		this.subParameters = [];
	}

	return Parameter;
}();

var ReturnType = function () {
	function ReturnType(description, type) {
		this.description = description;
		this.type = type;
	}

	return ReturnType;
}();

var Enum = function (_super) {
	__extends(Enum, _super);

	function Enum(name, astNode, description, isPrivate) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.isPrivate = isPrivate;

		this.members = [];
	}

	return Enum;
}(Scoped);

var EnumMember = function (_super) {
	__extends(EnumMember, _super);

	function EnumMember(name, description, value) {
		_super.call(this, name);

		this.description = description;

		this.value = value;
	}

	return EnumMember;
}(Scoped);

var TypeReference = function () {
	function TypeReference(type, generics) {
		this.type = type;
		this.generics = generics;
	}

	return TypeReference;
}();

var UnresolvedType = function () {
	function UnresolvedType(name, generics) {
		this.name = name;
		this.generics = generics;
	}

	return UnresolvedType;
}();

var WalkerScope = function () {
	function WalkerScope(globalNS) {
		this._scopes = [];

		this._globalNS = globalNS;
	}

	Object.defineProperty(WalkerScope.prototype, "current", {
		get: function () {
			return (this._scopes.length > 0) ? this._scopes[this._scopes.length - 1] : this._globalNS;
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

var Walker = function () {
	function Walker() {
		this._globalNS = new Namespace("Global");
		this._globalNS.getMemberFullName = function (member) {
			return member.name;
		};

		this._scope = new WalkerScope(this._globalNS);

		this.namespaces = Object.create(null);
		this.namespaces["Global"] = this._globalNS;

		this._currentSourceFile = null;
	}

	Walker.prototype.walk = function (node) {
		switch (node.kind) {
			case ts.SyntaxKind.Property:
				this._visitProperty(node);
				break;

			case ts.SyntaxKind.Method:
				this._visitMethod(node);
				break;

			case ts.SyntaxKind.Constructor:
				this._visitConstructor(node);
				break;

			case ts.SyntaxKind.GetAccessor:
				this._visitGetAccessor(node);
				break;

			case ts.SyntaxKind.SetAccessor:
				this._visitSetAccessor(node);
				break;

			case ts.SyntaxKind.VariableStatement:
				this._visitVariableStatement(node);
				break;

			case ts.SyntaxKind.FunctionDeclaration:
				this._visitFunctionDeclaration(node);
				break;

			case ts.SyntaxKind.ClassDeclaration:
				this._visitClassDeclaration(node);
				break;

			case ts.SyntaxKind.InterfaceDeclaration:
				this._visitInterfaceDeclaration(node);
				break;

			case ts.SyntaxKind.EnumDeclaration:
				this._visitEnumDeclaration(node);
				break;

			case ts.SyntaxKind.EnumMember:
				this._visitEnumMember(node);
				break;

			case ts.SyntaxKind.ModuleDeclaration:
				this._visitModuleDeclaration(node);
				break;

			case ts.SyntaxKind.SourceFile:
				this._visitSourceFile(node);
				break;

			case ts.SyntaxKind.CallSignature:
			case ts.SyntaxKind.IndexSignature:
			case ts.SyntaxKind.ExpressionStatement:
			case ts.SyntaxKind.IfStatement:
				break;

			default:
				console.error(node.kind, ts.SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	};

	Walker.prototype._visitProperty = function (node) {
		if ((node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private) {
			return;
		}

		var jsDoc = this._parseJSDoc(node);

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc("Field " + node.name.text + " has no @type annotation.");
			jsDoc.typeAnnotation = "*";
		}

		var variable = this._scope.enter(new Variable(node.name.text, node, jsDoc.rootDescription, jsDoc.typeAnnotation));

		variable.parent.members.push(variable);

		this._scope.leave();
	};

	Walker.prototype._visitMethod = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var parameters = this._connectParameters(node.parameters, jsDoc.parameters, function (parameterName) {
			return "Could not find @param annotation for " + parameterName + " on method " + node.name.text;
		});

		if (jsDoc.returnType === null && (node.type === undefined || node.type.kind !== ts.SyntaxKind.VoidKeyword)) {
			this._notifyIncorrectJsDoc("Missing @return annotation for method " + node.name.text);
			jsDoc.returnType = new ReturnType("", "*");
		}

		var isPrivate = (node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private;
		var isProtected = (node.flags & ts.NodeFlags.Protected) === ts.NodeFlags.Protected;
		var isStatic = (node.flags & ts.NodeFlags.Static) === ts.NodeFlags.Static;

		var generics = this._getGenerics(node);

		var method = this._scope.enter(new Function(node.name.text, node, jsDoc.rootDescription, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));

		method.parent.members.push(method);

		this._scope.leave();
	};

	Walker.prototype._visitConstructor = function (node) {
		var clazz = this._scope.current;

		if (Array.isArray(clazz.parameters)) {
			return;
		}

		clazz.parameters = this._connectParameters(node.parameters, clazz.parameters, function (parameterName) {
			return "Could not find @param annotation for " + parameterName + " on constructor in class " + clazz.fullName;
		});
	};

	Walker.prototype._visitGetAccessor = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var clazz = this._scope.current;

		var name = node.name.text;

		var property = clazz.members.filter(function (member) { return member.name === name; })[0];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members.push(property);

			this._scope.leave();
		}

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc("Getter " + node.name.text + " has no @type annotation.");
		}

		property.getter = new Getter(node, jsDoc.rootDescription, jsDoc.typeAnnotation);
	};

	Walker.prototype._visitSetAccessor = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var clazz = this._scope.current;

		var name = node.name.text;

		var property = clazz.members.filter(function (member) { return member.name === name; })[0];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members.push(property);

			this._scope.leave();
		}

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc("Setter " + node.name.text + " has no @type annotation.");
		}

		property.setter = new Setter(node, jsDoc.rootDescription, jsDoc.typeAnnotation);
	};

	Walker.prototype._visitVariableStatement = function (node) {
		var jsDoc = this._parseJSDoc(node);

		if (node.declarations.length > 1) {
			return;
		}

		if ((node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export) {
			return;
		}

		var declaration = node.declarations[0];

		var variable = this._scope.enter(new Variable(declaration.name.text, node, jsDoc.rootDescription, jsDoc.typeAnnotation));

		variable.parent.members.push(variable);

		this._scope.leave();
	};

	Walker.prototype._visitFunctionDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;
		var isProtected = (node.flags & ts.NodeFlags.Protected) === ts.NodeFlags.Protected;
		var isStatic = (node.flags & ts.NodeFlags.Static) === ts.NodeFlags.Static;

		var generics = this._getGenerics(node);

		var parameters = this._connectParameters(node.parameters, jsDoc.parameters, function (parameterName) {
			return "Could not find @param annotation for " + parameterName + " on function " + node.name.text;
		});

		if (jsDoc.returnType === null && node.type.kind !== ts.SyntaxKind.VoidKeyword) {
			this._notifyIncorrectJsDoc("Missing @return annotation for function " + node.name.text);
			jsDoc.returnType = new ReturnType("", "*");
		}

		var freeFunction = this._scope.enter(new Function(node.name.text, node, jsDoc.rootDescription, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));

		freeFunction.parent.members.push(freeFunction);

		this._scope.leave();
	};

	Walker.prototype._visitClassDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var baseType = null;
		if (node.baseType !== undefined) {
			baseType = new UnresolvedType(node.baseType.typeName.text, this._getGenerics(node.baseType));
		}

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var generics = this._getGenerics(node);

		var clazz = this._scope.enter(new Constructor(node.name.text, node, jsDoc.rootDescription, generics, jsDoc.parameters, baseType, jsDoc.isAbstract, isPrivate));

		clazz.parent.members.push(clazz);

		node.members.forEach(this.walk.bind(this));

		if (!Array.isArray(clazz.parameters)) {
			if (Object.keys(clazz.parameters).length > 0) {
				this._notifyIncorrectJsDoc("There are @param annotations on this class but it has no constructors.");
			}

			clazz.parameters = [];
		}

		this._scope.leave();
	};

	Walker.prototype._visitInterfaceDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var _this = this;

		var interfaceType;

		var baseTypes = [];
		if (node.baseTypes !== undefined) {
			baseTypes = node.baseTypes.map(function (baseType) { return new UnresolvedType(baseType.typeName.text, _this._getGenerics(baseType)); });
		}

		var existingInterfaceType = this._scope.current.members.filter(function (member) {
			return member instanceof Interface && member.name === node.name.text;
		})[0];

		if (existingInterfaceType !== undefined) {
			interfaceType = this._scope.enter(existingInterfaceType);

			interfaceType.baseTypes = baseTypes.reduce(function (baseTypes, newBaseType) {
				if (!baseTypes.some(function (baseType) {
					try {
						assert.deepEqual(baseType, newBaseType);
						return true;
					}
					catch (ex) {
						return false;
					}
				})) {
					baseTypes.push(newBaseType);
				}

				return baseTypes;
			}, interfaceType.baseTypes);
		}
		else {
			var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

			var generics = this._getGenerics(node);

			interfaceType = this._scope.enter(new Interface(node.name.text, node, jsDoc.rootDescription, generics, baseTypes, isPrivate));
			interfaceType.parent.members.push(interfaceType);
		}

		node.members.forEach(this.walk.bind(this));

		this._scope.leave();
	};

	Walker.prototype._visitEnumDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var enumType;

		var existingEnumType = this._scope.current.members.filter(function (member) {
			return member instanceof Enum && member.name === node.name.text;
		})[0];

		if (existingEnumType !== undefined) {
			enumType = this._scope.enter(existingEnumType);
		}
		else {
			var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

			enumType = this._scope.enter(new Enum(node.name.text, node, jsDoc.rootDescription, isPrivate));
			enumType.parent.members.push(enumType);
		}

		node.members.forEach(this.walk.bind(this));

		this._scope.leave();
	};

	Walker.prototype._visitEnumMember = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var value = (node.initializer === undefined) ? null : parseInt(node.initializer.text);

		var enumMember = this._scope.enter(new EnumMember(node.name.text, (jsDoc === null) ? "" : jsDoc.rootDescription, value));

		enumMember.parent.members.push(enumMember);

		this._scope.leave();
	};

	Walker.prototype._visitModuleDeclaration = function (node) {
		var _this = this;

		var namespace = _this._scope.enter(new Namespace(node.name.text));

		var existingNamespace = _this.namespaces[namespace.fullName];
		if (existingNamespace !== undefined) {
			_this._scope.leave();
			_this._scope.enter(existingNamespace);
		}
		else {
			_this.namespaces[namespace.fullName] = namespace;
		}

		switch (node.body.kind) {
			case ts.SyntaxKind.ModuleBlock:
				node.body.statements.forEach(this.walk.bind(this));
				break;

			case ts.SyntaxKind.ModuleDeclaration:
				this.walk(node.body);
				break;
		}

		_this._scope.leave();
	};

	Walker.prototype._visitSourceFile = function (node) {
		this._currentSourceFile = node;
		node.statements.forEach(this.walk.bind(this));
	};

	Walker.prototype._parseJSDoc = function (node) {
		var comments = oldGetLeadingCommentRangesOfNode(node, this._currentSourceFile);

		if (comments === undefined) {
			comments = [];
		}

		if (comments.length > 1) {
			comments = [comments[comments.length - 1]];
		}

		var _this = this;

		var comment;
		if (comments.length > 0) {
			comment = this._currentSourceFile.text.substring(comments[0].pos, comments[0].end);
		}
		else {
			comment = "";
		}

		var commentStartIndex = comment.indexOf("/**");
		var commentEndIndex = comment.lastIndexOf("*/");

		var lines;

		if (commentStartIndex === -1 || commentEndIndex === -1) {
			lines = [];
		}
		else {
			lines = comment.substring(commentStartIndex + 2, commentEndIndex).split("\n").map(function (line) {
				var match = line.match(/^[ \t]*\* (.*)/);
				if (match === null) {
					return "";
				}
				return match[1];
			}).filter(function (line) {
				return line.length > 0;
			});
		}

		var rootDescription = "";

		var parameters = Object.create(null);

		var typeAnnotation = null;

		var returnType = null;

		var isAbstract = false;

		var lastRead = null;

		lines.forEach(function (line) {
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
					var result = _this._readType(remainingLine);
					var type = result[0];
					remainingLine = result[1];

					var nameMatch = remainingLine.match(/(\S+)\s*/);
					var name = nameMatch[1];

					var description = remainingLine.substr(nameMatch[0].length);

					var subParameterMatch = name.match(/^(?:(.+)\.([^\.]+))|(?:(.+)\[("[^\[\]"]+")\])$/);
					if (subParameterMatch === null) {
						parameters[name] = lastRead = new Parameter(name, description, type);
					}
					else {
						var parentName = subParameterMatch[1] || subParameterMatch[3];
						var childName = subParameterMatch[2] || subParameterMatch[4];
						var parentParameter = parameters[parentName];
						parentParameter.subParameters.push(new Parameter(childName, description, type));
					}
					break;

				case "@return":
					var result = _this._readType(remainingLine);

					returnType = lastRead = new ReturnType(result[1], result[0]);

					break;

				case "@type":
					var result = _this._readType(remainingLine);
					typeAnnotation = result[0];
					break;

				default:
					if (lastRead !== null) {
						lastRead.description += "\n" + line;
					}
					else {
						rootDescription += ((rootDescription.length > 0) ? "\n" : "") + line;
					}
					break;
			}
		});

		return {
			rootDescription: rootDescription,
			isAbstract: isAbstract,
			parameters: parameters,
			returnType: returnType,
			typeAnnotation: typeAnnotation,
		};
	};

	Walker.prototype._readType = function (remainingLine) {
		if (remainingLine[0] !== "{") {
			return ["*", remainingLine];
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

	Walker.prototype._getGenerics = function (node) {
		if (node.typeParameters !== undefined) {
			return node.typeParameters.map(function (typeParameter) { return typeParameter.name.text; });
		}

		if (node.typeArguments !== undefined) {
			return node.typeArguments.filter(function (typeArgument) { return typeArgument.typeName !== undefined; }).map(function (typeArgument) { return typeArgument.typeName.text; });
		}

		return [];
	};

	Walker.prototype._connectParameters = function (astParameters, jsDocParameters, onMissingMessageCallback) {
		var _this = this;

		return astParameters.map(function (parameter) {
			var parameterName = (parameter.name.text[0] === "_") ? parameter.name.text.substr(1) : parameter.name.text;

			var jsDocParameter = jsDocParameters[parameterName];

			if (jsDocParameter === undefined) {
				_this._notifyIncorrectJsDoc(onMissingMessageCallback.call(_this, parameterName));
				jsDocParameter = new Parameter(parameterName, "*", "");
			}

			return jsDocParameter;
		});
	};

	Walker.prototype._notifyIncorrectJsDoc = function (message) {
		var filename = path.basename(this._currentSourceFile.filename);
		if (filename === "lib.core.d.ts" || filename === "lib.dom.d.ts") {
			return;
		}

		throw new Error(
			filename + ": " +
			this._scope.current.fullName + ": " +
			message
		);
	};

	Walker.prototype.link = function () {
		var _this = this;

		Object.keys(_this.namespaces).forEach(function (namespaceName) {
			_this.namespaces[namespaceName].members.forEach(function (current) {
				if (current instanceof Constructor) {
					if (current.baseType instanceof UnresolvedType) {
						current.baseType = _this._resolveTypeReference(current.baseType, current, _this.namespaces);
					}
				}

				else if (current instanceof Interface) {
					current.baseTypes = current.baseTypes.map(function (baseType) {
						if (baseType instanceof UnresolvedType) {
							baseType = _this._resolveTypeReference(baseType, current, _this.namespaces);
						}

						return baseType;
					});
				}

				else if (current instanceof Enum) {
					var value = 0;
					current.members.forEach(function (member) {
						if (member.value === null) {
							member.value = value;
						}
						else {
							value = member.value;
						}

						value++;
					});
				}
			});
		});
	};

	Walker.prototype._resolveTypeReference = function (unresolvedType, current, namespaces) {
		var result = null;

		var ns = current.parent;
		while (result === null) {
			var fullName = ns.fullName + "." + unresolvedType.name;

			var endOfNamespaceIndex = fullName.lastIndexOf(".");

			var existingNamespace = namespaces[fullName.substr(0, endOfNamespaceIndex)];

			if (existingNamespace !== undefined) {
				var className = fullName.substr(endOfNamespaceIndex + 1);

				result = existingNamespace.members.filter(function (member) {
					return member.name === className;
				})[0] || null;
			}

			if (ns === null) {
				ns = this._globalNS;
			}
			else if (ns === this._globalNS) {
				break;
			}
			else {
				ns = ns.parent;
			}
		}

		if (result === null) {
			throw new Error("Base type [" + unresolvedType.name + "] of type [" + current.fullName + "] not found.");
		}

		return new TypeReference(result, unresolvedType.generics);
	};

	return Walker;
}();

var walk = function (compiler, resolvedFilenames) {
	var sourceFiles = compiler.getSourceFiles();
	var walker = new Walker();

	// Walk
	sourceFiles.forEach(function (sourceFile) {
		walker.walk(sourceFile);
	});

	// Link base types and set enum member values if unspecified.
	walker.link();

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
	Enum: Enum,
	EnumMember: EnumMember,
	TypeReference: TypeReference,

	walk: walk
};

var oldGetLeadingCommentRangesOfNode = ts.getLeadingCommentRangesOfNode.bind(ts);
ts.getLeadingCommentRangesOfNode = function (node, sourceFileOfNode) {
	var result = oldGetLeadingCommentRangesOfNode(node, sourceFileOfNode);

	if (result !== undefined) {
		var newComments = node["gulp-typescript-new-comment"];
		if (newComments !== undefined) {
			result[result.length - 1]["gulp-typescript-new-comment"] = newComments;
		}
	}

	return result;
};

ts.gulpTypeScriptWriteCommentRange = function (currentSourceFile, writer, comment, newLine, writeCommentRange) {
	var newComments = comment["gulp-typescript-new-comment"];

	var oldWriterRawWrite = writer.rawWrite.bind(writer);
	var oldWriterWrite = writer.write.bind(writer);

	if (newComments !== undefined) {
		newComments.unshift("");

		var indents = [];

		writer.rawWrite = function (str) {
			indents.push(str);

			oldWriterRawWrite(str);
		};

		writer.write = function (str) {
			if (str === "*/") {
				newComments.forEach(function (newComment) {
					oldWriterWrite("*" + ((newComment.length > 0) ? (" " + newComment) : ""));
					writer.writeLine();
					indents.forEach(function (indent) {
						oldWriterRawWrite(indent);
					});
				});
			}

			indents.length = 0;

			oldWriterWrite(str);
		};
	}

	writeCommentRange(currentSourceFile, writer, comment, newLine);

	writer.rawWrite = oldWriterRawWrite;
	writer.write = oldWriterWrite;
};
