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
var typeScriptJsPath = path.join(typeScriptModulePath, "typescriptServices.js");

var ts = {};
vm.runInNewContext(fs.readFileSync(typeScriptJsPath, { encoding: "utf8" }).replace(
	"function writeCommentRange(",
	"ts.writeCommentRange = function ("
).replace(/writeCommentRange(?=[();])/g, "ts.writeCommentRange"), {
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
		this._outputPathsRelativeTo = null;
	}

	CompilerHost.prototype.setOutputStream = function (outputStream) {
		this._outputStream = outputStream;
	};

	CompilerHost.prototype.setOutputPathsRelativeTo = function (path) {
		this._outputPathsRelativeTo = path;
	};

	// ts.CompilerHost members

	CompilerHost.prototype.getSourceFile = function (filename, languageVersion, onError) {
		var text;
		try {
			text = fs.readFileSync(filename, { encoding: "utf8" });

			if (path.basename(filename) === "lib.dom.d.ts") {
				var startOfES6Extensions = text.indexOf("/// IE11 ECMAScript Extensions");
				var endOfES6Extensions = text.indexOf("/// ECMAScript Internationalization API", startOfES6Extensions);
				text = text.substring(0, startOfES6Extensions) + text.substring(endOfES6Extensions);
			}
		}
		catch (ex) {
			if (onError) {
				onError(ex.message);
			}
		}

		return (text !== undefined) ? ts.createSourceFile(filename, text, ts.ScriptTarget.ES5) : undefined;
	};

	CompilerHost.prototype.getDefaultLibFilename = function () { return path.join(typeScriptModulePath, "lib.dom.d.ts"); };

	CompilerHost.prototype.writeFile = function (filename, data, writeByteOrderMark, onError) {
		this._outputStream.push(new Vinyl({
			base: this._outputPathsRelativeTo,
			path: filename,
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
	function WatchCompilerHost(onChangeCallback) {
		_super.call(this);

		this._onChangeCallback = onChangeCallback;

		this._sourceFiles = Object.create(null);

		this._filesChangedSinceLast = [];
	}

	WatchCompilerHost.prototype.getSourceFile = function (filename, languageVersion, onError) {
		if (filename in this._sourceFiles) {
			return this._sourceFiles[filename];
		}

		var result = _super.prototype.getSourceFile.call(this, filename, languageVersion, onError);
		if (result !== undefined) {
			this._sourceFiles[filename] = result;
		}

		this._watchFile(filename);

		return result;
	};

	WatchCompilerHost.prototype._watchFile = function (filename) {
		var _this = this;

		function watchFileCallback(currentFile, previousFile) {
			if (currentFile.mtime >= previousFile.mtime) {
				_this._fileChangedCallback(filename);
			}
			else {
				fs.unwatchFile(filename, watchFileCallback);

				_this._fileChangedCallback(filename);
			}
		}

		fs.watchFile(filename, { interval: 500 }, watchFileCallback);
	}

	WatchCompilerHost.prototype._fileChangedCallback = function (filename) {
		var _this = this;

		delete this._sourceFiles[filename];

		if (this._filesChangedSinceLast.length === 0) {
			setTimeout(function () {
				_this._filesChangedSinceLast = [];

				_this._onChangeCallback();
			}, 100);
		}

		this._filesChangedSinceLast.push(filename);
	}

	return WatchCompilerHost;
}(CompilerHost);

var Compiler = function () {
	function Compiler(host) {
		if (host === undefined) {
			host = new CompilerHost();
		}

		var _this = this;

		this._host = host;

		this._projectRoot = null;
		this._program = null;
		this._checker = null;
	}

	Compiler.prototype.compile = function (projectConfigFile) {
		this._projectRoot = path.dirname(projectConfigFile.path);
		var projectConfig = parseConfigFile(JSON.parse(projectConfigFile.contents.toString()), this._projectRoot);

		if (projectConfig.errors.length > 0) {
			this._reportErrors(projectConfig.errors);
			throw new Error("There were on or more errors while parsing the project file.");
		}

		this._host.setOutputPathsRelativeTo(this._projectRoot);

		this._program = ts.createProgram(projectConfig.filenames, projectConfig.options, this._host);

		var errors = this._program.getDiagnostics();
		var error = this._reportErrors(errors);
		if (error) {
			throw new Error("There were one or more errors.");
		}

		this._checker = this._program.getTypeChecker(true);

		var errors = this._checker.getDiagnostics();
		if (this._reportErrors(errors)) {
			throw new Error("There were one or more errors.");
		}
	};

	Compiler.prototype.writeFiles = function (outputStream) {
		this._host.setOutputStream(outputStream);

		var emitErrors = this._checker.emitFiles().diagnostics;
		if (this._reportErrors(emitErrors)) {
			throw new Error("There were one or more errors.");
		}
	};

	Object.defineProperties(Compiler.prototype, {
		projectRoot: { get: function () { return this._projectRoot; } },
		typeChecker: { get: function () { return this._checker; } },
		sourceFiles: { get: function () { return this._program.getSourceFiles(); } },
	});

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

exports.gulp = function (root, rootNamespaceName) {
	var compiler = new Compiler();

	return Transform(function (file) {
		try {
			console.log("Compiling " + file.path + "...");

			compiler.compile(file);

			var walkResult = exports.AST.walk(compiler, root, rootNamespaceName);
			addJSDocComments(walkResult.namespaces);

			compiler.writeFiles(this);

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

exports.watch = function (root, rootNamespaceName) {
	return Transform(function (file) {
		var _this = this;

		var compile = function () {
			console.log("Compiling " + file.path + "...");

			compiler.compile(file);

			compiler.writeFiles(_this);

			console.log("Compile succeeded.");

			_this.push(new Vinyl({
				base: this._outputPathsRelativeTo,
				path: "END",
				contents: new Buffer("")
			}));
		};

		var compilerHost = new WatchCompilerHost(function () {
			try {
				compile();
			}
			catch (ex) {
				console.error("Compile failed." + ex.stack);
			}
		});

		var compiler = new Compiler(compilerHost);

		try {
			compile();

			console.log("Listening for changes...");
		}
		catch (ex) {
			if (ex instanceof Error) {
				throw ex;
			}
			else {
				throw new Error("Internal compiler error: " + ex.stack + "\n");
			}
		}
	}, function (callback) {
	});
};

function addJSDocComments(namespaces) {
	function visitor(current) {
		var newComments = [];

		if (current instanceof Namespace) {
			Object.keys(current.members).forEach(function (memberName) {
				visitor(current.members[memberName]);
			});
		}
		else if (current instanceof Constructor) {
			newComments.push("@constructor");

			if (current.baseType !== null) {
				newComments.push(
					"@extends {" +
					current.baseType.type.fullName +
					(current.baseType.generics.length > 0 ? (".<" + current.baseType.generics.join(", ") + ">") : "") +
					"}"
				);
			}

			if (current.interfaces.length > 0) {
				current.interfaces.forEach(function (interface) {
					newComments.push(
						"@implements {" +
						interface.type.fullName +
						(interface.generics.length > 0 ? (".<" + interface.generics.join(", ") + ">") : "") +
						"}"
					);
				});
			}

			if (current.parent !== null) {
				newComments.push("@memberOf " + current.parent.fullName);
			}

			Object.keys(current.members).forEach(function (memberName) {
				visitor(current.members[memberName]);
			});
		}
		else if (current instanceof Enum) {
			newComments.push("@enum");
		}

		if ((current.generics !== undefined) && (current.generics.length > 0)) {
			newComments.push("@template " + current.generics.join(", "));
		}

		if (current.isPrivate) {
			newComments.push("@private");
		}

		if (current.isProtected) {
			newComments.push("@protected");
		}

		if (current.isStatic) {
			newComments.push("@static");
		}

		if (newComments.length > 0) {
			current.astNode["gulp-typescript-new-comment"] = newComments;
		}
	};

	Object.keys(namespaces).forEach(function (namespaceName) { visitor(namespaces[namespaceName]); });
}

var parseConfigFile = function (json, basePath) {
	var options = json.compilerOptions;
	options.module = ts.ModuleKind[options.module];
	options.target = ts.ScriptTarget[options.target];

	var filenames = [];

	function walk(directory) {
		fs.readdirSync(directory).forEach(function (entry) {
			var entryPath = path.join(directory, entry);
			var stat = fs.lstatSync(entryPath);
			if (stat.isFile()) {
				if (path.extname(entry) === ".ts") {
					filenames.push(entryPath);
				}
			}
			else if (stat.isDirectory()) {
				walk(entryPath);
			}
		});
	}

	walk(basePath);

	return {
		options: options,
		filenames: filenames,
		errors: [],
	};
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

var Module = (function (_super) {
	function Module(name) {
		_super.call(this, name);

		this.fullName = name;

		this.members = Object.create(null);
	}

	return Module;
})(Scoped);

var Reference = (function () {
	function Reference(module, name, isPrivate) {
		this.module = module;
		this.name = name;
		this.isPrivate = isPrivate;
	}

	return Reference;
})();

var Namespace = function (_super) {
	__extends(Namespace, _super);

	function Namespace(name) {
		_super.call(this, name);

		this.members = Object.create(null);
	}

	// Overridden for globalNS to return just member.name
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

		this.members = Object.create(null);
	}

	return Interface;
}(Scoped);

var Constructor = function (_super) {
	__extends(Constructor, _super);

	function Constructor(name, astNode, description, generics, parameters, baseType, interfaces, isAbstract, isPrivate) {
		_super.call(this, name);

		this.astNode = astNode;

		this.description = description;

		this.generics = generics;

		this.parameters = parameters;

		this.baseType = baseType;
		this.interfaces = interfaces;

		this.isAbstract = isAbstract;
		this.isPrivate = isPrivate;

		this.members = Object.create(null);
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

var Walker = function () {
	function Walker(checker) {
		this._globalNS = new Namespace("Global");
		this._globalNS.getMemberFullName = function (member) {
			return member.name;
		};

		this._scope = new WalkerScope();

		this.namespaces = Object.create(null);
		this.namespaces[this._globalNS.fullName] = this._globalNS;

		this.modules = Object.create(null);

		this._currentSourceFile = null;
		this._currentModule = null;

		this._checker = checker;
	}

	Walker.prototype.walk = function (sourceFile, module) {
		if (!(module in this.modules)) {
			this.modules[module] = new Module(module);
		}

		this._currentModule = this._scope.enter(this.modules[module]);
		this._currentSourceFile = sourceFile;

		sourceFile.statements.forEach(this._walk.bind(this));

		this._scope.leave();
	};

	Walker.prototype._walk = function (node) {
		switch (node.kind) {
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

			case ts.SyntaxKind.ImportDeclaration:
				this._visitImportDeclaration(node);
				break;

			case ts.SyntaxKind.ExportAssignment:
				this._visitExportAssignment(node);
				break;

			case ts.SyntaxKind.ExpressionStatement:
			case ts.SyntaxKind.IfStatement:
				break;

			default:
				console.error(node.kind, ts.SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	};

	Walker.prototype._walkClassMember = function (node) {
		switch (node.kind) {
			case ts.SyntaxKind.Property:
				this._visitProperty(node);
				break;

			case ts.SyntaxKind.Method:
				this._visitMethod(node);
				break;

			case ts.SyntaxKind.GetAccessor:
				this._visitGetAccessor(node);
				break;

			case ts.SyntaxKind.SetAccessor:
				this._visitSetAccessor(node);
				break;

			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.Parameter:
			case ts.SyntaxKind.Constructor:
				break;

			default:
				console.error(node.kind, ts.SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	};

	Walker.prototype._walkInterfaceMember = function (node) {
		switch (node.kind) {
			case ts.SyntaxKind.Property:
				this._visitProperty(node);
				break;

			case ts.SyntaxKind.Method:
				this._visitMethod(node);
				break;

			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.CallSignature:
			case ts.SyntaxKind.ConstructSignature:
			case ts.SyntaxKind.IndexSignature:
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

		variable.parent.members[variable.name] = variable;

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

		var generics = this._getGenericsOfSignatureDeclaration(node);

		var method = this._scope.enter(new Function(node.name.text, node, jsDoc.rootDescription, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));

		method.parent.members[method.name] = method;

		this._scope.leave();
	};

	Walker.prototype._visitGetAccessor = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var clazz = this._scope.current;

		var name = node.name.text;

		var property = clazz.members[name];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members[property.name] = property;

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

		var property = clazz.members[name];
		if (property === undefined) {
			this._scope.enter(property = new Property(name));

			clazz.members[property.name] = property;

			this._scope.leave();
		}

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc("Setter " + node.name.text + " has no @type annotation.");
		}

		property.setter = new Setter(node, jsDoc.rootDescription, jsDoc.typeAnnotation);
	};

	Walker.prototype._visitVariableStatement = function (node) {
		if (node.declarations.length > 1) {
			return;
		}

		var declaration = node.declarations[0];
		if ((declaration.flags & ts.NodeFlags.Ambient) === ts.NodeFlags.Ambient) {
			return;
		}

		var jsDoc = this._parseJSDoc(node);
		if (jsDoc.typeAnnotation === null) {
			return;
		}

		var variable = this._scope.enter(new Variable(declaration.name.text, node, jsDoc.rootDescription, jsDoc.typeAnnotation));

		variable.parent.members[variable.name] = variable;

		this._scope.leave();
	};

	Walker.prototype._visitFunctionDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;
		var isProtected = (node.flags & ts.NodeFlags.Protected) === ts.NodeFlags.Protected;
		var isStatic = (node.flags & ts.NodeFlags.Static) === ts.NodeFlags.Static;

		var generics = this._getGenericsOfSignatureDeclaration(node);

		var parameters = this._connectParameters(node.parameters, jsDoc.parameters, function (parameterName) {
			return "Could not find @param annotation for " + parameterName + " on function " + node.name.text;
		});

		if (jsDoc.returnType === null && node.type.kind !== ts.SyntaxKind.VoidKeyword) {
			this._notifyIncorrectJsDoc("Missing @return annotation for function " + node.name.text);
			jsDoc.returnType = new ReturnType("", "*");
		}

		var freeFunction = this._scope.enter(new Function(node.name.text, node, jsDoc.rootDescription, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));

		this._currentModule.members[freeFunction.name] = freeFunction;

		this._scope.leave();
	};

	Walker.prototype._visitClassDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var _this = this;

		var baseType = ts.getClassBaseTypeNode(node) || null;
		if (baseType !== null) {
			baseType = new UnresolvedType(baseType.typeName.text, this._getGenericsOfTypeReferenceNode(baseType));
		}

		var interfaces = (ts.getClassImplementedTypeNodes(node) || []).map(function (type) {
			return new UnresolvedType(type.typeName.text, _this._getGenericsOfTypeReferenceNode(type));
		});

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var type = this._checker.getTypeAtLocation(node);

		var generics = this._getGenericsOfInterfaceType(type);

		var parameters = [];

		if (type.symbol.members.__constructor !== undefined) {
			parameters = this._connectParameters(type.symbol.members.__constructor.declarations[0].parameters, jsDoc.parameters, function (parameterName) {
				return "Could not find @param annotation for " + parameterName + " on constructor in class " + node.name.text;
			});
		}
		else if (Object.keys(jsDoc.parameters).length > 0) {
			this._notifyIncorrectJsDoc("There are @param annotations on this class but it has no constructors.");
		}

		var clazz = this._scope.enter(new Constructor(node.name.text, node, jsDoc.rootDescription, generics, parameters, baseType, interfaces, jsDoc.isAbstract, isPrivate));

		this._currentModule.members[clazz.name] = clazz;

		ts.forEachValue(type.symbol.exports, function (symbol) {
			if (symbol.name === "prototype") {
				return;
			}

			symbol.declarations.forEach(function (declaration) {
				_this._walkClassMember(declaration);
			});
		});

		ts.forEachValue(type.symbol.members, function (symbol) {
			symbol.declarations.forEach(function (declaration) {
				_this._walkClassMember(declaration);
			});
		});

		this._scope.leave();
	};

	Walker.prototype._visitInterfaceDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var _this = this;

		var baseTypes = (ts.getInterfaceBaseTypeNodes(node) || []).map(function (type) {
			return new UnresolvedType(type.typeName.text, _this._getGenericsOfTypeReferenceNode(type));
		});

		var existingInterfaceType = this._scope.current.members[node.name.text];
		if (existingInterfaceType !== undefined) {
			return;
		}

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var type = this._checker.getTypeAtLocation(node);

		var generics = this._getGenericsOfInterfaceType(type);

		var interfaceType = this._scope.enter(new Interface(node.name.text, node, jsDoc.rootDescription, generics, baseTypes, isPrivate));
		this._currentModule.members[interfaceType.name] = interfaceType;

		ts.forEachValue(type.symbol.members, function (symbol) {
			symbol.declarations.forEach(function (declaration) {
				_this._walkInterfaceMember(declaration);
			});
		});

		this._scope.leave();
	};

	Walker.prototype._visitEnumDeclaration = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var _this = this;

		var existingEnumType = this._currentModule.members[node.name.text];
		if (existingEnumType !== undefined) {
			return;
		}

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var enumType = this._scope.enter(new Enum(node.name.text, node, jsDoc.rootDescription, isPrivate));
		this._currentModule.members[enumType.name] = enumType;

		var type = this._checker.getTypeAtLocation(node);

		ts.forEachValue(type.symbol.exports, function (symbol) {
			_this._visitEnumMember(symbol.declarations[0]);
		});

		this._scope.leave();
	};

	Walker.prototype._visitEnumMember = function (node) {
		var jsDoc = this._parseJSDoc(node);

		var value = (node.initializer === undefined) ? null : parseInt(node.initializer.text);

		var enumMember = this._scope.enter(new EnumMember(node.name.text, (jsDoc === null) ? "" : jsDoc.rootDescription, value));

		enumMember.parent.members.push(enumMember);

		this._scope.leave();
	};

	Walker.prototype._visitImportDeclaration = function (node) {
		var importReference = null;

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		if (node.moduleReference.expression) {
			var importPath = this._resolve(node.moduleReference.expression.text);
			importReference = new Reference(importPath, "default", isPrivate);
		}
		else {
			var moduleImportReference = this._currentModule.members[node.moduleReference.left.text];
			importReference = new Reference(moduleImportReference.module, node.name.text, isPrivate);
		}

		this._currentModule.members[node.name.text] = importReference;
	};

	Walker.prototype._visitExportAssignment = function (node) {
		var exportedMember = this._currentModule.members[node.exportName.text];
		delete this._currentModule.members[node.exportName.text];
		this._currentModule.members.default = exportedMember;
		exportedMember.isPrivate = false;
	};

	Walker.prototype._resolve = function (relativeModuleName) {
		var result = ts.normalizeSlashes(path.join(this._currentModule.name, "../" + relativeModuleName));

		if (result[0] !== ".") {
			result = "./" + result;
		}

		return result;
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

	Walker.prototype._getGenericsOfSignatureDeclaration = function (signatureDeclaration) {
		if (signatureDeclaration.typeParameters === undefined) {
			return [];
		}

		return signatureDeclaration.typeParameters.map(function (typeParameter) {
			return typeParameter.name.text;
		});
	};

	Walker.prototype._getGenericsOfTypeReferenceNode = function (typeReferenceNode) {
		if (typeReferenceNode.typeArguments === undefined) {
			return [];
		}

		var type = this._checker.getTypeAtLocation(typeReferenceNode);
		return type.typeArguments.map(function (typeArgument) {
			if (typeArgument.intrinsicName !== undefined) {
				return typeArgument.intrinsicName;
			}

			return typeArgument.symbol.name;
		});
	};

	Walker.prototype._getGenericsOfInterfaceType = function (interfaceType) {
		if (interfaceType.typeParameters === undefined) {
			return [];
		}

		return interfaceType.typeParameters.map(function (typeParameter) {
			return typeParameter.symbol.name;
		});
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

	Walker.prototype.link = function (rootNamespaceName) {
		var _this = this;

		Object.keys(this.modules).forEach(function (moduleName) {
			var module = _this.modules[moduleName]; 
			Object.keys(module.members).forEach(function (memberName) {
				var member = module.members[memberName];

				if (member instanceof Constructor) {
					if (member.baseType instanceof UnresolvedType) {
						member.baseType = _this._resolveTypeReference(member.baseType, member, module);
					}

					member.interfaces = member.interfaces.map(function (interface) {
						if (interface instanceof UnresolvedType) {
							interface = _this._resolveTypeReference(interface, member, module);
						}

						return interface;
					});
				}

				else if (member instanceof Interface) {
					member.baseTypes = member.baseTypes.map(function (baseType) {
						if (baseType instanceof UnresolvedType) {
							baseType = _this._resolveTypeReference(baseType, member, module);
						}

						return baseType;
					});
				}

				else if (member instanceof Enum) {
					var value = 0;
					member.members.forEach(function (member) {
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

		_this.namespaces[rootNamespaceName] = this._scope.enter(new Namespace(rootNamespaceName));
		this._moduleToNamespace(this.modules["./index"], rootNamespaceName);
		this._scope.leave();
	};

	Walker.prototype._moduleToNamespace = function (module, rootNamespaceName) {
		var _this = this;

		Object.keys(module.members).forEach(function (memberName) {
			var member = module.members[memberName];

			if (member instanceof Reference) {
				if (member.isPrivate) {
					return;
				}

				if (member.name === "default" && _this.modules[member.module].members.default === undefined) {
					var newNamespace = _this._scope.enter(new Namespace(memberName));

					var existingNamespace = _this.namespaces[newNamespace.fullName];
					if (existingNamespace !== undefined) {
						_this._scope.leave();
						_this._scope.enter(existingNamespace);
					}
					else {
						_this.namespaces[newNamespace.fullName] = newNamespace;
					}

					_this._moduleToNamespace(_this.modules[member.module], rootNamespaceName);

					_this._scope.leave();
				}
				else {
					var actualMember = _this.modules[member.module].members[member.name];

					_this._scope.enter(actualMember);
					_this._scope.leave();
					_this._scope.current.members[actualMember.name] = actualMember;
				}
			}
			else {
				_this._scope.enter(member);
				_this._scope.leave();
				_this._scope.current.members[member.name] = member;
			}
		});
	};

	Walker.prototype._resolveTypeReference = function (unresolvedType, member, module) {
		var result = module.members[unresolvedType.name];
		if (result instanceof Reference) {
			result = this.modules[result.module].members[result.name];
		}

		return new TypeReference(result, unresolvedType.generics);
	};

	return Walker;
}();

var walk = function (compiler, root, rootNamespaceName) {
	var sourceFiles = compiler.sourceFiles;
	var rootFilename = ts.normalizeSlashes(path.resolve(root));
	var rootSourceFile = sourceFiles.filter(function (sourceFile) {
		return sourceFile.filename === rootFilename;
	})[0];

	var walker = new Walker(compiler.typeChecker);

	// Walk
	sourceFiles.forEach(function (sourceFile) {
		if (
			path.basename(sourceFile.filename) === "lib.core.d.ts" ||
			path.basename(sourceFile.filename) === "lib.dom.d.ts" ||
			sourceFile.filename.substr(-"references.d.ts".length) === "references.d.ts"
		) {
			return;
		}

		var moduleName = ts.normalizeSlashes(path.relative(compiler.projectRoot, sourceFile.filename));
		moduleName = moduleName.substr(0, moduleName.length - ".ts".length);
		if (moduleName[0] !== ".") {
			moduleName = "./" + moduleName;
		}

		walker.walk(sourceFile, moduleName);
	});

	// Link base types and set enum member values if unspecified.
	walker.link(rootNamespaceName);

	// Return types
	return { namespaces: walker.namespaces, modules: walker.modules };
};

exports.AST = {
	Module: Module,
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

var FakeSourceFile = (function () {
	function FakeSourceFile(originalSourceFile) {
		this._text = originalSourceFile.text;
		this._originalLength = this._text.length;
		this._originalLastLine = originalSourceFile.getLineAndCharacterFromPosition(this._text.length);

		this._lastLine = this._originalLastLine.line;

		this._lineStarts = [[this._text.length, this._lastLine]];
	}

	FakeSourceFile.prototype.addComment = function (originalComment, newComments) {
		var pos = this._text.length;

		this._text += "/**\n";
		this._lineStarts.push([this._text.length, ++this._lastLine]);

		var originalCommentLines = this._text.substring(originalComment.pos, originalComment.end).split("\n");
		originalCommentLines.shift();
		originalCommentLines = originalCommentLines.map(function (originalCommentLine) {
			return originalCommentLine.replace(/^\s+/, " ");
		});

		if (originalCommentLines.length > 1) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " *");
		}

		newComments.forEach(function (newComment) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " * " + newComment);
		}, this);

		originalCommentLines.forEach(function (newCommentLine) {
			this._text += newCommentLine + "\n";
			this._lineStarts.push([this._text.length, ++this._lastLine]);
		}, this);

		this._text += "\n";
		this._lineStarts.push([this._text.length, ++this._lastLine]);

		var end = this._text.length;

		return { pos: pos, end: end, hasTrailingNewLine: true, sourceFile: this };
	};

	Object.defineProperty(FakeSourceFile.prototype, "text", {
		get: function () { return this._text; },
		enumerable: true,
		configurable: true
	});

	FakeSourceFile.prototype.getLineAndCharacterFromPosition = function (position) {
		for (var i = 0; i < this._lineStarts.length; i++) {
			if (i === this._lineStarts.length - 1 || position >= this._lineStarts[i][0] && position < this._lineStarts[i + 1][0]) {
				return { line: this._lineStarts[i][1], character: position - this._lineStarts[i][0] + 1 };
			}
		}
	};

	FakeSourceFile.prototype.getPositionFromLineAndCharacter = function (line, character) {
		return this._lineStarts[line - this._originalLastLine.line][0] + character - 1;
	};

	return FakeSourceFile;
})();

var fakeSourceFiles = Object.create(null);

var oldGetLeadingCommentRangesOfNode = ts.getLeadingCommentRangesOfNode.bind(ts);
ts.getLeadingCommentRangesOfNode = function (node, sourceFileOfNode) {
	sourceFileOfNode = sourceFileOfNode || ts.getSourceFileOfNode(node);

	if (node["gulp-typescript-new-comment"] !== undefined) {
		var originalComments = oldGetLeadingCommentRangesOfNode(node, sourceFileOfNode);
		if (originalComments !== undefined) {
			var fakeSourceFile = fakeSourceFiles[sourceFileOfNode.filename];
			if (fakeSourceFile === undefined) {
				fakeSourceFile = fakeSourceFiles[sourceFileOfNode.filename] = new FakeSourceFile(sourceFileOfNode);
			}

			originalComments[originalComments.length - 1] = fakeSourceFile.addComment(originalComments[originalComments.length - 1], node["gulp-typescript-new-comment"]);

			return originalComments;
		}
	}

	return oldGetLeadingCommentRangesOfNode(node, sourceFileOfNode);
};

var oldWriteCommentRange = ts.writeCommentRange.bind(ts);
ts.writeCommentRange = function (currentSourceFile, writer, comment, newLine) {
	if (comment.sourceFile) {
		currentSourceFile = comment.sourceFile;
	}

	return oldWriteCommentRange(currentSourceFile, writer, comment, newLine);
};
