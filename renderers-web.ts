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

interface CSSStyleDeclaration {
	/**
	 * @type {string}
	 */
	webkitAnimation: string;

	/**
	 * @type {string}
	 */
	webkitAnimationDelay: string;

	/**
	 * @type {string}
	 */
	webkitFilter: string;

	/**
	 * @type {string}
	 */
	webkitTransform: string;

	/**
	 * @type {string}
	 */
	webkitTransformOrigin: string;
}

module libjass.renderers {
	/**
	 * A renderer implementation that draws subtitles to the given <div>
	 *
	 * @param {!libjass.ASS} ass
	 * @param {!libjass.renderers.Clock} clock
	 * @param {!HTMLDivElement} libjassSubsWrapper Subtitles will be rendered to this <div>
	 * @param {!libjass.renderers.RendererSettings} settings
	 */
	export class WebRenderer extends NullRenderer implements EventSource<string> {
		private _subsWrapper: HTMLDivElement;
		private _layerWrappers: HTMLDivElement[] = [];
		private _layerAlignmentWrappers: HTMLDivElement[][] = [];
		private _fontSizeElement: HTMLDivElement = null;
		private _animationStyleElement: HTMLStyleElement = null;
		private _svgDefsElement: SVGDefsElement = null;

		private _currentSubs: Map<Dialogue, HTMLDivElement> = new Map<Dialogue, HTMLDivElement>();
		private _preRenderedSubs: Map<number, { sub: HTMLDivElement; animationDelays: number[] }> = new Map<number, { sub: HTMLDivElement; animationDelays: number[] }>();

		private _scaleX: number;
		private _scaleY: number;

		constructor(ass: ASS, clock: Clock, private _libjassSubsWrapper: HTMLDivElement, settings?: RendererSettings) {
			super(ass, clock, (() => {
				if (!(_libjassSubsWrapper instanceof HTMLDivElement)) {
					var temp = settings;
					settings = <any>_libjassSubsWrapper;
					_libjassSubsWrapper = <any>temp;
					console.warn("WebRenderer's constructor now takes libjassSubsWrapper as the third parameter and settings as the fourth parameter. Please update the caller.");
				}

				return settings;
			})());

			this._libjassSubsWrapper.classList.add("libjass-wrapper");

			this._subsWrapper = document.createElement("div");
			this._libjassSubsWrapper.appendChild(this._subsWrapper);
			this._subsWrapper.className = "libjass-subs";

			this._fontSizeElement = document.createElement("div");
			this._libjassSubsWrapper.appendChild(this._fontSizeElement);
			this._fontSizeElement.className = "libjass-font-measure";
			this._fontSizeElement.appendChild(document.createTextNode("M"));

			var svgElement = <SVGSVGElement>document.createElementNS("http://www.w3.org/2000/svg", "svg");
			this._libjassSubsWrapper.appendChild(svgElement);
			svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			svgElement.setAttribute("version", "1.1");
			svgElement.setAttribute("class", "libjass-filters");
			svgElement.setAttribute("width", "0");
			svgElement.setAttribute("height", "0");

			this._svgDefsElement = <SVGDefsElement>document.createElementNS("http://www.w3.org/2000/svg", "defs");
			svgElement.appendChild(this._svgDefsElement);

			// Preload fonts

			var urlsToPreload = new Set<string>();
			if (this.settings.fontMap !== null) {
				this.settings.fontMap.forEach(srcs => {
					srcs.forEach(src => urlsToPreload.add(src));
				});
			}

			if (libjass.debugMode) {
				console.log("Preloading " + urlsToPreload.size + " fonts...");
			}

			var xhrPromises: Promise<void>[] = [];
			urlsToPreload.forEach(url => {
				xhrPromises.push(new Promise<void>((resolve, reject) => {
					var xhr = new XMLHttpRequest();
					xhr.addEventListener("load", () => {
						if (libjass.debugMode) {
							console.log("Preloaded " + url + ".");
						}

						resolve(null);
					});
					xhr.open("GET", url, true);
					xhr.send();
				}));
			});

			Promise.all(xhrPromises).then(() => {
				if (libjass.debugMode) {
					console.log("All fonts have been preloaded.");
				}

				this._ready();
			});
		}

		/**
		 * @type {!HTMLDivElement}
		 */
		get libjassSubsWrapper(): HTMLDivElement {
			return this._libjassSubsWrapper;
		}

		/**
		 * Resize the subtitles to the given new dimensions.
		 *
		 * @param {number} width
		 * @param {number} height
		 */
		resize(width: number, height: number): void {
			this._removeAllSubs();

			var ratio = Math.min(width / this.ass.properties.resolutionX, height / this.ass.properties.resolutionY);
			var subsWrapperWidth = this.ass.properties.resolutionX * ratio;
			var subsWrapperHeight = this.ass.properties.resolutionY * ratio;
			this._subsWrapper.style.width = subsWrapperWidth.toFixed(3) + "px";
			this._subsWrapper.style.height = subsWrapperHeight.toFixed(3) + "px";
			this._subsWrapper.style.left = ((width - subsWrapperWidth) / 2).toFixed(3) + "px";
			this._subsWrapper.style.top = ((height - subsWrapperHeight) / 2).toFixed(3) + "px";

			this._scaleX = subsWrapperWidth / this.ass.properties.resolutionX;
			this._scaleY = subsWrapperHeight / this.ass.properties.resolutionY;

			// Any dialogues which have been pre-rendered will need to be pre-rendered again.
			this._preRenderedSubs.clear();

			if (this._animationStyleElement !== null) {
				while (this._animationStyleElement.firstChild !== null) {
					this._animationStyleElement.removeChild(this._animationStyleElement.firstChild);
				}
			}

			while (this._svgDefsElement.firstChild !== null) {
				this._svgDefsElement.removeChild(this._svgDefsElement.firstChild);
			}

			// this.currentTime will be -1 if resize() is called before the clock begins playing for the first time. In this situation, there is no need to force a redraw.
			if (this.clock.currentTime !== -1) {
				this._onClockTick();
			}
		}

		/**
		 * The magic happens here. The subtitle div is rendered and stored. Call {@link libjass.renderers.WebRenderer.draw} to get a clone of the div to display.
		 *
		 * @param {!libjass.Dialogue} dialogue
		 */
		preRender(dialogue: Dialogue): void {
			if (this._preRenderedSubs.has(dialogue.id)) {
				return;
			}

			var sub = document.createElement("div");

			sub.style.marginLeft = (this._scaleX * dialogue.style.marginLeft).toFixed(3) + "px";
			sub.style.marginRight = (this._scaleX * dialogue.style.marginRight).toFixed(3) + "px";
			sub.style.marginTop = sub.style.marginBottom = (this._scaleY * dialogue.style.marginVertical).toFixed(3) + "px";
			sub.style.minWidth = (this._subsWrapper.offsetWidth - this._scaleX * (dialogue.style.marginLeft + dialogue.style.marginRight)).toFixed(3) + "px";

			var animationCollection = new AnimationCollection(this, dialogue);

			var currentSpan: HTMLSpanElement = null;
			var currentSpanStyles = new SpanStyles(this, dialogue, this._scaleX, this._scaleY, this.settings, this._fontSizeElement, this._svgDefsElement);

			var startNewSpan = (addNewLine: boolean): void => {
				if (currentSpan !== null && currentSpan.textContent !== "") {
					sub.appendChild(currentSpanStyles.setStylesOnSpan(currentSpan));
				}

				if (addNewLine) {
					sub.appendChild(document.createElement("br"));
				}

				currentSpan = document.createElement("span");
			};
			startNewSpan(false);

			var currentDrawingStyles: DrawingStyles = new DrawingStyles(this._scaleX, this._scaleY);

			var wrappingStyle = this.ass.properties.wrappingStyle;

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
					currentSpanStyles.outlineWidth = (<parts.Border>part).value;
					currentSpanStyles.outlineHeight = (<parts.Border>part).value;
				}

				else if (part instanceof parts.BorderX) {
					currentSpanStyles.outlineWidth = (<parts.BorderX>part).value;
				}

				else if (part instanceof parts.BorderY) {
					currentSpanStyles.outlineHeight = (<parts.BorderY>part).value;
				}

				else if (part instanceof parts.Shadow) {
					currentSpanStyles.shadowDepthX = (<parts.Shadow>part).value;
					currentSpanStyles.shadowDepthY = (<parts.Shadow>part).value;
				}

				else if (part instanceof parts.ShadowX) {
					currentSpanStyles.shadowDepthX = (<parts.ShadowX>part).value;
				}

				else if (part instanceof parts.ShadowY) {
					currentSpanStyles.shadowDepthY = (<parts.ShadowY>part).value;
				}

				else if (part instanceof parts.Blur) {
					currentSpanStyles.blur = (<parts.Blur>part).value;
				}

				else if (part instanceof parts.GaussianBlur) {
					currentSpanStyles.gaussianBlur = (<parts.GaussianBlur>part).value;
				}

				else if (part instanceof parts.FontName) {
					currentSpanStyles.fontName = (<parts.FontName>part).value;
				}

				else if (part instanceof parts.FontSize) {
					currentSpanStyles.fontSize = (<parts.FontSize>part).value;
				}

				else if (part instanceof parts.FontSizePlus) {
					currentSpanStyles.fontSize += (<parts.FontSizePlus>part).value;
				}

				else if (part instanceof parts.FontSizeMinus) {
					currentSpanStyles.fontSize -= (<parts.FontSizeMinus>part).value;
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
					currentSpanStyles.rotationX = (<parts.RotateX>part).value;
				}

				else if (part instanceof parts.RotateY) {
					currentSpanStyles.rotationY = (<parts.RotateY>part).value;
				}

				else if (part instanceof parts.RotateZ) {
					currentSpanStyles.rotationZ = (<parts.RotateZ>part).value;
				}

				else if (part instanceof parts.SkewX) {
					currentSpanStyles.skewX = (<parts.SkewX>part).value;
				}

				else if (part instanceof parts.SkewY) {
					currentSpanStyles.skewY = (<parts.SkewY>part).value;
				}

				else if (part instanceof parts.PrimaryColor) {
					currentSpanStyles.primaryColor = (<parts.PrimaryColor>part).value;
				}

				else if (part instanceof parts.SecondaryColor) {
					currentSpanStyles.secondaryColor = (<parts.SecondaryColor>part).value;
				}

				else if (part instanceof parts.OutlineColor) {
					currentSpanStyles.outlineColor = (<parts.OutlineColor>part).value;
				}

				else if (part instanceof parts.ShadowColor) {
					currentSpanStyles.shadowColor = (<parts.ShadowColor>part).value;
				}

				else if (part instanceof parts.Alpha) {
					currentSpanStyles.primaryAlpha = (<parts.Alpha>part).value;
					currentSpanStyles.secondaryAlpha = (<parts.Alpha>part).value;
					currentSpanStyles.outlineAlpha = (<parts.Alpha>part).value;
					currentSpanStyles.shadowAlpha = (<parts.Alpha>part).value;
				}

				else if (part instanceof parts.PrimaryAlpha) {
					currentSpanStyles.primaryAlpha = (<parts.PrimaryAlpha>part).value;
				}

				else if (part instanceof parts.SecondaryAlpha) {
					currentSpanStyles.secondaryAlpha = (<parts.SecondaryAlpha>part).value;
				}

				else if (part instanceof parts.OutlineAlpha) {
					currentSpanStyles.outlineAlpha = (<parts.OutlineAlpha>part).value;
				}

				else if (part instanceof parts.ShadowAlpha) {
					currentSpanStyles.shadowAlpha = (<parts.ShadowAlpha>part).value;
				}

				else if (part instanceof parts.Alignment) {
					// Already handled in Dialogue
				}

				else if (part instanceof parts.WrappingStyle) {
					wrappingStyle = (<parts.WrappingStyle>part).value;
				}

				else if (part instanceof parts.Reset) {
					var newStyleName = (<parts.Reset>part).value;
					var newStyle: Style = null;
					if (newStyleName !== null) {
						newStyle = this.ass.styles.get(newStyleName);
					}
					currentSpanStyles.reset(newStyle);
				}

				else if (part instanceof parts.Position) {
					var positionPart = <parts.Position>part;

					sub.style.position = "absolute";
					sub.style.left = (this._scaleX * positionPart.x).toFixed(3) + "px";
					sub.style.top = (this._scaleY * positionPart.y).toFixed(3) + "px";
				}

				else if (part instanceof parts.Move) {
					var movePart = <parts.Move>part;

					sub.style.position = "absolute";
					animationCollection.add("linear", [new Keyframe(0, new Map([
						["left", (this._scaleX * movePart.x1).toFixed(3) + "px"],
						["top", (this._scaleY * movePart.y1).toFixed(3) + "px"],
					])), new Keyframe(movePart.t1, new Map([
						["left", (this._scaleX * movePart.x1).toFixed(3) + "px"],
						["top", (this._scaleY * movePart.y1).toFixed(3) + "px"],
					])), new Keyframe(movePart.t2, new Map([
						["left", (this._scaleX * movePart.x2).toFixed(3) + "px"],
						["top", (this._scaleY * movePart.y2).toFixed(3) + "px"],
					])), new Keyframe(dialogue.end - dialogue.start, new Map([
						["left", (this._scaleX * movePart.x2).toFixed(3) + "px"],
						["top", (this._scaleY * movePart.y2).toFixed(3) + "px"],
					]))]);
				}

				else if (part instanceof parts.Fade) {
					var fadePart = <parts.Fade>part;

					animationCollection.add("linear", [new Keyframe(0, new Map([
						["opacity", "0"],
					])), new Keyframe(fadePart.start, new Map([
						["opacity", "1"],
					])), new Keyframe(dialogue.end - dialogue.start - fadePart.end, new Map([
						["opacity", "1"],
					])), new Keyframe(dialogue.end - dialogue.start, new Map([
						["opacity", "0"],
					]))]);
				}

				else if (part instanceof parts.ComplexFade) {
					var complexFadePart = <parts.ComplexFade>part;

					animationCollection.add("linear", [new Keyframe(0, new Map([
						["opacity", complexFadePart.a1.toFixed(3)],
					])), new Keyframe(complexFadePart.t1, new Map([
						["opacity", complexFadePart.a1.toFixed(3)],
					])), new Keyframe(complexFadePart.t2, new Map([
						["opacity", complexFadePart.a2.toFixed(3)],
					])), new Keyframe(complexFadePart.t3, new Map([
						["opacity", complexFadePart.a2.toFixed(3)],
					])), new Keyframe(complexFadePart.t4, new Map([
						["opacity", complexFadePart.a3.toFixed(3)],
					])), new Keyframe(dialogue.end - dialogue.start, new Map([
						["opacity", complexFadePart.a3.toFixed(3)],
					]))]);
				}

				else if (part instanceof parts.DrawingMode) {
					var drawingModePart = <parts.DrawingMode>part;
					if (drawingModePart.scale !== 0) {
						currentDrawingStyles.scale = drawingModePart.scale;
					}
				}

				else if (part instanceof parts.DrawingBaselineOffset) {
					currentDrawingStyles.baselineOffset = (<parts.DrawingBaselineOffset>part).value;
				}

				else if (part instanceof parts.DrawingInstructions) {
					currentSpan.appendChild(currentDrawingStyles.toSVG(<parts.DrawingInstructions>part, currentSpanStyles.primaryColor.withAlpha(currentSpanStyles.primaryAlpha)));
					startNewSpan(false);
				}

				else if (part instanceof parts.Text) {
					currentSpan.appendChild(document.createTextNode((<parts.Text>part).value));
					startNewSpan(false);
				}

				else if (libjass.debugMode && part instanceof parts.Comment) {
					currentSpan.appendChild(document.createTextNode((<parts.Comment>part).value));
					startNewSpan(false);
				}

				else if (part instanceof parts.NewLine) {
					startNewSpan(true);
				}
			});

			dialogue.parts.some(part => {
				if (part instanceof parts.Position || part instanceof parts.Move) {
					var transformOrigin = WebRenderer._transformOrigins[dialogue.alignment];

					var divTransformStyle = "translate(" + (-transformOrigin[0]) + "%, " + (-transformOrigin[1]) + "%) translate(-" + sub.style.marginLeft + ", -" + sub.style.marginTop + ")";
					var transformOriginString = transformOrigin[0] + "% " + transformOrigin[1] + "%";

					sub.style.webkitTransform = divTransformStyle;
					sub.style.webkitTransformOrigin = transformOriginString;

					sub.style.transform = divTransformStyle;
					sub.style.transformOrigin = transformOriginString;

					return true;
				}

				return false;
			});

			switch (wrappingStyle) {
				case WrappingStyle.SmartWrappingWithWiderTopLine:
				case WrappingStyle.SmartWrappingWithWiderBottomLine:
					sub.style.whiteSpace = "pre-wrap";
					break;

				case WrappingStyle.EndOfLineWrapping:
				case WrappingStyle.NoLineWrapping:
					sub.style.whiteSpace = "pre";
					break;
			}

			if (sub.style.position !== "") {
				// Explicitly set text alignment on absolutely-positioned subs because they'll go in a .an0 <div> and so won't get alignment CSS text-align.
				switch (dialogue.alignment) {
					case 1: case 4: case 7: sub.style.textAlign = "left"; break;
					case 2: case 5: case 8: sub.style.textAlign = "center"; break;
					case 3: case 6: case 9: sub.style.textAlign = "right"; break;
				}
			}

			if (this._animationStyleElement === null) {
				this._animationStyleElement = document.createElement("style");
				this._animationStyleElement.id = "libjass-animation-styles-" + this.id;
				this._animationStyleElement.type = "text/css";
				document.querySelector("head").appendChild(this._animationStyleElement);
			}

			this._animationStyleElement.appendChild(document.createTextNode(animationCollection.cssText));

			sub.style.webkitAnimation = animationCollection.animationStyle;
			sub.style.animation = animationCollection.animationStyle;

			sub.setAttribute("data-dialogue-id", this.id + "-" + dialogue.id);

			this._preRenderedSubs.set(dialogue.id, { sub: sub, animationDelays: animationCollection.animationDelays });
		}

		/**
		 * Returns the subtitle div for display. The {@link libjass.renderers.WebRenderer.currentTime} is used to shift the animations appropriately, so that at the time the
		 * div is inserted into the DOM and the animations begin, they are in sync with the clock time.
		 *
		 * @param {!libjass.Dialogue} dialogue
		 */
		draw(dialogue: Dialogue): void {
			if (this._currentSubs.has(dialogue)) {
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

				if (libjass.debugMode) {
					console.log(dialogue.toString());
				}
			}

			var result = <HTMLDivElement>preRenderedSub.sub.cloneNode(true);

			var animationDelay = preRenderedSub.animationDelays.map(delay => ((delay + dialogue.start - this.clock.currentTime) / this.clock.rate).toFixed(3) + "s").join(", ");
			result.style.webkitAnimationDelay = animationDelay;
			result.style.animationDelay = animationDelay;

			var layer = dialogue.layer;
			var alignment = (result.style.position === "absolute") ? 0 : dialogue.alignment; // Alignment 0 is for absolutely-positioned subs

			// Create the layer wrapper div and the alignment div inside it if not already created
			if (this._layerWrappers[layer] === undefined) {
				var layerWrapper = document.createElement("div");
				layerWrapper.className = "layer layer" + layer;

				// Find the next greater layer div and insert this div before that one
				var insertBeforeElement: HTMLDivElement = null;
				for (var insertBeforeLayer = layer + 1; insertBeforeLayer < this._layerWrappers.length && insertBeforeElement === null; insertBeforeLayer++) {
					if (this._layerWrappers[insertBeforeLayer] !== undefined) {
						insertBeforeElement = this._layerWrappers[insertBeforeLayer];
					}
				}

				this._subsWrapper.insertBefore(layerWrapper, insertBeforeElement);

				this._layerWrappers[layer] = layerWrapper;
				this._layerAlignmentWrappers[layer] = [];
			}

			if (this._layerAlignmentWrappers[layer][alignment] === undefined) {
				var layerAlignmentWrapper = document.createElement("div");
				layerAlignmentWrapper.className = "an an" + alignment;

				// Find the next greater layer,alignment div and insert this div before that one
				var layerWrapper = this._layerWrappers[layer];
				var insertBeforeElement: HTMLDivElement = null;
				for (var insertBeforeAlignment = alignment + 1; insertBeforeAlignment < this._layerAlignmentWrappers[layer].length && insertBeforeElement === null; insertBeforeAlignment++) {
					if (this._layerAlignmentWrappers[layer][insertBeforeAlignment] !== undefined) {
						insertBeforeElement = this._layerAlignmentWrappers[layer][insertBeforeAlignment];
					}
				}

				layerWrapper.insertBefore(layerAlignmentWrapper, insertBeforeElement);

				this._layerAlignmentWrappers[layer][alignment] = layerAlignmentWrapper;
			}

			this._layerAlignmentWrappers[layer][alignment].appendChild(result);

			this._currentSubs.set(dialogue, result);
		}

		protected _onClockPlay(): void {
			super._onClockPlay();

			this._removeAllSubs();

			this._subsWrapper.style.display = "";

			this._subsWrapper.classList.remove("paused");
		}

		protected _onClockTick(): void {
			// Remove dialogues that should be removed before adding new ones via super._onClockTick()

			var currentTime = this.clock.currentTime;

			this._currentSubs.forEach((sub: HTMLDivElement, dialogue: Dialogue) => {
				if (dialogue.start > currentTime || dialogue.end < currentTime) {
					this._currentSubs.delete(dialogue);
					this._removeSub(sub);
				}
			});

			super._onClockTick();
		}

		protected _onClockPause(): void {
			super._onClockPause();

			this._subsWrapper.classList.add("paused");
		}

		protected _onClockStop(): void {
			super._onClockStop();

			this._subsWrapper.style.display = "none";
		}

		protected _onClockRateChange(): void {
			super._onClockRateChange();

			// Any dialogues which have been pre-rendered will need to be pre-rendered again.
			this._preRenderedSubs.clear();

			if (this._animationStyleElement !== null) {
				while (this._animationStyleElement.firstChild !== null) {
					this._animationStyleElement.removeChild(this._animationStyleElement.firstChild);
				}
			}

			while (this._svgDefsElement.firstChild !== null) {
				this._svgDefsElement.removeChild(this._svgDefsElement.firstChild);
			}
		}

		protected _ready(): void {
			this._dispatchEvent("ready", []);
		}

		/**
		 * @param {!HTMLDivElement} sub
		 */
		private _removeSub(sub: HTMLDivElement): void {
			sub.parentNode.removeChild(sub);
		}

		private _removeAllSubs(): void {
			this._currentSubs.forEach((sub: HTMLDivElement) => this._removeSub(sub));
			this._currentSubs.clear();
		}

		private static _transformOrigins: number[][] = [
			null,
			[0, 100], [50, 100], [100, 100],
			[0, 50], [50, 50], [100, 50],
			[0, 0], [50, 0], [100, 0]
		];

		// EventSource members

		/**
		 * @type {!Map.<T, !Array.<Function>>}
		 */
		_eventListeners: Map<string, Function[]> = new Map<string, Function[]>();

		/**
		 * @type {function(number, !Function)}
		 */
		addEventListener: (type: string, listener: Function) => void;

		/**
		 * @type {function(number, Array.<*>)}
		 */
		_dispatchEvent: (type: string, args: Object[]) => void;
	}
	mixin(WebRenderer, [EventSource]);

	/**
	 * This class represents a single keyframe. It has a list of CSS properties (names and values) associated with a point in time. Multiple keyframes make up an animation.
	 *
	 * @param {number} time
	 * @param {!Object.<string, string>} properties
	 */
	class Keyframe {
		constructor(private _time: number, private _properties: Map<string, string>) { }

		/**
		 * @type {number}
		 */
		get time(): number {
			return this._time;
		}

		/**
		 * @type {!Object.<string, string>}
		 */
		get properties(): Map<string, string> {
			return this._properties;
		}
	}

	/**
	 * This class represents a collection of animations. Each animation contains one or more keyframes.
	 * The collection can then be converted to a CSS3 representation.
	 *
	 * @param {!libjass.renderers.NullRenderer} renderer The renderer that this collection is associated with
	 * @param {!libjass.Dialogue} dialogue The Dialogue that this collection is associated with
	 */
	class AnimationCollection {
		private _id: string;
		private _start: number;
		private _end: number;
		private _rate: number;

		private _cssText: string = "";
		private _animationStyle: string = "";
		private _animationDelays: number[] = [];
		private _numAnimations: number = 0;

		constructor(renderer: NullRenderer, dialogue: Dialogue) {
			this._id = renderer.id + "-" + dialogue.id;
			this._start = dialogue.start;
			this._end = dialogue.end;
			this._rate = renderer.clock.rate;
		}

		/**
		 * This string contains the animation definitions and should be inserted into a <style> element.
		 *
		 * @type {string}
		 */
		get cssText(): string {
			return this._cssText;
		}

		/**
		 * This string should be set as the "animation" CSS property of the target element.
		 *
		 * @type {string}
		 */
		get animationStyle(): string {
			return this._animationStyle;
		}

		/**
		 * This array should be used to set the "animation-delay" CSS property of the target element.
		 *
		 * @type {!Array.<number>}
		 */
		get animationDelays(): number[] {
			return this._animationDelays;
		}

		/**
		 * Add an animation to this collection. The given keyframes together make one animation.
		 *
		 * @param {string} timingFunction One of the acceptable values for the "animation-timing-function" CSS property
		 * @param {Array.<!{time: number, properties: !Object.<string, string>}>} keyframes
		 */
		add(timingFunction: string, keyframes: Keyframe[]): void {
			var startTime: number = null;
			var endTime: number = null;

			var ruleCssText = "";

			keyframes.forEach(keyframe => {
				if (startTime === null) {
					startTime = keyframe.time;
				}

				endTime = keyframe.time;

				ruleCssText += "\t" + (100 * keyframe.time / (this._end - this._start)).toFixed(3) + "% {\n";

				keyframe.properties.forEach((value, name) => {
					ruleCssText += "\t\t" + name + ": " + value + ";\n";
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

			this._animationStyle += animationName + " " + ((endTime - startTime) / this._rate).toFixed(3) + "s " + timingFunction;
			this._animationDelays.push(startTime);
		}
	}

	/**
	 * This class represents the style attribute of a span.
	 * As a Dialogue's div is rendered, individual parts are added to span's, and this class is used to maintain the style attribute of those.
	 *
	 * @param {!libjass.renderers.NullRenderer} renderer The renderer that this set of styles is associated with
	 * @param {!libjass.Dialogue} dialogue The Dialogue that this set of styles is associated with
	 * @param {number} scaleX The horizontal scaling of the subtitles
	 * @param {number} scaleY The vertical scaling of the subtitles
	 * @param {!libjass.renderers.RendererSettings} settings The renderer settings
	 * @param {!HTMLDivElement} fontSizeElement A <div> element to measure font sizes with
	 * @param {!SVGDefsElement} svgDefsElement An SVG <defs> element to append filter definitions to
	 */
	class SpanStyles {
		private static _fontSizeCache: Map<string, Map<number, number>> = new Map<string, Map<number, number>>();

		private _id: string;
		private _defaultStyle: Style;

		private _italic: boolean;
		private _bold: Object;
		private _underline: boolean;
		private _strikeThrough: boolean;

		private _outlineWidth: number;
		private _outlineHeight: number;

		private _shadowDepthX: number;
		private _shadowDepthY: number;

		private _fontName: string;
		private _fontSize: number;

		private _fontScaleX: number;
		private _fontScaleY: number;

		private _letterSpacing: number;

		private _rotationX: number;
		private _rotationY: number;
		private _rotationZ: number;

		private _skewX: number;
		private _skewY: number;

		private _primaryColor: parts.Color;
		private _secondaryColor: parts.Color;
		private _outlineColor: parts.Color;
		private _shadowColor: parts.Color;

		private _primaryAlpha: number;
		private _secondaryAlpha: number;
		private _outlineAlpha: number;
		private _shadowAlpha: number;

		private _blur: number;
		private _gaussianBlur: number;

		private _nextFilterId = 0;

		constructor(renderer: WebRenderer, dialogue: Dialogue, private _scaleX: number, private _scaleY: number, private _settings: RendererSettings, private _fontSizeElement: HTMLDivElement, private _svgDefsElement: SVGDefsElement) {
			this._id = renderer.id + "-" + dialogue.id;
			this._defaultStyle = dialogue.style;

			this.reset(null);
		}

		/**
		 * Resets the styles to the defaults provided by the argument.
		 *
		 * @param {libjass.Style} newStyle The new defaults to reset the style to. If null, the styles are reset to the default style of the Dialogue.
		 */
		reset(newStyle: Style): void {
			if (newStyle === undefined || newStyle === null) {
				newStyle = this._defaultStyle;
			}

			this.italic = newStyle.italic;
			this.bold = newStyle.bold;
			this.underline = newStyle.underline;
			this.strikeThrough = newStyle.strikeThrough;

			this.outlineWidth = newStyle.outlineThickness;
			this.outlineHeight = newStyle.outlineThickness;

			this.shadowDepthX = newStyle.shadowDepth;
			this.shadowDepthY = newStyle.shadowDepth;

			this.fontName = newStyle.fontName;
			this.fontSize = newStyle.fontSize;

			this.fontScaleX = newStyle.fontScaleX;
			this.fontScaleY = newStyle.fontScaleY;

			this.letterSpacing = newStyle.letterSpacing;

			this._rotationX = null;
			this._rotationY = null;
			this._rotationZ = newStyle.rotationZ;

			this._skewX = null;
			this._skewY = null;

			this.primaryColor = newStyle.primaryColor;
			this.secondaryColor = newStyle.secondaryColor;
			this.outlineColor = newStyle.outlineColor;
			this.shadowColor = newStyle.shadowColor;

			this.primaryAlpha = null;
			this.secondaryAlpha = null;
			this.outlineAlpha = null;
			this.shadowAlpha = null;

			this.blur = null;
			this.gaussianBlur = null;
		}

		/**
		 * Sets the style attribute on the given span element.
		 *
		 * @param {!HTMLSpanElement} span
		 * @return {!HTMLSpanElement} The resulting <span> with the CSS styles applied. This may be a wrapper around the input <span> if the styles were applied using SVG filters.
		 */
		setStylesOnSpan(span: HTMLSpanElement): HTMLSpanElement {
			var isTextOnlySpan = span.childNodes[0] instanceof Text;

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
			var fontSize: string;
			if (isTextOnlySpan) {
				fontSize = (this._scaleY * SpanStyles._getFontSize(this._fontName, this._fontSize * this._fontScaleX, this._fontSizeElement)).toFixed(3);
			}
			else {
				fontSize = (this._scaleY * SpanStyles._getFontSize(this._fontName, this._fontSize, this._fontSizeElement)).toFixed(3);
			}
			var lineHeight = (this._scaleY * this._fontSize).toFixed(3);
			span.style.font = fontStyleOrWeight + fontSize + "px/" + lineHeight + "px \"" + this._fontName + "\"";

			var textDecoration = "";
			if (this._underline) {
				textDecoration = "underline";
			}
			if (this._strikeThrough) {
				textDecoration += " line-through";
			}
			span.style.textDecoration = textDecoration.trim();

			var transform = "";
			if (isTextOnlySpan) {
				if (this._fontScaleY !== this._fontScaleX) {
					transform += "scaleY(" + (this._fontScaleY / this._fontScaleX).toFixed(3) + ") ";
				}
			}
			else {
				if (this._fontScaleX !== 1) {
					transform += "scaleX(" + this._fontScaleX + ") ";
				}
				if (this._fontScaleY !== 1) {
					transform += "scaleY(" + this._fontScaleY + ") ";
				}
			}
			if (this._rotationY !== null) {
				transform += "rotateY(" + this._rotationY + "deg) ";
			}
			if (this._rotationX !== null) {
				transform += "rotateX(" + this._rotationX + "deg) ";
			}
			if (this._rotationZ !== 0) {
				transform += "rotateZ(" + (-1 * this._rotationZ) + "deg) ";
			}
			if (this._skewX !== null || this._skewY !== null) {
				var skewX = SpanStyles._valueOrDefault(this._skewX, 0);
				var skewY = SpanStyles._valueOrDefault(this._skewY, 0);
				transform += "matrix(1, " + skewY + ", " + skewX + ", 1, 0, 0) ";
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

			var outlineWidth = this._scaleX * this._outlineWidth;
			var outlineHeight = this._scaleY * this._outlineHeight;

			var outlineFilter = '';
			var blurFilter = '';

			if (this._settings.enableSvg) {
				var filterId = "svg-filter-" + this._id + "-" + this._nextFilterId++;

				if (outlineWidth > 0 || outlineHeight > 0) {
					/* Construct an elliptical border by merging together many rectangles. The border is creating using dilate morphology filters, but these only support
					 * generating rectangles.   http://lists.w3.org/Archives/Public/public-fx/2012OctDec/0003.html
					 */

					var mergeOutlinesFilter = '';

					var outlineNumber = 0;

					var increment = (!this._settings.preciseOutlines && this._gaussianBlur > 0) ? this._gaussianBlur : 1;

					((addOutline: (x: number, y: number) => void) => {
						if (outlineWidth <= outlineHeight) {
							if (outlineWidth > 0) {
								for (var x = 0; x <= outlineWidth; x += increment) {
									addOutline(x, outlineHeight / outlineWidth * Math.sqrt(outlineWidth * outlineWidth - x * x));
								}
								if (x !== outlineWidth + increment) {
									addOutline(outlineWidth, 0);
								}
							}
							else {
								addOutline(0, outlineHeight);
							}
						}
						else {
							if (outlineHeight > 0) {
								for (var y = 0; y <= outlineHeight; y += increment) {
									addOutline(outlineWidth / outlineHeight * Math.sqrt(outlineHeight * outlineHeight - y * y), y);
								}
								if (y !== outlineHeight + increment) {
									addOutline(0, outlineHeight);
								}
							}
							else {
								addOutline(outlineWidth, 0);
							}
						}
					})((x: number, y: number): void => {
						outlineFilter +=
							'\t<feMorphology in="SourceAlpha" operator="dilate" radius="' + x.toFixed(3) + ' ' + y.toFixed(3) + '" result="outline' + outlineNumber + '" />\n';

						mergeOutlinesFilter +=
							'\t\t<feMergeNode in="outline' + outlineNumber + '" />\n';

						outlineNumber++;
					});

					outlineFilter +=
						'\t<feMerge result="outline">\n' +
						mergeOutlinesFilter +
						'\t</feMerge>\n' +
						'\t<feFlood flood-color="' + outlineColor.toString() + '" />' +
						'\t<feComposite operator="in" in2="outline" />';
				}

				if (this._gaussianBlur > 0) {
					blurFilter +=
						'\t<feGaussianBlur stdDeviation="' + this._gaussianBlur + '" />\n';
				}
				for (var i = 0; i < this._blur; i++) {
					blurFilter +=
						'\t<feConvolveMatrix kernelMatrix="1 2 1 2 4 2 1 2 1" edgeMode="none" />\n';
				}
			}
			else {
				if (outlineWidth > 0 || outlineHeight > 0) {
					var outlineCssString = "";

					((addOutline: (x: number, y: number) => void) => {
						for (var x = 0; x <= outlineWidth; x++) {
							var maxY = (outlineWidth === 0) ? outlineHeight : outlineHeight * Math.sqrt(1 - ((x * x) / (outlineWidth * outlineWidth)));
							for (var y = 0; y <= maxY; y++) {
								addOutline(x, y);

								if (x !== 0) {
									addOutline(-x, y);
								}

								if (y !== 0) {
									addOutline(x, -y);
								}

								if (x !== 0 && y !== 0) {
									addOutline(-x, -y);
								}
							}
						}
					})((x: number, y: number): void => {
						outlineCssString += ", " + outlineColor.toString() + " " + x + "px " + y + "px " + this._gaussianBlur.toFixed(3) + "px";
					});

					span.style.textShadow = outlineCssString.substr(", ".length);
				}
			}

			var filterWrapperSpan = document.createElement("span");
			filterWrapperSpan.appendChild(span);

			if (outlineFilter !== '' || blurFilter !== '') {
				var filterString =
					'<filter xmlns="http://www.w3.org/2000/svg" id="' + filterId + '" x="-50%" width="200%" y="-50%" height="200%">\n' +
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

			if (this._shadowDepthX !== 0 || this._shadowDepthY !== 0) {
				var shadowColor = this._shadowColor.withAlpha(this._shadowAlpha);
				var shadowCssString = shadowColor.toString() + " " + (this._shadowDepthX * this._scaleX / this._fontScaleX).toFixed(3) + "px " + (this._shadowDepthY * this._scaleY / this._fontScaleY).toFixed(3) + "px 0px";
				if (span.style.textShadow === "") {
					span.style.textShadow = shadowCssString;
				}
				else {
					span.style.textShadow += ", " + shadowCssString;
				}
			}

			if (this._rotationX !== 0 || this._rotationY !== 0) {
				// Perspective needs to be set on a "transformable element"
				filterWrapperSpan.style.display = "inline-block";
			}

			return filterWrapperSpan;
		}

		/**
		 * Sets the italic property. null defaults it to the default style's value.
		 *
		 * @type {?boolean}
		 */
		set italic(value: boolean) {
			this._italic = SpanStyles._valueOrDefault(value, this._defaultStyle.italic);
		}

		/**
		 * Sets the bold property. null defaults it to the default style's value.
		 *
		 * @type {(?number|?boolean)}
		 */
		set bold(value: Object) {
			this._bold = SpanStyles._valueOrDefault(value, this._defaultStyle.bold);
		}

		/**
		 * Sets the underline property. null defaults it to the default style's value.
		 *
		 * @type {?boolean}
		 */
		set underline(value: boolean) {
			this._underline = SpanStyles._valueOrDefault(value, this._defaultStyle.underline);
		}

		/**
		 * Sets the strike-through property. null defaults it to the default style's value.
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
		set outlineWidth(value: number) {
			this._outlineWidth = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineThickness);
		}

		/**
		 * Sets the outline height property. null defaults it to the style's original outline height value.
		 *
		 * @type {?number}
		 */
		set outlineHeight(value: number) {
			this._outlineHeight = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineThickness);
		}

		/**
		 * Sets the outline width property. null defaults it to the style's original shadow depth X value.
		 *
		 * @type {?number}
		 */
		set shadowDepthX(value: number) {
			this._shadowDepthX = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
		}

		/**
		 * Sets the shadow height property. null defaults it to the style's original shadow depth Y value.
		 *
		 * @type {?number}
		 */
		set shadowDepthY(value: number) {
			this._shadowDepthY = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
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
		 * Sets the Gaussian blur property. null defaults it to 0.
		 *
		 * @type {?number}
		 */
		set gaussianBlur(value: number) {
			this._gaussianBlur = SpanStyles._valueOrDefault(value, 0);
		}

		/**
		 * Sets the font name property. null defaults it to the default style's value.
		 *
		 * @type {?string}
		 */
		set fontName(value: string) {
			this._fontName = SpanStyles._valueOrDefault(value, this._defaultStyle.fontName);
		}

		/**
		 * Sets the font size property. null defaults it to the default style's value.
		 *
		 * @type {?number}
		 */
		set fontSize(value: number) {
			this._fontSize = SpanStyles._valueOrDefault(value, this._defaultStyle.fontSize);
		}

		/**
		 * Sets the horizontal font scaling property. null defaults it to the default style's value.
		 *
		 * @type {?number}
		 */
		set fontScaleX(value: number) {
			this._fontScaleX = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleX);
		}

		/**
		 * Sets the vertical font scaling property. null defaults it to the default style's value.
		 *
		 * @type {?number}
		 */
		set fontScaleY(value: number) {
			this._fontScaleY = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleY);
		}

		/**
		 * Sets the letter spacing property. null defaults it to the default style's value.
		 *
		 * @type {?number}
		 */
		set letterSpacing(value: number) {
			this._letterSpacing = SpanStyles._valueOrDefault(value, this._defaultStyle.letterSpacing);
		}

		/**
		 * Sets the X-axis rotation property.
		 *
		 * @type {?number}
		 */
		set rotationX(value: number) {
			this._rotationX = value;
		}

		/**
		 * Sets the Y-axis rotation property.
		 *
		 * @type {?number}
		 */
		set rotationY(value: number) {
			this._rotationY = value;
		}

		/**
		 * Sets the Z-axis rotation property.
		 *
		 * @type {?number}
		 */
		set rotationZ(value: number) {
			this._rotationZ = SpanStyles._valueOrDefault(value, this._defaultStyle.rotationZ);
		}

		/**
		 * Sets the X-axis skew property.
		 *
		 * @type {?number}
		 */
		set skewX(value: number) {
			this._skewX = value;
		}

		/**
		 * Sets the Y-axis skew property.
		 *
		 * @type {?number}
		 */
		set skewY(value: number) {
			this._skewY = value;
		}

		/**
		 * Gets the primary color property.
		 *
		 * @type {!libjass.parts.Color}
		 */
		get primaryColor(): parts.Color {
			return this._primaryColor;
		}

		/**
		 * Sets the primary color property. null defaults it to the default style's value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set primaryColor(value: parts.Color) {
			this._primaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.primaryColor);
		}

		/**
		 * Sets the secondary color property. null defaults it to the default style's value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set secondaryColor(value: parts.Color) {
			this._secondaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.secondaryColor);
		}

		/**
		 * Sets the outline color property. null defaults it to the default style's value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set outlineColor(value: parts.Color) {
			this._outlineColor = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineColor);
		}

		/**
		 * Sets the shadow color property. null defaults it to the default style's value.
		 *
		 * @type {libjass.parts.Color}
		 */
		set shadowColor(value: parts.Color) {
			this._shadowColor = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowColor);
		}

		/**
		 * Gets the primary alpha property.
		 *
		 * @type {?number}
		 */
		get primaryAlpha(): number {
			return this._primaryAlpha;
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
		 * Sets the secondary alpha property.
		 *
		 * @type {?number}
		 */
		set secondaryAlpha(value: number) {
			this._secondaryAlpha = value;
		}

		/**
		 * Sets the outline alpha property.
		 *
		 * @type {?number}
		 */
		set outlineAlpha(value: number) {
			this._outlineAlpha = value;
		}

		/**
		 * Sets the shadow alpha property.
		 *
		 * @type {?number}
		 */
		set shadowAlpha(value: number) {
			this._shadowAlpha = value;
		}

		private static _valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);

		/**
		 * @param {string} fontFamily
		 * @param {number} lineHeight
		 * @param {!HTMLDivElement} fontSizeElement
		 * @return {number}
		 */
		private static _getFontSize(fontFamily: string, lineHeight: number, fontSizeElement: HTMLDivElement): number {
			var existingFontSizeMap = SpanStyles._fontSizeCache.get(fontFamily);
			if (existingFontSizeMap === undefined) {
				SpanStyles._fontSizeCache.set(fontFamily, existingFontSizeMap = new Map<number, number>());
			}

			var existingFontSize = existingFontSizeMap.get(lineHeight);
			if (existingFontSize === undefined) {
				fontSizeElement.style.fontFamily = fontFamily;
				fontSizeElement.style.fontSize = lineHeight + "px";
				existingFontSizeMap.set(lineHeight, existingFontSize = lineHeight * lineHeight / fontSizeElement.offsetHeight);
			}

			return existingFontSize;
		}
	}

	/**
	 * This class represents an ASS drawing - a set of drawing instructions between {\p} tags.
	 *
	 * @param {number} outputScaleX
	 * @param {number} outputScaleY
	 */
	class DrawingStyles {
		private _scale: number = 1;
		private _baselineOffset: number = 0;

		constructor(private _outputScaleX: number, private _outputScaleY: number) { }

		/**
		 * @type {number}
		 */
		set scale(value: number) {
			this._scale = value;
		}

		/**
		 * @type {number}
		 */
		set baselineOffset(value: number) {
			this._baselineOffset = value;
		}

		/**
		 * Converts this drawing to an <svg> element.
		 *
		 * @param {!libjass.parts.DrawingInstructions} drawingInstructions
		 * @param {!libjass.parts.Color} fillColor
		 * @return {!SVGSVGElement}
		 */
		toSVG(drawingInstructions: parts.DrawingInstructions, fillColor: parts.Color): SVGElement {
			var scaleFactor = Math.pow(2, this._scale - 1);
			var scaleX = this._outputScaleX / scaleFactor;
			var scaleY = this._outputScaleY / scaleFactor;

			var path = "";
			var bboxWidth = 0;
			var bboxHeight = 0;

			drawingInstructions.instructions.forEach(instruction => {
				if (instruction instanceof parts.drawing.MoveInstruction) {
					var movePart = <parts.drawing.MoveInstruction>instruction;
					path += " M " + movePart.x + " " + (movePart.y + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, movePart.x);
					bboxHeight = Math.max(bboxHeight, movePart.y + this._baselineOffset);
				}
				else if (instruction instanceof parts.drawing.LineInstruction) {
					var linePart = <parts.drawing.LineInstruction>instruction;
					path += " L " + linePart.x + " " + (linePart.y + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, linePart.x);
					bboxHeight = Math.max(bboxHeight, linePart.y + this._baselineOffset);
				}
				else if (instruction instanceof parts.drawing.CubicBezierCurveInstruction) {
					var cubicBezierCurvePart = <parts.drawing.CubicBezierCurveInstruction>instruction;
					path += " C " + cubicBezierCurvePart.x1 + " " + (cubicBezierCurvePart.y1 + this._baselineOffset) + ", " + cubicBezierCurvePart.x2 + " " + (cubicBezierCurvePart.y2 + this._baselineOffset) + ", " + cubicBezierCurvePart.x3 + " " + (cubicBezierCurvePart.y3 + this._baselineOffset);
					bboxWidth = Math.max(bboxWidth, cubicBezierCurvePart.x1, cubicBezierCurvePart.x2, cubicBezierCurvePart.x3);
					bboxHeight = Math.max(bboxHeight, cubicBezierCurvePart.y1 + this._baselineOffset, cubicBezierCurvePart.y2 + this._baselineOffset, cubicBezierCurvePart.y3 + this._baselineOffset);
				}
			});

			var result =
				'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + (bboxWidth * scaleX).toFixed(3) + 'px" height="' + (bboxHeight * scaleY).toFixed(3) + 'px">\n' +
				'\t<g transform="scale(' + scaleX.toFixed(3) + ' ' + scaleY.toFixed(3) + ')">\n' +
				'\t\t<path d="' + path + '" fill="' + fillColor.toString() + '" />\n' +
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
