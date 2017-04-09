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

import { WorkerCommandHandler } from "./channel";
import { WorkerCommands } from "./commands";

const workerCommands = new Map<WorkerCommands, WorkerCommandHandler>();

/**
 * Registers a handler for the given worker command.
 *
 * @param {number} command The command that this handler will handle. One of the {@link libjass.webworker.WorkerCommands} constants.
 * @param {function(*, function(*, *))} handler The handler. A function of the form (parameters: *, response: function(error: *, result: *): void): void
 */
export function registerWorkerCommand(command: WorkerCommands, handler: WorkerCommandHandler): void {
	workerCommands.set(command, handler);
}

/**
 * Gets the handler for the given worker command.
 *
 * @param {number} command
 * @return {?function(*, function(*, *))}
 */
export function getWorkerCommandHandler(command: WorkerCommands): WorkerCommandHandler | undefined {
	return workerCommands.get(command);
}
