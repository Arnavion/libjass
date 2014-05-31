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
var TypeScript = require("./typescript.js");

Array.prototype.concatMany = function (arr) {
	var result = this;

	arr.forEach(function (a) {
		result = result.concat(a);
	});

	return result;
};

module.exports = function () {
	var compiler = new TypeScript.Compiler();

	var filenames = [];
	var allFiles = [];

	return Transform(function (file, encoding) {
		filenames.push(file.path);
		allFiles.push.apply(allFiles, compiler.addFile(file));
	}, function () {
		// Walk
		var namespaces = TypeScript.AST.walk(compiler, allFiles);

		// Make HTML
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

			var types = [TypeScript.AST.Variable, TypeScript.AST.Property, TypeScript.AST.Function, TypeScript.AST.Interface, TypeScript.AST.Constructor];
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
				return value1.name.localeCompare(value2.name);
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

		var namespaceNames = Object.keys(namespaces).sort(function (ns1, ns2) {
			return ns1.localeCompare(ns2);
		});

		namespaceNames.forEach(function (namespaceName) {
			namespaces[namespaceName].members.sort(sorter);

			namespaces[namespaceName].members.filter(function (value) {
				return value instanceof TypeScript.AST.Interface || value instanceof TypeScript.AST.Constructor;
			}).forEach(function (interfaceOrConstructor) {
				interfaceOrConstructor.members.sort(sorter);
			});
		});

		var sanitize = function (string) {
			return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
				].concatMany(namespace.members.map(function (value) {
					return (
					'	<li' +
					((value.isPrivate === true) ? ' class="private"' : '') +
					'><a href="#' + sanitize(value.fullName) + '">' + sanitize(value.name) + '</a></li>'
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
					'" id="' + sanitize(func.fullName) +
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

		var writeInterface = function (interface, indent) {
			return [
				'<dl class="interface' +
					(interface.isPrivate ? ' private' : '') +
					'" id="' +
					sanitize(interface.fullName) +
					'">',
				'	<dt class="name">' + writeInterfaceName(interface) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(interface.description) + '</p>',
				'	</dd>'
			].concat([
				'	<dd class="members">'
			]).concatMany(interface.members.map(function (member) {
				if (member instanceof TypeScript.AST.Variable) {
					return writeVariable(member, 2);
				}
				if (member instanceof TypeScript.AST.Function) {
					return writeFunction(member, 2);
				}
				if (member instanceof TypeScript.AST.Property) {
					return writeProperty(member, 2);
				}
			})).concat([
				'	</dd>',
				'</dl>'
			]).map(indenter(indent));
		};

		var writeConstructor = function (constructor, indent) {
			return [
				'<dl class="constructor' +
					(constructor.isAbstract ? ' abstract' : '') +
					(constructor.isPrivate ? ' private' : '') +
					'" id="' +
					sanitize(constructor.fullName) +
					'">',
				'	<dt class="name">' + writeConstructorName(constructor) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(constructor.description) + '</p>',
				'	</dd>',
				'	<dd class="usage"><fieldset><legend />' + writeConstructorUsage(constructor) + '</fieldset></dd>'
			].concat(writeParameters(constructor, 1)).concat([
				'	<dd class="members">'
			]).concatMany(constructor.members.map(function (member) {
				if (member instanceof TypeScript.AST.Variable) {
					return writeVariable(member, 2);
				}
				if (member instanceof TypeScript.AST.Function) {
					return writeFunction(member, 2);
				}
				if (member instanceof TypeScript.AST.Property) {
					return writeProperty(member, 2);
				}
			})).concat([
				'	</dd>',
				'</dl>'
			]).map(indenter(indent));
		};

		var writeVariable = function (variable, indent) {
			return [
				'<dl class="variable" id="' + sanitize(variable.fullName) + '">',
				'	<dt class="name">' + writePropertyName(variable) + '</dt>',
				'	<dd class="description">',
				'		<p>' + sanitize(variable.description) + '</p>',
				'	</dd>',
				'	<dd class="usage"><fieldset><legend />' + writeVariableUsage(variable) + '</fieldset></dd>'
			].concat([
				'	<dd class="return type">' + sanitize(variable.type) + '</dd>',
			]).concat([
				'</dl>'
			]).map(indenter(indent));
		};

		var writeCallableName = function (callable) {
			return (
				'<a href="#' + sanitize(callable.fullName) + '">' +
				sanitize(
					callable.name +
					((callable.generics.length > 0) ? ('.<' + callable.generics.join(', ') + '>') : '')
				) +
				'</a>'
			);
		};

		var writeFunctionName = function (func) {
			return writeCallableName(func);
		};

		var writeInterfaceName = function (interface) {
			return (
				'interface ' +
				writeCallableName(interface) +
				((interface.baseType !== null) ? (' extends <a href="#' + sanitize(interface.baseType.fullName) + '">' + sanitize(interface.baseType.name) + '</a>') : '')
			);
		};

		var writeConstructorName = function (constructor) {
			return (
				'class ' +
				writeCallableName(constructor) +
				((constructor.baseType !== null) ? (' extends <a href="#' + sanitize(constructor.baseType.fullName) + '">' + sanitize(constructor.baseType.name) + '</a>') : '')
			);
		};

		var writeVariableUsage = function (variable) {
			return (
				'<pre><code>' +
				sanitize('var result = ' + toVariableName(variable.parent) + '.' + variable.name + ';' +
				'\n' +
				toVariableName(variable.parent) + '.' + variable.name + ' = value;') +
				'</code></pre>'
			);
		};

		var writeFunctionUsage = function (func) {
			return (
				'<pre><code>' +
				sanitize(
				((func.returnType !== null) ? 'var result = ' : '') +
				((func.parent !== null) ? ((func.isStatic ? func.parent.name : toVariableName(func.parent)) + '.') : '') +
				func.name + '(' +
				func.parameters.map(function (parameter) {
					return parameter.name;
				}).join(', ') + ');') +
				'</code></pre>'
			);
		};

		var writeConstructorUsage = function (constructor) {
			return (
				'<pre><code>' +
				sanitize(
				'var ' + toVariableName(constructor) + ' = ' +
				'new ' + constructor.name +  '(' +
				constructor.parameters.map(function (parameter) {
					return parameter.name;
				}).join(', ') + ');') +
				'</code></pre>'
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
				'<dl class="getter" id="' + sanitize(property.fullName) + '">',
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
				'<dl class="setter" id="' + sanitize(property.fullName) + '">',
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
				'<a href="#' + sanitize(property.fullName) + '">' +
				sanitize(property.name) +
				'</a>'
			);
		};

		var writeGetterUsage = function (property) {
			return (
				'<pre><code>' +
				sanitize(
				'var result = ' +
				toVariableName(property.parent) + '.' + property.name +
				';') +
				'</code></pre>'
			);
		};

		var writeSetterUsage = function (property) {
			return (
				'<pre><code>' +
				sanitize(
				toVariableName(property.parent) + '.' + property.name +
				' = ' +
				property.setter.parameters[0].name +
				';') +
				'</code></pre>'
			);
		};

		var toVariableName = function (constructor) {
			// TODO: Handle non-letters (are both their toLowerCase() and toUpperCase())

			var name = constructor.name;
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
				'			.variable, .function, .interface, .constructor, .getter, .setter {',
				'				margin-left: 30px;',
				'				padding: 10px;',
				'			}',
				'',
				'			section > .variable:nth-child(2n), section > .function:nth-child(2n), section > .interface:nth-child(2n), section > .constructor:nth-child(2n) {',
				'				background-color: rgb(221, 250, 238);',
				'			}',
				'',
				'			section > .variable:nth-child(2n + 1), section > .function:nth-child(2n + 1), section > .interface:nth-child(2n + 1), section > .constructor:nth-child(2n + 1) {',
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
				'			.usage pre {',
				'				margin: 0;',
				'			}',
				'',
				'			.interface .variable, .interface .function, .interface .getter, .interface .setter,',
				'			.constructor .variable, .constructor .function, .constructor .getter, .constructor .setter {',
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
				var variables = namespaces[namespaceName].members.filter(function (value) {
					return value instanceof TypeScript.AST.Variable;
				});

				var functions = namespaces[namespaceName].members.filter(function (value) {
					return value instanceof TypeScript.AST.Function;
				});

				var interfaces = namespaces[namespaceName].members.filter(function (value) {
					return value instanceof TypeScript.AST.Interface;
				});

				var constructors = namespaces[namespaceName].members.filter(function (value) {
					return value instanceof TypeScript.AST.Constructor;
				});

				var result = [
				'			<section>',
				'				<h1 id="' + sanitize(namespaceName) + '">' + sanitize(namespaceName) + '</h1>',
				''
				];

				if (variables.length > 0) {
					result = result.concat([
				'				<section>',
				'					<h2>Variables</h2>'
					]).concatMany(variables.map(function (value) {
						return writeVariable(value, 5);
					})).concat([
				'				</section>',
				''
					]);
				}

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

				if (interfaces.length > 0) {
					result = result.concat([
				'				<section>',
				'					<h2>Interfaces</h2>'
					]).concatMany(interfaces.map(function (value) {
						return writeInterface(value, 5);
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
