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

define([
	"intern/dojo/node!fs",
	"intern/dojo/node!path",
	"intern/dojo/node!pngjs",
	"intern/chai!assert",
	"intern/dojo/node!intern/node_modules/leadfoot/helpers/pollUntil",
	"lib/libjass"
], function (fs, path, pngjs, assert, pollUntil, libjass) {
	function TestPage(remote, pageUrl, assUrl, targetWidth, targetHeight) {
		this._remote = remote;
		this._pageUrl = pageUrl;
		this._assUrl = assUrl;
		this._targetWidth = targetWidth;
		this._targetHeight = targetHeight;
	}

	TestPage.prototype.prepare = function () {
		var _this = this;

		this._remote.session.setExecuteAsyncTimeout(10000);

		return this._remote
			.setWindowSize(1280, 720)
			.get(this._pageUrl)
			.then(pollUntil('return (document.readyState === "complete") ? true : null;'), 100)
			.executeAsync(function (assUrl, callback) {
				window.clock = new libjass.renderers.ManualClock();
				var libjassSubsWrapper = document.querySelector(".libjass-wrapper");

				libjass.ASS.fromUrl(assUrl).then(function (ass) {
					libjassSubsWrapper.style.width = ass.properties.resolutionX + "px";
					libjassSubsWrapper.style.height = ass.properties.resolutionY + "px";

					var renderer = new libjass.renderers.WebRenderer(ass, clock, libjassSubsWrapper);
					renderer.addEventListener("ready", function () {
						renderer.resize(ass.properties.resolutionX, ass.properties.resolutionY);
						clock.pause();
						callback();
					});
				});
			}, [this._assUrl])
			.then(function () { return _this; });
	};

	TestPage.prototype.seekAndCompareScreenshot = function (time, filename) {
		var _this = this;

		filename = path.join(path.dirname(filename), this._remote.session.capabilities.browserName, path.basename(filename));

		return this._remote
			.execute(function (time) { clock.seek(time); }, [time])
			.takeScreenshot()
			.then(function (buffer) {
				return new libjass.Promise(function (resolve, reject) {
					new pngjs.PNG().parse(buffer, function (error, input) {
						if (error !== null) {
							reject(error);
							return;
						}

						var output = new pngjs.PNG({ width: _this._targetWidth, height: _this._targetHeight });
						input.bitblt(output, 0, 0, _this._targetWidth, _this._targetHeight, 0, 0);
						resolve(output);
					});
				});
			})
			.then(function (screenshot) {
				return new libjass.Promise(function (resolve, reject) {
					var baselineBuffer = fs.readFileSync(filename);
					new pngjs.PNG().parse(baselineBuffer, function (error, baseline) {
						if (error !== null) {
							reject(error);
							return;
						}

						try {
							assert.equal(0, screenshot.data.compare(baseline.data), filename + " does not match!");
							resolve();
						}
						catch (ex) {
							reject(ex);
						}
					});
				}).catch(function (err) {
					return new libjass.Promise(function (resolve, reject) {
						var newFilename = filename.substr(0, filename.length - path.extname(filename).length) + "-new" + path.extname(filename);
						screenshot.pack().pipe(fs.createWriteStream(newFilename)).once("error", reject).on("finish", function () { reject(err); });
					});
				});
			})
			.then(function () { return _this; });
	};

	return TestPage;
});
