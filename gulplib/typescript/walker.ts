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

import * as path from "path";
import * as ts from "typescript";

import { Compiler, oldGetLeadingCommentRangesOfNode } from "./compiler";

import * as AST from "./ast";

interface JSDoc {
	description: string;
	isAbstract: boolean;
	parameters: { [name: string]: AST.Parameter };
	returnType: AST.ReturnType;
	typeAnnotation: string;
}

class WalkerScope {
	private _scopes: AST.HasParent[] = [];

	get current(): AST.HasParent {
		return (this._scopes.length > 0) ? this._scopes[this._scopes.length - 1] : null;
	}

	enter<T extends AST.HasParent>(scope: T): T {
		scope.parent = this.current;
		this._scopes.push(scope);
		return scope;
	}

	leave(): void {
		this._scopes.pop();
	}
}

class Walker {
	private _typeChecker: ts.TypeChecker;
	private _globalNS: AST.Namespace = new AST.Namespace("Global");
	private _scope: WalkerScope = new WalkerScope();

	private _currentSourceFile: ts.SourceFile;

	public modules: { [name: string]: AST.Module } = Object.create(null);
	public namespaces: { [name: string]: AST.Namespace } = Object.create(null);

	constructor(private _compiler: Compiler) {
		this._typeChecker = _compiler.typeChecker;

		this._globalNS.getMemberFullName = function (member) {
			return member.name;
		};
	}

	walk(sourceFile: ts.SourceFile): void {
		var moduleName = this._moduleNameFromFileName(sourceFile.fileName);

		if (!(moduleName in this.modules)) {
			this.modules[moduleName] = new AST.Module(moduleName);
		}

		var module = this._scope.enter(this.modules[moduleName]);
		this._currentSourceFile = sourceFile;

		for (let statement of sourceFile.statements) {
			this._walk(statement, module);
		}

		this._scope.leave();
	}

	private _walk(node: ts.Node, parent: AST.Module): void {
		switch (node.kind) {
			case ts.SyntaxKind.VariableStatement:
				this._visitVariableStatement(<ts.VariableStatement>node, parent);
				break;

			case ts.SyntaxKind.FunctionDeclaration:
				this._visitFunctionDeclaration(<ts.FunctionDeclaration>node, parent);
				break;

			case ts.SyntaxKind.ClassDeclaration:
				this._visitClassDeclaration(<ts.ClassDeclaration>node, parent);
				break;

			case ts.SyntaxKind.InterfaceDeclaration:
				this._visitInterfaceDeclaration(<ts.InterfaceDeclaration>node, parent);
				break;

			case ts.SyntaxKind.EnumDeclaration:
				this._visitEnumDeclaration(<ts.EnumDeclaration>node, parent);
				break;

			case ts.SyntaxKind.ImportDeclaration:
				this._visitImportDeclaration(<ts.ImportDeclaration>node, parent);
				break;

			case ts.SyntaxKind.ExportDeclaration:
				this._visitExportDeclaration(<ts.ExportDeclaration>node, parent);
				break;

			case ts.SyntaxKind.ExpressionStatement:
			case ts.SyntaxKind.ForOfStatement:
			case ts.SyntaxKind.IfStatement:
				break;

			default:
				console.error(node.kind, (<any>ts).SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	}

	private _walkClassMember(node: ts.Node, clazz: AST.Class): void {
		switch (node.kind) {
			case ts.SyntaxKind.PropertySignature:
			case ts.SyntaxKind.PropertyDeclaration:
				this._visitProperty(<ts.PropertyDeclaration>node, clazz);
				break;

			case ts.SyntaxKind.MethodSignature:
			case ts.SyntaxKind.MethodDeclaration:
				this._visitMethod(<ts.MethodDeclaration>node, clazz);
				break;

			case ts.SyntaxKind.GetAccessor:
				this._visitGetAccessor(<ts.AccessorDeclaration>node, clazz);
				break;

			case ts.SyntaxKind.SetAccessor:
				this._visitSetAccessor(<ts.AccessorDeclaration>node, clazz);
				break;

			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.Parameter:
			case ts.SyntaxKind.Constructor:
				break;

			default:
				console.error(node.kind, (<any>ts).SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	}

	private _walkInterfaceMember(node: ts.Node, interfase: AST.Interface): void {
		switch (node.kind) {
			case ts.SyntaxKind.PropertySignature:
			case ts.SyntaxKind.PropertyDeclaration:
				this._visitProperty(<ts.PropertyDeclaration>node, interfase);
				break;

			case ts.SyntaxKind.MethodSignature:
			case ts.SyntaxKind.MethodDeclaration:
				this._visitMethod(<ts.MethodDeclaration>node, interfase);
				break;

			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.CallSignature:
			case ts.SyntaxKind.ConstructSignature:
			case ts.SyntaxKind.IndexSignature:
				break;

			default:
				console.error(node.kind, (<any>ts).SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	}

	private _visitProperty(node: ts.PropertyDeclaration, parent: AST.Class | AST.Interface) {
		if ((node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private) {
			return;
		}

		var jsDoc = this._parseJSDoc(node);

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc(`Field ${ ts.getTextOfNode(node.name) } has no @type annotation.`);
			jsDoc.typeAnnotation = "*";
		}

		var property = this._scope.enter(new AST.Property(ts.getTextOfNode(node.name)));
		parent.members[property.name] = property;
		property.getter = new AST.Getter(node, jsDoc.description, jsDoc.typeAnnotation, false);
		property.setter = new AST.Setter(node, jsDoc.description, jsDoc.typeAnnotation, false);
		this._scope.leave();
	}

	private _visitMethod(node: ts.MethodDeclaration, parent: AST.Class | AST.Interface) {
		var jsDoc = this._parseJSDoc(node);

		var parameters = this._connectParameters(node.parameters, jsDoc.parameters,
			parameterName => `Could not find @param annotation for ${ parameterName } on method ${ ts.getTextOfNode(node.name) }`
		);

		if (jsDoc.returnType === null && (node.type === undefined || node.type.kind !== ts.SyntaxKind.VoidKeyword)) {
			this._notifyIncorrectJsDoc(`Missing @return annotation for method ${ ts.getTextOfNode(node.name) }`);
			jsDoc.returnType = new AST.ReturnType("", "*");
		}

		var isPrivate = (node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private;
		var isProtected = (node.flags & ts.NodeFlags.Protected) === ts.NodeFlags.Protected;
		var isStatic = (node.flags & ts.NodeFlags.Static) === ts.NodeFlags.Static;

		var generics = this._getGenericsOfSignatureDeclaration(node);

		var method = this._scope.enter(new AST.Function(ts.getTextOfNode(node.name), node, jsDoc.description, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));
		parent.members[method.name] = method;
		this._scope.leave();
	}

	private _visitGetAccessor(node: ts.AccessorDeclaration, clazz: AST.Class): void {
		var jsDoc = this._parseJSDoc(node);

		var name = ts.getTextOfNode(node.name);

		var isPrivate = (node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private;

		var property = <AST.Property>clazz.members[name];
		if (property === undefined) {
			this._scope.enter(property = new AST.Property(name));

			clazz.members[property.name] = property;

			this._scope.leave();
		}

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc(`Getter ${ name } has no @type annotation.`);
		}

		property.getter = new AST.Getter(node, jsDoc.description, jsDoc.typeAnnotation, isPrivate);
	}

	private _visitSetAccessor(node: ts.AccessorDeclaration, clazz: AST.Class): void {
		var jsDoc = this._parseJSDoc(node);

		var name = ts.getTextOfNode(node.name);

		var isPrivate = (node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private;

		var property = <AST.Property>clazz.members[name];
		if (property === undefined) {
			this._scope.enter(property = new AST.Property(name));

			clazz.members[property.name] = property;

			this._scope.leave();
		}

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc(`Setter ${ name } has no @type annotation.`);
		}

		property.setter = new AST.Setter(node, jsDoc.description, jsDoc.typeAnnotation, isPrivate);
	}

	private _visitVariableStatement(node: ts.VariableStatement, parent: AST.Module): void {
		if (node.declarationList.declarations.length > 1) {
			return;
		}

		var declaration = node.declarationList.declarations[0];
		if ((declaration.flags & ts.NodeFlags.Ambient) === ts.NodeFlags.Ambient) {
			return;
		}

		var jsDoc = this._parseJSDoc(node);
		if (jsDoc.typeAnnotation === null) {
			return;
		}

		var property = this._scope.enter(new AST.Property(ts.getTextOfNode(declaration.name)));
		property.getter = new AST.Getter(node, jsDoc.description, jsDoc.typeAnnotation, false);
		property.setter = new AST.Setter(node, jsDoc.description, jsDoc.typeAnnotation, false);

		parent.members[property.name] = property;

		this._scope.leave();
	}

	private _visitFunctionDeclaration(node: ts.FunctionDeclaration, parent: AST.Module): void {
		var jsDoc = this._parseJSDoc(node);

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var generics = this._getGenericsOfSignatureDeclaration(node);

		var parameters = this._connectParameters(node.parameters, jsDoc.parameters,
			parameterName => `Could not find @param annotation for ${ parameterName } on function ${ node.name.text }`
		);

		if (node.type === undefined) {
			this._notifyIncorrectJsDoc(`Missing return type annotation for function ${ node.name.text }`);
			jsDoc.returnType = new AST.ReturnType("", "*");
		}
		else if (jsDoc.returnType === null && node.type.kind !== ts.SyntaxKind.VoidKeyword) {
			this._notifyIncorrectJsDoc(`Missing @return annotation for function ${ node.name.text }`);
			jsDoc.returnType = new AST.ReturnType("", "*");
		}

		var freeFunction = this._scope.enter(new AST.Function(node.name.text, node, jsDoc.description, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, false, false));

		parent.members[freeFunction.name] = freeFunction;

		this._scope.leave();
	}

	private _visitClassDeclaration(node: ts.ClassDeclaration, parent: AST.Module): void {
		var jsDoc = this._parseJSDoc(node);

		var baseTypeHeritageClauseElement = ts.getClassExtendsHeritageClauseElement(node) || null;
		var baseType: AST.UnresolvedType = null;
		if (baseTypeHeritageClauseElement !== null) {
			baseType = new AST.UnresolvedType(
				this._typeChecker.getTypeAtLocation(baseTypeHeritageClauseElement).symbol,
				this._getGenericsOfTypeReferenceNode(baseTypeHeritageClauseElement)
			);
		}

		var interfaces = (ts.getClassImplementsHeritageClauseElements(node) || []).map(type => new AST.UnresolvedType(
			this._typeChecker.getTypeAtLocation(type).symbol,
			this._getGenericsOfTypeReferenceNode(type)
		));

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var type = <ts.InterfaceType>this._typeChecker.getTypeAtLocation(node);

		var generics = this._getGenericsOfInterfaceType(type);

		var parameters: AST.Parameter[] = [];

		if (type.symbol.members["__constructor"] !== undefined) {
			parameters = this._connectParameters((<ts.ConstructorDeclaration>type.symbol.members["__constructor"].declarations[0]).parameters, jsDoc.parameters,
				parameterName => `Could not find @param annotation for ${ parameterName } on constructor in class ${ node.name.text }`
			);
		}
		else if (Object.keys(jsDoc.parameters).length > 0) {
			this._notifyIncorrectJsDoc("There are @param annotations on this class but it has no constructors.");
		}

		var clazz = this._scope.enter(new AST.Class(node.name.text, node, jsDoc.description, generics, parameters, baseType, interfaces, jsDoc.isAbstract, isPrivate));

		parent.members[clazz.name] = clazz;

		ts.forEachValue(type.symbol.exports, symbol => {
			if (symbol.name === "prototype") {
				return;
			}

			for (let declaration of symbol.declarations) {
				this._walkClassMember(declaration, clazz);
			}
		});

		ts.forEachValue(type.symbol.members, symbol => {
			for (let declaration of symbol.declarations) {
				this._walkClassMember(declaration, clazz);
			}
		});

		this._scope.leave();
	}

	private _visitInterfaceDeclaration(node: ts.InterfaceDeclaration, parent: AST.Module): void {
		var jsDoc = this._parseJSDoc(node);

		var baseTypes = (ts.getInterfaceBaseTypeNodes(node) || []).map(type => new AST.UnresolvedType(
			this._typeChecker.getTypeAtLocation(type).symbol,
			this._getGenericsOfTypeReferenceNode(type)
		));

		var existingInterfaceType = parent.members[node.name.text];
		if (existingInterfaceType !== undefined) {
			return;
		}

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var type = <ts.InterfaceType>this._typeChecker.getTypeAtLocation(node);

		var generics = this._getGenericsOfInterfaceType(type);

		var interfase = this._scope.enter(new AST.Interface(node.name.text, node, jsDoc.description, generics, baseTypes, isPrivate));
		parent.members[interfase.name] = interfase;

		ts.forEachValue(type.symbol.members, symbol => {
			for (let declaration of symbol.declarations) {
				this._walkInterfaceMember(declaration, interfase);
			}
		});

		this._scope.leave();
	}

	private _visitEnumDeclaration(node: ts.EnumDeclaration, parent: AST.Module): void {
		var jsDoc = this._parseJSDoc(node);

		var existingEnumType = parent.members[node.name.text];
		if (existingEnumType !== undefined) {
			return;
		}

		var isPrivate = (node.flags & ts.NodeFlags.Export) !== ts.NodeFlags.Export;

		var type = this._typeChecker.getTypeAtLocation(node);

		var enumType = this._scope.enter(new AST.Enum(node.name.text, node, jsDoc.description, isPrivate));
		parent.members[enumType.name] = enumType;

		ts.forEachValue(type.symbol.exports, symbol => {
			this._visitEnumMember(<ts.EnumMember>symbol.declarations[0], enumType);
		});

		this._scope.leave();
	}

	private _visitEnumMember(node: ts.EnumMember, parent: AST.Enum): void {
		var jsDoc = this._parseJSDoc(node);

		var value = (node.initializer === undefined) ? null : parseInt((<ts.LiteralExpression>node.initializer).text);

		var enumMember = this._scope.enter(new AST.EnumMember(ts.getTextOfNode(node.name), (jsDoc === null) ? "" : jsDoc.description, value));

		parent.members.push(enumMember);

		this._scope.leave();
	}

	private _visitImportDeclaration(node: ts.ImportDeclaration, parent: AST.Module): void {
		if (node.importClause === undefined) {
			// import "foo";
			return;
		}

		if (node.importClause.namedBindings === undefined) {
			throw new Error("Default import is not supported.");
		}

		var moduleName = this._resolve((<ts.LiteralExpression>node.moduleSpecifier).text, parent);

		if ((<ts.NamespaceImport>node.importClause.namedBindings).name !== undefined) {
			// import * as foo from "baz";
			parent.members[(<ts.NamespaceImport>node.importClause.namedBindings).name.text] = new AST.Reference(moduleName, "*", true);
		}
		else if ((<ts.NamedImports>node.importClause.namedBindings).elements !== undefined) {
			// import { foo, bar } from "baz";
			for (let element of (<ts.NamedImports>node.importClause.namedBindings).elements) {
				var importedName = element.propertyName && element.propertyName.text || element.name.text;
				parent.members[element.name.text] = new AST.Reference(moduleName, importedName, true);
			}
		}
		else {
			throw new Error("Unrecognized import declaration syntax.");
		}
	}

	private _visitExportDeclaration(node: ts.ExportDeclaration, parent: AST.Module): void {
		if (node.moduleSpecifier !== undefined) {
			// export { foo } from "bar";
			var moduleName = this._resolve((<ts.LiteralExpression>node.moduleSpecifier).text, parent);
			for (let element of node.exportClause.elements) {
				var importedName = element.propertyName && element.propertyName.text || element.name.text;
				parent.members[element.name.text] = new AST.Reference(moduleName, importedName, false);
			}
		}
		else {
			// export { foo };
			for (let element of node.exportClause.elements) {
				(<AST.CanBePrivate><any>parent.members[element.name.text]).isPrivate = false;
			}
		}
	}

	private _resolve(relativeModuleName: string, currentModule: AST.Module): string {
		var result = ts.normalizeSlashes(path.join(currentModule.name, `../${ relativeModuleName }`));

		if (result[0] !== ".") {
			result = `./${ result }`;
		}

		return result;
	}

	private _parseJSDoc(node: ts.Node): JSDoc {
		var comments = oldGetLeadingCommentRangesOfNode(node, this._currentSourceFile);

		if (comments === undefined) {
			comments = [];
		}

		if (comments.length > 1) {
			comments = [comments[comments.length - 1]];
		}

		var comment =
			(comments.length === 0) ?
				"" :
				this._currentSourceFile.text.substring(comments[0].pos, comments[0].end);

		var commentStartIndex = comment.indexOf("/**");
		var commentEndIndex = comment.lastIndexOf("*/");

		var lines =
			(commentStartIndex === -1 || commentEndIndex === -1) ?
				[] :
				comment.substring(commentStartIndex + 2, commentEndIndex).split("\n").map(line => {
					var match = line.match(/^[ \t]*\* (.*)/);
					if (match === null) {
						return "";
					}
					return match[1];
				}).filter(line => line.length > 0);

		var rootDescription = "";

		var parameters: { [name: string]: AST.Parameter } = Object.create(null);

		var typeAnnotation: string = null;

		var returnType: AST.ReturnType = null;

		var isAbstract = false;

		var lastRead: { description: string } = null;

		for (let line of lines) {
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
					var type: string;
					[type, remainingLine] = this._readType(remainingLine);

					var [, name, description] = remainingLine.match(/(\S+)\s*(.*)/);

					var subParameterMatch = name.match(/^(?:(.+)\.([^\.]+))|(?:(.+)\[("[^\[\]"]+")\])$/);
					if (subParameterMatch === null) {
						parameters[name] = lastRead = new AST.Parameter(name, description, type);
					}
					else {
						var parentName = subParameterMatch[1] || subParameterMatch[3];
						var childName = subParameterMatch[2] || subParameterMatch[4];
						var parentParameter = parameters[parentName];
						parentParameter.subParameters.push(lastRead = new AST.Parameter(childName, description, type));
					}
					break;

				case "@return":
					var [type, description] = this._readType(remainingLine);

					returnType = lastRead = new AST.ReturnType(description, type);

					break;

				case "@type":
					[typeAnnotation] = this._readType(remainingLine);
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
		}

		return {
			description: rootDescription,
			isAbstract: isAbstract,
			parameters: parameters,
			returnType: returnType,
			typeAnnotation: typeAnnotation,
		};
	}

	private _readType(remainingLine: string): [string, string] {
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
		remainingLine = remainingLine.substr(index + 1).replace(/^\s+/, "");

		return [type, remainingLine];
	}

	private _getGenericsOfSignatureDeclaration(signatureDeclaration: ts.SignatureDeclaration): string[] {
		if (signatureDeclaration.typeParameters === undefined) {
			return [];
		}

		return signatureDeclaration.typeParameters.map(function (typeParameter) {
			return typeParameter.name.text;
		});
	}

	private _getGenericsOfTypeReferenceNode(typeReferenceNode: ts.TypeReferenceNode | ts.HeritageClauseElement): (AST.UnresolvedType | AST.IntrinsicTypeReference)[] {
		if (typeReferenceNode.typeArguments === undefined) {
			return [];
		}

		var typeReference = <ts.TypeReference>this._typeChecker.getTypeAtLocation(typeReferenceNode);

		return typeReference.typeArguments.map(typeArgument => {
			if ((<ts.IntrinsicType>typeArgument).intrinsicName !== undefined) {
				return new AST.IntrinsicTypeReference((<ts.IntrinsicType>typeArgument).intrinsicName);
			}

			return new AST.UnresolvedType(typeArgument.symbol, []);
		});
	}

	private _getGenericsOfInterfaceType(interfaceType: ts.InterfaceType): string[] {
		if (interfaceType.typeParameters === undefined) {
			return [];
		}

		return interfaceType.typeParameters.map(typeParameter => {
			return typeParameter.symbol.name;
		});
	}

	private _connectParameters(astParameters: ts.ParameterDeclaration[], jsDocParameters: { [name: string]: AST.Parameter }, onMissingMessageCallback: (parameterName: string) => string) {
		return astParameters.map(parameter => {
			var parameterName = (<ts.Identifier>parameter.name).text;
			if (parameterName[0] === "_") {
				parameterName = parameterName.substr(1);
			}

			var jsDocParameter = jsDocParameters[parameterName];

			if (jsDocParameter === undefined) {
				this._notifyIncorrectJsDoc(onMissingMessageCallback.call(this, parameterName));
				jsDocParameter = new AST.Parameter(parameterName, "*", "");
			}

			return jsDocParameter;
		});
	}

	private _notifyIncorrectJsDoc(message: string): void {
		var fileName = path.basename(this._currentSourceFile.fileName);
		if (fileName === "lib.core.d.ts" || fileName === "lib.dom.d.ts") {
			return;
		}

		throw new Error(`${ fileName }: ${ this._scope.current.fullName }: ${ message }`);
	}

	link(rootNamespaceName: string): void {
		for (let moduleName of Object.keys(this.modules)) {
			var module = this.modules[moduleName];

			for (let memberName of Object.keys(module.members)) {
				var member = module.members[memberName];

				if (member instanceof AST.Class) {
					if (member.unresolvedBaseType instanceof AST.UnresolvedType) {
						member.baseType = this._resolveTypeReference(<AST.UnresolvedType>member.unresolvedBaseType);
					}
					else {
						member.baseType = <AST.TypeReference | AST.IntrinsicTypeReference>member.unresolvedBaseType;
					}

					member.interfaces = member.unresolvedInterfaces.map(interfase => {
						if (interfase instanceof AST.UnresolvedType) {
							return this._resolveTypeReference(interfase);
						}

						return <AST.TypeReference | AST.IntrinsicTypeReference>interfase;
					});
				}

				else if (member instanceof AST.Interface) {
					member.baseTypes = member.unresolvedBaseTypes.map(baseType => {
						if (baseType instanceof AST.UnresolvedType) {
							return this._resolveTypeReference(baseType);
						}

						return <AST.TypeReference | AST.IntrinsicTypeReference>baseType;
					});
				}

				else if (member instanceof AST.Enum) {
					var value = 0;
					for (let enumMember of member.members) {
						if (enumMember.value === null) {
							enumMember.value = value;
						}
						else {
							value = enumMember.value;
						}

						value++;
					}
				}
			}
		}

		this.namespaces[rootNamespaceName] = this._scope.enter(new AST.Namespace(rootNamespaceName));
		this._moduleToNamespace(this.modules["./index"]);
		this._scope.leave();
	}

	private _moduleToNamespace(module: AST.Module): void {
		for (let memberName of Object.keys(module.members)) {
			var member = module.members[memberName];

			if (member instanceof AST.Reference) {
				if ((<AST.Reference>member).isPrivate) {
					continue;
				}

				if (member.name === "*") {
					var newNamespace = this._scope.enter(new AST.Namespace(memberName));

					var existingNamespace = this.namespaces[newNamespace.fullName];
					if (existingNamespace !== undefined) {
						this._scope.leave();
						this._scope.enter(existingNamespace);
					}
					else {
						this.namespaces[newNamespace.fullName] = newNamespace;
					}

					this._moduleToNamespace(this.modules[(<AST.Reference>member).moduleName]);

					this._scope.leave();
				}
				else {
					while (member instanceof AST.Reference) {
						member = this.modules[(<AST.Reference>member).moduleName].members[member.name];
					}

					this._scope.enter(<AST.NamespaceMember><any>member);
					this._scope.leave();
					(<AST.Namespace>this._scope.current).members[member.name] = <AST.NamespaceMember>member;
				}
			}
			else if (!(<AST.CanBePrivate><any>member).isPrivate) {
				this._scope.enter(<AST.NamespaceMember>member);
				this._scope.leave();
				(<AST.Namespace>this._scope.current).members[member.name] = <AST.NamespaceMember>member;
			}
		}
	}

	private _resolveTypeReference(unresolvedType: AST.UnresolvedType): AST.TypeReference {
		var node: ts.Node = unresolvedType.symbol.declarations[0];
		while (node.kind !== ts.SyntaxKind.SourceFile) {
			node = node.parent;
		}

		var sourceFile = <ts.SourceFile>node;

		var moduleName = this._moduleNameFromFileName(sourceFile.fileName);
		var module = this.modules[moduleName];

		var result = module.members[unresolvedType.symbol.name];

		if (result === undefined) {
			throw new Error(`Type ${ unresolvedType.symbol.name } could not be resolved.`);
		}

		while (result instanceof AST.Reference) {
			result = this.modules[(<AST.Reference>result).moduleName].members[result.name];
		}

		var resultGenerics = unresolvedType.generics.map(generic => {
			if (generic instanceof AST.UnresolvedType) {
				return this._resolveTypeReference(generic);
			}

			return <AST.IntrinsicTypeReference>generic;
		});

		return new AST.TypeReference(<AST.NamespaceMember><any>result, resultGenerics);
	}

	private _moduleNameFromFileName(fileName: string): string {
		var result = ts.normalizeSlashes(path.relative(this._compiler.projectRoot, fileName));

		result = result.substr(0, result.length - ".ts".length);

		if (result[0] !== ".") {
			result = `./${ result }`;
		}

		return result;
	}
}

export function walk(compiler: Compiler, root: string, rootNamespaceName: string) {
	var sourceFiles = compiler.sourceFiles;
	var rootFileName = ts.normalizeSlashes(path.resolve(root));
	var rootSourceFile = sourceFiles.filter(function (sourceFile) {
		return sourceFile.fileName === rootFileName;
	})[0];

	var walker = new Walker(compiler);

	// Walk
	for (let sourceFile of sourceFiles) {
		if (
			path.basename(sourceFile.fileName) === "lib.core.d.ts" ||
			path.basename(sourceFile.fileName) === "lib.dom.d.ts" ||
			sourceFile.fileName.substr(-"references.d.ts".length) === "references.d.ts"
		) {
			continue;
		}

		walker.walk(sourceFile);
	}

	// Link base types and set enum member values if unspecified.
	walker.link(rootNamespaceName);

	// Return types
	return { namespaces: walker.namespaces, modules: walker.modules };
}
