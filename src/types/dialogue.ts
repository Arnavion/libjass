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

import { ASS } from "./ass";
import { Style } from "./style";

import { valueOrDefault } from "./misc";

import { parseLineIntoTypedTemplate } from "../parser/misc";

import { parse } from "../parser/parse";

import * as parts from "../parts/index";

import { debugMode } from "../settings";

import { Map } from "../utility/map";

/**
 * This class represents a dialogue in a {@link libjass.ASS} script.
 *
 * @param {!Map.<string, string>} template The template object that contains the dialogue's properties. It is a map of the string values read from the ASS file.
 * @param {string} template["Style"] The name of the default style of this dialogue
 * @param {string} template["Start"] The start time
 * @param {string} template["End"] The end time
 * @param {string} template["Layer"] The layer number
 * @param {string} template["Text"] The text of this dialogue
 * @param {ASS} ass The ASS object to which this dialogue belongs
 */
export class Dialogue {
	private static _lastDialogueId = -1;

	private _id: number;

	private _style: Style;

	private _start: number;
	private _end: number;

	private _layer: number;
	private _alignment: number;

	private _rawPartsString: string;
	private _parts: parts.Part[] = null;

	private _sub: HTMLDivElement = null;

	constructor(template: Map<string, string>, ass: ASS) {
		this._id = ++Dialogue._lastDialogueId;

		const style = template.get("Style");
		this._style = ass.styles.get(style);
		if (this._style === undefined) {
			this._style = ass.styles.get("Default");
		}
		if (this._style === undefined) {
			let styleLine = parseLineIntoTypedTemplate("Style: Default,Open Sans Semibold,36,&H00FFFFFF,&H000000FF,&H00020713,&H00000000,-1,0,0,0,100,100,0,0,1,1.7,0,2,0,0,28,1", ["Name", "Fontname", "Fontsize", "PrimaryColour", "SecondaryColour", "OutlineColour", "BackColour", "Bold", "Italic", "Underline", "StrikeOut", "ScaleX", "ScaleY", "Spacing", "Angle", "BorderStyle", "Outline", "Shadow", "Alignment", "MarginL", "MarginR", "MarginV", "Encoding"]);
			ass.styles.set("Default", new Style(styleLine.template));
			this._style = ass.styles.get("Default");
		}

		this._start = Dialogue._toTime(template.get("Start"));
		this._end = Dialogue._toTime(template.get("End"));

		this._layer = Math.max(valueOrDefault(template, "Layer", parseInt, value => !isNaN(value), "0"), 0);

		this._rawPartsString = template.get("Text");
		if (this._rawPartsString === undefined || this._rawPartsString === null || this._rawPartsString.constructor !== String) {
			throw new Error("Dialogue doesn't have any text.");
		}
	}

	/**
	 * The unique ID of this dialogue. Auto-generated.
	 *
	 * @type {number}
	 */
	get id(): number {
		return this._id;
	}

	/**
	 * The start time of this dialogue.
	 *
	 * @type {number}
	 */
	get start(): number {
		return this._start;
	}

	/**
	 * The end time of this dialogue.
	 *
	 * @type {number}
	 */
	get end(): number {
		return this._end;
	}

	/**
	 * The default style of this dialogue.
	 *
	 * @type {!libjass.Style}
	 */
	get style(): Style {
		return this._style;
	}

	/**
	 * The alignment number of this dialogue.
	 *
	 * @type {number}
	 */
	get alignment(): number {
		if (this._parts === null) {
			this._parsePartsString();
		}

		return this._alignment;
	}

	/**
	 * The layer number of this dialogue.
	 *
	 * @type {number}
	 */
	get layer(): number {
		return this._layer;
	}

	/**
	 * The {@link libjass.parts} of this dialogue.
	 *
	 * @type {!Array.<!libjass.parts.Part>}
	 */
	get parts(): parts.Part[] {
		if (this._parts === null) {
			this._parsePartsString();
		}

		return this._parts;
	}

	/**
	 * @return {string} A simple representation of this dialogue's properties and parts.
	 */
	toString(): string {
		return `#${ this._id } [${ this._start.toFixed(3) }-${ this._end.toFixed(3) }] ${ (this._parts !== null) ? this._parts.join(", ") : this._rawPartsString }`;
	}

	/**
	 * Parses this dialogue's parts from the raw parts string.
	 */
	private _parsePartsString(): void {
		this._parts = <parts.Part[]>parse(this._rawPartsString, "dialogueParts");

		this._alignment = this._style.alignment;

		this._parts.forEach((part, index) => {
			if (part instanceof parts.Alignment) {
				this._alignment = part.value;
			}
			else if (part instanceof parts.Move) {
				if (part.t1 === null || part.t2 === null) {
					this._parts[index] =
						new parts.Move(
							part.x1, part.y1, part.x2, part.y2,
							0, this._end - this._start
						);
				}
			}
			else if (part instanceof parts.Transform) {
				if (part.start === null || part.end === null || part.accel === null) {
					this._parts[index] =
						new parts.Transform(
							(part.start === null) ? 0 : part.start,
							(part.end === null) ? (this._end - this._start) : part.end,
							(part.accel === null) ? 1 : part.accel,
							part.tags
						);
				}
			}
		});

		if (debugMode) {
			const possiblyIncorrectParses = this._parts.filter(part => part instanceof parts.Comment && part.value.indexOf("\\") !== -1);
			if (possiblyIncorrectParses.length > 0) {
				console.warn(
`Possible incorrect parse:
${ this._rawPartsString }
was parsed as
${ this.toString() }
The possibly incorrect parses are:
${ possiblyIncorrectParses.join("\n") }`
				);
			}
		}
	}

	/**
	 * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
	 *
	 * @param {string} str
	 * @return {number}
	 */
	private static _toTime(str: string): number {
		return str.split(":").reduce<number>((previousValue, currentValue) => previousValue * 60 + parseFloat(currentValue), 0);
	}
}
