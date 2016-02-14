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

import * as settings from "./settings";
export { debugMode, verboseMode } from "./settings";

import * as set from "./utility/set";
export { Set } from "./utility/set";

import * as map from "./utility/map";
export { Map } from "./utility/map";

import * as promise from "./utility/promise";
export { Promise, DeferredPromise } from "./utility/promise";

import * as webworker from "./webworker";
export { webworker };

import * as parts from "./parts";
export { parts };

import * as parser from "./parser";
export { parser };

import * as renderers from "./renderers";
export { renderers };

export { ASS } from "./types/ass";
export { Attachment, AttachmentType } from "./types/attachment";
export { Dialogue } from "./types/dialogue";
export { ScriptProperties } from "./types/script-properties";
export { Style } from "./types/style";

export { BorderStyle, Format, WrappingStyle } from "./types/misc";

/**
 * Configures libjass with the given properties.
 *
 * @param {!*} newConfig
 * @param {boolean} newConfig["debugMode"] When true, libjass logs some debug messages.
 * @param {boolean} newConfig["verboseMode"] When true, libjass logs some more debug messages. This setting is independent of {@link libjass.debugMode}
 * @param {?function(new:Set, !Array.<T>=)} newConfig["Set"] Sets the Set implementation used by libjass to the provided one. If null, {@link ./utility/set.SimpleSet} is used.
 * @param {?function(new:Map, !Array.<!Array.<*>>=)} newConfig["Map"] Sets the Map implementation used by libjass to the provided one. If null, {@link ./utility/map.SimpleMap} is used.
 * @param {?function(new:Promise)} newConfig["Promise"] Sets the Promise implementation used by libjass to the provided one. If null, {@link ./utility/promise.SimplePromise} is used.
 */
export function configure(newConfig: {
	debugMode?: boolean,
	verboseMode?: boolean,
	Set?: typeof set.Set,
	Map?: typeof map.Map,
	Promise?: typeof promise.Promise,
}): void {
	if ("debugMode" in newConfig) {
		settings.setDebugMode(newConfig.debugMode);
	}

	if ("verboseMode" in newConfig) {
		settings.setVerboseMode(newConfig.verboseMode);
	}

	if ("Set" in newConfig) {
		set.setImplementation(newConfig.Set);
	}

	if ("Map" in newConfig) {
		map.setImplementation(newConfig.Map);
	}

	if ("Promise" in newConfig) {
		promise.setImplementation(newConfig.Promise);
	}
}

declare const exports: any;

Object.defineProperties(exports, {
	debugMode: {
		get: () => settings.debugMode,
		set: value => {
			console.warn("Setter `libjass.debugMode = value` has been deprecated. Use `libjass.configure({ debugMode: value })` instead.");
			settings.setDebugMode(value);
		},
	},

	verboseMode: {
		get: () => settings.verboseMode,
		set: value => {
			console.warn("Setter `libjass.verboseMode = value` has been deprecated. Use `libjass.configure({ verboseMode: value })` instead.");
			settings.setVerboseMode(value);
		},
	},

	Set: {
		get: () => set.Set,
		set: value => {
			console.warn("Setter `libjass.Set = value` has been deprecated. Use `libjass.configure({ Set: value })` instead.");
			set.setImplementation(value);
		},
	},

	Map: {
		get: () => map.Map,
		set: value => {
			console.warn("Setter `libjass.Map = value` has been deprecated. Use `libjass.configure({ Map: value })` instead.");
			map.setImplementation(value);
		},
	},

	Promise: {
		get: () => promise.Promise,
		set: value => {
			console.warn("Setter `libjass.Promise = value` has been deprecated. Use `libjass.configure({ Promise: value })` instead.");
			promise.setImplementation(value);
		},
	},
});
