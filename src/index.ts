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

import * as webworker from "./webworker/index";
export { webworker };

import * as parts from "./parts/index";
export { parts };

import * as parser from "./parser/index";
export { parser };

import * as renderers from "./renderers/index";
export { renderers };

export { ASS } from "./types/ass";
export { Dialogue } from "./types/dialogue";
export { ScriptProperties } from "./types/script-properties";
export { Style } from "./types/style";

export { BorderStyle, Format, WrappingStyle } from "./types/misc";

declare var exports: any;

Object.defineProperties(exports, {
	debugMode: {
		get: () => settings.debugMode,
		set: settings.setDebugMode,
	},

	verboseMode: {
		get: () => settings.verboseMode,
		set: settings.setVerboseMode,
	},
	Set: {
		get: () => set.Set,
		set: set.setImplementation,
	},
	Map: {
		get: () => map.Map,
		set: map.setImplementation,
	},
	Promise: {
		get: () => promise.Promise,
		set: promise.setImplementation,
	},
});
