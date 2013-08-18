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

"use strict";

libjass.debugMode = (location.search === "?debug");

var config = {
	/**
	 * Subtitles will be pre-rendered for this amount of time (seconds)
	 *
	 * @const
	 */
	preRenderTime: 5
};

addEventListener("DOMContentLoaded", function () {
	var ASS = libjass.ASS;

	var debug = function () {
		if (libjass.debugMode) {
			console.log.apply(console, arguments);
		}
	}

	var wrappers = {};

	var video = document.querySelector("#video");

	var videoMetadataLoaded = false;
	var ass = null;

	var parser = null;
	var rawASS = null;

	var testVideoAndASSLoaded = function () {
		if (videoMetadataLoaded && ass) {
			var videoWidth = video.videoWidth;
			var videoHeight = video.videoHeight;
			document.body.style.width = video.style.width = videoWidth + "px";
			document.body.style.height = video.style.height = videoHeight + "px";
			document.body.style.marginLeft = video.style.marginLeft = (-videoWidth / 2) + "px";

			var subsWrapper = document.querySelector("#subs-wrapper");

			var info = ass.info;
			info.scaleTo(videoWidth, videoHeight);
			var zoom = (1 / info.scaleX);
			var zoomedDiv = document.querySelector(".zoomed");
			zoomedDiv.style.webkitTransform = "scale(" + zoom + ")";
			zoomedDiv.style.transform = "scale(" + zoom + ")";

			info.dpi = parseFloat(getComputedStyle(document.querySelector("#dpi-div")).height.match(/(\d+)px/)[1]);

			var dialogues = ass.dialogues.slice();
			// Sort the dialogues array by start time and then by their original position in the script (id)
			dialogues.sort(function (dialogue1, dialogue2) {
				var result = dialogue1.start - dialogue2.start;

				if (result === 0) {
					result = dialogue1.id - dialogue2.id;
				}

				return result;
			});

			var layers = new Set();
			dialogues.forEach(function (dialogue) {
				layers.add(dialogue.layer);
			});
			var layersArray = [];
			layers.forEach(function (layer) { layersArray.push(layer); });
			layersArray.sort().forEach(function (layer) {
				wrappers[layer] = new Array(9);

				for (var alignment = 1; alignment <= 9; alignment++) {
					var wrapperDiv = document.createElement("div");
					wrapperDiv.className = "an" + alignment + " layer" + layer;
					subsWrapper.appendChild(wrapperDiv);
					wrappers[layer][alignment] = wrapperDiv;
				}
			});

			debug("Preloading fonts...");
			var allFonts = new Set();
			ass.styles.forEach(function (style) {
				allFonts.add(style.fontName);
			});
			dialogues.forEach(function (dialogue) {
				dialogue.parts.forEach(function (part) {
					if (part instanceof libjass.tags.FontName) {
						allFonts.add(part.value);
					}
				});
			});
			var numFonts = [].filter.call(document.styleSheets, function (stylesheet) {
				return stylesheet.href && stylesheet.href.endsWith("/fonts.css");
			}).reduce(function (previousValue, currentValue) {
				return previousValue + [].filter.call(currentValue.cssRules, function (rule) {
					return rule.type === CSSRule.FONT_FACE_RULE && allFonts.has(rule.style.getPropertyValue("font-family").match(/^['"]?(.*?)['"]?$/)[1]);
				}).map(function (fontFaceRule) {
					var xhr = new XMLHttpRequest();
					var fontSrc = fontFaceRule.style.src;
					if (fontSrc) {
						fontSrc = fontSrc.match(/url\((.+)\)$/)[1];
					}
					else {
						fontSrc = fontFaceRule.cssText.match(/url\("?(.+?)"?\)/)[1];
					}
					xhr.open("GET", fontSrc, true);
					xhr.addEventListener("readystatechange", function () {
						if (xhr.readyState === XMLHttpRequest.DONE) {
							debug("Preloaded " + fontSrc + ".");
							--numFonts;
							debug(numFonts + " fonts left to preload.");
							if (numFonts === 0) {
								debug("All fonts have been preloaded. Beginning autoplay.");
								video.play();
							}
						}
					}, false);
					xhr.send(null);
					return xhr;
				})
				.length;
			}, 0);

			debug(numFonts + " fonts left to preload.");

			if (numFonts === 0) {
				debug("All fonts have been preloaded. Beginning autoplay.");
				video.play();
			}

			var currentTime;

			// Array of subtitle div's that are being displayed right now
			var currentSubs = [];

			// Iterable of subtitle div's that are also to be displayed
			var newSubs = dialogues.toIterable().map(function (entry) {
				return entry[1];
			}).skipWhile(function (dialogue) {
				// Skip until dialogues which end at a time later than currentTime
				return dialogue.end < currentTime;
			}).takeWhile(function (dialogue) {
				// Take until dialogue which starts later than currentTime + config.preRenderTime
				return dialogue.start <= (currentTime + config.preRenderTime);
			}).filter(function (dialogue) {
				// Ignore dialogues which end at a time less than currentTime
				if (dialogue.end < currentTime) {
					return false;
				}

				// All these dialogues are visible at atleast one time in the range [currentTime, currentTime + config.preRenderTime]

				// Ignore those dialogues which have already been displayed
				if (currentSubs.some(function (sub) { return parseInt(sub.getAttribute("data-dialogue-id")) === dialogue.id; })) {
					return false;
				}

				// If the dialogue is to be displayed, keep it to be drawn...
				if (dialogue.start <= currentTime) {
					return true;
				}

				// ... otherwise pre-render it and forget it
				else {
					dialogue.preRender();
					return false;
				}
			}).map(function (dialogue) {
				debug(dialogue.toString());
				// Display the dialogue and return the drawn subtitle div
				return wrappers[dialogue.layer][dialogue.alignment].appendChild(dialogue.draw(currentTime));
			});

			video.addEventListener("timeupdate", function () {
				currentTime = video.currentTime;

				currentSubs = currentSubs.filter(function (sub) {
					var subDialogue = ass.dialogues[parseInt(sub.getAttribute("data-dialogue-id"))];

					// If the sub should still be displayed at currentTime, keep it...
					if (subDialogue.start <= currentTime && currentTime < subDialogue.end) {
						return true;
					}

					// ... otherwise remove it from the DOM and from this array...
					else {
						sub.remove();
						return false;
					}
				}).concat(Iterator(newSubs).toArray()); // ... and add the new subs that are to be displayed.

				debug("video.timeupdate: video.currentTime = " + currentTime + ", video.paused = " + video.paused + ", video.seeking = " + video.seeking);
			}, false);

			video.addEventListener("seeking", function () {
				currentSubs.forEach(function (sub) {
					sub.remove();
				});

				currentSubs = [];

				debug("video.seeking: video.currentTime = " + video.currentTime + ", video.paused = " + video.paused + ", video.seeking = " + video.seeking);
			}, false);

			video.addEventListener("pause", function () {
				subsWrapper.className = "paused";

				debug("video.pause: video.currentTime = " + video.currentTime + ", video.paused = " + video.paused + ", video.seeking = " + video.seeking);
			}, false);

			video.addEventListener("playing", function () {
				subsWrapper.className = "";

				debug("video.playing: video.currentTime = " + video.currentTime + ", video.paused = " + video.paused + ", video.seeking = " + video.seeking);
			}, false);
		};
	}

	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		video.addEventListener("loadedmetadata", function () {
			debug("Video metadata loaded.");
			videoMetadataLoaded = true;
			testVideoAndASSLoaded();
		}, false);
	}
	else {
		debug("Video metadata loaded.");
		videoMetadataLoaded = true;
		testVideoAndASSLoaded();
	}

	var parserRequest = new XMLHttpRequest();
	parserRequest.open("GET", "ass.pegjs", true);
	parserRequest.addEventListener("readystatechange", function () {
		if (parserRequest.readyState === XMLHttpRequest.DONE) {
			debug("Parser data received.");
			parser = PEG.buildParser(parserRequest.responseText);
			debug("Parser created.");

			if (rawASS) {
				ass = new ASS(rawASS, parser);
				if (libjass.debugMode) {
					window.ass = ass;
				}
				testVideoAndASSLoaded();
			}
		}
	}, false);
	parserRequest.send(null);

	var track = document.querySelector("#video > track[data-format='ass']");
	var subsRequest = new XMLHttpRequest();
	subsRequest.open("GET", track.src || track.getAttribute("src"), true);
	subsRequest.addEventListener("readystatechange", function () {
		if (subsRequest.readyState === XMLHttpRequest.DONE) {
			debug("ASS script received.");
			rawASS = subsRequest.responseText;

			if (parser) {
				ass = new ASS(rawASS, parser);
				if (libjass.debugMode) {
					window.ass = ass;
				}
				testVideoAndASSLoaded();
			}
		}
	}, false);
	subsRequest.send(null);
}, false);

String.prototype.endsWith = function (str) {
	var index = this.indexOf(str);
	return index !== -1 && index === this.length - str.length;
};

if (typeof window.Set !== "function" || typeof window.Set.prototype.forEach !== "function") {
	/**
	 * Set implementation for browsers that don't support it. Only supports Number and String elements.
	 *
	 * Elements are stored as properties of an object, with derived names that won't clash with pre-defined properties.
	 */
	window.Set = function () {
		var data = {};

		var toKey = function (value) {
			if (typeof value === "number") {
				return "#" + value;
			}
			else if (typeof value === "string") {
				return "'" + value;
			}

			return null;
		};

		var isKey = function (key) {
			return (key.startsWith("#") || key.startsWith("'"));
		};

		this.add = function (value) {
			var key = toKey(value);

			if (key === null) {
				throw new Error("This Set implementation only supports string and number values.");
			}

			data[key] = value;

			return this;
		};

		this.has = function (value) {
			var key = toKey(value);

			if (key === null) {
				return false;
			}

			return data.hasOwnProperty(key);
		};

		this.forEach = function (callbackfn, thisArg) {
			if (typeof thisArg === "undefined") {
				thisArg = window;
			}

			var that = this;

			Object.keys(data).filter(function (key) {
				return isKey(key);
			}).map(function (key) {
				return data[key];
			}).forEach(function (value, index) {
				callbackfn.call(thisArg, value, value, that);
			});
		};
	};
	Set.prototype = new Set();
}
