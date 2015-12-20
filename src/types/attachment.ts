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

/**
 * The type of an attachment.
 */
export enum AttachmentType {
	Font,
	Graphic,
}

/**
 * This class represents an attachment in a {@link libjass.ASS} script.
 *
 * @param {string} filename The filename of this attachment.
 * @param {number} type The type of this attachment.
 */
export class Attachment {
	private _contents: string = "";

	constructor(private _filename: string, private _type: AttachmentType) { }

	/**
	 * The filename of this attachment.
	 *
	 * @type {number}
	 */
	get filename(): string {
		return this._filename;
	}

	/**
	 * The type of this attachment.
	 *
	 * @type {number}
	 */
	get type(): AttachmentType {
		return this._type;
	}

	/**
	 * The contents of this attachment in base64 encoding.
	 *
	 * @type {number}
	 */
	get contents(): string {
		return this._contents;
	}

	/**
	 * The contents of this attachment in base64 encoding.
	 *
	 * @type {number}
	 */
	set contents(value: string) {
		this._contents = value;
	}

	/**
	 * The data URL of this attachment.
	 *
	 * @type {string}
	 */
	get url(): string {
		const mediaType = this._type === AttachmentType.Font ? "application/x-font-ttf" : "application/octet-stream";
		return `data:${ mediaType };base64,${ this.contents }`;
	}
}
