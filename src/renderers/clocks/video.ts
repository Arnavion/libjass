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

import { AutoClock } from "./auto";
import { Clock, ClockEvent } from "./base";

/**
 * An implementation of libjass.renderers.Clock that generates {@link libjass.renderers.ClockEvent}s according to the state of a <video> element.
 *
 * @param {!HTMLVideoElement} video
 */
export class VideoClock implements Clock {
	private _autoClock: AutoClock;

	constructor(video: HTMLVideoElement) {
		this._autoClock = new AutoClock(() => video.currentTime, 100);
		video.addEventListener("playing", () => this._autoClock.play(), false);
		video.addEventListener("pause", () => this._autoClock.pause(), false);
		video.addEventListener("seeking", () => this._autoClock.seeking(), false);
		video.addEventListener("ratechange", () => this._autoClock.setRate(video.playbackRate), false);
	}

	/**
	 * @type {number}
	 */
	get currentTime(): number {
		return this._autoClock.currentTime;
	}

	/**
	 * @type {boolean}
	 */
	get enabled(): boolean {
		return this._autoClock.enabled;
	}

	/**
	 * @type {boolean}
	 */
	get paused(): boolean {
		return this._autoClock.paused;
	}

	/**
	 * Gets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @type {number}
	 */
	get rate(): number {
		return this._autoClock.rate;
	}

	/**
	 * Enable the clock.
	 *
	 * @return {boolean} True if the clock is now enabled, false if it was already enabled.
	 */
	enable(): boolean {
		return this._autoClock.enable();
	}

	/**
	 * Disable the clock.
	 *
	 * @return {boolean} True if the clock is now disabled, false if it was already disabled.
	 */
	disable(): boolean {
		return this._autoClock.disable();
	}

	/**
	 * Toggle the clock.
	 */
	toggle(): void {
		this._autoClock.toggle();
	}

	/**
	 * Enable or disable the clock.
	 *
	 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
	 * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
	 */
	setEnabled(enabled: boolean): boolean {
		return this._autoClock.setEnabled(enabled);
	}

	/**
	 * @param {number} type
	 * @param {!Function} listener
	 */
	addEventListener(type: ClockEvent, listener: Function): void {
		this._autoClock.addEventListener(type, listener);
	}
}
