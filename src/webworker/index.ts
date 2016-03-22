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

import { Promise, DeferredPromise } from "../utility/promise";

import { WorkerChannel, WorkerChannelImpl } from "./channel";
export { WorkerChannel } from "./channel";

export { WorkerCommands } from "./commands";

declare const exports: any;

/**
 * Indicates whether web workers are supposed in this environment or not.
 *
 * @type {boolean}
 */
export const supported = typeof Worker !== "undefined";

const _scriptNode = (typeof document !== "undefined" && document.currentScript !== undefined) ? document.currentScript : null;

/**
 * Create a new web worker and returns a {@link libjass.webworker.WorkerChannel} to it.
 *
 * @param {string=} scriptPath The path to libjass.js to be loaded in the web worker. If the browser supports document.currentScript, the parameter is optional and, if not provided,
 * the path will be determined from the src attribute of the <script> element that contains the currently running copy of libjass.js
 * @return {!libjass.webworker.WorkerChannel} A communication channel to the new web worker.
 */
export function createWorker(scriptPath?: string): WorkerChannel {
	if (scriptPath === undefined) {
		if (_scriptNode === null) {
			throw new Error("Could not auto-detect path of libjass.js, and explicit path was not passed in.");
		}

		scriptPath = _scriptNode.src;
	}

	return new WorkerChannelImpl(new Worker(scriptPath));
}

declare const global: any;

if (typeof WorkerGlobalScope !== "undefined" && global instanceof WorkerGlobalScope) {
	// This is a web worker. Set up a channel to talk back to the main thread.
	new WorkerChannelImpl(global);
}
