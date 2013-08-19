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
			"\\" tag_alpha /
			"\\" tag_xbord /
			"\\" tag_ybord /

			"\\" tag_bord /
			"\\" tag_blur /
			"\\" tag_fscx /
			"\\" tag_fscy /

			"\\" tag_fsp /
			"\\" tag_frx /
			"\\" tag_fry /
			"\\" tag_frz /
			"\\" tag_fax /
			"\\" tag_fay /
			"\\" tag_pos /
			"\\" tag_fad /

			"\\" tag_fn /
			"\\" tag_fs /
			"\\" tag_1c /
			"\\" tag_3c /
			"\\" tag_1a /
			"\\" tag_3a /
			"\\" tag_an /

			"\\" tag_i /
			"\\" tag_b /
			"\\" tag_u /
			"\\" tag_s /
			"\\" tag_c /
			"\\" tag_r
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

tag_i
	=	"i" value:enableDisable? {
			return new libjass.tags.Italic(
				(value !== "") ? value : null
			);
		}

tag_b
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

tag_u
	=	"u" value:enableDisable? {
			return new libjass.tags.Underline(
				(value !== "") ? value : null
			);
		}

tag_s
	=	"s" value:enableDisable? {
			return new libjass.tags.StrikeThrough(
				(value !== "") ? value : null
			);
		}

tag_bord
	=	"bord" value:decimal? {
			return new libjass.tags.Border(
				(value !== "") ? value : null
			);
		}

tag_xbord
	=	"bord" value:decimal? {
			return new libjass.tags.BorderX(
				(value !== "") ? value : null
			);
		}

tag_ybord
	=	"bord" value:decimal? {
			return new libjass.tags.BorderY(
				(value !== "") ? value : null
			);
		}

tag_blur
	=	"blur" value:decimal? {
			return new libjass.tags.Blur(
				(value !== "") ? value : null
			);
		}

tag_fn
	=	"fn" value:[^\\}]* {
			return new libjass.tags.FontName(
				(value.length > 0) ? value.join("") : null
			);
		}

tag_fs
	=	"fs" value:decimal? {
			return new libjass.tags.FontSize(
				(value !== "") ? value : null
			);
		}

tag_fscx
	=	"fscx" value:decimal? {
			return new libjass.tags.FontScaleX(
				(value !== "") ? (value / 100) : null
			);
		}

tag_fscy
	=	"fscy" value:decimal? {
			return new libjass.tags.FontScaleY(
				(value !== "") ? (value / 100) : null
			);
		}

tag_fsp
	=	"fsp" value:decimal? {
			return new libjass.tags.LetterSpacing(
				(value !== "") ? value : null
			);
		}

tag_frx
	=	"frx" value:decimal? {
			return new libjass.tags.RotateX(
				(value !== "") ? value : null
			);
		}

tag_fry
	=	"fry" value:decimal? {
			return new libjass.tags.RotateY(
				(value !== "") ? value : null
			);
		}

tag_frz
	=	"frz" value:decimal? {
			return new libjass.tags.RotateZ(
				(value !== "") ? value : null
			);
		}

tag_fax
	=	"fax" value:decimal? {
			return new libjass.tags.SkewX(
				(value !== "") ? value : null
			);
		}

tag_fay
	=	"fay" value:decimal? {
			return new libjass.tags.SkewY(
				(value !== "") ? value : null
			);
		}

tag_1c
	=	"1c" value:color? {
			return new libjass.tags.PrimaryColor(
				(value !== "") ? value : null
			);
		}

tag_c
	=	"c" value:color? {
			return new libjass.tags.PrimaryColor(
				(value !== "") ? value : null
			);
		}

tag_3c
	=	"3c" value:color? {
			return new libjass.tags.OutlineColor(
				(value !== "") ? value : null
			);
		}

tag_alpha
	=	"alpha" value:alpha? {
			return new libjass.tags.Alpha(
				(value !== "") ? value : null
			);
		}

tag_1a
	=	"1a" value:alpha? {
			return new libjass.tags.PrimaryAlpha(
				(value !== "") ? value : null
			);
		}

tag_3a
	=	"3a" value:alpha? {
			return new libjass.tags.OutlineAlpha(
				(value !== "") ? value : null
			);
		}

tag_an
	=	"an" value:[1-9] {
			return new libjass.tags.Alignment(
				parseInt(value)
			);
		}

tag_r
	=	"r" value:[^\\}]* {
			return new libjass.tags.Reset(
				(value.length > 0) ? value.join("") : null
			);
		}

tag_pos
	=	"pos(" x:decimal "," y:decimal ")" {
			return new libjass.tags.Pos(
				x,
				y
			);
		}

tag_fad
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
			return new libjass.tags.Color(
				parseInt(red.join(""), 16),
				parseInt(green.join(""), 16),
				parseInt(blue.join(""), 16)
			);
		}

alpha
	=	"&H" value:(hex hex) "&" {
			return 1 - parseInt(value.join(""), 16) / 255;
		}

colorWithAlpha
	=	"&H" alpha:(hex hex) blue:(hex hex) green:(hex hex) red:(hex hex) {
			return new libjass.tags.Color(
				parseInt(red.join(""), 16),
				parseInt(green.join(""), 16),
				parseInt(blue.join(""), 16),
				1 - parseInt(alpha.join(""), 16) / 255
			);
		}
