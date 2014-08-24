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
	/**
	 * @param {*} message
	 */
	postMessage(message: any): void;

	/**
	 * @param {string} type
	 * @param {function(*)} listener
	 * @param {boolean} useCapture
	 */
	addEventListener(type: string, listener: (message: any) => void, useCapture: boolean): void;
}
declare var WorkerGlobalScope: {
	prototype: WorkerGlobalScope;
	new (): WorkerGlobalScope;
};

module libjass.webworker {
	Object.defineProperty(webworker, "supported", {
		value: typeof Worker !== "undefined",
		configurable: true,
		enumerable: true
	});

	/**
	 * Represents a communication channel between the host and the web worker. An instance of this class is created by calling libjass.webworker.setup()
	 */
	export interface WorkerChannel {
		/**
		 * Sends a request to the other side to execute the given command with the given parameters.
		 *
		 * @param {number} command
		 * @param {*} parameters
		 * @return {!libjass.webworker.WorkerPromise} A promise that will get resolved when the other side computes the result
		 */
		request(command: WorkerCommands, parameters: any): WorkerPromise;
	}

	/**
	 * Create a new web worker.
	 *
	 * @return {!libjass.webworker.WorkerChannel} A communication channel to the new web worker.
	 */
	export function createWorker(): WorkerChannel {
		return new WorkerChannelImpl(new Worker(_scriptNode.src));
	}

	/**
	 * A promise returned by libjass.webworker.WorkerChannel.request()
	 */
	export interface WorkerPromise {
		/**
		 * True if the promise is resolved.
		 *
		 * @type {boolean}
		 */
		resolved: boolean;

		/**
		 * The value of the promise.
		 *
		 * @type {*}
		 */
		result: any;

		/**
		 * Registers a callback to run when this promise is resolved. If the promise is already resolved, the callback is called immediately.
		 *
		 * @param {function(*) } callback A function of the form (promise: *): void
		 */
		then(callback: WorkerPromiseCallback): void;

		/**
		 * Cancels the promise.
		 */
		cancel(): void;
	}

	/**
	 * The signature of a callback called by WorkerPromise when it is resolved.
	 */
	export interface WorkerPromiseCallback {
		(promise: WorkerPromise): void;
	}

	/**
	 * The commands that can be sent to or from a web worker.
	 */
	export enum WorkerCommands {
		Response = 0
	}

	/**
	 * The signature of a handler registered to handle a particular WorkerCommand.
	 */
	export interface WorkerCommandHandler {
		(parameters: any, response: WorkerResultCallback): void;
	}

	/**
	 * The signature of a callback called by a WorkerCommandHandler to report its result back to the caller.
	 */
	export interface WorkerResultCallback {
		(error: any, result: any): void;
	}

	/**
	 * Registers a handler for the given worker command.
	 *
	 * @param {number} command The command that this handler will handle. Valid values are the values of libjass.webworker.WorkerCommands
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
		private _pendingRequests = new Map<number, WorkerPromiseImpl>();

		constructor(private _comm: WorkerCommunication) {
			this._comm.addEventListener("message", ev => this._onMessage(<string>ev.data), false);
		}

		/**
		 * @param {number} command
		 * @param {*} parameters
		 * @return {!libjass.webworker.WorkerPromise}
		 */
		request(command: WorkerCommands, parameters: any): WorkerPromise {
			var promise = new WorkerPromiseImpl(this);
			var requestId = promise.id;
			this._pendingRequests.set(requestId, promise);

			var requestMessage: WorkerRequestMessage = { requestId: requestId, command: command, parameters: parameters };
			this._comm.postMessage(WorkerChannelImpl._toJSON(requestMessage));

			return promise;
		}

		/**
		 * @param {number} requestId
		 */
		cancelRequest(requestId: number): void {
			this._pendingRequests.delete(requestId);
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

				var promise = this._pendingRequests.get(responseMessage.requestId);
				if (promise !== undefined) {
					this._pendingRequests.delete(responseMessage.requestId);
					promise.resolve(responseMessage.error, responseMessage.result);
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

	/**
	 * The actual implementation of libjass.webworker.WorkerPromise
	 *
	 * @param {!WorkerChannelImpl} channel
	 */
	class WorkerPromiseImpl implements WorkerPromise {
		private static _lastPromiseId: number = -1;

		private _id: number = ++WorkerPromiseImpl._lastPromiseId;
		private _resolved: boolean = false;
		private _result: any = null;
		private _error: any = null;
		private _callback: WorkerPromiseCallback = null;

		constructor(private _channel: WorkerChannelImpl) { }

		/**
		 * @type {boolean}
		 */
		get resolved(): boolean {
			return this._resolved;
		}

		/**
		 * @type {*}
		 */
		get result(): any {
			if (!this._resolved) {
				throw new Error("Unresolved promise.");
			}

			if (this._error !== null) {
				throw this._error;
			}

			return this._result;
		}

		/**
		 * @param {function(*) } callback A function of the form (promise: *): void
		 */
		then(callback: WorkerPromiseCallback): void {
			this._callback = callback;
			if (this._resolved) {
				setTimeout(() => this._callback(this), 0);
			}
		}

		cancel(): void {
			if (this._resolved) {
				return;
			}

			this._channel.cancelRequest(this._id);
		}

		/**
		 * @type {number}
		 */
		get id(): number {
			return this._id;
		}

		/**
		 * @param {*} error
		 * @param {*} result
		 */
		resolve(error: any, result: any): void {
			this._resolved = true;
			this._error = error;
			this._result = result;

			if (this._callback !== null) {
				this._callback(this);
			}
		}
	}
}
