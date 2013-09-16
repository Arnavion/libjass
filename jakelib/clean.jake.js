var fs = require("fs");

namespace("_clean", function () {
	task("run", [], function () {
		console.log("[" + this.fullName + "]");

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
});
