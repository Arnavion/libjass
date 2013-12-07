// .\node_modules\.bin\jake doc[..\libjass-gh-pages\api.xhtml]

var assert = require("assert");
var fs = require("fs");
var UglifyJS = require("uglify-js");

Array.prototype.concatMany = function (arr) {
	var result = this;

	arr.forEach(function (a) {
		result = result.concat(a);
	});

	return result;
};

namespace("_doc", function () {
	task("parse", [], function () {
		console.log("[" + this.fullName + "]");

		var compiled = jake.Task["_default:typeScript"].value;

		UglifyJS.base54.reset();

		var root = null;
		root = UglifyJS.parse(fs.readFileSync("libjass.js", { encoding: "utf8" }), {
			filename: "libjass.js",
			toplevel: root
		});

		root.figure_out_scope();

		return root;
	});

	task("readComments", ["_doc:parse"], function () {
		console.log("[" + this.fullName + "]");

		var root = jake.Task["_doc:parse"].value;

		var allNames = Object.create(null);

		var NodeType = {
			FUNCTION: 0,
			CONSTRUCTOR: 1,
			PROPERTY: 2
		};

		var readComment = function (node, comment) {
			var nodeType = null;

			var lines = comment.split("\n").map(function (line) {
				return line.replace(/^[ *]*/, "");
			}).filter(function (line) {
				return line.length > 0;
			});

			if (!lines.some(function (line) {
				return line.indexOf("@") === 0;
			})) {
				return;
			}

			var nameParts = [];

			if (node instanceof UglifyJS.AST_Defun) {
				nameParts.unshift(node.name.name);
				nodeType = NodeType.FUNCTION;
			}
			else if (node instanceof UglifyJS.AST_Assign) {
				if (node.left instanceof UglifyJS.AST_Dot && node.left.expression.name === "this") {
					return;
				}

				var walkUp = function (node) {
					if (node.property !== undefined) {
						nameParts.unshift(node.property);
						walkUp(node.expression);
					}
					else {
						nameParts.unshift(node.name);
					}
				};
				walkUp(node.left);

				if (node.right instanceof UglifyJS.AST_Function) {
					nodeType = NodeType.FUNCTION;
				}
				else {
					nodeType = NodeType.PROPERTY;
				}
			}
			else if (node instanceof UglifyJS.AST_Var) {
				nameParts.unshift(node.definitions[0].name.name);

				if (node.definitions[0] instanceof UglifyJS.AST_Function) {
					nodeType = NodeType.FUNCTION;
				}
				else {
					nodeType = NodeType.PROPERTY;
				}
			}
			else {
				console.log(node);
			}

			if (nameParts.length === 0) {
				return;
			}

			var isAbstract = false;
			var isPrivate = false;

			var generics = [];
			var parameters = [];
			var returnType = null;

			var parentType = null;

			var rootDescription = "";

			var lastRead = null;

			if (nameParts[nameParts.length - 1][0] === "_") {
				isPrivate = true;
			}

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
						nodeType = NodeType.CONSTRUCTOR;
						break;

					case "@extends":
						var result = readType(remainingLine);
						parentType = result[0];
						break;

					case "@memberof":
						nameParts.unshift.apply(nameParts, remainingLine.split("."));
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
						isPrivate = true;
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

			var name = new Name(nameParts);

			switch (nodeType) {
				case NodeType.FUNCTION:
					allNames[name] = new Function(name, rootDescription, generics, parameters, returnType, isAbstract, isPrivate);
					break;

				case NodeType.CONSTRUCTOR:
					allNames[name] = new Constructor(name, rootDescription, generics, parameters, parentType, isAbstract, isPrivate);
					break;

				case NodeType.PROPERTY:
					// allNames[name] = new Property(name, rootDescription, returnType);
					break;

				default:
					throw new Error("Unrecognized type: [" + nodeType + "]");
			}
		};

		root.walk(new UglifyJS.TreeWalker(function (node, descend) {
			if (
				node instanceof UglifyJS.AST_Node && (
					node instanceof UglifyJS.AST_Defun ||
					node instanceof UglifyJS.AST_Assign ||
					node instanceof UglifyJS.AST_Var
				)
			) {
				node.start.comments_before.forEach(function (comment) {
					readComment(node, comment.value);
				});
				node.end.comments_before.forEach(function (comment) {
					readComment(node, comment.value);
				});
			}
		}));

		return allNames;
	});

	task("link", ["_doc:readComments"], function () {
		console.log("[" + this.fullName + "]");

		var allNames = jake.Task["_doc:readComments"].value;

		var findType = function (nameParts) {
			var result = null;

			Object.keys(allNames).some(function (key) {
				if (!(allNames[key] instanceof Constructor)) {
					return false;
				}

				try {
					assert.deepEqual(nameParts, allNames[key].name.parts);
					result = allNames[key];
					return true;
				}
				catch (ex) {
					return false;
				}
			});

			return result;
		}

		var findTypeEndingWith = function (nameParts) {
			var result = null;

			Object.keys(allNames).some(function (key) {
				if (!(allNames[key] instanceof Constructor)) {
					return false;
				}

				try {
					assert.deepEqual(nameParts, allNames[key].name.parts.slice(-nameParts.length));
					result = allNames[key];
					return true;
				}
				catch (ex) {
					return false;
				}
			});

			return result;
		}

		Object.keys(allNames).map(function (key) {
			return [key, allNames[key]];
		}).forEach(function (keyValuePair) {
			var key = keyValuePair[0];
			var value = keyValuePair[1];

			if (value instanceof Constructor) {
				if (value.parentType !== null) {
					value.parentType = findType(value.parentType.split("."));
				}
			}

			else if (value instanceof Function || value instanceof Property) {
				var thisTypeNameParts = null;

				if (value.thisType === null) {
					if (value.name.parts[value.name.parts.length - 2] === "prototype") {
						thisTypeNameParts = value.name.parts.slice(0, value.name.parts.length - 2);
					}
				}
				else {
					thisTypeNameParts = value.thisType.split(".");
				}

				if (thisTypeNameParts === null) {
					return;
				}

				var thisType = findTypeEndingWith(thisTypeNameParts);
				if (thisType === null) {
					var thisTypeName = new Name(thisTypeNameParts);
					allNames[thisTypeName] = thisType = new Constructor(thisTypeName, "", [], [], null, false, false);
				}

				value.name = new Name(thisType.name.parts.concat(value.name.toShortString()));
				value.thisType = thisType;
				thisType.members.push(value);

				delete allNames[key];

				repeat = true;
			}
		});

		return allNames;
	});

	task("makeHtml", ["_doc:link"], function () {
		console.log("[" + this.fullName + "]");

		var allNames = jake.Task["_doc:link"].value;

		var namespaces = Object.create(null);

		Object.keys(allNames).forEach(function (key) {
			var value = allNames[key];

			var nameParts = allNames[key].name.parts;

			if (nameParts.length === 1) {
				return;
			}

			var namespaceName = new Name(nameParts.slice(0, nameParts.length - 1)).toString();
			var namespace = namespaces[namespaceName];
			if (namespace === undefined) {
				namespace = namespaces[namespaceName] = [];
			}

			namespace.push(value);
		});

		var namespaceNames = Object.keys(namespaces).sort(function (ns1, ns2) {
			return ns1.toString().localeCompare(ns2.toString());
		});

		var sorter = (function () {
			var types = [Function, Property, Constructor];
			var typeSorter = function (value1, value2) {
				var type1Index = -1;
				var type2Index = -1;

				types.every(function (type, index) {
					if (value1 instanceof type) {
						type1Index = index;
					}
					if (value2 instanceof type) {
						type2Index = index;
					}
					return (type1Index === -1) || (type2Index === -1);
				});

				return type1Index - type2Index;
			};

			var visibilitySorter = function (value1, value2) {
				if (value1.isPrivate === value2.isPrivate) {
					return 0;
				}
				else if (value1.isPrivate) {
					return 1;
				}
				else {
					return -1;
				}
			};

			var nameSorter = function (value1, value2) {
				return value1.name.toShortString().localeCompare(value2.name.toShortString());
			};

			var sorters = [typeSorter, visibilitySorter, nameSorter];

			return function (value1, value2) {
				for (var i = 0; i < sorters.length; i++) {
					var result = sorters[i](value1, value2);

					if (result !== 0) {
						return result;
					}
				}

				return 0;
			};
		})();

		namespaceNames.forEach(function (namespaceName) {
			namespaces[namespaceName].sort(sorter);

			namespaces[namespaceName].filter(function (value) {
				return value instanceof Constructor;
			}).forEach(function (constructor) {
				constructor.members.sort(sorter);
			});
		});

		var sanitize = function (string) {
			return string.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
		};

		var indenter = function (indent) {
			return function (line) {
				return ((line === "") ? line : (Array(indent + 1).join("\t") + line));
			};
		};

		var writeOverview = function (indent) {
			return [].concatMany(namespaceNames.map(function (namespaceName) {
				var namespace = namespaces[namespaceName];

				return [
					'<span class="namespace"><a href="#' + sanitize(namespaceName) + '">' + sanitize(namespaceName) + '</a></span>',
					'<ul class="namespace-elements">'
				].concatMany(namespace.map(function (value) {
					return (
					'	<li><a href="#' + sanitize(value.name.toString()) + '">' + sanitize(value.name.toShortString()) + '</a></li>'
					);
				})).concat([
					'</ul>',
					''
				]);
			})).map(indenter(indent));
		};

		var writeFunction = function (func, indent) {
			return [
				'<dl class="function' +
					(func.isAbstract ? ' abstract' : '') +
					(func.isPrivate ? ' private' : '') +
					'" id="' + sanitize(func.name.toString()) +
					'">',
				'	<dt class="name">' + writeFunctionName(func) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(func.description) + '</p>',
				'	</dd>',
				'	<dd class="usage">' + writeFunctionUsage(func) + '</dd>'
			].concat(writeParameters(func, 2)).concat(writeReturns(func, 1)).concat([
				'</dl>'
			]).map(indenter(indent));
		};

		var writeConstructor = function (constructor, indent) {
			return [
				'<dl class="constructor' +
					(constructor.isAbstract ? ' abstract' : '') +
					(constructor.isPrivate ? ' private' : '') +
					'" id="' +
					sanitize(constructor.name.toString()) +
					'">',
				'	<dt class="name">' + writeConstructorName(constructor) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(constructor.description) + '</p>',
				'	</dd>',
				'	<dd class="usage">' + writeConstructorUsage(constructor) + '</dd>'
			].concat(writeParameters(constructor, 2)).concat([
				'	<dd>'
			]).concatMany(constructor.members.filter(function (member) {
				return member instanceof Function;
			}).map(function (member) {
				return writeFunction(member, 2);
			})).concat([
				'	</dd>',
				'</dl>'
			]).map(indenter(indent));
		};

		var writeCallableName = function (callable) {
			return (
				'<a href="#' + sanitize(callable.name.toString()) + '">' +
				sanitize(
					callable.name.toShortString() +
					((callable.generics.length > 0) ? ('.<' + callable.generics.join(', ') + '>') : '')
				) +
				'</a>'
			);
		};

		var writeFunctionName = function (func) {
			return writeCallableName(func);
		};

		var writeConstructorName = function (constructor) {
			return (
				'class ' +
				writeCallableName(constructor) +
				((constructor.parentType !== null) ? (' extends <a href="#' + sanitize(constructor.parentType.name.toString()) + '">' + sanitize(constructor.parentType.name.toShortString()) + '</a>') : '')
			);
		};

		var writeFunctionUsage = function (func) {
			return sanitize(
				((func.returnType !== null) ? 'var result = ' : '') +
				((func.thisType !== null) ? (toVariableName(func.thisType) + '.') : '') +
				func.name.toShortString() + '(' +
				func.parameters.map(function (parameter) {
					return parameter.name;
				}).join(', ') + ');'
			);
		};

		var writeConstructorUsage = function (constructor) {
			return sanitize(
				'var ' + toVariableName(constructor) + ' = ' +
				'new ' + constructor.name.toShortString() +  '(' +
				constructor.parameters.map(function (parameter) {
					return parameter.name;
				}).join(', ') + ');'
			);
		};

		var writeParameters = function (callable, indent) {
			return _writeParameters(callable.parameters, indent);
		};

		var _writeParameters = function (parameters, indent) {
			if (parameters.length === 0) {
				return [];
			}

			return [
				'<dd>',
				'	<dl class="parameters">'
			].concatMany(parameters.map(function (parameter) {
					return [
				'		<dt class="parameter name">' + sanitize(parameter.name) + '</dt>',
				'		<dd class="parameter type">' + sanitize(parameter.type) + '</dd>',
				'		<dd class="parameter description">' + sanitize(parameter.description) + '</dd>'
					].concatMany(_writeParameters(parameter.subParameters, indent + 1));
			})).concat([
				'	</dl>',
				'</dd>'
			]).map(indenter(indent));
		};

		var writeReturns = function (func, indent) {
			if (func.returnType === null) {
				return [];
			}

			return [
				'<dt>Returns</dt>',
				'<dd class="return type">' + sanitize(func.returnType.type) + '</dd>',
				'<dd class="return description">' + sanitize(func.returnType.description) + '</dd>'
			].map(indenter(indent));
		};

		var toVariableName = function (constructor) {
			// TODO: Handle non-letters (are both their toLowerCase() and toUpperCase())

			var name = constructor.name.toShortString();
			var result = "";

			for (var i = 0; i < name.length; i++) {
				if (name[i] === name[i].toLowerCase()) {
					// This is lower case. Write it as lower case.
					result += name[i];
				}

				else {
					// This is upper case.

					if (i === 0) {
						// This is the first character. Write it as lower case.
						result += name[i].toLowerCase();
					}

					else if (name[i - 1] === name[i - 1].toUpperCase()) {
						// The previous character was upper case.

						if (i === name.length - 1) {
							// This is the last character. Write it as lower case.
							result += name[i].toLowerCase();
						}
						else if (name[i + 1] === name[i + 1].toLowerCase()) {
							// The next character is lower case so this is the start of a new word. Write this one as upper case.
							result += name[i];
						}
						else {
							// The next character is upper case. Write this one as lower case.
							result += name[i].toLowerCase();
						}
					}

					else {
						// Previous character was lower case so this is the start of a new word. Write this one as upper case.
						result += name[i];
					}
				}
			}

			return result;
		};

		return [
			'<?xml version="1.0" encoding="utf-8" ?>',
			'<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">',
			'	<head>',
			'		<title>libjass API Documentation</title>',
			'		<style type="text/css">',
			'		<![CDATA[',
			'			html, body, .namespaces, .content {',
			'				height: 100%;',
			'				margin: 0;',
			'			}',
			'',
			'			.namespaces, .content {',
			'				overflow-y: scroll;',
			'			}',
			'',
			'			.namespaces {',
			'				float: left;',
			'				background-color: white;',
			'				padding: 0 20px;',
			'				margin-right: 20px;',
			'			}',
			'',
			'			.content > section:not(:last-child) {',
			'				border-bottom: 1px solid black;',
			'			}',
			'',
			'			.function, .constructor {',
			'				margin-left: 30px;',
			'				padding: 10px;',
			'			}',
			'',
			'			section > .function:nth-child(2n), section > .constructor:nth-child(2n) {',
			'				background-color: rgb(221, 250, 238);',
			'			}',
			'',
			'			section > .function:nth-child(2n + 1), section > .constructor:nth-child(2n + 1) {',
			'				background-color: rgb(244, 250, 221);',
			'			}',
			'',
			'			.function > .name, .constructor > .name {',
			'				font-size: x-large;',
			'			}',
			'',
			'			.function > .usage, .constructor > .usage {',
			'				font-size: large;',
			'			}',
			'',
			'			.function > .usage, .constructor > .usage {',
			'				font-style: italic;',
			'			}',
			'',
			'			.constructor .function {',
			'				background-color: rgb(250, 241, 221);',
			'			}',
			'',
			'			.parameter.name {',
			'				font-size: large;',
			'			}',
			'',
			'			.type {',
			'				font-style: italic;',
			'			}',
			'',
			'			.type:before {',
			'				content: "Type: ";',
			'			}',
			'',
			'			.abstract > .name:before {',
			'				content: "abstract ";',
			'			}',
			'',
			'			.private > .name:before {',
			'				content: "private ";',
			'			}',
			'',
			'			.abstract.private > .name:before {',
			'				content: "abstract private ";',
			'			}',
			'		]]>',
			'		</style>',
			'	</head>',
			'	<body>',
			'		<section class="namespaces">',
			'			<h2>Namespaces</h2>'
		].concat(writeOverview(3)).concat([
			'		</section>',
			'		<div class="content">',
			''
		]).concatMany(namespaceNames.map(function (namespaceName) {
			var functions = namespaces[namespaceName].filter(function (value) {
				return value instanceof Function;
			});

			var constructors = namespaces[namespaceName].filter(function (value) {
				return value instanceof Constructor;
			});

			var result = [
			'			<section>',
			'				<h1 id="' + sanitize(namespaceName) + '">' + sanitize(namespaceName) + '</h1>',
			''
			];

			if (functions.length > 0) {
				result = result.concat([
			'				<section>',
			'					<h2>Free functions</h2>'
				]).concatMany(functions.map(function (value) {
					return writeFunction(value, 5);
				})).concat([
			'				</section>',
			''
				]);
			}

			if (constructors.length > 0) {
				result = result.concat([
			'				<section>',
			'					<h2>Classes</h2>'
				]).concatMany(constructors.map(function (value) {
					return writeConstructor(value, 5);
				})).concat([
			'				</section>',
			''
				]);
			}

			result = result.concat([
			'			</section>'
			]);

			return result;
		})).concat([
			'		</div>',
			'	</body>',
			'</html>'
		]);
	});

	task("writeHtml", ["_doc:makeHtml"], function (outputFilename) {
		console.log("[" + this.fullName + "]");

		var html = jake.Task["_doc:makeHtml"].value;

		var file = fs.createWriteStream(outputFilename);
		file.on("error", function (error) {
			throw error;
		});
		html.forEach(function (line) {
			file.write(line + '\n');
		});
		file.end();
	});
});

var Name = function (parts) {
	this.type = "Name";

	this.parts = parts;
};

Name.prototype.toShortString = function () {
	return this.parts[this.parts.length - 1];
};

Name.prototype.toString = function () {
	return this.parts.join(".");
};

Name.prototype.inspect = Name.prototype.toString;

var Function = function (name, description, generics, parameters, returnType, isAbstract, isPrivate) {
	this.name = name;

	this.description = description;

	this.generics = generics;

	this.parameters = parameters;

	this.returnType = returnType;

	this.isAbstract = isAbstract;
	this.isPrivate = isPrivate;

	this.thisType = null;
};

var Constructor = function (name, description, generics, parameters, parentType, isAbstract, isPrivate) {
	this.name = name;

	this.description = description;

	this.generics = generics;

	this.parameters = parameters;

	this.parentType = parentType;

	this.isAbstract = isAbstract;
	this.isPrivate = isPrivate;

	this.members = [];
};

var Property = function (name, description, type) {
	this.name = name;

	this.description = description;

	this.type = type;
};

var Parameter = function (name, type, description) {
	this.name = name;
	this.type = type;
	this.description = description;

	this.subParameters = [];
};

var ReturnType = function (type, description) {
	this.type = type;
	this.description = description;
};

var getNodeType = function (node) {
	var nodeType = "";

	if (node instanceof UglifyJS.AST_Node) { nodeType = "AST_Node"; }
	if (node instanceof UglifyJS.AST_Statement) { nodeType = "AST_Statement"; }
	if (node instanceof UglifyJS.AST_Debugger) { nodeType = "AST_Debugger"; }
	if (node instanceof UglifyJS.AST_Directive) { nodeType = "AST_Directive"; }
	if (node instanceof UglifyJS.AST_SimpleStatement) { nodeType = "AST_SimpleStatement"; }
	if (node instanceof UglifyJS.AST_Block) { nodeType = "AST_Block"; }
	if (node instanceof UglifyJS.AST_BlockStatement) { nodeType = "AST_BlockStatement"; }
	if (node instanceof UglifyJS.AST_Scope) { nodeType = "AST_Scope"; }
	if (node instanceof UglifyJS.AST_Toplevel) { nodeType = "AST_Toplevel"; }
	if (node instanceof UglifyJS.AST_Lambda) { nodeType = "AST_Lambda"; }
	if (node instanceof UglifyJS.AST_Accessor) { nodeType = "AST_Accessor"; }
	if (node instanceof UglifyJS.AST_Function) { nodeType = "AST_Function"; }
	if (node instanceof UglifyJS.AST_Defun) { nodeType = "AST_Defun"; }
	if (node instanceof UglifyJS.AST_Switch) { nodeType = "AST_Switch"; }
	if (node instanceof UglifyJS.AST_SwitchBranch) { nodeType = "AST_SwitchBranch"; }
	if (node instanceof UglifyJS.AST_Default) { nodeType = "AST_Default"; }
	if (node instanceof UglifyJS.AST_Case) { nodeType = "AST_Case"; }
	if (node instanceof UglifyJS.AST_Try) { nodeType = "AST_Try"; }
	if (node instanceof UglifyJS.AST_Catch) { nodeType = "AST_Catch"; }
	if (node instanceof UglifyJS.AST_Finally) { nodeType = "AST_Finally"; }
	if (node instanceof UglifyJS.AST_EmptyStatement) { nodeType = "AST_EmptyStatement"; }
	if (node instanceof UglifyJS.AST_StatementWithBody) { nodeType = "AST_StatementWithBody"; }
	if (node instanceof UglifyJS.AST_LabeledStatement) { nodeType = "AST_LabeledStatement"; }
	if (node instanceof UglifyJS.AST_DWLoop) { nodeType = "AST_DWLoop"; }
	if (node instanceof UglifyJS.AST_Do) { nodeType = "AST_Do"; }
	if (node instanceof UglifyJS.AST_While) { nodeType = "AST_While"; }
	if (node instanceof UglifyJS.AST_For) { nodeType = "AST_For"; }
	if (node instanceof UglifyJS.AST_ForIn) { nodeType = "AST_ForIn"; }
	if (node instanceof UglifyJS.AST_With) { nodeType = "AST_With"; }
	if (node instanceof UglifyJS.AST_If) { nodeType = "AST_If"; }
	if (node instanceof UglifyJS.AST_Jump) { nodeType = "AST_Jump"; }
	if (node instanceof UglifyJS.AST_Exit) { nodeType = "AST_Exit"; }
	if (node instanceof UglifyJS.AST_Return) { nodeType = "AST_Return"; }
	if (node instanceof UglifyJS.AST_Throw) { nodeType = "AST_Throw"; }
	if (node instanceof UglifyJS.AST_LoopControl) { nodeType = "AST_LoopControl"; }
	if (node instanceof UglifyJS.AST_Break) { nodeType = "AST_Break"; }
	if (node instanceof UglifyJS.AST_Continue) { nodeType = "AST_Continue"; }
	if (node instanceof UglifyJS.AST_Definitions) { nodeType = "AST_Definitions"; }
	if (node instanceof UglifyJS.AST_Var) { nodeType = "AST_Var"; }
	if (node instanceof UglifyJS.AST_Const) { nodeType = "AST_Const"; }
	if (node instanceof UglifyJS.AST_VarDef) { nodeType = "AST_VarDef"; }
	if (node instanceof UglifyJS.AST_Call) { nodeType = "AST_Call"; }
	if (node instanceof UglifyJS.AST_New) { nodeType = "AST_New"; }
	if (node instanceof UglifyJS.AST_Seq) { nodeType = "AST_Seq"; }
	if (node instanceof UglifyJS.AST_PropAccess) { nodeType = "AST_PropAccess"; }
	if (node instanceof UglifyJS.AST_Dot) { nodeType = "AST_Dot"; }
	if (node instanceof UglifyJS.AST_Sub) { nodeType = "AST_Sub"; }
	if (node instanceof UglifyJS.AST_Unary) { nodeType = "AST_Unary"; }
	if (node instanceof UglifyJS.AST_UnaryPrefix) { nodeType = "AST_UnaryPrefix"; }
	if (node instanceof UglifyJS.AST_UnaryPostfix) { nodeType = "AST_UnaryPostfix"; }
	if (node instanceof UglifyJS.AST_Binary) { nodeType = "AST_Binary"; }
	if (node instanceof UglifyJS.AST_Assign) { nodeType = "AST_Assign"; }
	if (node instanceof UglifyJS.AST_Conditional) { nodeType = "AST_Conditional"; }
	if (node instanceof UglifyJS.AST_Array) { nodeType = "AST_Array"; }
	if (node instanceof UglifyJS.AST_Object) { nodeType = "AST_Object"; }
	if (node instanceof UglifyJS.AST_ObjectProperty) { nodeType = "AST_ObjectProperty"; }
	if (node instanceof UglifyJS.AST_ObjectKeyVal) { nodeType = "AST_ObjectKeyVal"; }
	if (node instanceof UglifyJS.AST_ObjectSetter) { nodeType = "AST_ObjectSetter"; }
	if (node instanceof UglifyJS.AST_ObjectGetter) { nodeType = "AST_ObjectGetter"; }
	if (node instanceof UglifyJS.AST_Symbol) { nodeType = "AST_Symbol"; }
	if (node instanceof UglifyJS.AST_SymbolAccessor) { nodeType = "AST_SymbolAccessor"; }
	if (node instanceof UglifyJS.AST_SymbolDeclaration) { nodeType = "AST_SymbolDeclaration"; }
	if (node instanceof UglifyJS.AST_SymbolVar) { nodeType = "AST_SymbolVar"; }
	if (node instanceof UglifyJS.AST_SymbolFunarg) { nodeType = "AST_SymbolFunarg"; }
	if (node instanceof UglifyJS.AST_SymbolConst) { nodeType = "AST_SymbolConst"; }
	if (node instanceof UglifyJS.AST_SymbolDefun) { nodeType = "AST_SymbolDefun"; }
	if (node instanceof UglifyJS.AST_SymbolLambda) { nodeType = "AST_SymbolLambda"; }
	if (node instanceof UglifyJS.AST_SymbolCatch) { nodeType = "AST_SymbolCatch"; }
	if (node instanceof UglifyJS.AST_Label) { nodeType = "AST_Label"; }
	if (node instanceof UglifyJS.AST_SymbolRef) { nodeType = "AST_SymbolRef"; }
	if (node instanceof UglifyJS.AST_LabelRef) { nodeType = "AST_LabelRef"; }
	if (node instanceof UglifyJS.AST_This) { nodeType = "AST_This"; }
	if (node instanceof UglifyJS.AST_Constant) { nodeType = "AST_Constant"; }
	if (node instanceof UglifyJS.AST_String) { nodeType = "AST_String"; }
	if (node instanceof UglifyJS.AST_Number) { nodeType = "AST_Number"; }
	if (node instanceof UglifyJS.AST_RegExp) { nodeType = "AST_RegExp"; }
	if (node instanceof UglifyJS.AST_Atom) { nodeType = "AST_Atom"; }
	if (node instanceof UglifyJS.AST_Null) { nodeType = "AST_Null"; }
	if (node instanceof UglifyJS.AST_NaN) { nodeType = "AST_NaN"; }
	if (node instanceof UglifyJS.AST_Undefined) { nodeType = "AST_Undefined"; }
	if (node instanceof UglifyJS.AST_Hole) { nodeType = "AST_Hole"; }
	if (node instanceof UglifyJS.AST_Infinity) { nodeType = "AST_Infinity"; }
	if (node instanceof UglifyJS.AST_Boolean) { nodeType = "AST_Boolean"; }
	if (node instanceof UglifyJS.AST_False) { nodeType = "AST_False"; }
	if (node instanceof UglifyJS.AST_True) { nodeType = "AST_True"; }

	return nodeType;
};
