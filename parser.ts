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

///<reference path="libjass.ts" />

module libjass.parser {
	/**
	 * Parses a given string with the specified rule.
	 *
	 * @param {string} input
	 * @param {string} rule
	 * @return {*}
	 *
	 * @memberof libjass.parser
	 */
	export function parse(input: string, rule: string): any {
		var run = new ParserRun(input, rule);

		if (run.result === null || run.result.end !== input.length) {
			if (libjass.debugMode) {
				console.error("Parse failed. %s %s %o", rule, input, run.result);
			}

			throw new Error("Parse failed.");
		}

		return run.result.value;
	}

	/**
	 * This class represents a single run of the parser.
	 *
	 * @constructor
	 *
	 * @param {string} input
	 * @param {string} rule
	 *
	 * @private
	 * @memberof libjass.parser
	 */
	class ParserRun {
		private _parseTree: ParseNode = new ParseNode(null);
		private _result: ParseNode;

		constructor(private _input: string, rule: string) {
			this._result = rules.get(rule).call(this, this._parseTree);
		}

		/**
		 * @type {!ParseNode}
		 */
		get result(): ParseNode {
			return this._result;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_script(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);

			while (this._haveMore()) {
				var scriptSectionNode = this.parse_scriptSection(current);

				if (scriptSectionNode !== null) {
					current.value[scriptSectionNode.value.name] = scriptSectionNode.value.contents;
				}
				else if (this.read(current, "\n") === null) {
					parent.pop();
					return null;
				}
			}

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_scriptSection(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);
			current.value.contents = null;

			var sectionHeaderNode = this.parse_scriptSectionHeader(current);
			if (sectionHeaderNode === null) {
				parent.pop();
				return null;
			}

			current.value.name = sectionHeaderNode.value;

			var formatSpecifier: string[] = null;

			while (this._haveMore() && this._peek() !== "[") {
				if (this.parse_scriptComment(current) !== null) {
					continue;
				}

				var propertyNode = this.parse_scriptProperty(current);

				if (propertyNode !== null) {
					var property = propertyNode.value;

					if (property.key === "Format") {
						formatSpecifier = property.value.split(",").map((formatPart: string) => formatPart.trim());
					}

					else if (formatSpecifier !== null) {
						if (current.value.contents === null) {
							current.value.contents = <any[]>[];
						}

						var template = Object.create(null);
						var value = property.value.split(",");

						if (value.length > formatSpecifier.length) {
							value[formatSpecifier.length - 1] = value.slice(formatSpecifier.length - 1).join(",");
						}

						formatSpecifier.forEach((formatKey, index) => {
							template[formatKey] = value[index];
						});

						current.value.contents.push({ type: property.key, template: template });
					}

					else {
						if (current.value.contents === null) {
							current.value.contents = Object.create(null);
						}

						current.value.contents[property.key] = property.value;
					}
				}

				// Empty line
				else if (this.read(current, "\n") === null) {
					parent.pop();
					return null;
				}
			}

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_scriptSectionHeader(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "[") === null) {
				parent.pop();
				return null;
			}

			var nameNode = new ParseNode(current, "");

			for (var next = this._peek(); this._haveMore() && next !== "]" && next !== "\n"; next = this._peek()) {
				nameNode.value += next;
			}

			if (nameNode.value.length === 0) {
				parent.pop();
				return null;
			}

			current.value = nameNode.value;

			if (this.read(current, "]") === null) {
				parent.pop();
				return null;
			}

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_scriptProperty(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);

			var keyNode = new ParseNode(current, "");

			var next: string;

			for (next = this._peek(); this._haveMore() && next !== ":" && next !== "\n"; next = this._peek()) {
				keyNode.value += next;
			}

			if (keyNode.value.length === 0) {
				parent.pop();
				return null;
			}

			if (this.read(current, ":") === null) {
				parent.pop();
				return null;
			}

			var spacesNode = new ParseNode(current, "");

			for (next = this._peek(); next === " "; next = this._peek()) {
				spacesNode.value += next;
			}

			var valueNode = new ParseNode(current, "");

			for (next = this._peek(); this._haveMore() && next !== "\n"; next = this._peek()) {
				valueNode.value += next;
			}

			current.value.key = keyNode.value;
			current.value.value = valueNode.value;

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_scriptComment(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, ";") === null) {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, "");
			for (var next = this._peek(); this._haveMore() && next !== "\n"; next = this._peek()) {
				valueNode.value += next;
			}

			current.value = valueNode.value;

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_dialogueParts(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = [];

			while (this._haveMore()) {
				var enclosedTagsNode = this.parse_enclosedTags(current);

				if (enclosedTagsNode !== null) {
					current.value.push.apply(current.value, enclosedTagsNode.value);
				}

				else {
					var textNode = this.parse_newline(current) || this.parse_hardspace(current) || this.parse_text(current);

					if (textNode !== null) {
						if (current.value[current.value.length - 1] instanceof parts.Text) {
							// Merge consecutive text parts into one part
							current.value[current.value.length - 1] =
								new parts.Text(
									(<parts.Text>current.value[current.value.length - 1]).value +
									(<parts.Text>textNode.value).value
								);
						}
						else {
							current.value.push(textNode.value);
						}
					}

					else {
						parent.pop();
						return null;
					}
				}
			}

			var inDrawingMode = false;

			current.value.forEach((part: parts.Part, i: number) => {
				if (part instanceof parts.DrawingMode) {
					inDrawingMode = (<parts.DrawingMode>part).scale !== 0;
				}

				else if (part instanceof parts.Text && inDrawingMode) {
					current.value[i] = new parts.DrawingInstructions(<parts.drawing.Instruction[]>parser.parse((<parts.Text>part).value, "drawingInstructions"));
				}
			});

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_enclosedTags(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = [];

			if (this.read(current, "{") === null) {
				parent.pop();
				return null;
			}

			for (var next = this._peek(); this._haveMore() && next !== "}"; next = this._peek()) {
				var childNode: ParseNode = null;

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
								(<parts.Comment>current.value[current.value.length - 1]).value +
								(<parts.Comment>childNode.value).value
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
		 * @return {!ParseNode}
		 */
		parse_newline(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "\\N") === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.Text("\n");

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_hardspace(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "\\h") === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.Text("\u00A0");

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_text(parent: ParseNode): ParseNode {
			var value = this._peek();

			var current = new ParseNode(parent);
			var valueNode = new ParseNode(current, value);

			current.value = new parts.Text(valueNode.value);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_comment(parent: ParseNode): ParseNode {
			var value = this._peek();

			var current = new ParseNode(parent);
			var valueNode = new ParseNode(current, value);

			current.value = new parts.Comment(valueNode.value);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_a(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "a") === null) {
				parent.pop();
				return null;
			}

			var next = this._peek();

			switch (next) {
				case "1":
					var next2 = this._peek(2);

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

			var valueNode = new ParseNode(current, next);

			var value: number = null;
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
		 * @return {!ParseNode}
		 */
		parse_tag_alpha(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_an(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "an") === null) {
				parent.pop();
				return null;
			}

			var next = this._peek();

			if (next < "1" || next > "9") {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, next);

			current.value = new parts.Alignment(parseInt(valueNode.value));

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_b(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "b") === null) {
				parent.pop();
				return null;
			}

			var valueNode: ParseNode = null;

			var next = this._peek();

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
		 * @return {!ParseNode}
		 */
		parse_tag_be(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_blur(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_bord(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_c(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_clip(parent: ParseNode): ParseNode {
			return this._parse_tag_clip_or_iclip("clip", parent);
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fad(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "fad") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var startNode = this.parse_decimal(current);
			if (startNode === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var endNode = this.parse_decimal(current);
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
		 * @return {!ParseNode}
		 */
		parse_tag_fade(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "fade") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var a1Node = this.parse_decimal(current);
			if (a1Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var a2Node = this.parse_decimal(current);
			if (a2Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var a3Node = this.parse_decimal(current);
			if (a3Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var t1Node = this.parse_decimal(current);
			if (t1Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var t2Node = this.parse_decimal(current);
			if (t2Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var t3Node = this.parse_decimal(current);
			if (t3Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var t4Node = this.parse_decimal(current);
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
		 * @return {!ParseNode}
		 */
		parse_tag_fax(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fay(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fn(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "fn") === null) {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, "");

			for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
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
		 * @return {!ParseNode}
		 */
		parse_tag_fr(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_frx(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fry(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_frz(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fs(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fscx(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "fscx") === null) {
				parent.pop();
				return null;
			}

			var valueNode = this.parse_decimal(current);

			if (valueNode === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.FontScaleX(valueNode.value / 100);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fscy(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "fscy") === null) {
				parent.pop();
				return null;
			}

			var valueNode = this.parse_decimal(current);

			if (valueNode === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.FontScaleY(valueNode.value / 100);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_fsp(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_i(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_iclip(parent: ParseNode): ParseNode {
			return this._parse_tag_clip_or_iclip("iclip", parent);
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_k(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_K(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_kf(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_ko(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_move(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "move") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var x1Node = this.parse_decimal(current);
			if (x1Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var y1Node = this.parse_decimal(current);
			if (y1Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var x2Node = this.parse_decimal(current);
			if (x2Node === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var y2Node = this.parse_decimal(current);
			if (y2Node === null) {
				parent.pop();
				return null;
			}

			var t1Node: ParseNode = null;
			var t2Node: ParseNode = null;

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
		 * @return {!ParseNode}
		 */
		parse_tag_org(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "org") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var xNode = this.parse_decimal(current);
			if (xNode === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var yNode = this.parse_decimal(current);
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
		 * @return {!ParseNode}
		 */
		parse_tag_p(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_pbo(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_pos(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "pos") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var xNode = this.parse_decimal(current);
			if (xNode === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var yNode = this.parse_decimal(current);
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
		 * @return {!ParseNode}
		 */
		parse_tag_q(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "q") === null) {
				parent.pop();
				return null;
			}

			var next = this._peek();

			if (next < "0" || next > "3") {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, next);

			current.value = new parts.WrappingStyle(parseInt(valueNode.value));

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_r(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "r") === null) {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, "");

			for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
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
		 * @return {!ParseNode}
		 */
		parse_tag_s(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_shad(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_t(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "t") === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var startNode: ParseNode = null;
			var endNode: ParseNode = null;
			var accelNode: ParseNode = null;

			var firstNode = this.parse_decimal(current);
			if (firstNode !== null) {
				if (this.read(current, ",") === null) {
					parent.pop();
					return null;
				}

				var secondNode = this.parse_decimal(current);
				if (secondNode !== null) {
					startNode = firstNode;
					endNode = secondNode;

					if (this.read(current, ",") === null) {
						parent.pop();
						return null;
					}

					var thirdNode = this.parse_decimal(current);
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

			var transformTags: parts.Part[] = [];

			for (var next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
				var childNode: ParseNode = null;

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
								(<parts.Comment>transformTags[transformTags.length - 1]).value +
								(<parts.Comment>childNode.value).value
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
		 * @return {!ParseNode}
		 */
		parse_tag_u(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_xbord(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_xshad(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_ybord(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_yshad(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_1a(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_1c(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_2a(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_2c(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_3a(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_3c(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_4a(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_tag_4c(parent: ParseNode): ParseNode {
			throw new Error("Method not implemented.");
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_drawingInstructions(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			var lastType: string = null;

			current.value = [];

			while (this._haveMore()) {
				while (this.read(current, " ") !== null) { }

				var currentType: string = null;

				var typePart = this.parse_text(current);
				if (typePart === null) {
					parent.pop();
					return null;
				}

				currentType = typePart.value.value;
				switch (currentType) {
					case "m":
					case "l":
					case "b":
						lastType = currentType;
						break;

					default:
						if (lastType === null) {
							parent.pop();
							return null;
						}

						currentType = lastType;
						current.pop();
						break;
				}

				switch (currentType) {
					case "m":
						var movePart = this.parse_drawingInstructionMove(current);
						if (movePart === null) {
							parent.pop();
							return null;
						}

						current.value.push(movePart.value);
						break;

					case "l":
						var linePart = this.parse_drawingInstructionLine(current);
						if (linePart === null) {
							parent.pop();
							return null;
						}

						current.value.push(linePart.value);
						break;

					case "b":
						var cubicBezierCurvePart = this.parse_drawingInstructionCubicBezierCurve(current);
						if (cubicBezierCurvePart === null) {
							parent.pop();
							return null;
						}

						current.value.push(cubicBezierCurvePart.value);
						break;
				}
			}

			while (this.read(current, " ") !== null) { }

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_drawingInstructionMove(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			while (this.read(current, " ") !== null) { }

			var xPart = this.parse_decimal(current);
			if (xPart === null) {
				parent.pop();
				return null;
			}

			while (this.read(current, " ") !== null) { }

			var yPart = this.parse_decimal(current);
			if (yPart === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.drawing.MoveInstruction(xPart.value, yPart.value);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_drawingInstructionLine(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			while (this.read(current, " ") !== null) { }

			var xPart = this.parse_decimal(current);
			if (xPart === null) {
				parent.pop();
				return null;
			}

			while (this.read(current, " ") !== null) { }

			var yPart = this.parse_decimal(current);
			if (yPart === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.drawing.LineInstruction(xPart.value, yPart.value);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_drawingInstructionCubicBezierCurve(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			while (this.read(current, " ") !== null) { }

			var x1Part = this.parse_decimal(current);
			if (x1Part === null) {
				parent.pop();
				return null;
			}

			while (this.read(current, " ") !== null) { }

			var y1Part = this.parse_decimal(current);
			if (y1Part === null) {
				parent.pop();
				return null;
			}

			var x2Part = this.parse_decimal(current);
			if (x2Part === null) {
				parent.pop();
				return null;
			}

			while (this.read(current, " ") !== null) { }

			var y2Part = this.parse_decimal(current);
			if (y2Part === null) {
				parent.pop();
				return null;
			}

			var x3Part = this.parse_decimal(current);
			if (x3Part === null) {
				parent.pop();
				return null;
			}

			while (this.read(current, " ") !== null) { }

			var y3Part = this.parse_decimal(current);
			if (y3Part === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.drawing.CubicBezierCurveInstruction(x1Part.value, y1Part.value, x2Part.value, y2Part.value, x3Part.value, y3Part.value);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_decimal(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			var negative = (this.read(current, "-") !== null);

			var numericalPart = this.parse_unsignedDecimal(current);

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
		 * @return {!ParseNode}
		 */
		parse_unsignedDecimal(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			var characteristicNode = new ParseNode(current, "");

			var mantissaNode: ParseNode = null;

			var next: string;
			for (next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
				characteristicNode.value += next;
			}

			if (characteristicNode.value.length === 0) {
				parent.pop();
				return null;
			}

			if (this.read(current, ".") !== null) {
				mantissaNode = new ParseNode(current, "");

				for (next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
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
		 * @return {!ParseNode}
		 */
		parse_enableDisable(parent: ParseNode): ParseNode {
			var next = this._peek();

			if (next === "0" || next === "1") {
				var result = new ParseNode(parent, next);
				result.value = (result.value === "1");

				return result;
			}

			return null;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_hex(parent: ParseNode): ParseNode {
			var next = this._peek();

			if ((next >= "0" && next <= "9") || (next >= "a" && next <= "f") || (next >= "A" && next <= "F")) {
				return new ParseNode(parent, next);
			}

			return null;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_color(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "&") === null) {
				parent.pop();
				return null;
			}

			this.read(current, "H");

			var digitNodes = new Array<ParseNode>(6);

			for (var i = 0; i < digitNodes.length; i++) {
				var digitNode = this.parse_hex(current);
				if (digitNode === null) {
					parent.pop();
					return null;
				}
				digitNodes[i] = digitNode;
			}

			// Optional extra 00 at the end
			if (this.read(current, "0") !== null) {
				if (this.read(current, "0") === null) {
					parent.pop();
					return null;
				}
			}

			if (this.read(current, "&") === null) {
				parent.pop();
				return null;
			}

			current.value = new parts.Color(
				parseInt(digitNodes[4].value + digitNodes[5].value, 16),
				parseInt(digitNodes[2].value + digitNodes[3].value, 16),
				parseInt(digitNodes[0].value + digitNodes[1].value, 16)
			);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_alpha(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "&") !== null) {
				this.read(current, "H");
			}

			var firstDigitNode = this.parse_hex(current);
			if (firstDigitNode === null) {
				parent.pop();
				return null;
			}

			var secondDigitNode = this.parse_hex(current);

			this.read(current, "&");

			current.value = 1 - parseInt(firstDigitNode.value + ((secondDigitNode !== null) ? secondDigitNode : firstDigitNode).value, 16) / 255;

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @return {!ParseNode}
		 */
		parse_colorWithAlpha(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, "&H") === null) {
				parent.pop();
				return null;
			}

			var digitNodes = new Array<ParseNode>(8);

			for (var i = 0; i < digitNodes.length; i++) {
				var digitNode = this.parse_hex(current);
				if (digitNode === null) {
					parent.pop();
					return null;
				}
				digitNodes[i] = digitNode;
			}

			current.value = new parts.Color(
				parseInt(digitNodes[6].value + digitNodes[7].value, 16),
				parseInt(digitNodes[4].value + digitNodes[5].value, 16),
				parseInt(digitNodes[2].value + digitNodes[3].value, 16),
				1 - parseInt(digitNodes[0].value + digitNodes[1].value, 16) / 255
			);

			return current;
		}

		/**
		 * @param {!ParseNode} parent
		 * @param {string} next
		 * @return {!ParseNode}
		 */
		read(parent: ParseNode, next: string): ParseNode {
			if (this._peek(next.length) !== next) {
				return null;
			}

			return new ParseNode(parent, next);
		}

		/**
		 * @param {number=1} count
		 */
		private _peek(count: number = 1): string {
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
		 * @return {!ParseNode}
		 */
		private _parse_tag_clip_or_iclip(tagName: string, parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this.read(current, tagName) === null) {
				parent.pop();
				return null;
			}

			if (this.read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var x1Node: ParseNode = null;
			var x2Node: ParseNode = null;
			var y1Node: ParseNode = null;
			var y2Node: ParseNode = null;
			var scaleNode: ParseNode = null;
			var commandsNode: ParseNode = null;

			var firstNode = this.parse_decimal(current);

			if (firstNode !== null) {
				if (this.read(current, ",") === null) {
					parent.pop();
					return null;
				}

				var secondNode = this.parse_decimal(current);

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

				if (this.read(current, ",") === null) {
					parent.pop();
					return null;
				}

				y2Node = this.parse_decimal(current);

				current.value = new parts.RectangularClip(x1Node.value, y1Node.value, x2Node.value, y2Node.value, tagName === "clip");
			}
			else {
				commandsNode = new ParseNode(current, "");

				for (var next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
					commandsNode.value += next;
				}

				current.value = new parts.VectorClip((scaleNode !== null) ? scaleNode.value : 1, <parts.drawing.Instruction[]>parser.parse(commandsNode.value, "drawingInstructions"), tagName === "clip");
			}

			if (this.read(current, ")") === null) {
				parent.pop();
				return null;
			}

			return current;
		}
	};

	function makeTagParserFunction(
		tagName: string,
		tagConstructor: { new (value: any): parts.Part },
		valueParser: (current: ParseNode) => ParseNode,
		required: boolean
	) {
		(<any>ParserRun.prototype)["parse_tag_" + tagName] = function (parent: ParseNode): ParseNode {
			var self = <ParserRun>this;
			var current = new ParseNode(parent);

			if (self.read(current, tagName) === null) {
				parent.pop();
				return null;
			}

			var valueNode = valueParser.call(self, current);

			if (valueNode !== null) {
				current.value = new tagConstructor(valueNode.value);
			}
			else if (required) {
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
	makeTagParserFunction("k", parts.ColorKaraoke, ParserRun.prototype.parse_decimal, true);
	makeTagParserFunction("K", parts.SweepingColorKaraoke, ParserRun.prototype.parse_decimal, true);
	makeTagParserFunction("kf", parts.SweepingColorKaraoke, ParserRun.prototype.parse_decimal, true);
	makeTagParserFunction("ko", parts.OutlineKaraoke, ParserRun.prototype.parse_decimal, true);
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

	var rules = new Map<string, (parent: ParseNode) => ParseNode>();
	Object.keys(ParserRun.prototype).forEach(key => {
		if (key.indexOf("parse_") === 0 && typeof (<any>ParserRun.prototype)[key] === "function") {
			rules.set(key.substr("parse_".length), (<any>ParserRun.prototype)[key]);
		}
	});

	/**
	 * This class represents a single parse node. It has a start and end position, and an optional value object.
	 *
	 * @constructor
	 * @param {!ParseNode} parent The parent of this parse node. The parent's end position will be updated to the end position of this node whenever the latter changes.
	 * @param {?string=null} value A shortcut to assign a string to the value property.
	 *
	 * @private
	 * @memberof libjass.parser
	 */
	class ParseNode {
		private _children: ParseNode[] = [];

		private _start: number;
		private _end: number;
		private _value: any;

		constructor(private _parent: ParseNode, value: string = null) {
			if (_parent !== null) {
				_parent._children.push(this);
			}

			this._start = ((_parent !== null) ? _parent.end : 0);

			if (value !== null) {
				this.value = value;
			}
			else {
				this._setEnd(this._start);
			}
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
		 * @type {!ParseNode}
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

			if (this._value.constructor === String && this._children.length === 0) {
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
}
