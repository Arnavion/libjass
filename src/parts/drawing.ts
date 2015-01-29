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
 * The base interface of the drawing instructions.
 */
export interface Instruction { }

/**
 * An instruction to move to a particular position.
 *
 * @param {number} x
 * @param {number} y
 */
export class MoveInstruction implements Instruction {
	constructor(private _x: number, private _y: number) { }

	/**
	 * The X position of this move instruction.
	 *
	 * @type {number}
	 */
	get x(): number {
		return this._x;
	}

	/**
	 * The Y position of this move instruction.
	 *
	 * @type {number}
	 */
	get y(): number {
		return this._y;
	}
}

/**
 * An instruction to draw a line to a particular position.
 *
 * @param {number} x
 * @param {number} y
 */
export class LineInstruction implements Instruction {
	constructor(private _x: number, private _y: number) { }

	/**
	 * The X position of this line instruction.
	 *
	 * @type {number}
	 */
	get x(): number {
		return this._x;
	}

	/**
	 * The Y position of this line instruction.
	 *
	 * @type {number}
	 */
	get y(): number {
		return this._y;
	}
}

/**
 * An instruction to draw a cubic bezier curve to a particular position, with two given control points.
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 */
export class CubicBezierCurveInstruction implements Instruction {
	constructor(private _x1: number, private _y1: number, private _x2: number, private _y2: number, private _x3: number, private _y3: number) { }

	/**
	 * The X position of the first control point of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get x1(): number {
		return this._x1;
	}

	/**
	 * The Y position of the first control point of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get y1(): number {
		return this._y1;
	}

	/**
	 * The X position of the second control point of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get x2(): number {
		return this._x2;
	}

	/**
	 * The Y position of the second control point of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get y2(): number {
		return this._y2;
	}

	/**
	 * The ending X position of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get x3(): number {
		return this._x3;
	}

	/**
	 * The ending Y position of this cubic bezier curve instruction.
	 *
	 * @type {number}
	 */
	get y3(): number {
		return this._y3;
	}
}
