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

import { Map } from "../../utility/map";

/**
 * A mixin class that represents an event source.
 */
export class EventSource<T> {
	/**
	 * A map from event type to an array of all the listeners registered for that event type.
	 *
	 * @type {!Map.<T, !Array.<Function>>}
	 */
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
	 * Calls all listeners registered for the given event type.
	 *
	 * @param {!T} type The type of event to dispatch
	 * @param {!Array.<*>} args Arguments for the listeners of the event
	 */
	_dispatchEvent(type: T, args: Object[]): void {
		var listeners = this._eventListeners.get(type);
		if (listeners !== undefined) {
			for (let listener of listeners) {
				listener.apply(this, args);
			}
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
