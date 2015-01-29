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

export import settings = require("./settings");

import set = require("./utility/set");
import map = require("./utility/map");

import promise = require("./utility/promise");
export import DeferredPromise = promise.DeferredPromise;

export import webworker = require("./web-worker");

export import parts = require("./parts/index");

export import parser = require("./parser");

export import renderers = require("./renderers/index");

export import ASS = require("./types/ass");
export import Dialogue = require("./types/dialogue");
export import ScriptProperties = require("./types/script-properties");
export import Style = require("./types/style");

import types = require("./types/misc");
export import BorderStyle = types.BorderStyle;
export import Format = types.Format;
export import WrappingStyle = types.WrappingStyle;

declare var exports: any;

Object.defineProperties(exports, {
	debugMode: {
		get: () => settings.debugMode,
		set: (value: boolean) => settings.debugMode = value,
	},

	verboseMode: {
		get: () => settings.verboseMode,
		set: (value: boolean) => settings.verboseMode = value,
	},
	Set: {
		get: () => set.Set,
		set: (value: typeof set.Set) => set.Set = value,
	},
	Map: {
		get: () => map.Map,
		set: (value: typeof map.Map) => map.Map = value,
	},
	Promise: {
		get: () => promise.Promise,
		set: (value: typeof promise.Promise) => promise.Promise = value,
	},
});
