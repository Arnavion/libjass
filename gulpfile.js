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

var gulp = require("gulp");
var Vinyl = require("vinyl");

var helpers = require("./gulplib/helpers.js");
var Transform = helpers.Transform;
var SingletonChildProcess = helpers.SingletonChildProcess;

Object.defineProperties(global, {
	Doc: { get: function () { return require("./gulplib/doc.js"); } },
	TypeScript: { get: function () { return require("./gulplib/typescript.js"); } },
	UglifyJS: { get: function () { return require("./gulplib/uglify.js"); } },
});

gulp.task("default", ["libjass.js", "libjass.min.js"]);

function ASTModifer(namespaces) {
	var visitor = function (current) {
		var newComments = [];

		if (current instanceof TypeScript.AST.Namespace) {
			current.members.forEach(visitor);
		}
		else if (current instanceof TypeScript.AST.Constructor) {
			newComments.push("@constructor");

			if (current.baseType !== null) {
				newComments.push(
					"@extends {" +
					current.baseType.type.fullName +
					(current.baseType.generics.length > 0 ? (".<" + current.baseType.generics.join(", ") + ">") : "") +
					"}"
				);
			}

			if (current.parent !== null) {
				newComments.push("@memberOf " + current.parent.fullName);
			}

			current.members.forEach(visitor);
		}
		else if (current instanceof TypeScript.AST.Interface) {
			if (current.baseTypes.length > 0) {
				current.baseTypes.forEach(function (baseType) {
					newComments.push(
						"@extends {" +
						baseType.type.fullName +
						(baseType.generics.length > 0 ? ("." + baseType.generics.join(", ")) : "") +
						"}"
					);
				});
			}
		}
		else if (current instanceof TypeScript.AST.Enum) {
			newComments.push("@enum");
		}

		if ((current.generics !== undefined) && (current.generics.length > 0)) {
			newComments.push("@template " + current.generics.join(", "));
		}

		if (current.isPrivate) {
			newComments.push("@private");
		}

		if (current.isProtected) {
			newComments.push("@protected");
		}

		if (current.isStatic) {
			newComments.push("@static");
		}

		if (newComments.length > 0) {
			current.astNode["gulp-typescript-new-comment"] = newComments;
		}
	};

	Object.keys(namespaces).forEach(function (namespaceName) { visitor(namespaces[namespaceName]); });
}

gulp.task("libjass.js", function (callback) {
	if (fs.existsSync("./libjass.js")) {
		return callback(null);
	}

	return gulp.src("./libjass.ts", { read: false })
		.pipe(TypeScript.gulp("/libjass.js", "/libjass.js.map", ASTModifer))
		.pipe(UglifyJS.fixup())
		.pipe(gulp.dest("."));
});

gulp.task("libjass.min.js", ["libjass.js"], function (callback) {
	if (fs.existsSync("./libjass.min.js")) {
		return callback(null);
	}

	var input = Object.create(null);

	return gulp.src(["./libjass.js", "./libjass.js.map"]).pipe(UglifyJS.minify()).pipe(gulp.dest("."));
});

gulp.task("clean", function () {
	["libjass.js", "libjass.js.map", "libjass.min.js", "libjass.min.js.map"].forEach(function (file) {
		try {
			fs.unlinkSync(file);
		}
		catch (ex) {
			if (ex.code !== "ENOENT") {
				throw ex;
			}
		}
	});
});

gulp.task("watch", ["clean"], function (callback) {
	var gulpTestProcess = SingletonChildProcess(path.resolve("./gulplib/test-runner.js"));

	gulp.src("./libjass.ts", { read: false })
	.pipe(TypeScript.watch("/libjass.js", "/libjass.js.map"))
	.pipe(UglifyJS.fixup())
	.pipe(gulp.dest("."))
	.pipe(Transform(function (file) {
		if (path.basename(file.path) === "libjass.js") {
			gulpTestProcess();
		}
	}));

	gulp.watch(["./tests/test-*.js"], { debounceDelay: 1 }, function () {
		gulpTestProcess();
	});
});

gulp.task("demo", ["libjass.js"], function () {
	return gulp.src(["./libjass.js", "./libjass.js.map", "./libjass.css"]).pipe(gulp.dest("../libjass-gh-pages/demo/"));
});

gulp.task("doc", ["libjass.js"], function () {
	return gulp.src("./libjass.ts").pipe(Doc("./api.xhtml")).pipe(gulp.dest("../libjass-gh-pages/"));
});
