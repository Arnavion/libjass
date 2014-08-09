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

libjass.debugMode = (location.search === "?debug") || (location.search === "?verbose");
libjass.verboseMode = (location.search === "?verbose");

addEventListener("DOMContentLoaded", function () {
	var debug = function () {
		if (libjass.debugMode) {
			console.log.apply(console, arguments);
		}
	}

	var video = document.querySelector("#video");

	var videoMetadataLoaded = false;
	var ass = null;

	var testVideoAndASSLoaded = function () {
		if (videoMetadataLoaded && ass !== null) {
			var renderer = new libjass.renderers.DefaultRenderer(video, ass, {
				fontMap: libjass.renderers.RendererSettings.makeFontMapFromStyleElement(document.querySelector("#font-map"))
			});

			if (libjass.debugMode) {
				window.renderer = renderer;
			}

			renderer.addEventListener("ready", function () {
				debug("All fonts have been preloaded. Beginning autoplay.");
				video.play();

				subToggleSpanTextNode.textContent = renderer.enabled ? "off" : "on";
			});

			var subToggleSpanTextNode = document.createTextNode("");
			document.querySelector("#enable-disable-subs-span").appendChild(subToggleSpanTextNode);

			document.querySelector("#enable-disable-button").addEventListener("click", function (event) {
				renderer.toggle();
				subToggleSpanTextNode.textContent = renderer.enabled ? "off" : "on";
			}, false);

			var changeVideoSizeSelection = function (id) {
				if (typeof id === "undefined") {
					[].slice.call(videoSizeSelector.querySelectorAll("input[name='video-size']")).some(function (option) {
						if (option.checked) {
							id = option.id;
							return true;
						}

						return false;
					});
				}

				if (id === "video-size-video-radio") {
					video.style.width = video.videoWidth + "px";
					video.style.height = video.videoHeight + "px";
					renderer.resize(video.videoWidth, video.videoHeight);
				}

				else if (id === "video-size-script-radio") {
					video.style.width = ass.properties.resolutionX + "px";
					video.style.height = ass.properties.resolutionY + "px";
					renderer.resize(ass.properties.resolutionX, ass.properties.resolutionY);
				}
			};

			var videoSizeSelector = document.querySelector("#video-size-selector");
			videoSizeSelector.addEventListener("change", function (event) { changeVideoSizeSelection(event.target.id); }, false);

			renderer.addEventListener("fullScreenChange", function (newState) {
				if (newState === false) {
					changeVideoSizeSelection();
				}
			});

			changeVideoSizeSelection();
		};
	};

	(function (onVideoMetadataLoaded) {
		if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
			video.addEventListener("loadedmetadata", onVideoMetadataLoaded, false);
		}
		else {
			onVideoMetadataLoaded();
		}
	})(function () {
		debug("Video metadata loaded.");

		videoMetadataLoaded = true;

		document.querySelector("#video-resolution-label-width").appendChild(document.createTextNode(video.videoWidth));
		document.querySelector("#video-resolution-label-height").appendChild(document.createTextNode(video.videoHeight));

		testVideoAndASSLoaded();
	});

	var track = document.querySelector("#video > track[data-format='ass'], #video > track[data-format='srt']");
	var subsRequest = new XMLHttpRequest();
	subsRequest.open("GET", track.src || track.getAttribute("src"), true);
	subsRequest.addEventListener("load", function () {
		debug("Script received.");

		ass = libjass.ASS.fromString(subsRequest.responseText, libjass.Format[track.getAttribute("data-format").toUpperCase()]);
		if (libjass.debugMode) {
			window.ass = ass;
		}

		document.querySelector("#script-resolution-label-width").appendChild(document.createTextNode(ass.properties.resolutionX));
		document.querySelector("#script-resolution-label-height").appendChild(document.createTextNode(ass.properties.resolutionY));

		testVideoAndASSLoaded();
	}, false);
	subsRequest.send(null);
}, false);
