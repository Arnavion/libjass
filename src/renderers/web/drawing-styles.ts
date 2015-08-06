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

import * as parts from "../../parts/index";

/**
 * This class represents an ASS drawing - a set of drawing instructions between {\p} tags.
 *
 * @param {number} outputScaleX
 * @param {number} outputScaleY
 */
export class DrawingStyles {
	private _scale: number = 1;
	private _baselineOffset: number = 0;

	constructor(private _outputScaleX: number, private _outputScaleY: number) { }

	/**
	 * @type {number}
	 */
	set scale(value: number) {
		this._scale = value;
	}

	/**
	 * @type {number}
	 */
	set baselineOffset(value: number) {
		this._baselineOffset = value;
	}

	/**
	 * Converts this drawing to an <svg> element.
	 *
	 * @param {!libjass.parts.DrawingInstructions} drawingInstructions
	 * @param {!libjass.parts.Color} fillColor
	 * @return {!SVGSVGElement}
	 */
	toSVG(drawingInstructions: parts.DrawingInstructions, fillColor: parts.Color): SVGSVGElement {
		const scaleFactor = Math.pow(2, this._scale - 1);
		const scaleX = this._outputScaleX / scaleFactor;
		const scaleY = this._outputScaleY / scaleFactor;

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

		let bboxWidth = 0;
		let bboxHeight = 0;

		for (const instruction of drawingInstructions.instructions) {
			if (instruction instanceof parts.drawing.MoveInstruction) {
				path.pathSegList.appendItem(path.createSVGPathSegMovetoAbs(instruction.x, instruction.y + this._baselineOffset));
				bboxWidth = Math.max(bboxWidth, instruction.x);
				bboxHeight = Math.max(bboxHeight, instruction.y + this._baselineOffset);
			}
			else if (instruction instanceof parts.drawing.LineInstruction) {
				path.pathSegList.appendItem(path.createSVGPathSegLinetoAbs(instruction.x, instruction.y + this._baselineOffset));
				bboxWidth = Math.max(bboxWidth, instruction.x);
				bboxHeight = Math.max(bboxHeight, instruction.y + this._baselineOffset);
			}
			else if (instruction instanceof parts.drawing.CubicBezierCurveInstruction) {
				path.pathSegList.appendItem(path.createSVGPathSegCurvetoCubicAbs(instruction.x3, instruction.y3 + this._baselineOffset, instruction.x1, instruction.y1 + this._baselineOffset, instruction.x2, instruction.y2 + this._baselineOffset));
				bboxWidth = Math.max(bboxWidth, instruction.x1, instruction.x2, instruction.x3);
				bboxHeight = Math.max(bboxHeight, instruction.y1 + this._baselineOffset, instruction.y2 + this._baselineOffset, instruction.y3 + this._baselineOffset);
			}
		}

		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("version", "1.1");
		svg.width.baseVal.valueAsString = `${ (bboxWidth * scaleX).toFixed(3) }px`;
		svg.height.baseVal.valueAsString = `${ (bboxHeight * scaleY).toFixed(3) }px`;

		const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
		svg.appendChild(g);
		g.setAttribute("transform", `scale(${ scaleX.toFixed(3) } ${ scaleY.toFixed(3) })`);

		g.appendChild(path);
		path.setAttribute("fill", fillColor.toString());

		return svg;
	}
}
