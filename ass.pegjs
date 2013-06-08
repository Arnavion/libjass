dialogue
	=	parts:(enclosedTags / comment / newline / hardspace / text)* {
			// Flatten parts
			parts = parts.reduce(function (previous, current) {
				return previous.concat(current);
			}, []);

			// Merge consecutive text and comment parts into one part
			parts = parts.reduce(function (previous, current) {
				if (current instanceof ASS.Tags.Text && previous[previous.length - 1] instanceof ASS.Tags.Text) {
					previous[previous.length - 1] = new ASS.Tags.Text(previous[previous.length - 1].value + current.value);
				}
				else if (current instanceof ASS.Tags.Comment && previous[previous.length - 1] instanceof ASS.Tags.Comment) {
					previous[previous.length - 1] = new ASS.Tags.Comment(previous[previous.length - 1].value + current.value);
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
			return new ASS.Tags.Comment(
				value.join("")
			);
		}

newline
	=	"\\N" {
			return new ASS.Tags.NewLine();
		}

hardspace
	=	"\\h" {
			return new ASS.Tags.HardSpace();
		}

text
	=	value:. {
			return new ASS.Tags.Text(
				value
			);
		}

italicTag
	=	"i" value:enableDisable? {
			return new ASS.Tags.Italic(
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
					return new ASS.Tags.Bold(true);
				case "0":
					return new ASS.Tags.Bold(false);
				case "":
					return new ASS.Tags.Bold(null);
				default:
					return new ASS.Tags.Bold(parseInt(value));
			}
		}

underlineTag
	=	"u" value:enableDisable? {
			return new ASS.Tags.Underline(
				(value !== "") ? value : null
			);
		}

strikeoutTag
	=	"s" value:enableDisable? {
			return new ASS.Tags.Strikeout(
				(value !== "") ? value : null
			);
		}

borderTag
	=	"bord" value:decimal? {
			return new ASS.Tags.Border(
				(value !== "") ? value : null
			);
		}

blurTag
	=	"blur" value:decimal? {
			return new ASS.Tags.Blur(
				(value !== "") ? value : null
			);
		}

fontNameTag
	=	"fn" value:[^\\}]* {
			return new ASS.Tags.FontName(
				(value.length > 0) ? value.join("") : null
			);
		}

fontSizeTag
	=	"fs" value:decimal? {
			return new ASS.Tags.FontSize(
				(value !== "") ? value : null
			);
		}

frxTag
	=	"frx" value:decimal? {
			return new ASS.Tags.Frx(
				(value !== "") ? value : null
			);
		}

fryTag
	=	"fry" value:decimal? {
			return new ASS.Tags.Fry(
				(value !== "") ? value : null
			);
		}

frzTag
	=	"frz" value:decimal? {
			return new ASS.Tags.Frz(
				(value !== "") ? value : null
			);
		}

faxTag
	=	"fax" value:decimal? {
			return new ASS.Tags.Fax(
				(value !== "") ? value : null
			);
		}

fayTag
	=	"fay" value:decimal? {
			return new ASS.Tags.Fay(
				(value !== "") ? value : null
			);
		}

primaryColorTag
	=	"1"? "c" value:color? {
			return new ASS.Tags.PrimaryColor(
				(value !== "") ? value : null
			);
		}

outlineColorTag
	=	"3c" value:color? {
			return new ASS.Tags.OutlineColor(
				(value !== "") ? value : null
			);
		}

alphaTag
	=	"alpha" value:alpha? {
			return new ASS.Tags.Alpha(
				(value !== "") ? value : null
			);
		}

primaryAlphaTag
	=	"1a" value:alpha? {
			return new ASS.Tags.PrimaryAlpha(
				(value !== "") ? value : null
			);
		}

outlineAlphaTag
	=	"3a" value:alpha? {
			return new ASS.Tags.OutlineAlpha(
				(value !== "") ? value : null
			);
		}

alignmentTag
	=	"an" value:[1-9] {
			return new ASS.Tags.Alignment(
				parseInt(value)
			);
		}

resetTag
	=	"r" value:[^\\}]* {
			return new ASS.Tags.Reset(
				(value.length > 0) ? value.join("") : null
			);
		}

posTag
	=	"pos(" x:decimal "," y:decimal ")" {
			return new ASS.Tags.Pos(
				x,
				y
			);
		}

fadeTag
	=	"fad(" start:decimal "," end:decimal ")" {
			return new ASS.Tags.Fade(
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
