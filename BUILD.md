1. Install node.js from http://nodejs.org/ or via your package manager

1. Change to the directory where you cloned this repository.

1. Run the following command

        npm install

    This will install the dependencies - [Jake](https://github.com/mde/jake), [PEG.js](http://pegjs.majda.cz/), [TypeScript](http://www.typescriptlang.org/) and [UglifyJS2](https://github.com/mishoo/UglifyJS2). It will then run Jake to build libjass.js and use UglifyJS2 to minify it into libjass.min.js

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
