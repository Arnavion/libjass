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
var UglifyJS = require("uglify-js");

var typeScriptModulePath = path.resolve("./node_modules/typescript/bin");
var typeScriptJsPath = path.join(typeScriptModulePath, "typescript.js");

var makeCompilerFunction = function (TypeScript) {
	var Compiler = function () {
		this.mutableSettings = new TypeScript.CompilationSettings();
		this.mutableSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
		this.mutableSettings.mapSourceFiles = true;
		this.mutableSettings.noImplicitAny = true;
	};

	Compiler.prototype.compile = function (inputFilenames) {
		console.log("Compiling " + JSON.stringify(inputFilenames) + "...");

		this.mutableSettings.outFileOption = "output.js";

		try {
			var run = new CompilerRun();

			var resolutionResults = TypeScript.ReferenceResolver.resolve(inputFilenames, {
				resolveRelativePath: function (file, directory) {
					return path.resolve(directory, file);
				},
				fileExists: fs.existsSync.bind(fs),
				getScriptSnapshot: run.getScriptSnapshot.bind(run),
				getParentDirectory: path.dirname.bind(path)
			}, true);

			var resolvedFiles = resolutionResults.resolvedFiles;
			resolvedFiles.unshift({
				path: path.resolve(typeScriptModulePath, "lib.d.ts"),
				referencedFiles: [],
				importedFiles: []
			});

			run.addDiagnostics(resolutionResults.diagnostics);

			var compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), TypeScript.ImmutableCompilationSettings.fromCompilationSettings(this.mutableSettings));

			resolvedFiles.forEach(function (resolvedFile) {
				var scriptSnapshot = run.getScriptSnapshot(resolvedFile.path);
				compiler.addFile(resolvedFile.path, scriptSnapshot, 0, 0, false, resolvedFile.referencedFiles);
			});

			var iterator = compiler.compile(path.resolve.bind(path));
			var compilerOutput = Object.create(null);

			while (iterator.moveNext()) {
				var result = iterator.current();

				run.addDiagnostics(result.diagnostics);

				result.outputFiles.forEach(function (outputFile) {
					switch (outputFile.fileType) {
						case TypeScript.OutputFileType.JavaScript:
							compilerOutput.code = outputFile.text;
							break;

						case TypeScript.OutputFileType.SourceMap:
							compilerOutput.sourceMap = outputFile.text;
							break;
					}
				});
			}

			if (run.diagnostics.some(function (diagnostic) { return diagnostic.info().category === 1; })) {
				throw new Error("There were one or more errors.");
			}

			console.log("Compile succeeded.");

			return compilerOutput;
		}
		catch (ex) {
			if (ex instanceof Error) {
				throw ex;
			}
			else {
				throw new Error("Internal compiler error: " + ex.stack + "\n");
			}
		}
	};

	var CompilerRun = function () {
		this.diagnostics = [];

		this._scriptSnapshots = Object.create(null);
	};

	CompilerRun.prototype.addDiagnostics = function (newDiagnostics) {
		newDiagnostics.forEach(function (diagnostic) {
			var message = diagnostic.message();

			if (diagnostic.fileName()) {
				message = diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): " + message;
			}

			console.error(message);
		});

		this.diagnostics.push.apply(this.diagnostics, newDiagnostics);
	};

	CompilerRun.prototype.getScriptSnapshot = function (filename) {
		var scriptSnapshot = this._scriptSnapshots[filename];

		if (!scriptSnapshot) {
			var fileContents;

			try  {
				fileContents = fs.readFileSync(filename, { encoding: "utf8" });
			}
			catch (ex) {
				run.addDiagnostics([new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [filename, ex.message])]);
				fileContents = "";
			}

			var scriptSnapshot = TypeScript.ScriptSnapshot.fromString(fileContents);

			this._scriptSnapshots[filename] = scriptSnapshot;
		}

		return scriptSnapshot;
	};

	return Compiler;
};

namespace("_typescript", function () {
	task("require", [], function () {
		console.log("[" + this.fullName + "]");

		var vm = require("vm");

		var data = fs.readFileSync(typeScriptJsPath, { encoding: "utf8" });

		data += "module.exports = TypeScript;";

		var TypeScript = {};
		vm.runInNewContext(data, {
			module: Object.defineProperty(Object.create(null), "exports", {
				get: function () { return TypeScript; },
				set: function (value) { TypeScript = value; }
			}),
			require: require,
			process: process,
			__filename: typeScriptJsPath,
			__dirname: typeScriptModulePath
		});

		return TypeScript;
	});

	task("getCompilerFactory", ["_typescript:require"], function () {
		console.log("[" + this.fullName + "]");

		var TypeScript = jake.Task["_typescript:require"].value;

		return makeCompilerFunction(TypeScript);
	});
});
