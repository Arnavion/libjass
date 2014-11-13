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

var sorter = (function () {
	var visibilitySorter = function (value1, value2) {
		if (value1.isPrivate === value2.isPrivate && value1.isProtected === value2.isProtected) {
			return 0;
		}

		if (value1.isPrivate) {
			return 1;
		}

		if (value2.isPrivate) {
			return -1;
		}

		if (value1.isProtected) {
			return 1;
		}

		if (value2.isProtected) {
			return -1;
		}

		return 0;
	};

	var types = [TypeScript.AST.Variable, TypeScript.AST.Property, TypeScript.AST.Function, TypeScript.AST.Interface, TypeScript.AST.Constructor, TypeScript.AST.Enum];
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

var indenter = function (indent) {
	return function (line) {
		return ((line === "") ? line : (Array(indent + 1).join("\t") + line));
	};
};

var sanitize = function (string) {
	return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

var toVariableName = function (item) {
	// TODO: Handle non-letters (are both their toLowerCase() and toUpperCase())

	var name = item.name;
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

var toUsageName = function (item) {
	if (item instanceof TypeScript.AST.Constructor || item instanceof TypeScript.AST.Interface || item instanceof TypeScript.AST.Enum) {
		if (item.isPrivate) {
			return item.name;
		}

		return item.fullName;
	}

	if (item.parent instanceof TypeScript.AST.Namespace) {
		if (item.isPrivate) {
			return item.name;
		}

		return item.fullName;
	}

	if (item.isStatic) {
		return toUsageName(item.parent) + '.' + item.name;
	}

	return toVariableName(item.parent) + '.' + item.name;
};

var toId = function (item) {
	return sanitize((item.fullName === undefined) ? item.name : item.fullName);
};

var toLink = function (item) {
	return (
		'<a href="#' + toId(((item instanceof TypeScript.AST.TypeReference) ? item.type : item)) + '">' +
		sanitize(
			((item instanceof TypeScript.AST.TypeReference) ? item.type.name : item.name) +
			((item.generics !== undefined && item.generics.length > 0) ? ('.<' + item.generics.join(', ') + '>') : '')
		) +
		'</a>'
	);
};

var writeDescription = function (text) {
	return sanitize(text).replace(/\{@link ([^} ]+)\}/g, function (substring, linkTarget) {
		return '<a href="#' + linkTarget + '">' + linkTarget + '</a>';
	});
};

var writeParameters = function (parameters) {
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
		'		<dd class="parameter description">' + writeDescription(parameter.description) + '</dd>'
		].concatMany(writeParameters(parameter.subParameters).map(indenter(2)));
	})).concat([
		'	</dl>',
		'</dd>'
	]);
};

TypeScript.AST.Function.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="function' +
			(this.isAbstract ? ' abstract' : '') +
			(this.isPrivate ? ' private' : '') +
			(this.isProtected ? ' protected' : '') +
			(this.isStatic ? ' static' : '') +
			'">',
		'	<dt class="name">' + toLink(this) + '</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.description) + '</p>',
		'	</dd>',
		'	<dd class="usage"><fieldset><legend /><pre><code>' +
				sanitize(
					((this.returnType !== null) ? 'var result = ' : '') + toUsageName(this) + '(' +
					this.parameters.map(function (parameter) {
						return parameter.name;
					}).join(', ') + ');'
				) +
				'</code></pre></fieldset></dd>'
	].concat(writeParameters(this.parameters).map(indenter(1))).concat(
		(this.returnType === null) ? [] : [
		'	<dt>Returns</dt>',
		'	<dd class="return type">' + sanitize(this.returnType.type) + '</dd>',
		'	<dd class="return description">' + writeDescription(this.returnType.description) + '</dd>'
		]
	).concat([
		'</dl>'
	]);
};

TypeScript.AST.Interface.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="interface' +
			(this.isPrivate ? ' private' : '') +
			'">',
		'	<dt class="name">interface ' + toLink(this) + ((this.baseTypes.length > 0) ? (' extends ' + this.baseTypes.map(function (baseType) { return toLink(baseType); }).join(', ')) : '') + '</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.description) + '</p>',
		'	</dd>',
		'	<dd class="members">'
	].concatMany(this.members.map(function (member) {
		return member.toHtml().map(indenter(2));
	})).concat([
		'	</dd>',
		'</dl>'
	]);
};

TypeScript.AST.Constructor.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="constructor' +
			(this.isAbstract ? ' abstract' : '') +
			(this.isPrivate ? ' private' : '') +
			'">',
		'	<dt class="name">class ' + toLink(this) + ((this.baseType !== null) ? (' extends ' + toLink(this.baseType)) : '') + '</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.description) + '</p>',
		'	</dd>',
		'	<dd class="usage"><fieldset><legend /><pre><code>' +
				sanitize(
					'var ' + toVariableName(this) + ' = ' + 'new ' + toUsageName(this) + '(' +
					this.parameters.map(function (parameter) {
						return parameter.name;
					}).join(', ') +
					');'
				) + '</code></pre></fieldset></dd>'
	].concat(writeParameters(this.parameters).map(indenter(1))).concat([
		'	<dd class="members">'
	]).concatMany(this.members.map(function (member) {
		return member.toHtml().map(indenter(2));
	})).concat([
		'	</dd>',
		'</dl>'
	]);
};

TypeScript.AST.Enum.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="enum' +
			(this.isPrivate ? ' private' : '') +
			'">',
		'	<dt class="name">enum <a href="#' + sanitize(this.fullName) + '">' + sanitize(this.name) + '</a></dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.description) + '</p>',
		'	</dd>'
	].concat([
		'	<dd class="members">'
	]).concatMany(this.members.map(function (member) {
		return [
		'		<dl id="' + toId(member) + '" class="member">',
		'			<dt class="name">' + toLink(member) + ' = ' + member.value + '</dt>',
		'			<dd class="description">',
		'				<p>' + writeDescription(member.description) + '</p>',
		'			</dd>',
		'		</dl>'
		];
	})).concat([
		'	</dd>',
		'</dl>'
	]);
};

TypeScript.AST.Variable.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="variable">',
		'	<dt class="name">' + toLink(this) + '</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.description) + '</p>',
		'	</dd>',
		'	<dd class="usage"><fieldset><legend /><pre><code>' +
				sanitize('var result = ' + toUsageName(this) + ';\n' +
				toUsageName(this) + ' = value;') +
				'</code></pre></fieldset></dd>',
		'	<dd class="return type">' + sanitize(this.type) + '</dd>',
		'</dl>'
	];
};

TypeScript.AST.Property.prototype.toHtml = function () {
	return [
		'<dl id="' + toId(this) + '" class="property">',
		'	<dt class="name">' + toLink(this) + '</dt>'
	].concat((this.getter === null) ? [] : [
		'	<dt class="getter">Getter</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.getter.description) + '</p>',
		'	</dd>',
		'	<dd class="usage"><fieldset><legend /><pre><code>' + sanitize('var result = ' + toUsageName(this) + ';') + '</code></pre></fieldset></dd>',
		'	<dd class="return type">' + sanitize(this.getter.type) + '</dd>'
	]).concat((this.setter === null) ? [] : [
		'	<dt class="setter">Setter</dt>',
		'	<dd class="description">',
		'		<p>' + writeDescription(this.setter.description) + '</p>',
		'	</dd>',
		'	<dd class="usage"><fieldset><legend /><pre><code>' + sanitize(toUsageName(this) + ' = value;') + '</code></pre></fieldset></dd>'
	].concat(writeParameters([new TypeScript.AST.Parameter("value", "", this.setter.type)]).map(indenter(1)))).concat([
		'</dl>'
	]);
};

module.exports = function (outputFilePath) {
	var compiler = new TypeScript.Compiler();

	return Transform(function (file, encoding) {
		compiler.addFile(file);
	}, function () {
		// Compile
		compiler.compile();

		// Walk
		var namespaces = TypeScript.AST.walk(compiler);

		// Make HTML

		var namespaceNames = Object.keys(namespaces).filter(function (namespaceName) {
			return namespaceName.substr(0, "libjass".length) === "libjass";
		}).sort(function (ns1, ns2) {
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

		this.push(new Vinyl({
			path: outputFilePath,
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
				'			.variable, .function, .interface, .constructor, .enum, .property {',
				'				margin-left: 30px;',
				'				padding: 10px;',
				'			}',
				'',
				'			.getter, .setter {',
				'				font-size: large;',
				'			}',
				'',
				'			section > .variable:nth-child(2n), section > .function:nth-child(2n), section > .interface:nth-child(2n), section > .constructor:nth-child(2n), section > .enum:nth-child(2n) {',
				'				background-color: rgb(221, 250, 238);',
				'			}',
				'',
				'			section > .variable:nth-child(2n + 1), section > .function:nth-child(2n + 1), section > .interface:nth-child(2n + 1), section > .constructor:nth-child(2n + 1), section > .enum:nth-child(2n + 1) {',
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
				'			.usage fieldset {',
				'				min-width: initial;',
				'				overflow-x: auto;',
				'			}',
				'',
				'			.usage pre {',
				'				margin: 0;',
				'			}',
				'',
				'			.interface .variable, .interface .function, .interface .property,',
				'			.constructor .variable, .constructor .function, .constructor .property, .enum .member {',
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
				'			.protected > .name:before {',
				'				content: "protected ";',
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
				'			.abstract.protected > .name:before {',
				'				content: "abstract protected ";',
				'			}',
				'',
				'			.protected.static > .name:before {',
				'				content: "static protected ";',
				'			}',
				'',
				'			body:not(.show-private) .private, body:not(.show-private) .protected {',
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
				'				showPrivateIfNecessary();',
				'			}, false);',
				'',
				'			function showPrivateIfNecessary() {',
				'				var jumpToElement = document.querySelector("[id=\\"" + location.hash.substr(1) + "\\"]");',
				'				if (jumpToElement !== null && jumpToElement.offsetHeight === 0) {',
				'					document.querySelector("#show-private").click()',
				'					jumpToElement.scrollIntoView();',
				'				}',
				'			}',
				'',
				'			addEventListener("hashchange", showPrivateIfNecessary, false);',
				'		]]>',
				'		</script>',
				'	</head>',
				'	<body>',
				'		<nav class="namespaces">',
				'			<label><input type="checkbox" id="show-private" />Show private</label>',
				'			<h2>Namespaces</h2>'
			].concat([].concatMany(namespaceNames.map(function (namespaceName) {
				var namespace = namespaces[namespaceName];

				return [
				'			<span class="namespace"><a href="#' + sanitize(namespaceName) + '">' + sanitize(namespaceName) + '</a></span>',
				'			<ul class="namespace-elements">'
				].concatMany(namespace.members.map(function (value) {
					return (
				'				<li' +
						((value.isPrivate === true) ? ' class="private"' : '') +
						'><a href="#' + sanitize(value.fullName) + '">' + sanitize(value.name) + '</a></li>'
					);
				})).concat([
				'			</ul>',
				''
				]);
			}))).concat([
				'		</nav>',
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

				var enums = namespaces[namespaceName].members.filter(function (value) {
					return value instanceof TypeScript.AST.Enum;
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
						return value.toHtml().map(indenter(5));
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
						return value.toHtml().map(indenter(5));
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
						return value.toHtml().map(indenter(5));
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
						return value.toHtml().map(indenter(5));
					})).concat([
				'				</section>',
				''
					]);
				}

				if (enums.length > 0) {
					result = result.concat([
				'				<section>',
				'					<h2>Enums</h2>'
					]).concatMany(enums.map(function (value) {
						return value.toHtml().map(indenter(5));
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
