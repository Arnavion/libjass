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
			Iterator(layers).toArray().sort().forEach(function (layer) {
				var i;
				wrappers[layer] = {};
				for (i = 1; i <= 9; ++i) {
					var wrapperDiv = document.createElement("div");
					wrapperDiv.className = "an" + i + " layer" + layer;
					subsWrapper.appendChild(wrapperDiv);
					wrappers[layer][i] = wrapperDiv;
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

			var currentSubs = [];

			var newSubs = dialogues.toIterable().map(function (entry) {
				return entry[1];
			}).skipWhile(function (dialogue) {
				return dialogue.end < currentTime;
			}).takeWhile(function (dialogue) {
				return dialogue.start <= currentTime;
			}).filter(function (dialogue) {
				return dialogue.end >= currentTime && currentSubs.every(function (sub) { return parseInt(sub.getAttribute("data-dialogue-id")) !== dialogue.id; });
			}).map(function (dialogue) {
				debug(dialogue.toString());
				return wrappers[dialogue.layer][dialogue.alignment].appendChild(dialogue.draw(currentTime));
			});

			video.addEventListener("timeupdate", function () {
				currentTime = video.currentTime;

				currentSubs = currentSubs.filter(function (sub) {
					var subDialogue = ass.dialogues[parseInt(sub.getAttribute("data-dialogue-id"))];

					if (subDialogue.start <= currentTime && currentTime < subDialogue.end) {
						return true;
					}
					else {
						sub.remove();
						return false;
					}
				}).concat(Iterator(newSubs).toArray());

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
