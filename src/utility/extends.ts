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
	for (var property in base) {
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
