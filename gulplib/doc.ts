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

import * as fs from "fs";
import * as path from "path";
import { Transform } from "stream";
import Vinyl = require("vinyl");

import { makeTransform } from "./helpers";

import * as AST from "./typescript/ast";
import { Compiler } from "./typescript/compiler";
import { walk } from "./typescript/walker";

function flatten<T>(arr: T[][]): T[] {
	var result: T[] = [];

	for (let a of arr) {
		result = result.concat(a);
	}

	return result;
}

var sorter = (function () {
	function visibilitySorter(value1: { isPrivate?: boolean; isProtected?: boolean; }, value2: { isPrivate?: boolean; isProtected?: boolean; }) {
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
	}

	var types = [AST.Property, AST.Function, AST.Interface, AST.Class, AST.Enum];
	function typeSorter(value1: AST.ModuleMember | AST.NamespaceMember, value2: AST.ModuleMember | AST.NamespaceMember) {
		var type1Index = -1;
		var type2Index = -1;

		types.every((type, index) => {
			if (value1 instanceof type) {
				type1Index = index;
			}
			if (value2 instanceof type) {
				type2Index = index;
			}
			return (type1Index === -1) || (type2Index === -1);
		});

		return type1Index - type2Index;
	}

	function nameSorter(value1: { name: string }, value2: { name: string }) {
		return value1.name.localeCompare(value2.name);
	}

	var sorters: ((value1: AST.ModuleMember, value2: AST.ModuleMember) => number)[] = [visibilitySorter, typeSorter, nameSorter];

	return function (value1: AST.ModuleMember, value2: AST.ModuleMember) {
		for (var i = 0; i < sorters.length; i++) {
			var result = sorters[i](value1, value2);

			if (result !== 0) {
				return result;
			}
		}

		return 0;
	};
})();

function indenter(indent: number) {
	return (line: string) => ((line === "") ? line : (Array(indent + 1).join("\t") + line));
}

function sanitize(str: string) {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toVariableName(item: { name: string }) {
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
}

function toUsageName(item: AST.Class | AST.Interface | AST.Function | AST.Property | AST.Enum): string {
	if (item.parent instanceof AST.Module) {
		return item.name;
	}

	if (item instanceof AST.Class || item instanceof AST.Interface || item instanceof AST.Enum) {
		if (item.isPrivate) {
			return item.name;
		}

		return item.fullName;
	}

	if (item.parent instanceof AST.Namespace) {
		if ((<AST.Class | AST.Interface | AST.Function | AST.Enum>item).isPrivate) {
			return item.name;
		}

		return item.fullName;
	}

	if ((<AST.Function>item).isStatic) {
		return toUsageName(<AST.Class | AST.Interface>item.parent) + '.' + item.name;
	}

	return toVariableName(item.parent) + '.' + item.name;
}

function toId(item: { fullName?: string; name: string; }): string {
	return sanitize((item.fullName === undefined) ? item.name : item.fullName);
}

function toLink(item: AST.ModuleMember | AST.EnumMember | AST.TypeReference): string {
	var result = `<a href="#${ toId(item) }">${ sanitize(item.name) }`;

	var itemWithGenerics = <AST.HasGenerics>item;
	if (itemWithGenerics.generics !== undefined && itemWithGenerics.generics.length > 0) {
		var generics = <(string | AST.TypeReference | AST.IntrinsicTypeReference)[]>itemWithGenerics.generics;
		result += sanitize(`.<${ generics.map(generic =>
			(generic instanceof AST.TypeReference || generic instanceof AST.IntrinsicTypeReference) ? generic.name : <string>generic
		).join(', ') }>`);
	}

	result += '</a>';

	return result;
}

function writeDescription(text: string): string {
	var result = sanitize(text).replace(/\{@link ([^} ]+)\}/g, function (substring, linkTarget) {
		return `<a href="#${ linkTarget }">${ linkTarget }</a>`;
	});

	var inCodeBlock = false;
	result = result.split("\n").map(function (line) {
		if (line.substr(0, "    ".length) === "    ") {
			line = line.substr("    ".length);

			if (!inCodeBlock) {
				inCodeBlock = true;
				line = `<pre class="code"><code>${ line }`;
			}
		}
		else if (line.length > 0 && inCodeBlock) {
			inCodeBlock = false;
			line = `</code></pre>${ line }`;
		}

		return line;
	}).join("\n");

	if (inCodeBlock) {
		result += '</code></pre>';
	}

	return result;
}

function writeParameters(parameters: AST.Parameter[]): string[] {
	if (parameters.length === 0) {
		return [];
	}

	return [
		'<dd class="parameters">',
		'	<dl>'
	].concat(flatten(parameters.map(parameter => {
		return [
		`		<dt class="parameter name">${ sanitize(parameter.name) }</dt>`,
		`		<dd class="parameter type">${ sanitize(parameter.type) }</dd>`,
		`		<dd class="parameter description">${ writeDescription(parameter.description) }</dd>`
		].concat(writeParameters(parameter.subParameters).map(indenter(2)));
	}))).concat([
		'	</dl>',
		'</dd>'
	]);
}

function functionToHtml(func: AST.Function): string[] {
	return [
		`<dl id="${ toId(func) }" class="function${
			func.isAbstract ? ' abstract' : '' }${
			func.isPrivate ? ' private' : ''}${
			func.isProtected ? ' protected' : ''}${
			func.isStatic ? ' static' : ''}">`,
		`	<dt class="name">${ toLink(func) }</dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(func.description) }</p>`,
		'	</dd>',
		`	<dd class="usage"><fieldset><legend /><pre><code>${
				sanitize(
					`${ (func.returnType !== null) ? 'var result = ' : '' }${ toUsageName(func) }(${
					func.parameters.map(parameter => parameter.name).join(', ') });`
				) }</code></pre></fieldset></dd>`
	].concat(writeParameters(func.parameters).map(indenter(1))).concat(
		(func.returnType === null) ? [] : [
		'	<dt>Returns</dt>',
		`	<dd class="return type">${ sanitize(func.returnType.type) }</dd>`,
		`	<dd class="return description">${ writeDescription(func.returnType.description) }</dd>`
		]
	).concat([
		'</dl>',
		''
	]);
}

function interfaceToHtml(interfase: AST.Interface): string[] {
	var members: AST.InterfaceMember[] = [];
	Object.keys(interfase.members).forEach(function (memberName) {
		members.push(interfase.members[memberName]);
	});

	members.sort(sorter);

	return [
		`<dl id="${ toId(interfase) }" class="interface${ interfase.isPrivate ? ' private' : '' }">`,
		`	<dt class="name">interface ${ toLink(interfase) }${ (interfase.baseTypes.length > 0) ? ` extends ${
			interfase.baseTypes.map(baseType => baseType instanceof AST.TypeReference ? toLink(baseType) : baseType.name).join(', ')
		}` : '' }</dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(interfase.description) }</p>`,
		'	</dd>',
		'	<dd class="members">'
	].concat(flatten(members.map(member => {
		if (member instanceof AST.Property) {
			return propertyToHtml(member).map(indenter(2));
		}
		else if (member instanceof AST.Function) {
			return functionToHtml(member).map(indenter(2));
		}
		else {
			throw new Error(`Unrecognized member type: ${ (<any>member.constructor).name }`);
		}
	}))).concat([
		'	</dd>',
		'</dl>',
		''
	]);
}

function classToHtml(clazz: AST.Class): string[] {
	var members: AST.InterfaceMember[] = [];
	Object.keys(clazz.members).forEach(function (memberName) {
		members.push(clazz.members[memberName]);
	});

	members.sort(sorter);

	return [
		`<dl id="${ toId(clazz) }" class="clazz${
			clazz.isAbstract ? ' abstract' : ''}${
			clazz.isPrivate ? ' private' : ''}">`,
		`	<dt class="name">class ${ toLink(clazz) }${
				(clazz.baseType !== null) ? ` extends ${ (clazz.baseType instanceof AST.TypeReference) ? toLink(<AST.TypeReference>clazz.baseType) : clazz.baseType.name }` : '' }${
				(clazz.interfaces.length > 0) ? ` implements ${ clazz.interfaces.map(interfase => interfase instanceof AST.TypeReference ? toLink(interfase) : interfase.name).join(', ') }` : ''}</dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(clazz.description) }</p>`,
		'	</dd>',
		`	<dd class="usage"><fieldset><legend /><pre><code>${
				sanitize(
					`var ${ toVariableName(clazz) } = new ${ toUsageName(clazz) }(${
					clazz.parameters.map(parameter => parameter.name).join(', ') });`
				) }</code></pre></fieldset></dd>`
	].concat(writeParameters(clazz.parameters).map(indenter(1))).concat([
		'	<dd class="members">'
	]).concat(flatten(members.map(member => {
		if (member instanceof AST.Property) {
			return propertyToHtml(member).map(indenter(2));
		}
		else if (member instanceof AST.Function) {
			return functionToHtml(member).map(indenter(2));
		}
		else {
			throw new Error(`Unrecognized member type: ${ (<any>member.constructor).name }`);
		}
	}))).concat([
		'	</dd>',
		'</dl>',
		''
	]);
}

function enumToHtml(enumType: AST.Enum): string[] {
	return [
		`<dl id="${ toId(enumType) }" class="enum${ enumType.isPrivate ? ' private' : '' }">`,
		`	<dt class="name">enum <a href="#${ sanitize(enumType.fullName) }">${ sanitize(enumType.name) }</a></dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(enumType.description) }</p>`,
		'	</dd>'
	].concat([
		'	<dd class="members">'
	]).concat(flatten(enumType.members.map(member => [
		`		<dl id="${ toId(member) }" class="member">`,
		`			<dt class="name">${ toLink(member) } = ${ member.value }</dt>`,
		'			<dd class="description">',
		`				<p>${ writeDescription(member.description) }</p>`,
		'			</dd>',
		'		</dl>'
		]))).concat([
		'	</dd>',
		'</dl>',
		''
	]);
}

function propertyToHtml(property: AST.Property): string[] {
	return [
		`<dl id="${ toId(property) }" class="property">`,
		`	<dt class="name">${ toLink(property) }</dt>`
	].concat((property.getter === null) ? [] : [
		`	<dt class="getter${ property.getter.isPrivate ? ' private' : '' }">Getter</dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(property.getter.description) }</p>`,
		'	</dd>',
		`	<dd class="usage"><fieldset><legend /><pre><code>${ sanitize(`var result = ${ toUsageName(property) };`) }</code></pre></fieldset></dd>`,
		`	<dd class="return type">${ sanitize(property.getter.type) }</dd>`
	]).concat((property.setter === null) ? [] : [
		`	<dt class="setter${ property.setter.isPrivate ? ' private' : '' }">Setter</dt>`,
		'	<dd class="description">',
		`		<p>${ writeDescription(property.setter.description) }</p>`,
		'	</dd>',
		`	<dd class="usage"><fieldset><legend /><pre><code>${ sanitize(`${ toUsageName(property) } = value;`) }</code></pre></fieldset></dd>`
	].concat(writeParameters([new AST.Parameter("value", "", property.setter.type)]).map(indenter(1)))).concat([
		'</dl>',
		''
	]);
}

export function gulp(outputFilePath: string, root: string, rootNamespaceName: string): any {
	var compiler = new Compiler();

	return makeTransform(function (file: Vinyl) {
		var self: Transform = this;

		// Compile
		compiler.compile(file);

		// Walk
		var walkResult = walk(compiler, root, rootNamespaceName);
		var namespaces = walkResult.namespaces;
		var modules = walkResult.modules;

		// Make HTML

		var namespaceNames = Object.keys(namespaces)
			.filter(namespaceName => namespaceName.substr(0, rootNamespaceName.length) === rootNamespaceName)
			.sort((ns1, ns2) => ns1.localeCompare(ns2));

		var moduleNames = Object.keys(modules).sort((ns1, ns2) => ns1.localeCompare(ns2));

		moduleNames = moduleNames.filter(moduleName => Object.keys(modules[moduleName].members).length > 0);

		self.push(new Vinyl({
			path: outputFilePath,
			contents: Buffer.concat([new Buffer(
`<?xml version="1.0" encoding="utf-8" ?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
	<head>
		<title>${ rootNamespaceName } API Documentation</title>
		<style type="text/css">
		<![CDATA[
			html, body, .navigation, .content {
				height: 100%;
				margin: 0;
			}

			.navigation, .content {
				overflow-y: scroll;
			}

			.navigation {
				float: left;
				background-color: white;
				padding: 0 20px;
				margin-right: 20px;
			}

			.navigation .namespace, .navigation .module {
				margin-top: 1em;
			}

			.navigation .elements {
				margin: 0;
			}

			.content > section:not(:last-child) {
				border-bottom: 1px solid black;
			}

			.clazz, .enum, .function, .interface, .property {
				margin-left: 30px;
				padding: 10px;
			}

			.getter, .setter {
				font-size: large;
			}

			section > .clazz:nth-child(2n), section > .enum:nth-child(2n), section > .function:nth-child(2n), section > .interface:nth-child(2n), section > .property:nth-child(2n) {
				background-color: rgb(221, 250, 238);
			}

			section > .clazz:nth-child(2n + 1), section > .enum:nth-child(2n + 1), section > .function:nth-child(2n + 1), section > .interface:nth-child(2n + 1), section > .property:nth-child(2n + 1) {
				background-color: rgb(244, 250, 221);
			}

			.name {
				font-size: x-large;
			}

			.usage {
				font-size: large;
				font-style: italic;
			}

			.usage legend:before {
				content: "Usage";
			}

			.usage fieldset {
				min-width: initial;
				overflow-x: auto;
			}

			.usage pre {
				margin: 0;
			}

			.clazz .function, .clazz .property, .interface .function, .interface .property, .enum .member {
				background-color: rgb(250, 241, 221);
			}

			.parameter.name {
				font-size: large;
			}

			.type {
				font-style: italic;
			}

			.type:before {
				content: "Type: ";
			}

			.abstract > .name:before {
				content: "abstract ";
			}

			.clazz .private > .name:before {
				content: "private ";
			}

			.clazz .protected > .name:before {
				content: "protected ";
			}

			.static > .name:before {
				content: "static ";
			}

			.abstract.private > .name:before {
				content: "abstract private ";
			}

			.private.static > .name:before {
				content: "static private ";
			}

			.abstract.protected > .name:before {
				content: "abstract protected ";
			}

			.protected.static > .name:before {
				content: "static protected ";
			}

			body:not(.show-private) .clazz .private, body:not(.show-private) .clazz .protected, body:not(.show-private) .module {
				display: none;
			}

			.description .code {
				margin-left: 30px;
			}
		]]>
		</style>
		<script>
		<![CDATA[
			addEventListener("DOMContentLoaded", function () {
				document.querySelector("#show-private").addEventListener("change", function (event) {
					document.body.className = (event.target.checked ? "show-private" : "");
				}, false);

				showPrivateIfNecessary();
			}, false);

			function showPrivateIfNecessary() {
				var jumpToElement = document.querySelector("[id=\\"" + location.hash.substr(1) + "\\"]");
				if (jumpToElement !== null && jumpToElement.offsetHeight === 0) {
					document.querySelector("#show-private").click()
					jumpToElement.scrollIntoView();
				}
			}

			addEventListener("hashchange", showPrivateIfNecessary, false);
		]]>
		</script>
	</head>
	<body>
		<nav class="navigation">
			<label><input type="checkbox" id="show-private" />Show private</label>
`
			)].concat(namespaceNames.map(namespaceName => {
				var namespace = namespaces[namespaceName];

				var namespaceMembers: AST.NamespaceMember[] = [];
				for (let memberName of Object.keys(namespace.members)) {
					namespaceMembers.push(namespace.members[memberName]);
				}

				namespaceMembers.sort(sorter);

				return Buffer.concat([new Buffer(
`			<fieldset class="namespace">
				<legend><a href="#${ sanitize(namespaceName) }">${ sanitize(namespaceName) }</a></legend>
				<ul class="elements">
`
				)].concat(namespaceMembers.map(member => new Buffer(
`					<li><a href="#${ sanitize(member.fullName) }">${ sanitize(member.name) }</a></li>
`
				))).concat([new Buffer(
`				</ul>
			</fieldset>

`
				)]));
			})).concat(moduleNames.map(moduleName => {
				var module = modules[moduleName];

				var moduleMembers: AST.ModuleMemberWithoutReference[] = [];
				for (let memberName of Object.keys(module.members)) {
					var member = module.members[memberName];
					if ((<AST.HasParent><any>member).parent === module) {
						moduleMembers.push(<AST.ModuleMemberWithoutReference>member);
					}
				}

				if (moduleMembers.length === 0) {
					return new Buffer("");
				}

				moduleMembers.sort(sorter);

				return Buffer.concat([new Buffer(
`			<fieldset class="module">
				<legend><a href="#${ sanitize(moduleName) }">${ sanitize(moduleName) }</a></legend>
				<ul class="elements">
`
				)].concat(moduleMembers.map(member => new Buffer(
`					<li><a href="#${ sanitize(member.fullName) }">${ sanitize(member.name) }</a></li>
`
				))).concat([new Buffer(
`				</ul>
			</fieldset>

`
				)]));
			})).concat([new Buffer(
`		</nav>

		<div class="content">
`
			)]).concat(flatten(namespaceNames.map(namespaceName => {
				var namespace = namespaces[namespaceName];

				var namespaceMembers: AST.NamespaceMember[] = [];
				for (let memberName of Object.keys(namespace.members)) {
					namespaceMembers.push(namespace.members[memberName]);
				}

				namespaceMembers.sort(sorter);

				var properties = <AST.Property[]>namespaceMembers.filter(member => member instanceof AST.Property);
				var functions = <AST.Function[]>namespaceMembers.filter(member => member instanceof AST.Function);
				var interfaces = <AST.Interface[]>namespaceMembers.filter(member => member instanceof AST.Interface);
				var classes = <AST.Class[]>namespaceMembers.filter(member => member instanceof AST.Class);
				var enums = <AST.Enum[]>namespaceMembers.filter(member => member instanceof AST.Enum);

				var result = [new Buffer(
`			<section class="namespace">
				<h1 id="${ sanitize(namespaceName) }">Namespace ${ sanitize(namespaceName) }</h1>
`
				)];

				if (properties.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Properties</h2>
`
					));

					for (let property of properties) {
						result.push(new Buffer(propertyToHtml(property).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (functions.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Free functions</h2>
`
					));

					for (let func of functions) {
						result.push(new Buffer(functionToHtml(func).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (interfaces.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Interfaces</h2>
`
					));

					for (let interfase of interfaces) {
						result.push(new Buffer(interfaceToHtml(interfase).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (classes.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Classes</h2>
`
					));

					for (let clazz of classes) {
						result.push(new Buffer(classToHtml(clazz).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (enums.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Enums</h2>
`
					));

					for (let enumType of enums) {
						result.push(new Buffer(enumToHtml(enumType).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				result.push(new Buffer(
`			</section>
`
				));

				return result;
			}))).concat(flatten(moduleNames.map(moduleName => {
				var module = modules[moduleName];

				var moduleMembers: AST.ModuleMember[] = [];
				for (let memberName of Object.keys(module.members)) {
					var member = module.members[memberName];
					if ((<AST.HasParent><any>member).parent === module) {
						moduleMembers.push(<AST.ModuleMember>member);
					}
				}

				if (moduleMembers.length === 0) {
					return [];
				}

				moduleMembers.sort(sorter);

				var properties = <AST.Property[]>moduleMembers.filter(member => member instanceof AST.Property);
				var functions = <AST.Function[]>moduleMembers.filter(member => member instanceof AST.Function);
				var interfaces = <AST.Interface[]>moduleMembers.filter(member => member instanceof AST.Interface);
				var classes = <AST.Class[]>moduleMembers.filter(member => member instanceof AST.Class);
				var enums = <AST.Enum[]>moduleMembers.filter(member => member instanceof AST.Enum);

				var result = [new Buffer(
`			<section class="module">
				<h1 id="${ sanitize(moduleName) }">Module ${ sanitize(moduleName) }</h1>
`
				)];

				if (properties.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Properties</h2>
`
					));

					for (let property of properties) {
						result.push(new Buffer(propertyToHtml(property).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (functions.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Free functions</h2>
`
					));

					for (let func of functions) {
						result.push(new Buffer(functionToHtml(func).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (interfaces.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Interfaces</h2>
`
					));

					for (let interfase of interfaces) {
						result.push(new Buffer(interfaceToHtml(interfase).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (classes.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Classes</h2>
`
					));

					for (let clazz of classes) {
						result.push(new Buffer(classToHtml(clazz).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				if (enums.length > 0) {
					result.push(new Buffer(
`				<section>
					<h2>Enums</h2>
`
					));

					for (let enumType of enums) {
						result.push(new Buffer(enumToHtml(enumType).map(indenter(5)).join("\n")));
					}

					result.push(new Buffer(
`				</section>
`
					));
				}

				result.push(new Buffer(
`			</section>
`
				));

				return result;
			}))).concat([new Buffer(
`		</div>
	</body>
</html>
`
			)]))
		}));
	});
};
