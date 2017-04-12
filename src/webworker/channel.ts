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

import { deserialize, serialize } from "../serialization";

import { Map } from "../utility/map";

import { DeferredPromise, Promise } from "../utility/promise";

import { WorkerCommands } from "./commands";
import { getWorkerCommandHandler, registerWorkerCommand } from "./misc";

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
 * The signature of a handler registered to handle a particular command in {@link libjass.webworker.WorkerCommands}
 */
export type WorkerCommandHandler = (parameters: any) => Promise<any>;

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
 * @param {!*} comm The object used to talk to the other side of the channel. When created by the main thread, this is the Worker object.
 * When created by the web worker, this is its global object.
 */
export class WorkerChannelImpl implements WorkerChannel {
	private static _lastRequestId: number = -1;

	private _pendingRequests: Map<number, DeferredPromise<any>> = new Map<number, DeferredPromise<any>>();

	constructor(private _comm: WorkerCommunication) {
		this._comm.addEventListener("message", ev => this._onMessage(ev.data as string), false);
	}

	/**
	 * @param {number} command
	 * @param {*} parameters
	 * @return {!Promise.<*>}
	 */
	request(command: WorkerCommands, parameters: any): Promise<any> {
		const deferred = new DeferredPromise<any>();
		const requestId = ++WorkerChannelImpl._lastRequestId;
		this._pendingRequests.set(requestId, deferred);

		const requestMessage: WorkerRequestMessage = { requestId, command, parameters };
		this._comm.postMessage(serialize(requestMessage));

		return deferred.promise;
	}

	/**
	 * @param {number} requestId
	 */
	cancelRequest(requestId: number): void {
		const deferred = this._pendingRequests.get(requestId);
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
		let { requestId, error, result } = message;
		if (error instanceof Error) {
			error = { message: error.message, stack: error.stack };
		}
		this._comm.postMessage(serialize({ command: WorkerCommands.Response, requestId, error, result }));
	}

	/**
	 * @param {string} rawMessage
	 */
	private _onMessage(rawMessage: string): void {
		const message = deserialize(rawMessage) as { command: WorkerCommands };

		if (message.command === WorkerCommands.Response) {
			const responseMessage = message as any as WorkerResponseMessage;

			const deferred = this._pendingRequests.get(responseMessage.requestId);
			if (deferred !== undefined) {
				this._pendingRequests.delete(responseMessage.requestId);
				if (responseMessage.error === null) {
					deferred.resolve(responseMessage.result);
				}
				else {
					deferred.reject(responseMessage.error);
				}
			}
		}
		else {
			const requestMessage = message as WorkerRequestMessage;
			const requestId = requestMessage.requestId;

			const commandCallback = getWorkerCommandHandler(requestMessage.command);
			if (commandCallback === undefined) {
				this._respond({ requestId, error: new Error(`No handler registered for command ${ requestMessage.command }`), result: null });
				return;
			}

			commandCallback(requestMessage.parameters).then<WorkerResponseMessage>(
				result => ({ requestId, error: null, result }),
				error => ({ requestId, error, result: null }),
			).then(responseMessage => this._respond(responseMessage));
		}
	}
}

registerWorkerCommand(WorkerCommands.Ping, () => Promise.resolve(null));
