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
 * Debug mode. When true, libjass logs some debug messages.
 *
 * @type {boolean}
 */
export var debugMode: boolean = false;

/**
 * Verbose debug mode. When true, libjass logs some more debug messages. This setting is independent of {@link libjass.debugMode}
 *
 * @type {boolean}
 */
export var verboseMode: boolean = false;

/**
 * Sets the debug mode.
 *
 * @param {boolean} value
 */
export function setDebugMode(value: boolean): void {
	debugMode = value;
}

/**
 * Sets the verbose debug mode.
 *
 * @param {boolean} value
 */
export function setVerboseMode(value: boolean): void {
	verboseMode = value;
}
