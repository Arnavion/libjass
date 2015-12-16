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
import * as ts from "typescript";

import { File, FileTransform, FileWatcher } from "async-build";

import * as AST from "./ast";
import { walk } from "./walker";

export interface StreamingCompilerHost extends ts.CompilerHost, ts.ParseConfigHost {
	setOutputStream(outputStream: FileTransform): void;
}

export class Compiler {
	private _projectRoot: string = null;
	private _program: ts.Program = null;

	constructor(private _host: StreamingCompilerHost = new CompilerHost()) { }

	compile(projectConfigFile: File) {
		this._projectRoot = path.dirname(projectConfigFile.path);

		var projectConfig = ts.parseJsonConfigFileContent(JSON.parse(projectConfigFile.contents.toString()), this._host, this._projectRoot);

		this._program = ts.createProgram(projectConfig.fileNames, projectConfig.options, this._host);

		var syntacticDiagnostics = this._program.getSyntacticDiagnostics();
		if (syntacticDiagnostics.length > 0) {
			this._reportDiagnostics(syntacticDiagnostics);
			throw new Error("There were one or more syntactic diagnostics.");
		}

		var globalDiagnostics = this._program.getGlobalDiagnostics();
		if (globalDiagnostics.length > 0) {
			this._reportDiagnostics(globalDiagnostics);
			throw new Error("There were one or more global diagnostics.");
		}

		var semanticDiagnostics = this._program.getSemanticDiagnostics();
		if (semanticDiagnostics.length > 0) {
			this._reportDiagnostics(semanticDiagnostics);
			throw new Error("There were one or more semantic diagnostics.");
		}
	};

	writeFiles(outputStream: FileTransform) {
		this._host.setOutputStream(outputStream);

		var emitDiagnostics = this._program.emit().diagnostics;
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
			var message = "";

			if (diagnostic.file) {
				var location = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
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

const typeScriptModulePath = path.dirname(require.resolve("typescript"));

class CompilerHost implements StreamingCompilerHost {
	protected _sourceFiles = Object.create(null);

	private _outputStream: FileTransform = null;

	setOutputStream(outputStream: FileTransform): void {
		this._outputStream = outputStream;
	}

	// ts.ModuleResolutionHost members

	fileExists(fileName: string): boolean {
		return fs.existsSync(fileName);
	}

	readFile(fileName: string): string {
		if (!this.fileExists(fileName)) {
			return undefined;
		}

		return fs.readFileSync(fileName, { encoding: "utf8" });
	}

	// ts.CompilerHost members

	getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError: (message: string) => void): ts.SourceFile {
		if (fileName in this._sourceFiles) {
			return this._sourceFiles[fileName];
		}

		try {
			var text = fs.readFileSync(fileName, { encoding: "utf8" });
			var result = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES5);
			this._sourceFiles[fileName] = result;
		}
		catch (ex) {
			if (onError) {
				onError(ex.message);
			}
		}

		return result;
	}

	getDefaultLibFileName(): string {
		return path.join(typeScriptModulePath, "lib.dom.d.ts");
	}

	writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError: (message?: string) => void): void {
		this._outputStream.push({
			path: fileName,
			contents: new Buffer(data)
		});
	}

	getCurrentDirectory(): string {
		return path.resolve(".");
	}

	getCanonicalFileName(fileName: string): string {
		return ts.normalizeSlashes(path.resolve(fileName));
	}

	useCaseSensitiveFileNames(): boolean {
		return true;
	}

	getNewLine(): string {
		return "\n";
	}

	// ts.ParseConfigHost members

	readDirectory(rootDir: string, extension: string, exclude: string[]): string[] {
		return ts.sys.readDirectory(rootDir, extension, exclude).map(fileName => this.getCanonicalFileName(fileName));
	}
}

class WatchCompilerHost extends CompilerHost {
	private _fileWatcher = new FileWatcher(fileNames => this._onFilesChanged(fileNames));

	private _filesChangedSinceLast: string[] = [];

	constructor(private _onChangeCallback: () => void) {
		super();
	}

	getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError: (message: string) => void): ts.SourceFile {
		var result = super.getSourceFile(fileName, languageVersion, onError);
		if (result !== undefined) {
			this._fileWatcher.watchFile(fileName);
		}

		return result;
	};

	private _onFilesChanged(fileNames: string[]) {
		for (const fileName of fileNames) {
			delete this._sourceFiles[fileName];
		}

		this._onChangeCallback();
	}
}

export function build(root: string, rootNamespaceName: string): FileTransform {
	var compiler = new Compiler();

	return new FileTransform(function (projectConfigFile: File): void {
		var self: FileTransform = this;

		console.log("Compiling " + projectConfigFile.path + "...");

		compiler.compile(projectConfigFile);

		var walkResult = walk(compiler, root, rootNamespaceName);
		addJSDocComments(walkResult.modules);

		compiler.writeFiles(self);

		console.log("Compile succeeded.");
	});
}

export function watch(root: string, rootNamespaceName: string): FileTransform {
	return new FileTransform(function (projectConfigFile: File): void {
		var self: FileTransform = this;

		function compile() {
			console.log("Compiling " + projectConfigFile.path + "...");

			compiler.compile(projectConfigFile);

			compiler.writeFiles(self);

			console.log("Compile succeeded.");

			self.push({
				path: "END",
				contents: ""
			});
		};

		var compilerHost = new WatchCompilerHost(() => {
			try {
				compile();
			}
			catch (ex) {
				console.error("Compile failed." + ex.stack);
			}
		});

		var compiler = new Compiler(compilerHost);

		compile();

		console.log("Listening for changes...");
	}, callback => { });
}

function addJSDocComments(modules: { [name: string]: AST.Module }): void {
	function visitor(current: AST.Module | AST.ModuleMember | AST.InterfaceMember) {
		if (current instanceof AST.Module) {
			for (const memberName of Object.keys(current.members)) {
				visitor(current.members[memberName]);
			}

			return;
		}

		var newComments: string[] = [];

		if (current instanceof AST.Class) {
			newComments.push("@constructor");

			if (current.baseType !== null) {
				var baseType = current.baseType;
				newComments.push(
					"@extends {" +
					baseType.fullName + (
						(baseType instanceof AST.TypeReference && baseType.generics.length) > 0 ?
							(".<" + (<AST.TypeReference>baseType).generics.map(generic => generic.fullName).join(", ") + ">") :
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

		if ((<AST.HasParent><any>current).parent instanceof AST.Namespace) {
			newComments.push("@memberOf " + (<AST.HasParent><any>current).parent.fullName);
		}

		if ((<AST.HasStringGenerics>current).generics !== undefined && (<AST.HasStringGenerics>current).generics.length > 0) {
			newComments.push("@template " + (<AST.HasStringGenerics>current).generics.join(", "));
		}

		if ((<AST.CanBePrivate><any>current).isPrivate) {
			newComments.push("@private");
		}

		if ((<AST.CanBeProtected>current).isProtected) {
			newComments.push("@protected");
		}

		if ((<AST.CanBeStatic>current).isStatic) {
			newComments.push("@static");
		}

		if (newComments.length > 0) {
			if (current instanceof AST.Property) {
				var nodes: ts.Node[] = [];
				if (current.getter !== null) { nodes.push(current.getter.astNode); }
				if (current.setter !== null && nodes[0] !== current.setter.astNode) { nodes.push(current.setter.astNode); }
				for (const node of nodes) {
					(<any>node)["typescript-new-comment"] = newComments;
				}
			}
			else {
				(<any>(<AST.Class | AST.Interface | AST.Function | AST.Enum>current).astNode)["typescript-new-comment"] = newComments;
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

export var oldGetLeadingCommentRangesOfNode: typeof ts.getLeadingCommentRangesOfNode = ts.getLeadingCommentRangesOfNode.bind(ts);
ts.getLeadingCommentRangesOfNode = (node: ts.Node, sourceFileOfNode: ts.SourceFile) => {
	sourceFileOfNode = sourceFileOfNode || ts.getSourceFileOfNode(node);

	var originalComments = oldGetLeadingCommentRangesOfNode(node, sourceFileOfNode);

	if (originalComments !== undefined && (<any>node)["typescript-new-comment"] !== undefined) {
		var fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName];
		if (fakeSourceFile === undefined) {
			fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName] = new FakeSourceFile(sourceFileOfNode);
		}

		originalComments[originalComments.length - 1] = fakeSourceFile.addComment(originalComments[originalComments.length - 1], (<any>node)["typescript-new-comment"]);
	}

	return originalComments;
};

var oldWriteCommentRange: typeof ts.writeCommentRange = ts.writeCommentRange.bind(ts);
ts.writeCommentRange = (currentSourceFile: ts.SourceFile, writer: ts.EmitTextWriter, comment: ts.CommentRange, newLine: string) => {
	if ((<{ sourceFile: ts.SourceFile }><any>comment).sourceFile) {
		currentSourceFile = (<{ sourceFile: ts.SourceFile }><any>comment).sourceFile;
	}

	return oldWriteCommentRange(currentSourceFile, writer, comment, newLine);
};
