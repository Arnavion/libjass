### v0.8.0 - 2014/08/16
- Added web worker support. libjass.parse can now be offloaded to a web worker.
- Implemented \fs+ and \fs-
- Added ASS.addEvent() to add dialogue lines to an ASS object.
- Renamed ClockEvent.TimeUpdate to ClockEvent.Tick, and added ClockEvent.Stop
- Clock.enable() and .disable() now return a boolean to indicate whether the function had any effect.
- Added Clock.setEnabled() to force the enabled-state to the given value.
- Renamed ManualClock.timeUpdate() to ManualClock.tick()
- Moved WebRenderer.enable(), .disable() and .enabled to NullRenderer
- Fixed not being able to parse tags with default values.
- Fixed font preloader downloading the same font multiple times because it didn't filter for duplicates.
- Fixed min-width value not taking separate left and right margins into account.
- Fixed absolutely positioned subs were always left-aligned even if they had an alignment tag.
- Fixed blur and outlines getting truncated.


### v0.7.0 - 2014/05/15
- Implemented \be
- Split a new renderer, WebRenderer, off DefaultRenderer that doesn't rely on a video element.
- All renderers now require a Clock to generate time events. VideoClock is a Clock backed by a video element, while ManualClock is a clock that can be used to generate arbitrary time events.


### v0.6.0 - 2014/03/24
- All script properties and style properties are now parsed and stored in the ASS and Style objects.
- Basic SRT support, by passing in a libjass.Format argument to ASS.fromString()
- \clip and \iclip now have their drawing instructions parsed as an array of libjass.parts.drawing.Instruction's instead of just a string.
- Added DefaultRenderer.enable(), DefaultRenderer.disable() and DefaultRenderer.toggle() to change whether the renderer is displaying subtitles or not.
- DefaultRenderer.resizeVideo is now called DefaultRenderer.resize. Now it only resizes the subtitle wrapper div, not the video element.
- Replaced the 41ms setInterval-bsed timer with a requestAnimationFrame-based timer to reduce load on minimized or hidden browser tabs.
- DefaultRenderer now renders dialogues in the correct order according to the script.
- Fixed incorrect font sizes.
- Replaced jake with gulp.


### v0.5.0 - 2014/01/26
- Removed preLoadFonts renderer setting. It was redundant with the actual fontMap setting since the presence or absence of that setting is enough to signal whether the user wants to preload fonts or not.
- Multiple renderers can now be used on the same page without conflicting with each other.
- Implemented \shad, \xshad, \yshad
- Fixed ASS draw scale being used incorrectly.
- ASS.resolutionX and ASS.resolutionY are now properties of ASS.properties, a ScriptProperties object.


### v0.4.0 - 2013/12/27
- All parts moved from the libjass.tags namespace to the libjass.parts namespace.
- Replaced PEG.js parser with a hand-written one. This allows for parsing lines that are strictly invalid grammar but are parsed successfully by VSFilter or libass.
- All ASS tags are now supported by the parser.
- Removed the useHighResolutionTimer setting for DefaultRenderer. DefaultRenderer always uses the 41ms timer now.
- Implemented \move
- Implemented ASS draw
- Fixed subs overflowing the video dimensions still being visible.
- SVG filters are now used for outlines and blur.
- Delay parsing of dialogue lines till they need to be pre-rendered. As a side-effect, all fonts in the font map are preloaded now, not just the ones used in the current script.


### v0.3.0 - 2013/10/28
- Moved libjass.DefaultRenderer to libjass.renderers.DefaultRenderer
- Added libjass.renderers.NullRenderer, a renderer that doesn't render anything.
- DefaultRenderer's fontMap setting is now a Map instead of an Object. It now supports more than one URL for each font name.
- DefaultRenderer now generates the subtitle wrapper div itself.
- DefaultRenderer now takes video letterboxing into account when resizing the subtitles.
- DefaultRenderer has a new setting useHighResolutionTimer that makes it use a 41ms timer instead of video.timeUpdate's 250ms timer.
- div IDs and CSS class names are now prefixed with "libjass-" to avoid collisions with other elements on the page.
- All numeric CSS property values are now truncated to three decimal places.
- Added ```jake watch``` that rebuilds and runs tests on changes to the source.
- Added ```jake doc``` that builds API documentation.
- Added Travis CI build.


### v0.2.0 - 2013/09/11
- Added libjass.DefaultRenderer, a class that handles initializing the layer div's, preloading fonts, and drawing Dialogues based on the current video time.
- libjass.js can now be loaded in node. Only the parser can be used.
- Tests can now be run with ```jake test``` or ```npm test``` using Mocha.

### v0.1.0 - 2013/08/29
- First npm release.
