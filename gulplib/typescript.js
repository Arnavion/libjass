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

var typeScriptModulePath = path.resolve("./node_modules/typescript/bin");
var typeScriptJsPath = path.join(typeScriptModulePath, "typescript.js");

var TypeScript = {};
vm.runInNewContext(fs.readFileSync(typeScriptJsPath, { encoding: "utf8" }) + "module.exports = TypeScript;", {
	module: Object.defineProperty(Object.create(null), "exports", {
		get: function () { return TypeScript; },
		set: function (value) { TypeScript = value; }
	}),
	require: require,
	process: process,
	__filename: typeScriptJsPath,
	__dirname: typeScriptModulePath
});

exports.TS = TypeScript;

var innerCompilerSettings = new TypeScript.CompilationSettings();
innerCompilerSettings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
innerCompilerSettings.mapSourceFiles = true;
innerCompilerSettings.noImplicitAny = true;
innerCompilerSettings.outFileOption = "output.js";

innerCompilerSettings = TypeScript.ImmutableCompilationSettings.fromCompilationSettings(innerCompilerSettings);

var Compiler = function () {
	function Compiler() {
		this._diagnostics = [];

		this._scriptSnapshots = Object.create(null);
	};

	Compiler.prototype.addFiles = function (files) {
		var _this = this;

		var resolutionResults = TypeScript.ReferenceResolver.resolve(files, {
			resolveRelativePath: function (file, directory) {
				return path.resolve(directory, file);
			},
			fileExists: fs.existsSync.bind(fs),
			getScriptSnapshot: this._getScriptSnapshot.bind(this),
			getParentDirectory: path.dirname.bind(path)
		}, true);

		resolutionResults.resolvedFiles.unshift({
			path: path.resolve(typeScriptModulePath, "lib.d.ts"),
			referencedFiles: [],
			importedFiles: []
		});

		this._addDiagnostics(resolutionResults.diagnostics);

		this._innerCompiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), innerCompilerSettings);

		resolutionResults.resolvedFiles.forEach(function (resolvedFile) {
			_this._innerCompiler.addFile(resolvedFile.path, _this._getScriptSnapshot(resolvedFile.path), 0, 0, false, resolvedFile.referencedFiles);
		});

		return resolutionResults.resolvedFiles;
	};

	Compiler.prototype.compile = function (outputCodePath, outputSourceMapPath) {
		var iterator = this._innerCompiler.compile(path.resolve.bind(path));
		var outputFiles = [];

		while (iterator.moveNext()) {
			var result = iterator.current();

			this._addDiagnostics(result.diagnostics);

			result.outputFiles.forEach(function (outputFile) {
				var outputPath = null;

				switch (outputFile.fileType) {
					case TypeScript.OutputFileType.JavaScript:
						outputPath = outputCodePath;
						break;

					case TypeScript.OutputFileType.SourceMap:
						outputPath = outputSourceMapPath;
						break;

					default:
						return;
				}

				outputFiles.push(new Vinyl({
					base: "/",
					path: outputPath,
					contents: new Buffer(outputFile.text)
				}));
			});
		}

		if (this._diagnostics.some(function (diagnostic) { return diagnostic.info().category === 1; })) {
			throw new Error("There were one or more errors.");
		}

		return outputFiles;
	};

	Compiler.prototype.getDocument = function (resolvedFilePath) {
		return this._innerCompiler.getDocument(resolvedFilePath);
	};

	Compiler.prototype._addDiagnostics = function (newDiagnostics) {
		newDiagnostics.forEach(function (diagnostic) {
			var message = diagnostic.message();

			if (diagnostic.fileName()) {
				message = diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): " + message;
			}

			console.error(message);
		});

		this._diagnostics.push.apply(this._diagnostics, newDiagnostics);
	};

	Compiler.prototype._getScriptSnapshot = function (filename) {
		var scriptSnapshot = this._scriptSnapshots[filename];

		if (!scriptSnapshot) {
			var fileContents;

			try  {
				fileContents = fs.readFileSync(filename, { encoding: "utf8" });
			}
			catch (ex) {
				this._addDiagnostics([new TypeScript.Diagnostic(null, null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file_0_1, [filename, ex.message])]);
				fileContents = "";
			}

			scriptSnapshot = this._scriptSnapshots[filename] = TypeScript.ScriptSnapshot.fromString(fileContents);
		}

		return scriptSnapshot;
	};

	return Compiler;
}();

exports.Compiler = Compiler;

exports.gulp = function (outputCodePath, outputSourceMapPath) {
	var files = [];

	return Transform(function (file, encoding) {
		files.push(file.path);
	}, function () {
		var _this = this;

		try {
			console.log("Compiling " + JSON.stringify(files) + "...");

			var compiler = new Compiler();

			compiler.addFiles(files);

			var outputFiles = compiler.compile(outputCodePath, outputSourceMapPath);

			console.log("Compile succeeded.");

			outputFiles.forEach(function (file) {
				_this.push(file);
			});
		}
		catch (ex) {
			if (ex instanceof Error) {
				throw ex;
			}
			else {
				throw new Error("Internal compiler error: " + ex.stack + "\n");
			}
		}
	});
};
