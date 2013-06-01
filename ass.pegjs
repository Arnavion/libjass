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
	=	"i" value:enableDisable? { return new Tags.Italic(value); }

boldTag
	=	"b" value:(decimal)? { return new Tags.Bold(value); }

underlineTag
	=	"u" value:enableDisable? { return new Tags.Underline(value); }

strikeoutTag
	=	"s" value:enableDisable? { return new Tags.Strikeout(value); }

borderTag
	=	"bord" value:decimal? { return new Tags.Border(value); }

blurTag
	=	"blur" value:decimal? { return new Tags.Blur(value); }

fontNameTag
	=	"fn" value:[^\\}]* { return new Tags.FontName(value); }

fontSizeTag
	=	"fs" value:decimal? { return new Tags.FontSize(value); }

frxTag
	=	"frx" value:decimal? { return new Tags.Frx(value); }

fryTag
	=	"fry" value:decimal? { return new Tags.Fry(value); }

frzTag
	=	"frz" value:decimal? { return new Tags.Frz(value); }

faxTag
	=	"fax" value:decimal? { return new Tags.Fax(value); }

fayTag
	=	"fay" value:decimal? { return new Tags.Fay(value); }

primaryColorTag
	=	"1"? "c" value:color? { return new Tags.PrimaryColor(value); }

outlineColorTag
	=	"3c" value:color? { return new Tags.OutlineColor(value); }

alphaTag
	=	"alpha" value:alpha? { return new Tags.Alpha(value); }

primaryAlphaTag
	=	"1a" value:alpha? { return new Tags.PrimaryAlpha(value); }

outlineAlphaTag
	=	"3a" value:alpha? { return new Tags.OutlineAlpha(value); }

alignmentTag
	=	"an" value:[1-9]? { return new Tags.Alignment(value); }

resetTag
	=	"r" value:[^\\}]* { return new Tags.Reset(value); }

posTag
	=	"pos(" x:decimal "," y:decimal ")" { return new Tags.Pos(x, y); }

fadeTag
	=	"fad(" start:decimal "," end:decimal ")" { return new Tags.Fade((parseFloat(start) || 0) / 1000, (parseFloat(end) || 0) / 1000); }

decimal
	=	value:([0-9]+ ("." [0-9]+)?) { return value[0].join("") + (value[1][0] || "") + (value[1][1] && value[1][1].join("") || ""); }

enableDisable
	=	"0" / "1"

hex
	=	[0-9a-fA-F]

color
	=	"&H" value:(hex hex hex hex hex hex) "&" { return value.join("").toRGB(); }

alpha
	=	"&H" value:(hex hex) { return value.join(""); };
