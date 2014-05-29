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

///<reference path="libjass.ts" />

interface Document {
	currentScript: HTMLScriptElement;
}

interface WorkerGlobalScope {
	postMessage(message: any): void;
	addEventListener(type: string, listener: (message: any) => void, useCapture: boolean): void;
}
declare var WorkerGlobalScope: {
	prototype: WorkerGlobalScope;
	new (): WorkerGlobalScope;
};

module libjass.webworker {
	var _scriptNode: HTMLScriptElement = null;
	if (typeof document !== "undefined" && document.currentScript !== undefined) {
		_scriptNode = document.currentScript;
	}

	/**
	 * The communication channel between the host and the web worker.
	 *
	 * @type {!libjass.webworker.WorkerChannel}
	 */
	export var workerChannel: WorkerChannel = null;

	Object.defineProperty(webworker, "supported", {
		value: typeof Worker !== "undefined",
		configurable: true,
		enumerable: true
	});

	/**
	 * Initialize a worker and a communication channel to it.
	 */
	export function setup(): void {
		workerChannel = new WorkerChannel(new Worker(_scriptNode.src));
	}

	var classPrototypes = new Map<number, any>();
	export function _registerClassPrototype(prototype: any): void {
		prototype._classTag = classPrototypes.size;
		classPrototypes.set(prototype._classTag, prototype);
	}

	export enum WorkerCommands {
		Response = 0
	}

	export interface WorkerResultCallback {
		(error: any, result: any): void;
	}

	export interface WorkerCommandHandler {
		(parameters: any, response: WorkerResultCallback): void;
	}

	var workerCommands = new Map<WorkerCommands, WorkerCommandHandler>();

	/**
	 * Registers a handler for the given worker command.
	 *
	 * @param {number} command The command that this handler will handle. Valid values are the values of libjass.webworker.WorkerCommands
	 * @param {function(*, function(*, *))} handler The handler. A function of the form (parameters: *, response: function(error: *, result: *): void): void
	 */
	export function _registerWorkerCommand(command: WorkerCommands, handler: WorkerCommandHandler) {
		workerCommands.set(command, handler);
	}

	interface WorkerRequestMessage {
		requestId: number;
		command: WorkerCommands;
		parameters: any;
	}

	interface WorkerResponseMessage {
		requestId: number;
		error: any;
		result: any;
	}

	/**
	 * Represents a communication channel between the host and the web worker. Instances of this class are not meant to be created by the user; one will be created for you when you call
	 * libjass.webworker.setup()
	 *
	 * @param {!*} comm The other side of the channel. When created by the host, this is the web worker. When created by the web worker, this is its global object.
	 */
	export class WorkerChannel {
		private _pendingRequests = new Map<number, WorkerResultCallback>();
		private _lastPendingRequestId = 0;

		constructor(private _comm: WorkerGlobalScope) {
			this._comm.addEventListener("message", (message: { data: any }) => this._onMessage(message.data), false);
		}

		/**
		 * Sends a request to the other side to execute the given command with the given parameters and call the give callback when it's done.
		 *
		 * @param {number} command
		 * @param {*} parameters
		 * @param {function(*, *)} callback A function of the form (error: *, result: *): void
		 */
		request(command: WorkerCommands, parameters: any, callback: WorkerResultCallback = null): void {
			var requestId: number = null;

			if (callback !== null) {
				requestId = this._lastPendingRequestId++;
				this._pendingRequests.set(requestId, callback);
			}

			var requestMessage: WorkerRequestMessage = { requestId: requestId, command: command, parameters: parameters };
			this._comm.postMessage(WorkerChannel._toJSON(requestMessage));
		}

		private _respond(message: WorkerResponseMessage): void {
			this._comm.postMessage(WorkerChannel._toJSON({ command: WorkerCommands.Response, requestId: message.requestId, error: message.error, result: message.result }));
		}

		private _onMessage(message: any): void {
			message = WorkerChannel._fromJSON(message);

			if (message.command === WorkerCommands.Response) {
				var responseMessage = <WorkerResponseMessage>message;

				var callback = this._pendingRequests.get(responseMessage.requestId);
				if (callback !== undefined) {
					this._pendingRequests.delete(responseMessage.requestId);
					callback(responseMessage.error, responseMessage.result);
				}

				return;
			}

			var requestMessage = <WorkerRequestMessage>message;

			var commandCallback = workerCommands.get(requestMessage.command);
			if (commandCallback === undefined) {
				this._respond({ requestId: requestMessage.requestId, error: new Error("Unrecognized command: " + requestMessage.command), result: null });
				return;
			}

			commandCallback(requestMessage.parameters, (error: any, result: any) => this._respond({ requestId: requestMessage.requestId, error: error, result: result }));
		}

		private static _toJSON(obj: any): string {
			return JSON.stringify(obj, (key: string, value: any) => {
				if (value && value._classTag !== undefined) {
					value._classTag = value._classTag;
				}

				return value;
			});
		}

		private static _fromJSON(str: string): any {
			return JSON.parse(str, (key: string, value: any) => {
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
		workerChannel = new WorkerChannel(global);
	}
}
