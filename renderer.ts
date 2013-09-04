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

"use strict";

module libjass {
	export class DefaultRenderer {
		private _dialogues: Dialogue[];
		private _wrappers: HTMLDivElement[][] = [];

		private _currentTime: number;
		private _currentSubs: HTMLDivElement[] = [];

		// Iterable of subtitle div's that are also to be displayed
		private _newSubs: Iterable;

		private _videoIsFullScreen: boolean = false;

		private _eventListeners: Object = Object.create(null);

		constructor(private _video: HTMLVideoElement, private _subsWrapper: HTMLDivElement, private _ass: ASS, private _settings: RendererSettings) {
			RendererSettings.prototype.initializeUnsetProperties.call(_settings);

			// Sort the dialogues array by start time and then by their original position in the script (id)
			this._dialogues = this._ass.dialogues.slice(0);
			this._dialogues.sort((dialogue1: Dialogue, dialogue2: Dialogue) => {
				var result = dialogue1.start - dialogue2.start;

				if (result === 0) {
					result = dialogue1.id - dialogue2.id;
				}

				return result;
			});

			this._newSubs =
				this._dialogues.toIterable()
					.map((entry: Array) => entry[1])
					// Skip until dialogues which end at a time later than currentTime
					.skipWhile((dialogue: Dialogue) => dialogue.end < this._currentTime)
					// Take until dialogue which starts later than currentTime + settings.preRenderTime
					.takeWhile((dialogue: Dialogue) => dialogue.start <= (this._currentTime + this._settings.preRenderTime))
					.filter((dialogue: Dialogue) => {
						// Ignore dialogues which end at a time less than currentTime
						if (dialogue.end < this._currentTime) {
							return false;
						}

						// All these dialogues are visible at atleast one time in the range [currentTime, currentTime + settings.preRenderTime]

						// Ignore those dialogues which have already been displayed
						if (this._currentSubs.some((sub: HTMLDivElement) => parseInt(sub.getAttribute("data-dialogue-id")) === dialogue.id)) {
							return false;
						}

						// If the dialogue is to be displayed, keep it to be drawn...
						if (dialogue.start <= this._currentTime) {
							return true;
						}

						// ... otherwise pre-render it and forget it
						else {
							dialogue.preRender();
							return false;
						}
					})
					.map((dialogue: Dialogue) => {
						if (libjass.debugMode) {
							console.log(dialogue.toString());
						}

						// Display the dialogue and return the drawn subtitle div
						return this._wrappers[dialogue.layer][dialogue.alignment].appendChild(dialogue.draw(this._currentTime));
					});


			// Create layer wrapper div's and the alignment div's inside each layer div
			var layers = new Set();
			this._dialogues.forEach((dialogue: Dialogue) => {
				layers.add(dialogue.layer);
			});
			var layersArray: number[] = [];
			layers.forEach((layer: number) => { layersArray.push(layer); });
			layersArray.sort().forEach((layer: number) => {
				this._wrappers[layer] = new Array<HTMLDivElement>(9 + 1); // + 1 because alignments are 1-indexed (1 to 9)

				for (var alignment = 1; alignment <= 9; alignment++) {
					var wrapperDiv = document.createElement("div");
					wrapperDiv.className = "an" + alignment + " layer" + layer;
					this._subsWrapper.appendChild(wrapperDiv);
					this._wrappers[layer][alignment] = wrapperDiv;
				}
			});


			if (!this._settings.preLoadFonts) {
				setTimeout(() => { this._ready(); }, 0);
			}
			// Preload fonts
			else {
				var allFonts = new Set();

				this._ass.styles.forEach((style: Style) => {
					allFonts.add(style.fontName);
				});

				this._dialogues.forEach((dialogue: Dialogue) => {
					dialogue.parts.forEach((part: tags.Tag) => {
						if (part instanceof tags.FontName) {
							allFonts.add((<tags.FontName>part).value);
						}
					});
				});

				var urlsToPreload =
					Object.keys(this._settings.fontMap)
						.filter((name: string) => allFonts.has(name))
						.map((name: string) => <string>this._settings.fontMap[name]);

				var urlsLeftToPreload = urlsToPreload.length;

				if (libjass.debugMode) {
					console.log("Preloading fonts...");
				}

				urlsToPreload.forEach((url: string) => {
					var xhr = new XMLHttpRequest();

					xhr.open("GET", url, true);
					xhr.addEventListener("readystatechange", () => {
						if (xhr.readyState === XMLHttpRequest.DONE) {
							if (libjass.debugMode) {
								console.log("Preloaded " + url + ".");
							}

							--urlsLeftToPreload;

							if (libjass.debugMode) {
								console.log(urlsLeftToPreload + " fonts left to preload.");
							}

							if (urlsLeftToPreload === 0) {
								if (libjass.debugMode) {
									console.log("All fonts have been preloaded.");
								}

								this._ready();
							}
						}
					}, false);
					xhr.send(null);
					return xhr;
				});

				if (libjass.debugMode) {
					console.log(urlsLeftToPreload + " fonts left to preload.");
				}

				if (urlsLeftToPreload === 0) {
					if (libjass.debugMode) {
						console.log("All fonts have been preloaded.");
					}

					this._ready();
				}
			}

			this._eventListeners["ready"] = [];
			this._eventListeners["fullScreenChange"] = [];
		}

		public addEventListener(type: string, listener: Object): void {
			var listeners = <Array>this._eventListeners[type];
			if (listeners) {
				listeners.push(listener);
			}
		}

		public resizeVideo(width: number, height: number): void {
			this._currentSubs.forEach((sub: HTMLDivElement) => {
				sub.remove();
			});

			this._currentSubs = [];

			this._video.style.width = this._subsWrapper.style.width = width + "px";
			this._video.style.height = this._subsWrapper.style.height = height + "px";

			this._ass.scaleTo(width, height);

			this._video.dispatchEvent(new (<any>Event)("timeupdate"));
		}

		private _ready(): void {
			this._video.addEventListener("timeupdate", this._onVideoTimeUpdate.bind(this), false);
			this._video.addEventListener("seeking", this._onVideoSeeking.bind(this), false);
			this._video.addEventListener("pause", this._onVideoPause.bind(this), false);
			this._video.addEventListener("playing", this._onVideoPlaying.bind(this), false);

			document.addEventListener("webkitfullscreenchange", this._onFullScreenChange.bind(this), false);
			document.addEventListener("mozfullscreenchange", this._onFullScreenChange.bind(this), false);
			document.addEventListener("fullscreenchange", this._onFullScreenChange.bind(this), false);

			this._dispatchEvent("ready");
		}

		private _onVideoTimeUpdate(): void {
			this._currentTime = this._video.currentTime;

			this._currentSubs = this._currentSubs.filter((sub: HTMLDivElement) => {
				var subDialogue = this._ass.dialogues[parseInt(sub.getAttribute("data-dialogue-id"))];

				// If the sub should still be displayed at currentTime, keep it...
				if (subDialogue.start <= this._currentTime && this._currentTime < subDialogue.end) {
					return true;
				}

				// ... otherwise remove it from the DOM and from this array...
				else {
					sub.remove();
					return false;
				}
			}).concat(Iterator(this._newSubs).toArray()); // ... and add the new subs that are to be displayed.

			if (libjass.debugMode) {
				console.log("video.timeupdate: " + this._getVideoStateLogString());
			}
		}

		private _onVideoSeeking(): void {
			this._currentSubs.forEach((sub: HTMLDivElement) => {
				sub.remove();
			});

			this._currentSubs = [];

			if (libjass.debugMode) {
				console.log("video.seeking: " + this._getVideoStateLogString());
			}
		}

		private _onVideoPause(): void {
			this._subsWrapper.className = "paused";

			if (libjass.debugMode) {
				console.log("video.pause: " + this._getVideoStateLogString());
			}
		}

		private _onVideoPlaying(): void {
			this._subsWrapper.className = "";

			if (libjass.debugMode) {
				console.log("video.playing: " + this._getVideoStateLogString());
			}
		}

		private _onFullScreenChange() {
			var fullScreenElement = document.fullscreenElement;
			if (fullScreenElement === undefined) {
				fullScreenElement = document.mozFullScreenElement;
			}
			if (fullScreenElement === undefined) {
				fullScreenElement = document.msFullscreenElement;
			}
			if (fullScreenElement === undefined) {
				fullScreenElement = document.webkitFullscreenElement;
			}

			if (fullScreenElement === this._video) {
				this.resizeVideo(screen.width, screen.height);
				this._videoIsFullScreen = true;
			}
			else if (fullScreenElement === null && this._videoIsFullScreen) {
				this._videoIsFullScreen = false;

				this._dispatchEvent("fullScreenChange", this._videoIsFullScreen);
			}
		}

		private _getVideoStateLogString(): string {
			return "video.currentTime = " + this._video.currentTime + ", video.paused = " + this._video.paused + ", video.seeking = " + this._video.seeking;
		}

		private _dispatchEvent(type: string, ...args: Object[]): void {
			var listeners = <Array>this._eventListeners[type];
			if (listeners) {
				listeners.forEach((listener: Function) => {
					listener.apply(this, args);
				});
			}
		}
	}

	export class RendererSettings {
		public preLoadFonts: boolean;
		public fontMap: FontMap;

		/**
		 * Subtitles will be pre-rendered for this amount of time (seconds)
		 */
		public preRenderTime: number;

		public initializeUnsetProperties(): void {
			if (this.preLoadFonts === undefined) {
				this.preLoadFonts = false;
			}

			if (this.fontMap === undefined) {
				this.fontMap = null;
			}

			if (this.preRenderTime === undefined) {
				this.preRenderTime = 5;
			}
		}
	}

	export class FontMap {
		constructor(private _map: Object) { }

		public static fromStyleElement(styleElement: HTMLStyleElement): FontMap {
			var map: Object = Object.create(null);

			var styleSheet = <CSSStyleSheet>styleElement.sheet;
			var rules: CSSFontFaceRule[] = Array.prototype.filter.call(styleSheet.cssRules, (rule: CSSRule) => rule.type === CSSRule.FONT_FACE_RULE);
			rules.forEach((rule: CSSFontFaceRule) => {
				var src =
					rule.style.getPropertyValue("src") ||
					rule.cssText.split("\n")
						.map((line: string) => line.match(/\s*src: url\((.+)\);/))
						.filter((matches: string[]) => matches !== null)
						.map((matches: string[]) => FontMap._stripQuotes(matches[1]))[0];

				if (src) {
					var name = FontMap._stripQuotes(rule.style.getPropertyValue("font-family"));
					map[name] = src;
				}
			});

			return new FontMap(map);
		}

		private static _stripQuotes(str: string): string {
			return str.match(/^["']?(.*?)["']?/)[1];
		}
	}
}
