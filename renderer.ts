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

		private _settings: RendererSettings;

		private _dialogues: Dialogue[];
		private _endTimes: number[];

		private _state: VideoState;
		private _currentTime: number;

		private _timeUpdateIntervalHandle: number = null;

		constructor(private _video: HTMLVideoElement, private _ass: ASS, settings: RendererSettings) {
			this._settings = RendererSettings.from(settings);

			// Sort the dialogues array by end time and then by their original position in the script (id)
			this._dialogues = this._ass.dialogues.slice(0);
			this._dialogues.sort((dialogue1: Dialogue, dialogue2: Dialogue) => {
				var result = dialogue1.end - dialogue2.end;

				if (result === 0) {
					result = dialogue1.id - dialogue2.id;
				}

				return result;
			});

			this._endTimes = this._dialogues.map((dialogue: Dialogue) => dialogue.end);

			this._video.addEventListener("timeupdate", () => this._onVideoTimeUpdate(), false);
			this._video.addEventListener("seeking", () => this._onVideoSeeking(), false);
			this._video.addEventListener("pause", () => this._onVideoPause(), false);
			this._video.addEventListener("playing", () => this._onVideoPlaying(), false);
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

		get currentTime(): number {
			return this._currentTime;
		}

		public onVideoTimeUpdate(): void {
			this._currentTime = this._video.currentTime;

			if (libjass.debugMode) {
				console.log("NullRenderer.onVideoTimeUpdate: " + this._getVideoStateLogString());
			}

			var searchStart = 0;
			var searchEnd = this._endTimes.length;
			while (searchStart !== searchEnd) {
				var mid = ((searchStart + searchEnd) / 2) | 0;
				if (this._endTimes[mid] < this._currentTime) {
					searchStart = mid + 1;
				}
				else {
					searchEnd = mid;
				}
			}

			for (var i = searchStart; i < this._endTimes.length; i++) {
				var dialogue = this._dialogues[i];

				if (dialogue.start <= this._currentTime) {
					// This dialogue is visible right now. Draw it.
					this.draw(dialogue);
				}
				else if (dialogue.start <= (this._currentTime + this._settings.preRenderTime)) {
					// This dialogue will be visible soon. Pre-render it.
					this.preRender(dialogue);
				}
				else {
					// No more dialogues in the time range [currentTime, currentTime + settings.preRenderTime]
					break;
				}
			}
		}

		public onVideoSeeking(): void {
			if (libjass.debugMode) {
				console.log("NullRenderer.onVideoSeeking: " + this._getVideoStateLogString());
			}
		}

		public onVideoPause(): void {
			if (libjass.debugMode) {
				console.log("NullRenderer.onVideoPause: " + this._getVideoStateLogString());
			}

			if (this._timeUpdateIntervalHandle !== null) {
				clearInterval(this._timeUpdateIntervalHandle);
				this._timeUpdateIntervalHandle = null;
			}
		}

		public onVideoPlaying(): void {
			if (libjass.debugMode) {
				console.log("NullRenderer.onVideoPlaying: " + this._getVideoStateLogString());
			}

			if (this._timeUpdateIntervalHandle === null) {
				this._timeUpdateIntervalHandle = setInterval(() => this._onVideoTimeChange(), NullRenderer._highResolutionTimerInterval);
			}
		}

		public preRender(dialogue: Dialogue): void {
		}

		public draw(dialogue: Dialogue): void {
		}

		private _onVideoTimeUpdate(): void {
			if (this._state === VideoState.Seeking) {
				if (this._currentTime !== this._video.currentTime) {
					this._onVideoPlaying();
				}
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
		private static _svgDefsElement: SVGDefsElement = null;

		private _videoSubsWrapper: HTMLDivElement;
		private _subsWrapper: HTMLDivElement;
		private _layerAlignmentWrappers: HTMLDivElement[][] = [];

		private _currentSubs: Map<number, HTMLDivElement> = new Map<number, HTMLDivElement>();
		private _preRenderedSubs: Map<number, HTMLDivElement> = new Map<number, HTMLDivElement>();

		private _videoIsFullScreen: boolean = false;

		private _eventListeners: Map<string, Function[]> = new Map<string, Function[]>();

		constructor(video: HTMLVideoElement, ass: ASS, settings: RendererSettings) {
			super(video, ass, settings);

			this._videoSubsWrapper = document.createElement("div");
			video.parentElement.replaceChild(this._videoSubsWrapper, video);

			this._videoSubsWrapper.className = "libjass-wrapper";
			this._videoSubsWrapper.appendChild(video);

			this._subsWrapper = document.createElement("div");
			this._videoSubsWrapper.appendChild(this._subsWrapper);
			this._subsWrapper.className = "libjass-subs";

			var svgElement = <SVGSVGElement>document.createElementNS("http://www.w3.org/2000/svg", "svg");
			this._videoSubsWrapper.appendChild(svgElement);
			svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			svgElement.setAttribute("version", "1.1");
			svgElement.setAttribute("class", "libjass-filters");
			svgElement.setAttribute("width", "0");
			svgElement.setAttribute("height", "0");

			DefaultRenderer._svgDefsElement = <SVGDefsElement>document.createElementNS("http://www.w3.org/2000/svg", "defs");
			svgElement.appendChild(DefaultRenderer._svgDefsElement);

			if (this.settings.fontMap === null) {
				setTimeout(() => this._ready(), 0);
			}
			// Preload fonts
			else {
				var urlsToPreload: string[] = [];
				this.settings.fontMap.forEach((src: string[], name: string) => {
					urlsToPreload.unshift.apply(urlsToPreload, src);
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

			this._eventListeners.set("ready", []);
			this._eventListeners.set("fullScreenChange", []);
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
			var listeners = this._eventListeners.get(type);
			if (listeners !== null) {
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
			this._removeAllSubs();

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
			this._preRenderedSubs.clear();

			if (DefaultRenderer._animationStyleElement !== null) {
				while (DefaultRenderer._animationStyleElement.firstChild !== null) {
					DefaultRenderer._animationStyleElement.removeChild(DefaultRenderer._animationStyleElement.firstChild);
				}
			}

			while (DefaultRenderer._svgDefsElement.firstChild !== null) {
				DefaultRenderer._svgDefsElement.removeChild(DefaultRenderer._svgDefsElement.firstChild);
			}

			this.onVideoTimeUpdate();
		}

		public onVideoSeeking(): void {
			super.onVideoSeeking();

			this._removeAllSubs();
		}

		public onVideoTimeUpdate(): void {
			super.onVideoTimeUpdate();

			this._currentSubs.forEach((sub: HTMLDivElement, dialogueId: number) => {
				var dialogue = this.ass.dialogues[dialogueId];

				if (dialogue.start > this.currentTime || dialogue.end < this.currentTime) {
					this._currentSubs.delete(dialogueId);
					this._removeSub(sub);
				}
			});
		}

		public onVideoPause(): void {
			super.onVideoPause();

			DefaultRenderer._addClass(this._subsWrapper, "paused");
		}

		public onVideoPlaying(): void {
			super.onVideoPlaying();

			DefaultRenderer._removeClass(this._subsWrapper, "paused");
		}

		/**
		 * The magic happens here. The subtitle div is rendered and stored. Call draw() to get a clone of the div to display.
		 */
		public preRender(dialogue: Dialogue): void {
			if (this._preRenderedSubs.has(dialogue.id)) {
				return;
			}

			var sub = document.createElement("div");

			var scaleX = this.ass.scaleX;
			var scaleY = this.ass.scaleY;

			sub.style.marginLeft = (scaleX * dialogue.style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * dialogue.style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleY * dialogue.style.marginVertical) + "px";

			switch (dialogue.alignment) {
				case 1: case 4: case 7: sub.style.textAlign = "left"; break;
				case 2: case 5: case 8: sub.style.textAlign = "center"; break;
				case 3: case 6: case 9: sub.style.textAlign = "right"; break;
			}

			var animationCollection = new AnimationCollection(dialogue);

			var divTransformStyle = "";

			var currentSpan: HTMLSpanElement = null;
			var currentSpanStyles = new SpanStyles(dialogue, scaleX, scaleY, DefaultRenderer._svgDefsElement);

			var startNewSpan = (): void => {
				if (currentSpan !== null) {
					sub.appendChild(currentSpanStyles.setStylesOnSpan(currentSpan));
				}

				currentSpan = document.createElement("span");
			};
			startNewSpan();

			var currentDrawing: Drawing = null;

			dialogue.parts.forEach(part => {
				if (part instanceof parts.Italic) {
					currentSpanStyles.italic = (<parts.Italic>part).value;
				}

				else if (part instanceof parts.Bold) {
					currentSpanStyles.bold = (<parts.Bold>part).value;
				}

				else if (part instanceof parts.Underline) {
					currentSpanStyles.underline = (<parts.Underline>part).value;
				}

				else if (part instanceof parts.StrikeThrough) {
					currentSpanStyles.strikeThrough = (<parts.StrikeThrough>part).value;
				}

				else if (part instanceof parts.Border) {
					currentSpanStyles.outlineWidthX = (<parts.Border>part).value;
					currentSpanStyles.outlineWidthY = (<parts.Border>part).value;
				}

				else if (part instanceof parts.BorderX) {
					currentSpanStyles.outlineWidthX = (<parts.BorderX>part).value;
				}

				else if (part instanceof parts.BorderY) {
					currentSpanStyles.outlineWidthY = (<parts.BorderY>part).value;
				}

				else if (part instanceof parts.GaussianBlur) {
					currentSpanStyles.blur = (<parts.GaussianBlur>part).value;
				}

				else if (part instanceof parts.FontName) {
					currentSpanStyles.fontName = (<parts.FontName>part).value;
				}

				else if (part instanceof parts.FontSize) {
					currentSpanStyles.fontSize = (<parts.FontSize>part).value;
				}

				else if (part instanceof parts.FontScaleX) {
					currentSpanStyles.fontScaleX = (<parts.FontScaleX>part).value;
				}

				else if (part instanceof parts.FontScaleY) {
					currentSpanStyles.fontScaleY = (<parts.FontScaleY>part).value;
				}

				else if (part instanceof parts.LetterSpacing) {
					currentSpanStyles.letterSpacing = (<parts.LetterSpacing>part).value;
				}

				else if (part instanceof parts.RotateX) {
					divTransformStyle += " rotateX(" + (<parts.RotateX>part).value + "deg)";
				}

				else if (part instanceof parts.RotateY) {
					divTransformStyle += " rotateY(" + (<parts.RotateY>part).value + "deg)";
				}

				else if (part instanceof parts.RotateZ) {
					divTransformStyle += " rotateZ(" + (-1 * (<parts.RotateZ>part).value) + "deg)";
				}

				else if (part instanceof parts.SkewX) {
					divTransformStyle += " skewX(" + (45 * (<parts.SkewX>part).value) + "deg)";
				}

				else if (part instanceof parts.SkewY) {
					divTransformStyle += " skewY(" + (45 * (<parts.SkewY>part).value) + "deg)";
				}

				else if (part instanceof parts.PrimaryColor) {
					currentSpanStyles.primaryColor = (<parts.PrimaryColor>part).value;
				}

				else if (part instanceof parts.OutlineColor) {
					currentSpanStyles.outlineColor = (<parts.OutlineColor>part).value;
				}

				else if (part instanceof parts.Alpha) {
					currentSpanStyles.primaryAlpha = (<parts.Alpha>part).value;
					currentSpanStyles.outlineAlpha = (<parts.Alpha>part).value;
				}

				else if (part instanceof parts.PrimaryAlpha) {
					currentSpanStyles.primaryAlpha = (<parts.PrimaryAlpha>part).value;
				}

				else if (part instanceof parts.OutlineAlpha) {
					currentSpanStyles.outlineAlpha = (<parts.OutlineAlpha>part).value;
				}

				else if (part instanceof parts.Alignment) {
					// Already handled in Dialogue constructor
				}

				else if (part instanceof parts.Reset) {
					var newStyleName = (<parts.Reset>part).value;
					var newStyle: Style = null;
					if (newStyleName !== null) {
						newStyle = this.ass.styles[newStyleName];
					}
					currentSpanStyles.reset(newStyle);
				}

				else if (part instanceof parts.Position) {
					var positionPart = <parts.Position>part;

					sub.style.position = "absolute";
					sub.style.left = (scaleX * positionPart.x).toFixed(3) + "px";
					sub.style.top = (scaleY * positionPart.y).toFixed(3) + "px";
				}

				else if (part instanceof parts.Move) {
					var movePart = <parts.Move>part;

					sub.style.position = "absolute";
					animationCollection.addCustom("linear", new Keyframe(0, {
						left: (scaleX * movePart.x1).toFixed(3) + "px",
						top: (scaleY * movePart.y1).toFixed(3) + "px"
					}), new Keyframe(movePart.t1, {
						left: (scaleX * movePart.x1).toFixed(3) + "px",
						top: (scaleY * movePart.y1).toFixed(3) + "px"
					}), new Keyframe(movePart.t2, {
						left: (scaleX * movePart.x2).toFixed(3) + "px",
						top: (scaleY * movePart.y2).toFixed(3) + "px"
					}), new Keyframe(dialogue.end - dialogue.start, {
						left: (scaleX * movePart.x2).toFixed(3) + "px",
						top: (scaleY * movePart.y2).toFixed(3) + "px"
					}));
				}

				else if (part instanceof parts.Fade) {
					var fadePart = <parts.Fade>part;

					if (fadePart.start !== 0) {
						animationCollection.addFadeIn(0, fadePart.start);
					}

					if (fadePart.end !== 0) {
						animationCollection.addFadeOut(dialogue.end - dialogue.start - fadePart.end, fadePart.end);
					}
				}

				else if (part instanceof parts.ComplexFade) {
					var complexFadePart = <parts.ComplexFade>part;

					animationCollection.addCustom("linear", new Keyframe(0, {
						opacity: String(complexFadePart.a1)
					}), new Keyframe(complexFadePart.t1, {
						opacity: String(complexFadePart.a1)
					}), new Keyframe(complexFadePart.t2, {
						opacity: String(complexFadePart.a2)
					}), new Keyframe(complexFadePart.t3, {
						opacity: String(complexFadePart.a2)
					}), new Keyframe(complexFadePart.t4, {
						opacity: String(complexFadePart.a3)
					}), new Keyframe(dialogue.end, {
						opacity: String(complexFadePart.a3)
					}));
				}

				else if (part instanceof parts.DrawingMode) {
					currentDrawing = new Drawing((<parts.DrawingMode>part).scale, scaleX, scaleY);
				}

				else if (part instanceof parts.DrawingBaselineOffset) {
					currentDrawing.baselineOffset = (<parts.DrawingBaselineOffset>part).value;
				}

				else if (part instanceof parts.DrawingInstructions) {
					currentDrawing.instructions = (<parts.DrawingInstructions>part).value;
					currentSpan.appendChild(currentDrawing.toSVG());
					currentDrawing = null;
					startNewSpan();
				}

				else if (part instanceof parts.Text || (libjass.debugMode && part instanceof parts.Comment)) {
					currentSpan.appendChild(document.createTextNode((<parts.Text>part).value));
					startNewSpan();
				}
			});

			dialogue.parts.some(part => {
				if (part instanceof parts.Position || part instanceof parts.Move) {
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

			this._preRenderedSubs.set(dialogue.id, sub);
		}

		/**
		 * Returns the subtitle div for display. The currentTime is used to shift the animations appropriately, so that at the time the
		 * div is inserted into the DOM and the animations begin, they are in sync with the video time.
		 *
		 * @param {!libjass.Dialogue} dialogue
		 */
		public draw(dialogue: Dialogue): void {
			if (this._currentSubs.has(dialogue.id)) {
				return;
			}

			if (libjass.debugMode) {
				console.log(dialogue.toString());
			}

			var preRenderedSub = this._preRenderedSubs.get(dialogue.id);

			if (preRenderedSub === undefined) {
				if (libjass.debugMode) {
					console.warn("This dialogue was not pre-rendered. Call preRender() before calling draw() so that draw() is faster.");
				}

				this.preRender(dialogue);
				preRenderedSub = this._preRenderedSubs.get(dialogue.id);
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

			var layer = dialogue.layer;
			var alignment = (result.style.position === "absolute") ? 0 : dialogue.alignment; // Alignment 0 is for absolutely-positioned subs

			// Create the layer wrapper div and the alignment div inside it if not already created
			if (this._layerAlignmentWrappers[layer] === undefined) {
				this._layerAlignmentWrappers[layer] = new Array<HTMLDivElement>(9 + 1); // + 1 because alignments are 1-indexed (1 to 9)
			}
			if (this._layerAlignmentWrappers[layer][alignment] === undefined) {
				var layerAlignmentWrapper = document.createElement("div");
				layerAlignmentWrapper.className = "layer" + layer + " an" + alignment;

				// Find the next greater layer,alignment div and insert this div before that one
				var insertBeforeElement: HTMLDivElement = null;
				for (var insertBeforeLayer = layer; insertBeforeLayer < this._layerAlignmentWrappers.length && insertBeforeElement === null; insertBeforeLayer++) {
					if (this._layerAlignmentWrappers[insertBeforeLayer] !== undefined) {
						for (var insertBeforeAlignment = (insertBeforeLayer === layer) ? (alignment + 1) : 0; insertBeforeAlignment < 10 && insertBeforeElement === null; insertBeforeAlignment++) {
							if (this._layerAlignmentWrappers[insertBeforeLayer][insertBeforeAlignment] !== undefined) {
								insertBeforeElement = this._layerAlignmentWrappers[insertBeforeLayer][insertBeforeAlignment];
							}
						}
					}
				}
				this._subsWrapper.insertBefore(layerAlignmentWrapper, insertBeforeElement);

				this._layerAlignmentWrappers[layer][alignment] = layerAlignmentWrapper;
			}

			this._layerAlignmentWrappers[layer][alignment].appendChild(result);

			this._currentSubs.set(dialogue.id, result);
		}

		private _ready(): void {
			document.addEventListener("webkitfullscreenchange", event => this._onFullScreenChange(), false);
			document.addEventListener("mozfullscreenchange", event => this._onFullScreenChange(), false);
			document.addEventListener("fullscreenchange", event => this._onFullScreenChange(), false);

			this.resizeVideo(parseInt(this.video.style.width), parseInt(this.video.style.height));

			this._dispatchEvent("ready");
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
				DefaultRenderer._addClass(this._videoSubsWrapper, "libjass-full-screen");

				this.resizeVideo(screen.width, screen.height);

				this._videoIsFullScreen = true;

				this._dispatchEvent("fullScreenChange", this._videoIsFullScreen);
			}
			else if (fullScreenElement === null && this._videoIsFullScreen) {
				DefaultRenderer._removeClass(this._videoSubsWrapper, "libjass-full-screen");

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
			var listeners = this._eventListeners.get(type);
			if (listeners !== null) {
				listeners.forEach((listener: Function) => {
					listener.apply(this, args);
				});
			}
		}

		private _removeSub(sub: HTMLDivElement): void {
			sub.parentNode.removeChild(sub);
		}

		private _removeAllSubs(): void {
			this._currentSubs.forEach((sub: HTMLDivElement) => this._removeSub(sub));
			this._currentSubs.clear();
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
	}

	/**
	 * Settings for the default renderer.
	 *
	 * @constructor
	 *
	 * @memberof libjass.renderers
	 */
	export class RendererSettings {
		public fontMap: Map<string, string[]>;

		/**
		 * Subtitles will be pre-rendered for this amount of time (seconds)
		 */
		public preRenderTime: number;

		/**
		 * A convenience method to create a font map from a <style> or <link> element that contains @font-face rules.
		 *
		 * @param {!LinkStyle} linkStyle
		 * @return {!Map<string, string[]>}
		 */
		public static makeFontMapFromStyleElement(linkStyle: LinkStyle): Map<string, string[]> {
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
		 * Converts an arbitrary object into a RendererSettings object.
		 *
		 * @param {!*} object
		 * @return {!libjass.renderers.RendererSettings}
		 */
		public static from(object: any): RendererSettings {
			return RendererSettings._from(object.fontMap, object.preRenderTime);
		}

		private static _from(fontMap: Map<string, string[]> = null, preRenderTime: number = 5): RendererSettings {
			var result = new RendererSettings();
			result.fontMap = fontMap;
			result.preRenderTime = preRenderTime;
			return result;
		}

		private static _stripQuotes(str: string): string {
			return str.match(/^["']?(.*?)["']?$/)[1];
		}
	}

	interface KeyframePropertiesMap {
		[key: string]: string;
	}

	class Keyframe {
		constructor(private _time: number, private _properties: KeyframePropertiesMap) { }

		get time(): number {
			return this._time;
		}

		get properties(): KeyframePropertiesMap {
			return this._properties;
		}
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
		private _id: number;
		private _start: number;
		private _end: number;

		private _cssText: string = "";
		private _animationStyle: string = "";
		private _numAnimations: number = 0;

		constructor(dialogue: Dialogue) {
			this._id = dialogue.id;
			this._start = dialogue.start;
			this._end = dialogue.end;
		}

		get cssText(): string {
			return this._cssText;
		}

		get animationStyle(): string {
			return this._animationStyle;
		}

		/**
		 * Add a fade-in animation.
		 *
		 * @param {number} start The time from the dialogue start to start the fade-in
		 * @param {number} duration The duration of the fade-in
		 */
		addFadeIn(start: number, duration: number) {
			if (this._animationStyle !== "") {
				this._animationStyle += ",";
			}

			this._animationStyle += "fade-in " + duration.toFixed(3) + "s linear " + start.toFixed(3) + "s";
		}

		/**
		 * Add a fade-out animation.
		 *
		 * @param {number} start The time from the dialogue start to start the fade-out
		 * @param {number} duration The duration of the fade-out
		 */
		addFadeOut(start: number, duration: number) {
			if (this._animationStyle !== "") {
				this._animationStyle += ",";
			}

			this._animationStyle += "fade-out " + duration.toFixed(3) + "s linear " + start.toFixed(3) + "s";
		}

		/**
		 * Add a new custom animation.
		 *
		 * @param {string} timingFunction
		 * @param {Array.<!{time: number, properties: Object.<string, string>}>} animations
		 */
		addCustom(timingFunction: string, ...keyframes: Keyframe[]) {
			var startTime: number = null;
			var endTime: number = null;

			var ruleCssText = "";

			keyframes.forEach(keyframe => {
				if (startTime === null) {
					startTime = keyframe.time;
				}

				endTime = keyframe.time;

				ruleCssText += "\t" + (100 * keyframe.time / (this._end - this._start)).toFixed(3) + "% {\n";

				Object.keys(keyframe.properties).forEach(propertyName => {
					ruleCssText += "\t\t" + propertyName + ": " + keyframe.properties[propertyName] + ";\n";
				});

				ruleCssText += "\t}\n";
			});

			var animationName = "dialogue-" + this._id + "-" + this._numAnimations++;

			this._cssText +=
				"@-webkit-keyframes " + animationName + " {\n" + ruleCssText + "}\n\n" +
				"@keyframes " + animationName + " {\n" + ruleCssText + "}\n\n";

			if (this._animationStyle !== "") {
				this._animationStyle += ",";
			}

			this._animationStyle += animationName + " " + (endTime - startTime).toFixed(3) + "s " + timingFunction + " " + startTime.toFixed(3) + "s";
		}
	}

	/**
	 * This class represents the style attribute of a span.
	 * As a Dialogue's div is rendered, individual parts are added to span's, and this class is used to maintain the style attribute of those.
	 *
	 * @constructor
	 * @param {!libjass.Style} style The default style for the dialogue this object is associated with
	 * @param {string} transformOrigin The transform origin of the dialogue this object is associated with
	 * @param {number} scaleX The horizontal scaling of the dialogue this object is associated with
	 * @param {number} scaleY The vertical scaling of the dialogue this object is associated with
	 *
	 * @private
	 * @memberof libjass.renderers
	 */
	class SpanStyles {
		private _id: number;
		private _defaultStyle: Style;

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

		private _primaryColor: parts.Color;
		private _outlineColor: parts.Color;

		private _primaryAlpha: number;
		private _outlineAlpha: number;

		private _blur: number;

		private _nextFilterId = 0;

		constructor(dialogue: Dialogue, private _scaleX: number, private _scaleY: number, private _svgDefsElement: SVGDefsElement) {
			this._id = dialogue.id;
			this._defaultStyle = dialogue.style;

			this.reset(null);
		}

		/**
		 * Resets the styles to the defaults provided by the argument.
		 *
		 * @param {!libjass.Style=} newStyle The new defaults to reset the style to. If unspecified, the new style is the original style this object was created with.
		 */
		reset(newStyle: Style): void {
			if (newStyle === undefined || newStyle === null) {
				newStyle = this._defaultStyle;
			}

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
		setStylesOnSpan(span: HTMLSpanElement): HTMLSpanElement {
			var fontStyleOrWeight = "";
			if (this._italic) {
				fontStyleOrWeight += "italic ";
			}
			if (this._bold === true) {
				fontStyleOrWeight += "bold ";
			}
			else if (this._bold !== false) {
				fontStyleOrWeight += (<string>this._bold + " ");
			}
			var fontSize = ((72 / 96) * this._scaleY * this._fontSize).toFixed(3);
			span.style.font = fontStyleOrWeight + fontSize + "px/" + fontSize + "px \"" + this._fontName + "\"";

			var textDecoration = "";
			if (this._underline) {
				textDecoration = "underline";
			}
			if (this._strikeThrough) {
				textDecoration += " line-through";
			}
			span.style.textDecoration = textDecoration.trim();

			var transform = "";
			if (this._fontScaleX != 1) {
				transform += "scaleX(" + this._fontScaleX + ") ";
			}
			if (this._fontScaleY != 1) {
				transform += "scaleY(" + this._fontScaleY + ")";
			}
			if (transform !== "") {
				span.style.webkitTransform = transform;
				span.style.webkitTransformOrigin = "50% 50%";
				span.style.transform = transform;
				span.style.transformOrigin = "50% 50%";
				span.style.display = "inline-block";
			}

			span.style.letterSpacing = (this._scaleX * this._letterSpacing).toFixed(3) + "px";

			var primaryColor = this._primaryColor.withAlpha(this._primaryAlpha);
			span.style.color = primaryColor.toString();

			var outlineColor = this._outlineColor.withAlpha(this._outlineAlpha);

			var outlineWidthX = (this._scaleX * this._outlineWidthX);
			var outlineWidthY = (this._scaleY * this._outlineWidthY);

			var filterId = "svg-filter-" + this._id + "-" + this._nextFilterId++;

			var points: number[][] = [];

			var outlineColorFilter =
				'\t<feComponentTransfer in="SourceAlpha" result="outlineColor">\n' +
				'\t\t<feFuncR type="linear" slope="0" intercept="' + (outlineColor.red / 255).toFixed(3) + '" />\n' +
				'\t\t<feFuncG type="linear" slope="0" intercept="' + (outlineColor.green / 255).toFixed(3) + '" />\n' +
				'\t\t<feFuncB type="linear" slope="0" intercept="' + (outlineColor.blue / 255).toFixed(3) + '" />\n' +
				'\t\t<feFuncA type="linear" slope="' + outlineColor.alpha.toFixed(3) + '" intercept="0" />\n' +
				'\t</feComponentTransfer>\n';

			var outlineFilter = '';
			if (outlineWidthX > 0 || outlineWidthY > 0) {
				/* Lay out outlines in an ellipse with horizontal radius = (this._scaleX * this._outlineWidthX) / this._fontScaleX
				 * and vertical radius = (this._scaleY * this._outlineWidthY) / this._fontScaleY
				 * Outlines are laid inside the region of the ellipse, separated by this._fontScaleX pixels horizontally and this._fontScaleY pixels vertically.
				 *
				 * The below loop is an unrolled version of the above algorithm that only roams over one quadrant and adds
				 * four shadows at a time.
				 */

				var a = outlineWidthX - 1;
				var b = outlineWidthY - 1;

				for (var x = 0; x < a; x++) {
					for (var y = 0; (x / a) * (x / a) + (y / b) * (y / b) <= 1; y++) {
						if (x == 0 && y == 0) {
							continue;
						}

						points.push([x, y]);

						if (x !== 0) {
							points.push([-x, y]);
						}

						if (x !== 0 && y !== 0) {
							points.push([-x, -y]);
						}

						if (y !== 0) {
							points.push([x, -y]);
						}
					}
				}

				// Add the four corner outlines
				points.push([a, 0]);
				points.push([0, b]);
				points.push([-a, 0]);
				points.push([0, -b]);

				var mergeOutlinesFilter = '';

				points.forEach((pair: number[], index: number) => {
					var x = pair[0];
					var y = pair[1];

					outlineFilter +=
						'\t<feOffset dx="' + pair[0].toFixed(3) + '" dy="' + pair[1].toFixed(3) + '" in="outlineColor" result="outline' + index + '" />\n';

					mergeOutlinesFilter +=
						'\t\t<feMergeNode in="outline' + index + '" />\n';
				});

				outlineFilter +=
					'\t<feMerge>\n' +
					mergeOutlinesFilter +
					'\t</feMerge>\n';
			}

			var blurFilter = '';
			if (this._blur > 0) {
				blurFilter =
					'\t<feGaussianBlur stdDeviation="' + this._blur + '" />\n';
			}

			var filterWrapperSpan = document.createElement("span");
			filterWrapperSpan.appendChild(span);

			if (outlineFilter !== '' || blurFilter !== '') {
				var filterString =
					'<filter xmlns="http://www.w3.org/2000/svg" id="' + filterId + '">\n' +
					outlineColorFilter +
					outlineFilter +
					blurFilter +
					'\t<feMerge>\n' +
					'\t\t<feMergeNode />\n' +
					'\t\t<feMergeNode in="SourceGraphic" />\n' +
					'\t</feMerge>\n' +
					'</filter>\n';

				var filterElement = domParser.parseFromString(filterString, "image/svg+xml").childNodes[0];

				this._svgDefsElement.appendChild(filterElement);

				filterWrapperSpan.style.webkitFilter = 'url("#' + filterId + '")';
				filterWrapperSpan.style.filter = 'url("#' + filterId + '")';
			}

			return filterWrapperSpan;
		}

		/**
		 * Sets the italic property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set italic(value: boolean) {
			this._italic = SpanStyles._valueOrDefault(value, this._defaultStyle.italic);
		}

		/**
		 * Sets the bold property. null defaults it to the style's original value.
		 *
		 * @type {(?number|?boolean)}
		 */
		set bold(value: Object) {
			this._bold = SpanStyles._valueOrDefault(value, this._defaultStyle.bold);
		}

		/**
		 * Sets the underline property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set underline(value: boolean) {
			this._underline = SpanStyles._valueOrDefault(value, this._defaultStyle.underline);
		}

		/**
		 * Sets the strike-through property. null defaults it to the style's original value.
		 *
		 * @type {?boolean}
		 */
		set strikeThrough(value: boolean) {
			this._strikeThrough = SpanStyles._valueOrDefault(value, this._defaultStyle.strikeThrough);
		}

		/**
		 * Sets the outline width property. null defaults it to the style's original outline width value.
		 *
		 * @type {?number}
		 */
		set outlineWidthX(value: number) {
			this._outlineWidthX = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineWidth);
		}

		/**
		 * Sets the outline height property. null defaults it to the style's original outline width value.
		 *
		 * @type {?number}
		 */
		set outlineWidthY(value: number) {
			this._outlineWidthY = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineWidth);
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
			this._fontName = SpanStyles._valueOrDefault(value, this._defaultStyle.fontName);
		}

		/**
		 * Sets the font size property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontSize(value: number) {
			this._fontSize = SpanStyles._valueOrDefault(value, this._defaultStyle.fontSize);
		}

		/**
		 * Sets the horizontal font scaling property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontScaleX(value: number) {
			this._fontScaleX = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleX);
		}

		/**
		 * Sets the vertical font scaling property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set fontScaleY(value: number) {
			this._fontScaleY = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleY);
		}

		/**
		 * Sets the letter spacing property. null defaults it to the style's original value.
		 *
		 * @type {?number}
		 */
		set letterSpacing(value: number) {
			this._letterSpacing = SpanStyles._valueOrDefault(value, this._defaultStyle.letterSpacing);
		}

		/**
		 * Sets the primary color property. null defaults it to the style's original value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set primaryColor(value: parts.Color) {
			this._primaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.primaryColor);
		}

		/**
		 * Sets the outline color property. null defaults it to the style's original value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set outlineColor(value: parts.Color) {
			this._outlineColor = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineColor);
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

	class Drawing {
		private _baselineOffset: number = 0;
		private _instructions: parts.drawing.Instruction[] = [];

		constructor(private _drawingScale: number, private _scaleX: number, private _scaleY: number) { }

		set baselineOffset(value: number) {
			this._baselineOffset = value;
		}

		set instructions(value: parts.drawing.Instruction[]) {
			this._instructions = value;
		}

		toSVG(): SVGSVGElement {
			var path = "";
			var bboxWidth = 0;
			var bboxHeight = 0;

			this._instructions.forEach((instruction: parts.drawing.Instruction) => {
				if (instruction instanceof parts.drawing.Move) {
					var movePart = <parts.drawing.Move>instruction;
					path += " M " + movePart.x + " " + (movePart.y + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, movePart.x);
					bboxHeight = Math.max(bboxHeight, movePart.y + this._baselineOffset);
				}
				else if (instruction instanceof parts.drawing.Line) {
					var linePart = <parts.drawing.Line>instruction;
					path += " L " + linePart.x + " " + (linePart.y + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, linePart.x);
					bboxHeight = Math.max(bboxHeight, linePart.y + this._baselineOffset);
				}
				else if (instruction instanceof parts.drawing.CubicBezierCurve) {
					var cubicBezierCurvePart = <parts.drawing.CubicBezierCurve>instruction;
					path += " C " + cubicBezierCurvePart.x1 + " " + (cubicBezierCurvePart.y1 + this._baselineOffset) + ", " + cubicBezierCurvePart.x2 + " " + (cubicBezierCurvePart.y2 + this._baselineOffset) + ", " + cubicBezierCurvePart.x3 + " " + (cubicBezierCurvePart.y3 + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, cubicBezierCurvePart.x1, cubicBezierCurvePart.x2, cubicBezierCurvePart.x3);
					bboxHeight = Math.max(bboxHeight, cubicBezierCurvePart.y1 + this._baselineOffset, cubicBezierCurvePart.y2 + this._baselineOffset, cubicBezierCurvePart.y3 + this._baselineOffset);
				}
			});

			var result =
				'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + (bboxWidth / this._drawingScale * this._scaleX).toFixed(3) + 'px" height="' + (bboxHeight / this._drawingScale * this._scaleY).toFixed(3) + 'px">\n' +
				'\t<g transform="scale(' + (1 / this._drawingScale * this._scaleX).toFixed(3) + ' ' + (1 / this._drawingScale * this._scaleY).toFixed(3) + ')">\n' +
				'\t\t<path d="' + path + '" />\n' +
				'\t</g>\n' +
				'</svg>';

			return <SVGSVGElement>domParser.parseFromString(result, "image/svg+xml").childNodes[0];
		}
	}

	var domParser: DOMParser;
	if (typeof DOMParser !== "undefined") {
		domParser = new DOMParser();
	}
}
