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

import { Map } from "../utility/map";
import { Set } from "../utility/set";

type DataReader = { dataView: DataView; position: number; };

enum DataType {
	Char,
	Uint16,
	Uint32,
}

type StructMemberDefinition = { type: DataType; field: string; };

const fieldDecorators = new Map<DataType, (proto: any, field: string) => void>();

@struct
class OffsetTable {
	/** @type {function(!{ dataView: DataView, position: number }): OffsetTable} */
	static read: (reader: DataReader) => OffsetTable;

	/** @type {number} */ @field(DataType.Uint16) majorVersion: number;
	/** @type {number} */ @field(DataType.Uint16) minorVersion: number;
	/** @type {number} */ @field(DataType.Uint16) numTables: number;
	/** @type {number} */ @field(DataType.Uint16) searchRange: number;
	/** @type {number} */ @field(DataType.Uint16) entrySelector: number;
	/** @type {number} */ @field(DataType.Uint16) rangeShift: number;
}

@struct
class TableRecord {
	/** @type {function(!{ dataView: DataView, position: number }): TableRecord} */
	static read: (reader: DataReader) => TableRecord;

	/** @type {string} */ @field(DataType.Char) c1: string;
	/** @type {string} */ @field(DataType.Char) c2: string;
	/** @type {string} */ @field(DataType.Char) c3: string;
	/** @type {string} */ @field(DataType.Char) c4: string;
	/** @type {number} */ @field(DataType.Uint32) checksum: number;
	/** @type {number} */ @field(DataType.Uint32) offset: number;
	/** @type {number} */ @field(DataType.Uint32) length: number;
}

@struct
class NameTableHeader {
	/** @type {function(!{ dataView: DataView, position: number }): NameTableHeader} */
	static read: (reader: DataReader) => NameTableHeader;

	/** @type {number} */ @field(DataType.Uint16) formatSelector: number;
	/** @type {number} */ @field(DataType.Uint16) count: number;
	/** @type {number} */ @field(DataType.Uint16) stringOffset: number;
}

@struct
class NameRecord {
	/** @type {function(!{ dataView: DataView, position: number }): NameRecord} */
	static read: (reader: DataReader) => NameRecord;

	/** @type {number} */ @field(DataType.Uint16) platformId: number;
	/** @type {number} */ @field(DataType.Uint16) encodingId: number;
	/** @type {number} */ @field(DataType.Uint16) languageId: number;
	/** @type {number} */ @field(DataType.Uint16) nameId: number;
	/** @type {number} */ @field(DataType.Uint16) length: number;
	/** @type {number} */ @field(DataType.Uint16) offset: number;
}

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

	const reader = { dataView: new DataView(bytes.buffer), position: 0 };

	const offsetTable = OffsetTable.read(reader);
	let nameTableRecord: TableRecord | null = null;
	for (let i = 0; i < offsetTable.numTables; i++) {
		const tableRecord = TableRecord.read(reader);
		if (tableRecord.c1 + tableRecord.c2 + tableRecord.c3 + tableRecord.c4 === "name") {
			nameTableRecord = tableRecord;
			break;
		}
	}
	if (nameTableRecord === null) {
		throw new Error('Could not find "name" table record.');
	}

	reader.position = nameTableRecord.offset;
	const nameTableHeader = NameTableHeader.read(reader);

	const result = new Set<string>();
	for (let i = 0; i < nameTableHeader.count; i++) {
		const nameRecord = NameRecord.read(reader);

		switch (nameRecord.nameId) {
			case 1:
			case 4:
			case 6:
				const recordOffset = nameTableRecord.offset + nameTableHeader.stringOffset + nameRecord.offset;
				const nameBytes = bytes.subarray(recordOffset, recordOffset + nameRecord.length);

				switch (nameRecord.platformId) {
					case 1: {
						let name = "";

						for (let j = 0; j < nameBytes.length; j++) {
							name += String.fromCharCode(nameBytes[j]);
						}

						result.add(name);

						break;
					}

					case 3: {
						let name = "";

						for (let j = 0; j < nameBytes.length; j += 2) {
							name += String.fromCharCode((nameBytes[j] << 8) + nameBytes[j + 1]);
						}

						result.add(name);

						break;
					}
				}

				break;

			default:
				break;
		}
	}

	return result;
}

/**
 * @param {!function(new(): T)} clazz
 * @return {!function(new(): T)}
 */
function struct<T>(clazz: { new (): T; read(reader: DataReader): T; }): { new (): T; read(reader: DataReader): T; } {
	const fields: StructMemberDefinition[] = (clazz as any).__fields;

	clazz.read = (reader: DataReader) => {
		const result: any = new clazz();

		for (const field of fields) {
			let value: any;
			switch (field.type) {
				case DataType.Char:
					value = String.fromCharCode(reader.dataView.getInt8(reader.position));
					reader.position += 1;
					break;

				case DataType.Uint16:
					value = reader.dataView.getUint16(reader.position);
					reader.position += 2;
					break;

				case DataType.Uint32:
					value = reader.dataView.getUint32(reader.position);
					reader.position += 4;
					break;
			}

			result[field.field] = value;
		}

		return result;
	};

	return clazz;
}

/**
 * @param {number} type
 * @return {function(T, string)}
 */
function field<T>(type: DataType): (proto: T, field: string) => void {
	let existingDecorator = fieldDecorators.get(type);
	if (existingDecorator === undefined) {
		existingDecorator = (proto: T, field: string) => {
			const ctor: { __fields?: StructMemberDefinition[] } = proto.constructor;
			if (ctor.__fields === undefined) {
				ctor.__fields = [];
			}

			ctor.__fields.push({ type, field });
		};

		fieldDecorators.set(type, existingDecorator);
	}

	return existingDecorator;
}
