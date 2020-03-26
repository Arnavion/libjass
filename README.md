This project is no longer being worked on.

You should probably use something else, like https://github.com/Dador/JavascriptSubtitlesOctopus

When I started libjass in 2011, I made a bet that offloading rendering to the DOM would eventually be the way to get fast and accurate rendering. CSS filter effects were about to be standardized. Regular JavaScript would've been too slow to do the fancy rendering that ASS requires. Surely letting the browser render text would be faster than parsing fonts in JS, computing the dimensions and margins for every rendered character, and blitting individual outline and shadow pixels to a canvas.

However CSS filter effects by themselves turned out to be inadequate to accurately render even the basics of ASS. SVG filters are more accurate, but are unoptimized or unsupported in all browsers since nobody really uses them (a vicious cycle). As such, both of them are unable to efficiently render the simplest and most common ASS feature - the elliptical border. The `feMorphology` SVG filter can only dilate to rectangles, so libjass has to stack many such rectangles of different sizes to approximate an ellipse. Big borders end up needing tens of such rectangles and a large gaussian blur, which brings even the mightiest browser's renderer to its single-threaded knees.

Layout also has problems. CSS doesn't provide an easy to way for a subtitle to push another subtitle away so that they don't overlap. It doesn't provide a line-breaking strategy that tries to equalize the lengths of the broken lines (what ASS calls smart line wrapping). Vertically centering things is still a nightmare - flexbox and CSS grid don't help because subtitles don't follow grids - so `\an4-6` were never properly implemented. These things *could* be solved by positioning the text manually, but this would've brought us back to the problem of parsing fonts and measuring text dimensions in JavaScript instead of letting the DOM handle it.

In 2013, asm.js became a way to use the original C renderers like libass, compiled to something that's not as fast as native C but still faster than regular JavaScript rendering. More recently, WASM has emerged as a more cross-platform and strongly-guaranteed way of doing this. Parsing fonts and computing dimensions is now a feasible prospect.

Because of this, I believe libjass's strategy of relying on the browser DOM is a dead end.

I'm happy to continue providing support and answering questions about the code on Github. The code itself is still available under APL-2.0. The ASS parser is functional regardless of the browser renderer. Feel free to fork this project, or incorporate its code into your own projects, under the terms of the license.

Thank you, the users who used libjass on your websites, opened issues, and contributed fixes. libjass was my first OSS project that I intended to be used by more people than me. I had fun working on it and learning about web dev.

----

libjass is a JavaScript library written in TypeScript to render ASS subs in the browser. [Check out the demo.](https://arnavion.github.io/libjass/demo/index.xhtml)


### What's special about libjass?

* libjass requires no tweaks to the ASS file from the original video.

* libjass uses the browser's native CSS engine by converting the components of each line in the ASS script into a series of styled &lt;div&gt; and &lt;span&gt; elements. This allows all the layout and rendering to be handled by the browser instead of requiring complex and costly drawing and animation code. For example, libjass uses CSS3 animations to simulate tags such as \fad. While a canvas-drawing library would have to re-draw such a subtitle on the canvas for every frame of the video, libjass only renders it once and lets the browser render the fade effect.

As a result, libjass is able to render subtitles with very low CPU usage. The downside to libjass's aproach is that it is hard (and potentially impossible) to map all effects possible in ASS (using \t, ASS draw) etc. into DOM elements. As of now, the subset of tags supported by libjass has no such problems.


### I want to use libjass for my website. What do I need to do?

You can install the latest release of libjass

* using npm with `npm install libjass` and load with `var libjass = require("libjass");`
* using bower with `bower install https://github.com/Arnavion/libjass/releases/download/<release name>/libjass.zip`
* using jspm with `jspm install github:Arnavion/libjass` and load with `import libjass from "Arnavion/libjass";`

Inside the package, you will find libjass.js and libjass.css, which you need to load on your website with your video.

Alternatively, you can build libjass from source by cloning this repository and running `npm install`. This will install the dependencies and run the build. libjass.js and libjass.css will be found in the lib/ directory.

Only libjass.js and libjass.css are needed to use libjass on your website. The other files are only used during the build process and you don't need to deploy them to your website.


### What are all these files?

* The src/ directory contains the source of libjass. They are TypeScript files and get compiled into JavaScript for the browser using the TypeScript compiler.

* build.js is the build script. The build command will use this script to build libjass.js. The build/ directory contains other files used for the build.

* The tests/ directory contains unit and functional tests.

* The lib/ directory contains libjass.js and libjass.css. You will need to deploy these to your website.


### How do I use libjass?

The API documentation is linked in the Links section below. Here's an overview:

* The [ASS.fromUrl()](https://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromUrl) function takes in a URL to an ASS script and returns a promise that resolves to an [ASS](https://arnavion.github.io/libjass/api.xhtml#libjass.ASS) object. This ASS object represents the script properties, the line styles and dialogue lines in it. Alternatively, you can use [ASS.fromString()](https://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromString) to convert a string of the script contents into an ASS object.

* Next, you initialize a renderer to render the subtitles. libjass ships with an easy-to-use renderer, the [DefaultRenderer](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.DefaultRenderer). It uses information from the ASS object to build up a series of div elements around the video tag. There is a wrapper (.libjass-subs) containing div's corresponding to the layers in the ASS script, and each layer has div's corresponding to the 9 alignment directions. libjass.css contains styles for these div's to render them at the correct location.

* The renderer uses [window.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame) as a source of timer ticks. In each tick, it determines the set of dialogues to be shown at the current video time, renders each of them as a div, and appendChild's the div into the appropriate layer+alignment div.

* The renderer can be told to dynamically change the size of the subtitles based on user input by calling [WebRenderer.resize()](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.WebRenderer.resize)

* Lastly, the renderer contains an implementation of preloading fonts before playing the video. It uses a map of font names to URLs - this map can be conveniently created from a CSS file containing @font-face rules using [RendererSettings.makeFontMapFromStyleElement()](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.RendererSettings.makeFontMapFromStyleElement)

* For an example of using libjass, check out [the demo.](https://arnavion.github.io/libjass/demo/index.xhtml) It has comments explaining basic usage and pointers to some advanced usage.


### What browser and JavaScript features does libjass need?

* libjass uses some ES5 features like getters and setters (via Object.defineProperty), and assumptions like the behavior of parseInt with leading zeros. It cannot be used with an ES3 environment.

* libjass will use ES6 Set, Map and Promise if they're available on the global object. If they're not present, it will use its own minimal internal implementations. If you have implementations of these that you would like libjass to use but don't want to register them on the global object, you can provide them to libjass specifically by setting the [libjass.Set](https://arnavion.github.io/libjass/api.xhtml#libjass.Set), [libjass.Map](https://arnavion.github.io/libjass/api.xhtml#libjass.Map) and [libjass.Promise](https://arnavion.github.io/libjass/api.xhtml#libjass.Promise) properties.

* [AutoClock](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.AutoClock) and [VideoClock](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.VideoClock) use [window.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) to generate clock ticks.

* [WebRenderer](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.WebRenderer) and [DefaultRenderer](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.DefaultRenderer) use [SVG filter effects for HTML](https://caniuse.com/#feat=svg-html) to render outlines and blur. This feature is not available on all browsers, so you can tell them to fall back to more widely available CSS methods by setting the [RendererSettings.enableSvg](https://arnavion.github.io/libjass/api.xhtml#libjass.renderers.RendererSettings.enableSvg) property to false.

* WebRenderer and DefaultRenderer use [CSS3 animations](https://caniuse.com/#feat=css-animation) for effects like \mov and \fad.

* Using fonts attached to the script requires [ES6 typed arrays](https://caniuse.com/#feat=typedarrays) (ArrayBuffer, DataView, Uint8Array, etc).


### Can I use libjass in node?

libjass's parser works in node. Entire scripts can be parsed via [ASS.fromString()](https://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromString)

```javascript
> var libjass = require("libjass")
undefined
> var ass; libjass.ASS.fromString(fs.readFileSync("mysubs.ass", "utf8")).then(function (result) { ass = result; })
{}
> ass.properties.resolutionX
1280
> ass.dialogues.length
9
> ass.dialogues[0].toString()
'#0 [646.460-652.130] {\\fad(200,0)}Sapien rhoncus, suscipit posuere in nunc pellentesque'
> var parts = ass.dialogues[0].parts
undefined
> parts.length
2
> parts[0] instanceof libjass.parts.Fade
true
> parts[0].toString()
'Fade { start: 0.2, end: 0 }'
```

[libjass.parser.parse](https://arnavion.github.io/libjass/api.xhtml#libjass.parser.parse) parses the first parameter using the second parameter as the rule name. For example, the [dialogueParts](https://arnavion.github.io/libjass/api.xhtml#./parser/parse.ParserRun.parse_dialogueParts) rule can be used to get an array of [libjass.parts](https://arnavion.github.io/libjass/api.xhtml#libjass.parts) objects that represent the parts of an ASS dialogue line.

```javascript
> var parts = libjass.parser.parse("{\\an8}Are {\\i1}you{\\i0} the one who stole the clock?!", "dialogueParts")
undefined
> parts.join(" ")
'Alignment { value: 8 } Text { value: Are  } Italic { value: true } Text { value: you } Italic { value: false } Text { value:  the one who stole the clock?! }'
> parts.length
6
> parts[0].toString()
'Alignment { value: 8 }'
> parts[0] instanceof libjass.parts.Alignment
true
> parts[0].value
8
```

The rule names are derived from the methods on the [ParserRun class](https://arnavion.github.io/libjass/api.xhtml#./parser/parse.ParserRun).

See the tests, particularly the ones in tests/unit/miscellaneous.js, for examples.


### Supported features

* Styles: Italic, Bold, Underline, StrikeOut, FontName, FontSize, ScaleX, ScaleY, Spacing, PrimaryColor, OutlineColor, BackColor, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
* Tags: \i, \b, \u, \s, \bord, \xbord, \ybord, \shad, \xshad, \yshad, \be, \blur, \fn, \fs, \fscx, \fscy, \fsp, \frx, \fry, \frz, \fr, \fax, \fay, \c, \1c, \3c, \4c, \alpha, \1a, \3a, \4a, \an, \a, \k, \q, \r, \pos, \move, \fad, \fade, \t (experimental), \p
* Custom fonts, using CSS web fonts.


### Known issues

* Unsupported tags: \fe, \2c, \2a, \K, \kf, \ko, \org, \clip, \iclip
* \an4, \an5, \an6 aren't positioned correctly.
* Smart line wrapping is not supported. Such lines are rendered as [wrapping style 1 (end-of-line wrapping).](http://docs.aegisub.org/3.0/ASS_Tags/#wrapstyle)
* Lines with multiple rotations aren't rotated the same as VSFilter or libass. See [#14](https://github.com/Arnavion/libjass/issues/14)
- Desktop renderers include borders when calculating space between adjacent lines. libjass doesn't.


### Links

* [GitHub](https://github.com/Arnavion/libjass/)
* [API documentation](https://arnavion.github.io/libjass/api.xhtml)
* [Aegisub's documentation on ASS](http://docs.aegisub.org/3.0/ASS_Tags/)


### License

```
libjass

https://github.com/Arnavion/libjass

Copyright 2013 Arnav Singh

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
