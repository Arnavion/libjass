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

/**
 * This class represents a single keyframe. It has a list of CSS properties (names and values) associated with a point in time. Multiple keyframes make up an animation.
 *
 * @param {number} time
 * @param {!Map.<string, string>} properties
 */
export class Keyframe {
	constructor(private _time: number, private _properties: Map<string, string>) { }

	/**
	 * @type {number}
	 */
	get time(): number {
		return this._time;
	}

	/**
	 * @type {!Map.<string, string>}
	 */
	get properties(): Map<string, string> {
		return this._properties;
	}
}
