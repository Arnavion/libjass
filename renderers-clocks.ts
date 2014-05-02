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
		Pause,
		TimeUpdate,
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
		 * Enable the clock.
		 */
		enable(): void;

		/**
		 * Disable the clock.
		 */
		disable(): void;

		/**
		 * Toggle the clock.
		 */
		toggle(): void;

		// EventSource members
		addEventListener: (type: ClockEvent, listener: Function) => void;
		_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
	}

	/**
	 * An implementation of libjass.renderers.Clock that allows user script to manually trigger play, pause and timeUpdate events.
	 */
	export class ManualClock implements Clock {
		private _currentTime: number = -1;

		/**
		 * Trigger a play event.
		 */
		play(): void {
			this._dispatchEvent(ClockEvent.Play, []);
		}

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
			this._dispatchEvent(ClockEvent.TimeUpdate, []);
		}

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
		 * Enable the clock. This is a no-op for this type.
		 */
		enable(): void { }

		/**
		 * Disable the clock. This is a no-op for this type.
		 */
		disable(): void { }

		/**
		 * Toggle the clock. This is a no-op for this type.
		 */
		toggle(): void { }

		// EventSource members
		_eventListeners: Map<ClockEvent, Function[]> = new Map<ClockEvent, Function[]>();
		addEventListener: (type: ClockEvent, listener: Function) => void;
		_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
	}
	mixin(ManualClock, [EventSource]);

	enum VideoClockState {
		Playing = 0,
		Paused = 1,
	}

	/**
	 * An implementation of libjass.renderers.Clock that generates play, pause and timeUpdate events according to the state of a <video> element.
	 *
	 * @param {!HTMLVideoElement} video
	 */
	export class VideoClock implements Clock {
		private _currentTime: number;

		private _state: VideoClockState;

		private _enabled: boolean = true;

		private _nextAnimationFrameRequestId: number = null;

		constructor(private _video: HTMLVideoElement) {
			this._video.addEventListener("playing", () => this._onVideoPlaying(), false);
			this._video.addEventListener("pause", () => this._onVideoPause(), false);
			this._video.addEventListener("seeking", () => this._onVideoSeeking(), false);
		}

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
		 * Enable the clock.
		 */
		enable(): void {
			if (this._enabled) {
				return;
			}

			this._enabled = true;

			this._onVideoPlaying();
		}

		/**
		 * Disable the clock.
		 */
		disable(): void {
			if (!this._enabled) {
				return;
			}

			this._onVideoPause();

			this._enabled = false;
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

		private _onVideoPlaying(): void {
			if (!this._enabled) {
				return;
			}

			if (this._state === VideoClockState.Playing) {
				return;
			}

			this._state = VideoClockState.Playing;

			this._dispatchEvent(ClockEvent.Play, []);

			if (this._nextAnimationFrameRequestId === null) {
				this._timerTick();
			}
		}

		private _onVideoPause(): void {
			if (!this._enabled) {
				return;
			}

			this._state = VideoClockState.Paused;

			this._dispatchEvent(ClockEvent.Pause, []);

			if (this._nextAnimationFrameRequestId === null) {
				if (libjass.debugMode) {
					console.warn("VideoClock._onVideoPause: Abnormal state detected. VideoClock._nextAnimationFrameRequestId should not have been null");
				}
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

			if (this._currentTime === this._video.currentTime) {
				return;
			}

			if (this._state !== VideoClockState.Paused) {
				return;
			}

			this._currentTime = this._video.currentTime;

			this._dispatchEvent(ClockEvent.Play, []);
			this._dispatchEvent(ClockEvent.TimeUpdate, []);
			this._dispatchEvent(ClockEvent.Pause, []);
		}

		private _timerTick(): void {
			if (this._currentTime !== this._video.currentTime) {
				this._currentTime = this._video.currentTime;

				if (this._state !== VideoClockState.Playing) {
					this._state = VideoClockState.Playing;

					this._dispatchEvent(ClockEvent.Play, []);
				}

				this._dispatchEvent(ClockEvent.TimeUpdate, []);
			}
			else {
				if (this._state !== VideoClockState.Paused) {
					this._state = VideoClockState.Paused;

					this._dispatchEvent(ClockEvent.Pause, []);
				}
			}

			this._nextAnimationFrameRequestId = requestAnimationFrame(() => this._timerTick());
		}

		// EventSource members
		_eventListeners: Map<ClockEvent, Function[]> = new Map<ClockEvent, Function[]>();
		addEventListener: (type: ClockEvent, listener: Function) => void;
		_dispatchEvent: (type: ClockEvent, args: Object[]) => void;
	}
	mixin(VideoClock, [EventSource]);
}
