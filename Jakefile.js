desc("Build libjass.js, libjass.min.js and their sourcemaps");
task("default", ["_default:writeCode", "_default:writeSourceMap", "_default:writeMinifiedCode", "_default:writeMinifiedSourceMap"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Clean");
task("clean", ["_clean:run"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Test");
task("test", ["_test:run[true]"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Watch");
task("watch", ["_watch:run"], function () {
	console.log("[" + this.fullName + "]");
});

desc("Generate API documentation");
task("doc", [], function (outputFilename, outputPrivate) {
	console.log("[" + this.fullName + "]");

	if (outputFilename === undefined) {
		throw new Error("outputFilename not specified.");
	}

	outputPrivate = (outputPrivate === "true");

	jake.Task["_doc:makeHtml"].invoke(outputPrivate);
	jake.Task["_doc:writeHtml"].invoke(outputFilename);
});
