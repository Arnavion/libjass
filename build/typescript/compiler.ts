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

import { File, FileTransform } from "async-build";

import * as AST from "./ast";
import { walk } from "./walker";

export interface StreamingCompilerHost extends ts.CompilerHost {
	setOutputStream(outputStream: FileTransform): void;
}

function createCompilerHost(options: ts.CompilerOptions): StreamingCompilerHost {
	const host = ts.createCompilerHost(options) as StreamingCompilerHost;

	let _outputStream: FileTransform = null;
	host.setOutputStream = outputStream => _outputStream = outputStream;

	host.writeFile = (fileName, data, writeByteOrderMark, onError?, sourceFiles?): void => {
		_outputStream.push({
			path: fileName,
			contents: new Buffer(data)
		});
	};

	host.useCaseSensitiveFileNames = () => true;

	host.getNewLine = () => "\n";

	return host;
}

export class Compiler {
	private _projectRoot: string = null;
	private _host: StreamingCompilerHost;
	private _program: ts.Program = null;

	compile(projectConfigFile: File) {
		this._projectRoot = path.dirname(projectConfigFile.path);

		const projectConfig = ts.parseJsonConfigFileContent(JSON.parse(projectConfigFile.contents.toString()), ts.sys, this._projectRoot);

		this._host = createCompilerHost(projectConfig.options);
		this._program = ts.createProgram(projectConfig.fileNames, projectConfig.options, this._host);

		const syntacticDiagnostics = this._program.getSyntacticDiagnostics();
		if (syntacticDiagnostics.length > 0) {
			this._reportDiagnostics(syntacticDiagnostics);
			throw new Error("There were one or more syntactic diagnostics.");
		}

		const optionsDiagnostics = this._program.getOptionsDiagnostics();
		if (optionsDiagnostics.length > 0) {
			this._reportDiagnostics(optionsDiagnostics);
			throw new Error("There were one or more options diagnostics.");
		}

		const globalDiagnostics = this._program.getGlobalDiagnostics();
		if (globalDiagnostics.length > 0) {
			this._reportDiagnostics(globalDiagnostics);
			throw new Error("There were one or more global diagnostics.");
		}

		const semanticDiagnostics = this._program.getSemanticDiagnostics();
		if (semanticDiagnostics.length > 0) {
			this._reportDiagnostics(semanticDiagnostics);
			throw new Error("There were one or more semantic diagnostics.");
		}
	};

	writeFiles(outputStream: FileTransform) {
		this._host.setOutputStream(outputStream);

		const emitDiagnostics = this._program.emit().diagnostics;
		if (emitDiagnostics.length > 0) {
			this._reportDiagnostics(emitDiagnostics);
			throw new Error("There were one or more emit diagnostics.");
		}
	};

	get projectRoot(): string {
		return this._projectRoot;
	}

	get typeChecker(): ts.TypeChecker {
		return this._program.getTypeChecker();
	}

	get sourceFiles(): ts.SourceFile[] {
		return this._program.getSourceFiles();
	}

	private _reportDiagnostics(diagnostics: ts.Diagnostic[]) {
		for (const diagnostic of diagnostics) {
			let message = "";

			if (diagnostic.file) {
				const location = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
				message = `${ diagnostic.file.fileName }(${ location.line + 1 },${ location.character }): `;
			}

			message +=
				ts.DiagnosticCategory[diagnostic.category].toLowerCase() +
				` TS${ diagnostic.code }: ` +
				ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

			console.error(message);
		}
	};
}

export function build(root: string, rootNamespaceName: string): FileTransform {
	const compiler = new Compiler();

	return new FileTransform(function (projectConfigFile): void {
		console.log("Compiling " + projectConfigFile.path + "...");

		compiler.compile(projectConfigFile);

		const walkResult = walk(compiler, root, rootNamespaceName);
		addJSDocComments(walkResult.modules);

		compiler.writeFiles(this);

		console.log("Compile succeeded.");
	});
}

function addJSDocComments(modules: { [name: string]: AST.Module }): void {
	function visitor(current: AST.Module | AST.ModuleMember | AST.InterfaceMember) {
		if (current instanceof AST.Module) {
			for (const memberName of Object.keys(current.members)) {
				visitor(current.members[memberName]);
			}

			return;
		}

		const newComments: string[] = [];

		if (current instanceof AST.Class) {
			newComments.push("@constructor");

			if (current.baseType !== null) {
				const baseType = current.baseType;
				newComments.push(
					"@extends {" +
					baseType.fullName + (
						(baseType instanceof AST.TypeReference && baseType.generics.length) > 0 ?
							(".<" + (baseType as AST.TypeReference).generics.map(generic => generic.fullName).join(", ") + ">") :
							""
					) +
					"}"
				);
			}

			if (current.interfaces.length > 0) {
				current.interfaces.forEach(interfase => {
					newComments.push(
						"@implements {" +
						interfase.fullName + (
							(interfase instanceof AST.TypeReference && interfase.generics.length > 0) ?
								(".<" + interfase.generics.map(generic => generic.fullName).join(", ") + ">") :
								""
						) +
						"}"
					);
				});
			}

			Object.keys(current.members).forEach(memberName => visitor(current.members[memberName]));
		}
		else if (current instanceof AST.Enum) {
			newComments.push("@enum");
		}
		else if (current instanceof AST.Reference) {
			return;
		}

		if (current.parent instanceof AST.Namespace) {
			newComments.push("@memberOf " + current.parent.fullName);
		}

		if (AST.hasStringGenerics(current) && current.generics.length > 0) {
			newComments.push("@template " + current.generics.join(", "));
		}

		if ((current as AST.CanBePrivate).isPrivate) {
			newComments.push("@private");
		}

		if ((current as AST.CanBeProtected).isProtected) {
			newComments.push("@protected");
		}

		if ((current as AST.CanBeStatic).isStatic) {
			newComments.push("@static");
		}

		if (newComments.length > 0) {
			if (current instanceof AST.Property) {
				const nodes: ts.Node[] = [];
				if (current.getter !== null) { nodes.push(current.getter.astNode); }
				if (current.setter !== null && nodes[0] !== current.setter.astNode) { nodes.push(current.setter.astNode); }
				for (const node of nodes) {
					(node as any)["typescript-new-comment"] = newComments;
				}
			}
			else {
				(current.astNode as any)["typescript-new-comment"] = newComments;
			}
		}
	}

	for (const moduleName of Object.keys(modules)) {
		visitor(modules[moduleName]);
	}
}

class FakeSourceFile {
	public text: string;
	public lineMap: number[];

	constructor(originalSourceFile: ts.SourceFile) {
		this.text = originalSourceFile.text;
		this.lineMap = ts.getLineStarts(originalSourceFile).slice();
	}

	addComment(originalComment: ts.CommentRange, newComments: string[]): ts.CommentRange & { sourceFile: FakeSourceFile } {
		var pos = this.text.length;

		this.text += "/**\n";
		this.lineMap.push(this.text.length);

		var originalCommentLines = this.text.substring(originalComment.pos, originalComment.end).split("\n");
		originalCommentLines.shift();

		originalCommentLines = originalCommentLines.map(line => line.replace(/^\s+/, " "));

		if (originalCommentLines.length > 1) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " *");
		}

		for (const newComment of newComments) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " * " + newComment);
		}

		for (const newCommentLine of originalCommentLines) {
			this.text += newCommentLine + "\n";
			this.lineMap.push(this.text.length);
		}

		var end = this.text.length;

		return { pos, end, hasTrailingNewLine: originalComment.hasTrailingNewLine, kind: ts.SyntaxKind.MultiLineCommentTrivia, sourceFile: this };
	}
}

var fakeSourceFiles: { [name: string]: FakeSourceFile } = Object.create(null);

export const oldGetLeadingCommentRangesOfNodeFromText: typeof ts.getLeadingCommentRangesOfNodeFromText = ts.getLeadingCommentRangesOfNodeFromText.bind(ts);

ts.getLeadingCommentRangesOfNodeFromText = (node: ts.Node, text: string) => {
	const originalComments = oldGetLeadingCommentRangesOfNodeFromText(node, text);

	if (originalComments !== undefined && (<any>node)["typescript-new-comment"] !== undefined) {
		const sourceFileOfNode = ts.getSourceFileOfNode(node);
		let fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName];
		if (fakeSourceFile === undefined) {
			fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName] = new FakeSourceFile(sourceFileOfNode);
		}

		originalComments[originalComments.length - 1] = fakeSourceFile.addComment(originalComments[originalComments.length - 1], (<any>node)["typescript-new-comment"]);
	}

	return originalComments;
};

var oldWriteCommentRange: typeof ts.writeCommentRange = ts.writeCommentRange.bind(ts);
ts.writeCommentRange = (text: string, lineMap: number[], writer: ts.EmitTextWriter, comment: ts.CommentRange, newLine: string) => {
	if ((<{ sourceFile: ts.SourceFile }><any>comment).sourceFile) {
		const currentSourceFile = (<{ sourceFile: ts.SourceFile }><any>comment).sourceFile;
		text = currentSourceFile.text;
		lineMap = currentSourceFile.lineMap;
	}

	return oldWriteCommentRange(text, lineMap, writer, comment, newLine);
};
