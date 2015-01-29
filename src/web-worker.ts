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

import Map = require("./utility/map");

import promise = require("./utility/promise");
import DeferredPromise = promise.DeferredPromise;

///<reference path="web-worker-references.d.ts" />

declare var exports: any;

Object.defineProperty(exports, "supported", {
	value: typeof Worker !== "undefined",
	configurable: true,
	enumerable: true
});

/**
 * Represents a communication channel between the host and the web worker. An instance of this class is created by calling {@link libjass.webworker.createWorker}
 */
export interface WorkerChannel {
	/**
	 * Sends a request to the other side to execute the given command with the given parameters.
	 *
	 * @param {number} command
	 * @param {*} parameters
	 * @return {!Promise.<*>} A promise that will get resolved when the other side computes the result
	 */
	request(command: WorkerCommands, parameters: any): Promise<any>;
}

/**
 * Create a new web worker and returns a {@link libjass.webworker.WorkerChannel} to it.
 *
 * @param {string=} scriptPath The path to libjass.js to be loaded in the web worker. If the browser supports document.currentScript, the parameter is optional and, if not provided,
 * the path will be determined from the src attribute of the <script> element that contains the currently running copy of libjass.js
 * @return {!libjass.webworker.WorkerChannel} A communication channel to the new web worker.
 */
export function createWorker(scriptPath: string = _scriptNode.src): WorkerChannel {
	return new WorkerChannelImpl(new Worker(scriptPath));
}

/**
 * The commands that can be sent to or from a web worker.
 */
export enum WorkerCommands {
	Response = 0,
	Parse = 1,
}

/**
 * The signature of a handler registered to handle a particular command in {@link libjass.webworker.WorkerCommands}
 */
export interface WorkerCommandHandler {
	(parameters: any, response: WorkerResultCallback): void;
}

/**
 * The signature of a callback called by a {@link libjass.webworker.WorkerCommandHandler} to report its result back to the caller.
 */
export interface WorkerResultCallback {
	(error: any, result: any): void;
}

/**
 * Registers a handler for the given worker command.
 *
 * @param {number} command The command that this handler will handle. One of the {@link libjass.webworker.WorkerCommands} constants.
 * @param {function(*, function(*, *))} handler The handler. A function of the form (parameters: *, response: function(error: *, result: *): void): void
 */
export function _registerWorkerCommand(command: WorkerCommands, handler: WorkerCommandHandler): void {
	workerCommands.set(command, handler);
}

/**
 * Registers a prototype as a deserializable type.
 *
 * @param {!*} prototype
 */
export function _registerClassPrototype(prototype: any): void {
	prototype._classTag = classPrototypes.size;
	classPrototypes.set(prototype._classTag, prototype);
}

var _scriptNode: HTMLScriptElement = null;
if (typeof document !== "undefined" && document.currentScript !== undefined) {
	_scriptNode = document.currentScript;
}

var workerCommands = new Map<WorkerCommands, WorkerCommandHandler>();

var classPrototypes = new Map<number, any>();

/**
 * The interface implemented by a communication channel to the other side.
 */
interface WorkerCommunication {
	/**
	 * @param {"message"} type
	 * @param {function(!MessageEvent): *} listener
	 * @param {?boolean} useCapture
	 */
	addEventListener(type: "message", listener: (ev: MessageEvent) => any, useCapture?: boolean): void;

	/**
	 * @param {string} type
	 * @param {!EventListener} listener
	 * @param {?boolean} useCapture
	 */
	addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;

	/**
	 * @param {*} message
	 */
	postMessage(message: any): void;
}

/**
 * The interface implemented by a request sent to the other side of the communication channel.
 */
interface WorkerRequestMessage {
	/**
	 * An internal identifier for this request. Used to connect responses to their corresponding requests.
	 *
	 * @type {number}
	 */
	requestId: number;

	/**
	 * The command type of this request.
	 *
	 * @type {number}
	 */
	command: WorkerCommands;

	/**
	 * Any parameters serialized with this request.
	 *
	 * @type {*}
	 */
	parameters: any;
}

/**
 * The interface implemented by a response received from the other side of the communication channel.
 */
interface WorkerResponseMessage {
	/**
	 * An internal identifier for this response. Used to connect responses to their corresponding requests.
	 *
	 * @type {number}
	 */
	requestId: number;

	/**
	 * Set if the computation of this response resulted in an error.
	 *
	 * @type {*}
	 */
	error: any;

	/**
	 * The result of computing this response.
	 *
	 * @type {*}
	 */
	result: any;
}

/**
 * Internal implementation of libjass.webworker.WorkerChannel
 *
 * @param {!*} comm The other side of the channel. When created by the host, this is the web worker. When created by the web worker, this is its global object.
 */
class WorkerChannelImpl implements WorkerChannel {
	private static _lastRequestId: number = -1;

	private _pendingRequests = new Map<number, DeferredPromise<any>>();

	constructor(private _comm: WorkerCommunication) {
		this._comm.addEventListener("message", ev => this._onMessage(<string>ev.data), false);
	}

	/**
	 * @param {number} command
	 * @param {*} parameters
	 * @return {!Promise.<*>}
	 */
	request(command: WorkerCommands, parameters: any): Promise<any> {
		var deferred = new DeferredPromise<any>();
		var requestId = ++WorkerChannelImpl._lastRequestId;
		this._pendingRequests.set(requestId, deferred);

		var requestMessage: WorkerRequestMessage = { requestId: requestId, command: command, parameters: parameters };
		this._comm.postMessage(WorkerChannelImpl._toJSON(requestMessage));

		return deferred.promise;
	}

	/**
	 * @param {number} requestId
	 */
	cancelRequest(requestId: number): void {
		var deferred = this._pendingRequests.get(requestId);
		if (deferred === undefined) {
			return;
		}

		this._pendingRequests.delete(requestId);
		deferred.reject(new Error("Cancelled."));
	}

	/**
	 * @param {!WorkerResponseMessage} message
	 */
	private _respond(message: WorkerResponseMessage): void {
		this._comm.postMessage(WorkerChannelImpl._toJSON({ command: WorkerCommands.Response, requestId: message.requestId, error: message.error, result: message.result }));
	}

	/**
	 * @param {string} rawMessage
	 */
	private _onMessage(rawMessage: string): void {
		var message = <{ command: WorkerCommands }>WorkerChannelImpl._fromJSON(rawMessage);

		if (message.command === WorkerCommands.Response) {
			var responseMessage = <WorkerResponseMessage><any>message;

			var deferred = this._pendingRequests.get(responseMessage.requestId);
			if (deferred !== undefined) {
				this._pendingRequests.delete(responseMessage.requestId);
				if (responseMessage.error === null) {
					deferred.resolve(responseMessage.result);
				}
				else {
					deferred.reject(responseMessage.error);
				}
			}

			return;
		}

		var requestMessage = <WorkerRequestMessage>message;

		var commandCallback = workerCommands.get(requestMessage.command);
		if (commandCallback === undefined) {
			this._respond({ requestId: requestMessage.requestId, error: new Error(`Unrecognized command: ${ requestMessage.command }`), result: null });
			return;
		}

		commandCallback(requestMessage.parameters, (error: any, result: any) => this._respond({ requestId: requestMessage.requestId, error: error, result: result }));
	}

	/**
	 * @param {*} obj
	 * @return {string}
	 */
	private static _toJSON(obj: any): string {
		return JSON.stringify(obj, (/* ujs:unreferenced */ key: string, value: any) => {
			if (value && value._classTag !== undefined) {
				value._classTag = value._classTag;
			}

			return value;
		});
	}

	/**
	 * @param {string} str
	 * @return {*}
	 */
	private static _fromJSON(str: string): any {
		return JSON.parse(str, (/* ujs:unreferenced */ key: string, value: any) => {
			if (value && value._classTag !== undefined) {
				var hydratedValue = Object.create(classPrototypes.get(value._classTag));
				Object.keys(value).forEach(key => {
					if (key !== "_classTag") {
						hydratedValue[key] = value[key];
					}
				});
				value = hydratedValue;
			}

			return value;
		});
	}
}

var inWorker = (typeof WorkerGlobalScope !== "undefined" && global instanceof WorkerGlobalScope);
if (inWorker) {
	new WorkerChannelImpl(<WorkerGlobalScope><any>global);
}
