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

libjass.ASS.debugMode = (location.search === "?debug");

addEventListener("DOMContentLoaded", function () {
	var ASS = libjass.ASS;

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
			zoomedDiv.style.transform = "scale(" + zoom + ")";
			zoomedDiv.style.webkitTransform = "scale(" + zoom + ")";

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
			var numFonts = Array.prototype.filter.call(document.styleSheets, function (stylesheet) {
				return stylesheet.href && stylesheet.href.endsWith("/fonts.css");
			}).reduce(function (previousValue, currentValue) {
				return previousValue + Array.prototype.filter.call(currentValue.cssRules, function (rule) {
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
							--numFonts;
							if (numFonts === 0) {
								video.play();
							}
						}
					}, false);
					xhr.send(null);
					return xhr;
				})
				.length;
			}, 0);
			if (numFonts === 0) {
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
				return wrappers[dialogue.layer][dialogue.alignment].appendChild(dialogue.draw(currentTime));
			});

			video.addEventListener("timeupdate", function () {
				currentTime = video.currentTime;

				currentSubs = currentSubs.filter(function (sub) {
					var subDialogue = ass.dialogues[parseInt(sub.getAttribute("data-dialogue-id"))];

					if (subDialogue.start <= currentTime && subDialogue.end > currentTime) {
						return true;
					}
					else {
						sub.remove();
						return false;
					}
				}).concat(Iterator(newSubs).toArray());

				if (ASS.debugMode) {
					console.log("video.timeupdate: video.paused = " + video.paused + ", video.seeking = " + video.seeking);
				}
			}, false);

			video.addEventListener("seeking", function () {
				currentSubs.forEach(function (sub) {
					sub.remove();
				});

				currentSubs = [];

				if (ASS.debugMode) {
					console.log("video.seeking: video.paused = " + video.paused + ", video.seeking = " + video.seeking);
				}
			}, false);

			video.addEventListener("pause", function () {
				subsWrapper.className = "paused";

				if (ASS.debugMode) {
					console.log("video.pause: video.paused = " + video.paused + ", video.seeking = " + video.seeking);
				}
			}, false);

			video.addEventListener("playing", function () {
				subsWrapper.className = "";

				if (ASS.debugMode) {
					console.log("video.playing: video.paused = " + video.paused + ", video.seeking = " + video.seeking);
				}
			}, false);
		};
	}

	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		video.addEventListener("loadedmetadata", function () {
			videoMetadataLoaded = true;
			testVideoAndASSLoaded();
		}, false);
	}
	else {
		videoMetadataLoaded = true;
		testVideoAndASSLoaded();
	}

	var parserRequest = new XMLHttpRequest();
	parserRequest.open("GET", "ass.pegjs", true);
	parserRequest.addEventListener("readystatechange", function () {
		if (parserRequest.readyState === XMLHttpRequest.DONE) {
			parser = PEG.buildParser(parserRequest.responseText);

			if (rawASS) {
				ass = new ASS(rawASS, parser);
				if (ASS.debugMode) {
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
			rawASS = subsRequest.responseText;

			if (parser) {
				ass = new ASS(rawASS, parser);
				if (ASS.debugMode) {
					window.ass = ass;
				}
				testVideoAndASSLoaded();
			}
		}
	}, false);
	subsRequest.send(null);
}, false);
