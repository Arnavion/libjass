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
	 * @constructor
	 *
	 * @param {!HTMLVideoElement} video
	 * @param {!libjass.ASS} ass
	 * @param {!libjass.RendererSettings} settings
	 *
	 * @memberof libjass.renderers
	 */
	export class NullRenderer {
		private static _highResolutionTimerInterval: number = 41;

		private _dialogues: Dialogue[];

		private _state: VideoState;
		private _currentTime: number;

		private _currentDialogues: Dialogue[] = [];

		private _timeUpdateIntervalHandle: number = null;

		constructor(private _video: HTMLVideoElement, private _ass: ASS, private _settings: RendererSettings) {
			RendererSettings.prototype.initializeUnsetProperties.call(this._settings);

			// Sort the dialogues array by start time and then by their original position in the script (id)
			this._dialogues = this._ass.dialogues.slice(0);
			this._dialogues.sort((dialogue1: Dialogue, dialogue2: Dialogue) => {
				var result = dialogue1.start - dialogue2.start;

				if (result === 0) {
					result = dialogue1.id - dialogue2.id;
				}

				return result;
			});

			this._video.addEventListener("timeupdate", this._onVideoTimeUpdate.bind(this), false);
			this._video.addEventListener("seeking", this._onVideoSeeking.bind(this), false);
			this._video.addEventListener("pause", this._onVideoPause.bind(this), false);
			this._video.addEventListener("playing", this._onVideoPlaying.bind(this), false);
		}

		get video(): HTMLVideoElement {
			return this._video;
		}

		get ass(): ASS {
			return this._ass;
		}

		get settings(): RendererSettings {
			return this._settings;
		}

		get dialogues(): Dialogue[] {
			return this._dialogues;
		}

		get currentTime(): number {
			return this._currentTime;
		}

		public onVideoTimeUpdate(): void {
			this._currentTime = this._video.currentTime;

			if (libjass.debugMode) {
				console.log("video.timeupdate: " + this._getVideoStateLogString());
			}

			var newDialogues: Dialogue[] = [];

			var i = 0;

			for (; i < this._dialogues.length; i++) {
				if (this._dialogues[i].end >= this._currentTime) {
					break;
				}
			}

			for (; i < this._dialogues.length; i++) {
				var dialogue = this._dialogues[i];

				if (dialogue.start > (this._currentTime + this._settings.preRenderTime)) {
					break;
				}

				// Ignore dialogues which end at a time less than currentTime, and those which have already been displayed
				if (dialogue.end >= this._currentTime && this._currentDialogues.indexOf(dialogue) === -1) {
					// This dialogue is visible at atleast one time in the range [currentTime, currentTime + settings.preRenderTime]

					// If the dialogue is to be displayed later, pre-render it...
					if (dialogue.start > this._currentTime) {
						this.preRender(dialogue);
					}

					// ... otherwise draw it
					else {
						if (libjass.debugMode) {
							console.log(dialogue.toString());
						}

						this.draw(dialogue);

						newDialogues.push(dialogue);
					}
				}
			}

			this._currentDialogues = this._currentDialogues.filter((dialogue: Dialogue) => {
				// If the dialogue should still be displayed at currentTime, keep it
				if (dialogue.start <= this._currentTime && this._currentTime < dialogue.end) {
					return true;
				}
				else {
					this.removeDialogue(dialogue);

					return false;
				}
			}).concat(newDialogues); // ... and add the new dialogues that are to be displayed.
		}

		public onVideoSeeking(): void {
			if (libjass.debugMode) {
				console.log("video.seeking: " + this._getVideoStateLogString());
			}

			this._currentDialogues = [];
		}

		public onVideoPause(): void {
			if (libjass.debugMode) {
				console.log("video.pause: " + this._getVideoStateLogString());
			}

			if (this._timeUpdateIntervalHandle !== null) {
				clearInterval(this._timeUpdateIntervalHandle);
				this._timeUpdateIntervalHandle = null;
			}
		}

		public onVideoPlaying(): void {
			if (libjass.debugMode) {
				console.log("video.playing: " + this._getVideoStateLogString());
			}

			if (this._settings.useHighResolutionTimer && this._timeUpdateIntervalHandle === null) {
				this._timeUpdateIntervalHandle = setInterval(() => this._onVideoTimeChange(), NullRenderer._highResolutionTimerInterval);
			}
		}

		public preRender(dialogue: Dialogue): void {
		}

		public draw(dialogue: Dialogue): void {
		}

		public removeDialogue(dialogue: Dialogue): void {
		}

		public removeAllDialogues(): void {
			this._currentDialogues = [];
		}

		private _onVideoTimeUpdate(): void {
			if (this._state === VideoState.Seeking) {
				if (this._currentTime !== this._video.currentTime) {
					this._onVideoPlaying();
				}
			}
			else if (this._state === VideoState.Playing && !this._settings.useHighResolutionTimer) {
				this._onVideoTimeChange();
			}
		}

		private _onVideoTimeChange(): void {
			if (this._currentTime !== this._video.currentTime) {
				if (this._state !== VideoState.Playing) {
					this._onVideoPlaying();
				}

				this.onVideoTimeUpdate();
			}
		}

		private _onVideoSeeking(): void {
			if (this._state !== VideoState.Seeking) {
				this._onVideoPause();

				this._state = VideoState.Seeking;
			}

			if (this._currentTime !== this._video.currentTime) {
				this._currentTime = this._video.currentTime;

				this.onVideoSeeking();
			}
		}

		private _onVideoPause(): void {
			this._state = VideoState.Paused;

			this.onVideoPause();
		}

		private _onVideoPlaying(): void {
			this._state = VideoState.Playing;

			this.onVideoPlaying();
		}

		private _getVideoStateLogString(): string {
			return "video.currentTime = " + this._video.currentTime + ", video.paused = " + this._video.paused + ", video.seeking = " + this._video.seeking;
		}
	}

	enum VideoState {
		Playing = 0,
		Paused = 1,
		Seeking = 2,
	}

	/**
	 * A default renderer implementation.
	 *
	 * @constructor
	 * @extends {libjass.renderers.NullRenderer}
	 *
	 * @param {!HTMLVideoElement} video
	 * @param {!libjass.ASS} ass
	 * @param {!libjass.RendererSettings} settings
	 *
	 * @memberof libjass.renderers
	 */
	export class DefaultRenderer extends NullRenderer {
		private static _animationStyleElement: HTMLStyleElement = null;

		private _wrapper: HTMLDivElement;
		private _subsWrapper: HTMLDivElement;
		private _wrappers: HTMLDivElement[][] = [];

		private _preRenderedSubs: PreRenderedSubsMap = Object.create(null);

		private _videoIsFullScreen: boolean = false;

		private _eventListeners: EventListenersMap = Object.create(null);

		constructor(video: HTMLVideoElement, ass: ASS, settings: RendererSettings) {
			super(video, ass, settings);

			this._wrapper = document.createElement("div");
			video.parentElement.replaceChild(this._wrapper, video);

			this._wrapper.className = "libjass-wrapper";
			this._wrapper.appendChild(video);

			this._subsWrapper = document.createElement("div");
			this._wrapper.appendChild(this._subsWrapper);
			this._subsWrapper.id = "libjass-subs";

			// Create layer wrapper div's and the alignment div's inside each layer div
			var layers = new Set<number>();
			this.dialogues.forEach((dialogue: Dialogue) => {
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


			if (!this.settings.preLoadFonts) {
				setTimeout(() => { this._ready(); }, 0);
			}
			// Preload fonts
			else {
				var allFonts = new Set<string>();

				Object.keys(this.ass.styles).map((name: string) => this.ass.styles[name]).forEach((style: Style) => {
					allFonts.add(style.fontName);
				});

				this.dialogues.forEach((dialogue: Dialogue) => {
					dialogue.parts.forEach((part: tags.Tag) => {
						if (part instanceof tags.FontName) {
							allFonts.add((<tags.FontName>part).value);
						}
					});
				});

				var urlsToPreload: string[] = [];
				this.settings.fontMap.forEach((src: string[], name: string) => {
					if (allFonts.has(name)) {
						urlsToPreload.unshift.apply(urlsToPreload, src);
					}
				});

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
					setTimeout(() => {
						if (libjass.debugMode) {
							console.log("All fonts have been preloaded.");
						}

						this._ready();
					}, 0);
				}
			}

			this._eventListeners["ready"] = [];
			this._eventListeners["fullScreenChange"] = [];
		}

		/**
		 * Add a listener for the given event.
		 *
		 * The "ready" event is fired when fonts have been preloaded if settings.preLoadFonts is true, or in the next tick after the DefaultRenderer object is constructed otherwise.
		 *
		 * The "fullScreenChange" event is fired when the browser's fullscreenchange event is fired for the video element.
		 *
		 * @param {string} type The type of event to attach the listener for. One of "ready" and "fullScreenChange".
		 * @param {!Function} listener The listener
		 */
		public addEventListener(type: string, listener: Function): void {
			var listeners = <Function[]>this._eventListeners[type];
			if (listeners) {
				listeners.push(listener);
			}
		}

		/**
		 * Resize the video element and subtitles to the new dimensions.
		 *
		 * @param {number} width
		 * @param {number} height
		 */
		public resizeVideo(width: number, height: number): void {
			this.removeAllDialogues();

			this.video.style.width = width.toFixed(3) + "px";
			this.video.style.height = height.toFixed(3) + "px";

			var ratio = Math.min(width / this.ass.resolutionX, height / this.ass.resolutionY);
			var subsWrapperWidth = this.ass.resolutionX * ratio;
			var subsWrapperHeight = this.ass.resolutionY * ratio;
			this._subsWrapper.style.width = subsWrapperWidth.toFixed(3) + "px";
			this._subsWrapper.style.height = subsWrapperHeight.toFixed(3) + "px";
			this._subsWrapper.style.left = ((width - subsWrapperWidth) / 2).toFixed(3) + "px";
			this._subsWrapper.style.top = ((height - subsWrapperHeight) / 2).toFixed(3) + "px";

			this.ass.scaleTo(subsWrapperWidth, subsWrapperHeight);

			// Any dialogues which have been pre-rendered will need to be pre-rendered again.
			Object.keys(this._preRenderedSubs).forEach(key => {
				delete this._preRenderedSubs[key];
			});

			this.onVideoTimeUpdate();
		}

		private _ready(): void {
			document.addEventListener("webkitfullscreenchange", this._onFullScreenChange.bind(this), false);
			document.addEventListener("mozfullscreenchange", this._onFullScreenChange.bind(this), false);
			document.addEventListener("fullscreenchange", this._onFullScreenChange.bind(this), false);

			this.resizeVideo(parseInt(this.video.style.width), parseInt(this.video.style.height));

			this._dispatchEvent("ready");
		}

		public onVideoSeeking(): void {
			super.onVideoSeeking();

			this.removeAllDialogues();
		}

		public onVideoPause(): void {
			super.onVideoPause();

			DefaultRenderer._addClass(this._subsWrapper, "paused");
		}

		public onVideoPlaying(): void {
			super.onVideoPlaying();

			DefaultRenderer._removeClass(this._subsWrapper, "paused");
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

			if (fullScreenElement === this.video) {
				DefaultRenderer._addClass(document.body, "libjass-full-screen");

				this.resizeVideo(screen.width, screen.height);

				this._videoIsFullScreen = true;

				this._dispatchEvent("fullScreenChange", this._videoIsFullScreen);
			}
			else if (fullScreenElement === null && this._videoIsFullScreen) {
				DefaultRenderer._removeClass(document.body, "libjass-full-screen");

				this._videoIsFullScreen = false;

				this._dispatchEvent("fullScreenChange", this._videoIsFullScreen);
			}
		}

		/**
		 * @param {string} type
		 * @param {...*} args
		 *
		 * @private
		 */
		private _dispatchEvent(type: string, ...args: Object[]): void {
			var listeners = <Function[]>this._eventListeners[type];
			if (listeners) {
				listeners.forEach((listener: Function) => {
					listener.apply(this, args);
				});
			}
		}

		/**
		 * The magic happens here. The subtitle div is rendered and stored. Call draw() to get a clone of the div to display.
		 */
		public preRender(dialogue: Dialogue): void {
			if (this._preRenderedSubs[dialogue.id] !== undefined) {
				return;
			}

			var sub = document.createElement("div");

			var scaleX = this.ass.scaleX;
			var scaleY = this.ass.scaleY;
			var dpi = this.ass.dpi;

			sub.style.marginLeft = (scaleX * dialogue.style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * dialogue.style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleY * dialogue.style.marginVertical) + "px";

			var animationCollection = new AnimationCollection(dialogue.id);

			var divTransformStyle = "";

			var currentSpan: HTMLSpanElement = null;
			var currentSpanStyles = new SpanStyles(dialogue.style, dialogue.transformOrigin, scaleX, scaleY, dpi);

			var startNewSpan = (): void => {
				if (currentSpan !== null) {
					currentSpanStyles.setStylesOnSpan(currentSpan);
					sub.appendChild(currentSpan);
				}

				currentSpan = document.createElement("span");
			};
			startNewSpan();

			dialogue.parts.forEach(part => {
				if (part instanceof tags.Italic) {
					currentSpanStyles.italic = (<tags.Italic>part).value;
				}

				else if (part instanceof tags.Bold) {
					currentSpanStyles.bold = (<tags.Bold>part).value;
				}

				else if (part instanceof tags.Underline) {
					currentSpanStyles.underline = (<tags.Underline>part).value;
				}

				else if (part instanceof tags.StrikeThrough) {
					currentSpanStyles.strikeThrough = (<tags.StrikeThrough>part).value;
				}

				else if (part instanceof tags.Border) {
					currentSpanStyles.outlineWidthX = (<tags.Border>part).value;
					currentSpanStyles.outlineWidthY = (<tags.Border>part).value;
				}

				else if (part instanceof tags.BorderX) {
					currentSpanStyles.outlineWidthX = (<tags.BorderX>part).value;
				}

				else if (part instanceof tags.BorderY) {
					currentSpanStyles.outlineWidthY = (<tags.BorderY>part).value;
				}

				else if (part instanceof tags.GaussianBlur) {
					currentSpanStyles.blur = (<tags.GaussianBlur>part).value;
				}

				else if (part instanceof tags.FontName) {
					currentSpanStyles.fontName = (<tags.FontName>part).value;
				}

				else if (part instanceof tags.FontSize) {
					currentSpanStyles.fontSize = (<tags.FontSize>part).value;
				}

				else if (part instanceof tags.FontScaleX) {
					currentSpanStyles.fontScaleX = (<tags.FontScaleX>part).value;
				}

				else if (part instanceof tags.FontScaleY) {
					currentSpanStyles.fontScaleY = (<tags.FontScaleY>part).value;
				}

				else if (part instanceof tags.LetterSpacing) {
					currentSpanStyles.letterSpacing = (<tags.LetterSpacing>part).value;
				}

				else if (part instanceof tags.RotateX) {
					divTransformStyle += " rotateX(" + (<tags.RotateX>part).value + "deg)";
				}

				else if (part instanceof tags.RotateY) {
					divTransformStyle += " rotateY(" + (<tags.RotateY>part).value + "deg)";
				}

				else if (part instanceof tags.RotateZ) {
					divTransformStyle += " rotateZ(" + (-1 * (<tags.RotateZ>part).value) + "deg)";
				}

				else if (part instanceof tags.SkewX) {
					divTransformStyle += " skewX(" + (45 * (<tags.SkewX>part).value) + "deg)";
				}

				else if (part instanceof tags.SkewY) {
					divTransformStyle += " skewY(" + (45 * (<tags.SkewY>part).value) + "deg)";
				}

				else if (part instanceof tags.PrimaryColor) {
					currentSpanStyles.primaryColor = (<tags.PrimaryColor>part).value;
				}

				else if (part instanceof tags.OutlineColor) {
					currentSpanStyles.outlineColor = (<tags.OutlineColor>part).value;
				}

				else if (part instanceof tags.Alpha) {
					currentSpanStyles.primaryAlpha = (<tags.Alpha>part).value;
					currentSpanStyles.outlineAlpha = (<tags.Alpha>part).value;
				}

				else if (part instanceof tags.PrimaryAlpha) {
					currentSpanStyles.primaryAlpha = (<tags.PrimaryAlpha>part).value;
				}

				else if (part instanceof tags.OutlineAlpha) {
					currentSpanStyles.outlineAlpha = (<tags.OutlineAlpha>part).value;
				}

				else if (part instanceof tags.Alignment) {
					// Already handled in Dialogue constructor
				}

				else if (part instanceof tags.Reset) {
					var newStyleName = (<tags.Reset>part).value;
					var newStyle: Style = null;
					if (newStyleName !== null) {
						newStyle = this.ass.styles[newStyleName];
					}
					currentSpanStyles.reset(newStyle);
				}

				else if (part instanceof tags.Position) {
					var positionPart = <tags.Position>part;

					sub.style.position = "absolute";
					sub.style.left = (scaleX * positionPart.x) + "px";
					sub.style.top = (scaleY * positionPart.y) + "px";
				}

				else if (part instanceof tags.Move) {
					var movePart = <tags.Move>part;

					sub.style.position = "absolute";
					animationCollection.add(movePart.t1, movePart.t2, {
						left: (scaleX * movePart.x1) + "px",
						top: (scaleY * movePart.y1) +"px"
					}, {
						left: (scaleX * movePart.x2).toFixed(3) +"px",
						top: (scaleY * movePart.y2).toFixed(3) +"px"
					});
				}

				else if (part instanceof tags.Fade) {
					var fadePart = <tags.Fade>part;
					if (fadePart.start !== 0) {
						animationCollection.add(0, fadePart.start, {
							opacity: "0"
						}, {
							opacity: "1"
						});
					}
					if (fadePart.end !== 0) {
						animationCollection.add((dialogue.end - dialogue.start) - fadePart.end, dialogue.end - dialogue.start, {
							opacity: "1"
						}, {
							opacity: "0"
						});
					}
				}

				else if (part instanceof tags.NewLine) {
					sub.appendChild(document.createElement("br"));
				}

				else if (part instanceof tags.HardSpace) {
					currentSpan.appendChild(document.createTextNode("\u00A0"));
					startNewSpan();
				}

				else if (part instanceof tags.Text || (libjass.debugMode && part instanceof tags.Comment)) {
					currentSpan.appendChild(document.createTextNode((<tags.Text>part).value));
					startNewSpan();
				}
			});

			dialogue.parts.some(part => {
				if (part instanceof tags.Position || part instanceof tags.Move) {
					var translateX = -dialogue.transformOriginX;
					var translateY = -dialogue.transformOriginY;

					divTransformStyle =
						"translate(" + translateX + "%, " + translateY + "%) translate(-" + sub.style.marginLeft + ", -" + sub.style.marginTop + ") " +
						divTransformStyle;

					return true;
				}

				return false;
			});

			if (divTransformStyle !== "") {
				sub.style.webkitTransform = divTransformStyle;
				sub.style.webkitTransformOrigin = dialogue.transformOrigin;

				sub.style.transform = divTransformStyle;
				sub.style.transformOrigin = dialogue.transformOrigin;
			}

			if (DefaultRenderer._animationStyleElement === null) {
				var existingStyleElement = <HTMLStyleElement>document.querySelector("#libjass-animation-styles");
				if (existingStyleElement === null) {
					existingStyleElement = document.createElement("style");
					existingStyleElement.id = "libjass-animation-styles";
					existingStyleElement.type = "text/css";
					document.querySelector("head").appendChild(existingStyleElement);
				}

				DefaultRenderer._animationStyleElement = existingStyleElement;
			}

			DefaultRenderer._animationStyleElement.appendChild(document.createTextNode(animationCollection.cssText));

			sub.style.webkitAnimation = animationCollection.animationStyle;
			sub.style.animation = animationCollection.animationStyle;

			sub.setAttribute("data-dialogue-id", String(dialogue.id));

			this._preRenderedSubs[String(dialogue.id)] = sub;
		}

		/**
		 * Returns the subtitle div for display. The currentTime is used to shift the animations appropriately, so that at the time the
		 * div is inserted into the DOM and the animations begin, they are in sync with the video time.
		 *
		 * @param {!libjass.Dialogue} dialogue
		 */
		public draw(dialogue: Dialogue): void {
			var preRenderedSub = this._preRenderedSubs[String(dialogue.id)];

			if (preRenderedSub === undefined) {
				if (libjass.debugMode) {
					console.warn("This dialogue was not pre-rendered. Call preRender() before calling draw() so that draw() is faster.");
				}

				this.preRender(dialogue);
				preRenderedSub = this._preRenderedSubs[String(dialogue.id)];
			}

			var result = <HTMLDivElement>preRenderedSub.cloneNode(true);

			var defaultAnimationDelay = result.style.webkitAnimationDelay;
			if (defaultAnimationDelay === undefined) {
				defaultAnimationDelay = result.style.animationDelay;
			}
			if (defaultAnimationDelay !== "") {
				var animationDelay =
					defaultAnimationDelay
					.split(",")
					.map(delay => (parseFloat(delay) + dialogue.start - this.currentTime).toFixed(3) + "s")
					.join(",");

				result.style.webkitAnimationDelay = animationDelay;
				result.style.animationDelay = animationDelay;
			}

			this._wrappers[dialogue.layer][dialogue.alignment].appendChild(result);
		}

		public removeDialogue(dialogue: Dialogue): void {
			DefaultRenderer._removeElement(document.querySelector("[data-dialogue-id='" + dialogue.id + "']"));
		}

		public removeAllDialogues(): void {
			super.removeAllDialogues();

			(<HTMLDivElement[]>(Array.prototype.slice.call(this._subsWrapper.querySelectorAll("[data-dialogue-id]")))).forEach(DefaultRenderer._removeElement);
		}

		public static makeFontMapFromStyleElement(styleElement: HTMLStyleElement): Map<string, string[]> {
			var map = new Map<string, string[]>();

			var styleSheet = <CSSStyleSheet>styleElement.sheet;
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
					var name = DefaultRenderer._stripQuotes(rule.style.getPropertyValue("font-family"));
					var existingList = map.get(name);
					if (existingList === undefined) {
						existingList = [];
						map.set(name, existingList);
					}
					existingList.unshift.apply(existingList, urls.map(DefaultRenderer._stripQuotes));
				}
			});

			return map;
		}

		private static _stripQuotes(str: string): string {
			return str.match(/^["']?(.*?)["']?$/)[1];
		}

		private static _addClass(element: HTMLElement, className: string): void {
			var classNames = element.className.split(" ").map(className => className.trim()).filter(className => !!className);
			if (classNames.indexOf(className) === -1) {
				element.className += " " + className;
			}
		}

		private static _removeClass(element: HTMLElement, className: string): void {
			var classNames = element.className.split(" ").map(className => className.trim()).filter(className => !!className);
			var existingIndex = classNames.indexOf(className);
			if (existingIndex !== -1) {
				element.className = classNames.slice(0, existingIndex).join(" ") + " " + classNames.slice(existingIndex + 1).join(" ");
			}
		}

		/**
		 * Removes a DOM element from its parent node.
		 *
		 * @param {Element} element The element to remove
		 *
		 * @private
		 */
		private static _removeElement(element: Element): void {
			if (element !== null && element.parentNode !== null) {
				element.parentNode.removeChild(element);
			}
		}

		/**
		 * Discards the pre-rendered subtitle div created from an earlier call to _preRender().
		 */
		private _unPreRender(dialogue: Dialogue): void {
			delete this._preRenderedSubs[String(dialogue.id)];
		}
	}

	/**
	 * Settings for the default renderer.
	 *
	 * @constructor
	 *
	 * @memberof libjass.renderers
	 */
	export class RendererSettings {
		public preLoadFonts: boolean;
		public fontMap: Map<string, string[]>;

		/**
		 * Subtitles will be pre-rendered for this amount of time (seconds)
		 */
		public preRenderTime: number;

		/**
		 * If true, subtitles wil be rendered using a 41ms timer. If false, subtitles will be rendered using a 250ms timer (the exact value is browser-specific but most browsers have decided on 250ms).
		 *
		 * The period of the timer influences how much subtitles lag the video. For example, using the 250ms timer means that subtitles will be rendered between zero and 250ms after the time
		 * they should have been rendered.
		 *
		 * Defaults to true.
		 */
		public useHighResolutionTimer: boolean;

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

			if (this.useHighResolutionTimer === undefined) {
				this.useHighResolutionTimer = true;
			}
		}
	}

	interface EventListenersMap {
		[key: string]: Function[];
	}

	interface PreRenderedSubsMap {
		[key: string]: HTMLDivElement;
	}

	/**
	 * This class represents a collection of keyframes. Each keyframe contains one or more CSS properties.
	 * The collection can then be converted to a CSS3 representation.
	 *
	 * @constructor
	 * @param {number} id The ID of the dialogue that this keyframe is associated with
	 * @param {number} start The start time of the dialogue that this keyframe is associated with
	 * @param {number} end The end time of the dialogue that this keyframe is associated with
	 *
	 * @private
	 * @memberof libjass.renderers
	 */
	class AnimationCollection {
		private _cssText: string = "";
		private _animationStyle: string = "";
		private _numAnimations: number = 0;

		constructor(private _id: number) { }

		get cssText(): string {
			return this._cssText;
		}

		get animationStyle(): string {
			return this._animationStyle;
		}

		/**
		 * Add a new keyframe at the given time that sets the given CSS property to the given value.
		 *
		 * @param {number} startTime
		 * @param {number} endTime
		 * @param {!Object.<string, string>} startProperties
		 * @param {!Object.<string, string>} endProperties
		 */
		add(startTime: number, endTime: number, startProperties: Object, endProperties: Object) {
			var animationName: string = null;

			if (Object.keys(startProperties).length === 1 && startProperties.hasOwnProperty("opacity") && Object.keys(endProperties).length === 1 && endProperties.hasOwnProperty("opacity")) {
				if (startProperties["opacity"] === "0" && endProperties["opacity"] === "1") {
					animationName = "fade-in";
				}
				else if (startProperties["opacity"] === "1" && endProperties["opacity"] === "0") {
					animationName = "fade-out";
				}
			}

			if (animationName === null) {
				var ruleCssText = "\tfrom {\n";

				Object.keys(startProperties).forEach((propertyName: string) => {
					ruleCssText += "\t\t" + propertyName + ": " + startProperties[propertyName] + ";\n";
				});

				ruleCssText += "\t}\n";

				ruleCssText += "\tto {\n";

				Object.keys(endProperties).forEach((propertyName: string) => {
					ruleCssText += "\t\t" + propertyName + ": " + endProperties[propertyName] + ";\n";
				});

				ruleCssText += "\t}\n";

				animationName = "dialogue-" + this._id + "-" + this._numAnimations++;
				this._cssText +=
					"@-webkit-keyframes " + animationName + " {\n" + ruleCssText + "}\n\n" +
					"@keyframes " + animationName + " {\n" + ruleCssText + "}\n\n";
			}

			if (this._animationStyle !== "") {
				this._animationStyle += ",";
			}
			this._animationStyle += animationName + " " + (endTime - startTime).toFixed(3) + "s " + "linear " + startTime.toFixed(3) + "s";
		}
	}

	/**
	 * This class represents the style attribute of a span.
	 * As a Dialogue's div is rendered, individual tags are added to span's, and this class is used to maintain the style attribute of those.
	 *
	 * @constructor
	 * @param {!libjass.Style} style The default style for the dialogue this object is associated with
	 * @param {string} transformOrigin The transform origin of the dialogue this object is associated with
	 * @param {number} scaleX The horizontal scaling of the dialogue this object is associated with
	 * @param {number} scaleY The vertical scaling of the dialogue this object is associated with
	 * @param {number} dpi The DPI of the ASS script this object is associated with
	 *
	 * @private
	 * @memberof libjass.renderers
	 */
	class SpanStyles {
		private _italic: boolean;
		private _bold: Object;
		private _underline: boolean;
		private _strikeThrough: boolean;

		private _outlineWidthX: number;
		private _outlineWidthY: number;

		private _fontName: string;
		private _fontSize: number;

		private _fontScaleX: number;
		private _fontScaleY: number;

		private _letterSpacing: number;

		private _primaryColor: tags.Color;
		private _outlineColor: tags.Color;

		private _primaryAlpha: number;
		private _outlineAlpha: number;

		private _blur: number;

		constructor(private _style: Style, private _transformOrigin: string, private _scaleX: number, private _scaleY: number, private _dpi: number) {
			this.reset();
		}

		/**
		 * Resets the styles to the defaults provided by the argument.
		 *
		 * @param {!libjass.Style=} newStyle The new defaults to reset the style to. If unspecified, the new style is the original style this object was created with.
		 */
		reset(newStyle: Style = this._style): void {
			this.italic = newStyle.italic;
			this.bold = newStyle.bold;
			this.underline = newStyle.underline;
			this.strikeThrough = newStyle.strikeThrough;

			this.outlineWidthX = newStyle.outlineWidth;
			this.outlineWidthY = newStyle.outlineWidth;

			this.fontName = newStyle.fontName;
			this.fontSize = newStyle.fontSize;

			this.fontScaleX = newStyle.fontScaleX;
			this.fontScaleY = newStyle.fontScaleY;

			this.letterSpacing = newStyle.letterSpacing;

			this.primaryColor = newStyle.primaryColor;
			this.outlineColor = newStyle.outlineColor;

			this.primaryAlpha = null;
			this.outlineAlpha = null;

			this.blur = null;
		}

		/**
		 * Sets the style attribute on the given span element.
		 *
		 * @param {!HTMLSpanElement} span
		 */
		setStylesOnSpan(span: HTMLSpanElement): void {
			if (this._italic) {
				span.style.fontStyle = "italic";
			}

			if (this._bold === true) {
				span.style.fontWeight = "bold";
			}
			else if (this._bold !== false) {
				span.style.fontWeight = <string>this._bold;
			}

			var textDecoration = "";
			if (this._underline) {
				textDecoration = "underline";
			}
			if (this._strikeThrough) {
				textDecoration += " line-through";
			}
			span.style.textDecoration = textDecoration.trim();

			span.style.fontFamily = this._fontName;
			span.style.fontSize = span.style.lineHeight = ((72 / this._dpi) * this._scaleY * this._fontSize) + "px";

			span.style.webkitTransform = "scaleX(" + this._fontScaleX + ") scaleY(" + this._fontScaleY + ")";
			span.style.webkitTransformOrigin = this._transformOrigin;
			span.style.transform = "scaleX(" + this._fontScaleX + ") scaleY(" + this._fontScaleY + ")";
			span.style.transformOrigin = this._transformOrigin;

			span.style.letterSpacing = (this._scaleX * this._letterSpacing) + "px";

			span.style.color = this._primaryColor.withAlpha(this._primaryAlpha).toString();

			if (this._outlineWidthX > 0 || this._outlineWidthY > 0) {
				var textShadowColor = this._outlineColor.withAlpha(this._outlineAlpha).toString();
				var textShadowParts: number[][] = [];

				/* Lay out text-shadows in an ellipse with horizontal radius = this._scaleX * this._outlineWidthX
				 * and vertical radius = this._scaleY * this._outlineWidthY
				 * Shadows are laid inside the region of the ellipse, separated by 0.5px
				 *
				 * The below loop is an unrolled version of the above algorithm that only roams over one quadrant and adds
				 * four shadows at a time.
				 */

				var a = this._scaleX * this._outlineWidthX;
				var b = this._scaleY * this._outlineWidthY;

				for (var x = 0; x < a; x += 0.5) {
					for (var y = 0; y < b && ((x / a) * (x / a) + (y / b) * (y / b)) <= 1; y += 0.5) {
						textShadowParts.push([x, y, this._scaleX * this._blur]);
						if (x !== 0) {
							textShadowParts.push([-x, y, this._scaleX * this._blur]);
						}
						if (x !== 0 && y !== 0) {
							textShadowParts.push([-x, -y, this._scaleY * this._blur]);
						}
						if (y !== 0) {
							textShadowParts.push([x, -y, this._scaleY * this._blur]);
						}
					}
				}

				// Make sure the four corner shadows exist
				textShadowParts.push(
					[a, 0, this._scaleX * this._blur],
					[0, b, this._scaleX * this._blur],
					[-a, 0, this._scaleY * this._blur],
					[0, -b, this._scaleY * this._blur]
					);

				span.style.textShadow =
				textShadowParts
					.map(triple => triple[0] + "px " + triple[1] + "px " + triple[2] + "px " + textShadowColor)
					.join(", ");
			}

			/* TODO: Blur text
			else if (this._blur > 0) {
			}
			*/
		}

		/**
		 * Sets the italic property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set italic(value: boolean) {
			this._italic = SpanStyles._valueOrDefault(value, this._style.italic);
		}

		/**
		 * Sets the bold property. null defaults it to the style's original value.
		 *
		 * @type {(?number|?boolean)}
		 */
		set bold(value: Object) {
			this._bold = SpanStyles._valueOrDefault(value, this._style.bold);
		}

		/**
		 * Sets the underline property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set underline(value: boolean) {
			this._underline = SpanStyles._valueOrDefault(value, this._style.underline);
		}

		/**
		 * Sets the strike-through property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set strikeThrough(value: boolean) {
			this._strikeThrough = SpanStyles._valueOrDefault(value, this._style.strikeThrough);
		}

		/**
		 * Sets the outline width property. null defaults it to the style's original outline width value.
		 *
		 * @type {?number}
		 */
		set outlineWidthX(value: number) {
			this._outlineWidthX = SpanStyles._valueOrDefault(value, this._style.outlineWidth);
		}

		/**
		 * Sets the outline height property. null defaults it to the style's original outline width value.
		 *
		 * @type {?number}
		 */
		set outlineWidthY(value: number) {
			this._outlineWidthY = SpanStyles._valueOrDefault(value, this._style.outlineWidth);
		}

		/**
		 * Sets the blur property. null defaults it to 0.
		 *
		 * @type {?number}
		 */
		set blur(value: number) {
			this._blur = SpanStyles._valueOrDefault(value, 0);
		}

		/**
		 * Sets the font name property. null defaults it to the style's original value.
		 *
		 * @type {?string}
		 */
		set fontName(value: string) {
			this._fontName = SpanStyles._valueOrDefault(value, this._style.fontName);
		}

		/**
		 * Sets the font size property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontSize(value: number) {
			this._fontSize = SpanStyles._valueOrDefault(value, this._style.fontSize);
		}

		/**
		 * Sets the horizontal font scaling property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontScaleX(value: number) {
			this._fontScaleX = SpanStyles._valueOrDefault(value, this._style.fontScaleX);
		}

		/**
		 * Sets the vertical font scaling property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontScaleY(value: number) {
			this._fontScaleY = SpanStyles._valueOrDefault(value, this._style.fontScaleY);
		}

		/**
		 * Sets the letter spacing property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set letterSpacing(value: number) {
			this._letterSpacing = SpanStyles._valueOrDefault(value, this._style.letterSpacing);
		}

		/**
		 * Sets the primary color property. null defaults it to the style's original value.
		 *
		 * @type {libjass.tags.Color}
		 */
		set primaryColor(value: tags.Color) {
			this._primaryColor = SpanStyles._valueOrDefault(value, this._style.primaryColor);
		}

		/**
		 * Sets the outline color property. null defaults it to the style's original value.
		 *
		 * @type {libjass.tags.Color}
		 */
		set outlineColor(value: tags.Color) {
			this._outlineColor = SpanStyles._valueOrDefault(value, this._style.outlineColor);
		}

		/**
		 * Sets the primary alpha property.
		 *
		 * @type {?number}
		 */
		set primaryAlpha(value: number) {
			this._primaryAlpha = value;
		}

		/**
		 * Sets the outline alpha property.
		 *
		 * @type {?number}
		 */
		set outlineAlpha(value: number) {
			this._outlineAlpha = value;
		}

		private static _valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);
	}
}
