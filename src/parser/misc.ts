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

import { Property, TypedTemplate } from "../types/misc";

import { Map } from "../utility/map";

/**
 * Parses a line into a {@link ./types/misc.Property}.
 *
 * @param {string} line
 * @return {!Property}
 */
export function parseLineIntoProperty(line: string): Property {
	var colonPos = line.indexOf(":");
	if (colonPos === -1) {
		return null;
	}

	var name = line.substr(0, colonPos);
	var value = line.substr(colonPos + 1).replace(/^\s+/, "");

	return { name, value };
}

/**
 * Parses a line into a {@link ./types/misc.TypedTemplate} according to the given format specifier.
 *
 * @param {string} line
 * @param {!Array.<string>} formatSpecifier
 * @return {!TypedTemplate}
 */
export function parseLineIntoTypedTemplate(line: string, formatSpecifier: string[]): TypedTemplate {
	var property = parseLineIntoProperty(line);
	if (property === null) {
		return null;
	}

	var value = property.value.split(",");

	if (value.length > formatSpecifier.length) {
		value[formatSpecifier.length - 1] = value.slice(formatSpecifier.length - 1).join(",");
	}

	var template = new Map<string, string>();
	formatSpecifier.forEach((formatKey, index) => {
		template.set(formatKey, value[index]);
	});

	return { type: property.name, template };
}
