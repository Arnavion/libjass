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

import { debugMode, verboseMode } from "../settings";

import { ASS } from "../types/ass";
import { Dialogue } from "../types/dialogue";

import { Clock, ClockEvent } from "./clocks/base";

import { RendererSettings } from "./settings";

/**
 * A renderer implementation that doesn't output anything.
 *
 * @param {!libjass.ASS} ass
 * @param {!libjass.renderers.Clock} clock
 * @param {libjass.renderers.RendererSettings} settings
 */
export class NullRenderer {
	private static _lastRendererId: number = -1;

	private _id: number;

	private _settings: RendererSettings;

	constructor(private _ass: ASS, private _clock: Clock, settings?: RendererSettings) {
		this._id = ++NullRenderer._lastRendererId;

		this._settings = RendererSettings.from(settings);

		this._clock.addEventListener(ClockEvent.Play, () => this._onClockPlay());
		this._clock.addEventListener(ClockEvent.Tick, () => this._onClockTick());
		this._clock.addEventListener(ClockEvent.Pause, () => this._onClockPause());
		this._clock.addEventListener(ClockEvent.Stop, () => this._onClockStop());
		this._clock.addEventListener(ClockEvent.RateChange, () => this._onClockRateChange());
	}

	/**
	 * The unique ID of this renderer. Auto-generated.
	 *
	 * @type {number}
	 */
	get id(): number {
		return this._id;
	}

	/**
	 * @type {!libjass.ASS}
	 */
	get ass(): ASS {
		return this._ass;
	}

	/**
	 * @type {!libjass.renderers.Clock}
	 */
	get clock(): Clock {
		return this._clock;
	}

	/**
	 * @type {!libjass.renderers.RendererSettings}
	 */
	get settings(): RendererSettings {
		return this._settings;
	}

	/**
	 * Pre-render a dialogue. This is a no-op for this type.
	 *
	 * @param {!libjass.Dialogue} dialogue
	 */
	preRender(dialogue: Dialogue): void { }

	/**
	 * Draw a dialogue. This is a no-op for this type.
	 *
	 * @param {!libjass.Dialogue} dialogue
	 */
	draw(dialogue: Dialogue): void { }

	/**
	 * Enable the renderer.
	 *
	 * @return {boolean} True if the renderer is now enabled, false if it was already enabled.
	 */
	enable(): boolean {
		return this._clock.enable();
	}

	/**
	 * Disable the renderer.
	 *
	 * @return {boolean} True if the renderer is now disabled, false if it was already disabled.
	 */
	disable(): boolean {
		return this._clock.disable();
	}

	/**
	 * Toggle the renderer.
	 */
	toggle(): void {
		this._clock.toggle();
	}

	/**
	 * Enable or disable the renderer.
	 *
	 * @param {boolean} enabled If true, the renderer is enabled, otherwise it's disabled.
	 * @return {boolean} True if the renderer is now in the given state, false if it was already in that state.
	 */
	setEnabled(enabled: boolean): boolean {
		return this._clock.setEnabled(enabled);
	}

	/**
	 * @type {boolean}
	 */
	get enabled(): boolean {
		return this._clock.enabled;
	}

	/**
	 * Runs when the clock is enabled, or starts playing, or is resumed from pause.
	 */
	protected _onClockPlay(): void {
		if (verboseMode) {
			console.log("NullRenderer._onClockPlay");
		}
	}

	/**
	 * Runs when the clock's current time changed. This might be a result of either regular playback or seeking.
	 */
	protected _onClockTick(): void {
		const currentTime = this._clock.currentTime;

		if (verboseMode) {
			console.log(`NullRenderer._onClockTick: currentTime = ${ currentTime }`);
		}

		for (const dialogue of this._ass.dialogues) {
			try {
				if (dialogue.end > currentTime) {
					if (dialogue.start <= currentTime) {
						// This dialogue is visible right now. Draw it.
						this.draw(dialogue);
					}
					else if (dialogue.start <= (currentTime + this._settings.preRenderTime)) {
						// This dialogue will be visible soon. Pre-render it.
						this.preRender(dialogue);
					}
				}
			}
			catch (ex) {
				if (debugMode) {
					console.error(`Rendering dialogue ${ dialogue.id } failed.`, ex);
				}
			}
		}
	}

	/**
	 * Runs when the clock is paused.
	 */
	protected _onClockPause(): void {
		if (verboseMode) {
			console.log("NullRenderer._onClockPause");
		}
	}

	/**
	 * Runs when the clock is disabled.
	 */
	protected _onClockStop(): void {
		if (verboseMode) {
			console.log("NullRenderer._onClockStop");
		}
	}

	/**
	 * Runs when the clock changes its rate.
	 */
	protected _onClockRateChange(): void {
		if (verboseMode) {
			console.log("NullRenderer._onClockRateChange");
		}
	}
}
