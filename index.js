"use strict";

addEventListener("DOMContentLoaded", function () {
	var createSubDiv;
	var wrappers = {};
	(function () {
		var defaultSubDiv = document.createElement("div");

		createSubDiv = function (dialogue) {
			var result = defaultSubDiv.cloneNode(true);
			result.dialogue = dialogue;
			dialogue.setSub(result);
			wrappers[dialogue.getLayer()][dialogue.getAlignment()].appendChild(result);
			return result;
		};

		defaultSubDiv.constructor.prototype.remove = function () {
			this.parentElement.removeChild(this);
			this.dialogue.setSub(null);
		};
	})();

	var video = document.querySelector("#video");

	var videoMetadataLoaded = false;
	var ass;

	var onVideoAndSubsLoaded = function () {
		if (videoMetadataLoaded && ass) {
			var videoWidth = video.videoWidth;
			var videoHeight = video.videoHeight;
			document.body.style.width = video.style.width = videoWidth + "px";
			document.body.style.height = video.style.height = videoHeight + "px";
			document.body.style.marginLeft = video.style.marginLeft = (-videoWidth / 2) + "px";

			var subsWrapper = document.querySelector("#subs-wrapper");

			var info = ass.getInfo();
			info.scaleTo(videoWidth, videoHeight);
			var zoom = (1 / info.getScaleX());
			video.style.transform = "scale(" + zoom + ")";
			video.style.MozTransform = "scale(" + zoom + ")";
			video.style.webkitTransform = "scale(" + zoom + ")";

			var layers = [];
			var dialogues = ass.getDialogues();
			dialogues.map(function (dialogue) {
				return dialogue.getLayer();
			}).forEach(function (layer) {
				if (layers.indexOf(layer) === -1) {
					layers.push(layer);
				}
			});
			layers.sort().forEach(function (layer) {
				var i;
				wrappers[layer] = {};
				for (i = 1; i <= 9; ++i) {
					var wrapperDiv = document.createElement("div");
					wrapperDiv.className = "an" + i + " layer" + layer;
					subsWrapper.appendChild(wrapperDiv);
					wrappers[layer][i] = wrapperDiv;
				}
			});

			var currentSubs = [];
			var currentDialogueIndex = 0;
			video.addEventListener("timeupdate", function () {
				var currentTime = video.currentTime;
				var currentDialogues = [];
				dialogues.every(function (dialogue) {
					var result = true;

					if (dialogue.getStart() <= currentTime) {
						if (dialogue.getEnd() >= currentTime) {
							currentDialogues.push(dialogue);
						}
					}
					else {
						result = false;
					}

					return result;
				});

				var subsPartition = currentSubs.partition(function (currentSub) {
					return currentTime > currentSub.dialogue.getEnd() || currentDialogues.every(function (dialogue) {
						return dialogue.getSub() !== currentSub;
					});
				});

				subsPartition[0].forEach(function (sub) {
					sub.remove();
				});

				currentSubs = subsPartition[1].concat(currentDialogues.filter(function (dialogue) {
					return dialogue.getSub() === null;
				}).map(function (dialogue) {
					return createSubDiv(dialogue);
				}));
			}, false);

			video.addEventListener("seeking", function () {
				currentSubs.forEach(function (sub) {
					sub.remove();
				});
				currentSubs = [];
			});

			var numFonts = 0;
			Array.prototype.filter.call(document.styleSheets, function (stylesheet) {
				return stylesheet.href && stylesheet.href.endsWith("/fonts.css");
			}).forEach(function (style) {
				numFonts +=
					Array.prototype.filter.call(style.cssRules, function (rule) {
						return rule.type === CSSRule.FONT_FACE_RULE;
					}).map(function (fontFaceRule) {
						var xhr = new XMLHttpRequest();
						var fontSrc = fontFaceRule.style.src;
						if (fontSrc) {
							fontSrc = fontSrc.match(/^url\((.+)\)$/)[1];
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
			});
		}
	};

	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		video.addEventListener("loadedmetadata", function () {
			videoMetadataLoaded = true;
			onVideoAndSubsLoaded();
		}, false);
	}
	else {
		videoMetadataLoaded = true;
		onVideoAndSubsLoaded();
	}

	var subsRequest = new XMLHttpRequest();
	subsRequest.open("GET", (video.dataset && video.dataset.subs) || video.getAttribute("data-subs"), true);
	subsRequest.addEventListener("readystatechange", function () {
		if (subsRequest.readyState === XMLHttpRequest.DONE) {
			ass = parseASS(subsRequest.responseText);
			onVideoAndSubsLoaded();
		}
	}, false);
	subsRequest.send();
}, false);