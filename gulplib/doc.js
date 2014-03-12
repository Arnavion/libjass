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

// .\node_modules\.bin\jake doc[..\libjass-gh-pages\api.xhtml]

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var UglifyJS = require("uglify-js");
var Vinyl = require("vinyl");

var Transform = require("./helpers.js").Transform;

Array.prototype.concatMany = function (arr) {
	var result = this;

	arr.forEach(function (a) {
		result = result.concat(a);
	});

	return result;
};

module.exports = function () {
	return Transform(function (file) {
		UglifyJS.base54.reset();


		// Parse
		var root = UglifyJS.parse(file.contents.toString(), {
			filename: path.basename(file.path),
			toplevel: null
		});

		root.figure_out_scope({ screw_ie8: true });


		// Read comments
		var allNames = Object.create(null);

		var NodeType = {
			FUNCTION: 0,
			CONSTRUCTOR: 1,
			GETTER: 2,
			SETTER: 3,
		};

		var readComment = function (node, comment, treeWalker) {
			var nodeType = null;

			if (comment.substr(0, 2) !== "*\n") {
				return;
			}

			var lines = comment.split("\n").map(function (line) {
				return line.replace(/^ *\* */, "");
			}).filter(function (line) {
				return line.length > 0;
			});

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
			}
			else if (node instanceof UglifyJS.AST_Var) {
				// Might be a Constructor if the comment contains @constructor
				nameParts.unshift(node.definitions[0].name.name);
			}
			else if (node instanceof UglifyJS.AST_ObjectKeyVal) {
				var definePropertyNode = treeWalker.find_parent(UglifyJS.AST_Call);
				if (
					(node.key === "get" || node.key === "set") &&
					definePropertyNode.expression.property === "defineProperty" &&
					definePropertyNode.expression.expression.name === "Object"
				) {
					nameParts.unshift(definePropertyNode.args[1].value);

					var walkUp = function (node) {
						if (node.property !== undefined) {
							nameParts.unshift(node.property);
							walkUp(node.expression);
						}
						else {
							nameParts.unshift(node.name);
						}
					};
					walkUp(definePropertyNode.args[0]);

					nodeType = (node.key === "get") ? NodeType.GETTER : NodeType.SETTER;
				}
			}

			if (nameParts.length === 0) {
				return;
			}

			var isAbstract = false;
			var isPrivate = false;
			var isStatic = false;

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
						nodeType = NodeType.CONSTRUCTOR;
						break;

					case "@extends":
						var result = readType(remainingLine);
						baseType = result[0];
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

					case "@static":
						isStatic = true;
						break;

					case "@template":
						generics.push.apply(generics, remainingLine.split(/,/).map(function (word) { return word.trim(); }));
						break;

					case "@type":
						switch (nodeType) {
							case NodeType.GETTER:
								var result = readType(remainingLine);
								var type = result[0];

								returnType = lastRead = type;
								break;

							case NodeType.SETTER:
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

			var name = new Name(nameParts);

			switch (nodeType) {
				case NodeType.FUNCTION:
					allNames[name] = new Function(name, rootDescription, generics, parameters, returnType, isAbstract, isPrivate, isStatic);
					break;

				case NodeType.CONSTRUCTOR:
					allNames[name] = new Constructor(name, rootDescription, generics, parameters, baseType, isAbstract, isPrivate);
					break;

				case NodeType.GETTER:
					if (allNames[name] === undefined) {
						allNames[name] = new Property(name);
					}
					allNames[name].getter = new Getter(rootDescription, returnType);
					break;

				case NodeType.SETTER:
					if (allNames[name] === undefined) {
						allNames[name] = new Property(name);
					}
					allNames[name].setter = new Setter(rootDescription, parameters);
					break;
			}
		};

		var treeWalker = new UglifyJS.TreeWalker(function (node, descend) {
			node.start.comments_before.forEach(function (comment) {
				readComment(node, comment.value, treeWalker);
			});
			node.end.comments_before.forEach(function (comment) {
				readComment(node, comment.value, treeWalker);
			});
		});
		root.walk(treeWalker);


		// Link
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
				if (value.baseType !== null) {
					value.baseType = findType(value.baseType.split("."));
				}
			}

			else if (value instanceof Function || value instanceof Property) {
				var thisTypeNameParts = null;

				if (value.thisType === null) {
					thisTypeNameParts = value.name.parts.slice(0, value.name.parts.length - 1);
					if (thisTypeNameParts[thisTypeNameParts.length - 1] === "prototype") {
						thisTypeNameParts = thisTypeNameParts.slice(0, thisTypeNameParts.length - 1);
					}

					var firstCharacter = thisTypeNameParts[thisTypeNameParts.length - 1][0];
					if (firstCharacter.toLowerCase() === firstCharacter) {
						thisTypeNameParts = null;
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
			}
		});


		// Make HTML
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
			var visibilitySorter = function (value1, value2) {
				if (value1.isPrivate === value2.isPrivate) {
					return 0;
				}
				if (value1.isPrivate) {
					return 1;
				}
				if (value2.isPrivate) {
					return -1;
				}
				return 0;
			};

			var types = [Property, Function, Constructor];
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

			var nameSorter = function (value1, value2) {
				return value1.name.toShortString().localeCompare(value2.name.toShortString());
			};

			var sorters = [visibilitySorter, typeSorter, nameSorter];

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
			return string.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
					'	<li' +
					((value.isPrivate === true) ? ' class="private"' : '') +
					'><a href="#' + sanitize(value.name.toString()) + '">' + sanitize(value.name.toShortString()) + '</a></li>'
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
					(func.isStatic ? ' static' : '') +
					'" id="' + sanitize(func.name.toString()) +
					'">',
				'	<dt class="name">' + writeFunctionName(func) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(func.description) + '</p>',
				'	</dd>',
				'	<dd class="usage"><fieldset><legend />' + writeFunctionUsage(func) + '</fieldset></dd>'
			].concat(writeParameters(func, 1)).concat(writeReturns(func, 1)).concat([
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
				'	<dd class="usage"><fieldset><legend />' + writeConstructorUsage(constructor) + '</fieldset></dd>'
			].concat(writeParameters(constructor, 1)).concat([
				'	<dd class="members">'
			]).concatMany(constructor.members.map(function (member) {
				if (member instanceof Function) {
					return writeFunction(member, 2);
				}
				if (member instanceof Property) {
					return writeProperty(member, 2);
				}
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
				((constructor.baseType !== null) ? (' extends <a href="#' + sanitize(constructor.baseType.name.toString()) + '">' + sanitize(constructor.baseType.name.toShortString()) + '</a>') : '')
			);
		};

		var writeFunctionUsage = function (func) {
			return sanitize(
				((func.returnType !== null) ? 'var result = ' : '') +
				((func.thisType !== null) ? ((func.isStatic ? func.thisType.name.toShortString() : toVariableName(func.thisType)) + '.') : '') +
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
				'<dd class="parameters">',
				'	<dl>'
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

		var writeProperty = function (property, indent) {
			var result = [];

			if (property.getter !== null) {
				result = result.concat(writeGetter(property, indent));
			}

			if (property.setter !== null) {
				result = result.concat(writeSetter(property, indent));
			}

			return result;
		}

		var writeGetter = function (property, indent) {
			var getter = property.getter;

			return [
				'<dl class="getter" id="' + sanitize(property.name.toString()) + '">',
				'	<dt class="name">' + writePropertyName(property) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(getter.description) + '</p>',
				'	</dd>',
				'	<dd class="usage"><fieldset><legend />' + writeGetterUsage(property) + '</fieldset></dd>'
			].concat([
				'	<dd class="return type">' + sanitize(getter.type) + '</dd>',
			]).concat([
				'</dl>'
			]).map(indenter(indent));
		};

		var writeSetter = function (property, indent) {
			var setter = property.setter;

			return [
				'<dl class="setter" id="' + sanitize(property.name.toString()) + '">',
				'	<dt class="name">' + writePropertyName(property) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(setter.description) + '</p>',
				'	</dd>',
				'	<dd class="usage"><fieldset><legend />' + writeSetterUsage(property) + '</fieldset></dd>'
			].concat(writeParameters(setter, 1)).concat([
				'</dl>'
			]).map(indenter(indent));
		};

		var writePropertyName = function (property) {
			return (
				'<a href="#' + sanitize(property.name.toString()) + '">' +
				sanitize(property.name.toShortString()) +
				'</a>'
			);
		};

		var writeGetterUsage = function (property) {
			return sanitize(
				'var result = ' +
				toVariableName(property.thisType) + '.' + property.name.toShortString() +
				';'
			);
		};

		var writeSetterUsage = function (property) {
			return sanitize(
				toVariableName(property.thisType) + '.' + property.name.toShortString() +
				' = ' +
				property.setter.parameters[0].name +
				';'
			);
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

		this.push(new Vinyl({
			path: "api.xhtml",
			contents: Buffer.concat([
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
				'			.function, .constructor, .getter, .setter {',
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
				'			.name {',
				'				font-size: x-large;',
				'			}',
				'',
				'			.usage {',
				'				font-size: large;',
				'				font-style: italic;',
				'			}',
				'',
				'			.usage legend:before {',
				'				content: "Usage";',
				'			}',
				'',
				'			.constructor .function, .constructor .getter, .constructor .setter {',
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
				'			.static > .name:before {',
				'				content: "static ";',
				'			}',
				'',
				'			.abstract.private > .name:before {',
				'				content: "abstract private ";',
				'			}',
				'',
				'			.private.static > .name:before {',
				'				content: "static private ";',
				'			}',
				'',
				'			body:not(.show-private) .private {',
				'				display: none;',
				'			}',
				'		]]>',
				'		</style>',
				'		<script>',
				'		<![CDATA[',
				'			addEventListener("DOMContentLoaded", function () {',
				'				document.querySelector("#show-private").addEventListener("change", function (event) {',
				'					document.body.className = (event.target.checked ? "show-private" : "");',
				'				}, false);',
				'',
				'				if (document.querySelector("[href=\\"" + location.hash + "\\"]").offsetHeight === 0) {',
				'					document.querySelector("#show-private").click()',
				'				}',
				'			}, false);',
				'		]]>',
				'		</script>',
				'	</head>',
				'	<body>',
				'		<section class="namespaces">',
				'			<label><input type="checkbox" id="show-private" />Show private</label>',
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
			]).map(function (line) {
				return new Buffer(line + "\n");
			}))
		}));
	});
};

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

var Function = function (name, description, generics, parameters, returnType, isAbstract, isPrivate, isStatic) {
	this.name = name;

	this.description = description;

	this.generics = generics;

	this.parameters = parameters;

	this.returnType = returnType;

	this.isAbstract = isAbstract;
	this.isPrivate = isPrivate;
	this.isStatic = isStatic;

	this.thisType = null;
};

var Constructor = function (name, description, generics, parameters, baseType, isAbstract, isPrivate) {
	this.name = name;

	this.description = description;

	this.generics = generics;

	this.parameters = parameters;

	this.baseType = baseType;

	this.isAbstract = isAbstract;
	this.isPrivate = isPrivate;

	this.members = [];
};

var Property = function (name) {
	this.name = name;

	this.getter = null;

	this.setter = null;

	this.thisType = null;
};

var Getter = function (description, type) {
	this.description = description;

	this.type = type;

	this.thisType = null;
};

var Setter = function (description, parameters) {
	this.description = description;

	this.parameters = parameters;

	this.thisType = null;
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
