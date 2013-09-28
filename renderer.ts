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

module libjass {
	export class DefaultRenderer {
		private static _animationStyleElement: HTMLStyleElement = null;

		private _dialogues: Dialogue[];
		private _wrappers: HTMLDivElement[][] = [];

		private _currentTime: number;
		private _currentSubs: HTMLDivElement[] = [];

		private _preRenderedSubs: PreRenderedSubsMap = Object.create(null);

		// Iterable of subtitle div's that are also to be displayed
		private _newSubs: LazySequence<Node>;

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
				Lazy(this._dialogues)
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
							this._preRender(dialogue);
							return false;
						}
					})
					.map((dialogue: Dialogue) => {
						if (libjass.debugMode) {
							console.log(dialogue.toString());
						}

						// Display the dialogue and return the drawn subtitle div
						return this._wrappers[dialogue.layer][dialogue.alignment].appendChild(this.draw(dialogue));
					});


			// Create layer wrapper div's and the alignment div's inside each layer div
			var layers = new Set<number>();
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
				var allFonts = new Set<string>();

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

		/**
		 * Returns the subtitle div for display. The currentTime is used to shift the animations appropriately, so that at the time the
		 * div is inserted into the DOM and the animations begin, they are in sync with the video time.
		 *
		 * @param {libjass.Dialogue} dialogue
		 * @return {!HTMLDivElement}
		 */
		public draw(dialogue: Dialogue): HTMLDivElement {
			var preRenderedSub = this._preRenderedSubs[String(dialogue.id)];

			if (preRenderedSub === undefined) {
				if (libjass.debugMode) {
					console.warn("This dialogue was not pre-rendered. Call preRender() before calling draw() so that draw() is faster.");
				}

				this._preRenderedSubs[String(dialogue.id)] = preRenderedSub = this._preRender(dialogue);
			}

			var result = <HTMLDivElement>preRenderedSub.cloneNode(true);

			var animationEndCallback: () => void = () => removeElement(result);

			result.style.webkitAnimationDelay = (dialogue.start - this._currentTime) + "s";
			result.addEventListener("webkitAnimationEnd", animationEndCallback, false);

			result.style.animationDelay = (dialogue.start - this._currentTime) + "s";
			result.addEventListener("animationend", animationEndCallback, false);

			return result;
		}

		public addEventListener(type: string, listener: Object): void {
			var listeners = <Array<Object>>this._eventListeners[type];
			if (listeners) {
				listeners.push(listener);
			}
		}

		public resizeVideo(width: number, height: number): void {
			this._currentSubs.forEach(removeElement);

			this._currentSubs = [];

			this._video.style.width = this._subsWrapper.style.width = width + "px";
			this._video.style.height = this._subsWrapper.style.height = height + "px";

			this._ass.scaleTo(width, height);

			// Any dialogues which have been rendered need to be re-rendered.
			Object.keys(this._preRenderedSubs).forEach(key => {
				delete this._preRenderedSubs[key];
			});

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
					removeElement(sub);
					return false;
				}
			}).concat(this._newSubs.toArray()); // ... and add the new subs that are to be displayed.

			if (libjass.debugMode) {
				console.log("video.timeupdate: " + this._getVideoStateLogString());
			}
		}

		private _onVideoSeeking(): void {
			this._currentSubs.forEach(removeElement);

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
			var listeners = <Array<Object>>this._eventListeners[type];
			if (listeners) {
				listeners.forEach((listener: Function) => {
					listener.apply(this, args);
				});
			}
		}

		/**
		 * The magic happens here. The subtitle div is rendered and stored. Call draw() to get a clone of the div to display.
		 */
		private _preRender(dialogue: Dialogue): HTMLDivElement {
			if (this._preRenderedSubs[dialogue.id] !== undefined) {
				return this._preRenderedSubs[dialogue.id];
			}

			var sub = document.createElement("div");

			// Create an animation if there is a part that requires it
			var keyframes = new KeyframeCollection(dialogue.id, dialogue.start, dialogue.end);

			dialogue.parts.forEach(part => {
				if (part instanceof tags.Fade) {
					var fadePart = <tags.Fade>part;
					if (fadePart.start !== 0) {
						keyframes.add(dialogue.start, "opacity", "0");
						keyframes.add(dialogue.start + fadePart.start, "opacity", "1");
					}
					if (fadePart.end !== 0) {
						keyframes.add(dialogue.end - fadePart.end, "opacity", "1");
						keyframes.add(dialogue.end, "opacity", "0");
					}
				}
			});

			if (DefaultRenderer._animationStyleElement === null) {
				DefaultRenderer._animationStyleElement = <HTMLStyleElement>document.querySelector("#animation-styles");
			}
			DefaultRenderer._animationStyleElement.appendChild(document.createTextNode(keyframes.toString()));

			var scaleX = this._ass.scaleX;
			var scaleY = this._ass.scaleY;
			var dpi = this._ass.dpi;

			sub.style.webkitAnimationName = "dialogue-" + dialogue.id;
			sub.style.webkitAnimationDuration = (dialogue.end - dialogue.start) + "s";

			sub.style.animationName = "dialogue-" + dialogue.id;
			sub.style.animationDuration = (dialogue.end - dialogue.start) + "s";

			sub.style.marginLeft = (scaleX * dialogue.style.marginLeft) + "px";
			sub.style.marginRight = (scaleX * dialogue.style.marginRight) + "px";
			sub.style.marginTop = sub.style.marginBottom = (scaleY * dialogue.style.marginVertical) + "px";

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

				else if (part instanceof tags.Blur) {
					currentSpanStyles.blur = (<tags.Blur>part).value;
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
					// Already handled at the beginning of draw()
				}

				else if (part instanceof tags.Reset) {
					var newStyleName = (<tags.Reset>part).value;
					var newStyle: Style = null;
					if (newStyleName !== null) {
						newStyle = this._ass.styles.filter(style => style.name === newStyleName)[0];
					}
					currentSpanStyles.reset(newStyle);
				}

				else if (part instanceof tags.Pos) {
					// Will be handled at the end of draw()
				}

				else if (part instanceof tags.Fade) {
					// Already handled at the beginning of draw()
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

			if (divTransformStyle) {
				sub.style.webkitTransform = divTransformStyle;
				sub.style.webkitTransformOrigin = dialogue.transformOrigin;

				sub.style.transform = divTransformStyle;
				sub.style.transformOrigin = dialogue.transformOrigin;
			}

			dialogue.parts.some(part => {
				if (part instanceof tags.Pos) {
					var posPart = <tags.Pos>part;

					var absoluteWrapper = document.createElement("div");
					absoluteWrapper.style.position = "absolute";
					absoluteWrapper.style.left = (scaleX * posPart.x) + "px";
					absoluteWrapper.style.top = (scaleY * posPart.y) + "px";

					sub.style.position = "relative";

					var relativeTop: number;
					var relativeLeft: number;
					switch (dialogue.alignment) {
						case 1: relativeLeft =    0; relativeTop = -100; break;
						case 2: relativeLeft =  -50; relativeTop = -100; break;
						case 3: relativeLeft = -100; relativeTop = -100; break;
						case 4: relativeLeft =    0; relativeTop =  -50; break;
						case 5: relativeLeft =  -50; relativeTop =  -50; break;
						case 6: relativeLeft = -100; relativeTop =  -50; break;
						case 7: relativeLeft =    0; relativeTop =    0; break;
						case 8: relativeLeft =  -50; relativeTop =    0; break;
						case 9: relativeLeft = -100; relativeTop =    0; break;
					}
					sub.style.left = relativeLeft + "%";
					sub.style.top = relativeTop + "%";

					absoluteWrapper.appendChild(sub);

					sub = absoluteWrapper;

					return true;
				}

				return false;
			});

			sub.setAttribute("data-dialogue-id", String(dialogue.id));

			this._preRenderedSubs[dialogue.id] = sub;

			return sub;
		}

		/**
		 * Discards the pre-rendered subtitle div created from an earlier call to _preRender().
		 */
		private _unPreRender(dialogue: Dialogue): void {
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
	 */
	class KeyframeCollection {
		/** @type {!Object.<string, !Object.<string, string>>} */
		private _keyframes: Object = Object.create(null);

		constructor(private _id: number, private _start: number, private _end: number) { }

		/**
		 * Add a new keyframe at the given time that sets the given CSS property to the given value.
		 *
		 * @param {number} time
		 * @param {string} property
		 * @param {string} value
		 */
		add(time: number, property: string, value: string) {
			var step = (100 * (time - this._start) / (this._end - this._start)) + "%";
			this._keyframes[step] = this._keyframes[step] || {};
			this._keyframes[step][property] = value;
		}

		/**
		 * Creates a CSS3 animations representation of this keyframe collection.
		 *
		 * @return {string}
		 */
		toString(): string {
			var result = "";

			var steps = Object.keys(this._keyframes);
			if (steps.length > 0) {
				var cssText = "";

				steps.forEach(step => {
					cssText += "\t" + step + " {\n";
					var properties: Object = this._keyframes[step];
					Object.keys(properties).forEach(property => {
						cssText += "\t\t" + property + ": " + properties[property] + ";\n";
					});
					cssText += "\t}\n";
				});

				result =
				"@-webkit-keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n" +
				"@keyframes dialogue-" + this._id + " {\n" + cssText + "}\n\n";
			}

			return result;
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

			else if (this._blur > 0) {
				// TODO: Blur text
			}
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
