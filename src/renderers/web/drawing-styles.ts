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

import * as parts from "../../parts";

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
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("version", "1.1");

		if (drawingInstructions.instructions.length === 0) {
			return svg;
		}

		const scaleFactor = Math.pow(2, this._scale - 1);
		const scaleX = this._outputScaleX / scaleFactor;
		const scaleY = this._outputScaleY / scaleFactor;

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		let pathString = "";

		let bboxMinX = Infinity;
		let bboxMaxX = -Infinity;
		let bboxMinY = Infinity;
		let bboxMaxY = -Infinity;

		for (const instruction of drawingInstructions.instructions) {
			if (instruction instanceof parts.drawing.MoveInstruction) {
				pathString += ` M ${ instruction.x.toFixed(3) } ${ (instruction.y + this._baselineOffset).toFixed(3) }`;

				bboxMinX = Math.min(bboxMinX, instruction.x);
				bboxMaxX = Math.max(bboxMaxX, instruction.x);
				bboxMinY = Math.min(bboxMinY, instruction.y + this._baselineOffset);
				bboxMaxY = Math.max(bboxMaxY, instruction.y + this._baselineOffset);
			}
			else if (instruction instanceof parts.drawing.LineInstruction) {
				pathString += ` L ${ instruction.x.toFixed(3) } ${ (instruction.y + this._baselineOffset).toFixed(3) }`;

				bboxMinX = Math.min(bboxMinX, instruction.x);
				bboxMaxX = Math.max(bboxMaxX, instruction.x);
				bboxMinY = Math.min(bboxMinY, instruction.y + this._baselineOffset);
				bboxMaxY = Math.max(bboxMaxY, instruction.y + this._baselineOffset);
			}
			else if (instruction instanceof parts.drawing.CubicBezierCurveInstruction) {
				pathString += ` C ${ instruction.x1.toFixed(3) } ${ (instruction.y1 + this._baselineOffset).toFixed(3) } ${ instruction.x2.toFixed(3) } ${ (instruction.y2 + this._baselineOffset).toFixed(3) } ${ instruction.x3.toFixed(3) } ${ (instruction.y3 + this._baselineOffset).toFixed(3) }`;

				bboxMinX = Math.min(bboxMinX, instruction.x1, instruction.x2, instruction.x3);
				bboxMaxX = Math.max(bboxMaxX, instruction.x1, instruction.x2, instruction.x3);
				bboxMinY = Math.min(bboxMinY, instruction.y1 + this._baselineOffset, instruction.y2 + this._baselineOffset, instruction.y3 + this._baselineOffset);
				bboxMaxY = Math.max(bboxMaxY, instruction.y1 + this._baselineOffset, instruction.y2 + this._baselineOffset, instruction.y3 + this._baselineOffset);
			}
		}

		bboxMinX *= scaleX;
		bboxMaxX *= scaleX;
		bboxMinY *= scaleY;
		bboxMaxY *= scaleY;

		const bboxWidth = bboxMaxX - bboxMinX;
		const bboxHeight = bboxMaxY - bboxMinY;

		svg.width.baseVal.valueAsString = `${ bboxWidth.toFixed(3) }px`;
		svg.height.baseVal.valueAsString = `${ bboxHeight.toFixed(3) }px`;
		svg.viewBox.baseVal.x = bboxMinX;
		svg.viewBox.baseVal.y = bboxMinY;
		svg.viewBox.baseVal.width = bboxWidth;
		svg.viewBox.baseVal.height = bboxHeight;
		svg.style.position = "relative";
		svg.style.left = `${ bboxMinX.toFixed(3) }px`;
		svg.style.top = `${ bboxMinY.toFixed(3) }px`;

		const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
		svg.appendChild(g);
		g.setAttribute("transform", `scale(${ scaleX.toFixed(3) } ${ scaleY.toFixed(3) })`);

		g.appendChild(path);
		path.setAttribute("d", pathString);
		path.setAttribute("fill", fillColor.toString());

		return svg;
	}
}
