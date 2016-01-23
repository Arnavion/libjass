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

import { VideoClock } from "./clocks/video";
import { RendererSettings } from "./settings";
import { WebRenderer } from "./web/renderer";

import { ASS } from "../types/ass";

/**
 * A default renderer implementation.
 *
 * @param {!HTMLVideoElement} video
 * @param {!libjass.ASS} ass
 * @param {libjass.renderers.RendererSettings} settings
 */
export class DefaultRenderer extends WebRenderer {
	constructor(private _video: HTMLVideoElement, ass: ASS, settings?: RendererSettings) {
		super(ass, new VideoClock(_video), document.createElement("div"), settings);

		this._video.parentElement.replaceChild(this.libjassSubsWrapper, this._video);
		this.libjassSubsWrapper.insertBefore(this._video, this.libjassSubsWrapper.firstElementChild);
	}

	/**
	 * Resize the subtitles to the dimensions of the video element.
	 *
	 * This method accounts for letterboxing if the video element's size is not the same ratio as the video resolution.
	 */
	resize(): void {
		// Handle letterboxing around the video. If the width or height are greater than the video can be, then consider that dead space.

		const videoWidth = this._video.videoWidth;
		const videoHeight = this._video.videoHeight;
		const videoOffsetWidth = this._video.offsetWidth;
		const videoOffsetHeight = this._video.offsetHeight;

		const ratio = Math.min(videoOffsetWidth / videoWidth, videoOffsetHeight / videoHeight);
		const subsWrapperWidth = videoWidth * ratio;
		const subsWrapperHeight = videoHeight * ratio;
		const subsWrapperLeft = (videoOffsetWidth - subsWrapperWidth) / 2;
		const subsWrapperTop = (videoOffsetHeight - subsWrapperHeight) / 2;

		super.resize(subsWrapperWidth, subsWrapperHeight, subsWrapperLeft, subsWrapperTop);
	}

	/**
	 * @deprecated
	 */
	resizeVideo(): void {
		console.warn("`DefaultRenderer.resizeVideo(width, height)` has been deprecated. Use `DefaultRenderer.resize()` instead.");
		this.resize();
	}

	protected _ready(): void {
		this.resize();

		super._ready();
	}
}
