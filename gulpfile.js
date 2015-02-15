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

var helpers = require("./gulplib/helpers.js");
var Transform = helpers.Transform;
var SingletonChildProcess = helpers.SingletonChildProcess;

(function () {
	var _TypeScript = null;
	var _UglifyJS = null;
	var _WebPack = null;

	Object.defineProperties(global, {
		TypeScript: { get: function () { return _TypeScript || (_TypeScript = require("./gulplib/typescript.js")); } },
		UglifyJS: { get: function () { return _UglifyJS || (_UglifyJS = require("./gulplib/uglify.js")); } },
		WebPack: { get: function () { return _WebPack || (_WebPack = require("./gulplib/webpack.js")); } },
	});
})();

gulp.task("default", ["libjass.js", "libjass.min.js"]);

function ASTModifer(namespaces) {
	var visitor = function (current) {
		var newComments = [];

		if (current instanceof TypeScript.AST.Namespace) {
			Object.keys(current.members).forEach(function (memberName) {
				visitor(current.members[memberName]);
			});
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

			if (current.interfaces.length > 0) {
				current.interfaces.forEach(function (interface) {
					newComments.push(
						"@implements {" +
						interface.type.fullName +
						(interface.generics.length > 0 ? (".<" + interface.generics.join(", ") + ">") : "") +
						"}"
					);
				});
			}

			if (current.parent !== null) {
				newComments.push("@memberOf " + current.parent.fullName);
			}

			Object.keys(current.members).forEach(function (memberName) {
				visitor(current.members[memberName]);
			});
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

gulp.task("libjass.js", function () {
	if (fs.existsSync("./lib/libjass.js")) {
		return;
	}

	if (!fs.existsSync("./tests/mocha.js")) {
		// Copy over mocha.js to tests/

		var mochaJs = fs.readFileSync("./node_modules/mocha/mocha.js", { encoding: "utf8" });

		// Workaround for https://github.com/mochajs/mocha/pull/1551 and https://github.com/mochajs/mocha/pull/1552
		mochaJs = mochaJs.replace(
			'var el = fragment(\'<li class="suite"><h1><a href="%s">%s</a></h1></li>\', url, escape(suite.title));',
			'var el = fragment(\'<li class="suite"><h1><a href="%e">%e</a></h1></li>\', url, suite.title);'
		).replace(
			'var el = fragment(\'<li class="test pass %e"><h2>%e<span class="duration">%ems</span> <a href="%s" class="replay">‣</a></h2></li>\', test.speed, test.title, test.duration, url);',
			'var el = fragment(\'<li class="test pass %e"><h2>%e<span class="duration">%ems</span> <a href="%e" class="replay">‣</a></h2></li>\', test.speed, test.title, test.duration, url);'
		).replace(
			'document.body.appendChild(fragment(\'<div id="mocha-error">%s</div>\', msg));',
			'document.body.appendChild(fragment(\'<div id="mocha-error">%e</div>\', msg));'
		).replace(
			'  for (var i = 0; i < els.length; ++i) {\n' +
			'    els[i].className = els[i].className.replace(\'suite hidden\', \'suite\');',
			'  while (els.length > 0) {\n' +
			'    els[0].className = els[0].className.replace(\'suite hidden\', \'suite\');'
		);

		fs.writeFileSync("./tests/mocha.js", mochaJs, { encoding: "utf8" });
	}

	if (!fs.existsSync("./tests/mocha.css")) {
		// Copy over mocha.css to tests/

		var mochaCss = fs.readFileSync("./node_modules/mocha/mocha.css", { encoding: "utf8" });
		fs.writeFileSync("./tests/mocha.css", mochaCss, { encoding: "utf8" });
	}

	return gulp.src("./src/tsconfig.json")
		.pipe(TypeScript.gulp(ASTModifer, "./src/index.ts", "libjass"))
		.pipe(WebPack("./src/index.js", "libjass", "./node_modules"))
		.pipe(UglifyJS.fixup())
		.pipe(gulp.dest("./lib"));
});

gulp.task("libjass.min.js", ["libjass.js"], function () {
	if (fs.existsSync("./lib/libjass.min.js")) {
		return;
	}

	return gulp.src(["./lib/libjass.js", "./lib/libjass.js.map"])
		.pipe(UglifyJS.minify())
		.pipe(gulp.dest("./lib"));
});

gulp.task("clean", function () {
	["./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.min.js", "./lib/libjass.min.js.map"].forEach(function (file) {
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

	gulp.src("./src/tsconfig.json")
	.pipe(TypeScript.watch())
	.pipe(gulp.dest("./lib"))
	.pipe(WebPack("./lib/index.js", "libjass"))
	.pipe(UglifyJS.fixup())
	.pipe(gulp.dest("./lib"))
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
	return gulp.src(["./lib/libjass.js", "./lib/libjass.js.map", "./lib/libjass.css"]).pipe(gulp.dest("../libjass-gh-pages/demo/"));
});

gulp.task("doc", ["libjass.js"], function () {
	var Doc = require("./gulplib/doc.js");

	return gulp.src("./src/tsconfig.json")
		.pipe(Doc("./api.xhtml", "./src/index.ts", "libjass"))
		.pipe(gulp.dest("../libjass-gh-pages/"));
});
