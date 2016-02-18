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

import { Map } from "../utility/map";

/**
 * Settings for the renderer.
 */
export class RendererSettings {
	/**
	 * A map of font name to one or more URLs of that font. If provided, the fonts in this map are pre-loaded by the WebRenderer when it's created.
	 *
	 * The key of each entry of the map is the font name used in the ASS script. There are three choices for the value:
	 *
	 * - A single string that you would use for the src attribute of a @font-face rule. Eg: `'url("/fonts.foo.ttf"), url("/fonts/foo-fallback.ttf"), local("Arial.ttf")'`
	 *
	 * - An array of the individual sources that you would use for the src attribute of a @font-face rule. Eg: `['url("/fonts.foo.ttf")', 'url("/fonts/foo-fallback.ttf")', 'local("Arial")']`
	 *
	 * - An array of URLs. Eg: `["/fonts.foo.ttf", "/fonts/foo-fallback.ttf"]`
	 *
	 * Only the first and second forms allow you to use local fonts. The third form only allows you to use remote fonts.
	 *
	 * If you have a <style> or <link> element on the page containing @font-face rules, you can use the {@link libjass.renderers.RendererSettings.makeFontMapFromStyleElement}
	 * convenience method to create a font map.
	 *
	 * Defaults to null.
	 *
	 * @type {!Map.<string, (string|!Array.<string>)>}
	 */
	fontMap: Map<string, string | string[]>;

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
	 * Comma-separated list of fonts to be used when font specified in ASS Styles not loaded.
	 *
	 * The value should be a valid CSS font-family property (i.e. comma-separated and individual names in quotes if necessary). Use empty string to disable fallback.
	 *
	 * Defaults to 'Arial, Helvetica, sans-serif, "Segoe UI Symbol"'.
	 *
	 * @type {string}
	 */
	fallbackFonts: string;

	/**
	 * If true, attached TTF fonts in the ASS script will be used. The font is loaded as a data: URI. Requires ES6 typed arrays (ArrayBuffer, DataView, Uint8Array, etc).
	 *
	 * The font is naively parsed to extract the strings that will be used as the font family. Do not use this option with untrusted fonts or scripts.
	 *
	 * Defaults to false.
	 *
	 * @type {boolean}
	 */
	useAttachedFonts: boolean;

	/**
	 * A convenience method to create a font map from a <style> or <link> element that contains @font-face rules. There should be one @font-face rule for each font name, mapping to a font file URL.
	 *
	 * For example:
	 *
	 *     @font-face {
	 *         font-family: "Helvetica";
	 *         src: url("/fonts/helvetica.ttf"), local("Arial");
	 *     }
	 *
	 * More complicated @font-face syntax like format() or multi-line src are not supported.
	 *
	 * @param {!LinkStyle} linkStyle
	 * @return {!Map.<string, string>}
	 */
	static makeFontMapFromStyleElement(linkStyle: LinkStyle): Map<string, string> {
		const fontMap = new Map<string, string>();

		const styleSheet = <CSSStyleSheet>linkStyle.sheet;
		for (let i = 0; i < styleSheet.cssRules.length; i++) {
			const rule = styleSheet.cssRules[i];

			if (isFontFaceRule(rule)) {
				const name = rule.style.getPropertyValue("font-family").match(/^["']?(.*?)["']?$/)[1];

				let src = rule.style.getPropertyValue("src");
				if (!src) {
					src = rule.cssText.split("\n")
						.map(line => line.match(/src:\s*([^;]+?)\s*;/))
						.filter(matches => matches !== null)
						.map(matches => matches[1])[0];
				}

				fontMap.set(name, src);
			}
		}

		return fontMap;
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

		const {
			fontMap = null,
			preRenderTime = 5,
			preciseOutlines = false,
			enableSvg = true,
			fallbackFonts = 'Arial, Helvetica, sans-serif, "Segoe UI Symbol"',
			useAttachedFonts = false,
		} = <RendererSettings>object;

		const result = new RendererSettings();
		result.fontMap = fontMap;
		result.preRenderTime = preRenderTime;
		result.preciseOutlines = preciseOutlines;
		result.enableSvg = enableSvg;
		result.fallbackFonts = fallbackFonts;
		result.useAttachedFonts = useAttachedFonts;

		return result;
	}
}

/**
 * @param {!CSSRule} rule
 * @return {boolean}
 */
function isFontFaceRule(rule: CSSRule): rule is CSSFontFaceRule {
	return rule.type === CSSRule.FONT_FACE_RULE;
}
