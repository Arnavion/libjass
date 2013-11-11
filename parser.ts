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
	 * @param {string="dialogueParts"} startRule
	 * @return {*}
	 */
	export function parse(input: string, rule: string = "dialogueParts"): any {
		var run = new ParserRun(input, rule);

		if (run.result === null || run.result.end !== input.length) {
			throw new Error("Parse failed.");
		}

		return run.result.value;
	}

	class ParserRun {
		private _parseTree: ParseNode = new ParseNode(null);
		private _result: ParseNode;

		constructor(private _input: string, rule: string) {
			this._result = rules.get(rule).call(this, this._parseTree);
		}

		get result(): ParseNode {
			return this._result;
		}

		private _parse_script(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);

			while (current.end < this._input.length) {
				var scriptSectionNode = this._parse_scriptSection(current);

				if (scriptSectionNode !== null) {
					current.value[scriptSectionNode.value.name] = scriptSectionNode.value.contents;
				}
				else if (!this._parse_eol(current)) {
					parent.pop();
					return null;
				}
			}

			return current;
		}

		private _parse_scriptSection(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);
			current.value.contents = null;

			var sectionHeaderNode = this._parse_scriptSectionHeader(current);
			if (sectionHeaderNode === null) {
				parent.pop();
				return null;
			}

			current.value.name = sectionHeaderNode.value;

			var formatSpecifier: string[] = null;

			while(current.end < this._input.length) {
				if (this._peek() === "[") {
					break;
				}

				else {
					var propertyNode = this._parse_scriptProperty(current);

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

					else if (this._parse_scriptComment(current) === null && this._parse_eol(current) === null) {
						parent.pop();
						return null;
					}
				}
			}

			return current;
		}

		private _parse_scriptSectionHeader(parent: ParseNode): ParseNode {
			if (this._peek() !== "[") {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = "";

			var openingBracketNode = new ParseNode(current);
			openingBracketNode.value = "[";
			openingBracketNode.end++;

			var nameNode = new ParseNode(current);
			nameNode.value = "";

			for (var next = this._peek(); next !== "]" && next !== "\n"; next = this._peek()) {
				nameNode.value += next;
				nameNode.end++;
			}

			if (nameNode.value.length === 0) {
				parent.pop();
				return null;
			}

			current.value = nameNode.value;

			if (next !== "]") {
				parent.pop();
				return null;
			}

			var closingBracketNode = new ParseNode(current);
			closingBracketNode.value = "]";
			closingBracketNode.end++;

			return current;
		}

		private _parse_scriptProperty(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = Object.create(null);

			var keyNode = new ParseNode(current);
			keyNode.value = "";

			var next: string;

			for (next = this._peek(); next !== ":" && next !== "\n"; next = this._peek()) {
				keyNode.value += next;
				keyNode.end++;
			}

			if (next !== ":") {
				parent.pop();
				return null;
			}

			if (keyNode.value.length === 0) {
				parent.pop();
				return null;
			}

			var colonNode = new ParseNode(current);
			colonNode.value = ":";
			colonNode.end++;

			var spacesNode = new ParseNode(current);
			spacesNode.value = "";

			for (next = this._peek(); next === " "; next = this._peek()) {
				spacesNode.value += next;
				spacesNode.end++;
			}

			var valueNode = new ParseNode(current);
			valueNode.value = "";

			for (next = this._peek(); next !== "\n"; next = this._peek()) {
				valueNode.value += next;
				valueNode.end++;
			}

			current.value.key = keyNode.value;
			current.value.value = valueNode.value;

			return current;
		}

		private _parse_scriptComment(parent: ParseNode): ParseNode {
			if (this._peek() !== ";") {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = "";

			for (var next = this._peek(); next !== "\n"; next = this._peek()) {
				current.value += next;
				current.end++;
			}

			return current;
		}

		private _parse_eol(parent: ParseNode): ParseNode {
			if (this._peek() !== "\n") {
				return null;
			}

			var emptyLineNode = new ParseNode(parent);
			emptyLineNode.value = "\n";
			emptyLineNode.end++;
			return emptyLineNode;
		}

		private _parse_dialogueParts(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = [];

			while (current.end < this._input.length) {
				var enclosedTagsNode = this._parse_enclosedTags(current);

				if (enclosedTagsNode !== null) {
					current.value.push.apply(current.value, enclosedTagsNode.value);
				}

				else {
					var spacingNode = this._parse_newline(current) || this._parse_hardspace(current);

					if (spacingNode !== null) {
						current.value.push(spacingNode.value);
					}

					else {
						var textNode = this._parse_text(current);

						if (textNode !== null) {
							if (current.value[current.value.length - 1] instanceof tags.Text) {
								// Merge consecutive text parts into one part
								current.value[current.value.length - 1] =
									new tags.Text(
										(<tags.Text>current.value[current.value.length - 1]).value +
										(<tags.Text>textNode.value).value
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
			}

			return current;
		}

		private _parse_enclosedTags(parent: ParseNode): ParseNode {
			if (this._peek() !== "{") {
				return null;
			}

			var current = new ParseNode(parent);

			current.value = [];

			var openingBraceNode = new ParseNode(current);
			openingBraceNode.value = "{";
			openingBraceNode.end++;

			for (var next = this._peek(); next !== "}"; next = this._peek()) {
				var childNode: ParseNode;

				if (next === "\\") {
					var backSlashNode = new ParseNode(current);
					backSlashNode.value = "\\";
					backSlashNode.end++;

					childNode =
						this._parse_tag_alpha(current) ||
						this._parse_tag_xbord(current) ||
						this._parse_tag_ybord(current) ||

						this._parse_tag_blur(current) ||
						this._parse_tag_bord(current) ||
						this._parse_tag_fscx(current) ||
						this._parse_tag_fscy(current) ||

						this._parse_tag_fad(current) ||
						this._parse_tag_fax(current) ||
						this._parse_tag_fay(current) ||
						this._parse_tag_frx(current) ||
						this._parse_tag_fry(current) ||
						this._parse_tag_frz(current) ||
						this._parse_tag_fsp(current) ||
						this._parse_tag_pos(current) ||

						this._parse_tag_an(current) ||
						this._parse_tag_fn(current) ||
						this._parse_tag_fs(current) ||
						this._parse_tag_1a(current) ||
						this._parse_tag_1c(current) ||
						this._parse_tag_3a(current) ||
						this._parse_tag_3c(current) ||

						this._parse_tag_b(current) ||
						this._parse_tag_c(current) ||
						this._parse_tag_i(current) ||
						this._parse_tag_r(current) ||
						this._parse_tag_s(current) ||
						this._parse_tag_t(current) ||
						this._parse_tag_u(current);

					if (childNode === null) {
						current.pop(); // Include backslash in comment

						childNode = this._parse_comment(current);
					}
				}
				else {
					childNode = this._parse_comment(current);
				}

				if (childNode !== null) {
					if (childNode.value instanceof tags.Comment && current.value[current.value.length - 1] instanceof tags.Comment) {
						// Merge consecutive comment parts into one part
						current.value[current.value.length - 1] =
							new tags.Comment(
								(<tags.Comment>current.value[current.value.length - 1]).value +
								(<tags.Comment>childNode.value).value
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

			var closingBraceNode = new ParseNode(current);
			closingBraceNode.value = "}";
			closingBraceNode.end++;

			return current;
		}

		private _parse_newline(parent: ParseNode) {
			if (this._peek(2) !== "\\N") {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = new tags.NewLine();
			current.end += 2;

			return current;
		}

		private _parse_hardspace(parent: ParseNode) {
			if (this._peek(2) !== "\\h") {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = new tags.HardSpace();
			current.end += 2;

			return current;
		}

		private _parse_text(parent: ParseNode) {
			var value = this._peek();

			if (value.length === 0) {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = new tags.Text(value);
			current.end++;

			return current;
		}

		private _parse_comment(parent: ParseNode) {
			var value = this._peek();

			if (value.length === 0) {
				return null;
			}

			var current = new ParseNode(parent);
			current.value = new tags.Comment(value);
			current.end++;

			return current;
		}

		private _parse_tag_alpha(parent: ParseNode) {
			if (this._peek("alpha".length) !== "alpha") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "alpha";
			nameNode.end += "alpha".length;

			var valueNode = this._parse_alpha(current);

			if (valueNode !== null) {
				current.value = new tags.Alpha(valueNode.value);
			}
			else {
				current.value = new tags.Alpha(null);
			}

			return current;
		}

		private _parse_tag_xbord(parent: ParseNode) {
			if (this._peek("xbord".length) !== "xbord") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "xbord";
			nameNode.end += "xbord".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.BorderX(valueNode.value);
			}
			else {
				current.value = new tags.BorderX(null);
			}

			return current;
		}

		private _parse_tag_ybord(parent: ParseNode) {
			if (this._peek("ybord".length) !== "ybord") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "ybord";
			nameNode.end += "ybord".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.BorderY(valueNode.value);
			}
			else {
				current.value = new tags.BorderY(null);
			}

			return current;
		}

		private _parse_tag_bord(parent: ParseNode) {
			if (this._peek("bord".length) !== "bord") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "bord";
			nameNode.end += "bord".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.Border(valueNode.value);
			}
			else {
				current.value = new tags.Border(null);
			}

			return current;
		}

		private _parse_tag_blur(parent: ParseNode) {
			if (this._peek("blur".length) !== "blur") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "blur";
			nameNode.end += "blur".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.Blur(valueNode.value);
			}
			else {
				current.value = new tags.Blur(null);
			}

			return current;
		}

		private _parse_tag_fscx(parent: ParseNode) {
			if (this._peek("fscx".length) !== "fscx") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fscx";
			nameNode.end += "fscx".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.FontScaleX(valueNode.value);
			}
			else {
				current.value = new tags.FontScaleX(null);
			}

			return current;
		}

		private _parse_tag_fscy(parent: ParseNode) {
			if (this._peek("fscy".length) !== "fscy") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fscy";
			nameNode.end += "fscy".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.FontScaleY(valueNode.value);
			}
			else {
				current.value = new tags.FontScaleY(null);
			}

			return current;
		}

		private _parse_tag_fad(parent: ParseNode) {
			if (this._peek("fad".length) !== "fad") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fad";
			nameNode.end += "fad".length;

			if (this._peek() !== "(") {
				parent.pop();
				return null;
			}

			var openingParaenthesesNode = new ParseNode(current);
			openingParaenthesesNode.value = "(";
			openingParaenthesesNode.end++;

			var startNode = this._parse_decimal(current);
			if (startNode === null) {
				parent.pop();
				return null;
			}

			if (this._peek() !== ",") {
				parent.pop();
				return null;
			}

			var commaNode = new ParseNode(current);
			commaNode.value = ",";
			commaNode.end++;

			var endNode = this._parse_decimal(current);
			if (endNode === null) {
				parent.pop();
				return null;
			}

			if (this._peek() !== ")") {
				parent.pop();
				return null;
			}

			var closingParaenthesesNode = new ParseNode(current);
			closingParaenthesesNode.value = ")";
			closingParaenthesesNode.end++;

			current.value = new tags.Fade(startNode.value / 1000, endNode.value / 1000);

			return current;
		}

		private _parse_tag_fax(parent: ParseNode) {
			if (this._peek("fax".length) !== "fax") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fax";
			nameNode.end += "fax".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.SkewX(valueNode.value);
			}
			else {
				current.value = new tags.SkewX(null);
			}

			return current;
		}

		private _parse_tag_fay(parent: ParseNode) {
			if (this._peek("fay".length) !== "fay") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fay";
			nameNode.end += "fay".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.SkewY(valueNode.value);
			}
			else {
				current.value = new tags.SkewY(null);
			}

			return current;
		}

		private _parse_tag_frx(parent: ParseNode) {
			if (this._peek("frx".length) !== "frx") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "frx";
			nameNode.end += "frx".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.RotateX(valueNode.value);
			}
			else {
				current.value = new tags.RotateX(null);
			}

			return current;
		}

		private _parse_tag_fry(parent: ParseNode) {
			if (this._peek("fry".length) !== "fry") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fry";
			nameNode.end += "fry".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.RotateY(valueNode.value);
			}
			else {
				current.value = new tags.RotateY(null);
			}

			return current;
		}

		private _parse_tag_frz(parent: ParseNode) {
			if (this._peek("frz".length) !== "frz") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "frz";
			nameNode.end += "frz".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.RotateZ(valueNode.value);
			}
			else {
				current.value = new tags.RotateZ(null);
			}

			return current;
		}

		private _parse_tag_fsp(parent: ParseNode) {
			if (this._peek("fsp".length) !== "fsp") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fsp";
			nameNode.end += "fsp".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.LetterSpacing(valueNode.value);
			}
			else {
				current.value = new tags.LetterSpacing(null);
			}

			return current;
		}

		private _parse_tag_pos(parent: ParseNode) {
			if (this._peek("pos".length) !== "pos") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "pos";
			nameNode.end += "pos".length;

			if (this._peek() !== "(") {
				parent.pop();
				return null;
			}

			var openParaenthesesNode = new ParseNode(current);
			openParaenthesesNode.value = "(";
			openParaenthesesNode.end++;

			var xNode = this._parse_decimal(current);
			if (xNode === null) {
				parent.pop();
				return null;
			}

			if (this._peek() !== ",") {
				parent.pop();
				return null;
			}

			var commaNode = new ParseNode(current);
			commaNode.value = ",";
			commaNode.end++;

			var yNode = this._parse_decimal(current);
			if (yNode === null) {
				parent.pop();
				return null;
			}

			if (this._peek() !== ")") {
				parent.pop();
				return null;
			}

			var closeParaenthesesNode = new ParseNode(current);
			closeParaenthesesNode.value = ")";
			closeParaenthesesNode.end++;

			current.value = new tags.Pos(xNode.value, yNode.value);

			return current;
		}

		private _parse_tag_an(parent: ParseNode) {
			if (this._peek("an".length) !== "an") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "an";
			nameNode.end += "an".length;

			var next = this._peek();

			if (next < "0" && next > "9") {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current);
			valueNode.value = next;
			valueNode.end++;

			current.value = new tags.Alignment(parseInt(valueNode.value));

			return current;
		}

		private _parse_tag_fn(parent: ParseNode) {
			if (this._peek("fn".length) !== "fn") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fn";
			nameNode.end += "fn".length;

			var valueNode = new ParseNode(current);
			valueNode.value = "";
			for (var next = this._peek(); next !== "\\" && next !== "}"; next = this._peek()) {
				valueNode.value += next;
				valueNode.end++;
			}

			if (valueNode.value.length > 0) {
				current.value = new tags.FontName(valueNode.value);
			}
			else {
				current.value = new tags.FontName(null);
			}

			return current;
		}

		private _parse_tag_fs(parent: ParseNode) {
			if (this._peek("fs".length) !== "fs") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "fs";
			nameNode.end += "fs".length;

			var valueNode = this._parse_decimal(current);

			if (valueNode !== null) {
				current.value = new tags.FontSize(valueNode.value);
			}
			else {
				current.value = new tags.FontSize(null);
			}

			return current;
		}

		private _parse_tag_1a(parent: ParseNode) {
			if (this._peek("1a".length) !== "1a") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "1a";
			nameNode.end += "1a".length;

			var valueNode = this._parse_alpha(current);

			if (valueNode !== null) {
				current.value = new tags.PrimaryAlpha(valueNode.value);
			}
			else {
				current.value = new tags.PrimaryAlpha(null);
			}

			return current;
		}

		private _parse_tag_1c(parent: ParseNode) {
			if (this._peek("1c".length) !== "1c") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "1c";
			nameNode.end += "1c".length;

			var valueNode = this._parse_color(current);

			if (valueNode !== null) {
				current.value = new tags.PrimaryColor(valueNode.value);
			}
			else {
				current.value = new tags.PrimaryColor(null);
			}

			return current;
		}

		private _parse_tag_3a(parent: ParseNode) {
			if (this._peek("3a".length) !== "3a") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "3a";
			nameNode.end += "3a".length;

			var valueNode = this._parse_alpha(current);

			if (valueNode !== null) {
				current.value = new tags.OutlineAlpha(valueNode.value);
			}
			else {
				current.value = new tags.OutlineAlpha(null);
			}

			return current;
		}

		private _parse_tag_3c(parent: ParseNode) {
			if (this._peek("3c".length) !== "3c") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "3c";
			nameNode.end += "3c".length;

			var valueNode = this._parse_color(current);

			if (valueNode !== null) {
				current.value = new tags.OutlineColor(valueNode.value);
			}
			else {
				current.value = new tags.OutlineColor(null);
			}

			return current;
		}

		private _parse_tag_b(parent: ParseNode) {
			if (this._peek("b".length) !== "b") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "b";
			nameNode.end += "b".length;

			var valueNode: ParseNode = null;

			var next = this._peek();

			if (next >= "1" && next <= "9") {
				next = this._peek(3);
				if (next.substr(1) === "00") {
					valueNode = new ParseNode(current);
					valueNode.value = parseInt(next);
					valueNode.end += 3;
				}
			}

			if (valueNode === null) {
				next = this._peek(3);

				valueNode = this._parse_enableDisable(current);
			}

			if (valueNode !== null) {
				current.value = new tags.Bold(valueNode.value);
			}
			else {
				current.value = new tags.Bold(null);
			}

			return current;
		}

		private _parse_tag_c(parent: ParseNode) {
			if (this._peek("c".length) !== "c") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "c";
			nameNode.end += "c".length;

			var valueNode = this._parse_color(current);

			if (valueNode !== null) {
				current.value = new tags.PrimaryColor(valueNode.value);
			}
			else {
				current.value = new tags.PrimaryColor(null);
			}

			return current;
		}

		private _parse_tag_i(parent: ParseNode) {
			if (this._peek("i".length) !== "i") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "i";
			nameNode.end += "i".length;

			var valueNode = this._parse_enableDisable(current);

			if (valueNode !== null) {
				current.value = new tags.Italic(valueNode.value);
			}
			else {
				current.value = new tags.Italic(null);
			}

			return current;
		}

		private _parse_tag_r(parent: ParseNode) {
			if (this._peek("r".length) !== "r") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "r";
			nameNode.end += "r".length;

			var valueNode = new ParseNode(current);
			valueNode.value = "";
			for (var next = this._peek(); next !== "\\" && next !== "}"; next = this._peek()) {
				valueNode.value += next;
				valueNode.end++;
			}

			if (valueNode.value.length > 0) {
				current.value = new tags.Reset(valueNode.value);
			}
			else {
				current.value = new tags.Reset(null);
			}

			return current;
		}

		private _parse_tag_s(parent: ParseNode) {
			if (this._peek("s".length) !== "s") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "s";
			nameNode.end += "s".length;

			var valueNode = this._parse_enableDisable(current);

			if (valueNode !== null) {
				current.value = new tags.StrikeThrough(valueNode.value);
			}
			else {
				current.value = new tags.StrikeThrough(null);
			}

			return current;
		}

		private _parse_tag_t(parent: ParseNode) {
			if (this._peek("t".length) !== "t") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "t";
			nameNode.end += "t".length;

			if (this._peek() !== "(") {
				parent.pop();
				return null;
			}

			var openingParaenthesesNode = new ParseNode(current);
			openingParaenthesesNode.value = "(";
			openingParaenthesesNode.end++;

			var startNode: ParseNode = null;
			var endNode: ParseNode = null;
			var accelNode: ParseNode = null;

			var firstNode = this._parse_decimal(current);
			if (firstNode !== null) {
				if (this._peek() !== ",") {
					parent.pop();
					return null;
				}

				var commaNode = new ParseNode(current);
				commaNode.value = ",";
				commaNode.end++;

				var secondNode = this._parse_decimal(current);
				if (secondNode !== null) {
					startNode = firstNode;
					endNode = secondNode;

					if (this._peek() !== ",") {
						parent.pop();
						return null;
					}

					var endCommaNode = new ParseNode(current);
					endCommaNode.value = ",";
					endCommaNode.end++;

					var thirdNode = this._parse_decimal(current);
					if (thirdNode !== null) {
						accelNode = thirdNode;

						if (this._peek() !== ",") {
							parent.pop();
							return null;
						}

						var accelCommaNode = new ParseNode(current);
						accelCommaNode.value = ",";
						accelCommaNode.end++;
					}
				}
				else {
					accelNode = firstNode;

					if (this._peek() !== ",") {
						parent.pop();
						return null;
					}

					var accelCommaNode = new ParseNode(current);
					accelCommaNode.value = ",";
					accelCommaNode.end++;
				}
			}

			var transformTags: tags.Tag[] = [];

			for (var next = this._peek(); next !== ")"; next = this._peek()) {
				var childNode: ParseNode = null;

				if (next === "\\") {
					var backSlashNode = new ParseNode(current);
					backSlashNode.value = "\\";
					backSlashNode.end++;

					childNode =
						this._parse_tag_alpha(current) ||
						this._parse_tag_xbord(current) ||
						this._parse_tag_ybord(current) ||

						this._parse_tag_blur(current) ||
						this._parse_tag_bord(current) ||
						this._parse_tag_fscx(current) ||
						this._parse_tag_fscy(current) ||

						this._parse_tag_fax(current) ||
						this._parse_tag_fay(current) ||
						this._parse_tag_frx(current) ||
						this._parse_tag_fry(current) ||
						this._parse_tag_frz(current) ||
						this._parse_tag_fsp(current) ||

						this._parse_tag_fs(current) ||
						this._parse_tag_1a(current) ||
						this._parse_tag_1c(current) ||
						this._parse_tag_3a(current) ||
						this._parse_tag_3c(current) ||

						this._parse_tag_c(current);

					if (childNode === null) {
						current.pop(); // Include backslash in comment

						childNode = this._parse_comment(current);
					}
				}
				else {
					childNode = this._parse_comment(current);
				}

				if (childNode !== null) {
					if (childNode.value instanceof tags.Comment && transformTags[transformTags.length - 1] instanceof tags.Comment) {
						// Merge consecutive comment parts into one part
						transformTags[transformTags.length - 1] =
							new tags.Comment(
								(<tags.Comment>transformTags[transformTags.length - 1]).value +
								(<tags.Comment>childNode.value).value
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

			if (this._peek() !== ")") {
				parent.pop();
				return null;
			}

			var closingParaenthesesNode = new ParseNode(current);
			closingParaenthesesNode.value = ")";
			closingParaenthesesNode.end++;

			current.value =
				new tags.Transform(
					(startNode !== null) ? (startNode.value / 1000) : null,
					(endNode !== null) ? (endNode.value / 1000) : null,
					(accelNode !== null) ? (accelNode.value / 1000) : null,
					transformTags
				);

			return current;
		}

		private _parse_tag_u(parent: ParseNode) {
			if (this._peek("u".length) !== "u") {
				return null;
			}

			var current = new ParseNode(parent);

			var nameNode = new ParseNode(current);
			nameNode.value = "u";
			nameNode.end += "u".length;

			var valueNode = this._parse_enableDisable(current);

			if (valueNode !== null) {
				current.value = new tags.Underline(valueNode.value);
			}
			else {
				current.value = new tags.Underline(null);
			}

			return current;
		}

		private _parse_decimal(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			var next = this._peek();

			var negative = (next === "-");
			if (negative) {
				var signNode = new ParseNode(current);
				signNode.value = "-";
				signNode.end++;
			}

			var numericalPart = this._parse_unsignedDecimal(current);

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

		private _parse_unsignedDecimal(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			var characteristicNode = new ParseNode(current);
			characteristicNode.value = "";

			var mantissaNode: ParseNode = null;

			var next: string;
			for (next = this._peek(); next >= "0" && next <= "9"; next = this._peek()) {
				characteristicNode.value += next;
				characteristicNode.end++;
			}

			if (characteristicNode.value.length === 0) {
				parent.pop();
				return null;
			}

			if (this._peek() === ".") {
				var decimalPointNode = new ParseNode(current);
				decimalPointNode.value = ".";
				decimalPointNode.end++;

				mantissaNode = new ParseNode(current);
				mantissaNode.value = "";

				for (next = this._peek(); next >= "0" && next <= "9"; next = this._peek()) {
					mantissaNode.value += next;
					mantissaNode.end++;
				}

				if (mantissaNode.value.length === 0) {
					parent.pop();
					return null;
				}
			}

			current.value = parseFloat(characteristicNode.value + ((mantissaNode !== null) ? ("." + mantissaNode.value) : ""));

			return current;
		}

		private _parse_enableDisable(parent: ParseNode): ParseNode {
			var next = this._peek();

			if (next === "0" || next === "1") {
				var result = new ParseNode(parent);
				result.value = (next === "1");
				result.end++;

				return result;
			}

			return null;
		}

		private _parse_hex(parent: ParseNode): ParseNode {
			var next = this._peek();

			if ((next >= "0" && next <= "9") || (next >= "a" && next <= "f") || (next >= "A" && next <= "F")) {
				var current = new ParseNode(parent);
				current.value = next;
				current.end++;
				return current;
			}

			return null;
		}

		private _parse_color(parent: ParseNode): ParseNode {
			switch (this._peek(2)) {
				case "&H":
					var current = new ParseNode(parent);

					var beginNode = new ParseNode(current);
					beginNode.value = "&H";
					beginNode.end += 2;

					var digitNodes = Array<ParseNode>(6);

					for (var i = 0; i < digitNodes.length; i++) {
						var digitNode = this._parse_hex(current);
						if (digitNode === null) {
							parent.pop();
							return null;
						}
						digitNodes[i] = digitNode;
					}

					if (this._peek() !== "&") {
						parent.pop();
						return null;
					}

					current.value = new tags.Color(
						parseInt(digitNodes[4].value + digitNodes[5].value, 16),
						parseInt(digitNodes[2].value + digitNodes[3].value, 16),
						parseInt(digitNodes[0].value + digitNodes[1].value, 16)
					);

					var endNode = new ParseNode(current);
					endNode.value = "&";
					endNode.end++;

					return current;

				default:
					return null;
			}
		}

		private _parse_alpha(parent: ParseNode): ParseNode {
			switch (this._peek(2)) {
				case "&H":
					var current = new ParseNode(parent);

					var beginNode = new ParseNode(current);
					beginNode.value = "&H";
					beginNode.end += 2;

					var digitNodes = Array<ParseNode>(2);

					for (var i = 0; i < digitNodes.length; i++) {
						var digitNode = this._parse_hex(current);
						if (digitNode === null) {
							parent.pop();
							return null;
						}
						digitNodes[i] = digitNode;
					}

					if (this._peek() !== "&") {
						parent.pop();
						return null;
					}

					current.value = 1 - parseInt(digitNodes[0].value + digitNodes[1].value, 16) / 255;

					var endNode = new ParseNode(current);
					endNode.value = "&";
					endNode.end++;

					return current;

				default:
					return null;
			}
		}

		private _parse_colorWithAlpha(parent: ParseNode): ParseNode {
			switch (this._peek(2)) {
				case "&H":
					var current = new ParseNode(parent);

					var beginNode = new ParseNode(current);
					beginNode.value = "&H";
					beginNode.end += 2;

					var digitNodes = Array<ParseNode>(8);

					for (var i = 0; i < digitNodes.length; i++) {
						var digitNode = this._parse_hex(current);
						if (digitNode === null) {
							parent.pop();
							return null;
						}
						digitNodes[i] = digitNode;
					}

					current.value = new tags.Color(
						parseInt(digitNodes[6].value + digitNodes[7].value, 16),
						parseInt(digitNodes[4].value + digitNodes[5].value, 16),
						parseInt(digitNodes[2].value + digitNodes[3].value, 16),
						1 - parseInt(digitNodes[0].value + digitNodes[1].value, 16) / 255
					);

					return current;

				default:
					return null;
			}
		}

		private _peek(count: number = 1) {
			return this._input.substr(this._parseTree.end, count);
		}
	};

	var rules = new Map<string, (parent: ParseNode) => ParseNode>();
	Object.keys(ParserRun.prototype).forEach(key => {
		if (key.indexOf("_parse_") === 0 && typeof ParserRun.prototype[key] === "function") {
			rules.set(key.substr("_parse_".length), ParserRun.prototype[key]);
		}
	});

	class ParseNode {
		private _children: ParseNode[] = [];

		private _start: number;
		private _end: number;
		private _value: any;

		constructor(private _parent: ParseNode) {
			if (_parent !== null) {
				_parent._children.push(this);
			}

			this._start = ((_parent !== null) ? _parent.end : 0);

			this.end = this._start;
		}

		get start(): number {
			return this._start;
		}

		get end(): number {
			return this._end;
		}

		set end(value: number) {
			this._end = value;

			if (this._parent !== null && this._parent.end !== this._end) {
				this._parent.end = this._end;
			}
		}

		get parent(): ParseNode {
			return this._parent;
		}

		get children(): ParseNode[] {
			return this._children;
		}

		get value(): any {
			return this._value;
		}

		set value(newValue: any) {
			this._value = newValue;
		}

		pop(): void {
			this._children.splice(this._children.length - 1, 1);

			if (this._children.length > 0) {
				this.end = this._children[this._children.length - 1].end;
			}
			else {
				this.end = this.start;
			}
		}
	}
}
