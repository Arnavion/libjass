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
import { Promise } from "../../utility/promise";

/**
 * @param {string} fontFamily
 * @param {number} fontSize
 * @param {string} fallbackFonts
 * @param {!HTMLDivElement} fontSizeElement
 */
function prepareFontSizeElement(fontFamily: string, fontSize: number, fallbackFonts: string, fontSizeElement: HTMLDivElement): void {
	let fonts = `"${ fontFamily }"`;
	if (fallbackFonts !== "") {
		fonts += `, ${ fallbackFonts }`;
	}

	fontSizeElement.style.fontFamily = fonts;
	fontSizeElement.style.fontSize = `${ fontSize }px`;
}

/**
 * @param {string} fontFamily
 * @param {number} fontSize
 * @param {string} fallbackFonts
 * @param {!HTMLDivElement} fontSizeElement
 * @return {!Promise.<number>}
 */
function lineHeightForFontSize(fontFamily: string, fontSize: number, fallbackFonts: string, fontSizeElement: HTMLDivElement): Promise<number> {
	prepareFontSizeElement(fontFamily, fontSize, fallbackFonts, fontSizeElement);

	return new Promise(resolve => setTimeout(() => resolve(fontSizeElement.offsetHeight), 1000));
}

/**
 * @param {string} fontFamily
 * @param {number} fontSize
 * @param {string} fallbackFonts
 * @param {!HTMLDivElement} fontSizeElement
 * @return {number}
 */
function lineHeightForFontSizeSync(fontFamily: string, fontSize: number, fallbackFonts: string, fontSizeElement: HTMLDivElement): number {
	prepareFontSizeElement(fontFamily, fontSize, fallbackFonts, fontSizeElement);

	return fontSizeElement.offsetHeight;
}

/**
 * @param {number} lowerLineHeight
 * @param {number} upperLineHeight
 * @return {[number, number]}
 */
function fontMetricsFromLineHeights(lowerLineHeight: number, upperLineHeight: number): [number, number] {
	return [lowerLineHeight, (360 - 180) / (upperLineHeight - lowerLineHeight)];
}

/**
 * Calculates font metrics for the given font family.
 *
 * @param {string} fontFamily
 * @param {string} fallbackFonts
 * @param {!HTMLDivElement} fontSizeElement
 * @return {!Promise.<number>}
 */
export function calculateFontMetrics(fontFamily: string, fallbackFonts: string, fontSizeElement: HTMLDivElement): Promise<[number, number]> {
	return lineHeightForFontSize(fontFamily, 180, fallbackFonts, fontSizeElement).then(lowerLineHeight =>
		lineHeightForFontSize(fontFamily, 360, fallbackFonts, fontSizeElement).then(upperLineHeight =>
			fontMetricsFromLineHeights(lowerLineHeight, upperLineHeight)
		)
	);
}

/**
 * @param {number} lineHeight
 * @param {number} lowerLineHeight
 * @param {number} factor
 * @return {number}
 */
function fontSizeFromMetrics(lineHeight: number, lowerLineHeight: number, factor: number): number {
	return 180 + (lineHeight - lowerLineHeight) * factor;
}

/**
 * Uses linear interpolation to calculate the CSS font size that would give the specified line height for the specified font family.
 *
 * WARNING: If fontMetricsCache doesn't already contain a cached value for this font family, and it is not a font already installed on the user's device, then this function
 * may return wrong values. To avoid this, make sure to preload the font using the {@link libjass.renderers.RendererSettings.fontMap} property when constructing the renderer.
 *
 * @param {string} fontFamily
 * @param {number} lineHeight
 * @param {string} fallbackFonts
 * @param {!HTMLDivElement} fontSizeElement
 * @param {!Map.<string, [number, number]>} fontMetricsCache
 * @return {number}
 */
export function fontSizeForLineHeight(fontFamily: string, lineHeight: number, fallbackFonts: string, fontSizeElement: HTMLDivElement, fontMetricsCache: Map<string, [number, number]>): number {
	let existingMetrics = fontMetricsCache.get(fontFamily);
	if (existingMetrics === undefined) {
		const lowerLineHeight = lineHeightForFontSizeSync(fontFamily, 180, fallbackFonts, fontSizeElement);
		const upperLineHeight = lineHeightForFontSizeSync(fontFamily, 360, fallbackFonts, fontSizeElement);
		fontMetricsCache.set(fontFamily, existingMetrics = fontMetricsFromLineHeights(lowerLineHeight, upperLineHeight));
	}

	const [lowerLineHeight, factor] = existingMetrics;
	return fontSizeFromMetrics(lineHeight, lowerLineHeight, factor);
}
