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

import { Attachment } from "../types/attachment";

import { Set } from "../utility/set";

/**
 * Gets all the font names from the given font attachment.
 *
 * @param {!libjass.Attachment} attachment
 * @return {!libjass.Set.<string>}
 */
export function getTtfNames(attachment: Attachment): Set<string> {
	const decoded = atob(attachment.contents);

	const bytes = new Uint8Array(new ArrayBuffer(decoded.length));

	for (let i = 0; i < decoded.length; i++) {
		bytes[i] = decoded.charCodeAt(i);
	}

	const dataView = new DataView(bytes.buffer);

	var offset = 0;
	var [offsetTable, offset] = read(OffsetTable, dataView, offset);
	let nameTableDirectory: TableDirectory = null;
	for (let i = 0; i < offsetTable.numTableDirectories; i++) {
		var [tableDirectory, offset] = read(TableDirectory, dataView, offset);
		if (tableDirectory.tag === "name") {
			nameTableDirectory = tableDirectory;
			break;
		}
	}

	offset = nameTableDirectory.offset;
	var [nameTableHeader, offset] = read(NameTableHeader, dataView, offset);

	const result = new Set<string>();
	for (let i = 0; i < nameTableHeader.nrCount; i++) {
		var [nameRecord, offset] = read(NameRecord, dataView, offset);

		switch (nameRecord.nameId) {
			case 1:
			case 4:
			case 6:
				const recordOffset = nameTableDirectory.offset + nameTableHeader.storageOffset + nameRecord.stringOffset;
				const nameBytes = bytes.subarray(recordOffset, recordOffset + nameRecord.stringLength);

				switch (nameRecord.platformId) {
					case 1: {
						let name = "";

						for (let j = 0; j < nameBytes.length; j++) {
							name += String.fromCharCode(nameBytes[j]);
						}

						result.add(name);
					}
						break;

					case 3: {
						let name = "";

						for (let j = 0; j < nameBytes.length; j += 2) {
							name += String.fromCharCode((nameBytes[j] << 8) + nameBytes[j + 1]);
						}

						result.add(name);
					}
						break;
				}

				break;

			default:
				break;
		}
	}

	return result;
}

/**
 * @param {!function(new(!DataView, number): T, number)} ctor
 * @param {!DataView} dataView
 * @param {number} offset
 * @return {[T, number]}
 */
function read<T>(ctor: { new (dataView: DataView, offset: number): T; size: number; }, dataView: DataView, offset: number): [T, number] {
	const result = new ctor(dataView, offset);
	return [result, offset + ctor.size];
}

/**
 * @param {!DataView} dataView
 * @param {number} offset
 */
class OffsetTable {
	/** @type {number} */
	public numTableDirectories: number;

	constructor(dataView: DataView, offset: number) {
		this.numTableDirectories = dataView.getUint16(offset + 4, false);
	}

	/** @type {number} */
	static size = 2 + 2 + 2 + 2 + 2 + 2;
}

/**
 * @param {!DataView} dataView
 * @param {number} offset
 */
class TableDirectory {
	/** @type {string} */
	public tag: string;

	/** @type {number} */
	public offset: number;

	constructor(dataView: DataView, offset: number) {
		const c1 = dataView.getUint8(offset++);
		const c2 = dataView.getUint8(offset++);
		const c3 = dataView.getUint8(offset++);
		const c4 = dataView.getUint8(offset++);
		this.tag = String.fromCharCode(c1) + String.fromCharCode(c2) + String.fromCharCode(c3) + String.fromCharCode(c4);

		this.offset = dataView.getUint32(offset + 4, false);
	}

	/** @type {number} */
	static size = 4 + 4 + 4 + 4;
}

/**
 * @param {!DataView} dataView
 * @param {number} offset
 */
class NameTableHeader {
	/** @type {number} */
	public nrCount: number;

	/** @type {number} */
	public storageOffset: number;

	constructor(dataView: DataView, offset: number) {
		offset += 2;
		this.nrCount = dataView.getUint16(offset, false); offset += 2;
		this.storageOffset = dataView.getUint16(offset, false);
	}

	/** @type {number} */
	static size = 2 + 2 + 2;
}

/**
 * @param {!DataView} dataView
 * @param {number} offset
 */
class NameRecord {
	/** @type {number} */
	public platformId: number;

	/** @type {number} */
	public encodingId: number;

	/** @type {number} */
	public nameId: number;

	/** @type {number} */
	public stringLength: number;

	/** @type {number} */
	public stringOffset: number;

	constructor(dataView: DataView, offset: number) {
		this.platformId = dataView.getUint16(offset, false); offset += 2;
		this.encodingId = dataView.getUint16(offset, false); offset += 2;
		offset += 2;
		this.nameId = dataView.getUint16(offset, false); offset += 2;
		this.stringLength = dataView.getUint16(offset, false); offset += 2;
		this.stringOffset = dataView.getUint16(offset, false); offset += 2;
	}

	/** @type {number} */
	static size = 2 + 2 + 2 + 2 + 2 + 2;
}
