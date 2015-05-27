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
 * The format of the string passed to {@link libjass.ASS.fromString}
 */
export enum Format {
	ASS,
	SRT,
}

/**
 * The wrapping style defined in the {@link libjass.ScriptProperties}
 */
export enum WrappingStyle {
	SmartWrappingWithWiderTopLine = 0,
	SmartWrappingWithWiderBottomLine = 3,
	EndOfLineWrapping = 1,
	NoLineWrapping = 2,
}

/**
 * The border style defined in the {@link libjass.Style} properties.
 */
export enum BorderStyle {
	Outline = 1,
	OpaqueBox = 3,
}

/**
 * A property.
 */
export interface Property {
	/**
	 * @type {string}
	 */
	name: string;

	/**
	 * @type {string}
	 */
	value: string;
}

/**
 * A template object with a particular type.
 */
export interface TypedTemplate {
	/**
	 * @type {string}
	 */
	type: string;

	/**
	 * @type {!Map.<string, string>}
	 */
	template: Map<string, string>;
}

/**
 * @param {!Map.<string, string>} template
 * @param {string} key
 * @param {function(string):T} converter
 * @param {?function(T):boolean} validator
 * @param {T} defaultValue
 * @return {T}
 */
export function valueOrDefault<T>(template: Map<string, string>, key: string, converter: (str: string) => T, validator: (value: T) => boolean, defaultValue: string): T {
	const value = template.get(key);
	if (value === undefined) {
		return converter(defaultValue);
	}

	try {
		const result = converter(value);

		if (validator !== null && !validator(result)) {
			throw new Error("Validation failed.");
		}

		return result;
	}
	catch (ex) {
		throw new Error(`Property ${ key } has invalid value ${ value } - ${ ex.stack }`);
	}
}
