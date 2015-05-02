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
import Vinyl = require("vinyl");

import * as AST from "./ast";
import { makeTransform } from "../helpers";
import { walk } from "./walker";

export interface GulpCompilerHost extends ts.CompilerHost {
	setOutputStream(outputStream: Transform<Vinyl>): void;

	setOutputPathsRelativeTo(path: string): void;
}

export class Compiler {
	private _projectRoot: string = null;
	private _program: ts.Program = null;

	constructor(private _host: GulpCompilerHost = CompilerHost()) { }

	compile(projectConfigFile: Vinyl) {
		this._projectRoot = path.dirname(projectConfigFile.path);

		var projectConfig = parseConfigFile(JSON.parse(projectConfigFile.contents.toString()), this._projectRoot);

		this._host.setOutputPathsRelativeTo(this._projectRoot);

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

	writeFiles(outputStream: Transform<Vinyl>) {
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
		for (let diagnostic of diagnostics) {
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

const typeScriptModulePath = path.resolve("./node_modules/typescript/bin");

function CompilerHost(): GulpCompilerHost {
	var _outputStream: Transform<Vinyl> = null;
	var _outputPathsRelativeTo: string = null;

	return {
		setOutputStream(outputStream: Transform<Vinyl>): void {
			_outputStream = outputStream;
		},

		setOutputPathsRelativeTo(path: string): void {
			_outputPathsRelativeTo = path;
		},

		// ts.CompilerHost members

		getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError: (message: string) => void): ts.SourceFile {
			try {
				var text = fs.readFileSync(fileName, { encoding: "utf8" });

				if (path.basename(fileName) === "lib.dom.d.ts") {
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

			return (text !== undefined) ? ts.createSourceFile(fileName, text, ts.ScriptTarget.ES5) : undefined;
		},

		getDefaultLibFileName: () => path.join(typeScriptModulePath, "lib.dom.d.ts"),

		writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError: (message?: string) => void) {
			_outputStream.push(new Vinyl({
				base: _outputPathsRelativeTo,
				path: fileName,
				contents: new Buffer(data)
			}));
		},

		getCurrentDirectory: () => path.resolve("."),

		getCanonicalFileName: (fileName: string) => ts.normalizeSlashes(path.resolve(fileName)),

		useCaseSensitiveFileNames: () => true,

		getNewLine: () => "\n",
	};
};

function WatchCompilerHost(onChangeCallback: () => void): GulpCompilerHost {
	var compilerHost = CompilerHost();

	var _onChangeCallback = onChangeCallback;

	var _sourceFiles = Object.create(null);

	var _filesChangedSinceLast: string[] = [];

	var _super_getSourceFile = compilerHost.getSourceFile;
	compilerHost.getSourceFile = (fileName, languageVersion, onError) => {
		if (fileName in _sourceFiles) {
			return _sourceFiles[fileName];
		}

		var result = _super_getSourceFile(fileName, languageVersion, onError);
		if (result !== undefined) {
			_sourceFiles[fileName] = result;
		}

		watchFile(fileName);

		return result;
	};

	function watchFile(fileName: string): void {
		function watchFileCallback(currentFile: fs.Stats, previousFile: fs.Stats) {
			if (currentFile.mtime >= previousFile.mtime) {
				fileChangedCallback(fileName);
			}
			else {
				fs.unwatchFile(fileName, watchFileCallback);

				fileChangedCallback(fileName);
			}
		}

		fs.watchFile(fileName, { interval: 500 }, watchFileCallback);
	}

	function fileChangedCallback(fileName: string): void {
		delete _sourceFiles[fileName];

		if (_filesChangedSinceLast.length === 0) {
			setTimeout(() => {
				_filesChangedSinceLast = [];

				_onChangeCallback();
			}, 100);
		}

		_filesChangedSinceLast.push(fileName);
	}

	return compilerHost;
};

export function gulp(root: string, rootNamespaceName: string): Transform<Vinyl> {
	var compiler = new Compiler();

	return makeTransform(function (projectConfigFile: Vinyl): void {
		var self: Transform<Vinyl> = this;

		console.log("Compiling " + projectConfigFile.path + "...");

		compiler.compile(projectConfigFile);

		var walkResult = walk(compiler, root, rootNamespaceName);
		addJSDocComments(walkResult.modules);

		compiler.writeFiles(self);

		console.log("Compile succeeded.");
	});
};

export function watch(root: string, rootNamespaceName: string): Transform<Vinyl> {
	return makeTransform(function (projectConfigFile: Vinyl): void {
		var self: Transform<Vinyl> = this;

		function compile() {
			console.log("Compiling " + projectConfigFile.path + "...");

			compiler.compile(projectConfigFile);

			compiler.writeFiles(self);

			console.log("Compile succeeded.");

			self.push(new Vinyl({
				base: this._outputPathsRelativeTo,
				path: "END",
				contents: new Buffer("")
			}));
		};

		var compilerHost = WatchCompilerHost(() => {
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
};

function addJSDocComments(modules: { [name: string]: AST.Module }): void {
	function visitor(current: AST.Module | AST.ModuleMember | AST.InterfaceMember) {
		if (current instanceof AST.Module) {
			for (let memberName of Object.keys(current.members)) {
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
				for (let node of nodes) {
					(<any>node)["gulp-typescript-new-comment"] = newComments;
				}
			}
			else {
				(<any>(<AST.Class | AST.Interface | AST.Function | AST.Enum>current).astNode)["gulp-typescript-new-comment"] = newComments;
			}
		}
	}

	for (let moduleName of Object.keys(modules)) {
		visitor(modules[moduleName]);
	}
}

function parseConfigFile(json: { compilerOptions: ts.CompilerOptions }, basePath: string): { options: ts.CompilerOptions, fileNames: string[] } {
	var options = json.compilerOptions;
	options.module = (<any>ts).ModuleKind[options.module];
	options.target = (<any>ts).ScriptTarget[options.target];

	var fileNames: string[] = [];

	function walk(directory: string) {
		fs.readdirSync(directory).forEach(entry => {
			var entryPath = path.join(directory, entry);
			var stat = fs.lstatSync(entryPath);
			if (stat.isFile()) {
				if (path.extname(entry) === ".ts") {
					fileNames.push(entryPath);
				}
			}
			else if (stat.isDirectory()) {
				walk(entryPath);
			}
		});
	}

	walk(basePath);

	return { options, fileNames };
};

class FakeSourceFile {
	public text: string;
	public lineMap: number[];

	constructor(originalSourceFile: ts.SourceFile) {
		this.text = originalSourceFile.text;
		this.lineMap = ts.getLineStarts(originalSourceFile).slice();
	}

	addComment(originalComment: ts.CommentRange, newComments: string[]): ts.CommentRange {
		var pos = this.text.length;

		this.text += "/**\n";
		this.lineMap.push(this.text.length);

		var originalCommentLines = this.text.substring(originalComment.pos, originalComment.end).split("\n");
		originalCommentLines.shift();

		originalCommentLines = originalCommentLines.map(line => line.replace(/^\s+/, " "));

		if (originalCommentLines.length > 1) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " *");
		}

		for (let newComment of newComments) {
			originalCommentLines.splice(originalCommentLines.length - 1, 0, " * " + newComment);
		}

		for (let newCommentLine of originalCommentLines) {
			this.text += newCommentLine + "\n";
			this.lineMap.push(this.text.length);
		}

		var end = this.text.length;

		return { pos, end, hasTrailingNewLine: originalComment.hasTrailingNewLine, sourceFile: this };
	}
}

var fakeSourceFiles: { [name: string]: FakeSourceFile } = Object.create(null);

export var oldGetLeadingCommentRangesOfNode: (node: ts.Node, sourceFileOfNode: ts.SourceFile) => ts.CommentRange[] = ts.getLeadingCommentRangesOfNode.bind(ts);
ts.getLeadingCommentRangesOfNode = (node: ts.Node, sourceFileOfNode: ts.SourceFile) => {
	sourceFileOfNode = sourceFileOfNode || ts.getSourceFileOfNode(node);

	var originalComments = oldGetLeadingCommentRangesOfNode(node, sourceFileOfNode);

	if (originalComments !== undefined && (<any>node)["gulp-typescript-new-comment"] !== undefined) {
		var fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName];
		if (fakeSourceFile === undefined) {
			fakeSourceFile = fakeSourceFiles[sourceFileOfNode.fileName] = new FakeSourceFile(sourceFileOfNode);
		}

		originalComments[originalComments.length - 1] = fakeSourceFile.addComment(originalComments[originalComments.length - 1], (<any>node)["gulp-typescript-new-comment"]);
	}

	return originalComments;
};

var oldWriteCommentRange = ts.writeCommentRange.bind(ts);
ts.writeCommentRange = (currentSourceFile: ts.SourceFile, writer: ts.EmitTextWriter, comment: ts.CommentRange, newLine: string) => {
	if ((<{ sourceFile: ts.SourceFile }><any>comment).sourceFile) {
		currentSourceFile = (<{ sourceFile: ts.SourceFile }><any>comment).sourceFile;
	}

	return oldWriteCommentRange(currentSourceFile, writer, comment, newLine);
};
