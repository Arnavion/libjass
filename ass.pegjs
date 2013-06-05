dialogue
	=	parts:(enclosedTags / comment / newline / hardspace / text)* { return parts.reduce(function (previous, current) { return previous.concat(current); }, []); }

enclosedTags
	=	"{" tags:(
			"\\" tag:alphaTag { return tag; } /
			"\\" tag:borderTag { return tag; } /
			"\\" tag:blurTag { return tag; } /
			"\\" tag:fadeTag { return tag; } /
			"\\" tag:frxTag { return tag; } /
			"\\" tag:fryTag { return tag; } /
			"\\" tag:frzTag { return tag; } /
			"\\" tag:faxTag { return tag; } /
			"\\" tag:fayTag { return tag; } /
			"\\" tag:posTag { return tag; } /
			"\\" tag:fontNameTag { return tag; } /
			"\\" tag:fontSizeTag { return tag; } /
			"\\" tag:primaryColorTag { return tag; } /
			"\\" tag:outlineColorTag { return tag; } /
			"\\" tag:primaryAlphaTag { return tag; } /
			"\\" tag:outlineAlphaTag { return tag; } /
			"\\" tag:alignmentTag { return tag; } /
			"\\" tag:italicTag { return tag; } /
			"\\" tag:boldTag { return tag; } /
			"\\" tag:underlineTag { return tag; } /
			"\\" tag:strikeoutTag { return tag; } /
			"\\" tag:resetTag { return tag; }
		)+
		"}" { return tags; }

comment
	=	"{" value:[^}]* "}" { return new Tags.Comment(value.join("")); }

newline
	=	"\\N" { return new Tags.NewLine(); }

hardspace
	=	"\\h" { return new Tags.HardSpace(); }

text
	=	value:. { return new Tags.Text(value); }

italicTag
	=	"i" value:enableDisable? { return new Tags.Italic(value || null); }

boldTag
	=	"b" value:(decimal)? { switch (value) { case "1": return true; case "0": return false; case "": return null; default: return parseFloat(value); } }

underlineTag
	=	"u" value:enableDisable? { return new Tags.Underline(value || null); }

strikeoutTag
	=	"s" value:enableDisable? { return new Tags.Strikeout(value || null); }

borderTag
	=	"bord" value:decimal? { return new Tags.Border((value !== "") ? value : null); }

blurTag
	=	"blur" value:decimal? { return new Tags.Blur((value !== "") ? value : null); }

fontNameTag
	=	"fn" value:[^\\}]* { return new Tags.FontName((value !== "") ? value : null); }

fontSizeTag
	=	"fs" value:decimal? { return new Tags.FontSize((value !== "") ? value : null); }

frxTag
	=	"frx" value:decimal? { return new Tags.Frx((value !== "") ? value : null); }

fryTag
	=	"fry" value:decimal? { return new Tags.Fry((value !== "") ? value : null); }

frzTag
	=	"frz" value:decimal? { return new Tags.Frz((value !== "") ? value : null); }

faxTag
	=	"fax" value:decimal? { return new Tags.Fax((value !== "") ? value : null); }

fayTag
	=	"fay" value:decimal? { return new Tags.Fay((value !== "") ? value : null); }

primaryColorTag
	=	"1"? "c" value:color? { return new Tags.PrimaryColor((value !== "") ? value : null); }

outlineColorTag
	=	"3c" value:color? { return new Tags.OutlineColor((value !== "") ? value : null); }

alphaTag
	=	"alpha" value:alpha? { return new Tags.Alpha((value !== "") ? value : null); }

primaryAlphaTag
	=	"1a" value:alpha? { return new Tags.PrimaryAlpha((value !== "") ? value : null); }

outlineAlphaTag
	=	"3a" value:alpha? { return new Tags.OutlineAlpha((value !== "") ? value : null); }

alignmentTag
	=	"an" value:[1-9]? { return new Tags.Alignment((value !== "") ? parseInt(value) : null); }

resetTag
	=	"r" value:[^\\}]* { return new Tags.Reset((value !== "") ? value : null); }

posTag
	=	"pos(" x:decimal "," y:decimal ")" { return new Tags.Pos(x, y); }

fadeTag
	=	"fad(" start:decimal "," end:decimal ")" { start = parseFloat(start); return new Tags.Fade(parseFloat(start) / 1000, parseFloat(end) / 1000); }

decimal
	=	sign:"-"? characteristic:[0-9]+ mantissa:("." [0-9]+)? { return parseFloat(sign + characteristic.join("") + (mantissa[0] || "") + (mantissa[1] && mantissa[1].join("") || "")); }

enableDisable
	=	value:("0" / "1") { return parseInt(value); }

hex
	=	[0-9a-fA-F]

color
	=	"&H" value:(hex hex hex hex hex hex) "&" { return value.join("").toRGB(); }

alpha
	=	"&H" value:(hex hex) { return value.join(""); };
