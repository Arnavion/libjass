# Minified file

To minify using [Closure Compiler](http://closure-compiler.appspot.com/):

1. Create the script to be minified.
```
files=(iterators.js utility.js dialogue.js parser.js)
rm libjass.js; for file in $files; do grep -Ev '^"use strict";$' $file >> libjass.js; done
```

1. Use these options.
```
// ==ClosureCompiler==
// @output_file_name libjass.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// @js_externs function PEG() {};
// @js_externs /** @type {function(string): {parse: function(string, string=): !*}} */ PEG.buildParser;
// @js_externs /** @type {string} */ CSSStyleDeclaration.prototype.animationDuration;
// @js_externs /** @type {!{next: function(): *}} */ window.Iterator;
// @js_externs /** @type {function(string)} */ window.Set.prototype.add;
// @js_externs /** @type {function(string): boolean} */ window.Set.prototype.has;
// @js_externs /** @type {function(): !{next: function(): *}} */ window.Set.prototype.iterator;
// @js_externs /** @type {function(function())} */ window.Set.prototype.forEach;
// @js_externs /** @type {function(): !{next: function(): *}} */ Object.prototype.__iterator__;
// ==/ClosureCompiler==
```

1. Save the minified file and prepend the license notice from any one of the JS files.

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
