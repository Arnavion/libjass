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

import types = require("./misc");
import WrappingStyle = types.WrappingStyle;

/**
 * This class represents the properties of a {@link libjass.ASS} script.
 */
class ScriptProperties {
	private _resolutionX: number;
	private _resolutionY: number;
	private _wrappingStyle: WrappingStyle;
	private _scaleBorderAndShadow: boolean;

	/**
	 * The horizontal script resolution.
	 *
	 * @type {number}
	 */
	get resolutionX(): number {
		return this._resolutionX;
	}

	/**
	 * The horizontal script resolution.
	 *
	 * @type {number}
	 */
	set resolutionX(value: number) {
		this._resolutionX = value;
	}

	/**
	 * The vertical script resolution.
	 *
	 * @type {number}
	 */
	get resolutionY(): number {
		return this._resolutionY;
	}

	/**
	 * The vertical script resolution.
	 *
	 * @type {number}
	 */
	set resolutionY(value: number) {
		this._resolutionY = value;
	}

	/**
	 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
	 *
	 * @type {number}
	 */
	get wrappingStyle(): WrappingStyle {
		return this._wrappingStyle;
	}

	/**
	 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
	 *
	 * @type {number}
	 */
	set wrappingStyle(value: WrappingStyle) {
		this._wrappingStyle = value;
	}

	/**
	 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
	 *
	 * @type {boolean}
	 */
	get scaleBorderAndShadow(): boolean {
		return this._scaleBorderAndShadow;
	}

	/**
	 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
	 *
	 * @type {boolean}
	 */
	set scaleBorderAndShadow(value: boolean) {
		this._scaleBorderAndShadow = value;
	}
}

export = ScriptProperties;
