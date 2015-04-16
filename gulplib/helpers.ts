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

import { Transform } from "stream";

export function makeTransform<T>(transform: (chunk: any, encoding?: string, callback?: (error?: Error) => void) => void, flush?: (callback?: (error?: Error) => void) => void): Transform {
	return new GulpTransformer<T>(transform, flush);
}

class GulpTransformer<T> extends Transform {
	constructor(transform?: (chunk: T, encoding?: string, callback?: (error?: Error) => void) => void, flush?: (callback?: (error?: Error) => void) => void) {
		super({ objectMode: true });

		transform = transform || ((chunk, encoding, callback) => callback());

		if (transform.length < 3) {
			this._transform = <any>((chunk: T, encoding: string, callback: (error?: Error) => void) => {
				try {
					transform.call(this, chunk, encoding);
					callback();
				}
				catch (ex) {
					callback(ex);
				}
			});
		}
		else {
			this._transform = transform.bind(this);
		}

		flush = flush || (callback => callback());

		if (flush.length < 1) {
			this._flush = ((callback: (error?: Error) => void) => {
				try {
					flush.call(this);
					callback();
				}
				catch (ex) {
					callback(ex);
				}
			});
		}
		else {
			this._flush = flush.bind(this);
		}
	}
}
