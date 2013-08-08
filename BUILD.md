# To generate combined JS

```
tsc libjass.ts --out libjass.js --sourcemap --noImplicitAny --target ES5
```

# Minified file

1. Generate libjass.js as above and minify.

1. Prepend the license notice to the minified file from any one of the JS files.

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
