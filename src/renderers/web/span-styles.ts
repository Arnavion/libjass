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

import { fontSizeForLineHeight } from "./font-size";

import { WebRenderer } from "./renderer";

import { RendererSettings } from "../settings";

import { Color } from "../../parts";

import { Style } from "../../types/style";
import { Dialogue } from "../../types/dialogue";

import { Map } from "../../utility/map";

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
 * @param {!Map<string, [number, number]>} fontMetricsCache Font metrics cache
 */
export class SpanStyles {
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

	private _primaryColor: Color;
	private _secondaryColor: Color;
	private _outlineColor: Color;
	private _shadowColor: Color;

	private _primaryAlpha: number;
	private _secondaryAlpha: number;
	private _outlineAlpha: number;
	private _shadowAlpha: number;

	private _blur: number;
	private _gaussianBlur: number;

	private _nextFilterId = 0;

	constructor(renderer: WebRenderer, dialogue: Dialogue, private _scaleX: number, private _scaleY: number, private _settings: RendererSettings, private _fontSizeElement: HTMLDivElement, private _svgDefsElement: SVGDefsElement, private _fontMetricsCache: Map<string, [number, number]>) {
		this._id = `${ renderer.id }-${ dialogue.id }`;
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

		this.primaryAlpha = newStyle.primaryColor.alpha;
		this.secondaryAlpha = newStyle.secondaryColor.alpha;
		this.outlineAlpha = newStyle.outlineColor.alpha;
		this.shadowAlpha = newStyle.shadowColor.alpha;

		this.blur = null;
		this.gaussianBlur = null;
	}

	/**
	 * Sets the style attribute on the given span element.
	 *
	 * @param {!HTMLSpanElement} span
	 * @param {!AnimationCollection} animationCollection
	 * @return {!HTMLSpanElement} The resulting <span> with the CSS styles applied. This may be a wrapper around the input <span> if the styles were applied using SVG filters.
	 */
	setStylesOnSpan(span: HTMLSpanElement, animationCollection: AnimationCollection): HTMLSpanElement {
		const isTextOnlySpan = span.childNodes[0] instanceof Text;

		let fontStyleOrWeight = "";
		if (this._italic) {
			fontStyleOrWeight += "italic ";
		}
		if (this._bold === true) {
			fontStyleOrWeight += "bold ";
		}
		else if (this._bold !== false) {
			fontStyleOrWeight += this._bold + " ";
		}
		const fontSize = (
			this._scaleY *
			fontSizeForLineHeight(this._fontName, this._fontSize * (isTextOnlySpan ? this._fontScaleX : 1), this._settings.fallbackFonts, this._fontSizeElement, this._fontMetricsCache)
		).toFixed(3);
		const lineHeight = (this._scaleY * this._fontSize).toFixed(3);

		let fonts = this._fontName;

		// Quote the font family unless it's a generic family, as those must never be quoted
		switch (fonts) {
			case "cursive":
			case "fantasy":
			case "monospace":
			case "sans-serif":
			case "serif":
				break;
			default:
				fonts = `"${ fonts }"`;
				break;
		}

		if (this._settings.fallbackFonts !== "") {
			fonts += `, ${ this._settings.fallbackFonts }`;
		}

		span.style.font = `${ fontStyleOrWeight }${ fontSize }px/${ lineHeight }px ${ fonts }`;

		let textDecoration = "";
		if (this._underline) {
			textDecoration = "underline";
		}
		if (this._strikeThrough) {
			textDecoration += " line-through";
		}
		span.style.textDecoration = textDecoration.trim();

		let transform = "";
		if (isTextOnlySpan) {
			if (this._fontScaleY !== this._fontScaleX) {
				transform += `scaleY(${ (this._fontScaleY / this._fontScaleX).toFixed(3) }) `;
			}
		}
		else {
			if (this._fontScaleX !== 1) {
				transform += `scaleX(${ this._fontScaleX }) `;
			}
			if (this._fontScaleY !== 1) {
				transform += `scaleY(${ this._fontScaleY }) `;
			}
		}
		if (this._rotationY !== null) {
			transform += `rotateY(${ this._rotationY }deg) `;
		}
		if (this._rotationX !== null) {
			transform += `rotateX(${ this._rotationX }deg) `;
		}
		if (this._rotationZ !== 0) {
			transform += `rotateZ(${ -1 * this._rotationZ }deg) `;
		}
		if (this._skewX !== null || this._skewY !== null) {
			const skewX = SpanStyles._valueOrDefault(this._skewX, 0);
			const skewY = SpanStyles._valueOrDefault(this._skewY, 0);
			transform += `matrix(1, ${ skewY }, ${ skewX }, 1, 0, 0) `;
		}
		if (transform !== "") {
			span.style.webkitTransform = transform;
			span.style.webkitTransformOrigin = "50% 50%";
			span.style.transform = transform;
			span.style.transformOrigin = "50% 50%";
			span.style.display = "inline-block";
		}

		span.style.letterSpacing = `${ (this._scaleX * this._letterSpacing).toFixed(3) }px`;

		const outlineWidth = this._scaleX * this._outlineWidth;
		const outlineHeight = this._scaleY * this._outlineHeight;

		const filterWrapperSpan = document.createElement("span");
		filterWrapperSpan.appendChild(span);

		let primaryColor = this._primaryColor.withAlpha(this._primaryAlpha);
		let outlineColor = this._outlineColor.withAlpha(this._outlineAlpha);
		let shadowColor = this._shadowColor.withAlpha(this._shadowAlpha);

		// If we're in non-SVG mode and all colors have the same alpha, then set all colors to alpha === 1 and set the common alpha as the span's opacity property instead
		if (
			!this._settings.enableSvg &&
			((outlineWidth === 0 && outlineHeight === 0) || outlineColor.alpha === primaryColor.alpha) &&
			((this._shadowDepthX === 0 && this._shadowDepthY === 0) || shadowColor.alpha === primaryColor.alpha)
		) {
			primaryColor = this._primaryColor.withAlpha(1);
			outlineColor = this._outlineColor.withAlpha(1);
			shadowColor = this._shadowColor.withAlpha(1);

			span.style.opacity = this._primaryAlpha.toFixed(3);
		}

		span.style.color = primaryColor.toString();

		if (this._settings.enableSvg) {
			this._setSvgOutlineOnSpan(filterWrapperSpan, outlineWidth, outlineHeight, outlineColor, this._primaryAlpha);
		}
		else {
			this._setTextShadowOutlineOnSpan(span, outlineWidth, outlineHeight, outlineColor);
		}

		if (this._shadowDepthX !== 0 || this._shadowDepthY !== 0) {
			const shadowCssString = `${ shadowColor.toString() } ${ (this._shadowDepthX * this._scaleX).toFixed(3) }px ${ (this._shadowDepthY * this._scaleY).toFixed(3) }px 0px`;
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

		span.style.webkitAnimation = animationCollection.animationStyle;
		span.style.animation = animationCollection.animationStyle;

		return filterWrapperSpan;
	}

	/**
	 * @param {!HTMLSpanElement} filterWrapperSpan
	 * @param {number} outlineWidth
	 * @param {number} outlineHeight
	 * @param {!libjass.parts.Color} outlineColor
	 * @param {number} primaryAlpha
	 */
	private _setSvgOutlineOnSpan(filterWrapperSpan: HTMLSpanElement, outlineWidth: number, outlineHeight: number, outlineColor: Color, primaryAlpha: number): void {
		const filterElement = document.createElementNS("http://www.w3.org/2000/svg", "filter");

		if (outlineWidth > 0 || outlineHeight > 0) {
			/* Construct an elliptical border by merging together many rectangles. The border is creating using dilate morphology filters, but these only support
			 * generating rectangles.   http://lists.w3.org/Archives/Public/public-fx/2012OctDec/0003.html
			 */

			// Start with SourceAlpha. Leave the alpha as 0 if it's 0, and set it to 1 if it's greater than 0
			const source = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
			filterElement.appendChild(source);
			source.in1.baseVal = "SourceAlpha";
			source.result.baseVal = "source";

			const sourceAlphaTransferNode = document.createElementNS("http://www.w3.org/2000/svg", "feFuncA");
			source.appendChild(sourceAlphaTransferNode);
			sourceAlphaTransferNode.type.baseVal = SVGComponentTransferFunctionElement.SVG_FECOMPONENTTRANSFER_TYPE_LINEAR;
			sourceAlphaTransferNode.intercept.baseVal = 0;

			/* The alphas of all colored pixels of the SourceAlpha should be made as close to 1 as possible. This way the summed outlines below will be uniformly dark.
			 * Multiply the pixels by 1 / primaryAlpha so that the primaryAlpha pixels become 1. A higher value would make the outline larger and too sharp,
			 * leading to jagged outer edge and transparent space around the inner edge between itself and the SourceGraphic.
			 */
			sourceAlphaTransferNode.slope.baseVal = (primaryAlpha === 0) ? 1 : (1 / primaryAlpha);

			// Merge the individual outlines
			const mergedOutlines = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
			filterElement.appendChild(mergedOutlines);

			let outlineNumber = 0;

			const increment = (!this._settings.preciseOutlines && this._gaussianBlur > 0) ? this._gaussianBlur : 1;

			((addOutline: (x: number, y: number) => void) => {
				if (outlineWidth <= outlineHeight) {
					if (outlineWidth > 0) {
						let x: number;
						for (x = 0; x <= outlineWidth; x += increment) {
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
						let y: number;
						for (y = 0; y <= outlineHeight; y += increment) {
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
				const outlineId = `outline${ outlineNumber }`;

				const outlineFilter = document.createElementNS("http://www.w3.org/2000/svg", "feMorphology");
				filterElement.insertBefore(outlineFilter, mergedOutlines);
				outlineFilter.in1.baseVal = "source";
				outlineFilter.operator.baseVal = SVGFEMorphologyElement.SVG_MORPHOLOGY_OPERATOR_DILATE;
				outlineFilter.radiusX.baseVal = x;
				outlineFilter.radiusY.baseVal = y;
				outlineFilter.result.baseVal = outlineId;

				const outlineReferenceNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
				mergedOutlines.appendChild(outlineReferenceNode);
				outlineReferenceNode.in1.baseVal = outlineId;

				outlineNumber++;
			});

			// Color it with the outline color
			const coloredSource = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
			filterElement.appendChild(coloredSource);
			coloredSource.setAttribute("color-interpolation-filters", "sRGB");

			const outlineRedTransferNode = document.createElementNS("http://www.w3.org/2000/svg", "feFuncR");
			coloredSource.appendChild(outlineRedTransferNode);
			outlineRedTransferNode.type.baseVal = SVGComponentTransferFunctionElement.SVG_FECOMPONENTTRANSFER_TYPE_LINEAR;
			outlineRedTransferNode.slope.baseVal = 0;
			outlineRedTransferNode.intercept.baseVal = outlineColor.red / 255 * outlineColor.alpha;

			const outlineGreenTransferNode = document.createElementNS("http://www.w3.org/2000/svg", "feFuncG");
			coloredSource.appendChild(outlineGreenTransferNode);
			outlineGreenTransferNode.type.baseVal = SVGComponentTransferFunctionElement.SVG_FECOMPONENTTRANSFER_TYPE_LINEAR;
			outlineGreenTransferNode.slope.baseVal = 0;
			outlineGreenTransferNode.intercept.baseVal = outlineColor.green / 255 * outlineColor.alpha;

			const outlineBlueTransferNode = document.createElementNS("http://www.w3.org/2000/svg", "feFuncB");
			coloredSource.appendChild(outlineBlueTransferNode);
			outlineBlueTransferNode.type.baseVal = SVGComponentTransferFunctionElement.SVG_FECOMPONENTTRANSFER_TYPE_LINEAR;
			outlineBlueTransferNode.slope.baseVal = 0;
			outlineBlueTransferNode.intercept.baseVal = outlineColor.blue / 255 * outlineColor.alpha;

			const outlineAlphaTransferNode = document.createElementNS("http://www.w3.org/2000/svg", "feFuncA");
			coloredSource.appendChild(outlineAlphaTransferNode);
			outlineAlphaTransferNode.type.baseVal = SVGComponentTransferFunctionElement.SVG_FECOMPONENTTRANSFER_TYPE_LINEAR;
			outlineAlphaTransferNode.slope.baseVal = outlineColor.alpha;
			outlineAlphaTransferNode.intercept.baseVal = 0;

			// Blur the merged outline
			if (this._gaussianBlur > 0) {
				const gaussianBlurFilter = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
				filterElement.appendChild(gaussianBlurFilter);

				// Don't use setStdDeviation - cloneNode() clears it in Chrome
				gaussianBlurFilter.stdDeviationX.baseVal = this._gaussianBlur;
				gaussianBlurFilter.stdDeviationY.baseVal = this._gaussianBlur;
			}
			for (let i = 0; i < this._blur; i++) {
				const blurFilter = document.createElementNS("http://www.w3.org/2000/svg", "feConvolveMatrix");
				filterElement.appendChild(blurFilter);
				blurFilter.setAttribute("kernelMatrix", "1 2 1 2 4 2 1 2 1");
				blurFilter.edgeMode.baseVal = SVGFEConvolveMatrixElement.SVG_EDGEMODE_NONE;
			}

			// Cut out the source, so only the outline remains
			const outlineCutoutNode = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");
			filterElement.appendChild(outlineCutoutNode);
			outlineCutoutNode.in2.baseVal = "source";
			outlineCutoutNode.operator.baseVal = SVGFECompositeElement.SVG_FECOMPOSITE_OPERATOR_OUT;

			// Merge the outline with the SourceGraphic
			const mergedOutlineAndSourceGraphic = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
			filterElement.appendChild(mergedOutlineAndSourceGraphic);

			const outlineReferenceNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
			mergedOutlineAndSourceGraphic.appendChild(outlineReferenceNode);

			const sourceGraphicReferenceNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
			mergedOutlineAndSourceGraphic.appendChild(sourceGraphicReferenceNode);
			sourceGraphicReferenceNode.in1.baseVal = "SourceGraphic";
		}
		else {
			// Blur the source graphic directly
			if (this._gaussianBlur > 0) {
				const gaussianBlurFilter = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
				filterElement.appendChild(gaussianBlurFilter);

				// Don't use setStdDeviation - cloneNode() clears it in Chrome
				gaussianBlurFilter.stdDeviationX.baseVal = this._gaussianBlur;
				gaussianBlurFilter.stdDeviationY.baseVal = this._gaussianBlur;
			}
			for (let i = 0; i < this._blur; i++) {
				const blurFilter = document.createElementNS("http://www.w3.org/2000/svg", "feConvolveMatrix");
				filterElement.appendChild(blurFilter);
				blurFilter.setAttribute("kernelMatrix", "1 2 1 2 4 2 1 2 1");
				blurFilter.edgeMode.baseVal = SVGFEConvolveMatrixElement.SVG_EDGEMODE_NONE;
			}
		}

		if (filterElement.childElementCount > 0) {
			const filterId = `libjass-svg-filter-${ this._id }-${ this._nextFilterId++ }`;

			this._svgDefsElement.appendChild(filterElement);
			filterElement.id = filterId;
			filterElement.x.baseVal.valueAsString = "-50%";
			filterElement.width.baseVal.valueAsString = "200%";
			filterElement.y.baseVal.valueAsString = "-50%";
			filterElement.height.baseVal.valueAsString = "200%";

			const filterProperty = `url("#${ filterId }")`;
			filterWrapperSpan.style.webkitFilter = filterProperty;
			filterWrapperSpan.style.filter = filterProperty;
		}
	}

	/**
	 * @param {!HTMLSpanElement} span
	 * @param {number} outlineWidth
	 * @param {number} outlineHeight
	 * @param {!libjass.parts.Color} outlineColor
	 */
	private _setTextShadowOutlineOnSpan(span: HTMLSpanElement, outlineWidth: number, outlineHeight: number, outlineColor: Color): void {
		if (outlineWidth > 0 || outlineHeight > 0) {
			let outlineCssString = "";

			((addOutline: (x: number, y: number) => void) => {
				for (let x = 0; x <= outlineWidth; x++) {
					const maxY = (outlineWidth === 0) ? outlineHeight : outlineHeight * Math.sqrt(1 - ((x * x) / (outlineWidth * outlineWidth)));
					for (let y = 0; y <= maxY; y++) {
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
				outlineCssString += `, ${ outlineColor.toString() } ${ x }px ${ y }px ${ this._gaussianBlur.toFixed(3) }px`;
			});

			span.style.textShadow = outlineCssString.substr(", ".length);
		}
	}

	/**
	 * @return {!HTMLBRElement}
	 */
	makeNewLine(): HTMLBRElement {
		const result = document.createElement("br");
		result.style.lineHeight = `${ (this._scaleY * this._fontSize).toFixed(3) }px`;
		return result;
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
	 * Gets the outline width property.
	 *
	 * @type {number}
	 */
	get outlineWidth() {
		return this._outlineWidth;
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
	 * Gets the outline width property.
	 *
	 * @type {number}
	 */
	get outlineHeight() {
		return this._outlineWidth;
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
	 * Gets the shadow width property.
	 *
	 * @type {number}
	 */
	get shadowDepthX() {
		return this._shadowDepthX;
	}

	/**
	 * Sets the shadow width property. null defaults it to the style's original shadow depth value.
	 *
	 * @type {?number}
	 */
	set shadowDepthX(value: number) {
		this._shadowDepthX = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
	}

	/**
	 * Gets the shadow height property.
	 *
	 * @type {number}
	 */
	get shadowDepthY() {
		return this._shadowDepthY;
	}

	/**
	 * Sets the shadow height property. null defaults it to the style's original shadow depth value.
	 *
	 * @type {?number}
	 */
	set shadowDepthY(value: number) {
		this._shadowDepthY = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
	}

	/**
	 * Gets the blur property.
	 *
	 * @type {number}
	 */
	get blur() {
		return this._blur;
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
	 * Gets the Gaussian blur property.
	 *
	 * @type {number}
	 */
	get gaussianBlur() {
		return this._gaussianBlur;
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
	 * Gets the font size property.
	 *
	 * @type {number}
	 */
	get fontSize() {
		return this._fontSize;
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
	 * Gets the horizontal font scaling property.
	 *
	 * @type {number}
	 */
	get fontScaleX() {
		return this._fontScaleX;
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
	 * Gets the vertical font scaling property.
	 *
	 * @type {number}
	 */
	get fontScaleY() {
		return this._fontScaleY;
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
	 * Gets the letter spacing property.
	 *
	 * @type {number}
	 */
	get letterSpacing() {
		return this._letterSpacing;
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
	 * Gets the X-axis rotation property.
	 *
	 * @type {?number}
	 */
	get rotationX() {
		return this._rotationX;
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
	 * Gets the Y-axis rotation property.
	 *
	 * @type {?number}
	 */
	get rotationY() {
		return this._rotationY;
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
	 * Gets the Z-axis rotation property.
	 *
	 * @type {?number}
	 */
	get rotationZ() {
		return this._rotationZ;
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
	 * Gets the X-axis skew property.
	 *
	 * @type {?number}
	 */
	get skewX() {
		return this._skewX;
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
	 * Gets the Y-axis skew property.
	 *
	 * @type {?number}
	 */
	get skewY() {
		return this._skewY;
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
	 * @type {!libjass.Color}
	 */
	get primaryColor(): Color {
		return this._primaryColor;
	}

	/**
	 * Sets the primary color property. null defaults it to the default style's value.
	 *
	 * @type {libjass.Color}
	 */
	set primaryColor(value: Color) {
		this._primaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.primaryColor);
	}

	/**
	 * Gets the secondary color property.
	 *
	 * @type {!libjass.Color}
	 */
	get secondaryColor(): Color {
		return this._secondaryColor;
	}

	/**
	 * Sets the secondary color property. null defaults it to the default style's value.
	 *
	 * @type {libjass.Color}
	 */
	set secondaryColor(value: Color) {
		this._secondaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.secondaryColor);
	}

	/**
	 * Gets the outline color property.
	 *
	 * @type {!libjass.Color}
	 */
	get outlineColor(): Color {
		return this._outlineColor;
	}

	/**
	 * Sets the outline color property. null defaults it to the default style's value.
	 *
	 * @type {libjass.Color}
	 */
	set outlineColor(value: Color) {
		this._outlineColor = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineColor);
	}

	/**
	 * Gets the shadow color property.
	 *
	 * @type {!libjass.Color}
	 */
	get shadowColor(): Color {
		return this._shadowColor;
	}

	/**
	 * Sets the shadow color property. null defaults it to the default style's value.
	 *
	 * @type {libjass.Color}
	 */
	set shadowColor(value: Color) {
		this._shadowColor = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowColor);
	}

	/**
	 * Gets the primary alpha property.
	 *
	 * @type {number}
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
		this._primaryAlpha = SpanStyles._valueOrDefault(value, this._defaultStyle.primaryColor.alpha);
	}

	/**
	 * Gets the secondary alpha property.
	 *
	 * @type {number}
	 */
	get secondaryAlpha(): number {
		return this._secondaryAlpha;
	}

	/**
	 * Sets the secondary alpha property.
	 *
	 * @type {?number}
	 */
	set secondaryAlpha(value: number) {
		this._secondaryAlpha = SpanStyles._valueOrDefault(value, this._defaultStyle.secondaryColor.alpha);
	}

	/**
	 * Gets the outline alpha property.
	 *
	 * @type {number}
	 */
	get outlineAlpha(): number {
		return this._outlineAlpha;
	}

	/**
	 * Sets the outline alpha property.
	 *
	 * @type {?number}
	 */
	set outlineAlpha(value: number) {
		this._outlineAlpha = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineColor.alpha);
	}

	/**
	 * Gets the shadow alpha property.
	 *
	 * @type {number}
	 */
	get shadowAlpha(): number {
		return this._shadowAlpha;
	}

	/**
	 * Sets the shadow alpha property.
	 *
	 * @type {?number}
	 */
	set shadowAlpha(value: number) {
		this._shadowAlpha = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowColor.alpha);
	}

	private static _valueOrDefault = <T>(newValue: T, defaultValue: T): T => ((newValue !== null) ? newValue : defaultValue);
}
