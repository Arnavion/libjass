1. Install the build tools
    1. node.js http://nodejs.org/ (or via your package manager)
    1. TypeScript http://www.typescriptlang.org/#Download

1. Generate libjass.js

        tsc libjass.ts --out libjass.js --sourcemap --noImplicitAny --target ES5

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

1. Minify libjass.js to libjass.min.js

1. Prepend the license notice to libjass.min.js from any one of the TS files.

1. Change index.xhtml to use the minified file.
```
	<head>
		<title>&gt;2012 &gt;Streaman Animu</title>
		<link rel="stylesheet" href="index.css" />
		<link rel="stylesheet" href="fonts.css" />
		<script src="peg-0.7.0.min.js" />
		<script src="libjass.min.js" />
		<script src="index.js" />
		<style id="animation-styles" type="text/css" />
	</head>
```
