var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

namespace("_watch", function () {
	task("runTask", ["_test:run[false]", "_default:writeSourceMap"], function () { });

	task("run", [], function () {
		console.log("[" + this.fullName + "]");

		var spawnSubProcess = function () {
			var pathToJake = path.resolve("./node_modules/.bin/jake");
			var subProcess = childProcess.exec(pathToJake + " _watch:runUntilError --trace");
			subProcess.stdout.pipe(process.stdout);
			subProcess.stderr.pipe(process.stderr);
			subProcess.addListener("exit", function (code, signal) {
				spawnSubProcess();
			});
		};

		spawnSubProcess();
	}, { async: true });

	task("runUntilError", ["_typescript:getCompilerFactory"], function () {
		console.log("[" + this.fullName + "]");

		var tasksToReEnable = [];
		var stack = ["_watch:runTask"];
		while (stack.length > 0) {
			var next = stack.shift();
			if (next.indexOf("[") !== -1) {
				next = next.substr(0, next.indexOf("["));
			}

			if (next !== "_typescript:getCompilerFactory" && tasksToReEnable.indexOf(jake.Task[next]) === -1) {
				tasksToReEnable.push(jake.Task[next]);

				stack.push.apply(stack, jake.Task[next].prereqs);
			}
		}

		var timeoutId = null;

		fs.watch(".", function (event, filename) {
			if (filename === null) {
				return;
			}

			var extension = path.extname(filename);
			if (extension !== ".ts") {
				return;
			}

			console.log(event, filename, JSON.stringify([].slice.call(arguments, 0)));

			clearTimeout(timeoutId);

			timeoutId = setTimeout(function () {
				tasksToReEnable.forEach(function (task) { task.reenable(); });
				jake.Task["_watch:runTask"].invoke();
			}, 1000);
		});
	});
});
