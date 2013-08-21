libjass is a JavaScript library written in TypeScript to render ASS subs on HTML5 video in the browser.


### What's special about libjass?

* libjass requires no tweaks to the ASS file from the original video.

* It's easy to deploy. There is no server-side support required. A static hosting is all that's needed.

* One way to render subtitles on an HTML5 video is to draw them on an HTML5 &lt;canvas&gt;. However, libjass uses the browser's native CSS engine by converting the components of each line in the ASS script into a series of styled &lt'div&gt' and &lt;span&gt; elements. This allows all the layout and rendering to be handled by the browser instead of requiring complex and costly drawing and animation code. For example, libjass uses CSS3 animations to simulate some tags such as \fad. While a canvas-drawing library would have to render such a subtitle on the canvas for every frame of the video, libjass only renders it once and lets the browser render the fade effect.

As a result, libjass is able to render subtitles with very low CPU usage. The downside to libjass's aproach is that it is hard (and potentially impossible) to map all effects possible in ASS (using \t, ASS draw) etc. into DOM elements.


### What are all these files?

* The .ts files are the source of libjass. They are TypeScript files and must be compiled into JavaScript for the browser using the TypeScript compiler. Instructions are in BUILD.md
* The two peg.js files are the source of [PEG.js](http://pegjs.majda.cz/). This is the parser generator library used to build a parser for the ASS format.
* ass.pegjs is the source of that parser.
* The rest of the files - index.xhtml, index.js, index.css, fonts.css are a sample implementation of how to use libjass. These files are not needed to use libjass on your website. They only exist as an example of the libjass API, placement of &lt;div&gt; elements to render the subs, etc.


### I want to use libjass for my website. What do I need to do?

1. You need to build libjass.js using the instructions in BUILD.md
1. You need to load libjass.js on the page with your video.
1. You need to call the libjass API.


### Where's the API documentation? What API do I need to call to use libjass?

Formal documentation is coming soon. In the meantime, here's an overview:

* The constructor ASS() takes in the raw ASS string and returns a process object representing the script information, the line styles and dialogue lines in it. The example index.js uses XHR to get this data using a URL specified as a data attribute on the video tag.

* ASS.dialogues is an array of Dialogue objects, each corresponding to a dialogue in the ASS file. These objects have a draw() method that returns a &lt;div&gt; containing the rendered subtitle line.

* index.js uses information from the ASS object to build up a series of div elements around the video tag. There is a wrapper (#subs) containing div's corresponding to the 9 alignment directions, 9 for each distinct layer in the ASS script. index.css contains styles for these div's to render them at the correct location.

* It then listens for the video element's "timeupdate" event. In the event handler, it determines the set of dialogues to be shown, calls draw() on each of them, and appendChild's the result into the appropriate layer+alignment div.

* index.js also contains code to change the size of the video based on user input, including clicking the browser-native fullscreen-video button, and the API that should be called to tell the Dialogue objects to start drawing to the new size - ASS.scaleTo()

* Lastly, index.js contains an implementation of preloading all the fonts used in the ASS file. It matches the font names extracted from the script with URLs defined in fonts.css and XHR's the fonts.

* The constructor ASS() also takes in a parser object. This is created using PEG.js to parse the ass.pegjs file. While index.js uses the browser version of this library (the two peg.js files) to create the parser dynamically in the browser, it is also possible to use the PEG.js API server-side to create the parser as a JS file. You can then serve the pre-generated parser along with libjass.js and the rest of your site's JavaScript. Instructions for generating the parser outside the browser (using node.js) are on the PEG.js website linked above.


### Can I contribute?

Yes! Feature requests, suggestions, bug reports and pull requests are welcome!

You can also hop by the IRC channel below and ask any questions.


## Links

* [Website](https://github.com/Arnavion/libjass/)
* IRC channel - #libjass on irc.rizon.net
* [Aegisub's documentation on ASS](http://docs.aegisub.org/3.0/ASS_Tags/)


## Supported features
* Styles: Italic, Bold, Underline, StrikeOut, FontName, FontSize, ScaleX, ScaleY, Spacing, PrimaryColor, OutlineColor, Outline, Alignment, MarginL, MarginR, MarginV
* Tags: \i, \b, \u, \s, \bord, \xbord, \ybord, \blur, \fn, \fs, \fscx, \fscy, \fsp, \frx, \fry, \frz, \fax, \fay, \c, \1c, \3c, \alpha, \1a, \3a, \an, \r, \pos, \fad
* Custom fonts, using CSS web fonts.


## Known bugs
* \an4, \an5, \an6 aren't positioned correctly.
* Unsupported tags: Everything else, notably \t.
* Font sizes aren't pixel perfect.
* \blur uses an approximation instead of Gaussian blur.
* ASS draw is unsupported.


## Planned improvements
* Document browser compatibility.
* Comment all the things.
* Write more parser tests. Also figure out a way to test layout.
* Evaluate the benefits of DOM-based drawing over canvas.


# License

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
