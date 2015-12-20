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

import { AnimationCollection } from "./animation-collection";
import { DrawingStyles } from "./drawing-styles";
import { calculateFontMetrics } from "./font-size";
import { Keyframe } from "./keyframe";
import { SpanStyles } from "./span-styles";

import { Clock, EventSource } from "../clocks/base";

import { NullRenderer } from "../null";
import { RendererSettings } from "../settings";

import { getTtfNames } from "../../parser/ttf";

import * as parts from "../../parts";

import { debugMode } from "../../settings";

import { ASS } from "../../types/ass";
import { AttachmentType } from "../../types/attachment";
import { Dialogue } from "../../types/dialogue";
import { WrappingStyle } from "../../types/misc";

import { mixin } from "../../utility/mixin";
import { Map } from "../../utility/map";
import { Promise, first as Promise_first, lastly as Promise_finally } from "../../utility/promise";
import { Set } from "../../utility/set";

declare const global: {
	document: {
		fonts?: FontFaceSet;
	};
};

interface FontFaceSet {
	/**
	 * @param {!FontFace} fontFace
	 * @return {!FontFaceSet}
	 */
	add(fontFace: FontFace): FontFaceSet;
}

interface FontFace {
	/**
	 * @return {!Promise.<!FontFace>}
	 */
	load(): Promise<FontFace>;
}

declare var FontFace: {
	new (family: string, source: string): FontFace;
};

const fontSrcUrlRegex = /^(url|local)\(["']?(.+?)["']?\)$/;

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
	private _subsWrapperWidth: number; // this._subsWrapper.offsetWidth is expensive, so cache this.

	private _layerWrappers: HTMLDivElement[] = [];
	private _layerAlignmentWrappers: HTMLDivElement[][] = [];
	private _fontSizeElement: HTMLDivElement;

	private _fontMetricsCache: Map<string, [number, number]> = new Map<string, [number, number]>();

	private _currentSubs: Map<Dialogue, HTMLDivElement> = new Map<Dialogue, HTMLDivElement>();
	private _preRenderedSubs: Map<number, PreRenderedSub> = new Map<number, PreRenderedSub>();

	private _scaleX: number;
	private _scaleY: number;

	constructor(ass: ASS, clock: Clock, private _libjassSubsWrapper: HTMLDivElement, settings?: RendererSettings) {
		super(ass, clock, (() => {
			if (!(_libjassSubsWrapper instanceof HTMLDivElement)) {
				const temp = settings;
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

		// Preload fonts

		if (debugMode) {
			console.log(`Preloading fonts...`);
		}

		const preloadFontPromises: Promise<any>[] = [];

		const fontFetchPromisesCache = new Map<string, Promise<any>>();

		const fontMap = (this.settings.fontMap === null) ? new Map<string, string | string[]>() : this.settings.fontMap;

		const attachedFontsMap = new Map<string, string[]>();
		if (this.settings.useAttachedFonts) {
			ass.attachments.forEach(attachment => {
				if (attachment.type !== AttachmentType.Font) {
					return;
				}

				let ttfNames: Set<string> = null;
				try {
					ttfNames = getTtfNames(attachment);
				}
				catch (ex) {
					console.error(ex);
					return;
				}

				ttfNames.forEach(name => {
					let correspondingFontMapEntry = fontMap.get(name);
					if (correspondingFontMapEntry !== undefined) {
						// Also defined in fontMap.
						if (typeof correspondingFontMapEntry !== "string") {
							// Entry in fontMap is an array. Append this URL to it.
							correspondingFontMapEntry.push(attachment.url);
						}
						else {
							/* The entry in fontMap is a string. Don't append this URL to it. Instead, put it in attachedFontsMap now
							 * and it'll be merged with the entry from fontMap later. If it was added here, and later the string needed
							 * to be split on commas, then the commas in the data URI would break the result.
							 */
							let existingList = attachedFontsMap.get(name);
							if (existingList === undefined) {
								attachedFontsMap.set(name, existingList = []);
							}
							existingList.push(attachment.url);
						}
					}
					else {
						// Not defined in fontMap. Add it there.
						fontMap.set(name, [attachment.url]);
					}
				});
			});
		}

		fontMap.forEach((srcs, fontFamily) => {
			let fontFamilyMetricsPromise: Promise<[number, number]>;

			if (global.document.fonts && global.document.fonts.add) {
				// value should be string. If it's string[], combine it into string
				let source =
					(typeof srcs === "string") ?
						srcs :
						srcs.map(src =>
							(src.match(fontSrcUrlRegex) !== null) ?
								src :
								`url("${ src }")`).join(", ");

				const attachedFontUrls = attachedFontsMap.get(fontFamily);
				if (attachedFontUrls !== undefined) {
					for (const url of attachedFontUrls) {
						source += `, url("${ url }")`;
					}
				}

				let fontFetchPromise = fontFetchPromisesCache.get(source);
				if (fontFetchPromise === undefined) {
					const fontFace = new FontFace(fontFamily, source);
					const quotedFontFace = new FontFace(`"${ fontFamily }"`, source);

					global.document.fonts.add(fontFace);
					global.document.fonts.add(quotedFontFace);

					fontFetchPromise =
						Promise.race<FontFace>([fontFace.load(), quotedFontFace.load()]).catch(reason => {
							console.warn(`Fetching fonts for ${ fontFamily } at ${ source } failed: %o`, reason);
							return null;
						});
					fontFetchPromisesCache.set(source, fontFetchPromise);
				}

				fontFamilyMetricsPromise = this._calculateFontMetricsAfterFetch(fontFamily, fontFetchPromise);
			}
			else {
				// value should be string[]. If it's string, split it into string[]
				let urls =
					((typeof srcs === "string") ?
						srcs.split(/,/) :
						srcs).map(url => url.trim()).map(url => {
							const match = url.match(fontSrcUrlRegex);

							if (match === null) {
								// A URL
								return url;
							}

							if (match[1] === "local") {
								// A local() URL. Don't fetch it.
								return null;
							}

							// A url() URL. Extract the raw URL.
							return match[2];
						}).filter(url => url !== null);

				const attachedFontUrls = attachedFontsMap.get(fontFamily);
				if (attachedFontUrls !== undefined) {
					urls = urls.concat(attachedFontUrls);
				}

				const thisFontFamilysFetchPromises =
					urls.map(url => {
						let fontFetchPromise = fontFetchPromisesCache.get(url);
						if (fontFetchPromise === undefined) {
							fontFetchPromise =
								new Promise<void>((resolve, reject) => {
									const xhr = new XMLHttpRequest();
									xhr.addEventListener("load", () => {
										if (debugMode) {
											console.log(`Preloaded ${ url }.`);
										}

										resolve(null);
									});
									xhr.addEventListener("error", err => {
										reject(err);
									});
									xhr.open("GET", url, true);
									xhr.send();
								});

							fontFetchPromisesCache.set(url, fontFetchPromise);
						}

						return fontFetchPromise;
					});

				const allFontsFetchedPromise =
					(thisFontFamilysFetchPromises.length === 0) ?
						Promise.resolve<void>(null) :
						Promise_first(thisFontFamilysFetchPromises).catch(reason => {
							console.warn(`Fetching fonts for ${ fontFamily } at ${ urls.join(", ") } failed: %o`, reason);
							return null;
						});

				fontFamilyMetricsPromise = this._calculateFontMetricsAfterFetch(fontFamily, allFontsFetchedPromise);
			}

			preloadFontPromises.push(fontFamilyMetricsPromise.then(metrics => this._fontMetricsCache.set(fontFamily, metrics)));
		});

		Promise.all(preloadFontPromises).then(() => {
			if (debugMode) {
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

		const ratio = Math.min(width / this.ass.properties.resolutionX, height / this.ass.properties.resolutionY);
		this._subsWrapperWidth = this.ass.properties.resolutionX * ratio;
		const subsWrapperHeight = this.ass.properties.resolutionY * ratio;
		this._subsWrapper.style.width = `${ this._subsWrapperWidth.toFixed(3) }px`;
		this._subsWrapper.style.height = `${ subsWrapperHeight.toFixed(3) }px`;
		this._subsWrapper.style.left = `${ ((width - this._subsWrapperWidth) / 2).toFixed(3) }px`;
		this._subsWrapper.style.top = `${ ((height - subsWrapperHeight) / 2).toFixed(3) }px`;

		this._scaleX = this._subsWrapperWidth / this.ass.properties.resolutionX;
		this._scaleY = subsWrapperHeight / this.ass.properties.resolutionY;

		// Any dialogues which have been pre-rendered will need to be pre-rendered again.
		this._preRenderedSubs.clear();

		// this.currentTime will be -1 if resize() is called before the clock begins playing for the first time. In this situation, there is no need to force a redraw.
		if (this.clock.currentTime !== -1) {
			this._onClockTick();
		}
	}

	/**
	 * The magic happens here. The subtitle div is rendered and stored. Call {@link libjass.renderers.WebRenderer.draw} to get a clone of the div to display.
	 *
	 * @param {!libjass.Dialogue} dialogue
	 * @return {PreRenderedSub}
	 */
	preRender(dialogue: Dialogue): PreRenderedSub {
		const alreadyPreRenderedSub = this._preRenderedSubs.get(dialogue.id);
		if (alreadyPreRenderedSub) {
			return alreadyPreRenderedSub;
		}

		const currentTimeRelativeToDialogueStart = this.clock.currentTime - dialogue.start;

		if (dialogue.containsTransformTag && currentTimeRelativeToDialogueStart < 0) {
			// draw() expects this function to always return non-null, but it only calls this function when currentTimeRelativeToDialogueStart would be >= 0
			return null;
		}

		const sub = document.createElement("div");

		sub.style.marginLeft = `${ (this._scaleX * dialogue.style.marginLeft).toFixed(3) }px`;
		sub.style.marginRight = `${ (this._scaleX * dialogue.style.marginRight).toFixed(3) }px`;
		sub.style.marginTop = sub.style.marginBottom = `${ (this._scaleY * dialogue.style.marginVertical).toFixed(3) }px`;
		sub.style.minWidth = `${ (this._subsWrapperWidth - this._scaleX * (dialogue.style.marginLeft + dialogue.style.marginRight)).toFixed(3) }px`;

		const dialogueAnimationStylesElement = document.createElement("style");
		dialogueAnimationStylesElement.id = `libjass-animation-styles-${ this.id }-${ dialogue.id }`;
		dialogueAnimationStylesElement.type = "text/css";

		const dialogueAnimationCollection = new AnimationCollection(this, dialogueAnimationStylesElement);

		const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svgElement.setAttribute("version", "1.1");
		svgElement.setAttribute("class", "libjass-filters");
		svgElement.width.baseVal.valueAsString = "0";
		svgElement.height.baseVal.valueAsString = "0";

		const svgDefsElement = document.createElementNS("http://www.w3.org/2000/svg", "defs");
		svgElement.appendChild(svgDefsElement);

		let currentSpan: HTMLSpanElement = null;
		const currentSpanStyles = new SpanStyles(this, dialogue, this._scaleX, this._scaleY, this.settings, this._fontSizeElement, svgDefsElement, this._fontMetricsCache);

		let currentAnimationCollection: AnimationCollection = null;

		let previousAddNewLine = false; // If two or more \N's are encountered in sequence, then all but the first will be created using currentSpanStyles.makeNewLine() instead
		const startNewSpan = (addNewLine: boolean): void => {
			if (currentSpan !== null && currentSpan.hasChildNodes()) {
				sub.appendChild(currentSpanStyles.setStylesOnSpan(currentSpan, currentAnimationCollection));
			}

			if (currentAnimationCollection !== null) {
				currentAnimationCollection.animationDelays.forEach((delay, name) => dialogueAnimationCollection.animationDelays.set(name, delay));
			}

			if (addNewLine) {
				if (previousAddNewLine) {
					sub.appendChild(currentSpanStyles.makeNewLine());
				}
				else {
					sub.appendChild(document.createElement("br"));
				}
			}

			currentSpan = document.createElement("span");
			currentAnimationCollection = new AnimationCollection(this, dialogueAnimationStylesElement);

			previousAddNewLine = addNewLine;
		};
		startNewSpan(false);

		const currentDrawingStyles = new DrawingStyles(this._scaleX, this._scaleY);

		let wrappingStyle = this.ass.properties.wrappingStyle;

		let karaokeTimesAccumulator = 0;

		for (const part of dialogue.parts) {
			if (part instanceof parts.Italic) {
				currentSpanStyles.italic = part.value;
			}

			else if (part instanceof parts.Bold) {
				currentSpanStyles.bold = part.value;
			}

			else if (part instanceof parts.Underline) {
				currentSpanStyles.underline = part.value;
			}

			else if (part instanceof parts.StrikeThrough) {
				currentSpanStyles.strikeThrough = part.value;
			}

			else if (part instanceof parts.Border) {
				currentSpanStyles.outlineWidth = part.value;
				currentSpanStyles.outlineHeight = part.value;
			}

			else if (part instanceof parts.BorderX) {
				currentSpanStyles.outlineWidth = part.value;
			}

			else if (part instanceof parts.BorderY) {
				currentSpanStyles.outlineHeight = part.value;
			}

			else if (part instanceof parts.Shadow) {
				currentSpanStyles.shadowDepthX = part.value;
				currentSpanStyles.shadowDepthY = part.value;
			}

			else if (part instanceof parts.ShadowX) {
				currentSpanStyles.shadowDepthX = part.value;
			}

			else if (part instanceof parts.ShadowY) {
				currentSpanStyles.shadowDepthY = part.value;
			}

			else if (part instanceof parts.Blur) {
				currentSpanStyles.blur = part.value;
			}

			else if (part instanceof parts.GaussianBlur) {
				currentSpanStyles.gaussianBlur = part.value;
			}

			else if (part instanceof parts.FontName) {
				currentSpanStyles.fontName = part.value;
			}

			else if (part instanceof parts.FontSize) {
				currentSpanStyles.fontSize = part.value;
			}

			else if (part instanceof parts.FontSizePlus) {
				currentSpanStyles.fontSize += part.value;
			}

			else if (part instanceof parts.FontSizeMinus) {
				currentSpanStyles.fontSize -= part.value;
			}

			else if (part instanceof parts.FontScaleX) {
				currentSpanStyles.fontScaleX = part.value;
			}

			else if (part instanceof parts.FontScaleY) {
				currentSpanStyles.fontScaleY = part.value;
			}

			else if (part instanceof parts.LetterSpacing) {
				currentSpanStyles.letterSpacing = part.value;
			}

			else if (part instanceof parts.RotateX) {
				currentSpanStyles.rotationX = part.value;
			}

			else if (part instanceof parts.RotateY) {
				currentSpanStyles.rotationY = part.value;
			}

			else if (part instanceof parts.RotateZ) {
				currentSpanStyles.rotationZ = part.value;
			}

			else if (part instanceof parts.SkewX) {
				currentSpanStyles.skewX = part.value;
			}

			else if (part instanceof parts.SkewY) {
				currentSpanStyles.skewY = part.value;
			}

			else if (part instanceof parts.PrimaryColor) {
				currentSpanStyles.primaryColor = part.value;
			}

			else if (part instanceof parts.SecondaryColor) {
				currentSpanStyles.secondaryColor = part.value;
			}

			else if (part instanceof parts.OutlineColor) {
				currentSpanStyles.outlineColor = part.value;
			}

			else if (part instanceof parts.ShadowColor) {
				currentSpanStyles.shadowColor = part.value;
			}

			else if (part instanceof parts.Alpha) {
				currentSpanStyles.primaryAlpha = part.value;
				currentSpanStyles.secondaryAlpha = part.value;
				currentSpanStyles.outlineAlpha = part.value;
				currentSpanStyles.shadowAlpha = part.value;
			}

			else if (part instanceof parts.PrimaryAlpha) {
				currentSpanStyles.primaryAlpha = part.value;
			}

			else if (part instanceof parts.SecondaryAlpha) {
				currentSpanStyles.secondaryAlpha = part.value;
			}

			else if (part instanceof parts.OutlineAlpha) {
				currentSpanStyles.outlineAlpha = part.value;
			}

			else if (part instanceof parts.ShadowAlpha) {
				currentSpanStyles.shadowAlpha = part.value;
			}

			else if (part instanceof parts.Alignment) {
				// Already handled in Dialogue
			}

			else if (part instanceof parts.ColorKaraoke) {
				startNewSpan(false);

				currentAnimationCollection.add("step-end", [
					new Keyframe(0, new Map([
						["color", currentSpanStyles.secondaryColor.withAlpha(currentSpanStyles.secondaryAlpha).toString()],
					])), new Keyframe(karaokeTimesAccumulator, new Map([
						["color", currentSpanStyles.primaryColor.withAlpha(currentSpanStyles.primaryAlpha).toString()],
					]))
				]);

				karaokeTimesAccumulator += part.duration;
			}

			else if (part instanceof parts.WrappingStyle) {
				wrappingStyle = part.value;
			}

			else if (part instanceof parts.Reset) {
				currentSpanStyles.reset(this.ass.styles.get(part.value));
			}

			else if (part instanceof parts.Position) {
				sub.style.position = "absolute";
				sub.style.left = `${ (this._scaleX * part.x).toFixed(3) }px`;
				sub.style.top = `${ (this._scaleY * part.y).toFixed(3) }px`;
			}

			else if (part instanceof parts.Move) {
				sub.style.position = "absolute";
				dialogueAnimationCollection.add("linear", [new Keyframe(0, new Map([
					["left", `${ (this._scaleX * part.x1).toFixed(3) }px`],
					["top", `${ (this._scaleY * part.y1).toFixed(3) }px`],
				])), new Keyframe(part.t1, new Map([
					["left", `${ (this._scaleX * part.x1).toFixed(3) }px`],
					["top", `${ (this._scaleY * part.y1).toFixed(3) }px`],
				])), new Keyframe(part.t2, new Map([
					["left", `${ (this._scaleX * part.x2).toFixed(3) }px`],
					["top", `${ (this._scaleY * part.y2).toFixed(3) }px`],
				])), new Keyframe(dialogue.end - dialogue.start, new Map([
					["left", `${ (this._scaleX * part.x2).toFixed(3) }px`],
					["top", `${ (this._scaleY * part.y2).toFixed(3) }px`],
				]))]);
			}

			else if (part instanceof parts.Fade) {
				dialogueAnimationCollection.add("linear", [new Keyframe(0, new Map([
					["opacity", "0"],
				])), new Keyframe(part.start, new Map([
					["opacity", "1"],
				])), new Keyframe(dialogue.end - dialogue.start - part.end, new Map([
					["opacity", "1"],
				])), new Keyframe(dialogue.end - dialogue.start, new Map([
					["opacity", "0"],
				]))]);
			}

			else if (part instanceof parts.ComplexFade) {
				dialogueAnimationCollection.add("linear", [new Keyframe(0, new Map([
					["opacity", part.a1.toFixed(3)],
				])), new Keyframe(part.t1, new Map([
					["opacity", part.a1.toFixed(3)],
				])), new Keyframe(part.t2, new Map([
					["opacity", part.a2.toFixed(3)],
				])), new Keyframe(part.t3, new Map([
					["opacity", part.a2.toFixed(3)],
				])), new Keyframe(part.t4, new Map([
					["opacity", part.a3.toFixed(3)],
				])), new Keyframe(dialogue.end - dialogue.start, new Map([
					["opacity", part.a3.toFixed(3)],
				]))]);
			}

			else if (part instanceof parts.Transform) {
				const progression =
					(currentTimeRelativeToDialogueStart <= part.start) ? 0 :
					(currentTimeRelativeToDialogueStart >= part.end) ? 1 :
					Math.pow((currentTimeRelativeToDialogueStart - part.start) / (part.end - part.start), part.accel);

				for (const tag of part.tags) {
					if (tag instanceof parts.Border) {
						currentSpanStyles.outlineWidth += progression * (tag.value - currentSpanStyles.outlineWidth);
						currentSpanStyles.outlineHeight += progression * (tag.value - currentSpanStyles.outlineHeight);
					}

					else if (tag instanceof parts.BorderX) {
						currentSpanStyles.outlineWidth += progression * (tag.value - currentSpanStyles.outlineWidth);
					}

					else if (tag instanceof parts.BorderY) {
						currentSpanStyles.outlineHeight += progression * (tag.value - currentSpanStyles.outlineHeight);
					}

					else if (tag instanceof parts.Shadow) {
						currentSpanStyles.shadowDepthX += progression * (tag.value - currentSpanStyles.shadowDepthX);
						currentSpanStyles.shadowDepthY += progression * (tag.value - currentSpanStyles.shadowDepthY);
					}

					else if (tag instanceof parts.ShadowX) {
						currentSpanStyles.shadowDepthX += progression * (tag.value - currentSpanStyles.shadowDepthX);
					}

					else if (tag instanceof parts.ShadowY) {
						currentSpanStyles.shadowDepthY += progression * (tag.value - currentSpanStyles.shadowDepthY);
					}

					else if (tag instanceof parts.Blur) {
						currentSpanStyles.blur += progression * (tag.value - currentSpanStyles.blur);
					}

					else if (tag instanceof parts.GaussianBlur) {
						currentSpanStyles.gaussianBlur += progression * (tag.value - currentSpanStyles.gaussianBlur);
					}

					else if (tag instanceof parts.FontSize) {
						currentSpanStyles.fontSize += progression * (tag.value - currentSpanStyles.fontSize);
					}

					else if (tag instanceof parts.FontSizePlus) {
						currentSpanStyles.fontSize += progression * tag.value;
					}

					else if (tag instanceof parts.FontSizeMinus) {
						currentSpanStyles.fontSize -= progression * tag.value;
					}

					else if (tag instanceof parts.FontScaleX) {
						currentSpanStyles.fontScaleX += progression * (tag.value - currentSpanStyles.fontScaleX);
					}

					else if (tag instanceof parts.FontScaleY) {
						currentSpanStyles.fontScaleY += progression * (tag.value - currentSpanStyles.fontScaleY);
					}

					else if (tag instanceof parts.LetterSpacing) {
						currentSpanStyles.letterSpacing += progression * (tag.value - currentSpanStyles.letterSpacing);
					}

					else if (tag instanceof parts.RotateX) {
						currentSpanStyles.rotationX += progression * (tag.value - currentSpanStyles.rotationX);
					}

					else if (tag instanceof parts.RotateY) {
						currentSpanStyles.rotationY += progression * (tag.value - currentSpanStyles.rotationY);
					}

					else if (tag instanceof parts.RotateZ) {
						currentSpanStyles.rotationZ += progression * (tag.value - currentSpanStyles.rotationZ);
					}

					else if (tag instanceof parts.SkewX) {
						currentSpanStyles.skewX += progression * (tag.value - currentSpanStyles.skewX);
					}

					else if (tag instanceof parts.SkewY) {
						currentSpanStyles.skewY += progression * (tag.value - currentSpanStyles.skewY);
					}

					else if (tag instanceof parts.PrimaryColor) {
						currentSpanStyles.primaryColor = currentSpanStyles.primaryColor.interpolate(tag.value, progression);
					}

					else if (tag instanceof parts.SecondaryColor) {
						currentSpanStyles.secondaryColor = currentSpanStyles.secondaryColor.interpolate(tag.value, progression);
					}

					else if (tag instanceof parts.OutlineColor) {
						currentSpanStyles.outlineColor = currentSpanStyles.outlineColor.interpolate(tag.value, progression);
					}

					else if (tag instanceof parts.ShadowColor) {
						currentSpanStyles.shadowColor = currentSpanStyles.shadowColor.interpolate(tag.value, progression);
					}

					else if (tag instanceof parts.Alpha) {
						currentSpanStyles.primaryAlpha += progression * (tag.value - currentSpanStyles.primaryAlpha);
						currentSpanStyles.secondaryAlpha += progression * (tag.value - currentSpanStyles.secondaryAlpha);
						currentSpanStyles.outlineAlpha += progression * (tag.value - currentSpanStyles.outlineAlpha);
						currentSpanStyles.shadowAlpha += progression * (tag.value - currentSpanStyles.shadowAlpha);
					}

					else if (tag instanceof parts.PrimaryAlpha) {
						currentSpanStyles.primaryAlpha += progression * (tag.value - currentSpanStyles.primaryAlpha);
					}

					else if (tag instanceof parts.SecondaryAlpha) {
						currentSpanStyles.secondaryAlpha += progression * (tag.value - currentSpanStyles.secondaryAlpha);
					}

					else if (tag instanceof parts.OutlineAlpha) {
						currentSpanStyles.outlineAlpha += progression * (tag.value - currentSpanStyles.outlineAlpha);
					}

					else if (tag instanceof parts.ShadowAlpha) {
						currentSpanStyles.shadowAlpha += progression * (tag.value - currentSpanStyles.shadowAlpha);
					}
				}
			}

			else if (part instanceof parts.DrawingMode) {
				if (part.scale !== 0) {
					currentDrawingStyles.scale = part.scale;
				}
			}

			else if (part instanceof parts.DrawingBaselineOffset) {
				currentDrawingStyles.baselineOffset = part.value;
			}

			else if (part instanceof parts.DrawingInstructions) {
				currentSpan.appendChild(currentDrawingStyles.toSVG(part, currentSpanStyles.primaryColor.withAlpha(currentSpanStyles.primaryAlpha)));
				startNewSpan(false);
			}

			else if (part instanceof parts.Text) {
				currentSpan.appendChild(document.createTextNode(part.value + "\u200C"));
				startNewSpan(false);
			}

			else if (debugMode && part instanceof parts.Comment) {
				currentSpan.appendChild(document.createTextNode(part.value));
				startNewSpan(false);
			}

			else if (part instanceof parts.NewLine) {
				startNewSpan(true);
			}
		}

		for (const part of dialogue.parts) {
			if (part instanceof parts.Position || part instanceof parts.Move) {
				const transformOrigin = WebRenderer._transformOrigins[dialogue.alignment];

				const divTransformStyle = `translate(${ -transformOrigin[0] }%, ${ -transformOrigin[1] }%) translate(-${ sub.style.marginLeft }, -${ sub.style.marginTop })`;
				const transformOriginString = `${ transformOrigin[0] }% ${ transformOrigin[1] }%`;

				sub.style.webkitTransform = divTransformStyle;
				sub.style.webkitTransformOrigin = transformOriginString;

				sub.style.transform = divTransformStyle;
				sub.style.transformOrigin = transformOriginString;

				break;
			}
		}

		switch (wrappingStyle) {
			case WrappingStyle.EndOfLineWrapping:
				sub.style.whiteSpace = "pre-wrap";
				break;

			case WrappingStyle.NoLineWrapping:
				sub.style.whiteSpace = "pre";
				break;

			case WrappingStyle.SmartWrappingWithWiderTopLine:
			case WrappingStyle.SmartWrappingWithWiderBottomLine:
				/* Not supported. Treat the same as EndOfLineWrapping */
				sub.style.whiteSpace = "pre-wrap";
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

		sub.style.webkitAnimation = dialogueAnimationCollection.animationStyle;
		sub.style.animation = dialogueAnimationCollection.animationStyle;

		sub.setAttribute("data-dialogue-id", `${ this.id }-${ dialogue.id }`);

		if (dialogueAnimationStylesElement.textContent !== "") {
			sub.appendChild(dialogueAnimationStylesElement);
		}

		if (svgDefsElement.hasChildNodes()) {
			sub.appendChild(svgElement);
		}

		const result = { sub, animationDelays: dialogueAnimationCollection.animationDelays };

		if (!dialogue.containsTransformTag) {
			this._preRenderedSubs.set(dialogue.id, result);
		}

		return result;
	}

	/**
	 * Returns the subtitle div for display. The {@link libjass.renderers.Clock.currentTime} of the {@link libjass.renderers.NullRenderer.clock} is used to shift the
	 * animations appropriately, so that at the time the div is inserted into the DOM and the animations begin, they are in sync with the clock time.
	 *
	 * @param {!libjass.Dialogue} dialogue
	 */
	draw(dialogue: Dialogue): void {
		if (this._currentSubs.has(dialogue) && !dialogue.containsTransformTag) {
			return;
		}

		if (debugMode) {
			console.log(dialogue.toString());
		}

		let preRenderedSub = this._preRenderedSubs.get(dialogue.id);

		if (preRenderedSub === undefined) {
			preRenderedSub = this.preRender(dialogue);

			if (debugMode) {
				console.log(dialogue.toString());
			}
		}

		const result = <HTMLDivElement>preRenderedSub.sub.cloneNode(true);

		const applyAnimationDelays = (node: HTMLElement) => {
			const animationNames = node.style.animationName || node.style.webkitAnimationName;
			if (animationNames !== undefined && animationNames !== "") {
				const animationDelays = animationNames.split(",").map(name => {
					name = name.trim();
					const delay = preRenderedSub.animationDelays.get(name);
					return `${ ((delay + dialogue.start - this.clock.currentTime) / this.clock.rate).toFixed(3) }s`;
				}).join(", ");

				node.style.webkitAnimationDelay = animationDelays;
				node.style.animationDelay = animationDelays;
			}
		}
		applyAnimationDelays(result);
		const animatedDescendants = result.querySelectorAll('[style*="animation:"]');
		for (let i = 0; i < animatedDescendants.length; i++) {
			applyAnimationDelays(<HTMLElement>animatedDescendants[i]);
		}

		const layer = dialogue.layer;
		const alignment = (result.style.position === "absolute") ? 0 : dialogue.alignment; // Alignment 0 is for absolutely-positioned subs

		// Create the layer wrapper div and the alignment div inside it if not already created
		if (this._layerWrappers[layer] === undefined) {
			const layerWrapper = document.createElement("div");
			layerWrapper.className = `layer layer${ layer }`;

			// Find the next greater layer div and insert this div before that one
			let insertBeforeElement: HTMLDivElement = null;
			for (let insertBeforeLayer = layer + 1; insertBeforeLayer < this._layerWrappers.length && insertBeforeElement === null; insertBeforeLayer++) {
				if (this._layerWrappers[insertBeforeLayer] !== undefined) {
					insertBeforeElement = this._layerWrappers[insertBeforeLayer];
				}
			}

			this._subsWrapper.insertBefore(layerWrapper, insertBeforeElement);

			this._layerWrappers[layer] = layerWrapper;
			this._layerAlignmentWrappers[layer] = [];
		}

		if (this._layerAlignmentWrappers[layer][alignment] === undefined) {
			const layerAlignmentWrapper = document.createElement("div");
			layerAlignmentWrapper.className = `an an${ alignment }`;

			// Find the next greater layer,alignment div and insert this div before that one
			const layerWrapper = this._layerWrappers[layer];
			let insertBeforeElement: HTMLDivElement = null;
			for (let insertBeforeAlignment = alignment + 1; insertBeforeAlignment < this._layerAlignmentWrappers[layer].length && insertBeforeElement === null; insertBeforeAlignment++) {
				if (this._layerAlignmentWrappers[layer][insertBeforeAlignment] !== undefined) {
					insertBeforeElement = this._layerAlignmentWrappers[layer][insertBeforeAlignment];
				}
			}

			layerWrapper.insertBefore(layerAlignmentWrapper, insertBeforeElement);

			this._layerAlignmentWrappers[layer][alignment] = layerAlignmentWrapper;
		}

		this._layerAlignmentWrappers[layer][alignment].appendChild(result);

		// Workaround for IE
		const dialogueAnimationStylesElement = result.getElementsByTagName("style")[0];
		if (dialogueAnimationStylesElement !== undefined) {
			const sheet = <CSSStyleSheet>dialogueAnimationStylesElement.sheet;
			if (sheet.cssRules.length === 0) {
				sheet.cssText = dialogueAnimationStylesElement.textContent;
			}
		}

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

		const currentTime = this.clock.currentTime;

		this._currentSubs.forEach((sub: HTMLDivElement, dialogue: Dialogue) => {
			if (dialogue.start > currentTime || dialogue.end < currentTime || dialogue.containsTransformTag) {
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
	}

	protected _ready(): void {
		this._dispatchEvent("ready", []);
	}

	/**
	 * @param {string} fontFamily
	 * @param {!Promise.<*>} fontFetchPromise
	 * @return {!Promise.<[number, number]>}
	 */
	private _calculateFontMetricsAfterFetch(fontFamily: string, fontFetchPromise: Promise<any>): Promise<[number, number]> {
		return fontFetchPromise.then(() => {
			const fontSizeElement = <HTMLDivElement>this._fontSizeElement.cloneNode(true);
			this._libjassSubsWrapper.appendChild(fontSizeElement);
			return Promise_finally(calculateFontMetrics(fontFamily, this.settings.fallbackFonts, fontSizeElement), () => {
				this._libjassSubsWrapper.removeChild(fontSizeElement);
			});
		});
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

interface PreRenderedSub {
	/** @type {!HTMLDivElement} */
	sub: HTMLDivElement;

	/** @type {!Map.<string, number>} */
	animationDelays: Map<string, number>;
}
