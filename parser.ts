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

			while (this._haveMore()) {
				var scriptSectionNode = this._parse_scriptSection(current);

				if (scriptSectionNode !== null) {
					current.value[scriptSectionNode.value.name] = scriptSectionNode.value.contents;
				}
				else if (this._read(current, "\n") === null) {
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

			while(this._haveMore() && this._peek() !== "[") {
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

				else if (this._parse_scriptComment(current) === null && this._read(current, "\n") === null) {
					parent.pop();
					return null;
				}
			}

			return current;
		}

		private _parse_scriptSectionHeader(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this._read(current, "[") === null) {
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

			if (this._read(current, "]") === null) {
				parent.pop();
				return null;
			}

			return current;
		}

		private _parse_scriptProperty(parent: ParseNode): ParseNode {
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

			if (this._read(current, ":") === null) {
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

		private _parse_scriptComment(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this._read(current, ";") === null) {
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

		private _parse_dialogueParts(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			current.value = [];

			while (this._haveMore()) {
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
			var current = new ParseNode(parent);

			current.value = [];

			if (this._read(current, "{") === null) {
				parent.pop();
				return null;
			}

			for (var next = this._peek(); this._haveMore() && next !== "}"; next = this._peek()) {
				var childNode: ParseNode = null;

				if (this._read(current, "\\") !== null) {
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
						current.pop(); // Unread backslash
					}
				}

				if (childNode === null) {
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

			if (this._read(current, "}") === null) {
				parent.pop();
				return null;
			}

			return current;
		}

		private _parse_newline(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "\\N") === null) {
				parent.pop();
				return null;
			}

			current.value = new tags.NewLine();

			return current;
		}

		private _parse_hardspace(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "\\h") === null) {
				parent.pop();
				return null;
			}

			current.value = new tags.HardSpace();

			return current;
		}

		private _parse_text(parent: ParseNode) {
			var value = this._peek();

			var current = new ParseNode(parent);
			var valueNode = new ParseNode(current, value);

			current.value = new tags.Text(valueNode.value);

			return current;
		}

		private _parse_comment(parent: ParseNode) {
			var value = this._peek();

			var current = new ParseNode(parent);
			var valueNode = new ParseNode(current, value);

			current.value = new tags.Comment(valueNode.value);

			return current;
		}

		private _parse_tag_alpha(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "alpha") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "xbord") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "ybord") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "bord") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "blur") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fscx") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fscy") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fad") === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var startNode = this._parse_decimal(current);
			if (startNode === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var endNode = this._parse_decimal(current);
			if (endNode === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, ")") === null) {
				parent.pop();
				return null;
			}

			current.value = new tags.Fade(startNode.value / 1000, endNode.value / 1000);

			return current;
		}

		private _parse_tag_fax(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "fax") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fay") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "frx") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fry") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "frz") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "fsp") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "pos") === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var xNode = this._parse_decimal(current);
			if (xNode === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, ",") === null) {
				parent.pop();
				return null;
			}

			var yNode = this._parse_decimal(current);
			if (yNode === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, ")") === null) {
				parent.pop();
				return null;
			}

			current.value = new tags.Pos(xNode.value, yNode.value);

			return current;
		}

		private _parse_tag_an(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "an") === null) {
				parent.pop();
				return null;
			}

			var next = this._peek();

			if (next < "0" || next > "9") {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, next);

			current.value = new tags.Alignment(parseInt(valueNode.value));

			return current;
		}

		private _parse_tag_fn(parent: ParseNode) {
			var current = new ParseNode(parent);

			if (this._read(current, "fn") === null) {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, "");

			for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
				valueNode.value += next;
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
			var current = new ParseNode(parent);

			if (this._read(current, "fs") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "1a") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "1c") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "3a") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "3c") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "b") === null) {
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
			var current = new ParseNode(parent);

			if (this._read(current, "c") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "i") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "r") === null) {
				parent.pop();
				return null;
			}

			var valueNode = new ParseNode(current, "");

			for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
				valueNode.value += next;
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
			var current = new ParseNode(parent);

			if (this._read(current, "s") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "t") === null) {
				parent.pop();
				return null;
			}

			if (this._read(current, "(") === null) {
				parent.pop();
				return null;
			}

			var startNode: ParseNode = null;
			var endNode: ParseNode = null;
			var accelNode: ParseNode = null;

			var firstNode = this._parse_decimal(current);
			if (firstNode !== null) {
				if (this._read(current, ",") === null) {
					parent.pop();
					return null;
				}

				var secondNode = this._parse_decimal(current);
				if (secondNode !== null) {
					startNode = firstNode;
					endNode = secondNode;

					if (this._read(current, ",") === null) {
						parent.pop();
						return null;
					}

					var thirdNode = this._parse_decimal(current);
					if (thirdNode !== null) {
						accelNode = thirdNode;

						if (this._read(current, ",") === null) {
							parent.pop();
							return null;
						}
					}
				}
				else {
					accelNode = firstNode;

					if (this._read(current, ",") === null) {
						parent.pop();
						return null;
					}
				}
			}

			var transformTags: tags.Tag[] = [];

			for (var next = this._peek(); this._haveMore() && next !== ")"; next = this._peek()) {
				var childNode: ParseNode = null;

				if (this._read(current, "\\") !== null) {
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
						current.pop(); // Unread backslash
					}
				}

				if (childNode === null) {
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

			if (this._read(current, ")") === null) {
				parent.pop();
				return null;
			}

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
			var current = new ParseNode(parent);

			if (this._read(current, "u") === null) {
				parent.pop();
				return null;
			}

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

			var negative = (this._read(current, "-") !== null);

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

			if (this._read(current, ".") !== null) {
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

		private _parse_enableDisable(parent: ParseNode): ParseNode {
			var next = this._peek();

			if (next === "0" || next === "1") {
				var result = new ParseNode(parent, next);
				result.value = (result.value === "1");

				return result;
			}

			return null;
		}

		private _parse_hex(parent: ParseNode): ParseNode {
			var next = this._peek();

			if ((next >= "0" && next <= "9") || (next >= "a" && next <= "f") || (next >= "A" && next <= "F")) {
				return new ParseNode(parent, next);
			}

			return null;
		}

		private _parse_color(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this._read(current, "&H") === null) {
				parent.pop();
				return null;
			}

			var digitNodes = Array<ParseNode>(6);

			for (var i = 0; i < digitNodes.length; i++) {
				var digitNode = this._parse_hex(current);
				if (digitNode === null) {
					parent.pop();
					return null;
				}
				digitNodes[i] = digitNode;
			}

			if (this._read(current, "&") === null) {
				parent.pop();
				return null;
			}

			current.value = new tags.Color(
				parseInt(digitNodes[4].value + digitNodes[5].value, 16),
				parseInt(digitNodes[2].value + digitNodes[3].value, 16),
				parseInt(digitNodes[0].value + digitNodes[1].value, 16)
			);

			return current;
		}

		private _parse_alpha(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this._read(current, "&H") === null) {
				parent.pop();
				return null;
			}

			var digitNodes = Array<ParseNode>(2);

			for (var i = 0; i < digitNodes.length; i++) {
				var digitNode = this._parse_hex(current);
				if (digitNode === null) {
					parent.pop();
					return null;
				}
				digitNodes[i] = digitNode;
			}

			if (this._read(current, "&") === null) {
				parent.pop();
				return null;
			}

			current.value = 1 - parseInt(digitNodes[0].value + digitNodes[1].value, 16) / 255;

			return current;
		}

		private _parse_colorWithAlpha(parent: ParseNode): ParseNode {
			var current = new ParseNode(parent);

			if (this._read(current, "&H") === null) {
				parent.pop();
				return null;
			}

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
		}

		private _peek(count: number = 1) {
			return this._input.substr(this._parseTree.end, count);
		}

		private _read(parent: ParseNode, next: string) {
			if (this._peek(next.length) !== next) {
				return null;
			}

			return new ParseNode(parent, next);
		}

		private _haveMore(): boolean {
			return this._parseTree.end < this._input.length;
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

		get start(): number {
			return this._start;
		}

		get end(): number {
			return this._end;
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

			if (this._value.constructor === String && this._children.length === 0) {
				this._setEnd(this._start + this._value.length);
			}
		}

		pop(): void {
			this._children.splice(this._children.length - 1, 1);

			if (this._children.length > 0) {
				this._setEnd(this._children[this._children.length - 1].end);
			}
			else {
				this._setEnd(this.start);
			}
		}

		private _setEnd(newEnd: number): void {
			this._end = newEnd;

			if (this._parent !== null && this._parent.end !== this._end) {
				this._parent._setEnd(this._end);
			}
		}
	}
}
