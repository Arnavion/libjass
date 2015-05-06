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


/* This page demonstrates how to use libjass. It allows you to choose two files - a video file that will be played in a <video> element,
 * and a .ass file that contains the subs. The two chosen files are converted to File URLs; if you were making a video playing site then
 * you would have the URLs already.
 *
 *
 * Below you will find the basics of using libjass - the ASS.fromUrl() function and the DefaultRenderer class - and some advanced concepts:
 * - handling resizable video
 * - autoplaying video
 * - handling fullscreen video
 * - toggling subs on user input
 *
 * The advanced concepts are optional and marked with "(Advanced)"
 *
 *
 * Some more advanced uses not demonstrated here include:
 * - renderer settings, such as using custom fonts or controlling the pre-render time
 * - using WebRenderer instead of DefaultRenderer for control over the placement of the subs <div>, custom handling of fullscreen, etc.
 * - using ASS.fromString() instead of ASS.fromUrl() when you have the ASS string already, such as in an online subs editor
 * - using libjass.parser.StreamParser and its minimalAss promise directly, such as for dynamically generated scripts
 * - working with SRT subs by specifying libjass.Format.SRT to the ASS.from*() functions
 *
 *
 * API documentation is available at http://arnavion.github.io/libjass/api.xhtml
 */


"use strict";


/* This section sets up the default look of the page - two <input type="file"> controls that will be used to choose the files, and the
 * "Go" button that will transform the page into the <video> element. If you already have the URLs, you would skip this step and generate
 * the appropriate <video> element directly.
 */
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


/* This is a function that creates the <video> element with the given video URL, and sets up libjass to render the subs at the given ASS URL.
 */
function go(videoUrl, assUrl) {
	var video = document.querySelector("#video");


	/* Set the <video> element's src to the given URL
	 */
	video.src = videoUrl;


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
		console.log("Video metadata loaded.");

		// Prepare the "Video resolution" option label
		document.querySelector("#video-resolution-label-width").appendChild(document.createTextNode(video.videoWidth));
		document.querySelector("#video-resolution-label-height").appendChild(document.createTextNode(video.videoHeight));
	});


	/* Now we need to fetch the ASS script at the given URL and convert it into a libjass.ASS object. We use the libjass.ASS.fromUrl()
	 * function for this. It fetches the ASS script asynchronously and returns a promise that will be resolved when the script is fully
	 * parsed.
	 */
	var assLoadedPromise = libjass.ASS.fromUrl(assUrl).then(function (ass) {
		console.log("Script received.");

		// Export the ASS object for debugging
		window.ass = ass;

		// Prepare the "Script resolution" option label
		document.querySelector("#script-resolution-label-width").appendChild(document.createTextNode(ass.properties.resolutionX));
		document.querySelector("#script-resolution-label-height").appendChild(document.createTextNode(ass.properties.resolutionY));

		return ass;
	});


	/* Next, we wait for both the video metadata and the libjass.ASS objects to be available, i.e., for their respective promises to be
	 * resolved. Once they have, we can create the libjass.renderers.DefaultRenderer object. This is the object that will display subs
	 * on the <video> element.
	 */
	libjass.Promise.all([videoMetadataLoadedPromise, assLoadedPromise]).then(function (results) {
		var ass = results[1];

		// Create a DefaultRenderer using the video element and the ASS object
		var renderer = new libjass.renderers.DefaultRenderer(video, ass);

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
		 * This next function is called whenever the user chooses a different preset size for the video. It's also called when the video exits
		 * fullscreen, so that the user's original selection can be restored.
		 */
		var applyVideoSizeSelection = function () {
			// Find which option is selected

			var id = videoSizeSelector.querySelector("input[name='video-size']:checked").id;

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
		videoSizeSelector.addEventListener("change", function (event) { applyVideoSizeSelection(); }, false);

		// When video exits full screen, restore the size according to the resolution option that's selected
		renderer.addEventListener("fullScreenChange", function (videoIsFullScreen) {
			if (!videoIsFullScreen) {
				applyVideoSizeSelection();
			}
		});

		// Set the resolution to whatever's selected by default
		applyVideoSizeSelection();
	});
}


/* libjass.debugMode and libjass.verboseMode are two properties that can be set to true to have libjass print some debug
 * information. This code sets them based on the querystring of the current page.
 */
libjass.debugMode = (location.search === "?debug") || (location.search === "?verbose");
libjass.verboseMode = (location.search === "?verbose");
