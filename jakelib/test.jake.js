var path = require("path");
var Mocha = require("mocha");

namespace("_test", function () {
	task("run", ["clean", "_default:writeCode"], function () {
		console.log("[" + this.fullName + "]");

		var mocha = new Mocha({
			ui: "tdd",
			reporter: "spec",
			loadInNewContext: true
		});

		(new jake.FileList("./tests/test-*.js")).toArray().forEach(function (filename) {
			mocha.addFile(filename);
		});

		mocha.run();
	});
});

Mocha.prototype.loadFiles = function (fn){
	var self = this;
	var suite = this.suite;
	var pending = this.files.length;

	this.files.forEach(function(file){
		file = path.resolve(file);

		suite.emit('pre-require', global, file, self);

		var fileExports;
		if (!self.options.loadInNewContext) {
			fileExports = require(file);
		}
		else {
			var filePathAsJsString = file.replace(/\\/g, "\\\\");
			var newContextScript = 'var module = new Module("' + filePathAsJsString + '"); module.load("' + filePathAsJsString + '"); module.exports';
			fileExports = require('vm').runInNewContext(newContextScript, {
				Module: module.constructor,
				process: process
			});
		}
		suite.emit('require', fileExports, file, self);

		suite.emit('post-require', global, file, self);

		--pending || (fn && fn());
	});
};
