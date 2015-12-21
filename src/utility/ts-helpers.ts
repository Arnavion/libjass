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
 * Class inheritance shim.
 *
 * @param {!Function} derived
 * @param {!Function} base
 */
export function __extends(derived: any, base: any): void {
	for (const property in base) {
		if (base.hasOwnProperty(property)) {
			derived[property] = base[property];
		}
	}

	function __() {
		this.constructor = derived;
	}

	__.prototype = base.prototype;

	derived.prototype = new (<any>__)();
}

/**
 * Decorator shim.
 *
 * @param {!Array.<!Function>} decorators
 * @param {!*} target
 * @param {string=} key
 * @return {*}
 */
export function __decorate(decorators: Function[], target: any, key?: string): any {
	if (arguments.length < 3) {
		return decorateClass(<any>decorators.reverse(), target);
	}
	else {
		decorateField(<any>decorators.reverse(), target, key);
	}
}

/**
 * Class decorator shim.
 *
 * @param {!Array.<function(function(new(): T)): function(new(): T)>} decorators
 * @param {function(new(): T)} clazz
 * @return {function(new(): T)}
 */
function decorateClass<T>(decorators: ((clazz: { new (...args: any[]): T }) => { new (...args: any[]): T })[], clazz: { new (...args: any[]): T }): { new (...args: any[]): T } {
	for (const decorator of decorators) {
		clazz = decorator(clazz) || clazz;
	}

	return clazz;
}

/**
 * Class member decorator shim.
 *
 * @param {!Array.<function(T, string)>} decorators
 * @param {!T} proto
 * @param {string} name
 */
function decorateField<T>(decorators: ((proto: T, name: string) => void)[], proto: T, name: string): void {
	for (const decorator of decorators) {
		decorator(proto, name);
	}
}
