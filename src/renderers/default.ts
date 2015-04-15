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

///<reference path="./default-references.d.ts" />

/**
 * A default renderer implementation.
 *
 * @param {!HTMLVideoElement} video
 * @param {!libjass.ASS} ass
 * @param {libjass.renderers.RendererSettings} settings
 */
export class DefaultRenderer extends WebRenderer {
	private _videoIsFullScreen: boolean = false;

	constructor(private _video: HTMLVideoElement, ass: ASS, settings?: RendererSettings) {
		super(ass, new VideoClock(_video), document.createElement("div"), settings);

		this._video.parentElement.replaceChild(this.libjassSubsWrapper, this._video);
		this.libjassSubsWrapper.insertBefore(this._video, this.libjassSubsWrapper.firstElementChild);
	}

	/**
	 * @deprecated
	 *
	 * @param {number} width
	 * @param {number} height
	 */
	resizeVideo(width: number, height: number): void {
		console.warn("`DefaultRenderer.resizeVideo(width, height)` has been deprecated. Use `DefaultRenderer.resize(width, height)` instead.");
		this.resize(width, height);
	}

	protected _ready(): void {
		document.addEventListener("mozfullscreenchange", event => this._onFullScreenChange(document.mozFullScreenElement), false);
		document.addEventListener("webkitfullscreenchange", event => this._onFullScreenChange(document.webkitFullscreenElement), false);
		document.addEventListener("fullscreenchange", event => this._onFullScreenChange(document.fullscreenElement), false);

		this.resize(this._video.offsetWidth, this._video.offsetHeight);

		super._ready();
	}

	/**
	 * @param {!Element} fullScreenElement
	 */
	private _onFullScreenChange(fullScreenElement: Element): void {
		if (fullScreenElement === undefined) {
			fullScreenElement = document.msFullscreenElement;
		}

		if (fullScreenElement === this._video) {
			this.libjassSubsWrapper.classList.add("libjass-full-screen");

			this.resize(screen.width, screen.height);

			this._videoIsFullScreen = true;

			this._dispatchEvent("fullScreenChange", [this._videoIsFullScreen]);
		}
		else if (fullScreenElement === null && this._videoIsFullScreen) {
			this.libjassSubsWrapper.classList.remove("libjass-full-screen");

			this._videoIsFullScreen = false;

			this._dispatchEvent("fullScreenChange", [this._videoIsFullScreen]);
		}
	}
}
