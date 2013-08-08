libjass is a JavaScript library written in TypeScript to render ASS subs on HTML5 video in the browser.

# Unique features
* Requires no tweaks to the ASS from the original video.
* Easy to deploy. A static hosting is all that's needed.
* Uses DOM elements and CSS3 transforms for rendering and effects, instead of drawing on an HTML5 canvas. This allows all the layout and rendering to be handled by the browser instead of requiring complex drawing and animation code. This will especially be useful when \t gets support.

# Supported features
* Styles: Italic, Bold, Underline, StrikeOut, OutlineWidth, FontName, FontSize, PrimaryColor, Outline, OutlineColor, Alignment, MarginL, MarginR, MarginV
* Tags: \i, \b, \u, \s, \bord, \blur, \fn, \fs, \frx, \fry, \frz, \fax, \fay, \c, \1c, \3c, \an, \pos, \fad
* Custom fonts, using CSS web fonts. Fonts are also preloaded before the video plays.

# Known bugs (status)
* \an4, \an5, \an6 aren't positioned correctly. (In progress)
* Unsupported tags: \t, everything else. (In progress)
* Font sizes aren't pixel perfect. (In progress)
* \blur uses an approximation instead of Gaussian blur.
* ASS draw is unsupported.

# Planned improvements (status)
* Cache parsed subtitles OR make subtitle rendering multi-threaded.
* Document browser compatibility.
* Comment all the things.
* Write tests. Seriously, there's only so many times I can watch the first 2 minutes of Guilty Crown ep 1. At least Euterpe is a good song. (In progress)
* Evaluate the benefits of DOM-based drawing over canvas.
* <del>Change dialogue parser implementation from regexes to an automatic parser like Antlr. This will make supporting \t possible. Alternatively, port libass's parse_tag to Javascript.</del> (Completed)
* <del>Only preload fonts actually used in the subs.</del> (Completed)

# Links
* [Aegisub's documentation on ASS](http://docs.aegisub.org/3.0/ASS_Tags/)

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
