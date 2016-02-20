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

import { Map } from "./utility/map";

const classes = new Map<number, Function & { fromJSON?: (obj: any) => any }>();

/**
 * Registers a class as a serializable type.
 *
 * @param {function(new:*)} clazz
 */
export function registerClass(clazz: Function & { fromJSON?: (obj: any) => any }): void {
	clazz.prototype._classTag = classes.size;
	classes.set(clazz.prototype._classTag, clazz);
}

/**
 * Serializes the given object.
 *
 * @param {*} obj
 * @return {string}
 */
export function serialize(obj: any): string {
	return JSON.stringify(obj, (/* ujs:unreferenced */ key: string, value: any) => {
		if (value && (value._classTag !== undefined) && !Object.prototype.hasOwnProperty.call(value, "_classTag")) {
			// Copy the _classTag from this object's prototype to itself, so that it will be serialized.
			value._classTag = value._classTag;
		}

		return value;
	});
}

/**
 * @param {string} str
 * @return {*}
 */
export function deserialize(str: string): any {
	return JSON.parse(str, (/* ujs:unreferenced */ key: string, value: any) => {
		if (value && (value._classTag !== undefined)) {
			const clazz = classes.get(value._classTag);
			if (typeof clazz.fromJSON === "function") {
				value = clazz.fromJSON(value);
			}
			else {
				const hydratedValue = Object.create(classes.get(value._classTag).prototype);
				for (const key of Object.keys(value)) {
					hydratedValue[key] = value[key];
				}
				value = hydratedValue;
			}
		}

		return value;
	});
}
