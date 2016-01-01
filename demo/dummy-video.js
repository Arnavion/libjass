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

/**
 * Creates a video of the given color, dimensions and duration, and prepares the given video element to play it.
 */
function makeDummyVideo(video, width, height, color, duration) {
	return new libjass.Promise(function (resolve, reject) {
		video.width = width;
		video.height = height;

		var canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		var context = canvas.getContext("2d");
		context.fillStyle = color;
		context.fillRect(0, 0, width, height);

		var stream = canvas.captureStream(0);
		var recorder = new MediaRecorder(stream);

		recorder.start(1); // Get as many events as possible to have a chance at getting the smallest possible chunk.

		var blob = null;

		recorder.addEventListener("dataavailable", function (event) {
			if (recorder.state === "inactive") {
				// Being called after recorder.stop(). Do nothing.
				return;
			}

			if (event.data.size === 0) {
				console.warn("No new data.");
				return;
			}

			recorder.pause(); // Don't get flooded with new blobs while parsing the current blob.

			if (blob === null) {
				blob = event.data;
				if (!MediaSource.isTypeSupported(blob.type)) {
					/* MediaRecorder may record a format that MediaSource doesn't support. As of Nightly 46, this is true, since MediaRecorder
					 * records webm which MediaSource doesn't play unless media.mediasource.webm.enabled is true in about:config
					 */

					recorder.stop();
					reject(new Error("MediaRecorder is recording video in " + blob.type + " but MediaSource doesn't support it. Make sure media.mediasource.webm.enabled is on in about:config"));
					return;
				}
			}
			else {
				blob = new Blob([blob, event.data], { type: blob.type });
			}

			// Data is available but may not contain any frames. Test for that.
			libjass.Promise.all([newMediaSourceAndBuffer(video, blob.type), blobToArrayBuffer(blob)]).then(function (results) {
				var mediaSource = results[0][0];
				var sourceBuffer = results[0][1];
				var buffer = results[1];

				return appendBuffer(sourceBuffer, buffer).then(function () {
					console.log("Got enough data for " + getEndTime(sourceBuffer) + " seconds.");

					return [mediaSource, sourceBuffer, buffer];
				});
			}).then(function (result) {
				resolve(result);

				recorder.stop();
			}, function (reason) {
				console.warn(reason);
				console.warn("Waiting for more data...");

				recorder.resume();
			});
		});
	}).then(function (results) {
		var mediaSource = results[0];
		var sourceBuffer = results[1];
		var buffer = results[2];

		return appendBufferUntil(sourceBuffer, buffer, duration).then(function () {
			return mediaSource.endOfStream();
		});
	});
}

/**
 * Sets up the given `video` to use a new MediaSource, and appends a new SourceBuffer of the given `type`.
 */
function newMediaSourceAndBuffer(video, type) {
	return new libjass.Promise(function (resolve, reject) {
		var mediaSource = new MediaSource();

		function onSourceOpen() {
			mediaSource.removeEventListener("sourceopen", onSourceOpen, false);

			try {
				var sourceBuffer = mediaSource.addSourceBuffer(type);

				resolve([mediaSource, sourceBuffer]);
			}
			catch (ex) {
				reject(ex);
			}
		}

		mediaSource.addEventListener("sourceopen", onSourceOpen, false);

		video.src = URL.createObjectURL(mediaSource);
	});
}

/**
 * Converts a Blob to an ArrayBuffer
 */
function blobToArrayBuffer(blob) {
	return new libjass.Promise(function (resolve, reject) {
		var fileReader = new FileReader();

		fileReader.addEventListener("load", function () {
			resolve(fileReader.result);
		}, false);
		fileReader.addEventListener("error", function (event) {
			reject(event);
		});

		fileReader.readAsArrayBuffer(blob);
	});
}

/**
 * Appends the given video data `buffer` to the given `sourceBuffer`.
 */
function appendBuffer(sourceBuffer, buffer) {
	return new libjass.Promise(function (resolve, reject) {
		var currentEndTime = getEndTime(sourceBuffer);

		function onUpdateEnd() {
			sourceBuffer.removeEventListener("updateend", onUpdateEnd, false);

			if (sourceBuffer.buffered.length === 0) {
				reject(new Error("buffer of length " + buffer.byteLength + " could not be appended to sourceBuffer. It's probably too small and doesn't contain any frames."));
				return;
			}

			var newEndTime = getEndTime(sourceBuffer);
			if (newEndTime === currentEndTime) {
				reject(new Error("sourceBuffer is not increasing in size. Perhaps buffer is too small?"));
				return;
			}

			resolve();
		}

		sourceBuffer.addEventListener("updateend", onUpdateEnd, false);

		sourceBuffer.timestampOffset = currentEndTime;
		sourceBuffer.appendBuffer(buffer);
	});
}

/**
 * Repeatedly appends the given video data `buffer` to the given `sourceBuffer` until it is of `duration` length.
 */
function appendBufferUntil(sourceBuffer, buffer, duration) {
	var currentEndTime = getEndTime(sourceBuffer);
	if (currentEndTime < duration) {
		return appendBuffer(sourceBuffer, buffer).then(function () {
			return appendBufferUntil(sourceBuffer, buffer, duration);
		});
	}
	else {
		return libjass.Promise.resolve();
	}
}

/**
 * Gets the end time of a SourceBuffer.
 */
function getEndTime(sourceBuffer) {
	return (sourceBuffer.buffered.length === 0) ? 0 : sourceBuffer.buffered.end(0);
}
