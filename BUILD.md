1. Install the build tools
    1. node.js http://nodejs.org/ (or via your package manager)
    1. TypeScript http://www.typescriptlang.org/#Download

            npm install typescript

    1. PEG.js http://pegjs.majda.cz/

            npm install pegjs

1. Generate libjass.js

        tsc libjass.ts --out libjass.js --sourcemap --noImplicitAny --target ES5

1. Generate ass.pegjs.js

        pegjs --export-var "libjass.parser" ass.pegjs ass.pegjs.js

1. Set the URLs of the video and the ASS file in index.xhtml

        <video id="video" src=" <URL OF VIDEO HERE> " controls="">
        	<track src=" <URL OF SCRIPT HERE> " kind="metadata" data-format="ass" />
        </video>

1. Set the URLs of any fonts you want to make available in fonts.css

        @font-face {
        	font-family: " <NAME OF FONT HERE> ";
        	src: url(" <URL OF FONT HERE> ");
        }
for each font. The name of the font is what it's called in the ASS file.

1. Start your web server and navigate to index.xhtml in a browser.

***

The next steps are for building the minified file libjass.min.js, and are optional.

1. Minify libjass.js and ass.pegjs.js to libjass.min.js

    For example, use the following command-line for Microsoft AJAX Minifer:

        "C:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\ajaxmin.exe" libjass.js ass.pegjs.js -enc:in utf-8 -enc:out utf-8 -out libjass.min.js -comments:none -debug:false,console,libjass.debugMode,libjass.verboseMode -esc:true -inline:false -map:V3 libjass.min.js.map -strict:true

1. Prepend the license notice to libjass.min.js from any one of the TS files.

1. Change index.xhtml to use the minified file.
```
	<head>
		<title>&gt;2012 &gt;Streaman Animu</title>
		<link rel="stylesheet" href="index.css" />
		<link rel="stylesheet" href="fonts.css" />
		<script src="libjass.min.js" />
		<script src="index.js" />
		<style id="animation-styles" type="text/css" />
	</head>
```
