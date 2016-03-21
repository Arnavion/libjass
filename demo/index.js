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


/* This page demonstrates how to use libjass. It allows you to choose a video that will be played in a <video> element, and an ASS script.
 *
 *
 * Below you will find the basics of using libjass - the ASS.fromUrl() and ASS.fromString() functions, and the DefaultRenderer class - and some advanced concepts:
 * - handling resizable video
 * - autoplaying video
 * - toggling subs on user input
 *
 * The advanced concepts are optional and marked with "(Advanced)"
 *
 *
 * Some more advanced uses not demonstrated here include:
 * - renderer settings, such as using custom fonts or controlling the pre-render time
 * - using WebRenderer instead of DefaultRenderer for control over the placement of the subs <div>, enabling fullscreen video, etc.
 * - using ASS.fromString() instead of ASS.fromUrl() when you have the ASS string already, such as in an online subs editor
 * - using libjass.parser.StreamParser and its minimalAss promise directly, such as for dynamically generated scripts
 * - working with SRT subs by specifying libjass.Format.SRT to the ASS.from*() functions
 *
 *
 * API documentation is available at http://arnavion.github.io/libjass/api.xhtml
 */


"use strict";


/* This section sets up the default look of the page - a bunch of input controls for the video and ASS script, and the
 * "Go" button that will create a <video> element and start rendering subs over it. If you already have URLs for a video and script on your website,
 * you would just generate the <video> element and start using libjass directly.
 */
addEventListener("DOMContentLoaded", function () {
	var htmlConsole = document.querySelector("#console");
	htmlConsoleLog = htmlConsoleLog(htmlConsole);
	htmlConsoleWarn = htmlConsoleWarn(htmlConsole);
	htmlConsoleError = htmlConsoleError(htmlConsole);
	var originalConsoleLog = console.log.bind(console);
	var originalConsoleWarn = console.warn.bind(console);
	var originalConsoleError = console.log.bind(console);
	console.log = function () {
		htmlConsoleLog([].slice.call(arguments, 0));
		originalConsoleLog.apply(null, arguments);
	};
	console.warn = function () {
		htmlConsoleWarn([].slice.call(arguments, 0));
		originalConsoleWarn.apply(null, arguments);
	};
	console.error = function () {
		htmlConsoleError([].slice.call(arguments, 0));
		originalConsoleError.apply(null, arguments);
	};

	var content = document.querySelector("#content");

	var videoChoiceLocalFileInput = document.querySelector("#video-choice-local-file");
	var videoInputLocalFile = document.querySelector("#video-input-local-file");

	var videoChoiceUrlInput = document.querySelector("#video-choice-url");
	var videoInputUrl = document.querySelector("#video-input-url");

	var videoChoiceSampleInput = document.querySelector("#video-choice-sample");

	var videoChoiceDummyInput = document.querySelector("#video-choice-dummy");
	var videoInputDummyResolution = document.querySelector("#video-input-dummy-resolution");
	var videoInputDummyWidth = document.querySelector("#video-input-dummy-width");
	var videoInputDummyHeight = document.querySelector("#video-input-dummy-height");
	var videoInputDummyColor = document.querySelector("#video-input-dummy-color");
	var videoInputDummyDuration = document.querySelector("#video-input-dummy-duration");

	var assChoiceLocalFileInput = document.querySelector("#ass-choice-local-file");
	var assInputLocalFile = document.querySelector("#ass-input-local-file");

	var assChoiceUrlInput = document.querySelector("#ass-choice-url");
	var assInputUrl = document.querySelector("#ass-input-url");

	var assChoiceTextInput = document.querySelector("#ass-choice-text");
	var assInputText = document.querySelector("#ass-input-text");

	var enableSvgChoiceInputYes = document.querySelector("#enable-svg-yes");
	var enableSvgChoiceInputNo = document.querySelector("#enable-svg-no");

	// Local file input requires URL.createObjectURL, so disable those inputs if the function doesn't exist.
	if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
		[
			videoChoiceLocalFileInput,
			assChoiceLocalFileInput
		].forEach(function (input) {
			input.disabled = true;
			input.parentElement.appendChild(document.createTextNode(" (This browser doesn't support URL.createObjectURL)"));
		});

		[
			videoInputLocalFile,
			assInputLocalFile
		].forEach(function (input) {
			input.disabled = true;
		});
	}

	if (
		typeof HTMLCanvasElement.prototype.captureStream !== "function" ||
		typeof MediaRecorder === "undefined" ||
		typeof MediaSource === "undefined" ||
		typeof MediaSource.isTypeSupported !== "function"/* ||
		!MediaSource.isTypeSupported("video/webm")*/
	) {
		[
			videoChoiceDummyInput,
			videoInputDummyResolution,
			videoInputDummyWidth,
			videoInputDummyHeight,
			videoInputDummyColor,
			videoInputDummyDuration
		].forEach(function (input) {
			input.disabled = true;
		});

		videoChoiceDummyInput.parentElement.appendChild(document.createTextNode(
			" (This browser doesn't support generating dummy video. Consider using Firefox 46 or newer and enabling media.mediasource.webm.enabled in about:config)"
		));
	}

	// Update dummy video width and height inputs when the dropdown selection changes
	function updateDummyWidthAndHeight() {
		var resolution = videoInputDummyResolution.value.split("x");
		videoInputDummyWidth.value = resolution[0];
		videoInputDummyHeight.value = resolution[1];
	}
	videoInputDummyResolution.addEventListener("change", updateDummyWidthAndHeight, false);
	updateDummyWidthAndHeight();

	// Register event handlers to enable the Go button if all inputs are valid.
	[
		videoChoiceLocalFileInput,
		videoChoiceUrlInput,
		videoChoiceSampleInput,
		videoChoiceDummyInput,
		assChoiceLocalFileInput,
		assChoiceUrlInput,
		assChoiceTextInput
	].forEach(function (input) {
		input.addEventListener("change", updateGoButton, false);
	});

	[
		videoInputLocalFile,
		assInputLocalFile,
	].forEach(function (input) {
		input.addEventListener("change", updateGoButton, false);
	});

	[
		videoInputUrl,
		videoInputDummyDuration,
		assInputUrl,
		assInputText
	].forEach(function (input) {
		input.addEventListener("input", updateGoButton, false);
	});


	// libjass.debugMode and libjass.verboseMode are two properties that can be set to true to have libjass print some debug information.
	var debugModeCheckbox = document.querySelector("#debug-mode");
	debugModeCheckbox.addEventListener("change", function () {
		console.log((debugModeCheckbox.checked ? "Enabling" : "Disabling") + " debug mode.");
		libjass.configure({ debugMode: debugModeCheckbox.checked });
	}, false);
	var verboseModeCheckbox = document.querySelector("#verbose-mode");
	verboseModeCheckbox.addEventListener("change", function () {
		console.log((debugModeCheckbox.checked ? "Enabling" : "Disabling") + " verbose mode.");
		libjass.configure({ verboseMode: verboseModeCheckbox.checked });
	}, false);


	var goButton = document.querySelector("#go-button");

	function updateGoButton() {
		var videoOk = false;
		var assOk = false;

		var videoChoice = document.querySelector('input[name="video-choice"]:checked');
		switch (videoChoice) {
			case videoChoiceLocalFileInput:
				videoOk = videoInputLocalFile.files.length === 1;
				break;
			case videoChoiceUrlInput:
				videoOk = document.querySelector("#video-input-url:invalid") === null && videoInputUrl.value.length > 0;
				break;
			case videoChoiceSampleInput:
				videoOk = true;
			case videoChoiceDummyInput:
				videoOk =
					parseInt(videoInputDummyWidth.value) > 0 &&
					parseInt(videoInputDummyHeight.value) > 0 &&
					videoInputDummyDuration.value.length > 0 &&
					parseInt(videoInputDummyDuration.value) > 0;
				break;
		}

		var assChoice = document.querySelector('input[name="ass-choice"]:checked');
		switch (assChoice) {
			case assChoiceLocalFileInput:
				assOk = assInputLocalFile.files.length === 1;
				break;
			case assChoiceUrlInput:
				assOk = document.querySelector("#ass-input-url:invalid") === null && assInputUrl.value.length > 0;
				break;
			case assChoiceTextInput:
				assOk = document.querySelector("#ass-input-choice:invalid") === null && assInputText.value.length > 0;
				break;
		}

		goButton.disabled = !videoOk || !assOk;
	}

	goButton.addEventListener("click", function () {
		updateGoButton();

		if (this.disabled) {
			return;
		}

		var videoChoice = document.querySelector('input[name="video-choice"]:checked');
		var assChoice = document.querySelector('input[name="ass-choice"]:checked');
		var enableSvgChoice = document.querySelector('input[name="enable-svg"]:checked');

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

		var videoPromise = null;

		switch (videoChoice) {
			case videoChoiceLocalFileInput:
				// Video is a local file. Convert it into a blob URL.
				videoPromise = prepareVideo(0 /* URL */, URL.createObjectURL(videoInputLocalFile.files[0]));
				break;
			case videoChoiceUrlInput:
				videoPromise = prepareVideo(0 /* URL */, videoInputUrl.value);
				break;
			case videoChoiceSampleInput:
				videoPromise = prepareVideo(1 /* sample */);
				break;
			case videoChoiceDummyInput:
				var width = parseInt(videoInputDummyWidth.value);
				var height = parseInt(videoInputDummyHeight.value);
				var color = videoInputDummyColor.value;
				var duration = parseInt(videoInputDummyDuration.value) * 60;
				videoPromise = prepareVideo(2 /* dummy */, width, height, color, duration);
				break;
		}

		var assPromise = null;

		switch (assChoice) {
			case assChoiceLocalFileInput:
				assPromise = libjass.ASS.fromUrl(URL.createObjectURL(assInputLocalFile.files[0]));
				break;
			case assChoiceUrlInput:
				assPromise = libjass.ASS.fromUrl(assInputUrl.value);
				break;
			case assChoiceTextInput:
				assPromise = libjass.ASS.fromString(assInputText.value);
				break;
		}

		var enableSvg = null;
		switch (enableSvgChoice) {
			case enableSvgChoiceInputYes:
				enableSvg = true;
				break;
			case enableSvgChoiceInputNo:
				enableSvg = false;
				break;
		}

		go(videoPromise, assPromise, enableSvg);
	});

	updateGoButton();
}, false);


function prepareVideo(videoType /*, ...parameters */) {
	var video = document.querySelector("#video");

	var videoMetadataLoadedPromise = null;

	if (videoType === 0 /* URL */ || videoType === 1 /* sample */) {
		if (videoType === 0 /* URL */) {
			var videoUrl = arguments[1];

			/* Set the <video> element's src to the given URL
			 */
			video.src = videoUrl;
		}
		else {
			/* Add <source> elements for the two sample videos.
			 */
			var webmSource = document.createElement("source");
			video.appendChild(webmSource);
			webmSource.type = "video/webm";
			webmSource.src = "sample.webm";

			var mp4Source = document.createElement("source");
			video.appendChild(mp4Source);
			mp4Source.type = "video/mp4";
			mp4Source.src = "sample.mp4";
		}

		/* (Advanced)
		 *
		 * This demo lets you resize the video to its original resolution or the subs resolution. If you have control over the video, you
		 * might already know the resolution of the video, and any alternative resolutions you want to provide, so you don't need to do this.
		 *
		 * We'll get the original video resolution from the video metadata. We can see if the video has metadata already by comparing
		 * video.readyState to HTMLMediaElement.HAVE_METADATA. If not already loaded, we can wait for the loadedmetadata event.
		 *
		 * This code creates a promise that will be resolved when the video metadata is available.
		 */
		videoMetadataLoadedPromise = new libjass.Promise(function (resolve, reject) {
			if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
				// Video metadata isn't available yet. Register an event handler for it.
				video.addEventListener("loadedmetadata", resolve, false);
				video.addEventListener("error", function (event) { reject(video.error); }, false);
			}
			else {
				// Video metadata is already available.
				resolve();
			}
		});
	}
	else if (videoType === 2 /* dummy */) {
		var width = arguments[1];
		var height = arguments[2];
		var color = arguments[3];
		var duration = arguments[4];

		videoMetadataLoadedPromise = makeDummyVideo(video, width, height, color, duration);
	}

	return videoMetadataLoadedPromise.then(function () {
		console.log("Video metadata loaded.");

		// Prepare the "Video resolution" option label
		document.querySelector("#video-resolution-label-width").appendChild(document.createTextNode(video.videoWidth));
		document.querySelector("#video-resolution-label-height").appendChild(document.createTextNode(video.videoHeight));
	}).catch(function (reason) {
		var errorCode = (reason.code !== undefined) ? [null, "MEDIA_ERR_ABORTED", "MEDIA_ERR_NETWORK", "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED"][reason.code] : "";
		console.error("Video could not be loaded: %o %o", errorCode, reason);

		throw reason;
	});
}


/* This is a function that sets up libjass to render the subs.
 */
function go(videoPromise, assPromise, enableSvg) {
	var video = document.querySelector("#video");


	/* Now we need to fetch the ASS script at the given URL and convert it into a libjass.ASS object. We use the libjass.ASS.fromUrl()
	 * function for this. It fetches the ASS script asynchronously and returns a promise that will be resolved when the script is fully
	 * parsed.
	 */
	var assLoadedPromise = assPromise.then(function (ass) {
		console.log("Script received.");

		// Export the ASS object for debugging
		window.ass = ass;

		// Prepare the "Script resolution" option label
		document.querySelector("#script-resolution-label-width").appendChild(document.createTextNode(ass.properties.resolutionX));
		document.querySelector("#script-resolution-label-height").appendChild(document.createTextNode(ass.properties.resolutionY));

		return ass;
	}).catch(function (reason) {
		console.error("ASS could not be loaded: %o", reason);
		throw reason;
	});


	/* Next, we wait for both the video and the libjass.ASS object to be available, i.e., for their respective promises to be
	 * resolved. Once they have, we can create the libjass.renderers.DefaultRenderer object. This is the object that will display subs
	 * on the <video> element.
	 */
	libjass.Promise.all([videoPromise, assLoadedPromise]).then(function (results) {
		var ass = results[1];

		var rendererSettings = { };
		if (enableSvg !== null) {
			rendererSettings.enableSvg = enableSvg;
		}
		// else unset, which means libjass will try to auto-detect it.

		// Create a DefaultRenderer using the video element and the ASS object
		var renderer = new libjass.renderers.DefaultRenderer(video, ass, rendererSettings);

		// Export the renderer for debugging
		window.renderer = renderer;


		/* (Advanced)
		 *
		 * The renderer sets some internal things up, and then fires a "ready" event when it's done. If you want to have autoplaying video,
		 * but want to wait for the renderer to set up first, you should only play the video when the "ready" event fires.
		 */
		renderer.addEventListener("ready", function () {
			console.log("Beginning autoplay.");

			video.play();
		});


		/* (Advanced)
		 *
		 * This demo page also has a checkbox that can be used to turn the subs off. We'll use the checkbox's value with renderer.setEnabled()
		 * to do this.
		 */
		document.querySelector("#enable-disable-subs").addEventListener("change", function (event) {
			renderer.setEnabled(event.target.checked);
		}, false);


		/* (Advanced)
		 *
		 * As mentioned above, this demo page allows the user to resize the video with two presets - the original video resolution and the subs
		 * resolution. DefaultRenderer needs to be told of changes to the size of the <video> element because it needs the size information to
		 * calculate the positions and sizes of the subs.
		 *
		 * This next function is called whenever the user chooses a different preset size for the video.
		 */
		var applyVideoSizeSelection = function () {
			// Find which option is selected

			var id = videoSizeSelector.querySelector("input[name='video-size']:checked").id;

			if (id === "video-size-video-radio") {
				// Resize to video resolution

				video.style.width = video.videoWidth + "px";
				video.style.height = video.videoHeight + "px";
				renderer.resize();
			}

			else if (id === "video-size-script-radio") {
				// Resize to script resolution

				video.style.width = ass.properties.resolutionX + "px";
				video.style.height = ass.properties.resolutionY + "px";
				renderer.resize();
			}
		};

		var videoSizeSelector = document.querySelector("#video-size-selector");
		videoSizeSelector.addEventListener("change", function (event) { applyVideoSizeSelection(); }, false);

		// Set the resolution to whatever's selected by default
		applyVideoSizeSelection();
	});
}


var htmlConsoleLog = function (htmlConsole) {
	return function (items) {
		var message = document.createElement("div");
		htmlConsole.appendChild(message);
		message.className = "log";

		var text = new Date().toString() + ": ";
		items.forEach(function (item) {
			switch (typeof item) {
				case "boolean":
				case "number":
				case "string":
					text += item + " ";
					break;
				default:
					text += item + "[Check browser console for more details.] ";
					break;
			}
		});
		message.appendChild(document.createTextNode(text));
	};
};

var htmlConsoleWarn = function (htmlConsole) {
	return function (items) {
		var message = document.createElement("div");
		htmlConsole.appendChild(message);
		message.className = "warning";

		var text = new Date().toString() + ": ";
		items.forEach(function (item) {
			switch (typeof item) {
				case "boolean":
				case "number":
				case "string":
					text += item + " ";
					break;
				default:
					text += item + "[Check browser console for more details.] ";
					break;
			}
		});
		message.appendChild(document.createTextNode(text));
	};
};

var htmlConsoleError = function (htmlConsole) {
	return function (items) {
		var message = document.createElement("div");
		htmlConsole.appendChild(message);
		message.className = "error";

		var text = new Date().toString() + ": ";
		items.forEach(function (item) {
			switch (typeof item) {
				case "boolean":
				case "number":
				case "string":
					text += item + " ";
					break;
				default:
					text += item + "[Check browser console for more details.] ";
					break;
			}
		});
		message.appendChild(document.createTextNode(text));
	};
};
