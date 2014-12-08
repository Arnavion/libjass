[![Build Status](https://travis-ci.org/Arnavion/libjass.png?branch=master)](https://travis-ci.org/Arnavion/libjass)

libjass is a JavaScript library written in TypeScript to render ASS subs on HTML5 video in the browser. [Check out the demo.](http://arnavion.github.io/libjass/demo/index.xhtml)


### What's special about libjass?

* libjass requires no tweaks to the ASS file from the original video.

* It's easy to deploy. There is no server-side support required. A static hosting is all that's needed.

* libjass uses the browser's native CSS engine by converting the components of each line in the ASS script into a series of styled &lt;div&gt; and &lt;span&gt; elements. This allows all the layout and rendering to be handled by the browser instead of requiring complex and costly drawing and animation code. For example, libjass uses CSS3 animations to simulate tags such as \fad. While a canvas-drawing library would have to re-draw such a subtitle on the canvas for every frame of the video, libjass only renders it once and lets the browser render the fade effect.

As a result, libjass is able to render subtitles with very low CPU usage. The downside to libjass's aproach is that it is hard (and potentially impossible) to map all effects possible in ASS (using \t, ASS draw) etc. into DOM elements. As of now, the subset of tags supported by libjass has no such problems.


### What are all these files?

* The .ts files are the source of libjass. They are TypeScript files and must be compiled into JavaScript for the browser using the TypeScript compiler.

* gulpfile.js is the build script. The build command will use this script to build libjass.js

* libjass.css is a CSS file that you'll need to deploy to your website.


### I want to use libjass for my website. What do I need to do?

1. You need to build libjass.js using the instructions in BUILD.md
1. You need to load libjass.js and libjass.css on the page with your video.
1. You need to call the libjass API.

Only libjass.js and libjass.css are needed to use libjass on your website. The other files are only used during the build process and you don't need to deploy them to your website.


### Where's the API documentation? What API do I need to call to use libjass?

The API documentation is linked in the Links section below. Here's an overview:

* The method [ASS.fromUrl()](http://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromUrl) takes in a URL to an ASS script and returns a promise that resolves to an [ASS](http://arnavion.github.io/libjass/api.xhtml#libjass.ASS) object. This ASS object represents the script properties, the line styles and dialogue lines in it. Alternatively, you can use [ASS.fromString()](http://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromString) to convert a string of the script contents into an ASS object.

* Next, you initialize a renderer to render the subtitles. libjass ships with an easy-to-use renderer, the [DefaultRenderer](http://arnavion.github.io/libjass/api.xhtml#libjass.renderers.DefaultRenderer). It uses information from the ASS object to build up a series of div elements around the video tag. There is a wrapper (.libjass-subs) containing div's corresponding to the layers in the ASS script, and each layer has div's corresponding to the 9 alignment directions. libjass.css contains styles for these div's to render them at the correct location.

* The renderer uses [window.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame) as a source of timer ticks. In each tick, it determines the set of dialogues to be shown at the current video time, renders each of them as a div, and appendChild's the div into the appropriate layer+alignment div.

* The renderer can be told to dynamically change the size of the subtitles based on user input by calling [WebRenderer.resize()](http://arnavion.github.io/libjass/api.xhtml#libjass.renderers.WebRenderer.resize) DefaultRenderer also handles resizing the subtitles automatically when the user clicks the browser's native fullscreen-video button.

* Lastly, the renderer contains an implementation of preloading fonts before playing the video. It uses a map of font names to URLs - this map can be conveniently created from a CSS file containing @font-face rules using [RendererSettings.makeFontMapFromStyleElement()](http://arnavion.github.io/libjass/api.xhtml#libjass.renderers.RendererSettings.makeFontMapFromStyleElement)

* For an example of using libjass, check out [the demo.](http://arnavion.github.io/libjass/demo/index.xhtml)


### Can I use libjass in node?

libjass's parser works in node.

```javascript
> var libjass = require("./libjass.js")
undefined
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

[libjass.parser.parse](http://arnavion.github.io/libjass/api.xhtml#libjass.parser.parse) parses the first parameter using the second parameter as the rule name. The rule names are derived from the methods on the [ParserRun class](http://arnavion.github.io/libjass/api.xhtml#libjass.parser.ParserRun). For example, [dialogueParts](http://arnavion.github.io/libjass/api.xhtml#libjass.parser.ParserRun.parse_dialogueParts) can be used to get an array of [libjass.parts](http://arnavion.github.io/libjass/api.xhtml#libjass.parts) objects that represent the parts of an ASS dialogue line.

Entire scripts can be parsed via [ASS.fromString()](http://arnavion.github.io/libjass/api.xhtml#libjass.ASS.fromString)


### Can I contribute?

Yes! Feature requests, suggestions, bug reports and pull requests are welcome! I'm especially looking for details and edge-cases of the ASS syntax that libjass doesn't support.

You can also join the IRC channel below and ask any questions.


### Links

* [GitHub](https://github.com/Arnavion/libjass/)
* IRC channel - #libjass on irc.rizon.net
* [API documentation](http://arnavion.github.io/libjass/api.xhtml)
* [Aegisub's documentation on ASS](http://docs.aegisub.org/3.0/ASS_Tags/)


### Supported features

* Styles: Italic, Bold, Underline, StrikeOut, FontName, FontSize, ScaleX, ScaleY, Spacing, PrimaryColor, OutlineColor, BackColor, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
* Tags: \i, \b, \u, \s, \bord, \xbord, \ybord, \shad, \xshad, \yshad, \be, \blur, \fn, \fs, \fscx, \fscy, \fsp, \frx, \fry, \frz, \fr, \fax, \fay, \c, \1c, \3c, \4c, \alpha, \1a, \3a, \4a, \an, \a, \r, \pos, \move, \fad, \fade, \p
* Custom fonts, using CSS web fonts.


### Known issues

* Unsupported tags: \fe, \2c, \2a, \k, \K, \kf, \ko, \q, \org, \t, \clip, \iclip
* \an4, \an5, \an6 aren't positioned correctly.
* All lines are rendered as [wrapping style 1 (end-of-line wrapping)](http://docs.aegisub.org/3.0/ASS_Tags/#wrapstyle)
* Lines with multiple rotations aren't rotated the same as VSFilter or libass. See [#14](https://github.com/Arnavion/libjass/issues/14)


### Planned improvements

* Figure out a way to test layout. See [#21](https://github.com/Arnavion/libjass/issues/21)
* Evaluate (document, benchmark) the benefits and drawbacks of DOM+CSS-based drawing over canvas.
* Add more explanatory comments to the code.


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
