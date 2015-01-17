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
	 * A renderer implementation that doesn't output anything.
	 *
	 * @param {!libjass.ASS} ass
	 * @param {!libjass.renderers.Clock} clock
	 * @param {libjass.renderers.RendererSettings} settings
	 */
	export class NullRenderer {
		private static _lastRendererId = -1;

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
			if (libjass.verboseMode) {
				console.log("NullRenderer._onClockPlay");
			}
		}

		/**
		 * Runs when the clock's current time changed. This might be a result of either regular playback or seeking.
		 */
		protected _onClockTick(): void {
			var currentTime = this._clock.currentTime;

			if (libjass.verboseMode) {
				console.log(`NullRenderer._onClockTick: currentTime = ${ currentTime }`);
			}

			for (var i = 0; i < this._ass.dialogues.length; i++) {
				var dialogue = this._ass.dialogues[i];

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
		}

		/**
		 * Runs when the clock is paused.
		 */
		protected _onClockPause(): void {
			if (libjass.verboseMode) {
				console.log("NullRenderer._onClockPause");
			}
		}

		/**
		 * Runs when the clock is disabled.
		 */
		protected _onClockStop(): void {
			if (libjass.verboseMode) {
				console.log("NullRenderer._onClockStop");
			}
		}

		/**
		 * Runs when the clock changes its rate.
		 */
		protected _onClockRateChange(): void {
			if (libjass.verboseMode) {
				console.log("NullRenderer._onClockRateChange");
			}
		}
	}

	/**
	 * Settings for the renderer.
	 */
	export class RendererSettings {
		/**
		 * A map of font name to one or more URLs of that font. If provided, the fonts in this map are pre-loaded by the WebRenderer when it's created.
		 *
		 * If you have a <style> or <link> element on the page containing @font-face rules, you can use the {@link libjass.renderers.RendererSettings.makeFontMapFromStyleElement}
		 * convenience method to create a font map.
		 *
		 * @type {!Map.<string, !Array.<string>>}
		 */
		fontMap: Map<string, string[]>;

		/**
		 * Subtitles will be pre-rendered for this amount of time (seconds).
		 *
		 * Defaults to 5.
		 *
		 * @type {number}
		 */
		preRenderTime: number;

		/**
		 * Subtitle outlines will be rendered in full detail. When false, the value of blur is used to draw less outlines for better performance and (hopefully) similar output.
		 *
		 * Defaults to false.
		 *
		 * @type {boolean}
		 */
		preciseOutlines: boolean;

		/**
		 * Outlines and blur are implemented using SVG filters by default. When false, they will be rendered using alternative means.
		 *
		 * IE 11 and below do not support SVG filters on HTML elements so this should be set to false there. See http://caniuse.com/svg-html for details.
		 *
		 * Defaults to true.
		 *
		 * @type {boolean}
		 */
		enableSvg: boolean;

		/**
		 * A convenience method to create a font map from a <style> or <link> element that contains @font-face rules. There should be one @font-face rule for each font name, mapping to a font file URL.
		 *
		 * For example:
		 *
		 *     @font-face {
		 *         font-family: "Helvetica";
		 *         src: url("/fonts/helvetica.ttf");
		 *     }
		 *
		 * @param {!LinkStyle} linkStyle
		 * @return {!Map.<string, !Array.<string>>}
		 */
		static makeFontMapFromStyleElement(linkStyle: LinkStyle): Map<string, string[]> {
			var map = new Map<string, string[]>();

			var styleSheet = <CSSStyleSheet>linkStyle.sheet;
			var rules: CSSFontFaceRule[] = Array.prototype.filter.call(styleSheet.cssRules, (rule: CSSRule) => rule.type === CSSRule.FONT_FACE_RULE);
			rules.forEach((rule: CSSFontFaceRule) => {
				var src = rule.style.getPropertyValue("src");
				var urls: string[] = [];

				if (!src) {
					src = rule.cssText.split("\n")
						.map((line: string) => line.match(/src: ([^;]+);/))
						.filter((matches: string[]) => matches !== null)
						.map((matches: string[]) => matches[1])[0];
				}

				urls = src.split(/,\s*/).map((url: string) => url.match(/^url\((.+)\)$/)[1]);

				if (urls.length > 0) {
					var name = RendererSettings._stripQuotes(rule.style.getPropertyValue("font-family"));
					var existingList = map.get(name);
					if (existingList === undefined) {
						existingList = [];
						map.set(name, existingList);
					}
					existingList.unshift.apply(existingList, urls.map(RendererSettings._stripQuotes));
				}
			});

			return map;
		}

		/**
		 * Converts an arbitrary object into a {@link libjass.renderers.RendererSettings} object.
		 *
		 * @param {*} object
		 * @return {!libjass.renderers.RendererSettings}
		 */
		static from(object?: any): RendererSettings {
			if (object === undefined || object === null) {
				object = {};
			}

			return RendererSettings._from(object.fontMap, object.preRenderTime, object.preciseOutlines, object.enableSvg);
		}

		/**
		 * @param {Map.<string, !Array.<string>>=null} fontMap
		 * @param {number=5} preRenderTime
		 * @param {boolean=false} preciseOutlines
		 * @param {boolean=true} enableSvg
		 * @return {!libjass.renderers.RendererSettings}
		 */
		private static _from(fontMap: Map<string, string[]> = null, preRenderTime: number = 5, preciseOutlines: boolean = false, enableSvg: boolean = true): RendererSettings {
			var result = new RendererSettings();
			result.fontMap = fontMap;
			result.preRenderTime = preRenderTime;
			result.preciseOutlines = preciseOutlines;
			result.enableSvg = enableSvg;
			return result;
		}

		/**
		 * @param {string} str
		 * @return {string}
		 */
		private static _stripQuotes(str: string): string {
			return str.match(/^["']?(.*?)["']?$/)[1];
		}
	}
}
