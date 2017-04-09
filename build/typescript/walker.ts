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

import path = require("path");
import ts = require("typescript");

import { Compiler, oldGetLeadingCommentRangesOfNodeFromText } from "./compiler";

import * as AST from "./ast";

function hasModifier(node: ts.Node, flags: ts.NodeFlags): boolean {
	return (node.flags & flags) !== 0;
}

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

		this._globalNS.getMemberFullName = member => member.name;
	}

	walk(sourceFile: ts.SourceFile): void {
		const moduleName = this._moduleNameFromFileName(sourceFile.fileName);

		if (!(moduleName in this.modules)) {
			this.modules[moduleName] = new AST.Module(moduleName);
		}

		const module = this._scope.enter(this.modules[moduleName]);
		this._currentSourceFile = sourceFile;

		for (const statement of sourceFile.statements) {
			this._walk(statement, module);
		}

		this._scope.leave();
	}

	private _walk(node: ts.Node, parent: AST.Module): void {
		switch (node.kind) {
			case ts.SyntaxKind.VariableStatement:
				this._visitVariableStatement(node as ts.VariableStatement, parent);
				break;

			case ts.SyntaxKind.FunctionDeclaration:
				this._visitFunctionDeclaration(node as ts.FunctionDeclaration, parent);
				break;

			case ts.SyntaxKind.ClassDeclaration:
				this._visitClassDeclaration(node as ts.ClassDeclaration, parent);
				break;

			case ts.SyntaxKind.InterfaceDeclaration:
				this._visitInterfaceDeclaration(node as ts.InterfaceDeclaration, parent);
				break;

			case ts.SyntaxKind.EnumDeclaration:
				this._visitEnumDeclaration(node as ts.EnumDeclaration, parent);
				break;

			case ts.SyntaxKind.ImportDeclaration:
				this._visitImportDeclaration(node as ts.ImportDeclaration, parent);
				break;

			case ts.SyntaxKind.ExportDeclaration:
				this._visitExportDeclaration(node as ts.ExportDeclaration, parent);
				break;

			case ts.SyntaxKind.ExpressionStatement:
			case ts.SyntaxKind.ForOfStatement:
			case ts.SyntaxKind.IfStatement:
			case ts.SyntaxKind.TypeAliasDeclaration:
				break;

			default:
				console.error(node.kind, ts.SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	}

	private _walkClassMember(node: ts.Node, clazz: AST.Class): void {
		switch (node.kind) {
			case ts.SyntaxKind.PropertySignature:
			case ts.SyntaxKind.PropertyDeclaration:
				this._visitProperty(node as ts.PropertyDeclaration, clazz);
				break;

			case ts.SyntaxKind.MethodSignature:
			case ts.SyntaxKind.MethodDeclaration:
				this._visitMethod(node as ts.MethodDeclaration, clazz);
				break;

			case ts.SyntaxKind.GetAccessor:
				this._visitGetAccessor(node as ts.AccessorDeclaration, clazz);
				break;

			case ts.SyntaxKind.SetAccessor:
				this._visitSetAccessor(node as ts.AccessorDeclaration, clazz);
				break;

			case ts.SyntaxKind.TypeParameter:
			case ts.SyntaxKind.Parameter:
			case ts.SyntaxKind.Constructor:
				break;

			default:
				console.error(node.kind, ts.SyntaxKind[node.kind], node);
				throw new Error("Unrecognized node.");
		}
	}

	private _walkInterfaceMember(node: ts.Node, interfase: AST.Interface): void {
		switch (node.kind) {
			case ts.SyntaxKind.PropertySignature:
			case ts.SyntaxKind.PropertyDeclaration:
				this._visitProperty(node as ts.PropertyDeclaration, interfase);
				break;

			case ts.SyntaxKind.MethodSignature:
			case ts.SyntaxKind.MethodDeclaration:
				this._visitMethod(node as ts.MethodDeclaration, interfase);
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
	}

	private _visitProperty(node: ts.PropertyDeclaration, parent: AST.Class | AST.Interface) {
		if (hasModifier(node, ts.NodeFlags.Private)) {
			return;
		}

		const jsDoc = this._parseJSDoc(node);

		if (jsDoc.typeAnnotation === null) {
			this._notifyIncorrectJsDoc(`Field ${ ts.getTextOfNode(node.name) } has no @type annotation.`);
			jsDoc.typeAnnotation = "*";
		}

		const property = this._scope.enter(new AST.Property(ts.getTextOfNode(node.name)));
		parent.members[property.name] = property;
		property.getter = new AST.Getter(node, jsDoc.description, jsDoc.typeAnnotation, false);
		property.setter = new AST.Setter(node, jsDoc.description, jsDoc.typeAnnotation, false);
		this._scope.leave();
	}

	private _visitMethod(node: ts.MethodDeclaration, parent: AST.Class | AST.Interface) {
		const jsDoc = this._parseJSDoc(node);

		const parameters = this._connectParameters(node.parameters, jsDoc.parameters,
			parameterName => `Could not find @param annotation for ${ parameterName } on method ${ ts.getTextOfNode(node.name) }`
		);

		if (jsDoc.returnType === null && (node.type === undefined || node.type.kind !== ts.SyntaxKind.VoidKeyword)) {
			this._notifyIncorrectJsDoc(`Missing @return annotation for method ${ ts.getTextOfNode(node.name) }`);
			jsDoc.returnType = new AST.ReturnType("", "*");
		}

		const isPrivate = hasModifier(node, ts.NodeFlags.Private);
		const isProtected = hasModifier(node, ts.NodeFlags.Protected);
		const isStatic = hasModifier(node, ts.NodeFlags.Static);

		const generics = this._getGenericsOfSignatureDeclaration(node);

		const method = this._scope.enter(new AST.Function(ts.getTextOfNode(node.name), node, jsDoc.description, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, isProtected, isStatic));
		parent.members[method.name] = method;
		this._scope.leave();
	}

	private _visitGetAccessor(node: ts.AccessorDeclaration, clazz: AST.Class): void {
		const jsDoc = this._parseJSDoc(node);

		const name = ts.getTextOfNode(node.name);

		const isPrivate = hasModifier(node, ts.NodeFlags.Private);

		let property = clazz.members[name] as AST.Property;
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
		const jsDoc = this._parseJSDoc(node);

		const name = ts.getTextOfNode(node.name);

		const isPrivate = hasModifier(node, ts.NodeFlags.Private);

		let property = clazz.members[name] as AST.Property;
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

		const declaration = node.declarationList.declarations[0];
		if (hasModifier(declaration, ts.NodeFlags.Ambient)) {
			return;
		}

		const jsDoc = this._parseJSDoc(node);
		if (jsDoc.typeAnnotation === null) {
			return;
		}

		const property = this._scope.enter(new AST.Property(ts.getTextOfNode(declaration.name)));
		property.getter = new AST.Getter(node, jsDoc.description, jsDoc.typeAnnotation, false);

		parent.members[property.name] = property;

		this._scope.leave();
	}

	private _visitFunctionDeclaration(node: ts.FunctionDeclaration, parent: AST.Module): void {
		const jsDoc = this._parseJSDoc(node);

		const isPrivate = !hasModifier(node, ts.NodeFlags.Export);

		const generics = this._getGenericsOfSignatureDeclaration(node);

		const parameters = this._connectParameters(node.parameters, jsDoc.parameters,
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

		const freeFunction = this._scope.enter(new AST.Function(node.name.text, node, jsDoc.description, generics, parameters, jsDoc.returnType, jsDoc.isAbstract, isPrivate, false, false));

		parent.members[freeFunction.name] = freeFunction;

		this._scope.leave();
	}

	private _visitClassDeclaration(node: ts.ClassDeclaration, parent: AST.Module): void {
		const jsDoc = this._parseJSDoc(node);

		const type = this._typeChecker.getTypeAtLocation(node) as ts.InterfaceType;

		const generics = this._getGenericsOfInterfaceType(type);

		const baseTypeHeritageClauseElement = ts.getClassExtendsHeritageClauseElement(node) || null;
		let baseType: AST.UnresolvedType = null;
		if (baseTypeHeritageClauseElement !== null) {
			baseType = new AST.UnresolvedType(
				this._typeChecker.getTypeAtLocation(baseTypeHeritageClauseElement).symbol,
				this._getGenericsOfTypeReferenceNode(baseTypeHeritageClauseElement, generics)
			);
		}

		const interfaces = (ts.getClassImplementsHeritageClauseElements(node) || []).map(type => new AST.UnresolvedType(
			this._typeChecker.getTypeAtLocation(type).symbol,
			this._getGenericsOfTypeReferenceNode(type, generics)
		));

		const isPrivate = !hasModifier(node, ts.NodeFlags.Export);

		let parameters: AST.Parameter[] = [];

		if (type.symbol.members["__constructor"] !== undefined) {
			parameters = this._connectParameters((type.symbol.members["__constructor"].declarations[0] as ts.ConstructorDeclaration).parameters, jsDoc.parameters,
				parameterName => `Could not find @param annotation for ${ parameterName } on constructor in class ${ node.name.text }`
			);
		}
		else if (Object.keys(jsDoc.parameters).length > 0) {
			this._notifyIncorrectJsDoc("There are @param annotations on this class but it has no constructors.");
		}

		const clazz = this._scope.enter(new AST.Class(node.name.text, node, jsDoc.description, generics, parameters, baseType, interfaces, jsDoc.isAbstract, isPrivate));

		parent.members[clazz.name] = clazz;

		ts.forEachProperty(type.symbol.exports, symbol => {
			if (symbol.name === "prototype") {
				return;
			}

			for (const declaration of symbol.declarations) {
				this._walkClassMember(declaration, clazz);
			}
		});

		ts.forEachProperty(type.symbol.members, symbol => {
			for (const declaration of symbol.declarations) {
				this._walkClassMember(declaration, clazz);
			}
		});

		this._scope.leave();
	}

	private _visitInterfaceDeclaration(node: ts.InterfaceDeclaration, parent: AST.Module): void {
		const jsDoc = this._parseJSDoc(node);

		const type = this._typeChecker.getTypeAtLocation(node) as ts.InterfaceType;

		const generics = this._getGenericsOfInterfaceType(type);

		const baseTypes = (ts.getInterfaceBaseTypeNodes(node) || []).map(type => new AST.UnresolvedType(
			this._typeChecker.getTypeAtLocation(type).symbol,
			this._getGenericsOfTypeReferenceNode(type, generics)
		));

		const existingInterfaceType = parent.members[node.name.text];
		if (existingInterfaceType !== undefined) {
			return;
		}

		const isPrivate = !hasModifier(node, ts.NodeFlags.Export);

		const interfase = this._scope.enter(new AST.Interface(node.name.text, node, jsDoc.description, generics, baseTypes, isPrivate));
		parent.members[interfase.name] = interfase;

		ts.forEachProperty(type.symbol.members, symbol => {
			for (const declaration of symbol.declarations) {
				this._walkInterfaceMember(declaration, interfase);
			}
		});

		this._scope.leave();
	}

	private _visitEnumDeclaration(node: ts.EnumDeclaration, parent: AST.Module): void {
		const jsDoc = this._parseJSDoc(node);

		const existingEnumType = parent.members[node.name.text];
		if (existingEnumType !== undefined) {
			return;
		}

		const isPrivate = !hasModifier(node, ts.NodeFlags.Export);

		const type = this._typeChecker.getTypeAtLocation(node);

		const enumType = this._scope.enter(new AST.Enum(node.name.text, node, jsDoc.description, isPrivate));
		parent.members[enumType.name] = enumType;

		ts.forEachProperty(type.symbol.exports, symbol => {
			this._visitEnumMember(symbol.declarations[0] as ts.EnumMember, enumType);
		});

		this._scope.leave();
	}

	private _visitEnumMember(node: ts.EnumMember, parent: AST.Enum): void {
		const jsDoc = this._parseJSDoc(node);

		const value = (node.initializer === undefined) ? null : parseInt((node.initializer as ts.LiteralExpression).text);

		const enumMember = this._scope.enter(new AST.EnumMember(ts.getTextOfNode(node.name), (jsDoc === null) ? "" : jsDoc.description, value));

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

		const moduleName = this._resolve((node.moduleSpecifier as ts.LiteralExpression).text, parent);

		if ((node.importClause.namedBindings as ts.NamespaceImport).name !== undefined) {
			// import * as foo from "baz";
			parent.members[(node.importClause.namedBindings as ts.NamespaceImport).name.text] = new AST.Reference(moduleName, "*", true);
		}
		else if ((node.importClause.namedBindings as ts.NamedImports).elements !== undefined) {
			// import { foo, bar } from "baz";
			for (const element of (node.importClause.namedBindings as ts.NamedImports).elements) {
				const importedName = element.propertyName && element.propertyName.text || element.name.text;
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
			const moduleName = this._resolve((node.moduleSpecifier as ts.LiteralExpression).text, parent);
			for (const element of node.exportClause.elements) {
				const importedName = element.propertyName && element.propertyName.text || element.name.text;
				parent.members[element.name.text] = new AST.Reference(moduleName, importedName, false);
			}
		}
		else {
			// export { foo };
			for (const element of node.exportClause.elements) {
				(parent.members[element.name.text] as AST.CanBePrivate).isPrivate = false;
			}
		}
	}

	private _resolve(relativeModuleName: string, currentModule: AST.Module): string {
		let result = ts.normalizeSlashes(path.join(currentModule.name, `../${ relativeModuleName }`));

		if (result[0] !== ".") {
			result = `./${ result }`;
		}

		return result;
	}

	private _parseJSDoc(node: ts.Node): JSDoc {
		let comments = oldGetLeadingCommentRangesOfNodeFromText(node, this._currentSourceFile.text);

		if (comments === undefined) {
			comments = [];
		}

		if (comments.length > 1) {
			comments = [comments[comments.length - 1]];
		}

		const comment =
			(comments.length === 0) ?
				"" :
				this._currentSourceFile.text.substring(comments[0].pos, comments[0].end);

		const commentStartIndex = comment.indexOf("/**");
		const commentEndIndex = comment.lastIndexOf("*/");

		const lines =
			(commentStartIndex === -1 || commentEndIndex === -1) ?
				[] :
				comment.substring(commentStartIndex + 2, commentEndIndex).split("\n").map(line => {
					const match = line.match(/^[ \t]*\* (.*)/);
					if (match === null) {
						return "";
					}
					return match[1];
				});

		let rootDescription = "";

		const parameters: { [name: string]: AST.Parameter } = Object.create(null);

		let typeAnnotation: string = null;

		let returnType: AST.ReturnType = null;

		let isAbstract = false;

		let lastRead: { description: string } = null;

		for (const line of lines) {
			const firstWordMatch = line.match(/^\s*(\S+)(\s*)/);
			const firstWord = (firstWordMatch !== null) ? firstWordMatch[1] : "";
			let remainingLine = (firstWordMatch !== null) ? line.substring(firstWordMatch[0].length) : "";

			if (firstWord[0] === "@") {
				lastRead = null;
			}

			switch (firstWord) {
				case "@abstract":
					isAbstract = true;
					break;

				case "@param": {
					let type: string;
					[type, remainingLine] = this._readType(remainingLine);

					const [, name, description] = remainingLine.match(/(\S+)\s*(.*)/);

					const subParameterMatch = name.match(/^(?:(.+)\.([^\.]+))|(?:(.+)\[("[^\[\]"]+")\])$/);
					if (subParameterMatch === null) {
						parameters[name] = lastRead = new AST.Parameter(name, description, type);
					}
					else {
						const parentName = subParameterMatch[1] || subParameterMatch[3];
						const childName = subParameterMatch[2] || subParameterMatch[4];
						const parentParameter = parameters[parentName];
						parentParameter.subParameters.push(lastRead = new AST.Parameter(childName, description, type));
					}

					break;
				}

				case "@return": {
					const [type, description] = this._readType(remainingLine);

					returnType = lastRead = new AST.ReturnType(description, type);

					break;
				}

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

		let index = -1;
		let numberOfUnterminatedBraces = 0;
		for (let i = 0; i < remainingLine.length; i++) {
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

		const type = remainingLine.substr(1, index - 1);
		remainingLine = remainingLine.substr(index + 1).replace(/^\s+/, "");

		return [type, remainingLine];
	}

	private _getGenericsOfSignatureDeclaration(signatureDeclaration: ts.SignatureDeclaration): string[] {
		if (signatureDeclaration.typeParameters === undefined) {
			return [];
		}

		return signatureDeclaration.typeParameters.map(typeParameter => typeParameter.name.text);
	}

	private _getGenericsOfTypeReferenceNode(typeReferenceNode: ts.ExpressionWithTypeArguments, intrinsicGenerics: string[]): (AST.UnresolvedType | AST.IntrinsicTypeReference)[] {
		if (typeReferenceNode.typeArguments === undefined) {
			return [];
		}

		const typeReference = this._typeChecker.getTypeAtLocation(typeReferenceNode) as ts.TypeReference;

		return typeReference.typeArguments.map(typeArgument => {
			if ((typeArgument as ts.IntrinsicType).intrinsicName !== undefined) {
				return new AST.IntrinsicTypeReference((typeArgument as ts.IntrinsicType).intrinsicName);
			}

			if (typeArgument.flags & ts.TypeFlags.TypeParameter) {
				if (intrinsicGenerics.indexOf(typeArgument.symbol.name) !== -1) {
					return new AST.IntrinsicTypeReference(typeArgument.symbol.name);
				}

				throw new Error(`Unbound type parameter ${ typeArgument.symbol.name }`);
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
			let parameterName = (parameter.name as ts.Identifier).text;
			if (parameterName[0] === "_") {
				parameterName = parameterName.substr(1);
			}

			let jsDocParameter = jsDocParameters[parameterName];

			if (jsDocParameter === undefined) {
				this._notifyIncorrectJsDoc(onMissingMessageCallback.call(this, parameterName));
				jsDocParameter = new AST.Parameter(parameterName, "*", "");
			}

			return jsDocParameter;
		});
	}

	private _notifyIncorrectJsDoc(message: string): void {
		const fileName = path.basename(this._currentSourceFile.fileName);
		if (fileName === "lib.es5.d.ts" || fileName === "lib.dom.d.ts") {
			return;
		}

		throw new Error(`${ fileName }: ${ this._scope.current.fullName }: ${ message }`);
	}

	link(rootNamespaceName: string): void {
		for (const moduleName of Object.keys(this.modules)) {
			const module = this.modules[moduleName];

			for (const memberName of Object.keys(module.members)) {
				const member = module.members[memberName];

				if (member instanceof AST.Class) {
					if (member.unresolvedBaseType instanceof AST.UnresolvedType) {
						member.baseType = this._resolveTypeReference(member.unresolvedBaseType);
					}
					else {
						member.baseType = member.unresolvedBaseType;
					}

					member.interfaces = member.unresolvedInterfaces.map(interfase => {
						if (interfase instanceof AST.UnresolvedType) {
							return this._resolveTypeReference(interfase);
						}

						return interfase;
					});
				}

				else if (member instanceof AST.Interface) {
					member.baseTypes = member.unresolvedBaseTypes.map(baseType => {
						if (baseType instanceof AST.UnresolvedType) {
							return this._resolveTypeReference(baseType);
						}

						return baseType;
					});
				}

				else if (member instanceof AST.Enum) {
					let value = 0;
					for (const enumMember of member.members) {
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
		for (const memberName of Object.keys(module.members)) {
			let member = module.members[memberName];

			if (member instanceof AST.Reference) {
				if (member.isPrivate) {
					continue;
				}

				if (member.name === "*") {
					const newNamespace = this._scope.enter(new AST.Namespace(memberName));

					const existingNamespace = this.namespaces[newNamespace.fullName];
					if (existingNamespace !== undefined) {
						this._scope.leave();
						this._scope.enter(existingNamespace);
					}
					else {
						this.namespaces[newNamespace.fullName] = newNamespace;
					}

					let referencedModuleName = member.moduleName;
					let referencedModule = this.modules[referencedModuleName];
					if (referencedModule === undefined && ((referencedModuleName + "/index") in this.modules)) {
						member.moduleName = referencedModuleName = referencedModuleName + "/index";
						referencedModule = this.modules[referencedModuleName];
					}
					this._moduleToNamespace(referencedModule);

					this._scope.leave();
				}
				else {
					while (member instanceof AST.Reference) {
						member = this.modules[member.moduleName].members[member.name];
					}

					this._scope.enter(member);
					this._scope.leave();
					(this._scope.current as AST.Namespace).members[member.name] = member;
				}
			}
			else if (!(member as AST.CanBePrivate).isPrivate) {
				this._scope.enter(member);
				this._scope.leave();
				(this._scope.current as AST.Namespace).members[member.name] = member;
			}
		}
	}

	private _resolveTypeReference(unresolvedType: AST.UnresolvedType): AST.TypeReference {
		let node: ts.Node = unresolvedType.symbol.declarations[0];
		while (node.kind !== ts.SyntaxKind.SourceFile) {
			node = node.parent;
		}

		const sourceFile = node as ts.SourceFile;

		const moduleName = this._moduleNameFromFileName(sourceFile.fileName);
		const module = this.modules[moduleName];

		let result = module.members[unresolvedType.symbol.name];

		if (result === undefined) {
			throw new Error(`Type ${ unresolvedType.symbol.name } could not be resolved.`);
		}

		while (result instanceof AST.Reference) {
			result = this.modules[result.moduleName].members[result.name];
		}

		const resultGenerics = unresolvedType.generics.map(generic => {
			if (generic instanceof AST.UnresolvedType) {
				return this._resolveTypeReference(generic);
			}

			return generic;
		});

		return new AST.TypeReference(result, resultGenerics);
	}

	private _moduleNameFromFileName(fileName: string): string {
		let result = ts.normalizeSlashes(path.relative(this._compiler.projectRoot, fileName));

		result = result.substr(0, result.length - ".ts".length);

		if (result[0] !== ".") {
			result = `./${ result }`;
		}

		return result;
	}
}

export function walk(compiler: Compiler, root: string, rootNamespaceName: string) {
	const sourceFiles = compiler.sourceFiles;

	const walker = new Walker(compiler);

	// Walk
	for (const sourceFile of sourceFiles) {
		if (
			path.basename(sourceFile.fileName) === "lib.es5.d.ts" ||
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
