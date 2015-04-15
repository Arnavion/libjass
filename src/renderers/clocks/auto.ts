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

import { mixin } from "../../utility/mixin";
import { Map } from "../../utility/map";

import { Clock, ClockEvent, EventSource } from "./base";

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
	private _currentTime: number = -1;

	private _rate: number = 1;

	private _enabled: boolean = true;

	private _paused: boolean = true;

	private _nextAnimationFrameRequestId: number = null;
	private _possiblePauseAnimationFrameTimeStamp: number = null;

	constructor(private _getCurrentTime: () => number, private _currentTimeUpdateMaxDelay: number) { }

	// Clock members

	/**
	 * @type {number}
	 */
	get currentTime(): number {
		return this._currentTime;
	}

	/**
	 * @type {boolean}
	 */
	get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * Gets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @type {number}
	 */
	get rate(): number {
		return this._rate;
	}

	/**
	 * Sets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @type {number}
	 */
	set rate(value: number) {
		this._rate = value;
		this._dispatchEvent(ClockEvent.RateChange, []);
	}

	/**
	 * Enable the clock.
	 *
	 * @return {boolean} True if the clock is now enabled, false if it was already enabled.
	 */
	enable(): boolean {
		if (this._enabled) {
			return false;
		}

		if (!this._paused) {
			if (debugMode) {
				console.warn("AutoClock.enable: Abnormal state detected. AutoClock._paused should have been true.");
			}
		}

		this._enabled = true;

		this._startTicking();

		return true;
	}

	/**
	 * Disable the clock.
	 *
	 * @return {boolean} True if the clock is now disabled, false if it was already disabled.
	 */
	disable(): boolean {
		if (!this._enabled) {
			return false;
		}

		if (!this._paused) {
			this._paused = true;
			this._dispatchEvent(ClockEvent.Pause, []);
		}

		this._enabled = false;

		this._dispatchEvent(ClockEvent.Stop, []);

		this._stopTicking();

		return true;
	}

	/**
	 * Toggle the clock.
	 */
	toggle(): void {
		if (this._enabled) {
			this.disable();
		}
		else {
			this.enable();
		}
	}

	/**
	 * Enable or disable the clock.
	 *
	 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
	 * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
	 */
	setEnabled(enabled: boolean): boolean {
		if (enabled) {
			return this.enable();
		}
		else {
			return this.disable();
		}
	}

	/**
	 * Tells the clock to start generating ticks.
	 */
	play(): void {
		if (!this._enabled) {
			return;
		}

		if (!this._paused) {
			return;
		}

		this._startTicking();
	}

	/**
	 * Tells the clock to pause.
	 */
	pause(): void {
		if (!this._enabled) {
			return;
		}

		if (this._paused) {
			return;
		}

		this._paused = true;

		this._dispatchEvent(ClockEvent.Pause, []);

		if (this._nextAnimationFrameRequestId === null) {
			if (debugMode) {
				console.warn("AutoClock._onVideoPause: Abnormal state detected. AutoClock._nextAnimationFrameRequestId should not have been null");
			}

			return;
		}

		this._stopTicking();
	}

	/**
	 * Tells the clock that the external driver is seeking.
	 */
	seeking(): void {
		if (!this._enabled) {
			return;
		}

		var currentTime = this._getCurrentTime();

		if (this._currentTime === currentTime) {
			return;
		}

		if (!this._paused) {
			this._paused = true;
			this._dispatchEvent(ClockEvent.Pause, []);
		}

		this._dispatchEvent(ClockEvent.Stop, []);

		this._currentTime = currentTime;

		this._dispatchEvent(ClockEvent.Play, []);
		this._dispatchEvent(ClockEvent.Tick, []);
		this._dispatchEvent(ClockEvent.Pause, []);
	}

	/**
	 * @param {number} timeStamp
	 */
	private _onTimerTick(timeStamp: number): void {
		if (!this._enabled) {
			return;
		}

		var currentTime = this._getCurrentTime();

		if (!this._paused) {
			if (this._currentTime !== currentTime) {
				this._currentTime = currentTime;
				this._possiblePauseAnimationFrameTimeStamp = null;
				this._dispatchEvent(ClockEvent.Tick, []);
			}
			else {
				if (this._possiblePauseAnimationFrameTimeStamp === null) {
					this._possiblePauseAnimationFrameTimeStamp = timeStamp;
				}
				else if (timeStamp - this._possiblePauseAnimationFrameTimeStamp > this._currentTimeUpdateMaxDelay) {
					this._possiblePauseAnimationFrameTimeStamp = null;
					this._paused = true;
					this._dispatchEvent(ClockEvent.Pause, []);
				}
			}
		}
		else {
			if (this._currentTime !== currentTime) {
				this._currentTime = currentTime;
				this._possiblePauseAnimationFrameTimeStamp = null;
				this._paused = false;
				this._dispatchEvent(ClockEvent.Play, []);
				this._dispatchEvent(ClockEvent.Tick, []);
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

	// EventSource members

	/**
	 * @type {!Map.<T, !Array.<Function>>}
	 */
	_eventListeners: Map<ClockEvent, Function[]> = new Map<ClockEvent, Function[]>();

	/**
	 * @type {function(number, !Function)}
	 */
	addEventListener: (type: ClockEvent, listener: Function) => void;

	/**
	 * @type {function(number, Array.<*>)}
	 */
	_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
}
mixin(AutoClock, [EventSource]);
