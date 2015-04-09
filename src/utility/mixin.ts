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
 * Adds properties of the given mixins' prototypes to the given class's prototype.
 *
 * @param {!*} clazz
 * @param {!Array.<*>} mixins
 */
export function mixin(clazz: any, mixins: any[]): void {
	mixins.forEach((mixin: any) => {
		Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
			clazz.prototype[name] = mixin.prototype[name];
		});
	});
}
