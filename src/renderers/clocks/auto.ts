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

import { debugMode } from "../../settings";

import { Clock, ClockEvent } from "./base";
import { ManualClock } from "./manual";

/**
 * An implementation of libjass.renderers.Clock that automatically ticks and generates {@link libjass.renderers.ClockEvent}s according to the state of an external driver.
 *
 * For example, if you're using libjass to render subtitles on a canvas with your own video controls, these video controls will function as the driver to this AutoClock.
 * It would call {@link libjass.renderers.AutoClock.play}, {@link libjass.renderers.AutoClock.play}, etc. when the user pressed the corresponding video controls.
 *
 * The difference from ManualClock is that AutoClock does not require the driver to call something like {@link libjass.renderers.ManualClock.tick}. Instead it keeps its
 * own time with a high-resolution requestAnimationFrame-based timer.
 *
 * If using libjass with a <video> element, consider using {@link libjass.renderers.VideoClock} that uses the video element as a driver.
 *
 * @param {function():number} getCurrentTime A callback that will be invoked to get the current time of the external driver.
 * @param {number} currentTimeUpdateMaxDelay If two calls to getCurrentTime are more than currentTimeUpdateMaxDelay milliseconds apart, then the external driver will be
 * considered to have paused.
 */
export class AutoClock implements Clock {
	private _manualClock: ManualClock = new ManualClock();

	private _nextAnimationFrameRequestId: number = null;

	private _lastKnownExternalTime: number = null;
	private _lastKnownExternalTimeObtainedAt: number = null;

	constructor(private _getCurrentTime: () => number, private _currentTimeUpdateMaxDelay: number) { }

	/**
	 * Tells the clock to start generating ticks.
	 */
	play(): void {
		if (!this._manualClock.enabled) {
			return;
		}

		this._startTicking();

		this._manualClock.play();
	}

	/**
	 * Tells the clock to pause.
	 */
	pause(): void {
		if (!this._manualClock.enabled) {
			return;
		}

		if (this._nextAnimationFrameRequestId === null) {
			if (debugMode) {
				console.warn("AutoClock.pause: Abnormal state detected. AutoClock._nextAnimationFrameRequestId should not have been null.");
			}

			return;
		}

		this._stopTicking();

		this._manualClock.pause();
	}

	/**
	 * Tells the clock that the external driver is seeking.
	 */
	seeking(): void {
		this._manualClock.seek(this._getCurrentTime());
	}

	// Clock members

	/**
	 * @type {number}
	 */
	get currentTime(): number {
		return this._manualClock.currentTime;
	}

	/**
	 * @type {boolean}
	 */
	get enabled(): boolean {
		return this._manualClock.enabled;
	}

	/**
	 * @type {boolean}
	 */
	get paused(): boolean {
		return this._manualClock.paused;
	}

	/**
	 * Gets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @type {number}
	 */
	get rate(): number {
		return this._manualClock.rate;
	}

	/**
	 * Sets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @param {number} rate The new rate of the clock.
	 */
	setRate(rate: number): void {
		this._manualClock.setRate(rate);
	}

	/**
	 * Enable the clock.
	 *
	 * @return {boolean} True if the clock is now enabled, false if it was already enabled.
	 */
	enable(): boolean {
		if (!this._manualClock.enable()) {
			return false;
		}

		this._startTicking();

		return true;
	}

	/**
	 * Disable the clock.
	 *
	 * @return {boolean} True if the clock is now disabled, false if it was already disabled.
	 */
	disable(): boolean {
		if (!this._manualClock.disable()) {
			return false;
		}

		this._stopTicking();

		return true;
	}

	/**
	 * Toggle the clock.
	 */
	toggle(): void {
		this._manualClock.toggle();
	}

	/**
	 * Enable or disable the clock.
	 *
	 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
	 * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
	 */
	setEnabled(enabled: boolean): boolean {
		return this._manualClock.setEnabled(enabled);
	}

	/**
	 * @param {number} type
	 * @param {!Function} listener
	 */
	addEventListener(type: ClockEvent, listener: Function): void {
		this._manualClock.addEventListener(type, listener);
	};

	/**
	 * @param {number} timeStamp
	 */
	private _onTimerTick(timeStamp: number): void {
		if (!this._manualClock.enabled) {
			if (debugMode) {
				console.warn("AutoClock._onTimerTick: Called when disabled.");
			}

			return;
		}

		var currentTime = this._manualClock.currentTime;
		var currentExternalTime = this._getCurrentTime();

		if (!this._manualClock.paused) {
			if (this._lastKnownExternalTime !== null && currentExternalTime === this._lastKnownExternalTime) {
				if (timeStamp - this._lastKnownExternalTimeObtainedAt > this._currentTimeUpdateMaxDelay) {
					this._lastKnownExternalTimeObtainedAt = null;
					this._manualClock.pause();
				}
				else {
					this._manualClock.tick((timeStamp - this._lastKnownExternalTimeObtainedAt) / 1000 * this._manualClock.rate + this._lastKnownExternalTime);
				}
			}
			else {
				this._lastKnownExternalTime = currentExternalTime;
				this._lastKnownExternalTimeObtainedAt = timeStamp;
				this._manualClock.tick(currentExternalTime);
			}
		}
		else {
			if (currentTime !== currentExternalTime) {
				this._lastKnownExternalTime = currentExternalTime;
				this._lastKnownExternalTimeObtainedAt = timeStamp;
				this._manualClock.tick(currentExternalTime);
			}
		}

		this._nextAnimationFrameRequestId = requestAnimationFrame(timeStamp => this._onTimerTick(timeStamp));
	}

	private _startTicking(): void {
		if (this._nextAnimationFrameRequestId === null) {
			this._nextAnimationFrameRequestId = requestAnimationFrame(timeStamp => this._onTimerTick(timeStamp));
		}
	}

	private _stopTicking(): void {
		if (this._nextAnimationFrameRequestId !== null) {
			cancelAnimationFrame(this._nextAnimationFrameRequestId);
			this._nextAnimationFrameRequestId = null;
		}
	}
}
