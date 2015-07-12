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

import { mixin } from "../../utility/mixin";
import { Map } from "../../utility/map";

import { Clock, ClockEvent, EventSource } from "./base";

/**
 * An implementation of {@link libjass.renderers.Clock} that allows user script to manually trigger {@link libjass.renderers.ClockEvent}s.
 */
export class ManualClock implements Clock, EventSource<ClockEvent> {
	private _currentTime: number = -1;
	private _rate: number = 1;

	private _enabled: boolean = true;
	private _paused: boolean = true;

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Play}
	 */
	play(): void {
		if (!this._enabled) {
			return;
		}

		if (!this._paused) {
			return;
		}

		this._paused = false;

		this._dispatchEvent(ClockEvent.Play, []);
	}

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Tick} with the given time.
	 *
	 * @param {number} currentTime
	 */
	tick(currentTime: number): void {
		if (!this._enabled) {
			return;
		}

		if (this._currentTime === currentTime) {
			return;
		}

		this.play();

		this._currentTime = currentTime;
		this._dispatchEvent(ClockEvent.Tick, []);
	}

	/**
	 * Seek to the given time. Unlike {@link libjass.renderers.ManualClock.tick} this is used to represent a discontinuous jump, such as the user seeking
	 * via the video element's position bar.
	 *
	 * @param {number} time
	 */
	seek(time: number): void {
		if (!this._enabled) {
			return;
		}

		this.pause();

		if (this._currentTime === time) {
			return;
		}

		this.stop();

		this.tick(time);

		this.pause();
	}

	/**
	 * Trigger a {@link libjass.renderers.ClockEvent.Pause}
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
	 * @type {boolean}
	 */
	get paused(): boolean {
		return this._paused;
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
	 * @param {number} rate The new rate of the clock.
	 */
	setRate(rate: number): void {
		if (this._rate === rate) {
			return;
		}

		this._rate = rate;

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

		this.pause();

		this.stop();

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
mixin(ManualClock, [EventSource]);
