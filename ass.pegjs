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

dialogue
	=	parts:(enclosedTags / comment / newline / hardspace / text)* {
			// Flatten parts
			parts = parts.reduce(function (previous, current) {
				return previous.concat(current);
			}, []);

			// Merge consecutive text and comment parts into one part
			parts = parts.reduce(function (previous, current) {
				if (current instanceof libjass.tags.Text && previous[previous.length - 1] instanceof libjass.tags.Text) {
					previous[previous.length - 1] = new libjass.tags.Text(previous[previous.length - 1].value + current.value);
				}
				else if (current instanceof libjass.tags.Comment && previous[previous.length - 1] instanceof libjass.tags.Comment) {
					previous[previous.length - 1] = new libjass.tags.Comment(previous[previous.length - 1].value + current.value);
				}
				else {
					previous.push(current);
				}

				return previous;
			}, []);

			return parts;
		}

enclosedTags
	=	"{" tagsWithSlashes:(
			"\\" alphaTag /
			"\\" borderTag /
			"\\" blurTag /
			"\\" fadeTag /
			"\\" frxTag /
			"\\" fryTag /
			"\\" frzTag /
			"\\" faxTag /
			"\\" fayTag /
			"\\" posTag /
			"\\" fontNameTag /
			"\\" fontSizeTag /
			"\\" primaryColorTag /
			"\\" outlineColorTag /
			"\\" primaryAlphaTag /
			"\\" outlineAlphaTag /
			"\\" alignmentTag /
			"\\" italicTag /
			"\\" boldTag /
			"\\" underlineTag /
			"\\" strikeoutTag /
			"\\" resetTag
		)+
		"}" {
			return tagsWithSlashes.map(function (tagWithSlash) { return tagWithSlash[1]; });
		}

comment
	=	"{" value:[^}]* "}" {
			return new libjass.tags.Comment(
				value.join("")
			);
		}

newline
	=	"\\N" {
			return new libjass.tags.NewLine();
		}

hardspace
	=	"\\h" {
			return new libjass.tags.HardSpace();
		}

text
	=	value:. {
			return new libjass.tags.Text(
				value
			);
		}

italicTag
	=	"i" value:enableDisable? {
			return new libjass.tags.Italic(
				(value !== "") ? value : null
			);
		}

boldTag
	=	"b" value:(([1-9] "0" "0") / "1" / "0")? {
			if (Array.isArray(value)) {
				value = value.join("");
			}
			switch (value) {
				case "1":
					return new libjass.tags.Bold(true);
				case "0":
					return new libjass.tags.Bold(false);
				case "":
					return new libjass.tags.Bold(null);
				default:
					return new libjass.tags.Bold(parseInt(value));
			}
		}

underlineTag
	=	"u" value:enableDisable? {
			return new libjass.tags.Underline(
				(value !== "") ? value : null
			);
		}

strikeoutTag
	=	"s" value:enableDisable? {
			return new libjass.tags.Strikeout(
				(value !== "") ? value : null
			);
		}

borderTag
	=	"bord" value:decimal? {
			return new libjass.tags.Border(
				(value !== "") ? value : null
			);
		}

blurTag
	=	"blur" value:decimal? {
			return new libjass.tags.Blur(
				(value !== "") ? value : null
			);
		}

fontNameTag
	=	"fn" value:[^\\}]* {
			return new libjass.tags.FontName(
				(value.length > 0) ? value.join("") : null
			);
		}

fontSizeTag
	=	"fs" value:decimal? {
			return new libjass.tags.FontSize(
				(value !== "") ? value : null
			);
		}

frxTag
	=	"frx" value:decimal? {
			return new libjass.tags.Frx(
				(value !== "") ? value : null
			);
		}

fryTag
	=	"fry" value:decimal? {
			return new libjass.tags.Fry(
				(value !== "") ? value : null
			);
		}

frzTag
	=	"frz" value:decimal? {
			return new libjass.tags.Frz(
				(value !== "") ? value : null
			);
		}

faxTag
	=	"fax" value:decimal? {
			return new libjass.tags.Fax(
				(value !== "") ? value : null
			);
		}

fayTag
	=	"fay" value:decimal? {
			return new libjass.tags.Fay(
				(value !== "") ? value : null
			);
		}

primaryColorTag
	=	"1"? "c" value:color? {
			return new libjass.tags.PrimaryColor(
				(value !== "") ? value : null
			);
		}

outlineColorTag
	=	"3c" value:color? {
			return new libjass.tags.OutlineColor(
				(value !== "") ? value : null
			);
		}

alphaTag
	=	"alpha" value:alpha? {
			return new libjass.tags.Alpha(
				(value !== "") ? value : null
			);
		}

primaryAlphaTag
	=	"1a" value:alpha? {
			return new libjass.tags.PrimaryAlpha(
				(value !== "") ? value : null
			);
		}

outlineAlphaTag
	=	"3a" value:alpha? {
			return new libjass.tags.OutlineAlpha(
				(value !== "") ? value : null
			);
		}

alignmentTag
	=	"an" value:[1-9] {
			return new libjass.tags.Alignment(
				parseInt(value)
			);
		}

resetTag
	=	"r" value:[^\\}]* {
			return new libjass.tags.Reset(
				(value.length > 0) ? value.join("") : null
			);
		}

posTag
	=	"pos(" x:decimal "," y:decimal ")" {
			return new libjass.tags.Pos(
				x,
				y
			);
		}

fadeTag
	=	"fad(" start:decimal "," end:decimal ")" {
			return new libjass.tags.Fade(
				parseFloat(start) / 1000,
				parseFloat(end) / 1000
			);
		}

decimal
	=	sign:"-"? unsignedDecimal:unsignedDecimal {
			return (sign === "") ? unsignedDecimal : -unsignedDecimal;
		}

unsignedDecimal
	=	characteristic:[0-9]+ mantissa:("." [0-9]+)? {
			return parseFloat(
				characteristic.join("") +
				(mantissa[0] || "") + (mantissa[1] && mantissa[1].join("") || "")
			);
		}

enableDisable
	=	value:("0" / "1") {
			switch (value) {
				case "0":
					return false;
				case "1":
					return true;
			}
		}

hex
	=	[0-9a-fA-F]

color
	=	"&H" blue:(hex hex) green:(hex hex) red:(hex hex) "&" {
			return (
				"rgba(" +
				[red.join(""), green.join(""), blue.join("")].map(function (part) {
					return parseInt(part, 16);
				}).join(", ") +
				", 1)"
			);
		}

alpha
	=	"&H" value:(hex hex) {
			return value.join("");
		}

colorWithAlpha
	=	"&H" alpha:(hex hex) blue:(hex hex) green:(hex hex) red:(hex hex) {
			return (
				"rgba(" +
				[red.join(""), green.join(""), blue.join("")].map(function (part) {
					return parseInt(part, 16) + ", ";
				}).join("") +
				(1 - parseInt(alpha.join(""), 16) / 255) +
				")"
			);
		}
