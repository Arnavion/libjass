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

import { Keyframe } from "./keyframe";

import { NullRenderer } from "../null";

import { Map } from "../../utility/map";

/**
 * This class represents a collection of animations. Each animation contains one or more keyframes.
 * The collection can then be converted to a CSS3 representation.
 *
 * @param {!libjass.renderers.NullRenderer} renderer The renderer that this collection is associated with
 * @param {!HTMLStyleElement} style A <style> element to insert the animation rules into
 */
export class AnimationCollection {
	private static _nextId: number = 0;

	private _id: string;
	private _rate: number;

	private _animationStyle: string = "";
	private _animationDelays: Map<string, number> = new Map<string, number>();
	private _numAnimations: number = 0;

	constructor(renderer: NullRenderer, private _style: HTMLStyleElement) {
		this._id = `${ renderer.id }-${ AnimationCollection._nextId++ }`;
		this._rate = renderer.clock.rate;
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
	get animationDelays(): Map<string, number> {
		return this._animationDelays;
	}

	/**
	 * Add an animation to this collection. The given keyframes together make one animation.
	 *
	 * @param {string} timingFunction One of the acceptable values for the "animation-timing-function" CSS property
	 * @param {!Array.<!libjass.renderers.Keyframe>} keyframes
	 */
	add(timingFunction: string, keyframes: Keyframe[]): void {
		let start: number = null;
		let end: number = null;

		for (const keyframe of keyframes) {
			if (start === null) {
				start = keyframe.time;
			}

			end = keyframe.time;
		}

		let ruleCssText = "";

		for (const keyframe of keyframes) {
			ruleCssText +=
`	${ (100 * ((end - start === 0) ? 1 : ((keyframe.time - start) / (end - start)))).toFixed(3) }% {
`;

			keyframe.properties.forEach((value, name) => {
				ruleCssText +=
`		${ name }: ${ value };
`;
			});

			ruleCssText +=
`	}
`;
		}

		const animationName = `animation-${ this._id }-${ this._numAnimations++ }`;

		this._style.appendChild(document.createTextNode(
`@-webkit-keyframes ${ animationName } {
${ ruleCssText }
}`));

		this._style.appendChild(document.createTextNode(
`@keyframes ${ animationName } {
${ ruleCssText }
}`));

		if (this._animationStyle !== "") {
			this._animationStyle += ",";
		}

		this._animationStyle += `${ animationName } ${ ((end - start) / this._rate).toFixed(3) }s ${ timingFunction }`;
		this._animationDelays.set(animationName, start);
	}
}
