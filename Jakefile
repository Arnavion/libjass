var allFiles = [];

var fileTask = function (filename, dependencies, callback, options) {
	file(filename, dependencies, function () {
		console.log("Building " + filename);

		callback.call(this, arguments);
	}, options);
	allFiles.push(filename);
};

fileTask("libjass.js", ["dialogue.ts", "iterators.ts", "parser.ts", "tags.ts", "utility.ts", "ass.pegjs"], function () {
	jake.exec(["tsc libjass.ts --out libjass.js --sourcemap --noImplicitAny --target ES5"], { printStdout: true, printStderr: true }, function () {
		var fs = require("fs");

		fs.readFile("ass.pegjs", { encoding: "utf8" }, function (error, data) {
			if (error) {
				throw error;
			}

			var PEG = require("pegjs");

			var parser = PEG.buildParser(data);

			fs.appendFile("libjass.js", "libjass.parser = " + parser.toSource() + ";\n", function (error) {
				if (error) {
					throw error;
				}

				complete();
			});
		});
	});
}, { async: true });

fileTask("libjass.min.js", ["libjass.js"], function () {
	var fs = require("fs");

	fs.readFile("libjass.js.map", { encoding: "utf8"}, function (error, data) {
		if (error) {
			throw error;
		}

		var inputSourceMap = JSON.parse(data);

		fs.readFile("libjass.js", { encoding: "utf8" }, function (error, data) {
			if (error) {
				throw error;
			}

			var UglifyJS = require("uglify-js");

			// Parse
			var ast = UglifyJS.parse(data, {
				strict: true,
				filename: "libjass.js"
			});
			ast.figure_out_scope();
			ast.scope_warnings();

			// Compress
			var compressor = UglifyJS.Compressor();
			ast = ast.transform(compressor);
			ast.figure_out_scope();

			// Mangle
			ast.compute_char_frequency();
			ast.mangle_names();

			// Output and sourcemap
			var sourceMap = UglifyJS.SourceMap({
				file: "libjass.min.js",
				orig: inputSourceMap,
				root: inputSourceMap.sourceRoot
			});

			var firstCommentFound = false; // To detect and preserve the first license header
			var output = UglifyJS.OutputStream({
				beautify: false,
				comments: function (node, comment) {
					if (!firstCommentFound) {
						firstCommentFound = !firstCommentFound;
						return true;
					}

					return false;
				},
				source_map: sourceMap
			});
			ast.print(output);

			// Write to files
			fs.writeFile("libjass.min.js.map", sourceMap, function () {
				if (error) {
					throw error;
				}

				var minifiedCode = output.get() + "\n//# sourceMappingURL=libjass.min.js.map";

				fs.writeFile("libjass.min.js", minifiedCode, function (error) {
					if (error) {
						throw error;
					}

					complete();
				});
			});
		});
	});
}, { async: true });

task("default", ["libjass.min.js"], function () {
});

task("clean", function () {
	var fs = require("fs");

	var t = function (i) {
		if (i >= allFiles.length) {
			complete();
			return;
		}

		fs.unlink(allFiles[i], function (error, data) {
			if (error && error.code !== "ENOENT") {
				throw error;
			}

			t(i + 1);
		});
	};
	t(0);
}, { async: true });
