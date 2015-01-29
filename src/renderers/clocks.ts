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

import globalSettings = require("../settings");

import mixin = require("../utility/mixin");
import map = require("../utility/map");

/**
 * A mixin class that represents an event source.
 */
export class EventSource<T> {
	/**
	 * A map from event type to an array of all the listeners registered for that event type.
	 *
	 * @type {!Map.<T, !Array.<Function>>}
	 */
	_eventListeners: map.Map<T, Function[]>;

	/**
	 * Add a listener for the given event.
	 *
	 * @param {!T} type The type of event to attach the listener for
	 * @param {!Function} listener The listener
	 */
	addEventListener(type: T, listener: Function): void {
		var listeners = this._eventListeners.get(type);

		if (listeners === undefined) {
			this._eventListeners.set(type, listeners = []);
		}

		listeners.push(listener);
	}

	/**
	 * Calls all listeners registered for the given event type.
	 *
	 * @param {!T} type The type of event to dispatch
	 * @param {!Array.<*>} args Arguments for the listeners of the event
	 */
	_dispatchEvent(type: T, args: Object[]): void {
		var listeners = this._eventListeners.get(type);
		if (listeners !== undefined) {
			listeners.forEach((listener: Function) => {
				listener.apply(this, args);
			});
		}
	}
}

/**
 * The type of clock event.
 */
export enum ClockEvent {
	Play,
	Tick,
	Pause,
	Stop,
	RateChange,
}

/**
 * The clock interface. A clock is used by a renderer as a source of {@link libjass.renderers.ClockEvent}s.
 */
export interface Clock extends EventSource<ClockEvent> {
	/**
	 * @type {number}
	 */
	currentTime: number;

	/**
	 * @type {boolean}
	 */
	enabled: boolean;

	/**
	 * Gets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @type {number}
	 */
	rate: number;

	/**
	 * Enable the clock.
	 *
	 * @return {boolean} True if the clock is now enabled, false if it was already enabled.
	 */
	enable(): boolean;

	/**
	 * Disable the clock.
	 *
	 * @return {boolean} True if the clock is now disabled, false if it was already disabled.
	 */
	disable(): boolean;

	/**
	 * Toggle the clock.
	 */
	toggle(): void;

	/**
	 * Enable or disable the clock.
	 *
	 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
	 * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
	 */
	setEnabled(enabled: boolean): boolean;

	// EventSource members

	/**
	 * @param {number} type
	 * @param {!Function} listener
	 */
	addEventListener(type: ClockEvent, listener: Function): void;
}

/**
 * An implementation of {@link libjass.renderers.Clock} that allows user script to manually trigger play, pause and timeUpdate events.
 */
export class ManualClock implements Clock {
	private _currentTime: number = -1;
	private _enabled: boolean = true;
	private _rate: number = 1;

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Play}
	 */
	play(): void {
		this._dispatchEvent(ClockEvent.Play, []);
	}

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Tick}
	 *
	 * @param {number} currentTime
	 */
	tick(currentTime: number): void {
		this._currentTime = currentTime;
		this._dispatchEvent(ClockEvent.Tick, []);
	}

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Pause}
	 */
	pause(): void {
		this._dispatchEvent(ClockEvent.Pause, []);
	}

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Stop}
	 */
	stop(): void {
		this._dispatchEvent(ClockEvent.Stop, []);
	}

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
	 * Enable the clock.
	 *
	 * @return {boolean} True if the clock is now enabled, false if it was already enabled.
	 */
	enable(): boolean {
		if (this._enabled) {
			return false;
		}

		this._enabled = true;

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

		this._enabled = false;

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
	 * Sets the rate of the clock - how fast the clock ticks compared to real time.
	 *
	 * @param {number} rate The new rate of the clock.
	 */
	setRate(rate: number): void {
		this._rate = rate;

		this._dispatchEvent(ClockEvent.RateChange, []);
	}

	// EventSource members

	/**
	 * @type {!Map.<T, !Array.<Function>>}
	 */
	_eventListeners: map.Map<ClockEvent, Function[]> = new map.Map<ClockEvent, Function[]>();

	/**
	 * @type {function(number, !Function)}
	 */
	addEventListener: (type: ClockEvent, listener: Function) => void;

	/**
	 * @type {function(number, Array.<*>)}
	 */
	_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
}
mixin(ManualClock, [EventSource]);

/**
 * The state of the video.
 */
enum VideoState {
	Playing = 0,
	Paused = 1,
}

/**
 * An implementation of libjass.renderers.Clock that generates play, pause and timeUpdate events according to the state of a <video> element.
 *
 * @param {!HTMLVideoElement} video
 */
export class VideoClock implements Clock {
	private _currentTime: number = -1;

	private _enabled: boolean = true;

	private _videoState: VideoState;

	private _nextAnimationFrameRequestId: number = null;
	private _possiblePauseAnimationFrameTimeStamp: number = null;

	constructor(private _video: HTMLVideoElement) {
		this._video.addEventListener("playing", () => this._onVideoPlaying(), false);
		this._video.addEventListener("pause", () => this._onVideoPause(), false);
		this._video.addEventListener("seeking", () => this._onVideoSeeking(), false);
		this._video.addEventListener("ratechange", () => this._onVideoRateChange(), false);
	}

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
		return this._video.playbackRate;
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

		if (this._videoState !== VideoState.Paused) {
			if (globalSettings.debugMode) {
				console.warn("VideoClock.enable: Abnormal state detected. VideoClock._videoState should have been VideoState.Paused");
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

		if (this._videoState === VideoState.Playing) {
			this._videoState = VideoState.Paused;
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

	private _onVideoPlaying(): void {
		if (!this._enabled) {
			return;
		}

		if (this._videoState === VideoState.Playing) {
			return;
		}

		this._startTicking();
	}

	private _onVideoPause(): void {
		if (!this._enabled) {
			return;
		}

		if (this._videoState === VideoState.Paused) {
			return;
		}

		this._videoState = VideoState.Paused;

		this._dispatchEvent(ClockEvent.Pause, []);

		if (this._nextAnimationFrameRequestId === null) {
			if (globalSettings.debugMode) {
				console.warn("VideoClock._onVideoPause: Abnormal state detected. VideoClock._nextAnimationFrameRequestId should not have been null");
			}

			return;
		}

		this._stopTicking();
	}

	private _onVideoSeeking(): void {
		if (!this._enabled) {
			return;
		}

		if (this._videoState === VideoState.Playing) {
			this._videoState = VideoState.Paused;
			this._dispatchEvent(ClockEvent.Pause, []);
		}

		if (this._currentTime === this._video.currentTime) {
			return;
		}

		this._currentTime = this._video.currentTime;

		this._dispatchEvent(ClockEvent.Tick, []);
	}

	/**
	 * @param {number} timeStamp
	 */
	private _onTimerTick(timeStamp: number): void {
		if (!this._enabled) {
			return;
		}

		if (this._videoState === VideoState.Playing) {
			if (this._currentTime !== this._video.currentTime) {
				this._currentTime = this._video.currentTime;
				this._possiblePauseAnimationFrameTimeStamp = null;
				this._dispatchEvent(ClockEvent.Tick, []);
			}
			else {
				if (this._possiblePauseAnimationFrameTimeStamp === null) {
					this._possiblePauseAnimationFrameTimeStamp = timeStamp;
				}
				else if (timeStamp - this._possiblePauseAnimationFrameTimeStamp > 100) {
					this._possiblePauseAnimationFrameTimeStamp = null;
					this._videoState = VideoState.Paused;
					this._dispatchEvent(ClockEvent.Pause, []);
				}
			}
		}
		else {
			if (this._currentTime !== this._video.currentTime) {
				this._currentTime = this._video.currentTime;
				this._possiblePauseAnimationFrameTimeStamp = null;
				this._videoState = VideoState.Playing;
				this._dispatchEvent(ClockEvent.Play, []);
				this._dispatchEvent(ClockEvent.Tick, []);
			}
		}

		this._nextAnimationFrameRequestId = requestAnimationFrame(timeStamp => this._onTimerTick(timeStamp));
	}

	private _onVideoRateChange(): void {
		this._dispatchEvent(ClockEvent.RateChange, []);
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
	_eventListeners: map.Map<ClockEvent, Function[]> = new map.Map<ClockEvent, Function[]>();

	/**
	 * @type {function(number, !Function)}
	 */
	addEventListener: (type: ClockEvent, listener: Function) => void;

	/**
	 * @type {function(number, Array.<*>)}
	 */
	_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
}
mixin(VideoClock, [EventSource]);
