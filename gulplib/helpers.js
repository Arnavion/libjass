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

var stream = require("stream");
var util = require("util");

var Transform = function (transform, flush) {
	if (!(this instanceof Transform)) {
		return new Transform(transform, flush);
	}

	stream.Transform.call(this, { objectMode: true });

	transform = transform || function (chunk, encoding, callback) { callback(); };

	if (transform.length < 3) {
		this._transform = function (chunk, encoding, callback) {
			try {
				transform.call(this, chunk, encoding);
				callback();
			}
			catch (ex) {
				callback(ex);
			}
		};
	}
	else {
		this._transform = transform.bind(this);
	}

	flush = flush || function (callback) { callback(); };
	if (flush.length < 1) {
		this._flush = function (callback) { try { flush.call(this); callback(); } catch (ex) { callback(ex); } };
	}
	else {
		this._flush = flush.bind(this);
	}
};

util.inherits(Transform, stream.Transform);

exports.Transform = Transform;
