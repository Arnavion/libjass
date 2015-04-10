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
		var fontMap = new Map<string, string[]>();

		var styleSheet = <CSSStyleSheet>linkStyle.sheet;
		var rules: CSSFontFaceRule[] = Array.prototype.filter.call(styleSheet.cssRules, (rule: CSSRule) => rule.type === CSSRule.FONT_FACE_RULE);
		for (let rule of rules) {
			var src = rule.style.getPropertyValue("src");
			if (!src) {
				src = rule.cssText.split("\n")
					.map(line => line.match(/src: ([^;]+);/))
					.filter(matches => matches !== null)
					.map(matches => matches[1])[0];
			}

			var urls = src.split(/,\s*/).map(url => RendererSettings._stripQuotes(url.match(/^url\((.+)\)$/)[1]));
			if (urls.length > 0) {
				var name = RendererSettings._stripQuotes(rule.style.getPropertyValue("font-family"));
				var existingList = fontMap.get(name);
				if (existingList === undefined) {
					existingList = [];
					fontMap.set(name, existingList);
				}
				existingList.unshift.apply(existingList, urls);
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

		var { fontMap = null, preRenderTime = 5, preciseOutlines = false, enableSvg = true } = <RendererSettings>object;
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
