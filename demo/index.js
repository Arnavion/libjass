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
	var content = document.querySelector("#content");

	var videoInput = document.querySelector("#video-input");
	var scriptInput = document.querySelector("#script-input");
	var goButton = document.querySelector("#go-button");

	videoInput.addEventListener("change", updateGoButton, false);

	scriptInput.addEventListener("change", updateGoButton, false);

	function updateGoButton() {
		goButton.disabled = videoInput.files.length !== 1 || scriptInput.files.length !== 1;
	}

	goButton.addEventListener("click", function () {
		updateGoButton();

		if (this.disabled) {
			return;
		}

		while (content.firstChild) {
			content.removeChild(content.firstChild);
		}

		var template = document.querySelector("#template").cloneNode(true);

		[].slice.call(template.querySelectorAll("[data-id]")).forEach(function (element) {
			element.id = element.dataset.id;
		});

		[].slice.call(template.children).forEach(function (element) {
			content.appendChild(element);
		});

		go(URL.createObjectURL(videoInput.files[0]), URL.createObjectURL(scriptInput.files[0]));
	});
}, false);

function go(videoUrl, assUrl) {
	var debug = function () {
		if (libjass.debugMode) {
			console.log.apply(console, arguments);
		}
	}

	var video = document.querySelector("#video");
	video.src = videoUrl;

	var videoMetadataLoadedPromise = new libjass.Promise(function (resolve, reject) {
		if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
			// Video metadata isn't available yet. Register an event handler for it.
			video.addEventListener("loadedmetadata", function () { resolve(); }, false);
		}
		else {
			// Video metadata is already available.
			resolve();
		}
	}).then(function () {
		debug("Video metadata loaded.");

		// Prepare the "Video resolution" option label
		document.querySelector("#video-resolution-label-width").appendChild(document.createTextNode(video.videoWidth));
		document.querySelector("#video-resolution-label-height").appendChild(document.createTextNode(video.videoHeight));
	});

	var assLoadedPromise = libjass.ASS.fromUrl(assUrl).then(function (ass) {
		debug("Script received.");

		if (libjass.debugMode) {
			// Export the ASS object for debugging
			window.ass = ass;
		}

		// Prepare the "Script resolution" option label
		document.querySelector("#script-resolution-label-width").appendChild(document.createTextNode(ass.properties.resolutionX));
		document.querySelector("#script-resolution-label-height").appendChild(document.createTextNode(ass.properties.resolutionY));

		return ass;
	});

	libjass.Promise.all([videoMetadataLoadedPromise, assLoadedPromise]).then(function (results) {
		var ass = results[1];

		// Create a DefaultRenderer using the video element and the ASS object
		var renderer = new libjass.renderers.DefaultRenderer(video, ass);

		if (libjass.debugMode) {
			// Export the renderer for debugging
			window.renderer = renderer;
		}

		// Autoplay the video when the renderer is ready
		renderer.addEventListener("ready", function () {
			debug("Beginning autoplay.");

			video.play();
		});

		document.querySelector("#enable-disable-subs").addEventListener("change", function (event) {
			renderer.setEnabled(event.target.checked);
		}, false);

		// Run when the video/script resolution needs to be changed, either because the user clicked one of the resolution options,
		// or because they exited full screen and their selection needs to be restored
		var changeVideoSizeSelection = function (id) {
			if (typeof id === "undefined") {
				// Find which option is selected

				[].slice.call(videoSizeSelector.querySelectorAll("input[name='video-size']")).some(function (option) {
					if (option.checked) {
						id = option.id;
						return true;
					}

					return false;
				});
			}

			if (id === "video-size-video-radio") {
				// Resize to video resolution

				video.style.width = video.videoWidth + "px";
				video.style.height = video.videoHeight + "px";
				renderer.resize(video.videoWidth, video.videoHeight);
			}

			else if (id === "video-size-script-radio") {
				// Resize to script resolution

				video.style.width = ass.properties.resolutionX + "px";
				video.style.height = ass.properties.resolutionY + "px";
				renderer.resize(ass.properties.resolutionX, ass.properties.resolutionY);
			}
		};

		var videoSizeSelector = document.querySelector("#video-size-selector");
		videoSizeSelector.addEventListener("change", function (event) { changeVideoSizeSelection(event.target.id); }, false);

		// When video exits full screen, restore the size according to the resolution option that's selected
		renderer.addEventListener("fullScreenChange", function (newState) {
			if (newState === false) {
				changeVideoSizeSelection();
			}
		});

		// Set the resolution to whatever's selected by default
		changeVideoSizeSelection();
	});
}
