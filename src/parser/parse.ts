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

import * as parts from "../parts";

import { debugMode } from "../settings";

import { Map } from "../utility/map";

const rules = new Map<string, (parent: ParseNode) => ParseNode>();

/**
 * Parses a given string with the specified rule.
 *
 * @param {string} input The string to be parsed.
 * @param {string} rule The rule to parse the string with
 * @return {*} The value returned depends on the rule used.
 */
export function parse(input: string, rule: string): any {
	const { result } = new ParserRun(input, rule);

	if (result === null || result.end !== input.length) {
		if (debugMode) {
			console.error("Parse failed. %s %s %o", rule, input, result);
		}

		throw new Error("Parse failed.");
	}

	return result.value;
}

/**
 * This class represents a single run of the parser.
 *
 * @param {string} input
 * @param {string} rule
 */
class ParserRun {
	private _parseTree: ParseNode;
	private _result: ParseNode;

	constructor(private _input: string, rule: string) {
		const ruleFunction = rules.get(rule);
		if (ruleFunction === undefined) {
			throw new Error(`Could not find parser rule named ${ rule }`);
		}

		this._parseTree = new ParseNode(null);

		this._result = ruleFunction.call(this, this._parseTree);
	}

	/**
	 * @type {ParseNode}
	 */
	get result(): ParseNode {
		return this._result;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_dialogueParts(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		current.value = [];

		while (this._haveMore()) {
			const enclosedTagsNode = this.parse_enclosedTags(current);

			if (enclosedTagsNode !== null) {
				current.value.push(...enclosedTagsNode.value);
			}

			else {
				const whiteSpaceOrTextNode = this.parse_newline(current) || this.parse_hardspace(current) || this.parse_text(current);

				if (whiteSpaceOrTextNode.value instanceof parts.Text && current.value[current.value.length - 1] instanceof parts.Text) {
					// Merge consecutive text parts into one part
					const previousTextPart = current.value[current.value.length - 1] as parts.Text;
					current.value[current.value.length - 1] = new parts.Text(previousTextPart.value + (whiteSpaceOrTextNode.value as parts.Text).value);
				}
				else {
					current.value.push(whiteSpaceOrTextNode.value);
				}
			}
		}

		let inDrawingMode = false;

		current.value.forEach((part: parts.Part, i: number) => {
			if (part instanceof parts.DrawingMode) {
				inDrawingMode = part.scale !== 0;
			}

			else if (part instanceof parts.Text && inDrawingMode) {
				current.value[i] = new parts.DrawingInstructions(parse(part.value, "drawingInstructions") as parts.drawing.Instruction[]);
			}
		});

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_enclosedTags(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		current.value = [];

		if (this.read(current, "{") === null) {
			parent.pop();
			return null;
		}

		for (let next = this._peek(); this._haveMore() && next !== "}"; next = this._peek()) {
			let childNode: ParseNode = null;

			if (this.read(current, "\\") !== null) {
				childNode =
					this.parse_tag_alpha(current) ||
					this.parse_tag_iclip(current) ||
					this.parse_tag_xbord(current) ||
					this.parse_tag_ybord(current) ||
					this.parse_tag_xshad(current) ||
					this.parse_tag_yshad(current) ||

					this.parse_tag_blur(current) ||
					this.parse_tag_bord(current) ||
					this.parse_tag_clip(current) ||
					this.parse_tag_fade(current) ||
					this.parse_tag_fscx(current) ||
					this.parse_tag_fscy(current) ||
					this.parse_tag_move(current) ||
					this.parse_tag_shad(current) ||

					this.parse_tag_fad(current) ||
					this.parse_tag_fax(current) ||
					this.parse_tag_fay(current) ||
					this.parse_tag_frx(current) ||
					this.parse_tag_fry(current) ||
					this.parse_tag_frz(current) ||
					this.parse_tag_fsp(current) ||
					this.parse_tag_fsplus(current) ||
					this.parse_tag_fsminus(current) ||
					this.parse_tag_org(current) ||
					this.parse_tag_pbo(current) ||
					this.parse_tag_pos(current) ||

					this.parse_tag_an(current) ||
					this.parse_tag_be(current) ||
					this.parse_tag_fn(current) ||
					this.parse_tag_fr(current) ||
					this.parse_tag_fs(current) ||
					this.parse_tag_kf(current) ||
					this.parse_tag_ko(current) ||
					this.parse_tag_1a(current) ||
					this.parse_tag_1c(current) ||
					this.parse_tag_2a(current) ||
					this.parse_tag_2c(current) ||
					this.parse_tag_3a(current) ||
					this.parse_tag_3c(current) ||
					this.parse_tag_4a(current) ||
					this.parse_tag_4c(current) ||

					this.parse_tag_a(current) ||
					this.parse_tag_b(current) ||
					this.parse_tag_c(current) ||
					this.parse_tag_i(current) ||
					this.parse_tag_k(current) ||
					this.parse_tag_K(current) ||
					this.parse_tag_p(current) ||
					this.parse_tag_q(current) ||
					this.parse_tag_r(current) ||
					this.parse_tag_s(current) ||
					this.parse_tag_t(current) ||
					this.parse_tag_u(current);

				if (childNode === null) {
					current.pop(); // Unread backslash
				}
			}

			if (childNode === null) {
				childNode = this.parse_comment(current);
			}

			if (childNode !== null) {
				if (childNode.value instanceof parts.Comment && current.value[current.value.length - 1] instanceof parts.Comment) {
					// Merge consecutive comment parts into one part
					current.value[current.value.length - 1] =
						new parts.Comment(
							(current.value[current.value.length - 1] as parts.Comment).value +
							(childNode.value as parts.Comment).value
						);
				}
				else {
					current.value.push(childNode.value);
				}
			}
			else {
				parent.pop();
				return null;
			}
		}

		if (this.read(current, "}") === null) {
			parent.pop();
			return null;
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_newline(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "\\N") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.NewLine();

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_hardspace(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "\\h") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.Text("\u00A0");

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_text(parent: ParseNode): ParseNode {
		const value = this._peek();

		const current = new ParseNode(parent);
		const valueNode = new ParseNode(current, value);

		current.value = new parts.Text(valueNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_comment(parent: ParseNode): ParseNode {
		const value = this._peek();

		const current = new ParseNode(parent);
		const valueNode = new ParseNode(current, value);

		current.value = new parts.Comment(valueNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_a(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "a") === null) {
			parent.pop();
			return null;
		}

		let next = this._peek();

		switch (next) {
			case "1":
				const next2 = this._peek(2);

				switch (next2) {
					case "10":
					case "11":
						next = next2;
						break;
				}

				break;

			case "2":
			case "3":
			case "5":
			case "6":
			case "7":
			case "9":
				break;

			default:
				parent.pop();
				return null;
		}

		const valueNode = new ParseNode(current, next);

		let value: number;
		switch (valueNode.value) {
			case "1":
				value = 1;
				break;

			case "2":
				value = 2;
				break;

			case "3":
				value = 3;
				break;

			case "5":
				value = 7;
				break;

			case "6":
				value = 8;
				break;

			case "7":
				value = 9;
				break;

			case "9":
				value = 4;
				break;

			case "10":
				value = 5;
				break;

			case "11":
				value = 6;
				break;
		}

		current.value = new parts.Alignment(value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_alpha(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_an(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "an") === null) {
			parent.pop();
			return null;
		}

		const next = this._peek();

		if (next < "1" || next > "9") {
			parent.pop();
			return null;
		}

		const valueNode = new ParseNode(current, next);

		current.value = new parts.Alignment(parseInt(valueNode.value));

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_b(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "b") === null) {
			parent.pop();
			return null;
		}

		let valueNode: ParseNode = null;

		let next = this._peek();

		if (next >= "1" && next <= "9") {
			next = this._peek(3);
			if (next.substr(1) === "00") {
				valueNode = new ParseNode(current, next);
				valueNode.value = parseInt(valueNode.value);
			}
		}

		if (valueNode === null) {
			valueNode = this.parse_enableDisable(current);
		}

		if (valueNode !== null) {
			current.value = new parts.Bold(valueNode.value);
		}
		else {
			current.value = new parts.Bold(null);
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_be(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_blur(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_bord(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_c(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_clip(parent: ParseNode): ParseNode {
		return this._parse_tag_clip_or_iclip("clip", parent);
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fad(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fad") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		const startNode = this.parse_decimal(current);
		if (startNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const endNode = this.parse_decimal(current);
		if (endNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.Fade(startNode.value / 1000, endNode.value / 1000);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fade(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fade") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		const a1Node = this.parse_decimal(current);
		if (a1Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const a2Node = this.parse_decimal(current);
		if (a2Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const a3Node = this.parse_decimal(current);
		if (a3Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const t1Node = this.parse_decimal(current);
		if (t1Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const t2Node = this.parse_decimal(current);
		if (t2Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const t3Node = this.parse_decimal(current);
		if (t3Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const t4Node = this.parse_decimal(current);
		if (t4Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		current.value =
			new parts.ComplexFade(
				1 - a1Node.value / 255, 1 - a2Node.value / 255, 1 - a3Node.value / 255,
				t1Node.value / 1000, t2Node.value / 1000, t3Node.value / 1000, t4Node.value / 1000
			);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fax(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fay(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fn(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fn") === null) {
			parent.pop();
			return null;
		}

		const valueNode = new ParseNode(current, "");

		for (let next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
			valueNode.value += next;
		}

		if (valueNode.value.length > 0) {
			current.value = new parts.FontName(valueNode.value);
		}
		else {
			current.value = new parts.FontName(null);
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fr(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_frx(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fry(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_frz(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fs(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fsplus(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fs+") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.FontSizePlus(valueNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fsminus(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fs-") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.FontSizeMinus(valueNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fscx(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fscx") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode !== null) {
			current.value = new parts.FontScaleX(valueNode.value / 100);
		}
		else {
			current.value = new parts.FontScaleX(null);
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fscy(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "fscy") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode !== null) {
			current.value = new parts.FontScaleY(valueNode.value / 100);
		}
		else {
			current.value = new parts.FontScaleY(null);
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_fsp(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_i(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_iclip(parent: ParseNode): ParseNode {
		return this._parse_tag_clip_or_iclip("iclip", parent);
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_k(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "k") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.ColorKaraoke(valueNode.value / 100);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_K(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "K") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.SweepingColorKaraoke(valueNode.value / 100);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_kf(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "kf") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.SweepingColorKaraoke(valueNode.value / 100);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_ko(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "ko") === null) {
			parent.pop();
			return null;
		}

		const valueNode = this.parse_decimal(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.OutlineKaraoke(valueNode.value / 100);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_move(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "move") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		const x1Node = this.parse_decimal(current);
		if (x1Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const y1Node = this.parse_decimal(current);
		if (y1Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const x2Node = this.parse_decimal(current);
		if (x2Node === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const y2Node = this.parse_decimal(current);
		if (y2Node === null) {
			parent.pop();
			return null;
		}

		let t1Node: ParseNode = null;
		let t2Node: ParseNode = null;

		if (this.read(current, ",") !== null) {
			t1Node = this.parse_decimal(current);
			if (t1Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			t2Node = this.parse_decimal(current);
			if (t2Node === null) {
				parent.pop();
				return null;
			}
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.Move(
			x1Node.value, y1Node.value, x2Node.value, y2Node.value,
			(t1Node !== null) ? (t1Node.value / 1000) : null, (t2Node !== null) ? (t2Node.value / 1000) : null
		);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_org(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "org") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		const xNode = this.parse_decimal(current);
		if (xNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const yNode = this.parse_decimal(current);
		if (yNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.RotationOrigin(xNode.value, yNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_p(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_pbo(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_pos(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "pos") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		const xNode = this.parse_decimal(current);
		if (xNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ",") === null) {
			parent.pop();
			return null;
		}

		const yNode = this.parse_decimal(current);
		if (yNode === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		current.value = new parts.Position(xNode.value, yNode.value);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_q(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "q") === null) {
			parent.pop();
			return null;
		}

		const next = this._peek();

		if (next < "0" || next > "3") {
			parent.pop();
			return null;
		}

		const valueNode = new ParseNode(current, next);

		current.value = new parts.WrappingStyle(parseInt(valueNode.value));

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_r(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "r") === null) {
			parent.pop();
			return null;
		}

		const valueNode = new ParseNode(current, "");

		for (let next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
			valueNode.value += next;
		}

		if (valueNode.value.length > 0) {
			current.value = new parts.Reset(valueNode.value);
		}
		else {
			current.value = new parts.Reset(null);
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_s(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_shad(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_t(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, "t") === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		let startNode: ParseNode = null;
		let endNode: ParseNode = null;
		let accelNode: ParseNode = null;

		const firstNode = this.parse_decimal(current);
		if (firstNode !== null) {
			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			const secondNode = this.parse_decimal(current);
			if (secondNode !== null) {
				startNode = firstNode;
				endNode = secondNode;

				if (this.read(current, ",") === null) {
					parent.pop();
					return null;
				}

				const thirdNode = this.parse_decimal(current);
				if (thirdNode !== null) {
					accelNode = thirdNode;

					if (this.read(current, ",") === null) {
						parent.pop();
						return null;
					}
				}
			}
			else {
				accelNode = firstNode;

				if (this.read(current, ",") === null) {
					parent.pop();
					return null;
				}
			}
		}

		const transformTags: parts.Part[] = [];

		for (let next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
			let childNode: ParseNode = null;

			if (this.read(current, "\\") !== null) {
				childNode =
					this.parse_tag_alpha(current) ||
					this.parse_tag_iclip(current) ||
					this.parse_tag_xbord(current) ||
					this.parse_tag_ybord(current) ||
					this.parse_tag_xshad(current) ||
					this.parse_tag_yshad(current) ||

					this.parse_tag_blur(current) ||
					this.parse_tag_bord(current) ||
					this.parse_tag_clip(current) ||
					this.parse_tag_fscx(current) ||
					this.parse_tag_fscy(current) ||
					this.parse_tag_shad(current) ||

					this.parse_tag_fax(current) ||
					this.parse_tag_fay(current) ||
					this.parse_tag_frx(current) ||
					this.parse_tag_fry(current) ||
					this.parse_tag_frz(current) ||
					this.parse_tag_fsp(current) ||
					this.parse_tag_fsplus(current) ||
					this.parse_tag_fsminus(current) ||

					this.parse_tag_be(current) ||
					this.parse_tag_fr(current) ||
					this.parse_tag_fs(current) ||
					this.parse_tag_1a(current) ||
					this.parse_tag_1c(current) ||
					this.parse_tag_2a(current) ||
					this.parse_tag_2c(current) ||
					this.parse_tag_3a(current) ||
					this.parse_tag_3c(current) ||
					this.parse_tag_4a(current) ||
					this.parse_tag_4c(current) ||

					this.parse_tag_c(current);

				if (childNode === null) {
					current.pop(); // Unread backslash
				}
			}

			if (childNode === null) {
				childNode = this.parse_comment(current);
			}

			if (childNode !== null) {
				if (childNode.value instanceof parts.Comment && transformTags[transformTags.length - 1] instanceof parts.Comment) {
					// Merge consecutive comment parts into one part
					transformTags[transformTags.length - 1] =
						new parts.Comment(
							(transformTags[transformTags.length - 1] as parts.Comment).value +
							(childNode.value as parts.Comment).value
						);
				}
				else {
					transformTags.push(childNode.value);
				}
			}
			else {
				parent.pop();
				return null;
			}
		}

		this.read(current, ")");

		current.value =
			new parts.Transform(
				(startNode !== null) ? (startNode.value / 1000) : null,
				(endNode !== null) ? (endNode.value / 1000) : null,
				(accelNode !== null) ? (accelNode.value / 1000) : null,
				transformTags
			);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_u(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_xbord(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_xshad(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_ybord(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_yshad(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_1a(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_1c(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_2a(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_2c(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_3a(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_3c(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_4a(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_tag_4c(parent: ParseNode): ParseNode {
		throw new Error("Method not implemented.");
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_drawingInstructions(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		let currentType: string = null;
		const numberParts: ParseNode[] = [];

		current.value = [];

		while (this._haveMore()) {
			while (this.read(current, " ") !== null) { }
			if (!this._haveMore()) {
				break;
			}

			if (currentType !== null) {
				const numberPart = this.parse_decimal(current);
				if (numberPart !== null) {
					numberParts.push(numberPart);

					if (currentType === "m" && numberParts.length === 2) {
						current.value.push(new parts.drawing.MoveInstruction(numberParts[0].value, numberParts[1].value));
						numberParts.splice(0, numberParts.length);
					}
					else if (currentType === "l" && numberParts.length === 2) {
						current.value.push(new parts.drawing.LineInstruction(numberParts[0].value, numberParts[1].value));
						numberParts.splice(0, numberParts.length);
					}
					else if (currentType === "b" && numberParts.length === 6) {
						current.value.push(new parts.drawing.CubicBezierCurveInstruction(
							numberParts[0].value, numberParts[1].value,
							numberParts[2].value, numberParts[3].value,
							numberParts[4].value, numberParts[5].value));
						numberParts.splice(0, numberParts.length);
					}

					continue;
				}
			}

			const typePart = this.parse_text(current);
			const newType = (typePart.value as parts.Text).value;
			switch (newType) {
				case "m":
				case "l":
				case "b":
					currentType = newType;
					numberParts.splice(0, numberParts.length);
					break;
			}
		}

		while (this.read(current, " ") !== null) { }

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_decimalInt32(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const isNegative = this.read(current, "-") !== null;

		const numberNode = new ParseNode(current, "");
		for (let next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
			numberNode.value += next;
		}

		if (numberNode.value.length === 0) {
			parent.pop();
			return null;
		}

		let value = parseInt(numberNode.value);
		if (value >= 0xFFFFFFFF) {
			value = 0xFFFFFFFF;
		}
		else if (isNegative) {
			value = -value;
		}

		current.value = value;

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_hexInt32(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const isNegative = this.read(current, "-") !== null;

		const numberNode = new ParseNode(current, "");
		for (
			let next = this._peek();
			this._haveMore() && (
				(next >= "0" && next <= "9") ||
				(next >= "a" && next <= "f") ||
				(next >= "A" && next <= "F")
			);
			next = this._peek()) {

			numberNode.value += next;
		}

		if (numberNode.value.length === 0) {
			parent.pop();
			return null;
		}

		let value = parseInt(numberNode.value, 16);
		if (value >= 0xFFFFFFFF) {
			value = 0xFFFFFFFF;
		}
		else if (isNegative) {
			value = -value;
		}

		current.value = value;

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_decimalOrHexInt32(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const valueNode =
			(this.read(current, "&H") !== null || this.read(current, "&h") !== null) ?
				 this.parse_hexInt32(current) :
				 this.parse_decimalInt32(current);

		if (valueNode === null) {
			parent.pop();
			return null;
		}

		current.value = valueNode.value;

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_decimal(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const negative = (this.read(current, "-") !== null);

		const numericalPart = this.parse_unsignedDecimal(current);

		if (numericalPart === null) {
			parent.pop();
			return null;
		}

		current.value = numericalPart.value;

		if (negative) {
			current.value = -current.value;
		}

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_unsignedDecimal(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const characteristicNode = new ParseNode(current, "");

		let mantissaNode: ParseNode = null;

		for (let next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
			characteristicNode.value += next;
		}

		if (characteristicNode.value.length === 0) {
			parent.pop();
			return null;
		}

		if (this.read(current, ".") !== null) {
			mantissaNode = new ParseNode(current, "");

			for (let next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
				mantissaNode.value += next;
			}

			if (mantissaNode.value.length === 0) {
				parent.pop();
				return null;
			}
		}

		current.value = parseFloat(characteristicNode.value + ((mantissaNode !== null) ? ("." + mantissaNode.value) : ""));

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_enableDisable(parent: ParseNode): ParseNode {
		const next = this._peek();

		if (next === "0" || next === "1") {
			const result = new ParseNode(parent, next);
			result.value = (result.value === "1");

			return result;
		}

		return null;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_color(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		while (this.read(current, "&") !== null || this.read(current, "H") !== null) { }

		const valueNode = this.parse_hexInt32(current);
		if (valueNode === null) {
			parent.pop();
			return null;
		}

		const value = valueNode.value;

		current.value = new parts.Color(
			value & 0xFF,
			(value >> 8) & 0xFF,
			(value >> 16) & 0xFF
		);

		while (this.read(current, "&") !== null || this.read(current, "H") !== null) { }

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_alpha(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		while (this.read(current, "&") !== null || this.read(current, "H") !== null) { }

		const valueNode = this.parse_hexInt32(current);
		if (valueNode === null) {
			parent.pop();
			return null;
		}

		const value = valueNode.value;

		current.value = 1 - (value & 0xFF) / 0xFF;

		while (this.read(current, "&") !== null || this.read(current, "H") !== null) { }

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	parse_colorWithAlpha(parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		const valueNode = this.parse_decimalOrHexInt32(current);
		if (valueNode === null) {
			parent.pop();
			return null;
		}

		const value = valueNode.value;

		current.value = new parts.Color(
			value & 0xFF,
			(value >> 8) & 0xFF,
			(value >> 16) & 0xFF,
			1 - ((value >> 24) & 0xFF) / 0xFF
		);

		return current;
	}

	/**
	 * @param {!ParseNode} parent
	 * @param {string} next
	 * @return {ParseNode}
	 */
	read(parent: ParseNode, next: string): ParseNode {
		if (this._peek(next.length) !== next) {
			return null;
		}

		return new ParseNode(parent, next);
	}

	/**
	 * @param {number=1} count
	 * @return {string}
	 */
	private _peek(count: number = 1): string {
		// Fastpath for count === 1. http://jsperf.com/substr-vs-indexer
		if (count === 1) { return this._input[this._parseTree.end]; }

		return this._input.substr(this._parseTree.end, count);
	}

	/**
	 * @return {boolean}
	 */
	private _haveMore(): boolean {
		return this._parseTree.end < this._input.length;
	}

	/**
	 * @param {string} tagName One of "clip" and "iclip"
	 * @param {!ParseNode} parent
	 * @return {ParseNode}
	 */
	private _parse_tag_clip_or_iclip(tagName: "clip" | "iclip", parent: ParseNode): ParseNode {
		const current = new ParseNode(parent);

		if (this.read(current, tagName) === null) {
			parent.pop();
			return null;
		}

		if (this.read(current, "(") === null) {
			parent.pop();
			return null;
		}

		let x1Node: ParseNode = null;
		let x2Node: ParseNode = null;
		let y1Node: ParseNode = null;
		let y2Node: ParseNode = null;
		let scaleNode: ParseNode = null;
		let commandsNode: ParseNode = null;

		const firstNode = this.parse_decimal(current);

		if (firstNode !== null) {
			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			const secondNode = this.parse_decimal(current);

			if (secondNode !== null) {
				x1Node = firstNode;
				y1Node = secondNode;
			}
			else {
				scaleNode = firstNode;
			}
		}

		if (x1Node !== null && y1Node !== null) {
			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			x2Node = this.parse_decimal(current);
			if (x2Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			y2Node = this.parse_decimal(current);
			if (y2Node === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.RectangularClip(x1Node.value, y1Node.value, x2Node.value, y2Node.value, tagName === "clip");
		}
		else {
			commandsNode = new ParseNode(current, "");

			for (let next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
				commandsNode.value += next;
			}

			current.value = new parts.VectorClip((scaleNode !== null) ? scaleNode.value : 1, parse(commandsNode.value, "drawingInstructions") as parts.drawing.Instruction[], tagName === "clip");
		}

		if (this.read(current, ")") === null) {
			parent.pop();
			return null;
		}

		return current;
	}
}

/**
 * Constructs a simple tag parser function and sets it on the prototype of the {@link ./parser/parse.ParserRun} class.
 *
 * @param {string} tagName The name of the tag to generate the parser function for
 * @param {function(new: !libjass.parts.Part, *)} tagConstructor The type of tag to be returned by the generated parser function
 * @param {function(!ParseNode): ParseNode} valueParser The parser for the tag's value
 * @param {boolean} required Whether the tag's value is required or optional
 */
function makeTagParserFunction(
	tagName: string,
	tagConstructor: { new (value: any): parts.Part },
	valueParser: (current: ParseNode) => ParseNode,
	required: boolean
): void {
	(ParserRun.prototype as any)[`parse_tag_${ tagName }`] = function (parent: ParseNode): ParseNode {
		const self = this as ParserRun;
		const current = new ParseNode(parent);

		if (self.read(current, tagName) === null) {
			parent.pop();
			return null;
		}

		const valueNode = valueParser.call(self, current);

		if (valueNode !== null) {
			current.value = new tagConstructor(valueNode.value);
		}
		else if (!required) {
			current.value = new tagConstructor(null);
		}
		else {
			parent.pop();
			return null;
		}

		return current;
	};
}

makeTagParserFunction("alpha", parts.Alpha, ParserRun.prototype.parse_alpha, false);
makeTagParserFunction("be", parts.Blur, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("blur", parts.GaussianBlur, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("bord", parts.Border, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("c", parts.PrimaryColor, ParserRun.prototype.parse_color, false);
makeTagParserFunction("fax", parts.SkewX, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("fay", parts.SkewY, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("fr", parts.RotateZ, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("frx", parts.RotateX, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("fry", parts.RotateY, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("frz", parts.RotateZ, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("fs", parts.FontSize, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("fsp", parts.LetterSpacing, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("i", parts.Italic, ParserRun.prototype.parse_enableDisable, false);
makeTagParserFunction("p", parts.DrawingMode, ParserRun.prototype.parse_decimal, true);
makeTagParserFunction("pbo", parts.DrawingBaselineOffset, ParserRun.prototype.parse_decimal, true);
makeTagParserFunction("s", parts.StrikeThrough, ParserRun.prototype.parse_enableDisable, false);
makeTagParserFunction("shad", parts.Shadow, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("u", parts.Underline, ParserRun.prototype.parse_enableDisable, false);
makeTagParserFunction("xbord", parts.BorderX, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("xshad", parts.ShadowX, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("ybord", parts.BorderY, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("yshad", parts.ShadowY, ParserRun.prototype.parse_decimal, false);
makeTagParserFunction("1a", parts.PrimaryAlpha, ParserRun.prototype.parse_alpha, false);
makeTagParserFunction("1c", parts.PrimaryColor, ParserRun.prototype.parse_color, false);
makeTagParserFunction("2a", parts.SecondaryAlpha, ParserRun.prototype.parse_alpha, false);
makeTagParserFunction("2c", parts.SecondaryColor, ParserRun.prototype.parse_color, false);
makeTagParserFunction("3a", parts.OutlineAlpha, ParserRun.prototype.parse_alpha, false);
makeTagParserFunction("3c", parts.OutlineColor, ParserRun.prototype.parse_color, false);
makeTagParserFunction("4a", parts.ShadowAlpha, ParserRun.prototype.parse_alpha, false);
makeTagParserFunction("4c", parts.ShadowColor, ParserRun.prototype.parse_color, false);

for (const key of Object.keys(ParserRun.prototype)) {
	if (key.indexOf("parse_") === 0 && typeof (ParserRun.prototype as any)[key] === "function") {
		rules.set(key.substr("parse_".length), (ParserRun.prototype as any)[key]);
	}
}

/**
 * This class represents a single parse node. It has a start and end position, and an optional value object.
 *
 * @param {ParseNode} parent The parent of this parse node.
 * @param {*=null} value If provided, it is assigned as the value of the node.
 */
class ParseNode {
	private _children: ParseNode[] = [];

	private _start: number;
	private _end: number;
	private _value: any;

	constructor(private _parent: ParseNode, value: any = null) {
		if (_parent !== null) {
			_parent.children.push(this);
		}

		this._start = ((_parent !== null) ? _parent.end : 0);
		this._end = this._start;

		this.value = value;
	}

	/**
	 * The start position of this parse node.
	 *
	 * @type {number}
	 */
	get start(): number {
		return this._start;
	}

	/**
	 * The end position of this parse node.
	 *
	 * @type {number}
	 */
	get end(): number {
		return this._end;
	}

	/**
	 * @type {ParseNode}
	 */
	get parent(): ParseNode {
		return this._parent;
	}

	/**
	 * @type {!Array.<!ParseNode>}
	 */
	get children(): ParseNode[] {
		return this._children;
	}

	/**
	 * An optional object associated with this parse node.
	 *
	 * @type {*}
	 */
	get value(): any {
		return this._value;
	}

	/**
	 * An optional object associated with this parse node.
	 *
	 * If the value is a string, then the end property is updated to be the length of the string.
	 *
	 * @type {*}
	 */
	set value(newValue: any) {
		this._value = newValue;

		if (this._value !== null && this._value.constructor === String && this._children.length === 0) {
			this._setEnd(this._start + this._value.length);
		}
	}

	/**
	 * Removes the last child of this node and updates the end position to be end position of the new last child.
	 */
	pop(): void {
		this._children.splice(this._children.length - 1, 1);

		if (this._children.length > 0) {
			this._setEnd(this._children[this._children.length - 1].end);
		}
		else {
			this._setEnd(this.start);
		}
	}

	/**
	 * Updates the end property of this node and its parent recursively to the root node.
	 *
	 * @param {number} newEnd
	 */
	private _setEnd(newEnd: number): void {
		this._end = newEnd;

		if (this._parent !== null && this._parent.end !== this._end) {
			this._parent._setEnd(this._end);
		}
	}
}

import { Promise } from "../utility/promise";

import { WorkerCommands } from "../webworker/commands";
import { registerWorkerCommand } from "../webworker/misc";

registerWorkerCommand(WorkerCommands.Parse, parameters => new Promise(resolve => {
	resolve(parse(parameters.input, parameters.rule));
}));
