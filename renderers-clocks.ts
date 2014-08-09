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

///<reference path="libjass.ts" />

module libjass.renderers {
	/**
	 * A mixin class that represents an event source.
	 *
	 * @template T
	 */
	export class EventSource<T> {
		_eventListeners: Map<T, Function[]>;

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

	export enum ClockEvent {
		Play,
		Tick,
		Pause,
		Stop,
	}

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
		 * @type {boolean}
		 */
		playing: boolean;

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
		 * Enable or disable the renderer.
		 *
		 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
		 * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
		 */
		setEnabled(enabled: boolean): boolean;

		// EventSource members
		addEventListener: (type: ClockEvent, listener: Function) => void;
	}

	/**
	 * An implementation of libjass.renderers.Clock that allows user script to manually trigger play, pause and timeUpdate events.
	 */
	export class ManualClock implements Clock {
		private _currentTime: number = -1;

		/**
		 * Trigger a pause event.
		 */
		pause(): void {
			this._dispatchEvent(ClockEvent.Pause, []);
		}

		/**
		 * Trigger a timeUpdate event with the given current time.
		 *
		 * @param {number} currentTime
		 */
		timeUpdate(currentTime: number): void {
			this._currentTime = currentTime;
			this._dispatchEvent(ClockEvent.Tick, []);
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
			return true;
		}

		/**
		 * @type {boolean}
		 */
		get playing(): boolean {
			return false;
		}

		/**
		 * Enable the clock. This is a no-op for this type.
		 *
		 * @return {boolean} Always returns false.
		 */
		enable(): boolean { return false; }

		/**
		 * Disable the clock. This is a no-op for this type.
		 *
		 * @return {boolean} Always returns false.
		 */
		disable(): boolean { return false; }

		/**
		 * Toggle the clock. This is a no-op for this type.
		 */
		toggle(): void { }

		/**
		 * Enable or disable the renderer.
		 *
		 * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
		 * @return {boolean} Always returns false.
		 */
		setEnabled(enabled: boolean): boolean {
			return false;
		}

		// EventSource members
		_eventListeners: Map<ClockEvent, Function[]> = new Map<ClockEvent, Function[]>();
		addEventListener: (type: ClockEvent, listener: Function) => void;
		_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
	}
	mixin(ManualClock, [EventSource]);

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

		constructor(private _video: HTMLVideoElement) {
			this._video.addEventListener("playing", () => this._onVideoPlaying(), false);
			this._video.addEventListener("pause", () => this._onVideoPause(), false);
			this._video.addEventListener("seeking", () => this._onVideoSeeking(), false);
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
		 * @type {boolean}
		 */
		get playing(): boolean {
			return this._videoState === VideoState.Playing;
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
				if (libjass.debugMode) {
					console.warn("VideoClock.enable: Abnormal state detected. VideoClock._videoState should have been VideoState.Paused");
				}
			}

			this._enabled = true;

			if (this._nextAnimationFrameRequestId === null) {
				this._nextAnimationFrameRequestId = requestAnimationFrame(() => this._onTimerTick());
			}

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

			if (this._nextAnimationFrameRequestId !== null) {
				cancelAnimationFrame(this._nextAnimationFrameRequestId);
				this._nextAnimationFrameRequestId = null;
			}

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
		 * Enable or disable the renderer.
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

			if (this._nextAnimationFrameRequestId === null) {
				this._nextAnimationFrameRequestId = requestAnimationFrame(() => this._onTimerTick());
			}
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
				if (libjass.debugMode) {
					console.warn("VideoClock._onVideoPause: Abnormal state detected. VideoClock._nextAnimationFrameRequestId should not have been null");
				}

				return;
			}

			cancelAnimationFrame(this._nextAnimationFrameRequestId);
			this._nextAnimationFrameRequestId = null;

			if (libjass.verboseMode) {
				console.log("VideoClock._onVideoPause: Cancelled VideoClock._nextAnimationFrameRequestId");
			}
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

		private _onTimerTick(): void {
			if (!this._enabled) {
				return;
			}

			if (this._videoState === VideoState.Playing) {
				if (this._currentTime !== this._video.currentTime) {
					this._currentTime = this._video.currentTime;
					this._dispatchEvent(ClockEvent.Tick, []);
				}
				else {
					this._videoState = VideoState.Paused;
					this._dispatchEvent(ClockEvent.Pause, []);
				}
			}
			else {
				if (this._currentTime !== this._video.currentTime) {
					this._currentTime = this._video.currentTime;
					this._videoState = VideoState.Playing;
					this._dispatchEvent(ClockEvent.Play, []);
					this._dispatchEvent(ClockEvent.Tick, []);
				}
			}

			this._nextAnimationFrameRequestId = requestAnimationFrame(() => this._onTimerTick());
		}

		// EventSource members
		_eventListeners: Map<ClockEvent, Function[]> = new Map<ClockEvent, Function[]>();
		addEventListener: (type: ClockEvent, listener: Function) => void;
		_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
	}
	mixin(VideoClock, [EventSource]);
}
