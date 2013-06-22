"use strict";

ASS.debugMode = (location.search === "?debug");

addEventListener("DOMContentLoaded", function () {
	var createSubDiv;
	var wrappers = {};
	(function () {
		var defaultSubDiv = document.createElement("div");

		createSubDiv = function (dialogue, currentTime) {
			var result = defaultSubDiv.cloneNode(true);
			result.dialogue = dialogue;
			dialogue.drawTo(result, currentTime);
			wrappers[dialogue.layer][dialogue.alignment].appendChild(result);
			return result;
		};

		defaultSubDiv.constructor.prototype.remove = function () {
			if (this.parentElement !== null) {
				this.parentElement.removeChild(this);
				this.dialogue.erase();
			}
		};
	})();

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

			var layers = new Set();
			var dialogues = ass.dialogues;
			dialogues.forEach(function (dialogue) {
				layers.add(dialogue.layer);
			});
			layers.iterator().toArray().sort().forEach(function (layer) {
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
					if (part instanceof ASS.Tags.FontName) {
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
					});
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
				return dialogue.end >= currentTime && !dialogue.isDrawn();
			}).map(function (dialogue) {
				return createSubDiv(dialogue, currentTime);
			});
			video.addEventListener("timeupdate", function () {
				currentTime = video.currentTime;

				currentSubs = currentSubs.filter(function (sub) {
					if (sub.dialogue.start <= currentTime && sub.dialogue.end > currentTime) {
						return true;
					}
					else {
						sub.remove();
						return false;
					}
				}).concat(Iterator(newSubs).toArray());
			}, false);

			video.addEventListener("seeking", function () {
				currentSubs.forEach(function (sub) {
					sub.remove();
				});
				currentSubs = [];
			});

			video.addEventListener("pause", function () {
				subsWrapper.className = "paused";
			}, false);

			video.addEventListener("playing", function () {
				subsWrapper.className = "";
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
				ass = ASS.parse(rawASS, parser);
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
				ass = ASS.parse(rawASS, parser);
				if (ASS.debugMode) {
					window.ass = ass;
				}
				testVideoAndASSLoaded();
			}
		}
	}, false);
	subsRequest.send(null);
}, false);
