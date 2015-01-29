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
var webpack = require("webpack");

var Transform = require("./helpers.js").Transform;

var MemoryFileSystem = require("memory-fs");

var GulpFileSystem = (function () {
	function GulpFileSystem(outputStream) {
		this._outputStream = outputStream;

		this._internalFileSystem = new MemoryFileSystem();
	}

	GulpFileSystem._wrap = function (name) {
		var original = fs[name];

		return function () {
			var args = arguments;
			var replacedArgs = [].slice.call(args);

			replacedArgs[replacedArgs.length - 1] = function (err) {
				if (!err) {
					args[args.length - 1].apply(null, arguments);
					return;
				}

				replacedArgs[replacedArgs.length - 1] = function (err) {
					args[args.length - 1].apply(null, arguments);
				};

				original.apply(fs, replacedArgs);
			};

			this._internalFileSystem[name].apply(this._internalFileSystem, replacedArgs);
		};
	};

	GulpFileSystem.prototype.load = function (file) {
		this._internalFileSystem.mkdirpSync(path.dirname(file.path));
		this._internalFileSystem.writeFileSync(file.path, file.contents);
	};

	GulpFileSystem.prototype.isSync = function () { return false; }

	GulpFileSystem.prototype.stat = GulpFileSystem._wrap("stat");

	GulpFileSystem.prototype.readlink = GulpFileSystem._wrap("readlink");

	GulpFileSystem.prototype.readFile = GulpFileSystem._wrap("readFile");

	GulpFileSystem.prototype.mkdirp = function (path, callback) {
		if (path === "") {
			callback();
			return;
		}

		callback(new Error("mkdirp not supported"));
	};

	GulpFileSystem.prototype.join = path.join.bind(path);

	GulpFileSystem.prototype.writeFile = function (filename, data, callback) {
		this._outputStream.push(new Vinyl({
			path: filename,
			contents: data
		}));

		callback();
	};

	return GulpFileSystem;
})();

module.exports = function (entry, outputLibraryName, modulesRoot) {
	var fileSystem = null;

	return Transform(function (file) {
		if (fileSystem == null) {
			fileSystem = new GulpFileSystem(this);
		}

		fileSystem.load(file);
	}, function (callback) {
		var compiler = webpack({
			devtool: "source-map",
			entry: entry,
			module: {
				preLoaders: [{
					test: /\.js$/,
					loader: "source-map-loader"
				}]
			},
			output: {
				filename: outputLibraryName + ".js",
				library: outputLibraryName,
				libraryTarget: "umd",
				sourceMapFilename: outputLibraryName + ".js.map"
			},
			resolve: {
				root: path.resolve(modulesRoot)
			}
		});

		compiler.inputFileSystem = fileSystem;
		compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
		compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
		compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;

		compiler.outputFileSystem = fileSystem;

		compiler.run(function (err, stats) {
			if (err) {
				callback(err);
				return;
			}

			callback();
		});
	});
};
