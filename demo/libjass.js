/**
 * libjass
 *
 * https://github.com/Arnavion/libjass
 *
 * Copyright 2013 Arnav Singh
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function (root, factory) {
    var global = this;
    if (typeof exports === "object" && typeof module === "object") {
        module.exports = factory(global);
    } else if (typeof define === "function" && define.amd) {
        define(function () {
            return factory(global);
        });
    } else if (typeof exports === "object") {
        exports["libjass"] = factory(global);
    } else {
        root["libjass"] = factory(global);
    }
})(this, function (global) {
    "use strict";
    return function (modules) {
        var installedModules = Object.create(null);
        function require(moduleId) {
            if (installedModules[moduleId]) {
                return installedModules[moduleId].exports;
            }
            var module = installedModules[moduleId] = {
                exports: Object.create(null),
                id: moduleId,
                loaded: false
            };
            modules[moduleId](module.exports, require);
            module.loaded = true;
            return module.exports;
        }
        return require(0);
    }([ /* 0 ./index */ function (exports, require) {
        var settings = require(22);
        var settings_1 = require(22);
        exports.debugMode = settings_1.debugMode;
        exports.verboseMode = settings_1.verboseMode;
        var set = require(32);
        var set_1 = require(32);
        exports.Set = set_1.Set;
        var map = require(29);
        var map_1 = require(29);
        exports.Map = map_1.Map;
        var promise = require(31);
        var promise_1 = require(31);
        exports.Promise = promise_1.Promise;
        exports.DeferredPromise = promise_1.DeferredPromise;
        var webworker = require(35);
        exports.webworker = webworker;
        var parts = require(7);
        exports.parts = parts;
        var parser = require(1);
        exports.parser = parser;
        var renderers = require(13);
        exports.renderers = renderers;
        var ass_1 = require(23);
        exports.ASS = ass_1.ASS;
        var dialogue_1 = require(24);
        exports.Dialogue = dialogue_1.Dialogue;
        var script_properties_1 = require(26);
        exports.ScriptProperties = script_properties_1.ScriptProperties;
        var style_1 = require(27);
        exports.Style = style_1.Style;
        var misc_1 = require(25);
        exports.BorderStyle = misc_1.BorderStyle;
        exports.Format = misc_1.Format;
        exports.WrappingStyle = misc_1.WrappingStyle;
        Object.defineProperties(exports, {
            debugMode: {
                get: function () {
                    return settings.debugMode;
                },
                set: settings.setDebugMode
            },
            verboseMode: {
                get: function () {
                    return settings.verboseMode;
                },
                set: settings.setVerboseMode
            },
            Set: {
                get: function () {
                    return set.Set;
                },
                set: set.setImplementation
            },
            Map: {
                get: function () {
                    return map.Map;
                },
                set: map.setImplementation
            },
            Promise: {
                get: function () {
                    return promise.Promise;
                },
                set: promise.setImplementation
            }
        });
    }, /* 1 ./parser/index */ function (exports, require) {
        var parse_1 = require(3);
        exports.parse = parse_1.parse;
        var streams_1 = require(5);
        exports.BrowserReadableStream = streams_1.BrowserReadableStream;
        exports.StringStream = streams_1.StringStream;
        exports.XhrStream = streams_1.XhrStream;
        var stream_parsers_1 = require(4);
        exports.StreamParser = stream_parsers_1.StreamParser;
        exports.SrtStreamParser = stream_parsers_1.SrtStreamParser;
    }, /* 2 ./parser/misc */ function (exports, require) {
        var map_1 = require(29);
        /**
         * Parses a line into a {@link ./types/misc.Property}.
         *
         * @param {string} line
         * @return {!Property}
         */
        function parseLineIntoProperty(line) {
            var colonPos = line.indexOf(":");
            if (colonPos === -1) {
                return null;
            }
            var name = line.substr(0, colonPos);
            var value = line.substr(colonPos + 1).replace(/^\s+/, "");
            return {
                name: name,
                value: value
            };
        }
        exports.parseLineIntoProperty = parseLineIntoProperty;
        /**
         * Parses a line into a {@link ./types/misc.TypedTemplate} according to the given format specifier.
         *
         * @param {string} line
         * @param {!Array.<string>} formatSpecifier
         * @return {!TypedTemplate}
         */
        function parseLineIntoTypedTemplate(line, formatSpecifier) {
            var property = parseLineIntoProperty(line);
            if (property === null) {
                return null;
            }
            var value = property.value.split(",");
            if (value.length > formatSpecifier.length) {
                value[formatSpecifier.length - 1] = value.slice(formatSpecifier.length - 1).join(",");
            }
            var template = new map_1.Map();
            formatSpecifier.forEach(function (formatKey, index) {
                template.set(formatKey, value[index]);
            });
            return {
                type: property.name,
                template: template
            };
        }
        exports.parseLineIntoTypedTemplate = parseLineIntoTypedTemplate;
    }, /* 3 ./parser/parse */ function (exports, require) {
        var parts = require(7);
        var settings_1 = require(22);
        var map_1 = require(29);
        /**
         * Parses a given string with the specified rule.
         *
         * @param {string} input The string to be parsed.
         * @param {string} rule The rule to parse the string with
         * @return {*} The value returned depends on the rule used.
         *
         * @memberOf libjass.parser
         */
        function parse(input, rule) {
            var run = new ParserRun(input, rule);
            if (run.result === null || run.result.end !== input.length) {
                if (settings_1.debugMode) {
                    console.error("Parse failed. %s %s %o", rule, input, run.result);
                }
                throw new Error("Parse failed.");
            }
            return run.result.value;
        }
        exports.parse = parse;
        /**
         * This class represents a single run of the parser.
         *
         * @param {string} input
         * @param {string} rule
         *
         * @constructor
         * @private
         */
        var ParserRun = function () {
            function ParserRun(input, rule) {
                this._input = input;
                this._parseTree = new ParseNode(null);
                this._result = rules.get(rule).call(this, this._parseTree);
            }
            Object.defineProperty(ParserRun.prototype, "result", {
                /**
                 * @type {ParseNode}
                 */
                get: function () {
                    return this._result;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_dialogueParts = function (parent) {
                var current = new ParseNode(parent);
                current.value = [];
                while (this._haveMore()) {
                    var enclosedTagsNode = this.parse_enclosedTags(current);
                    if (enclosedTagsNode !== null) {
                        current.value.push.apply(current.value, enclosedTagsNode.value);
                    } else {
                        var whiteSpaceOrTextNode = this.parse_newline(current) || this.parse_hardspace(current) || this.parse_text(current);
                        if (whiteSpaceOrTextNode === null) {
                            parent.pop();
                            return null;
                        }
                        if (whiteSpaceOrTextNode.value instanceof parts.Text && current.value[current.value.length - 1] instanceof parts.Text) {
                            // Merge consecutive text parts into one part
                            var previousTextPart = current.value[current.value.length - 1];
                            current.value[current.value.length - 1] = new parts.Text(previousTextPart.value + whiteSpaceOrTextNode.value.value);
                        } else {
                            current.value.push(whiteSpaceOrTextNode.value);
                        }
                    }
                }
                var inDrawingMode = false;
                current.value.forEach(function (part, i) {
                    if (part instanceof parts.DrawingMode) {
                        inDrawingMode = part.scale !== 0;
                    } else if (part instanceof parts.Text && inDrawingMode) {
                        current.value[i] = new parts.DrawingInstructions(parse(part.value, "drawingInstructions"));
                    }
                });
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_enclosedTags = function (parent) {
                var current = new ParseNode(parent);
                current.value = [];
                if (this.read(current, "{") === null) {
                    parent.pop();
                    return null;
                }
                for (var next = this._peek(); this._haveMore() && next !== "}"; next = this._peek()) {
                    var childNode = null;
                    if (this.read(current, "\\") !== null) {
                        childNode = this.parse_tag_alpha(current) || this.parse_tag_iclip(current) || this.parse_tag_xbord(current) || this.parse_tag_ybord(current) || this.parse_tag_xshad(current) || this.parse_tag_yshad(current) || this.parse_tag_blur(current) || this.parse_tag_bord(current) || this.parse_tag_clip(current) || this.parse_tag_fade(current) || this.parse_tag_fscx(current) || this.parse_tag_fscy(current) || this.parse_tag_move(current) || this.parse_tag_shad(current) || this.parse_tag_fad(current) || this.parse_tag_fax(current) || this.parse_tag_fay(current) || this.parse_tag_frx(current) || this.parse_tag_fry(current) || this.parse_tag_frz(current) || this.parse_tag_fsp(current) || this.parse_tag_fsplus(current) || this.parse_tag_fsminus(current) || this.parse_tag_org(current) || this.parse_tag_pbo(current) || this.parse_tag_pos(current) || this.parse_tag_an(current) || this.parse_tag_be(current) || this.parse_tag_fn(current) || this.parse_tag_fr(current) || this.parse_tag_fs(current) || this.parse_tag_kf(current) || this.parse_tag_ko(current) || this.parse_tag_1a(current) || this.parse_tag_1c(current) || this.parse_tag_2a(current) || this.parse_tag_2c(current) || this.parse_tag_3a(current) || this.parse_tag_3c(current) || this.parse_tag_4a(current) || this.parse_tag_4c(current) || this.parse_tag_a(current) || this.parse_tag_b(current) || this.parse_tag_c(current) || this.parse_tag_i(current) || this.parse_tag_k(current) || this.parse_tag_K(current) || this.parse_tag_p(current) || this.parse_tag_q(current) || this.parse_tag_r(current) || this.parse_tag_s(current) || this.parse_tag_t(current) || this.parse_tag_u(current);
                        if (childNode === null) {
                            current.pop();
                        }
                    }
                    if (childNode === null) {
                        childNode = this.parse_comment(current);
                    }
                    if (childNode !== null) {
                        if (childNode.value instanceof parts.Comment && current.value[current.value.length - 1] instanceof parts.Comment) {
                            // Merge consecutive comment parts into one part
                            current.value[current.value.length - 1] = new parts.Comment(current.value[current.value.length - 1].value + childNode.value.value);
                        } else {
                            current.value.push(childNode.value);
                        }
                    } else {
                        parent.pop();
                        return null;
                    }
                }
                if (this.read(current, "}") === null) {
                    parent.pop();
                    return null;
                }
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_newline = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "\\N") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.NewLine();
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_hardspace = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "\\h") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.Text(" ");
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_text = function (parent) {
                var value = this._peek();
                var current = new ParseNode(parent);
                var valueNode = new ParseNode(current, value);
                current.value = new parts.Text(valueNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_comment = function (parent) {
                var value = this._peek();
                var current = new ParseNode(parent);
                var valueNode = new ParseNode(current, value);
                current.value = new parts.Comment(valueNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_a = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "a") === null) {
                    parent.pop();
                    return null;
                }
                var next = this._peek();
                switch (next) {
                  case "1":
                    var next2 = this._peek(2);
                    switch (next2) {
                      case "10":
                      case "11":
                        next = next2;
                        break;
                    }
                    break;

                  case "2":
                  case "3":
                  case "5":
                  case "6":
                  case "7":
                  case "9":
                    break;

                  default:
                    parent.pop();
                    return null;
                }
                var valueNode = new ParseNode(current, next);
                var value = null;
                switch (valueNode.value) {
                  case "1":
                    value = 1;
                    break;

                  case "2":
                    value = 2;
                    break;

                  case "3":
                    value = 3;
                    break;

                  case "5":
                    value = 7;
                    break;

                  case "6":
                    value = 8;
                    break;

                  case "7":
                    value = 9;
                    break;

                  case "9":
                    value = 4;
                    break;

                  case "10":
                    value = 5;
                    break;

                  case "11":
                    value = 6;
                    break;
                }
                current.value = new parts.Alignment(value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_alpha = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_an = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "an") === null) {
                    parent.pop();
                    return null;
                }
                var next = this._peek();
                if (next < "1" || next > "9") {
                    parent.pop();
                    return null;
                }
                var valueNode = new ParseNode(current, next);
                current.value = new parts.Alignment(parseInt(valueNode.value));
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_b = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "b") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = null;
                var next = this._peek();
                if (next >= "1" && next <= "9") {
                    next = this._peek(3);
                    if (next.substr(1) === "00") {
                        valueNode = new ParseNode(current, next);
                        valueNode.value = parseInt(valueNode.value);
                    }
                }
                if (valueNode === null) {
                    valueNode = this.parse_enableDisable(current);
                }
                if (valueNode !== null) {
                    current.value = new parts.Bold(valueNode.value);
                } else {
                    current.value = new parts.Bold(null);
                }
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_be = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_blur = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_bord = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_c = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_clip = function (parent) {
                return this._parse_tag_clip_or_iclip("clip", parent);
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fad = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fad") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var startNode = this.parse_decimal(current);
                if (startNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var endNode = this.parse_decimal(current);
                if (endNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.Fade(startNode.value / 1e3, endNode.value / 1e3);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fade = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fade") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var a1Node = this.parse_decimal(current);
                if (a1Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var a2Node = this.parse_decimal(current);
                if (a2Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var a3Node = this.parse_decimal(current);
                if (a3Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var t1Node = this.parse_decimal(current);
                if (t1Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var t2Node = this.parse_decimal(current);
                if (t2Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var t3Node = this.parse_decimal(current);
                if (t3Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var t4Node = this.parse_decimal(current);
                if (t4Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.ComplexFade(1 - a1Node.value / 255, 1 - a2Node.value / 255, 1 - a3Node.value / 255, t1Node.value / 1e3, t2Node.value / 1e3, t3Node.value / 1e3, t4Node.value / 1e3);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fax = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fay = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fn = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fn") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = new ParseNode(current, "");
                for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
                    valueNode.value += next;
                }
                if (valueNode.value.length > 0) {
                    current.value = new parts.FontName(valueNode.value);
                } else {
                    current.value = new parts.FontName(null);
                }
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fr = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_frx = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fry = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_frz = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fs = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fsplus = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fs+") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.FontSizePlus(valueNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fsminus = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fs-") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.FontSizeMinus(valueNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fscx = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fscx") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.FontScaleX(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fscy = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "fscy") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.FontScaleY(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_fsp = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_i = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_iclip = function (parent) {
                return this._parse_tag_clip_or_iclip("iclip", parent);
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_k = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "k") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.ColorKaraoke(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_K = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "K") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.SweepingColorKaraoke(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_kf = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "kf") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.SweepingColorKaraoke(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_ko = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "ko") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = this.parse_decimal(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.OutlineKaraoke(valueNode.value / 100);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_move = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "move") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var x1Node = this.parse_decimal(current);
                if (x1Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var y1Node = this.parse_decimal(current);
                if (y1Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var x2Node = this.parse_decimal(current);
                if (x2Node === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var y2Node = this.parse_decimal(current);
                if (y2Node === null) {
                    parent.pop();
                    return null;
                }
                var t1Node = null;
                var t2Node = null;
                if (this.read(current, ",") !== null) {
                    t1Node = this.parse_decimal(current);
                    if (t1Node === null) {
                        parent.pop();
                        return null;
                    }
                    if (this.read(current, ",") === null) {
                        parent.pop();
                        return null;
                    }
                    t2Node = this.parse_decimal(current);
                    if (t2Node === null) {
                        parent.pop();
                        return null;
                    }
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.Move(x1Node.value, y1Node.value, x2Node.value, y2Node.value, t1Node !== null ? t1Node.value / 1e3 : null, t2Node !== null ? t2Node.value / 1e3 : null);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_org = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "org") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var xNode = this.parse_decimal(current);
                if (xNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var yNode = this.parse_decimal(current);
                if (yNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.RotationOrigin(xNode.value, yNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_p = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_pbo = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_pos = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "pos") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var xNode = this.parse_decimal(current);
                if (xNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ",") === null) {
                    parent.pop();
                    return null;
                }
                var yNode = this.parse_decimal(current);
                if (yNode === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.Position(xNode.value, yNode.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_q = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "q") === null) {
                    parent.pop();
                    return null;
                }
                var next = this._peek();
                if (next < "0" || next > "3") {
                    parent.pop();
                    return null;
                }
                var valueNode = new ParseNode(current, next);
                current.value = new parts.WrappingStyle(parseInt(valueNode.value));
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_r = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "r") === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = new ParseNode(current, "");
                for (var next = this._peek(); this._haveMore() && next !== "\\" && next !== "}"; next = this._peek()) {
                    valueNode.value += next;
                }
                if (valueNode.value.length > 0) {
                    current.value = new parts.Reset(valueNode.value);
                } else {
                    current.value = new parts.Reset(null);
                }
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_s = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_shad = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_t = function (parent) {
                var current = new ParseNode(parent);
                if (this.read(current, "t") === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var startNode = null;
                var endNode = null;
                var accelNode = null;
                var firstNode = this.parse_decimal(current);
                if (firstNode !== null) {
                    if (this.read(current, ",") === null) {
                        parent.pop();
                        return null;
                    }
                    var secondNode = this.parse_decimal(current);
                    if (secondNode !== null) {
                        startNode = firstNode;
                        endNode = secondNode;
                        if (this.read(current, ",") === null) {
                            parent.pop();
                            return null;
                        }
                        var thirdNode = this.parse_decimal(current);
                        if (thirdNode !== null) {
                            accelNode = thirdNode;
                            if (this.read(current, ",") === null) {
                                parent.pop();
                                return null;
                            }
                        }
                    } else {
                        accelNode = firstNode;
                        if (this.read(current, ",") === null) {
                            parent.pop();
                            return null;
                        }
                    }
                }
                var transformTags = [];
                for (var next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
                    var childNode = null;
                    if (this.read(current, "\\") !== null) {
                        childNode = this.parse_tag_alpha(current) || this.parse_tag_iclip(current) || this.parse_tag_xbord(current) || this.parse_tag_ybord(current) || this.parse_tag_xshad(current) || this.parse_tag_yshad(current) || this.parse_tag_blur(current) || this.parse_tag_bord(current) || this.parse_tag_clip(current) || this.parse_tag_fscx(current) || this.parse_tag_fscy(current) || this.parse_tag_shad(current) || this.parse_tag_fax(current) || this.parse_tag_fay(current) || this.parse_tag_frx(current) || this.parse_tag_fry(current) || this.parse_tag_frz(current) || this.parse_tag_fsp(current) || this.parse_tag_fsplus(current) || this.parse_tag_fsminus(current) || this.parse_tag_be(current) || this.parse_tag_fr(current) || this.parse_tag_fs(current) || this.parse_tag_1a(current) || this.parse_tag_1c(current) || this.parse_tag_2a(current) || this.parse_tag_2c(current) || this.parse_tag_3a(current) || this.parse_tag_3c(current) || this.parse_tag_4a(current) || this.parse_tag_4c(current) || this.parse_tag_c(current);
                        if (childNode === null) {
                            current.pop();
                        }
                    }
                    if (childNode === null) {
                        childNode = this.parse_comment(current);
                    }
                    if (childNode !== null) {
                        if (childNode.value instanceof parts.Comment && transformTags[transformTags.length - 1] instanceof parts.Comment) {
                            // Merge consecutive comment parts into one part
                            transformTags[transformTags.length - 1] = new parts.Comment(transformTags[transformTags.length - 1].value + childNode.value.value);
                        } else {
                            transformTags.push(childNode.value);
                        }
                    } else {
                        parent.pop();
                        return null;
                    }
                }
                this.read(current, ")");
                current.value = new parts.Transform(startNode !== null ? startNode.value / 1e3 : null, endNode !== null ? endNode.value / 1e3 : null, accelNode !== null ? accelNode.value / 1e3 : null, transformTags);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_u = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_xbord = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_xshad = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_ybord = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_yshad = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_1a = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_1c = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_2a = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_2c = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_3a = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_3c = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_4a = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_tag_4c = function () {
                throw new Error("Method not implemented.");
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_drawingInstructions = function (parent) {
                var current = new ParseNode(parent);
                var lastType = null;
                current.value = [];
                while (this._haveMore()) {
                    while (this.read(current, " ") !== null) {}
                    if (!this._haveMore()) {
                        break;
                    }
                    var currentType = null;
                    var typePart = this.parse_text(current);
                    if (typePart === null) {
                        parent.pop();
                        return null;
                    }
                    currentType = typePart.value.value;
                    switch (currentType) {
                      case "m":
                      case "l":
                      case "b":
                        lastType = currentType;
                        break;

                      default:
                        if (lastType === null) {
                            parent.pop();
                            return null;
                        }
                        currentType = lastType;
                        current.pop();
                        break;
                    }
                    switch (currentType) {
                      case "m":
                        var movePart = this.parse_drawingInstructionMove(current);
                        if (movePart === null) {
                            parent.pop();
                            return null;
                        }
                        current.value.push(movePart.value);
                        break;

                      case "l":
                        var linePart = this.parse_drawingInstructionLine(current);
                        if (linePart === null) {
                            parent.pop();
                            return null;
                        }
                        current.value.push(linePart.value);
                        break;

                      case "b":
                        var cubicBezierCurvePart = this.parse_drawingInstructionCubicBezierCurve(current);
                        if (cubicBezierCurvePart === null) {
                            parent.pop();
                            return null;
                        }
                        current.value.push(cubicBezierCurvePart.value);
                        break;
                    }
                }
                while (this.read(current, " ") !== null) {}
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_drawingInstructionMove = function (parent) {
                var current = new ParseNode(parent);
                while (this.read(current, " ") !== null) {}
                var xPart = this.parse_decimal(current);
                if (xPart === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var yPart = this.parse_decimal(current);
                if (yPart === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.drawing.MoveInstruction(xPart.value, yPart.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_drawingInstructionLine = function (parent) {
                var current = new ParseNode(parent);
                while (this.read(current, " ") !== null) {}
                var xPart = this.parse_decimal(current);
                if (xPart === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var yPart = this.parse_decimal(current);
                if (yPart === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.drawing.LineInstruction(xPart.value, yPart.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_drawingInstructionCubicBezierCurve = function (parent) {
                var current = new ParseNode(parent);
                while (this.read(current, " ") !== null) {}
                var x1Part = this.parse_decimal(current);
                if (x1Part === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var y1Part = this.parse_decimal(current);
                if (y1Part === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var x2Part = this.parse_decimal(current);
                if (x2Part === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var y2Part = this.parse_decimal(current);
                if (y2Part === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var x3Part = this.parse_decimal(current);
                if (x3Part === null) {
                    parent.pop();
                    return null;
                }
                while (this.read(current, " ") !== null) {}
                var y3Part = this.parse_decimal(current);
                if (y3Part === null) {
                    parent.pop();
                    return null;
                }
                current.value = new parts.drawing.CubicBezierCurveInstruction(x1Part.value, y1Part.value, x2Part.value, y2Part.value, x3Part.value, y3Part.value);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_decimalInt32 = function (parent) {
                var current = new ParseNode(parent);
                var isNegative = this.read(current, "-") !== null;
                var numberNode = new ParseNode(current, "");
                for (var next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
                    numberNode.value += next;
                }
                if (numberNode.value.length === 0) {
                    parent.pop();
                    return null;
                }
                var value = parseInt(numberNode.value);
                if (value >= 4294967295) {
                    value = 4294967295;
                } else if (isNegative) {
                    value = -value;
                }
                current.value = value;
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_hexInt32 = function (parent) {
                var current = new ParseNode(parent);
                var isNegative = this.read(current, "-") !== null;
                var numberNode = new ParseNode(current, "");
                for (var next = this._peek(); this._haveMore() && (next >= "0" && next <= "9" || next >= "a" && next <= "f" || next >= "A" && next <= "F"); next = this._peek()) {
                    numberNode.value += next;
                }
                if (numberNode.value.length === 0) {
                    parent.pop();
                    return null;
                }
                var value = parseInt(numberNode.value, 16);
                if (value >= 4294967295) {
                    value = 4294967295;
                } else if (isNegative) {
                    value = -value;
                }
                current.value = value;
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_decimalOrHexInt32 = function (parent) {
                var current = new ParseNode(parent);
                var valueNode = null;
                if (this.read(current, "&H") !== null || this.read(current, "&h") !== null) {
                    valueNode = this.parse_hexInt32(current);
                } else {
                    valueNode = this.parse_decimalInt32(current);
                }
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                current.value = valueNode.value;
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_decimal = function (parent) {
                var current = new ParseNode(parent);
                var negative = this.read(current, "-") !== null;
                var numericalPart = this.parse_unsignedDecimal(current);
                if (numericalPart === null) {
                    parent.pop();
                    return null;
                }
                current.value = numericalPart.value;
                if (negative) {
                    current.value = -current.value;
                }
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_unsignedDecimal = function (parent) {
                var current = new ParseNode(parent);
                var characteristicNode = new ParseNode(current, "");
                var mantissaNode = null;
                var next;
                for (next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
                    characteristicNode.value += next;
                }
                if (characteristicNode.value.length === 0) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, ".") !== null) {
                    mantissaNode = new ParseNode(current, "");
                    for (next = this._peek(); this._haveMore() && next >= "0" && next <= "9"; next = this._peek()) {
                        mantissaNode.value += next;
                    }
                    if (mantissaNode.value.length === 0) {
                        parent.pop();
                        return null;
                    }
                }
                current.value = parseFloat(characteristicNode.value + (mantissaNode !== null ? "." + mantissaNode.value : ""));
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_enableDisable = function (parent) {
                var next = this._peek();
                if (next === "0" || next === "1") {
                    var result = new ParseNode(parent, next);
                    result.value = result.value === "1";
                    return result;
                }
                return null;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_color = function (parent) {
                var current = new ParseNode(parent);
                while (this.read(current, "&") !== null || this.read(current, "H") !== null) {}
                var valueNode = this.parse_hexInt32(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                var value = valueNode.value;
                current.value = new parts.Color(value & 255, value >> 8 & 255, value >> 16 & 255);
                while (this.read(current, "&") !== null || this.read(current, "H") !== null) {}
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_alpha = function (parent) {
                var current = new ParseNode(parent);
                while (this.read(current, "&") !== null || this.read(current, "H") !== null) {}
                var valueNode = this.parse_hexInt32(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                var value = valueNode.value;
                current.value = 1 - (value & 255) / 255;
                while (this.read(current, "&") !== null || this.read(current, "H") !== null) {}
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @return {ParseNode}
             */
            ParserRun.prototype.parse_colorWithAlpha = function (parent) {
                var current = new ParseNode(parent);
                var valueNode = this.parse_decimalOrHexInt32(current);
                if (valueNode === null) {
                    parent.pop();
                    return null;
                }
                var value = valueNode.value;
                current.value = new parts.Color(value & 255, value >> 8 & 255, value >> 16 & 255, 1 - (value >> 24 & 255) / 255);
                return current;
            };
            /**
             * @param {!ParseNode} parent
             * @param {string} next
             * @return {ParseNode}
             */
            ParserRun.prototype.read = function (parent, next) {
                if (this._peek(next.length) !== next) {
                    return null;
                }
                return new ParseNode(parent, next);
            };
            /**
             * @param {number=1} count
             * @return {string}
             *
             * @private
             */
            ParserRun.prototype._peek = function (count) {
                if (count === void 0) {
                    count = 1;
                }
                // Fastpath for count === 1. http://jsperf.com/substr-vs-indexer
                if (count === 1) {
                    return this._input[this._parseTree.end];
                }
                return this._input.substr(this._parseTree.end, count);
            };
            /**
             * @return {boolean}
             *
             * @private
             */
            ParserRun.prototype._haveMore = function () {
                return this._parseTree.end < this._input.length;
            };
            /**
             * @param {string} tagName One of "clip" and "iclip"
             * @param {!ParseNode} parent
             * @return {ParseNode}
             *
             * @private
             */
            ParserRun.prototype._parse_tag_clip_or_iclip = function (tagName, parent) {
                var current = new ParseNode(parent);
                if (this.read(current, tagName) === null) {
                    parent.pop();
                    return null;
                }
                if (this.read(current, "(") === null) {
                    parent.pop();
                    return null;
                }
                var x1Node = null;
                var x2Node = null;
                var y1Node = null;
                var y2Node = null;
                var scaleNode = null;
                var commandsNode = null;
                var firstNode = this.parse_decimal(current);
                if (firstNode !== null) {
                    if (this.read(current, ",") === null) {
                        parent.pop();
                        return null;
                    }
                    var secondNode = this.parse_decimal(current);
                    if (secondNode !== null) {
                        x1Node = firstNode;
                        y1Node = secondNode;
                    } else {
                        scaleNode = firstNode;
                    }
                }
                if (x1Node !== null && y1Node !== null) {
                    if (this.read(current, ",") === null) {
                        parent.pop();
                        return null;
                    }
                    x2Node = this.parse_decimal(current);
                    if (this.read(current, ",") === null) {
                        parent.pop();
                        return null;
                    }
                    y2Node = this.parse_decimal(current);
                    current.value = new parts.RectangularClip(x1Node.value, y1Node.value, x2Node.value, y2Node.value, tagName === "clip");
                } else {
                    commandsNode = new ParseNode(current, "");
                    for (var next = this._peek(); this._haveMore() && next !== ")" && next !== "}"; next = this._peek()) {
                        commandsNode.value += next;
                    }
                    current.value = new parts.VectorClip(scaleNode !== null ? scaleNode.value : 1, parse(commandsNode.value, "drawingInstructions"), tagName === "clip");
                }
                if (this.read(current, ")") === null) {
                    parent.pop();
                    return null;
                }
                return current;
            };
            return ParserRun;
        }();
        /**
         * Constructs a simple tag parser function and sets it on the prototype of the {@link ./parser/parse.ParserRun} class.
         *
         * @param {string} tagName The name of the tag to generate the parser function for
         * @param {function(new: !libjass.parts.Part, *)} tagConstructor The type of tag to be returned by the generated parser function
         * @param {function(!ParseNode): ParseNode} valueParser The parser for the tag's value
         * @param {boolean} required Whether the tag's value is required or optional
         *
         * @private
         */
        function makeTagParserFunction(tagName, tagConstructor, valueParser, required) {
            ParserRun.prototype["parse_tag_" + tagName] = function (parent) {
                var self = this;
                var current = new ParseNode(parent);
                if (self.read(current, tagName) === null) {
                    parent.pop();
                    return null;
                }
                var valueNode = valueParser.call(self, current);
                if (valueNode !== null) {
                    current.value = new tagConstructor(valueNode.value);
                } else if (!required) {
                    current.value = new tagConstructor(null);
                } else {
                    parent.pop();
                    return null;
                }
                return current;
            };
        }
        makeTagParserFunction("alpha", parts.Alpha, ParserRun.prototype.parse_alpha, false);
        makeTagParserFunction("be", parts.Blur, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("blur", parts.GaussianBlur, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("bord", parts.Border, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("c", parts.PrimaryColor, ParserRun.prototype.parse_color, false);
        makeTagParserFunction("fax", parts.SkewX, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("fay", parts.SkewY, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("fr", parts.RotateZ, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("frx", parts.RotateX, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("fry", parts.RotateY, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("frz", parts.RotateZ, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("fs", parts.FontSize, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("fsp", parts.LetterSpacing, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("i", parts.Italic, ParserRun.prototype.parse_enableDisable, false);
        makeTagParserFunction("p", parts.DrawingMode, ParserRun.prototype.parse_decimal, true);
        makeTagParserFunction("pbo", parts.DrawingBaselineOffset, ParserRun.prototype.parse_decimal, true);
        makeTagParserFunction("s", parts.StrikeThrough, ParserRun.prototype.parse_enableDisable, false);
        makeTagParserFunction("shad", parts.Shadow, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("u", parts.Underline, ParserRun.prototype.parse_enableDisable, false);
        makeTagParserFunction("xbord", parts.BorderX, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("xshad", parts.ShadowX, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("ybord", parts.BorderY, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("yshad", parts.ShadowY, ParserRun.prototype.parse_decimal, false);
        makeTagParserFunction("1a", parts.PrimaryAlpha, ParserRun.prototype.parse_alpha, false);
        makeTagParserFunction("1c", parts.PrimaryColor, ParserRun.prototype.parse_color, false);
        makeTagParserFunction("2a", parts.SecondaryAlpha, ParserRun.prototype.parse_alpha, false);
        makeTagParserFunction("2c", parts.SecondaryColor, ParserRun.prototype.parse_color, false);
        makeTagParserFunction("3a", parts.OutlineAlpha, ParserRun.prototype.parse_alpha, false);
        makeTagParserFunction("3c", parts.OutlineColor, ParserRun.prototype.parse_color, false);
        makeTagParserFunction("4a", parts.ShadowAlpha, ParserRun.prototype.parse_alpha, false);
        makeTagParserFunction("4c", parts.ShadowColor, ParserRun.prototype.parse_color, false);
        var rules = new map_1.Map();
        for (var _i = 0, _a = Object.keys(ParserRun.prototype); _i < _a.length; _i++) {
            var key = _a[_i];
            if (key.indexOf("parse_") === 0 && typeof ParserRun.prototype[key] === "function") {
                rules.set(key.substr("parse_".length), ParserRun.prototype[key]);
            }
        }
        /**
         * This class represents a single parse node. It has a start and end position, and an optional value object.
         *
         * @param {ParseNode} parent The parent of this parse node.
         * @param {*=null} value If provided, it is assigned as the value of the node.
         *
         * @constructor
         * @private
         */
        var ParseNode = function () {
            function ParseNode(parent, value) {
                if (value === void 0) {
                    value = null;
                }
                this._parent = parent;
                this._children = [];
                if (parent !== null) {
                    parent.children.push(this);
                }
                this._start = parent !== null ? parent.end : 0;
                this._end = this._start;
                this.value = value;
            }
            Object.defineProperty(ParseNode.prototype, "start", {
                /**
                 * The start position of this parse node.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._start;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ParseNode.prototype, "end", {
                /**
                 * The end position of this parse node.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._end;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ParseNode.prototype, "parent", {
                /**
                 * @type {ParseNode}
                 */
                get: function () {
                    return this._parent;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ParseNode.prototype, "children", {
                /**
                 * @type {!Array.<!ParseNode>}
                 */
                get: function () {
                    return this._children;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ParseNode.prototype, "value", {
                /**
                 * An optional object associated with this parse node.
                 *
                 * @type {*}
                 */
                get: function () {
                    return this._value;
                },
                /**
                 * An optional object associated with this parse node.
                 *
                 * If the value is a string, then the end property is updated to be the length of the string.
                 *
                 * @type {*}
                 */
                set: function (newValue) {
                    this._value = newValue;
                    if (this._value !== null && this._value.constructor === String && this._children.length === 0) {
                        this._setEnd(this._start + this._value.length);
                    }
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Removes the last child of this node and updates the end position to be end position of the new last child.
             */
            ParseNode.prototype.pop = function () {
                this._children.splice(this._children.length - 1, 1);
                if (this._children.length > 0) {
                    this._setEnd(this._children[this._children.length - 1].end);
                } else {
                    this._setEnd(this.start);
                }
            };
            /**
             * Updates the end property of this node and its parent recursively to the root node.
             *
             * @param {number} newEnd
             *
             * @private
             */
            ParseNode.prototype._setEnd = function (newEnd) {
                this._end = newEnd;
                if (this._parent !== null && this._parent.end !== this._end) {
                    this._parent._setEnd(this._end);
                }
            };
            return ParseNode;
        }();
        var promise_1 = require(31);
        var commands_1 = require(34);
        var misc_1 = require(36);
        misc_1.registerWorkerCommand(commands_1.WorkerCommands.Parse, function (parameters) {
            return new promise_1.Promise(function (resolve) {
                resolve(parse(parameters.input, parameters.rule));
            });
        });
    }, /* 4 ./parser/stream-parsers */ function (exports, require) {
        var ass_1 = require(23);
        var style_1 = require(27);
        var dialogue_1 = require(24);
        var map_1 = require(29);
        var promise_1 = require(31);
        var misc_1 = require(2);
        /**
         * A parser that parses an {@link libjass.ASS} object from a {@link libjass.parser.Stream}.
         *
         * @param {!libjass.parser.Stream} stream The {@link libjass.parser.Stream} to parse
         *
         * @constructor
         * @memberOf libjass.parser
         */
        var StreamParser = function () {
            function StreamParser(stream) {
                var _this = this;
                this._stream = stream;
                this._ass = new ass_1.ASS();
                this._minimalDeferred = new promise_1.DeferredPromise();
                this._deferred = new promise_1.DeferredPromise();
                this._shouldSwallowBom = true;
                this._currentSectionName = null;
                this._stream.nextLine().then(function (line) {
                    return _this._onNextLine(line);
                });
            }
            Object.defineProperty(StreamParser.prototype, "minimalASS", {
                /**
                 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the script properties of the ASS script have been parsed from the stream. Styles and events have not necessarily been
                 * parsed at the point this promise becomes resolved.
                 */
                get: function () {
                    return this._minimalDeferred.promise;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(StreamParser.prototype, "ass", {
                /**
                 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the entire stream has been parsed.
                 */
                get: function () {
                    return this._deferred.promise;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {string} line
             *
             * @private
             */
            StreamParser.prototype._onNextLine = function (line) {
                var _this = this;
                if (line === null) {
                    this._minimalDeferred.resolve(this._ass);
                    this._deferred.resolve(this._ass);
                    return;
                }
                if (line[line.length - 1] === "\r") {
                    line = line.substr(0, line.length - 1);
                }
                if (line.charCodeAt(0) === 65279 && this._shouldSwallowBom) {
                    line = line.substr(1);
                }
                this._shouldSwallowBom = false;
                if (line === "" || line[0] === ";") {} else if (line[0] === "[" && line[line.length - 1] === "]") {
                    // Start of new section
                    if (this._currentSectionName === "Script Info") {
                        // Exiting script info section
                        this._minimalDeferred.resolve(this._ass);
                    }
                    this._currentSectionName = line.substring(1, line.length - 1);
                } else {
                    switch (this._currentSectionName) {
                      case "Script Info":
                        var property = misc_1.parseLineIntoProperty(line);
                        if (property !== null) {
                            switch (property.name) {
                              case "PlayResX":
                                this._ass.properties.resolutionX = parseInt(property.value);
                                break;

                              case "PlayResY":
                                this._ass.properties.resolutionY = parseInt(property.value);
                                break;

                              case "WrapStyle":
                                this._ass.properties.wrappingStyle = parseInt(property.value);
                                break;

                              case "ScaledBorderAndShadow":
                                this._ass.properties.scaleBorderAndShadow = property.value === "yes";
                                break;
                            }
                        }
                        break;

                      case "V4+ Styles":
                        if (this._ass.stylesFormatSpecifier === null) {
                            var property = misc_1.parseLineIntoProperty(line);
                            if (property !== null && property.name === "Format") {
                                this._ass.stylesFormatSpecifier = property.value.split(",").map(function (str) {
                                    return str.trim();
                                });
                            } else {}
                        } else {
                            this._ass.addStyle(line);
                        }
                        break;

                      case "Events":
                        if (this._ass.dialoguesFormatSpecifier === null) {
                            var property = misc_1.parseLineIntoProperty(line);
                            if (property !== null && property.name === "Format") {
                                this._ass.dialoguesFormatSpecifier = property.value.split(",").map(function (str) {
                                    return str.trim();
                                });
                            } else {}
                        } else {
                            this._ass.addEvent(line);
                        }
                        break;

                      default:
                        // Ignore other sections
                        break;
                    }
                }
                this._stream.nextLine().then(function (line) {
                    return _this._onNextLine(line);
                });
            };
            return StreamParser;
        }();
        exports.StreamParser = StreamParser;
        /**
         * A parser that parses an {@link libjass.ASS} object from a {@link libjass.parser.Stream} of an SRT script.
         *
         * @param {!libjass.parser.Stream} stream The {@link libjass.parser.Stream} to parse
         *
         * @constructor
         * @memberOf libjass.parser
         */
        var SrtStreamParser = function () {
            function SrtStreamParser(stream) {
                var _this = this;
                this._stream = stream;
                this._ass = new ass_1.ASS();
                this._deferred = new promise_1.DeferredPromise();
                this._currentDialogueNumber = null;
                this._currentDialogueStart = null;
                this._currentDialogueEnd = null;
                this._currentDialogueText = null;
                this._stream.nextLine().then(function (line) {
                    return _this._onNextLine(line);
                });
                this._ass.properties.resolutionX = 1280;
                this._ass.properties.resolutionY = 720;
                this._ass.properties.wrappingStyle = 1;
                this._ass.properties.scaleBorderAndShadow = true;
                var newStyle = new style_1.Style(new map_1.Map([ [ "Name", "Default" ] ]));
                this._ass.styles.set(newStyle.name, newStyle);
            }
            Object.defineProperty(SrtStreamParser.prototype, "ass", {
                /**
                 * @type {!Promise.<!libjass.ASS>} A promise that will be resolved when the entire stream has been parsed.
                 */
                get: function () {
                    return this._deferred.promise;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {string} line
             *
             * @private
             */
            SrtStreamParser.prototype._onNextLine = function (line) {
                var _this = this;
                if (line === null) {
                    if (this._currentDialogueNumber !== null && this._currentDialogueStart !== null && this._currentDialogueEnd !== null && this._currentDialogueText !== null) {
                        this._ass.dialogues.push(new dialogue_1.Dialogue(new map_1.Map([ [ "Style", "Default" ], [ "Start", this._currentDialogueStart ], [ "End", this._currentDialogueEnd ], [ "Text", this._currentDialogueText ] ]), this._ass));
                    }
                    this._deferred.resolve(this._ass);
                    return;
                }
                if (line[line.length - 1] === "\r") {
                    line = line.substr(0, line.length - 1);
                }
                if (line === "") {
                    if (this._currentDialogueNumber !== null && this._currentDialogueStart !== null && this._currentDialogueEnd !== null && this._currentDialogueText !== null) {
                        this._ass.dialogues.push(new dialogue_1.Dialogue(new map_1.Map([ [ "Style", "Default" ], [ "Start", this._currentDialogueStart ], [ "End", this._currentDialogueEnd ], [ "Text", this._currentDialogueText ] ]), this._ass));
                    }
                    this._currentDialogueNumber = this._currentDialogueStart = this._currentDialogueEnd = this._currentDialogueText = null;
                } else {
                    if (this._currentDialogueNumber === null) {
                        if (/^\d+$/.test(line)) {
                            this._currentDialogueNumber = line;
                        }
                    } else if (this._currentDialogueStart === null && this._currentDialogueEnd === null) {
                        var match = /^(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)/.exec(line);
                        if (match !== null) {
                            this._currentDialogueStart = match[1].replace(",", ".");
                            this._currentDialogueEnd = match[2].replace(",", ".");
                        }
                    } else {
                        line = line.replace(/<b>/g, "{\\b1}").replace(/\{b\}/g, "{\\b1}").replace(/<\/b>/g, "{\\b0}").replace(/\{\/b\}/g, "{\\b0}").replace(/<i>/g, "{\\i1}").replace(/\{i\}/g, "{\\i1}").replace(/<\/i>/g, "{\\i0}").replace(/\{\/i\}/g, "{\\i0}").replace(/<u>/g, "{\\u1}").replace(/\{u\}/g, "{\\u1}").replace(/<\/u>/g, "{\\u0}").replace(/\{\/u\}/g, "{\\u0}").replace(/<font color="#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})">/g, function (/* ujs:unreferenced */ substring, red, green, blue) {
                            return "{c&H" + blue + green + red + "&}";
                        }).replace(/<\/font>/g, "{\\c}");
                        if (this._currentDialogueText !== null) {
                            this._currentDialogueText += "\\N" + line;
                        } else {
                            this._currentDialogueText = line;
                        }
                    }
                }
                this._stream.nextLine().then(function (line) {
                    return _this._onNextLine(line);
                });
            };
            return SrtStreamParser;
        }();
        exports.SrtStreamParser = SrtStreamParser;
    }, /* 5 ./parser/streams */ function (exports, require) {
        var promise_1 = require(31);
        /**
         * A {@link libjass.parser.Stream} that reads from a string in memory.
         *
         * @param {string} str The string
         *
         * @constructor
         * @implements {libjass.parser.Stream}
         * @memberOf libjass.parser
         */
        var StringStream = function () {
            function StringStream(str) {
                this._str = str;
                this._readTill = 0;
            }
            /**
             * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the string has been completely read.
             */
            StringStream.prototype.nextLine = function () {
                var result = null;
                if (this._readTill < this._str.length) {
                    var nextNewLinePos = this._str.indexOf("\n", this._readTill);
                    if (nextNewLinePos !== -1) {
                        result = promise_1.Promise.resolve(this._str.substring(this._readTill, nextNewLinePos));
                        this._readTill = nextNewLinePos + 1;
                    } else {
                        result = promise_1.Promise.resolve(this._str.substr(this._readTill));
                        this._readTill = this._str.length;
                    }
                } else {
                    result = promise_1.Promise.resolve(null);
                }
                return result;
            };
            return StringStream;
        }();
        exports.StringStream = StringStream;
        /**
         * A {@link libjass.parser.Stream} that reads from an XMLHttpRequest object.
         *
         * @param {!XMLHttpRequest} xhr The XMLHttpRequest object. Make sure to not call .open() on this object before passing it in here,
         * since event handlers cannot be registered after open() has been called.
         *
         * @constructor
         * @implements {libjass.parser.Stream}
         * @memberOf libjass.parser
         */
        var XhrStream = function () {
            function XhrStream(xhr) {
                var _this = this;
                this._xhr = xhr;
                this._readTill = 0;
                this._pendingDeferred = null;
                xhr.addEventListener("progress", function (event) {
                    return _this._onXhrProgress(event);
                }, false);
                xhr.addEventListener("loadend", function (event) {
                    return _this._onXhrLoadEnd(event);
                }, false);
            }
            /**
             * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the stream is exhausted.
             */
            XhrStream.prototype.nextLine = function () {
                if (this._pendingDeferred !== null) {
                    throw new Error("XhrStream only supports one pending unfulfilled read at a time.");
                }
                var deferred = this._pendingDeferred = new promise_1.DeferredPromise();
                this._tryResolveNextLine();
                return deferred.promise;
            };
            /**
             * @param {!ProgressEvent} event
             *
             * @private
             */
            XhrStream.prototype._onXhrProgress = function () {
                if (this._pendingDeferred === null) {
                    return;
                }
                this._tryResolveNextLine();
            };
            /**
             * @param {!ProgressEvent} event
             *
             * @private
             */
            XhrStream.prototype._onXhrLoadEnd = function () {
                if (this._pendingDeferred === null) {
                    return;
                }
                this._tryResolveNextLine();
            };
            /**
             * @private
             */
            XhrStream.prototype._tryResolveNextLine = function () {
                var response = this._xhr.responseText;
                var nextNewLinePos = response.indexOf("\n", this._readTill);
                if (nextNewLinePos !== -1) {
                    this._pendingDeferred.resolve(response.substring(this._readTill, nextNewLinePos));
                    this._readTill = nextNewLinePos + 1;
                    this._pendingDeferred = null;
                } else if (this._xhr.readyState === XMLHttpRequest.DONE) {
                    // No more data. This is the last line.
                    if (this._readTill < response.length) {
                        this._pendingDeferred.resolve(response.substr(this._readTill));
                        this._readTill = response.length;
                    } else {
                        this._pendingDeferred.resolve(null);
                    }
                    this._pendingDeferred = null;
                }
            };
            return XhrStream;
        }();
        exports.XhrStream = XhrStream;
        /**
         * A {@link libjass.parser.Stream} that reads from a ReadableStream object.
         *
         * @param {!ReadableStream} stream
         * @param {string} encoding
         *
         * @constructor
         * @implements {libjass.parser.Stream}
         * @memberOf libjass.parser
         */
        var BrowserReadableStream = function () {
            function BrowserReadableStream(stream, encoding) {
                this._buffer = "";
                this._pendingDeferred = null;
                this._reader = stream.getReader();
                this._decoder = new global.TextDecoder(encoding, {
                    ignoreBOM: true
                });
            }
            /**
             * @return {!Promise.<?string>} A promise that will be resolved with the next line, or null if the stream is exhausted.
             */
            BrowserReadableStream.prototype.nextLine = function () {
                if (this._pendingDeferred !== null) {
                    throw new Error("BrowserReadableStream only supports one pending unfulfilled read at a time.");
                }
                var deferred = this._pendingDeferred = new promise_1.DeferredPromise();
                this._tryResolveNextLine();
                return deferred.promise;
            };
            /**
             * @private
             */
            BrowserReadableStream.prototype._tryResolveNextLine = function () {
                var _this = this;
                var nextNewLinePos = this._buffer.indexOf("\n");
                if (nextNewLinePos !== -1) {
                    this._pendingDeferred.resolve(this._buffer.substr(0, nextNewLinePos));
                    this._buffer = this._buffer.substr(nextNewLinePos + 1);
                    this._pendingDeferred = null;
                } else {
                    this._reader.read().then(function (next) {
                        var value = next.value, done = next.done;
                        if (!done) {
                            _this._buffer += _this._decoder.decode(value, {
                                stream: true
                            });
                            _this._tryResolveNextLine();
                        } else {
                            // No more data.
                            if (_this._buffer.length === 0) {
                                _this._pendingDeferred.resolve(null);
                            } else {
                                _this._pendingDeferred.resolve(_this._buffer);
                                _this._buffer = "";
                            }
                            _this._pendingDeferred = null;
                        }
                    });
                }
            };
            return BrowserReadableStream;
        }();
        exports.BrowserReadableStream = BrowserReadableStream;
    }, /* 6 ./parts/drawing */ function (exports) {
        /**
         * An instruction to move to a particular position.
         *
         * @param {number} x
         * @param {number} y
         *
         * @constructor
         * @implements {libjass.parts.drawing.Instruction}
         * @memberOf libjass.parts.drawing
         */
        var MoveInstruction = function () {
            function MoveInstruction(x, y) {
                this._x = x;
                this._y = y;
            }
            Object.defineProperty(MoveInstruction.prototype, "x", {
                /**
                 * The X position of this move instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MoveInstruction.prototype, "y", {
                /**
                 * The Y position of this move instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y;
                },
                enumerable: true,
                configurable: true
            });
            return MoveInstruction;
        }();
        exports.MoveInstruction = MoveInstruction;
        /**
         * An instruction to draw a line to a particular position.
         *
         * @param {number} x
         * @param {number} y
         *
         * @constructor
         * @implements {libjass.parts.drawing.Instruction}
         * @memberOf libjass.parts.drawing
         */
        var LineInstruction = function () {
            function LineInstruction(x, y) {
                this._x = x;
                this._y = y;
            }
            Object.defineProperty(LineInstruction.prototype, "x", {
                /**
                 * The X position of this line instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(LineInstruction.prototype, "y", {
                /**
                 * The Y position of this line instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y;
                },
                enumerable: true,
                configurable: true
            });
            return LineInstruction;
        }();
        exports.LineInstruction = LineInstruction;
        /**
         * An instruction to draw a cubic bezier curve to a particular position, with two given control points.
         *
         * @param {number} x1
         * @param {number} y1
         * @param {number} x2
         * @param {number} y2
         * @param {number} x3
         * @param {number} y3
         *
         * @constructor
         * @implements {libjass.parts.drawing.Instruction}
         * @memberOf libjass.parts.drawing
         */
        var CubicBezierCurveInstruction = function () {
            function CubicBezierCurveInstruction(x1, y1, x2, y2, x3, y3) {
                this._x1 = x1;
                this._y1 = y1;
                this._x2 = x2;
                this._y2 = y2;
                this._x3 = x3;
                this._y3 = y3;
            }
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "x1", {
                /**
                 * The X position of the first control point of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "y1", {
                /**
                 * The Y position of the first control point of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "x2", {
                /**
                 * The X position of the second control point of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "y2", {
                /**
                 * The Y position of the second control point of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "x3", {
                /**
                 * The ending X position of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x3;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(CubicBezierCurveInstruction.prototype, "y3", {
                /**
                 * The ending Y position of this cubic bezier curve instruction.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y3;
                },
                enumerable: true,
                configurable: true
            });
            return CubicBezierCurveInstruction;
        }();
        exports.CubicBezierCurveInstruction = CubicBezierCurveInstruction;
    }, /* 7 ./parts/index */ function (exports, require) {
        var drawing = require(6);
        exports.drawing = drawing;
        /**
         * Represents a CSS color with red, green, blue and alpha components.
         *
         * Instances of this class are immutable.
         *
         * @param {number} red
         * @param {number} green
         * @param {number} blue
         * @param {number=1} alpha
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Color = function () {
            function Color(red, green, blue, alpha) {
                if (alpha === void 0) {
                    alpha = 1;
                }
                this._red = red;
                this._green = green;
                this._blue = blue;
                this._alpha = alpha;
            }
            Object.defineProperty(Color.prototype, "red", {
                /**
                 * The red component of this color as a number between 0 and 255.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._red;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Color.prototype, "green", {
                /**
                 * The green component of this color as a number between 0 and 255.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._green;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Color.prototype, "blue", {
                /**
                 * The blue component of this color as a number between 0 and 255.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._blue;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Color.prototype, "alpha", {
                /**
                 * The alpha component of this color as a number between 0 and 1, where 0 means transparent and 1 means opaque.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._alpha;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {?number} value The new alpha. If null, the existing alpha is used.
             * @return {!libjass.parts.Color} Returns a new Color instance with the same color but the provided alpha.
             */
            Color.prototype.withAlpha = function (value) {
                if (value !== null) {
                    return new Color(this._red, this._green, this._blue, value);
                }
                return this;
            };
            /**
             * @return {string} The CSS representation "rgba(...)" of this color.
             */
            Color.prototype.toString = function () {
                return "rgba(" + this._red + ", " + this._green + ", " + this._blue + ", " + this._alpha.toFixed(3) + ")";
            };
            return Color;
        }();
        exports.Color = Color;
        /**
         * A comment, i.e., any text enclosed in {} that is not understood as an ASS tag.
         *
         * @param {string} value The text of this comment
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Comment = function () {
            function Comment(value) {
                this._value = value;
            }
            Object.defineProperty(Comment.prototype, "value", {
                /**
                 * The value of this comment.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Comment;
        }();
        exports.Comment = Comment;
        /**
         * A block of text, i.e., any text not enclosed in {}. Also includes \h.
         *
         * @param {string} value The content of this block of text
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Text = function () {
            function Text(value) {
                this._value = value;
            }
            Object.defineProperty(Text.prototype, "value", {
                /**
                 * The value of this text part.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @return {string}
             */
            Text.prototype.toString = function () {
                return "Text { value: " + this._value.replace(/\u00A0/g, "\\h") + " }";
            };
            return Text;
        }();
        exports.Text = Text;
        /**
         * A newline character \N.
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var NewLine = function () {
            function NewLine() {}
            return NewLine;
        }();
        exports.NewLine = NewLine;
        /**
         * An italic tag {\i}
         *
         * @param {?boolean} value {\i1} -> true, {\i0} -> false, {\i} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Italic = function () {
            function Italic(value) {
                this._value = value;
            }
            Object.defineProperty(Italic.prototype, "value", {
                /**
                 * The value of this italic tag.
                 *
                 * @type {?boolean}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Italic;
        }();
        exports.Italic = Italic;
        /**
         * A bold tag {\b}
         *
         * @param {*} value {\b1} -> true, {\b0} -> false, {\b###} -> weight of the bold (number), {\b} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Bold = function () {
            function Bold(value) {
                this._value = value;
            }
            Object.defineProperty(Bold.prototype, "value", {
                /**
                 * The value of this bold tag.
                 *
                 * @type {?boolean|?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Bold;
        }();
        exports.Bold = Bold;
        /**
         * An underline tag {\u}
         *
         * @param {?boolean} value {\u1} -> true, {\u0} -> false, {\u} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Underline = function () {
            function Underline(value) {
                this._value = value;
            }
            Object.defineProperty(Underline.prototype, "value", {
                /**
                 * The value of this underline tag.
                 *
                 * @type {?boolean}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Underline;
        }();
        exports.Underline = Underline;
        /**
         * A strike-through tag {\s}
         *
         * @param {?boolean} value {\s1} -> true, {\s0} -> false, {\s} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var StrikeThrough = function () {
            function StrikeThrough(value) {
                this._value = value;
            }
            Object.defineProperty(StrikeThrough.prototype, "value", {
                /**
                 * The value of this strike-through tag.
                 *
                 * @type {?boolean}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return StrikeThrough;
        }();
        exports.StrikeThrough = StrikeThrough;
        /**
         * A border tag {\bord}
         *
         * @param {?number} value {\bord###} -> width (number), {\bord} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Border = function () {
            function Border(value) {
                this._value = value;
            }
            Object.defineProperty(Border.prototype, "value", {
                /**
                 * The value of this border tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Border;
        }();
        exports.Border = Border;
        /**
         * A horizontal border tag {\xbord}
         *
         * @param {?number} value {\xbord###} -> width (number), {\xbord} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var BorderX = function () {
            function BorderX(value) {
                this._value = value;
            }
            Object.defineProperty(BorderX.prototype, "value", {
                /**
                 * The value of this horizontal border tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return BorderX;
        }();
        exports.BorderX = BorderX;
        /**
         * A vertical border tag {\ybord}
         *
         * @param {?number} value {\ybord###} -> height (number), {\ybord} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var BorderY = function () {
            function BorderY(value) {
                this._value = value;
            }
            Object.defineProperty(BorderY.prototype, "value", {
                /**
                 * The value of this vertical border tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return BorderY;
        }();
        exports.BorderY = BorderY;
        /**
         * A shadow tag {\shad}
         *
         * @param {?number} value {\shad###} -> depth (number), {\shad} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Shadow = function () {
            function Shadow(value) {
                this._value = value;
            }
            Object.defineProperty(Shadow.prototype, "value", {
                /**
                 * The value of this shadow tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Shadow;
        }();
        exports.Shadow = Shadow;
        /**
         * A horizontal shadow tag {\xshad}
         *
         * @param {?number} value {\xshad###} -> depth (number), {\xshad} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ShadowX = function () {
            function ShadowX(value) {
                this._value = value;
            }
            Object.defineProperty(ShadowX.prototype, "value", {
                /**
                 * The value of this horizontal shadow tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return ShadowX;
        }();
        exports.ShadowX = ShadowX;
        /**
         * A vertical shadow tag {\yshad}
         *
         * @param {?number} value {\yshad###} -> depth (number), {\yshad} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ShadowY = function () {
            function ShadowY(value) {
                this._value = value;
            }
            Object.defineProperty(ShadowY.prototype, "value", {
                /**
                 * The value of this vertical shadow tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return ShadowY;
        }();
        exports.ShadowY = ShadowY;
        /**
         * A blur tag {\be}
         *
         * @param {?number} value {\be###} -> strength (number), {\be} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Blur = function () {
            function Blur(value) {
                this._value = value;
            }
            Object.defineProperty(Blur.prototype, "value", {
                /**
                 * The value of this blur tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Blur;
        }();
        exports.Blur = Blur;
        /**
         * A Gaussian blur tag {\blur}
         *
         * @param {?number} value {\blur###} -> strength (number), {\blur} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var GaussianBlur = function () {
            function GaussianBlur(value) {
                this._value = value;
            }
            Object.defineProperty(GaussianBlur.prototype, "value", {
                /**
                 * The value of this Gaussian blur tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return GaussianBlur;
        }();
        exports.GaussianBlur = GaussianBlur;
        /**
         * A font name tag {\fn}
         *
         * @param {?string} value {\fn###} -> name (string), {\fn} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontName = function () {
            function FontName(value) {
                this._value = value;
            }
            Object.defineProperty(FontName.prototype, "value", {
                /**
                 * The value of this font name tag.
                 *
                 * @type {?string}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontName;
        }();
        exports.FontName = FontName;
        /**
         * A font size tag {\fs}
         *
         * @param {?number} value {\fs###} -> size (number), {\fs} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontSize = function () {
            function FontSize(value) {
                this._value = value;
            }
            Object.defineProperty(FontSize.prototype, "value", {
                /**
                 * The value of this font size tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontSize;
        }();
        exports.FontSize = FontSize;
        /**
         * A font size increase tag {\fs+}
         *
         * @param {?number} value {\fs+###} -> difference (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontSizePlus = function () {
            function FontSizePlus(value) {
                this._value = value;
            }
            Object.defineProperty(FontSizePlus.prototype, "value", {
                /**
                 * The value of this font size increase tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontSizePlus;
        }();
        exports.FontSizePlus = FontSizePlus;
        /**
         * A font size decrease tag {\fs-}
         *
         * @param {?number} value {\fs-###} -> difference (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontSizeMinus = function () {
            function FontSizeMinus(value) {
                this._value = value;
            }
            Object.defineProperty(FontSizeMinus.prototype, "value", {
                /**
                 * The value of this font size decrease tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontSizeMinus;
        }();
        exports.FontSizeMinus = FontSizeMinus;
        /**
         * A horizontal font scaling tag {\fscx}
         *
         * @param {?number} value {\fscx###} -> scale (number), {\fscx} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontScaleX = function () {
            function FontScaleX(value) {
                this._value = value;
            }
            Object.defineProperty(FontScaleX.prototype, "value", {
                /**
                 * The value of this horizontal font scaling tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontScaleX;
        }();
        exports.FontScaleX = FontScaleX;
        /**
         * A vertical font scaling tag {\fscy}
         *
         * @param {?number} value {\fscy###} -> scale (number), {\fscy} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var FontScaleY = function () {
            function FontScaleY(value) {
                this._value = value;
            }
            Object.defineProperty(FontScaleY.prototype, "value", {
                /**
                 * The value of this vertical font scaling tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return FontScaleY;
        }();
        exports.FontScaleY = FontScaleY;
        /**
         * A letter-spacing tag {\fsp}
         *
         * @param {?number} value {\fsp###} -> spacing (number), {\fsp} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var LetterSpacing = function () {
            function LetterSpacing(value) {
                this._value = value;
            }
            Object.defineProperty(LetterSpacing.prototype, "value", {
                /**
                 * The value of this letter-spacing tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return LetterSpacing;
        }();
        exports.LetterSpacing = LetterSpacing;
        /**
         * An X-axis rotation tag {\frx}
         *
         * @param {?number} value {\frx###} -> angle (number), {\frx} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var RotateX = function () {
            function RotateX(value) {
                this._value = value;
            }
            Object.defineProperty(RotateX.prototype, "value", {
                /**
                 * The value of this X-axis rotation tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return RotateX;
        }();
        exports.RotateX = RotateX;
        /**
         * A Y-axis rotation tag {\fry}
         *
         * @param {?number} value {\fry###} -> angle (number), {\fry} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var RotateY = function () {
            function RotateY(value) {
                this._value = value;
            }
            Object.defineProperty(RotateY.prototype, "value", {
                /**
                 * The value of this Y-axis rotation tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return RotateY;
        }();
        exports.RotateY = RotateY;
        /**
         * A Z-axis rotation tag {\fr} or {\frz}
         *
         * @param {?number} value {\frz###} -> angle (number), {\frz} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var RotateZ = function () {
            function RotateZ(value) {
                this._value = value;
            }
            Object.defineProperty(RotateZ.prototype, "value", {
                /**
                 * The value of this Z-axis rotation tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return RotateZ;
        }();
        exports.RotateZ = RotateZ;
        /**
         * An X-axis shearing tag {\fax}
         *
         * @param {?number} value {\fax###} -> angle (number), {\fax} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var SkewX = function () {
            function SkewX(value) {
                this._value = value;
            }
            Object.defineProperty(SkewX.prototype, "value", {
                /**
                 * The value of this X-axis shearing tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return SkewX;
        }();
        exports.SkewX = SkewX;
        /**
         * A Y-axis shearing tag {\fay}
         *
         * @param {?number} value {\fay###} -> angle (number), {\fay} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var SkewY = function () {
            function SkewY(value) {
                this._value = value;
            }
            Object.defineProperty(SkewY.prototype, "value", {
                /**
                 * The value of this Y-axis shearing tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return SkewY;
        }();
        exports.SkewY = SkewY;
        /**
         * A primary color tag {\c} or {\1c}
         *
         * @param {libjass.parts.Color} value {\1c###} -> color (Color), {\1c} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var PrimaryColor = function () {
            function PrimaryColor(value) {
                this._value = value;
            }
            Object.defineProperty(PrimaryColor.prototype, "value", {
                /**
                 * The value of this primary color tag.
                 *
                 * @type {libjass.parts.Color}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return PrimaryColor;
        }();
        exports.PrimaryColor = PrimaryColor;
        /**
         * A secondary color tag {\2c}
         *
         * @param {libjass.parts.Color} value {\2c###} -> color (Color), {\2c} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var SecondaryColor = function () {
            function SecondaryColor(value) {
                this._value = value;
            }
            Object.defineProperty(SecondaryColor.prototype, "value", {
                /**
                 * The value of this secondary color tag.
                 *
                 * @type {libjass.parts.Color}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return SecondaryColor;
        }();
        exports.SecondaryColor = SecondaryColor;
        /**
         * An outline color tag {\3c}
         *
         * @param {libjass.parts.Color} value {\3c###} -> color (Color), {\3c} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var OutlineColor = function () {
            function OutlineColor(value) {
                this._value = value;
            }
            Object.defineProperty(OutlineColor.prototype, "value", {
                /**
                 * The value of this outline color tag.
                 *
                 * @type {libjass.parts.Color}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return OutlineColor;
        }();
        exports.OutlineColor = OutlineColor;
        /**
         * A shadow color tag {\4c}
         *
         * @param {libjass.parts.Color} value {\4c###} -> color (Color), {\4c} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ShadowColor = function () {
            function ShadowColor(value) {
                this._value = value;
            }
            Object.defineProperty(ShadowColor.prototype, "value", {
                /**
                 * The value of this shadow color tag.
                 *
                 * @type {libjass.parts.Color}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return ShadowColor;
        }();
        exports.ShadowColor = ShadowColor;
        /**
         * An alpha tag {\alpha}
         *
         * @param {?number} value {\alpha###} -> alpha (number), {\alpha} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Alpha = function () {
            function Alpha(value) {
                this._value = value;
            }
            Object.defineProperty(Alpha.prototype, "value", {
                /**
                 * The value of this alpha tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Alpha;
        }();
        exports.Alpha = Alpha;
        /**
         * A primary alpha tag {\1a}
         *
         * @param {?number} value {\1a###} -> alpha (number), {\1a} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var PrimaryAlpha = function () {
            function PrimaryAlpha(value) {
                this._value = value;
            }
            Object.defineProperty(PrimaryAlpha.prototype, "value", {
                /**
                 * The value of this primary alpha tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return PrimaryAlpha;
        }();
        exports.PrimaryAlpha = PrimaryAlpha;
        /**
         * A secondary alpha tag {\2a}
         *
         * @param {?number} value {\2a###} -> alpha (number), {\2a} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var SecondaryAlpha = function () {
            function SecondaryAlpha(value) {
                this._value = value;
            }
            Object.defineProperty(SecondaryAlpha.prototype, "value", {
                /**
                 * The value of this secondary alpha tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return SecondaryAlpha;
        }();
        exports.SecondaryAlpha = SecondaryAlpha;
        /**
         * An outline alpha tag {\3a}
         *
         * @param {?number} value {\3a###} -> alpha (number), {\3a} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var OutlineAlpha = function () {
            function OutlineAlpha(value) {
                this._value = value;
            }
            Object.defineProperty(OutlineAlpha.prototype, "value", {
                /**
                 * The value of this outline alpha tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return OutlineAlpha;
        }();
        exports.OutlineAlpha = OutlineAlpha;
        /**
         * A shadow alpha tag {\4a}
         *
         * @param {?number} value {\4a###} -> alpha (number), {\4a} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ShadowAlpha = function () {
            function ShadowAlpha(value) {
                this._value = value;
            }
            Object.defineProperty(ShadowAlpha.prototype, "value", {
                /**
                 * The value of this shadow alpha tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return ShadowAlpha;
        }();
        exports.ShadowAlpha = ShadowAlpha;
        /**
         * An alignment tag {\an} or {\a}
         *
         * @param {number} value {\an###} -> alignment (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Alignment = function () {
            function Alignment(value) {
                this._value = value;
            }
            Object.defineProperty(Alignment.prototype, "value", {
                /**
                 * The value of this alignment tag.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Alignment;
        }();
        exports.Alignment = Alignment;
        /**
         * A color karaoke tag {\k}
         *
         * @param {number} duration {\k###} -> duration (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ColorKaraoke = function () {
            function ColorKaraoke(duration) {
                this._duration = duration;
            }
            Object.defineProperty(ColorKaraoke.prototype, "duration", {
                /**
                 * The duration of this color karaoke tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._duration;
                },
                enumerable: true,
                configurable: true
            });
            return ColorKaraoke;
        }();
        exports.ColorKaraoke = ColorKaraoke;
        /**
         * A sweeping color karaoke tag {\K} or {\kf}
         *
         * @param {number} duration {\kf###} -> duration (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var SweepingColorKaraoke = function () {
            function SweepingColorKaraoke(duration) {
                this._duration = duration;
            }
            Object.defineProperty(SweepingColorKaraoke.prototype, "duration", {
                /**
                 * The duration of this sweeping color karaoke tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._duration;
                },
                enumerable: true,
                configurable: true
            });
            return SweepingColorKaraoke;
        }();
        exports.SweepingColorKaraoke = SweepingColorKaraoke;
        /**
         * An outline karaoke tag {\ko}
         *
         * @param {number} duration {\ko###} -> duration (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var OutlineKaraoke = function () {
            function OutlineKaraoke(duration) {
                this._duration = duration;
            }
            Object.defineProperty(OutlineKaraoke.prototype, "duration", {
                /**
                 * The duration of this outline karaoke tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._duration;
                },
                enumerable: true,
                configurable: true
            });
            return OutlineKaraoke;
        }();
        exports.OutlineKaraoke = OutlineKaraoke;
        /**
         * A wrapping style tag {\q}
         *
         * @param {number} value {\q###} -> style (number)
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var WrappingStyle = function () {
            function WrappingStyle(value) {
                this._value = value;
            }
            Object.defineProperty(WrappingStyle.prototype, "value", {
                /**
                 * The value of this wrapping style tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return WrappingStyle;
        }();
        exports.WrappingStyle = WrappingStyle;
        /**
         * A style reset tag {\r}
         *
         * @param {?string} value {\r###} -> style name (string), {\r} -> null
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Reset = function () {
            function Reset(value) {
                this._value = value;
            }
            Object.defineProperty(Reset.prototype, "value", {
                /**
                 * The value of this style reset tag.
                 *
                 * @type {?string}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return Reset;
        }();
        exports.Reset = Reset;
        /**
         * A position tag {\pos}
         *
         * @param {number} x
         * @param {number} y
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Position = function () {
            function Position(x, y) {
                this._x = x;
                this._y = y;
            }
            Object.defineProperty(Position.prototype, "x", {
                /**
                 * The x value of this position tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Position.prototype, "y", {
                /**
                 * The y value of this position tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y;
                },
                enumerable: true,
                configurable: true
            });
            return Position;
        }();
        exports.Position = Position;
        /**
         * A movement tag {\move}
         *
         * @param {number} x1
         * @param {number} y1
         * @param {number} x2
         * @param {number} y2
         * @param {number} t1
         * @param {number} t2
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Move = function () {
            function Move(x1, y1, x2, y2, t1, t2) {
                this._x1 = x1;
                this._y1 = y1;
                this._x2 = x2;
                this._y2 = y2;
                this._t1 = t1;
                this._t2 = t2;
            }
            Object.defineProperty(Move.prototype, "x1", {
                /**
                 * The starting x value of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Move.prototype, "y1", {
                /**
                 * The starting y value of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Move.prototype, "x2", {
                /**
                 * The ending x value of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Move.prototype, "y2", {
                /**
                 * The ending y value of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Move.prototype, "t1", {
                /**
                 * The start time of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Move.prototype, "t2", {
                /**
                 * The end time value of this move tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t2;
                },
                enumerable: true,
                configurable: true
            });
            return Move;
        }();
        exports.Move = Move;
        /**
         * A rotation origin tag {\org}
         *
         * @param {number} x
         * @param {number} y
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var RotationOrigin = function () {
            function RotationOrigin(x, y) {
                this._x = x;
                this._y = y;
            }
            Object.defineProperty(RotationOrigin.prototype, "x", {
                /**
                 * The x value of this rotation origin tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RotationOrigin.prototype, "y", {
                /**
                 * The y value of this rotation origin tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y;
                },
                enumerable: true,
                configurable: true
            });
            return RotationOrigin;
        }();
        exports.RotationOrigin = RotationOrigin;
        /**
         * A simple fade tag {\fad}
         *
         * @param {number} start
         * @param {number} end
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Fade = function () {
            function Fade(start, end) {
                this._start = start;
                this._end = end;
            }
            Object.defineProperty(Fade.prototype, "start", {
                /**
                 * The start time of this fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._start;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Fade.prototype, "end", {
                /**
                 * The end time of this fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._end;
                },
                enumerable: true,
                configurable: true
            });
            return Fade;
        }();
        exports.Fade = Fade;
        /**
         * A complex fade tag {\fade}
         *
         * @param {number} a1
         * @param {number} a2
         * @param {number} a3
         * @param {number} t1
         * @param {number} t2
         * @param {number} t3
         * @param {number} t4
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var ComplexFade = function () {
            function ComplexFade(a1, a2, a3, t1, t2, t3, t4) {
                this._a1 = a1;
                this._a2 = a2;
                this._a3 = a3;
                this._t1 = t1;
                this._t2 = t2;
                this._t3 = t3;
                this._t4 = t4;
            }
            Object.defineProperty(ComplexFade.prototype, "a1", {
                /**
                 * The alpha value of this complex fade tag at time t2.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._a1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "a2", {
                /**
                 * The alpha value of this complex fade tag at time t3.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._a2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "a3", {
                /**
                 * The alpha value of this complex fade tag at time t4.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._a3;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "t1", {
                /**
                 * The starting time of this complex fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "t2", {
                /**
                 * The first intermediate time of this complex fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "t3", {
                /**
                 * The second intermediate time of this complex fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t3;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ComplexFade.prototype, "t4", {
                /**
                 * The ending time of this complex fade tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._t4;
                },
                enumerable: true,
                configurable: true
            });
            return ComplexFade;
        }();
        exports.ComplexFade = ComplexFade;
        /**
         * A transform tag {\t}
         *
         * @param {number} start
         * @param {number} end
         * @param {number} accel
         * @param {!Array.<!libjass.parts.Tag>} tags
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var Transform = function () {
            function Transform(start, end, accel, tags) {
                this._start = start;
                this._end = end;
                this._accel = accel;
                this._tags = tags;
            }
            Object.defineProperty(Transform.prototype, "start", {
                /**
                 * The starting time of this transform tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._start;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transform.prototype, "end", {
                /**
                 * The ending time of this transform tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._end;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transform.prototype, "accel", {
                /**
                 * The acceleration of this transform tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._accel;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transform.prototype, "tags", {
                /**
                 * The tags animated by this transform tag.
                 *
                 * @type {!Array.<!libjass.parts.Tag>}
                 */
                get: function () {
                    return this._tags;
                },
                enumerable: true,
                configurable: true
            });
            return Transform;
        }();
        exports.Transform = Transform;
        /**
         * A rectangular clip tag {\clip} or {\iclip}
         *
         * @param {number} x1
         * @param {number} y1
         * @param {number} x2
         * @param {number} y2
         * @param {boolean} inside
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var RectangularClip = function () {
            function RectangularClip(x1, y1, x2, y2, inside) {
                this._x1 = x1;
                this._y1 = y1;
                this._x2 = x2;
                this._y2 = y2;
                this._inside = inside;
            }
            Object.defineProperty(RectangularClip.prototype, "x1", {
                /**
                 * The X coordinate of the starting position of this rectangular clip tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RectangularClip.prototype, "y1", {
                /**
                 * The Y coordinate of the starting position of this rectangular clip tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RectangularClip.prototype, "x2", {
                /**
                 * The X coordinate of the ending position of this rectangular clip tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._x2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RectangularClip.prototype, "y2", {
                /**
                 * The Y coordinate of the ending position of this rectangular clip tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._y2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RectangularClip.prototype, "inside", {
                /**
                 * Whether this rectangular clip tag clips the region it encloses or the region it excludes.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._inside;
                },
                enumerable: true,
                configurable: true
            });
            return RectangularClip;
        }();
        exports.RectangularClip = RectangularClip;
        /**
         * A vector clip tag {\clip} or {\iclip}
         *
         * @param {number} scale
         * @param {!Array.<!libjass.parts.drawing.Instruction>} instructions
         * @param {boolean} inside
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var VectorClip = function () {
            function VectorClip(scale, instructions, inside) {
                this._scale = scale;
                this._instructions = instructions;
                this._inside = inside;
            }
            Object.defineProperty(VectorClip.prototype, "scale", {
                /**
                 * The scale of this vector clip tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._scale;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VectorClip.prototype, "instructions", {
                /**
                 * The clip commands of this vector clip tag.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._instructions;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VectorClip.prototype, "inside", {
                /**
                 * Whether this vector clip tag clips the region it encloses or the region it excludes.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._inside;
                },
                enumerable: true,
                configurable: true
            });
            return VectorClip;
        }();
        exports.VectorClip = VectorClip;
        /**
         * A drawing mode tag {\p}
         *
         * @param {number} scale
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var DrawingMode = function () {
            function DrawingMode(scale) {
                this._scale = scale;
            }
            Object.defineProperty(DrawingMode.prototype, "scale", {
                /**
                 * The scale of this drawing mode tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._scale;
                },
                enumerable: true,
                configurable: true
            });
            return DrawingMode;
        }();
        exports.DrawingMode = DrawingMode;
        /**
         * A drawing mode baseline offset tag {\pbo}
         *
         * @param {number} value
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var DrawingBaselineOffset = function () {
            function DrawingBaselineOffset(value) {
                this._value = value;
            }
            Object.defineProperty(DrawingBaselineOffset.prototype, "value", {
                /**
                 * The value of this drawing mode baseline offset tag.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._value;
                },
                enumerable: true,
                configurable: true
            });
            return DrawingBaselineOffset;
        }();
        exports.DrawingBaselineOffset = DrawingBaselineOffset;
        /**
         * A pseudo-part representing text interpreted as drawing instructions
         *
         * @param {!Array.<!libjass.parts.drawing.Instruction>} instructions
         *
         * @constructor
         * @memberOf libjass.parts
         */
        var DrawingInstructions = function () {
            function DrawingInstructions(instructions) {
                this._instructions = instructions;
            }
            Object.defineProperty(DrawingInstructions.prototype, "instructions", {
                /**
                 * The instructions contained in this drawing instructions part.
                 *
                 * @type {!Array.<!libjass.parts.drawing.Instruction>}
                 */
                get: function () {
                    return this._instructions;
                },
                enumerable: true,
                configurable: true
            });
            return DrawingInstructions;
        }();
        exports.DrawingInstructions = DrawingInstructions;
        var addToString = function (ctor, ctorName) {
            if (!ctor.prototype.hasOwnProperty("toString")) {
                var propertyNames = Object.getOwnPropertyNames(ctor.prototype).filter(function (property) {
                    return property !== "constructor";
                });
                ctor.prototype.toString = function () {
                    var _this = this;
                    return ctorName + " { " + propertyNames.map(function (name) {
                        return name + ": " + _this[name];
                    }).join(", ") + (propertyNames.length > 0 ? " " : "") + "}";
                };
            }
        };
        var misc_1 = require(36);
        for (var _i = 0, _a = Object.keys(exports); _i < _a.length; _i++) {
            var key = _a[_i];
            var value = exports[key];
            if (value instanceof Function) {
                addToString(value, key);
                misc_1.registerClassPrototype(value.prototype);
            }
        }
        for (var _b = 0, _c = Object.keys(drawing); _b < _c.length; _b++) {
            var key = _c[_b];
            var value = drawing[key];
            if (value instanceof Function) {
                addToString(value, "Drawing" + key);
                misc_1.registerClassPrototype(value.prototype);
            }
        }
    }, /* 8 ./renderers/clocks/auto */ function (exports, require) {
        var settings_1 = require(22);
        var manual_1 = require(10);
        /**
         * An implementation of libjass.renderers.Clock that automatically ticks and generates {@link libjass.renderers.ClockEvent}s according to the state of an external driver.
         *
         * For example, if you're using libjass to render subtitles on a canvas with your own video controls, these video controls will function as the driver to this AutoClock.
         * It would call {@link libjass.renderers.AutoClock.play}, {@link libjass.renderers.AutoClock.play}, etc. when the user pressed the corresponding video controls.
         *
         * The difference from ManualClock is that AutoClock does not require the driver to call something like {@link libjass.renderers.ManualClock.tick}. Instead it keeps its
         * own time with a high-resolution requestAnimationFrame-based timer.
         *
         * If using libjass with a <video> element, consider using {@link libjass.renderers.VideoClock} that uses the video element as a driver.
         *
         * @param {function():number} getCurrentTime A callback that will be invoked to get the current time of the external driver.
         * @param {number} currentTimeUpdateMaxDelay If two calls to getCurrentTime are more than currentTimeUpdateMaxDelay milliseconds apart, then the external driver will be
         * considered to have paused.
         *
         * @constructor
         * @implements {libjass.renderers.Clock}
         * @memberOf libjass.renderers
         */
        var AutoClock = function () {
            function AutoClock(getCurrentTime, currentTimeUpdateMaxDelay) {
                this._getCurrentTime = getCurrentTime;
                this._currentTimeUpdateMaxDelay = currentTimeUpdateMaxDelay;
                this._manualClock = new manual_1.ManualClock();
                this._nextAnimationFrameRequestId = null;
                this._lastKnownExternalTime = null;
                this._lastKnownExternalTimeObtainedAt = null;
            }
            /**
             * Tells the clock to start generating ticks.
             */
            AutoClock.prototype.play = function () {
                if (!this._manualClock.enabled) {
                    return;
                }
                this._startTicking();
                this._manualClock.play();
            };
            /**
             * Tells the clock to pause.
             */
            AutoClock.prototype.pause = function () {
                if (!this._manualClock.enabled) {
                    return;
                }
                if (this._nextAnimationFrameRequestId === null) {
                    if (settings_1.debugMode) {
                        console.warn("AutoClock.pause: Abnormal state detected. AutoClock._nextAnimationFrameRequestId should not have been null.");
                    }
                    return;
                }
                this._stopTicking();
                this._manualClock.pause();
            };
            /**
             * Tells the clock that the external driver is seeking.
             */
            AutoClock.prototype.seeking = function () {
                this._manualClock.seek(this._getCurrentTime());
            };
            Object.defineProperty(AutoClock.prototype, "currentTime", {
                // Clock members
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._manualClock.currentTime;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AutoClock.prototype, "enabled", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._manualClock.enabled;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AutoClock.prototype, "paused", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._manualClock.paused;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AutoClock.prototype, "rate", {
                /**
                 * Gets the rate of the clock - how fast the clock ticks compared to real time.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._manualClock.rate;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Sets the rate of the clock - how fast the clock ticks compared to real time.
             *
             * @param {number} rate The new rate of the clock.
             */
            AutoClock.prototype.setRate = function (rate) {
                this._manualClock.setRate(rate);
            };
            /**
             * Enable the clock.
             *
             * @return {boolean} True if the clock is now enabled, false if it was already enabled.
             */
            AutoClock.prototype.enable = function () {
                if (!this._manualClock.enable()) {
                    return false;
                }
                this._startTicking();
                return true;
            };
            /**
             * Disable the clock.
             *
             * @return {boolean} True if the clock is now disabled, false if it was already disabled.
             */
            AutoClock.prototype.disable = function () {
                if (!this._manualClock.disable()) {
                    return false;
                }
                this._stopTicking();
                return true;
            };
            /**
             * Toggle the clock.
             */
            AutoClock.prototype.toggle = function () {
                this._manualClock.toggle();
            };
            /**
             * Enable or disable the clock.
             *
             * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
             * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
             */
            AutoClock.prototype.setEnabled = function (enabled) {
                return this._manualClock.setEnabled(enabled);
            };
            /**
             * @param {number} type
             * @param {!Function} listener
             */
            AutoClock.prototype.addEventListener = function (type, listener) {
                this._manualClock.addEventListener(type, listener);
            };
            /**
             * @param {number} timeStamp
             *
             * @private
             */
            AutoClock.prototype._onTimerTick = function (timeStamp) {
                var _this = this;
                if (!this._manualClock.enabled) {
                    if (settings_1.debugMode) {
                        console.warn("AutoClock._onTimerTick: Called when disabled.");
                    }
                    return;
                }
                var currentTime = this._manualClock.currentTime;
                var currentExternalTime = this._getCurrentTime();
                if (!this._manualClock.paused) {
                    if (this._lastKnownExternalTime !== null && currentExternalTime === this._lastKnownExternalTime) {
                        if (timeStamp - this._lastKnownExternalTimeObtainedAt > this._currentTimeUpdateMaxDelay) {
                            this._lastKnownExternalTimeObtainedAt = null;
                            this._manualClock.pause();
                        } else {
                            this._manualClock.tick((timeStamp - this._lastKnownExternalTimeObtainedAt) / 1e3 * this._manualClock.rate + this._lastKnownExternalTime);
                        }
                    } else {
                        this._lastKnownExternalTime = currentExternalTime;
                        this._lastKnownExternalTimeObtainedAt = timeStamp;
                        this._manualClock.tick(currentExternalTime);
                    }
                } else {
                    if (currentTime !== currentExternalTime) {
                        this._lastKnownExternalTime = currentExternalTime;
                        this._lastKnownExternalTimeObtainedAt = timeStamp;
                        this._manualClock.tick(currentExternalTime);
                    }
                }
                this._nextAnimationFrameRequestId = requestAnimationFrame(function (timeStamp) {
                    return _this._onTimerTick(timeStamp);
                });
            };
            AutoClock.prototype._startTicking = function () {
                var _this = this;
                if (this._nextAnimationFrameRequestId === null) {
                    this._nextAnimationFrameRequestId = requestAnimationFrame(function (timeStamp) {
                        return _this._onTimerTick(timeStamp);
                    });
                }
            };
            AutoClock.prototype._stopTicking = function () {
                if (this._nextAnimationFrameRequestId !== null) {
                    cancelAnimationFrame(this._nextAnimationFrameRequestId);
                    this._nextAnimationFrameRequestId = null;
                }
            };
            return AutoClock;
        }();
        exports.AutoClock = AutoClock;
    }, /* 9 ./renderers/clocks/base */ function (exports) {
        /**
         * A mixin class that represents an event source.
         *
         * @constructor
         * @memberOf libjass.renderers
         * @template T
         */
        var EventSource = function () {
            function EventSource() {}
            /**
             * Add a listener for the given event.
             *
             * @param {!T} type The type of event to attach the listener for
             * @param {!Function} listener The listener
             */
            EventSource.prototype.addEventListener = function (type, listener) {
                var listeners = this._eventListeners.get(type);
                if (listeners === undefined) {
                    this._eventListeners.set(type, listeners = []);
                }
                listeners.push(listener);
            };
            /**
             * Calls all listeners registered for the given event type.
             *
             * @param {!T} type The type of event to dispatch
             * @param {!Array.<*>} args Arguments for the listeners of the event
             */
            EventSource.prototype._dispatchEvent = function (type, args) {
                var listeners = this._eventListeners.get(type);
                if (listeners !== undefined) {
                    for (var _i = 0; _i < listeners.length; _i++) {
                        var listener = listeners[_i];
                        listener.apply(this, args);
                    }
                }
            };
            return EventSource;
        }();
        exports.EventSource = EventSource;
        /**
         * The type of clock event.
         *
         * @enum
         * @memberOf libjass.renderers
         */
        (function (ClockEvent) {
            ClockEvent[ClockEvent["Play"] = 0] = "Play";
            ClockEvent[ClockEvent["Tick"] = 1] = "Tick";
            ClockEvent[ClockEvent["Pause"] = 2] = "Pause";
            ClockEvent[ClockEvent["Stop"] = 3] = "Stop";
            ClockEvent[ClockEvent["RateChange"] = 4] = "RateChange";
        })(exports.ClockEvent || (exports.ClockEvent = {}));
    }, /* 10 ./renderers/clocks/manual */ function (exports, require) {
        var mixin_1 = require(30);
        var map_1 = require(29);
        var base_1 = require(9);
        /**
         * An implementation of {@link libjass.renderers.Clock} that allows user script to manually trigger {@link libjass.renderers.ClockEvent}s.
         *
         * @constructor
         * @implements {libjass.renderers.Clock}
         * @implements {libjass.renderers.EventSource.<libjass.renderers.ClockEvent>}
         * @memberOf libjass.renderers
         */
        var ManualClock = function () {
            function ManualClock() {
                this._currentTime = -1;
                this._rate = 1;
                this._enabled = true;
                this._paused = true;
                // EventSource members
                /**
                 * @type {!Map.<T, !Array.<Function>>}
                 */
                this._eventListeners = new map_1.Map();
            }
            /**
             * Trigger a {@link libjass.renderers.ClockEvent.Play}
             */
            ManualClock.prototype.play = function () {
                if (!this._enabled) {
                    return;
                }
                if (!this._paused) {
                    return;
                }
                this._paused = false;
                this._dispatchEvent(base_1.ClockEvent.Play, []);
            };
            /**
             * Trigger a {@link libjass.renderers.ClockEvent.Tick} with the given time.
             *
             * @param {number} currentTime
             */
            ManualClock.prototype.tick = function (currentTime) {
                if (!this._enabled) {
                    return;
                }
                if (this._currentTime !== currentTime) {
                    this.play();
                }
                this._currentTime = currentTime;
                this._dispatchEvent(base_1.ClockEvent.Tick, []);
            };
            /**
             * Seek to the given time. Unlike {@link libjass.renderers.ManualClock.tick} this is used to represent a discontinuous jump, such as the user seeking
             * via the video element's position bar.
             *
             * @param {number} time
             */
            ManualClock.prototype.seek = function (time) {
                if (!this._enabled) {
                    return;
                }
                this.pause();
                if (this._currentTime === time) {
                    return;
                }
                this.stop();
                this.tick(time);
                this.pause();
            };
            /**
             * Trigger a {@link libjass.renderers.ClockEvent.Pause}
             */
            ManualClock.prototype.pause = function () {
                if (!this._enabled) {
                    return;
                }
                if (this._paused) {
                    return;
                }
                this._paused = true;
                this._dispatchEvent(base_1.ClockEvent.Pause, []);
            };
            /**
             * Trigger a {@link libjass.renderers.ClockEvent.Stop}
             */
            ManualClock.prototype.stop = function () {
                this._dispatchEvent(base_1.ClockEvent.Stop, []);
            };
            Object.defineProperty(ManualClock.prototype, "currentTime", {
                // Clock members
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._currentTime;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ManualClock.prototype, "enabled", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._enabled;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ManualClock.prototype, "paused", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._paused;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ManualClock.prototype, "rate", {
                /**
                 * Gets the rate of the clock - how fast the clock ticks compared to real time.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._rate;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Sets the rate of the clock - how fast the clock ticks compared to real time.
             *
             * @param {number} rate The new rate of the clock.
             */
            ManualClock.prototype.setRate = function (rate) {
                if (this._rate === rate) {
                    return;
                }
                this._rate = rate;
                this._dispatchEvent(base_1.ClockEvent.RateChange, []);
            };
            /**
             * Enable the clock.
             *
             * @return {boolean} True if the clock is now enabled, false if it was already enabled.
             */
            ManualClock.prototype.enable = function () {
                if (this._enabled) {
                    return false;
                }
                this._enabled = true;
                return true;
            };
            /**
             * Disable the clock.
             *
             * @return {boolean} True if the clock is now disabled, false if it was already disabled.
             */
            ManualClock.prototype.disable = function () {
                if (!this._enabled) {
                    return false;
                }
                this._enabled = false;
                this.pause();
                this.stop();
                return true;
            };
            /**
             * Toggle the clock.
             */
            ManualClock.prototype.toggle = function () {
                if (this._enabled) {
                    this.disable();
                } else {
                    this.enable();
                }
            };
            /**
             * Enable or disable the clock.
             *
             * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
             * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
             */
            ManualClock.prototype.setEnabled = function (enabled) {
                if (enabled) {
                    return this.enable();
                } else {
                    return this.disable();
                }
            };
            return ManualClock;
        }();
        exports.ManualClock = ManualClock;
        mixin_1.mixin(ManualClock, [ base_1.EventSource ]);
    }, /* 11 ./renderers/clocks/video */ function (exports, require) {
        var auto_1 = require(8);
        /**
         * An implementation of libjass.renderers.Clock that generates {@link libjass.renderers.ClockEvent}s according to the state of a <video> element.
         *
         * @param {!HTMLVideoElement} video
         *
         * @constructor
         * @implements {libjass.renderers.Clock}
         * @memberOf libjass.renderers
         */
        var VideoClock = function () {
            function VideoClock(video) {
                var _this = this;
                this._autoClock = new auto_1.AutoClock(function () {
                    return video.currentTime;
                }, 100);
                video.addEventListener("playing", function () {
                    return _this._autoClock.play();
                }, false);
                video.addEventListener("pause", function () {
                    return _this._autoClock.pause();
                }, false);
                video.addEventListener("seeking", function () {
                    return _this._autoClock.seeking();
                }, false);
                video.addEventListener("ratechange", function () {
                    return _this._autoClock.setRate(video.playbackRate);
                }, false);
            }
            Object.defineProperty(VideoClock.prototype, "currentTime", {
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._autoClock.currentTime;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VideoClock.prototype, "enabled", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._autoClock.enabled;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VideoClock.prototype, "paused", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._autoClock.paused;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(VideoClock.prototype, "rate", {
                /**
                 * Gets the rate of the clock - how fast the clock ticks compared to real time.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._autoClock.rate;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Enable the clock.
             *
             * @return {boolean} True if the clock is now enabled, false if it was already enabled.
             */
            VideoClock.prototype.enable = function () {
                return this._autoClock.enable();
            };
            /**
             * Disable the clock.
             *
             * @return {boolean} True if the clock is now disabled, false if it was already disabled.
             */
            VideoClock.prototype.disable = function () {
                return this._autoClock.disable();
            };
            /**
             * Toggle the clock.
             */
            VideoClock.prototype.toggle = function () {
                this._autoClock.toggle();
            };
            /**
             * Enable or disable the clock.
             *
             * @param {boolean} enabled If true, the clock is enabled, otherwise it's disabled.
             * @return {boolean} True if the clock is now in the given state, false if it was already in that state.
             */
            VideoClock.prototype.setEnabled = function (enabled) {
                return this._autoClock.setEnabled(enabled);
            };
            /**
             * @param {number} type
             * @param {!Function} listener
             */
            VideoClock.prototype.addEventListener = function (type, listener) {
                this._autoClock.addEventListener(type, listener);
            };
            return VideoClock;
        }();
        exports.VideoClock = VideoClock;
    }, /* 12 ./renderers/default */ function (exports, require) {
        var __extends = require(28).__extends;
        var video_1 = require(11);
        var renderer_1 = require(20);
        /**
         * A default renderer implementation.
         *
         * @param {!HTMLVideoElement} video
         * @param {!libjass.ASS} ass
         * @param {libjass.renderers.RendererSettings} settings
         *
         * @constructor
         * @extends {libjass.renderers.WebRenderer}
         * @memberOf libjass.renderers
         */
        var DefaultRenderer = function (_super) {
            __extends(DefaultRenderer, _super);
            function DefaultRenderer(video, ass, settings) {
                _super.call(this, ass, new video_1.VideoClock(video), document.createElement("div"), settings);
                this._video = video;
                this._videoIsFullScreen = false;
                this._video.parentElement.replaceChild(this.libjassSubsWrapper, this._video);
                this.libjassSubsWrapper.insertBefore(this._video, this.libjassSubsWrapper.firstElementChild);
            }
            /**
             * @deprecated
             *
             * @param {number} width
             * @param {number} height
             */
            DefaultRenderer.prototype.resizeVideo = function (width, height) {
                console.warn("`DefaultRenderer.resizeVideo(width, height)` has been deprecated. Use `DefaultRenderer.resize(width, height)` instead.");
                this.resize(width, height);
            };
            DefaultRenderer.prototype._ready = function () {
                var _this = this;
                document.addEventListener("mozfullscreenchange", function () {
                    return _this._onFullScreenChange(document.mozFullScreenElement);
                }, false);
                document.addEventListener("webkitfullscreenchange", function () {
                    return _this._onFullScreenChange(document.webkitFullscreenElement);
                }, false);
                document.addEventListener("fullscreenchange", function () {
                    return _this._onFullScreenChange(document.fullscreenElement);
                }, false);
                this.resize(this._video.offsetWidth, this._video.offsetHeight);
                _super.prototype._ready.call(this);
            };
            /**
             * @param {!Element} fullScreenElement
             *
             * @private
             */
            DefaultRenderer.prototype._onFullScreenChange = function (fullScreenElement) {
                if (fullScreenElement === undefined) {
                    fullScreenElement = document.msFullscreenElement;
                }
                if (fullScreenElement === this._video) {
                    this.libjassSubsWrapper.classList.add("libjass-full-screen");
                    this.resize(screen.width, screen.height);
                    this._videoIsFullScreen = true;
                    this._dispatchEvent("fullScreenChange", [ this._videoIsFullScreen ]);
                } else if (fullScreenElement === null && this._videoIsFullScreen) {
                    this.libjassSubsWrapper.classList.remove("libjass-full-screen");
                    this._videoIsFullScreen = false;
                    this._dispatchEvent("fullScreenChange", [ this._videoIsFullScreen ]);
                }
            };
            return DefaultRenderer;
        }(renderer_1.WebRenderer);
        exports.DefaultRenderer = DefaultRenderer;
    }, /* 13 ./renderers/index */ function (exports, require) {
        var base_1 = require(9);
        exports.ClockEvent = base_1.ClockEvent;
        exports.EventSource = base_1.EventSource;
        var auto_1 = require(8);
        exports.AutoClock = auto_1.AutoClock;
        var manual_1 = require(10);
        exports.ManualClock = manual_1.ManualClock;
        var video_1 = require(11);
        exports.VideoClock = video_1.VideoClock;
        var default_1 = require(12);
        exports.DefaultRenderer = default_1.DefaultRenderer;
        var null_1 = require(14);
        exports.NullRenderer = null_1.NullRenderer;
        var renderer_1 = require(20);
        exports.WebRenderer = renderer_1.WebRenderer;
        var settings_1 = require(15);
        exports.RendererSettings = settings_1.RendererSettings;
    }, /* 14 ./renderers/null */ function (exports, require) {
        var base_1 = require(9);
        var settings_1 = require(15);
        var settings_2 = require(22);
        /**
         * A renderer implementation that doesn't output anything.
         *
         * @param {!libjass.ASS} ass
         * @param {!libjass.renderers.Clock} clock
         * @param {libjass.renderers.RendererSettings} settings
         *
         * @constructor
         * @memberOf libjass.renderers
         */
        var NullRenderer = function () {
            function NullRenderer(ass, clock, settings) {
                var _this = this;
                this._ass = ass;
                this._clock = clock;
                this._id = ++NullRenderer._lastRendererId;
                this._settings = settings_1.RendererSettings.from(settings);
                this._clock.addEventListener(base_1.ClockEvent.Play, function () {
                    return _this._onClockPlay();
                });
                this._clock.addEventListener(base_1.ClockEvent.Tick, function () {
                    return _this._onClockTick();
                });
                this._clock.addEventListener(base_1.ClockEvent.Pause, function () {
                    return _this._onClockPause();
                });
                this._clock.addEventListener(base_1.ClockEvent.Stop, function () {
                    return _this._onClockStop();
                });
                this._clock.addEventListener(base_1.ClockEvent.RateChange, function () {
                    return _this._onClockRateChange();
                });
            }
            Object.defineProperty(NullRenderer.prototype, "id", {
                /**
                 * The unique ID of this renderer. Auto-generated.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._id;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(NullRenderer.prototype, "ass", {
                /**
                 * @type {!libjass.ASS}
                 */
                get: function () {
                    return this._ass;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(NullRenderer.prototype, "clock", {
                /**
                 * @type {!libjass.renderers.Clock}
                 */
                get: function () {
                    return this._clock;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(NullRenderer.prototype, "settings", {
                /**
                 * @type {!libjass.renderers.RendererSettings}
                 */
                get: function () {
                    return this._settings;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Pre-render a dialogue. This is a no-op for this type.
             *
             * @param {!libjass.Dialogue} dialogue
             */
            NullRenderer.prototype.preRender = function () {};
            /**
             * Draw a dialogue. This is a no-op for this type.
             *
             * @param {!libjass.Dialogue} dialogue
             */
            NullRenderer.prototype.draw = function () {};
            /**
             * Enable the renderer.
             *
             * @return {boolean} True if the renderer is now enabled, false if it was already enabled.
             */
            NullRenderer.prototype.enable = function () {
                return this._clock.enable();
            };
            /**
             * Disable the renderer.
             *
             * @return {boolean} True if the renderer is now disabled, false if it was already disabled.
             */
            NullRenderer.prototype.disable = function () {
                return this._clock.disable();
            };
            /**
             * Toggle the renderer.
             */
            NullRenderer.prototype.toggle = function () {
                this._clock.toggle();
            };
            /**
             * Enable or disable the renderer.
             *
             * @param {boolean} enabled If true, the renderer is enabled, otherwise it's disabled.
             * @return {boolean} True if the renderer is now in the given state, false if it was already in that state.
             */
            NullRenderer.prototype.setEnabled = function (enabled) {
                return this._clock.setEnabled(enabled);
            };
            Object.defineProperty(NullRenderer.prototype, "enabled", {
                /**
                 * @type {boolean}
                 */
                get: function () {
                    return this._clock.enabled;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Runs when the clock is enabled, or starts playing, or is resumed from pause.
             *
             * @protected
             */
            NullRenderer.prototype._onClockPlay = function () {
                if (settings_2.verboseMode) {
                    console.log("NullRenderer._onClockPlay");
                }
            };
            /**
             * Runs when the clock's current time changed. This might be a result of either regular playback or seeking.
             *
             * @protected
             */
            NullRenderer.prototype._onClockTick = function () {
                var currentTime = this._clock.currentTime;
                if (settings_2.verboseMode) {
                    console.log("NullRenderer._onClockTick: currentTime = " + currentTime);
                }
                for (var _i = 0, _a = this._ass.dialogues; _i < _a.length; _i++) {
                    var dialogue = _a[_i];
                    if (dialogue.end > currentTime) {
                        if (dialogue.start <= currentTime) {
                            // This dialogue is visible right now. Draw it.
                            this.draw(dialogue);
                        } else if (dialogue.start <= currentTime + this._settings.preRenderTime) {
                            // This dialogue will be visible soon. Pre-render it.
                            this.preRender(dialogue);
                        }
                    }
                }
            };
            /**
             * Runs when the clock is paused.
             *
             * @protected
             */
            NullRenderer.prototype._onClockPause = function () {
                if (settings_2.verboseMode) {
                    console.log("NullRenderer._onClockPause");
                }
            };
            /**
             * Runs when the clock is disabled.
             *
             * @protected
             */
            NullRenderer.prototype._onClockStop = function () {
                if (settings_2.verboseMode) {
                    console.log("NullRenderer._onClockStop");
                }
            };
            /**
             * Runs when the clock changes its rate.
             *
             * @protected
             */
            NullRenderer.prototype._onClockRateChange = function () {
                if (settings_2.verboseMode) {
                    console.log("NullRenderer._onClockRateChange");
                }
            };
            NullRenderer._lastRendererId = -1;
            return NullRenderer;
        }();
        exports.NullRenderer = NullRenderer;
    }, /* 15 ./renderers/settings */ function (exports, require) {
        var map_1 = require(29);
        /**
         * Settings for the renderer.
         *
         * @constructor
         * @memberOf libjass.renderers
         */
        var RendererSettings = function () {
            function RendererSettings() {}
            /**
             * A convenience method to create a font map from a <style> or <link> element that contains @font-face rules. There should be one @font-face rule for each font name, mapping to a font file URL.
             *
             * For example:
             *
             *     @font-face {
             *         font-family: "Helvetica";
             *         src: url("/fonts/helvetica.ttf");
             *     }
             *
             * @param {!LinkStyle} linkStyle
             * @return {!Map.<string, !Array.<string>>}
             *
             * @static
             */
            RendererSettings.makeFontMapFromStyleElement = function (linkStyle) {
                var fontMap = new map_1.Map();
                var styleSheet = linkStyle.sheet;
                var rules = Array.prototype.filter.call(styleSheet.cssRules, function (rule) {
                    return rule.type === CSSRule.FONT_FACE_RULE;
                });
                for (var _i = 0; _i < rules.length; _i++) {
                    var rule = rules[_i];
                    var src = rule.style.getPropertyValue("src");
                    if (!src) {
                        src = rule.cssText.split("\n").map(function (line) {
                            return line.match(/src: ([^;]+);/);
                        }).filter(function (matches) {
                            return matches !== null;
                        }).map(function (matches) {
                            return matches[1];
                        })[0];
                    }
                    var urls = src.split(/,\s*/).map(function (url) {
                        return RendererSettings._stripQuotes(url.match(/^url\((.+)\)$/)[1]);
                    });
                    if (urls.length > 0) {
                        var name = RendererSettings._stripQuotes(rule.style.getPropertyValue("font-family"));
                        var existingList = fontMap.get(name);
                        if (existingList === undefined) {
                            existingList = [];
                            fontMap.set(name, existingList);
                        }
                        existingList.unshift.apply(existingList, urls);
                    }
                }
                return fontMap;
            };
            /**
             * Converts an arbitrary object into a {@link libjass.renderers.RendererSettings} object.
             *
             * @param {*} object
             * @return {!libjass.renderers.RendererSettings}
             *
             * @static
             */
            RendererSettings.from = function (object) {
                if (object === undefined || object === null) {
                    object = {};
                }
                var _a = object, _b = _a.fontMap, fontMap = _b === void 0 ? null : _b, _c = _a.preRenderTime, preRenderTime = _c === void 0 ? 5 : _c, _d = _a.preciseOutlines, preciseOutlines = _d === void 0 ? false : _d, _e = _a.enableSvg, enableSvg = _e === void 0 ? true : _e;
                var result = new RendererSettings();
                result.fontMap = fontMap;
                result.preRenderTime = preRenderTime;
                result.preciseOutlines = preciseOutlines;
                result.enableSvg = enableSvg;
                return result;
            };
            /**
             * @param {string} str
             * @return {string}
             *
             * @private
             * @static
             */
            RendererSettings._stripQuotes = function (str) {
                return str.match(/^["']?(.*?)["']?$/)[1];
            };
            return RendererSettings;
        }();
        exports.RendererSettings = RendererSettings;
    }, /* 16 ./renderers/web/animation-collection */ function (exports, require) {
        var map_1 = require(29);
        /**
         * This class represents a collection of animations. Each animation contains one or more keyframes.
         * The collection can then be converted to a CSS3 representation.
         *
         * @param {!libjass.renderers.NullRenderer} renderer The renderer that this collection is associated with
         *
         * @constructor
         */
        var AnimationCollection = function () {
            function AnimationCollection(renderer) {
                this._cssText = "";
                this._animationStyle = "";
                this._animationDelays = new map_1.Map();
                this._numAnimations = 0;
                this._id = renderer.id + "-" + AnimationCollection._nextId++;
                this._rate = renderer.clock.rate;
            }
            Object.defineProperty(AnimationCollection.prototype, "cssText", {
                /**
                 * This string contains the animation definitions and should be inserted into a <style> element.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._cssText;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AnimationCollection.prototype, "animationStyle", {
                /**
                 * This string should be set as the "animation" CSS property of the target element.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._animationStyle;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(AnimationCollection.prototype, "animationDelays", {
                /**
                 * This array should be used to set the "animation-delay" CSS property of the target element.
                 *
                 * @type {!Array.<number>}
                 */
                get: function () {
                    return this._animationDelays;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Add an animation to this collection. The given keyframes together make one animation.
             *
             * @param {string} timingFunction One of the acceptable values for the "animation-timing-function" CSS property
             * @param {!Array.<!libjass.renderers.Keyframe>} keyframes
             */
            AnimationCollection.prototype.add = function (timingFunction, keyframes) {
                var start = null;
                var end = null;
                for (var _i = 0; _i < keyframes.length; _i++) {
                    var keyframe = keyframes[_i];
                    if (start === null) {
                        start = keyframe.time;
                    }
                    end = keyframe.time;
                }
                var ruleCssText = "";
                for (var _a = 0; _a < keyframes.length; _a++) {
                    var keyframe = keyframes[_a];
                    ruleCssText += "	" + (100 * (end - start === 0 ? 1 : (keyframe.time - start) / (end - start))).toFixed(3) + "% {\n";
                    keyframe.properties.forEach(function (value, name) {
                        ruleCssText += "		" + name + ": " + value + ";\n";
                    });
                    ruleCssText += "	}\n";
                }
                var animationName = "animation-" + this._id + "-" + this._numAnimations++;
                this._cssText += "@-webkit-keyframes " + animationName + " {\n" + ruleCssText + "\n}\n\n@keyframes " + animationName + " {\n" + ruleCssText + "\n}\n\n";
                if (this._animationStyle !== "") {
                    this._animationStyle += ",";
                }
                this._animationStyle += animationName + " " + ((end - start) / this._rate).toFixed(3) + "s " + timingFunction;
                this._animationDelays.set(animationName, start);
            };
            AnimationCollection._nextId = 0;
            return AnimationCollection;
        }();
        exports.AnimationCollection = AnimationCollection;
    }, /* 17 ./renderers/web/dom-parser */ function (exports) {
        /** @type {!DomParser} */
        exports.domParser = null;
        if (typeof DOMParser !== "undefined") {
            exports.domParser = new DOMParser();
        }
    }, /* 18 ./renderers/web/drawing-styles */ function (exports, require) {
        var dom_parser_1 = require(17);
        var parts = require(7);
        /**
         * This class represents an ASS drawing - a set of drawing instructions between {\p} tags.
         *
         * @param {number} outputScaleX
         * @param {number} outputScaleY
         *
         * @constructor
         */
        var DrawingStyles = function () {
            function DrawingStyles(outputScaleX, outputScaleY) {
                this._outputScaleX = outputScaleX;
                this._outputScaleY = outputScaleY;
                this._scale = 1;
                this._baselineOffset = 0;
            }
            Object.defineProperty(DrawingStyles.prototype, "scale", {
                /**
                 * @type {number}
                 */
                set: function (value) {
                    this._scale = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DrawingStyles.prototype, "baselineOffset", {
                /**
                 * @type {number}
                 */
                set: function (value) {
                    this._baselineOffset = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Converts this drawing to an <svg> element.
             *
             * @param {!libjass.parts.DrawingInstructions} drawingInstructions
             * @param {!libjass.parts.Color} fillColor
             * @return {!SVGSVGElement}
             */
            DrawingStyles.prototype.toSVG = function (drawingInstructions, fillColor) {
                var scaleFactor = Math.pow(2, this._scale - 1);
                var scaleX = this._outputScaleX / scaleFactor;
                var scaleY = this._outputScaleY / scaleFactor;
                var path = "";
                var bboxWidth = 0;
                var bboxHeight = 0;
                for (var _i = 0, _a = drawingInstructions.instructions; _i < _a.length; _i++) {
                    var instruction = _a[_i];
                    if (instruction instanceof parts.drawing.MoveInstruction) {
                        path += " M " + instruction.x + " " + (instruction.y + this._baselineOffset);
                        bboxWidth = Math.max(bboxWidth, instruction.x);
                        bboxHeight = Math.max(bboxHeight, instruction.y + this._baselineOffset);
                    } else if (instruction instanceof parts.drawing.LineInstruction) {
                        path += " L " + instruction.x + " " + (instruction.y + this._baselineOffset);
                        bboxWidth = Math.max(bboxWidth, instruction.x);
                        bboxHeight = Math.max(bboxHeight, instruction.y + this._baselineOffset);
                    } else if (instruction instanceof parts.drawing.CubicBezierCurveInstruction) {
                        path += " C " + instruction.x1 + " " + (instruction.y1 + this._baselineOffset) + ", " + instruction.x2 + " " + (instruction.y2 + this._baselineOffset) + ", " + instruction.x3 + " " + (instruction.y3 + this._baselineOffset);
                        bboxWidth = Math.max(bboxWidth, instruction.x1, instruction.x2, instruction.x3);
                        bboxHeight = Math.max(bboxHeight, instruction.y1 + this._baselineOffset, instruction.y2 + this._baselineOffset, instruction.y3 + this._baselineOffset);
                    }
                }
                var result = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + (bboxWidth * scaleX).toFixed(3) + 'px" height="' + (bboxHeight * scaleY).toFixed(3) + 'px">\n<g transform="scale(' + scaleX.toFixed(3) + " " + scaleY.toFixed(3) + ')">\n	<path d="' + path + '" fill="' + fillColor.toString() + '" />\n</g>\n</svg>';
                return dom_parser_1.domParser.parseFromString(result, "image/svg+xml").childNodes[0];
            };
            return DrawingStyles;
        }();
        exports.DrawingStyles = DrawingStyles;
    }, /* 19 ./renderers/web/keyframe */ function (exports) {
        /**
         * This class represents a single keyframe. It has a list of CSS properties (names and values) associated with a point in time. Multiple keyframes make up an animation.
         *
         * @param {number} time
         * @param {!Map.<string, string>} properties
         *
         * @constructor
         */
        var Keyframe = function () {
            function Keyframe(time, properties) {
                this._time = time;
                this._properties = properties;
            }
            Object.defineProperty(Keyframe.prototype, "time", {
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._time;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Keyframe.prototype, "properties", {
                /**
                 * @type {!Map.<string, string>}
                 */
                get: function () {
                    return this._properties;
                },
                enumerable: true,
                configurable: true
            });
            return Keyframe;
        }();
        exports.Keyframe = Keyframe;
    }, /* 20 ./renderers/web/renderer */ function (exports, require) {
        var __extends = require(28).__extends;
        var animation_collection_1 = require(16);
        var drawing_styles_1 = require(18);
        var keyframe_1 = require(19);
        var span_styles_1 = require(21);
        var base_1 = require(9);
        var null_1 = require(14);
        var parts = require(7);
        var settings_1 = require(22);
        var misc_1 = require(25);
        var mixin_1 = require(30);
        var map_1 = require(29);
        var set_1 = require(32);
        var promise_1 = require(31);
        /**
         * A renderer implementation that draws subtitles to the given <div>
         *
         * @param {!libjass.ASS} ass
         * @param {!libjass.renderers.Clock} clock
         * @param {!HTMLDivElement} libjassSubsWrapper Subtitles will be rendered to this <div>
         * @param {!libjass.renderers.RendererSettings} settings
         *
         * @constructor
         * @extends {libjass.renderers.NullRenderer}
         * @implements {libjass.renderers.EventSource.<string>}
         * @memberOf libjass.renderers
         */
        var WebRenderer = function (_super) {
            __extends(WebRenderer, _super);
            function WebRenderer(ass, clock, libjassSubsWrapper, settings) {
                var _this = this;
                _super.call(this, ass, clock, function () {
                    if (!(libjassSubsWrapper instanceof HTMLDivElement)) {
                        var temp = settings;
                        settings = libjassSubsWrapper;
                        libjassSubsWrapper = temp;
                        console.warn("WebRenderer's constructor now takes libjassSubsWrapper as the third parameter and settings as the fourth parameter. Please update the caller.");
                    }
                    return settings;
                }());
                this._libjassSubsWrapper = libjassSubsWrapper;
                this._layerWrappers = [];
                this._layerAlignmentWrappers = [];
                this._currentSubs = new map_1.Map();
                this._preRenderedSubs = new map_1.Map();
                // EventSource members
                /**
                 * @type {!Map.<T, !Array.<Function>>}
                 */
                this._eventListeners = new map_1.Map();
                this._libjassSubsWrapper.classList.add("libjass-wrapper");
                this._subsWrapper = document.createElement("div");
                this._libjassSubsWrapper.appendChild(this._subsWrapper);
                this._subsWrapper.className = "libjass-subs";
                this._fontSizeElement = document.createElement("div");
                this._libjassSubsWrapper.appendChild(this._fontSizeElement);
                this._fontSizeElement.className = "libjass-font-measure";
                this._fontSizeElement.appendChild(document.createTextNode("M"));
                this._animationStyleElement = document.createElement("style");
                this._animationStyleElement.id = "libjass-animation-styles-" + this.id;
                this._animationStyleElement.type = "text/css";
                document.querySelector("head").appendChild(this._animationStyleElement);
                var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                this._libjassSubsWrapper.appendChild(svgElement);
                svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                svgElement.setAttribute("version", "1.1");
                svgElement.setAttribute("class", "libjass-filters");
                svgElement.setAttribute("width", "0");
                svgElement.setAttribute("height", "0");
                this._svgDefsElement = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                svgElement.appendChild(this._svgDefsElement);
                // Preload fonts
                var urlsToPreload = new set_1.Set();
                if (this.settings.fontMap !== null) {
                    this.settings.fontMap.forEach(function (srcs) {
                        for (var _i = 0; _i < srcs.length; _i++) {
                            var src = srcs[_i];
                            urlsToPreload.add(src);
                        }
                    });
                }
                if (settings_1.debugMode) {
                    console.log("Preloading " + urlsToPreload.size + " fonts...");
                }
                var xhrPromises = [];
                urlsToPreload.forEach(function (url) {
                    xhrPromises.push(new promise_1.Promise(function (resolve) {
                        var xhr = new XMLHttpRequest();
                        xhr.addEventListener("load", function () {
                            if (settings_1.debugMode) {
                                console.log("Preloaded " + url + ".");
                            }
                            resolve(null);
                        });
                        xhr.open("GET", url, true);
                        xhr.send();
                    }));
                });
                promise_1.Promise.all(xhrPromises).then(function () {
                    if (settings_1.debugMode) {
                        console.log("All fonts have been preloaded.");
                    }
                    _this._ready();
                });
            }
            Object.defineProperty(WebRenderer.prototype, "libjassSubsWrapper", {
                /**
                 * @type {!HTMLDivElement}
                 */
                get: function () {
                    return this._libjassSubsWrapper;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Resize the subtitles to the given new dimensions.
             *
             * @param {number} width
             * @param {number} height
             */
            WebRenderer.prototype.resize = function (width, height) {
                this._removeAllSubs();
                var ratio = Math.min(width / this.ass.properties.resolutionX, height / this.ass.properties.resolutionY);
                var subsWrapperWidth = this.ass.properties.resolutionX * ratio;
                var subsWrapperHeight = this.ass.properties.resolutionY * ratio;
                this._subsWrapper.style.width = subsWrapperWidth.toFixed(3) + "px";
                this._subsWrapper.style.height = subsWrapperHeight.toFixed(3) + "px";
                this._subsWrapper.style.left = ((width - subsWrapperWidth) / 2).toFixed(3) + "px";
                this._subsWrapper.style.top = ((height - subsWrapperHeight) / 2).toFixed(3) + "px";
                this._scaleX = subsWrapperWidth / this.ass.properties.resolutionX;
                this._scaleY = subsWrapperHeight / this.ass.properties.resolutionY;
                // Any dialogues which have been pre-rendered will need to be pre-rendered again.
                this._preRenderedSubs.clear();
                if (this._animationStyleElement !== null) {
                    while (this._animationStyleElement.firstChild !== null) {
                        this._animationStyleElement.removeChild(this._animationStyleElement.firstChild);
                    }
                }
                while (this._svgDefsElement.firstChild !== null) {
                    this._svgDefsElement.removeChild(this._svgDefsElement.firstChild);
                }
                // this.currentTime will be -1 if resize() is called before the clock begins playing for the first time. In this situation, there is no need to force a redraw.
                if (this.clock.currentTime !== -1) {
                    this._onClockTick();
                }
            };
            /**
             * The magic happens here. The subtitle div is rendered and stored. Call {@link libjass.renderers.WebRenderer.draw} to get a clone of the div to display.
             *
             * @param {!libjass.Dialogue} dialogue
             */
            WebRenderer.prototype.preRender = function (dialogue) {
                var _this = this;
                if (this._preRenderedSubs.has(dialogue.id)) {
                    return;
                }
                var sub = document.createElement("div");
                sub.style.marginLeft = (this._scaleX * dialogue.style.marginLeft).toFixed(3) + "px";
                sub.style.marginRight = (this._scaleX * dialogue.style.marginRight).toFixed(3) + "px";
                sub.style.marginTop = sub.style.marginBottom = (this._scaleY * dialogue.style.marginVertical).toFixed(3) + "px";
                sub.style.minWidth = (this._subsWrapper.offsetWidth - this._scaleX * (dialogue.style.marginLeft + dialogue.style.marginRight)).toFixed(3) + "px";
                var dialogueAnimationCollection = new animation_collection_1.AnimationCollection(this);
                var currentSpan = null;
                var currentSpanStyles = new span_styles_1.SpanStyles(this, dialogue, this._scaleX, this._scaleY, this.settings, this._fontSizeElement, this._svgDefsElement);
                var currentAnimationCollection = null;
                var previousAddNewLine = false;
                // If two or more \N's are encountered in sequence, then all but the first will be created using currentSpanStyles.makeNewLine() instead
                var startNewSpan = function (addNewLine) {
                    if (currentSpan !== null && currentSpan.textContent !== "") {
                        sub.appendChild(currentSpanStyles.setStylesOnSpan(currentSpan, currentAnimationCollection, _this._animationStyleElement));
                    }
                    if (currentAnimationCollection !== null) {
                        currentAnimationCollection.animationDelays.forEach(function (delay, name) {
                            return dialogueAnimationCollection.animationDelays.set(name, delay);
                        });
                    }
                    if (addNewLine) {
                        if (previousAddNewLine) {
                            sub.appendChild(currentSpanStyles.makeNewLine());
                        } else {
                            sub.appendChild(document.createElement("br"));
                        }
                    }
                    currentSpan = document.createElement("span");
                    currentAnimationCollection = new animation_collection_1.AnimationCollection(_this);
                    previousAddNewLine = addNewLine;
                };
                startNewSpan(false);
                var currentDrawingStyles = new drawing_styles_1.DrawingStyles(this._scaleX, this._scaleY);
                var wrappingStyle = this.ass.properties.wrappingStyle;
                var karaokeTimesAccumulator = 0;
                for (var _i = 0, _a = dialogue.parts; _i < _a.length; _i++) {
                    var part = _a[_i];
                    if (part instanceof parts.Italic) {
                        currentSpanStyles.italic = part.value;
                    } else if (part instanceof parts.Bold) {
                        currentSpanStyles.bold = part.value;
                    } else if (part instanceof parts.Underline) {
                        currentSpanStyles.underline = part.value;
                    } else if (part instanceof parts.StrikeThrough) {
                        currentSpanStyles.strikeThrough = part.value;
                    } else if (part instanceof parts.Border) {
                        currentSpanStyles.outlineWidth = part.value;
                        currentSpanStyles.outlineHeight = part.value;
                    } else if (part instanceof parts.BorderX) {
                        currentSpanStyles.outlineWidth = part.value;
                    } else if (part instanceof parts.BorderY) {
                        currentSpanStyles.outlineHeight = part.value;
                    } else if (part instanceof parts.Shadow) {
                        currentSpanStyles.shadowDepthX = part.value;
                        currentSpanStyles.shadowDepthY = part.value;
                    } else if (part instanceof parts.ShadowX) {
                        currentSpanStyles.shadowDepthX = part.value;
                    } else if (part instanceof parts.ShadowY) {
                        currentSpanStyles.shadowDepthY = part.value;
                    } else if (part instanceof parts.Blur) {
                        currentSpanStyles.blur = part.value;
                    } else if (part instanceof parts.GaussianBlur) {
                        currentSpanStyles.gaussianBlur = part.value;
                    } else if (part instanceof parts.FontName) {
                        currentSpanStyles.fontName = part.value;
                    } else if (part instanceof parts.FontSize) {
                        currentSpanStyles.fontSize = part.value;
                    } else if (part instanceof parts.FontSizePlus) {
                        currentSpanStyles.fontSize += part.value;
                    } else if (part instanceof parts.FontSizeMinus) {
                        currentSpanStyles.fontSize -= part.value;
                    } else if (part instanceof parts.FontScaleX) {
                        currentSpanStyles.fontScaleX = part.value;
                    } else if (part instanceof parts.FontScaleY) {
                        currentSpanStyles.fontScaleY = part.value;
                    } else if (part instanceof parts.LetterSpacing) {
                        currentSpanStyles.letterSpacing = part.value;
                    } else if (part instanceof parts.RotateX) {
                        currentSpanStyles.rotationX = part.value;
                    } else if (part instanceof parts.RotateY) {
                        currentSpanStyles.rotationY = part.value;
                    } else if (part instanceof parts.RotateZ) {
                        currentSpanStyles.rotationZ = part.value;
                    } else if (part instanceof parts.SkewX) {
                        currentSpanStyles.skewX = part.value;
                    } else if (part instanceof parts.SkewY) {
                        currentSpanStyles.skewY = part.value;
                    } else if (part instanceof parts.PrimaryColor) {
                        currentSpanStyles.primaryColor = part.value;
                    } else if (part instanceof parts.SecondaryColor) {
                        currentSpanStyles.secondaryColor = part.value;
                    } else if (part instanceof parts.OutlineColor) {
                        currentSpanStyles.outlineColor = part.value;
                    } else if (part instanceof parts.ShadowColor) {
                        currentSpanStyles.shadowColor = part.value;
                    } else if (part instanceof parts.Alpha) {
                        currentSpanStyles.primaryAlpha = part.value;
                        currentSpanStyles.secondaryAlpha = part.value;
                        currentSpanStyles.outlineAlpha = part.value;
                        currentSpanStyles.shadowAlpha = part.value;
                    } else if (part instanceof parts.PrimaryAlpha) {
                        currentSpanStyles.primaryAlpha = part.value;
                    } else if (part instanceof parts.SecondaryAlpha) {
                        currentSpanStyles.secondaryAlpha = part.value;
                    } else if (part instanceof parts.OutlineAlpha) {
                        currentSpanStyles.outlineAlpha = part.value;
                    } else if (part instanceof parts.ShadowAlpha) {
                        currentSpanStyles.shadowAlpha = part.value;
                    } else if (part instanceof parts.Alignment) {} else if (part instanceof parts.ColorKaraoke) {
                        startNewSpan(false);
                        currentAnimationCollection.add("step-end", [ new keyframe_1.Keyframe(0, new map_1.Map([ [ "color", currentSpanStyles.secondaryColor.withAlpha(currentSpanStyles.secondaryAlpha).toString() ] ])), new keyframe_1.Keyframe(karaokeTimesAccumulator, new map_1.Map([ [ "color", currentSpanStyles.primaryColor.withAlpha(currentSpanStyles.primaryAlpha).toString() ] ])) ]);
                        karaokeTimesAccumulator += part.duration;
                    } else if (part instanceof parts.WrappingStyle) {
                        wrappingStyle = part.value;
                    } else if (part instanceof parts.Reset) {
                        currentSpanStyles.reset(this.ass.styles.get(part.value));
                    } else if (part instanceof parts.Position) {
                        sub.style.position = "absolute";
                        sub.style.left = (this._scaleX * part.x).toFixed(3) + "px";
                        sub.style.top = (this._scaleY * part.y).toFixed(3) + "px";
                    } else if (part instanceof parts.Move) {
                        sub.style.position = "absolute";
                        dialogueAnimationCollection.add("linear", [ new keyframe_1.Keyframe(0, new map_1.Map([ [ "left", (this._scaleX * part.x1).toFixed(3) + "px" ], [ "top", (this._scaleY * part.y1).toFixed(3) + "px" ] ])), new keyframe_1.Keyframe(part.t1, new map_1.Map([ [ "left", (this._scaleX * part.x1).toFixed(3) + "px" ], [ "top", (this._scaleY * part.y1).toFixed(3) + "px" ] ])), new keyframe_1.Keyframe(part.t2, new map_1.Map([ [ "left", (this._scaleX * part.x2).toFixed(3) + "px" ], [ "top", (this._scaleY * part.y2).toFixed(3) + "px" ] ])), new keyframe_1.Keyframe(dialogue.end - dialogue.start, new map_1.Map([ [ "left", (this._scaleX * part.x2).toFixed(3) + "px" ], [ "top", (this._scaleY * part.y2).toFixed(3) + "px" ] ])) ]);
                    } else if (part instanceof parts.Fade) {
                        dialogueAnimationCollection.add("linear", [ new keyframe_1.Keyframe(0, new map_1.Map([ [ "opacity", "0" ] ])), new keyframe_1.Keyframe(part.start, new map_1.Map([ [ "opacity", "1" ] ])), new keyframe_1.Keyframe(dialogue.end - dialogue.start - part.end, new map_1.Map([ [ "opacity", "1" ] ])), new keyframe_1.Keyframe(dialogue.end - dialogue.start, new map_1.Map([ [ "opacity", "0" ] ])) ]);
                    } else if (part instanceof parts.ComplexFade) {
                        dialogueAnimationCollection.add("linear", [ new keyframe_1.Keyframe(0, new map_1.Map([ [ "opacity", part.a1.toFixed(3) ] ])), new keyframe_1.Keyframe(part.t1, new map_1.Map([ [ "opacity", part.a1.toFixed(3) ] ])), new keyframe_1.Keyframe(part.t2, new map_1.Map([ [ "opacity", part.a2.toFixed(3) ] ])), new keyframe_1.Keyframe(part.t3, new map_1.Map([ [ "opacity", part.a2.toFixed(3) ] ])), new keyframe_1.Keyframe(part.t4, new map_1.Map([ [ "opacity", part.a3.toFixed(3) ] ])), new keyframe_1.Keyframe(dialogue.end - dialogue.start, new map_1.Map([ [ "opacity", part.a3.toFixed(3) ] ])) ]);
                    } else if (part instanceof parts.DrawingMode) {
                        if (part.scale !== 0) {
                            currentDrawingStyles.scale = part.scale;
                        }
                    } else if (part instanceof parts.DrawingBaselineOffset) {
                        currentDrawingStyles.baselineOffset = part.value;
                    } else if (part instanceof parts.DrawingInstructions) {
                        currentSpan.appendChild(currentDrawingStyles.toSVG(part, currentSpanStyles.primaryColor.withAlpha(currentSpanStyles.primaryAlpha)));
                        startNewSpan(false);
                    } else if (part instanceof parts.Text) {
                        currentSpan.appendChild(document.createTextNode(part.value));
                        startNewSpan(false);
                    } else if (settings_1.debugMode && part instanceof parts.Comment) {
                        currentSpan.appendChild(document.createTextNode(part.value));
                        startNewSpan(false);
                    } else if (part instanceof parts.NewLine) {
                        startNewSpan(true);
                    }
                }
                for (var _b = 0, _c = dialogue.parts; _b < _c.length; _b++) {
                    var part = _c[_b];
                    if (part instanceof parts.Position || part instanceof parts.Move) {
                        var transformOrigin = WebRenderer._transformOrigins[dialogue.alignment];
                        var divTransformStyle = "translate(" + -transformOrigin[0] + "%, " + -transformOrigin[1] + "%) translate(-" + sub.style.marginLeft + ", -" + sub.style.marginTop + ")";
                        var transformOriginString = transformOrigin[0] + "% " + transformOrigin[1] + "%";
                        sub.style.webkitTransform = divTransformStyle;
                        sub.style.webkitTransformOrigin = transformOriginString;
                        sub.style.transform = divTransformStyle;
                        sub.style.transformOrigin = transformOriginString;
                        break;
                    }
                }
                switch (wrappingStyle) {
                  case misc_1.WrappingStyle.EndOfLineWrapping:
                    sub.style.whiteSpace = "pre-wrap";
                    break;

                  case misc_1.WrappingStyle.NoLineWrapping:
                    sub.style.whiteSpace = "pre";
                    break;

                  case misc_1.WrappingStyle.SmartWrappingWithWiderTopLine:
                  case misc_1.WrappingStyle.SmartWrappingWithWiderBottomLine:
                    /* Not supported. Treat the same as EndOfLineWrapping */
                    sub.style.whiteSpace = "pre-wrap";
                    break;
                }
                if (sub.style.position !== "") {
                    // Explicitly set text alignment on absolutely-positioned subs because they'll go in a .an0 <div> and so won't get alignment CSS text-align.
                    switch (dialogue.alignment) {
                      case 1:
                      case 4:
                      case 7:
                        sub.style.textAlign = "left";
                        break;

                      case 2:
                      case 5:
                      case 8:
                        sub.style.textAlign = "center";
                        break;

                      case 3:
                      case 6:
                      case 9:
                        sub.style.textAlign = "right";
                        break;
                    }
                }
                this._animationStyleElement.appendChild(document.createTextNode(dialogueAnimationCollection.cssText));
                sub.style.webkitAnimation = dialogueAnimationCollection.animationStyle;
                sub.style.animation = dialogueAnimationCollection.animationStyle;
                sub.setAttribute("data-dialogue-id", this.id + "-" + dialogue.id);
                this._preRenderedSubs.set(dialogue.id, {
                    sub: sub,
                    animationDelays: dialogueAnimationCollection.animationDelays
                });
            };
            /**
             * Returns the subtitle div for display. The {@link libjass.renderers.Clock.currentTime} of the {@link libjass.renderers.NullRenderer.clock} is used to shift the
             * animations appropriately, so that at the time the div is inserted into the DOM and the animations begin, they are in sync with the clock time.
             *
             * @param {!libjass.Dialogue} dialogue
             */
            WebRenderer.prototype.draw = function (dialogue) {
                var _this = this;
                if (this._currentSubs.has(dialogue)) {
                    return;
                }
                if (settings_1.debugMode) {
                    console.log(dialogue.toString());
                }
                var preRenderedSub = this._preRenderedSubs.get(dialogue.id);
                if (preRenderedSub === undefined) {
                    if (settings_1.debugMode) {
                        console.warn("This dialogue was not pre-rendered. Call preRender() before calling draw() so that draw() is faster.");
                    }
                    this.preRender(dialogue);
                    preRenderedSub = this._preRenderedSubs.get(dialogue.id);
                    if (settings_1.debugMode) {
                        console.log(dialogue.toString());
                    }
                }
                var result = preRenderedSub.sub.cloneNode(true);
                var applyAnimationDelays = function (node) {
                    var animationNames = node.style.animationName || node.style.webkitAnimationName;
                    if (animationNames !== undefined && animationNames !== "") {
                        var animationDelays = animationNames.split(",").map(function (name) {
                            name = name.trim();
                            var delay = preRenderedSub.animationDelays.get(name);
                            return ((delay + dialogue.start - _this.clock.currentTime) / _this.clock.rate).toFixed(3) + "s";
                        }).join(", ");
                        node.style.webkitAnimationDelay = animationDelays;
                        node.style.animationDelay = animationDelays;
                    }
                };
                applyAnimationDelays(result);
                var animatedDescendants = result.querySelectorAll('[style*="animation:"]');
                for (var i = 0; i < animatedDescendants.length; i++) {
                    applyAnimationDelays(animatedDescendants[i]);
                }
                var layer = dialogue.layer;
                var alignment = result.style.position === "absolute" ? 0 : dialogue.alignment;
                // Alignment 0 is for absolutely-positioned subs
                // Create the layer wrapper div and the alignment div inside it if not already created
                if (this._layerWrappers[layer] === undefined) {
                    var layerWrapper = document.createElement("div");
                    layerWrapper.className = "layer layer" + layer;
                    // Find the next greater layer div and insert this div before that one
                    var insertBeforeElement = null;
                    for (var insertBeforeLayer = layer + 1; insertBeforeLayer < this._layerWrappers.length && insertBeforeElement === null; insertBeforeLayer++) {
                        if (this._layerWrappers[insertBeforeLayer] !== undefined) {
                            insertBeforeElement = this._layerWrappers[insertBeforeLayer];
                        }
                    }
                    this._subsWrapper.insertBefore(layerWrapper, insertBeforeElement);
                    this._layerWrappers[layer] = layerWrapper;
                    this._layerAlignmentWrappers[layer] = [];
                }
                if (this._layerAlignmentWrappers[layer][alignment] === undefined) {
                    var layerAlignmentWrapper = document.createElement("div");
                    layerAlignmentWrapper.className = "an an" + alignment;
                    // Find the next greater layer,alignment div and insert this div before that one
                    var layerWrapper = this._layerWrappers[layer];
                    var insertBeforeElement = null;
                    for (var insertBeforeAlignment = alignment + 1; insertBeforeAlignment < this._layerAlignmentWrappers[layer].length && insertBeforeElement === null; insertBeforeAlignment++) {
                        if (this._layerAlignmentWrappers[layer][insertBeforeAlignment] !== undefined) {
                            insertBeforeElement = this._layerAlignmentWrappers[layer][insertBeforeAlignment];
                        }
                    }
                    layerWrapper.insertBefore(layerAlignmentWrapper, insertBeforeElement);
                    this._layerAlignmentWrappers[layer][alignment] = layerAlignmentWrapper;
                }
                this._layerAlignmentWrappers[layer][alignment].appendChild(result);
                this._currentSubs.set(dialogue, result);
            };
            WebRenderer.prototype._onClockPlay = function () {
                _super.prototype._onClockPlay.call(this);
                this._removeAllSubs();
                this._subsWrapper.style.display = "";
                this._subsWrapper.classList.remove("paused");
            };
            WebRenderer.prototype._onClockTick = function () {
                // Remove dialogues that should be removed before adding new ones via super._onClockTick()
                var _this = this;
                var currentTime = this.clock.currentTime;
                this._currentSubs.forEach(function (sub, dialogue) {
                    if (dialogue.start > currentTime || dialogue.end < currentTime) {
                        _this._currentSubs.delete(dialogue);
                        _this._removeSub(sub);
                    }
                });
                _super.prototype._onClockTick.call(this);
            };
            WebRenderer.prototype._onClockPause = function () {
                _super.prototype._onClockPause.call(this);
                this._subsWrapper.classList.add("paused");
            };
            WebRenderer.prototype._onClockStop = function () {
                _super.prototype._onClockStop.call(this);
                this._subsWrapper.style.display = "none";
            };
            WebRenderer.prototype._onClockRateChange = function () {
                _super.prototype._onClockRateChange.call(this);
                // Any dialogues which have been pre-rendered will need to be pre-rendered again.
                this._preRenderedSubs.clear();
                if (this._animationStyleElement !== null) {
                    while (this._animationStyleElement.firstChild !== null) {
                        this._animationStyleElement.removeChild(this._animationStyleElement.firstChild);
                    }
                }
                while (this._svgDefsElement.firstChild !== null) {
                    this._svgDefsElement.removeChild(this._svgDefsElement.firstChild);
                }
            };
            WebRenderer.prototype._ready = function () {
                this._dispatchEvent("ready", []);
            };
            /**
             * @param {!HTMLDivElement} sub
             *
             * @private
             */
            WebRenderer.prototype._removeSub = function (sub) {
                sub.parentNode.removeChild(sub);
            };
            WebRenderer.prototype._removeAllSubs = function () {
                var _this = this;
                this._currentSubs.forEach(function (sub) {
                    return _this._removeSub(sub);
                });
                this._currentSubs.clear();
            };
            WebRenderer._transformOrigins = [ null, [ 0, 100 ], [ 50, 100 ], [ 100, 100 ], [ 0, 50 ], [ 50, 50 ], [ 100, 50 ], [ 0, 0 ], [ 50, 0 ], [ 100, 0 ] ];
            return WebRenderer;
        }(null_1.NullRenderer);
        exports.WebRenderer = WebRenderer;
        mixin_1.mixin(WebRenderer, [ base_1.EventSource ]);
    }, /* 21 ./renderers/web/span-styles */ function (exports, require) {
        var dom_parser_1 = require(17);
        var map_1 = require(29);
        /**
         * This class represents the style attribute of a span.
         * As a Dialogue's div is rendered, individual parts are added to span's, and this class is used to maintain the style attribute of those.
         *
         * @param {!libjass.renderers.NullRenderer} renderer The renderer that this set of styles is associated with
         * @param {!libjass.Dialogue} dialogue The Dialogue that this set of styles is associated with
         * @param {number} scaleX The horizontal scaling of the subtitles
         * @param {number} scaleY The vertical scaling of the subtitles
         * @param {!libjass.renderers.RendererSettings} settings The renderer settings
         * @param {!HTMLDivElement} fontSizeElement A <div> element to measure font sizes with
         * @param {!SVGDefsElement} svgDefsElement An SVG <defs> element to append filter definitions to
         *
         * @constructor
         */
        var SpanStyles = function () {
            function SpanStyles(renderer, dialogue, scaleX, scaleY, settings, fontSizeElement, svgDefsElement) {
                this._scaleX = scaleX;
                this._scaleY = scaleY;
                this._settings = settings;
                this._fontSizeElement = fontSizeElement;
                this._svgDefsElement = svgDefsElement;
                this._nextFilterId = 0;
                this._id = renderer.id + "-" + dialogue.id;
                this._defaultStyle = dialogue.style;
                this.reset(null);
            }
            /**
             * Resets the styles to the defaults provided by the argument.
             *
             * @param {libjass.Style} newStyle The new defaults to reset the style to. If null, the styles are reset to the default style of the Dialogue.
             */
            SpanStyles.prototype.reset = function (newStyle) {
                if (newStyle === undefined || newStyle === null) {
                    newStyle = this._defaultStyle;
                }
                this.italic = newStyle.italic;
                this.bold = newStyle.bold;
                this.underline = newStyle.underline;
                this.strikeThrough = newStyle.strikeThrough;
                this.outlineWidth = newStyle.outlineThickness;
                this.outlineHeight = newStyle.outlineThickness;
                this.shadowDepthX = newStyle.shadowDepth;
                this.shadowDepthY = newStyle.shadowDepth;
                this.fontName = newStyle.fontName;
                this.fontSize = newStyle.fontSize;
                this.fontScaleX = newStyle.fontScaleX;
                this.fontScaleY = newStyle.fontScaleY;
                this.letterSpacing = newStyle.letterSpacing;
                this._rotationX = null;
                this._rotationY = null;
                this._rotationZ = newStyle.rotationZ;
                this._skewX = null;
                this._skewY = null;
                this.primaryColor = newStyle.primaryColor;
                this.secondaryColor = newStyle.secondaryColor;
                this.outlineColor = newStyle.outlineColor;
                this.shadowColor = newStyle.shadowColor;
                this.primaryAlpha = null;
                this.secondaryAlpha = null;
                this.outlineAlpha = null;
                this.shadowAlpha = null;
                this.blur = null;
                this.gaussianBlur = null;
            };
            /**
             * Sets the style attribute on the given span element.
             *
             * @param {!HTMLSpanElement} span
             * @param {!AnimationCollection} animationCollection
             * @param {!HTMLStyleElement} animationStyleElement
             * @return {!HTMLSpanElement} The resulting <span> with the CSS styles applied. This may be a wrapper around the input <span> if the styles were applied using SVG filters.
             */
            SpanStyles.prototype.setStylesOnSpan = function (span, animationCollection, animationStyleElement) {
                var _this = this;
                var isTextOnlySpan = span.childNodes[0] instanceof Text;
                var fontStyleOrWeight = "";
                if (this._italic) {
                    fontStyleOrWeight += "italic ";
                }
                if (this._bold === true) {
                    fontStyleOrWeight += "bold ";
                } else if (this._bold !== false) {
                    fontStyleOrWeight += this._bold + " ";
                }
                var fontSize;
                if (isTextOnlySpan) {
                    fontSize = (this._scaleY * SpanStyles._getFontSize(this._fontName, this._fontSize * this._fontScaleY, this._fontSizeElement)).toFixed(3);
                } else {
                    fontSize = (this._scaleY * SpanStyles._getFontSize(this._fontName, this._fontSize, this._fontSizeElement)).toFixed(3);
                }
                var lineHeight = (this._scaleY * this._fontSize).toFixed(3);
                span.style.font = "" + fontStyleOrWeight + fontSize + "px/" + lineHeight + 'px "' + this._fontName + '"';
                var textDecoration = "";
                if (this._underline) {
                    textDecoration = "underline";
                }
                if (this._strikeThrough) {
                    textDecoration += " line-through";
                }
                span.style.textDecoration = textDecoration.trim();
                var transform = "";
                if (isTextOnlySpan) {
                    if (this._fontScaleY !== this._fontScaleX) {
                        transform += "scaleY(" + (this._fontScaleY / this._fontScaleX).toFixed(3) + ") ";
                    }
                } else {
                    if (this._fontScaleX !== 1) {
                        transform += "scaleX(" + this._fontScaleX + ") ";
                    }
                    if (this._fontScaleY !== 1) {
                        transform += "scaleY(" + this._fontScaleY + ") ";
                    }
                }
                if (this._rotationY !== null) {
                    transform += "rotateY(" + this._rotationY + "deg) ";
                }
                if (this._rotationX !== null) {
                    transform += "rotateX(" + this._rotationX + "deg) ";
                }
                if (this._rotationZ !== 0) {
                    transform += "rotateZ(" + -1 * this._rotationZ + "deg) ";
                }
                if (this._skewX !== null || this._skewY !== null) {
                    var skewX = SpanStyles._valueOrDefault(this._skewX, 0);
                    var skewY = SpanStyles._valueOrDefault(this._skewY, 0);
                    transform += "matrix(1, " + skewY + ", " + skewX + ", 1, 0, 0) ";
                }
                if (transform !== "") {
                    span.style.webkitTransform = transform;
                    span.style.webkitTransformOrigin = "50% 50%";
                    span.style.transform = transform;
                    span.style.transformOrigin = "50% 50%";
                    span.style.display = "inline-block";
                }
                span.style.letterSpacing = (this._scaleX * this._letterSpacing).toFixed(3) + "px";
                var primaryColor = this._primaryColor.withAlpha(this._primaryAlpha);
                span.style.color = primaryColor.toString();
                var outlineColor = this._outlineColor.withAlpha(this._outlineAlpha);
                var outlineWidth = this._scaleX * this._outlineWidth;
                var outlineHeight = this._scaleY * this._outlineHeight;
                var outlineFilter = "";
                var blurFilter = "";
                if (this._settings.enableSvg) {
                    var filterId = "svg-filter-" + this._id + "-" + this._nextFilterId++;
                    if (outlineWidth > 0 || outlineHeight > 0) {
                        /* Construct an elliptical border by merging together many rectangles. The border is creating using dilate morphology filters, but these only support
                         * generating rectangles.   http://lists.w3.org/Archives/Public/public-fx/2012OctDec/0003.html
                         */
                        var mergeOutlinesFilter = "";
                        var outlineNumber = 0;
                        var increment = !this._settings.preciseOutlines && this._gaussianBlur > 0 ? this._gaussianBlur : 1;
                        (function (addOutline) {
                            if (outlineWidth <= outlineHeight) {
                                if (outlineWidth > 0) {
                                    for (var x = 0; x <= outlineWidth; x += increment) {
                                        addOutline(x, outlineHeight / outlineWidth * Math.sqrt(outlineWidth * outlineWidth - x * x));
                                    }
                                    if (x !== outlineWidth + increment) {
                                        addOutline(outlineWidth, 0);
                                    }
                                } else {
                                    addOutline(0, outlineHeight);
                                }
                            } else {
                                if (outlineHeight > 0) {
                                    for (var y = 0; y <= outlineHeight; y += increment) {
                                        addOutline(outlineWidth / outlineHeight * Math.sqrt(outlineHeight * outlineHeight - y * y), y);
                                    }
                                    if (y !== outlineHeight + increment) {
                                        addOutline(0, outlineHeight);
                                    }
                                } else {
                                    addOutline(outlineWidth, 0);
                                }
                            }
                        })(function (x, y) {
                            outlineFilter += '	<feMorphology in="SourceAlpha" operator="dilate" radius="' + x.toFixed(3) + " " + y.toFixed(3) + '" result="outline' + outlineNumber + '" />\n';
                            mergeOutlinesFilter += '		<feMergeNode in="outline' + outlineNumber + '" />\n';
                            outlineNumber++;
                        });
                        outlineFilter += '	<feMerge result="outline">\n' + mergeOutlinesFilter + '\n	</feMerge>\n	<feFlood flood-color="' + outlineColor.toString() + '" />\n	<feComposite operator="in" in2="outline" />\n';
                    }
                    if (this._gaussianBlur > 0) {
                        blurFilter += '	<feGaussianBlur stdDeviation="' + this._gaussianBlur + '" />\n';
                    }
                    for (var i = 0; i < this._blur; i++) {
                        blurFilter += '	<feConvolveMatrix kernelMatrix="1 2 1 2 4 2 1 2 1" edgeMode="none" />\n';
                    }
                } else {
                    if (outlineWidth > 0 || outlineHeight > 0) {
                        var outlineCssString = "";
                        (function (addOutline) {
                            for (var x = 0; x <= outlineWidth; x++) {
                                var maxY = outlineWidth === 0 ? outlineHeight : outlineHeight * Math.sqrt(1 - x * x / (outlineWidth * outlineWidth));
                                for (var y = 0; y <= maxY; y++) {
                                    addOutline(x, y);
                                    if (x !== 0) {
                                        addOutline(-x, y);
                                    }
                                    if (y !== 0) {
                                        addOutline(x, -y);
                                    }
                                    if (x !== 0 && y !== 0) {
                                        addOutline(-x, -y);
                                    }
                                }
                            }
                        })(function (x, y) {
                            outlineCssString += ", " + outlineColor.toString() + " " + x + "px " + y + "px " + _this._gaussianBlur.toFixed(3) + "px";
                        });
                        span.style.textShadow = outlineCssString.substr(", ".length);
                    }
                }
                var filterWrapperSpan = document.createElement("span");
                filterWrapperSpan.appendChild(span);
                if (outlineFilter !== "" || blurFilter !== "") {
                    var filterString = '<filter xmlns="http://www.w3.org/2000/svg" id="' + filterId + '" x="-50%" width="200%" y="-50%" height="200%">\n' + outlineFilter + "\n" + blurFilter + '\n	<feMerge>\n		<feMergeNode />\n		<feMergeNode in="SourceGraphic" />\n	</feMerge>\n</filter>\n';
                    var filterElement = dom_parser_1.domParser.parseFromString(filterString, "image/svg+xml").childNodes[0];
                    this._svgDefsElement.appendChild(filterElement);
                    filterWrapperSpan.style.webkitFilter = 'url("#' + filterId + '")';
                    filterWrapperSpan.style.filter = 'url("#' + filterId + '")';
                }
                if (this._shadowDepthX !== 0 || this._shadowDepthY !== 0) {
                    var shadowColor = this._shadowColor.withAlpha(this._shadowAlpha);
                    var shadowCssString = shadowColor.toString() + " " + (this._shadowDepthX * this._scaleX / this._fontScaleX).toFixed(3) + "px " + (this._shadowDepthY * this._scaleY / this._fontScaleY).toFixed(3) + "px 0px";
                    if (span.style.textShadow === "") {
                        span.style.textShadow = shadowCssString;
                    } else {
                        span.style.textShadow += ", " + shadowCssString;
                    }
                }
                if (this._rotationX !== 0 || this._rotationY !== 0) {
                    // Perspective needs to be set on a "transformable element"
                    filterWrapperSpan.style.display = "inline-block";
                }
                animationStyleElement.appendChild(document.createTextNode(animationCollection.cssText));
                span.style.webkitAnimation = animationCollection.animationStyle;
                span.style.animation = animationCollection.animationStyle;
                return filterWrapperSpan;
            };
            /**
             * @return {!HTMLBRElement}
             */
            SpanStyles.prototype.makeNewLine = function () {
                var result = document.createElement("br");
                result.style.lineHeight = (this._scaleY * this._fontSize).toFixed(3) + "px";
                return result;
            };
            Object.defineProperty(SpanStyles.prototype, "italic", {
                /**
                 * Sets the italic property. null defaults it to the default style's value.
                 *
                 * @type {?boolean}
                 */
                set: function (value) {
                    this._italic = SpanStyles._valueOrDefault(value, this._defaultStyle.italic);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "bold", {
                /**
                 * Sets the bold property. null defaults it to the default style's value.
                 *
                 * @type {(?number|?boolean)}
                 */
                set: function (value) {
                    this._bold = SpanStyles._valueOrDefault(value, this._defaultStyle.bold);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "underline", {
                /**
                 * Sets the underline property. null defaults it to the default style's value.
                 *
                 * @type {?boolean}
                 */
                set: function (value) {
                    this._underline = SpanStyles._valueOrDefault(value, this._defaultStyle.underline);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "strikeThrough", {
                /**
                 * Sets the strike-through property. null defaults it to the default style's value.
                 *
                 * @type {?boolean}
                 */
                set: function (value) {
                    this._strikeThrough = SpanStyles._valueOrDefault(value, this._defaultStyle.strikeThrough);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "outlineWidth", {
                /**
                 * Sets the outline width property. null defaults it to the style's original outline width value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._outlineWidth = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineThickness);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "outlineHeight", {
                /**
                 * Sets the outline height property. null defaults it to the style's original outline height value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._outlineHeight = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineThickness);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "shadowDepthX", {
                /**
                 * Sets the outline width property. null defaults it to the style's original shadow depth X value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._shadowDepthX = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "shadowDepthY", {
                /**
                 * Sets the shadow height property. null defaults it to the style's original shadow depth Y value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._shadowDepthY = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowDepth);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "blur", {
                /**
                 * Sets the blur property. null defaults it to 0.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._blur = SpanStyles._valueOrDefault(value, 0);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "gaussianBlur", {
                /**
                 * Sets the Gaussian blur property. null defaults it to 0.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._gaussianBlur = SpanStyles._valueOrDefault(value, 0);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "fontName", {
                /**
                 * Sets the font name property. null defaults it to the default style's value.
                 *
                 * @type {?string}
                 */
                set: function (value) {
                    this._fontName = SpanStyles._valueOrDefault(value, this._defaultStyle.fontName);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "fontSize", {
                /**
                 * Sets the font size property. null defaults it to the default style's value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._fontSize = SpanStyles._valueOrDefault(value, this._defaultStyle.fontSize);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "fontScaleX", {
                /**
                 * Sets the horizontal font scaling property. null defaults it to the default style's value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._fontScaleX = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleX);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "fontScaleY", {
                /**
                 * Sets the vertical font scaling property. null defaults it to the default style's value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._fontScaleY = SpanStyles._valueOrDefault(value, this._defaultStyle.fontScaleY);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "letterSpacing", {
                /**
                 * Sets the letter spacing property. null defaults it to the default style's value.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._letterSpacing = SpanStyles._valueOrDefault(value, this._defaultStyle.letterSpacing);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "rotationX", {
                /**
                 * Sets the X-axis rotation property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._rotationX = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "rotationY", {
                /**
                 * Sets the Y-axis rotation property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._rotationY = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "rotationZ", {
                /**
                 * Sets the Z-axis rotation property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._rotationZ = SpanStyles._valueOrDefault(value, this._defaultStyle.rotationZ);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "skewX", {
                /**
                 * Sets the X-axis skew property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._skewX = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "skewY", {
                /**
                 * Sets the Y-axis skew property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._skewY = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "primaryColor", {
                /**
                 * Gets the primary color property.
                 *
                 * @type {!libjass.Color}
                 */
                get: function () {
                    return this._primaryColor;
                },
                /**
                 * Sets the primary color property. null defaults it to the default style's value.
                 *
                 * @type {libjass.Color}
                 */
                set: function (value) {
                    this._primaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.primaryColor);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "secondaryColor", {
                /**
                 * Gets the secondary color property.
                 *
                 * @type {!libjass.Color}
                 */
                get: function () {
                    return this._secondaryColor;
                },
                /**
                 * Sets the secondary color property. null defaults it to the default style's value.
                 *
                 * @type {libjass.Color}
                 */
                set: function (value) {
                    this._secondaryColor = SpanStyles._valueOrDefault(value, this._defaultStyle.secondaryColor);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "outlineColor", {
                /**
                 * Sets the outline color property. null defaults it to the default style's value.
                 *
                 * @type {libjass.Color}
                 */
                set: function (value) {
                    this._outlineColor = SpanStyles._valueOrDefault(value, this._defaultStyle.outlineColor);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "shadowColor", {
                /**
                 * Sets the shadow color property. null defaults it to the default style's value.
                 *
                 * @type {libjass.Color}
                 */
                set: function (value) {
                    this._shadowColor = SpanStyles._valueOrDefault(value, this._defaultStyle.shadowColor);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "primaryAlpha", {
                /**
                 * Gets the primary alpha property.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._primaryAlpha;
                },
                /**
                 * Sets the primary alpha property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._primaryAlpha = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "secondaryAlpha", {
                /**
                 * Gets the secondary alpha property.
                 *
                 * @type {?number}
                 */
                get: function () {
                    return this._secondaryAlpha;
                },
                /**
                 * Sets the secondary alpha property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._secondaryAlpha = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "outlineAlpha", {
                /**
                 * Sets the outline alpha property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._outlineAlpha = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SpanStyles.prototype, "shadowAlpha", {
                /**
                 * Sets the shadow alpha property.
                 *
                 * @type {?number}
                 */
                set: function (value) {
                    this._shadowAlpha = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {string} fontFamily
             * @param {number} lineHeight
             * @param {!HTMLDivElement} fontSizeElement
             * @return {number}
             *
             * @private
             * @static
             */
            SpanStyles._getFontSize = function (fontFamily, lineHeight, fontSizeElement) {
                var existingFontSizeMap = SpanStyles._fontSizeCache.get(fontFamily);
                if (existingFontSizeMap === undefined) {
                    SpanStyles._fontSizeCache.set(fontFamily, existingFontSizeMap = new map_1.Map());
                }
                var existingFontSize = existingFontSizeMap.get(lineHeight);
                if (existingFontSize === undefined) {
                    fontSizeElement.style.fontFamily = fontFamily;
                    fontSizeElement.style.fontSize = lineHeight + "px";
                    existingFontSizeMap.set(lineHeight, existingFontSize = lineHeight * lineHeight / fontSizeElement.offsetHeight);
                }
                return existingFontSize;
            };
            SpanStyles._fontSizeCache = new map_1.Map();
            SpanStyles._valueOrDefault = function (newValue, defaultValue) {
                return newValue !== null ? newValue : defaultValue;
            };
            return SpanStyles;
        }();
        exports.SpanStyles = SpanStyles;
    }, /* 22 ./settings */ function (exports) {
        /**
         * Debug mode. When true, libjass logs some debug messages.
         *
         * @type {boolean}
         */
        exports.debugMode = false;
        /**
         * Verbose debug mode. When true, libjass logs some more debug messages. This setting is independent of {@link libjass.debugMode}
         *
         * @type {boolean}
         *
         * @memberOf libjass
         */
        exports.verboseMode = false;
        /**
         * Sets the debug mode.
         *
         * @param {boolean} value
         */
        function setDebugMode(value) {
            exports.debugMode = value;
        }
        exports.setDebugMode = setDebugMode;
        /**
         * Sets the verbose debug mode.
         *
         * @param {boolean} value
         */
        function setVerboseMode(value) {
            exports.verboseMode = value;
        }
        exports.setVerboseMode = setVerboseMode;
    }, /* 23 ./types/ass */ function (exports, require) {
        var dialogue_1 = require(24);
        var style_1 = require(27);
        var script_properties_1 = require(26);
        var misc_1 = require(25);
        var settings_1 = require(22);
        var parser = require(1);
        var misc_2 = require(2);
        var map_1 = require(29);
        /**
         * This class represents an ASS script. It contains the {@link libjass.ScriptProperties}, an array of {@link libjass.Style}s, and an array of {@link libjass.Dialogue}s.
         *
         * @constructor
         * @memberOf libjass
         */
        var ASS = function () {
            function ASS() {
                this._properties = new script_properties_1.ScriptProperties();
                this._styles = new map_1.Map();
                this._dialogues = [];
                this._stylesFormatSpecifier = null;
                this._dialoguesFormatSpecifier = null;
                // Deprecated constructor argument
                if (arguments.length === 1) {
                    throw new Error("Constructor `new ASS(rawASS)` has been deprecated. Use `ASS.fromString(rawASS)` instead.");
                }
            }
            Object.defineProperty(ASS.prototype, "properties", {
                /**
                 * The properties of this script.
                 *
                 * @type {!libjass.ScriptProperties}
                 */
                get: function () {
                    return this._properties;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ASS.prototype, "styles", {
                /**
                 * The styles in this script.
                 *
                 * @type {!Map.<string, !libjass.Style>}
                 */
                get: function () {
                    return this._styles;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ASS.prototype, "dialogues", {
                /**
                 * The dialogues in this script.
                 *
                 * @type {!Array.<!libjass.Dialogue>}
                 */
                get: function () {
                    return this._dialogues;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ASS.prototype, "stylesFormatSpecifier", {
                /**
                 * The format specifier for the styles section.
                 *
                 * @type {!Array.<string>}
                 */
                get: function () {
                    return this._stylesFormatSpecifier;
                },
                /**
                 * The format specifier for the events section.
                 *
                 * @type {!Array.<string>}
                 */
                set: function (value) {
                    this._stylesFormatSpecifier = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ASS.prototype, "dialoguesFormatSpecifier", {
                /**
                 * The format specifier for the styles section.
                 *
                 * @type {!Array.<string>}
                 */
                get: function () {
                    return this._dialoguesFormatSpecifier;
                },
                /**
                 * The format specifier for the events section.
                 *
                 * @type {!Array.<string>}
                 */
                set: function (value) {
                    this._dialoguesFormatSpecifier = value;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Add a style to this ASS script.
             *
             * @param {string} line The line from the script that contains the new style.
             */
            ASS.prototype.addStyle = function (line) {
                var styleLine = misc_2.parseLineIntoTypedTemplate(line, this._stylesFormatSpecifier);
                if (styleLine === null || styleLine.type !== "Style") {
                    return;
                }
                var styleTemplate = styleLine.template;
                if (settings_1.verboseMode) {
                    var repr = "";
                    styleTemplate.forEach(function (value, key) {
                        return repr += key + " = " + value + ", ";
                    });
                    console.log("Read style: " + repr);
                }
                // Create the dialogue and add it to the dialogues array
                var style = new style_1.Style(styleTemplate);
                this._styles.set(style.name, style);
            };
            /**
             * Add an event to this ASS script.
             *
             * @param {string} line The line from the script that contains the new event.
             */
            ASS.prototype.addEvent = function (line) {
                var dialogueLine = misc_2.parseLineIntoTypedTemplate(line, this._dialoguesFormatSpecifier);
                if (dialogueLine === null || dialogueLine.type !== "Dialogue") {
                    return;
                }
                var dialogueTemplate = dialogueLine.template;
                if (settings_1.verboseMode) {
                    var repr = "";
                    dialogueTemplate.forEach(function (value, key) {
                        return repr += key + " = " + value + ", ";
                    });
                    console.log("Read dialogue: " + repr);
                }
                // Create the dialogue and add it to the dialogues array
                this.dialogues.push(new dialogue_1.Dialogue(dialogueTemplate, this));
            };
            /**
             * Creates an ASS object from the raw text of an ASS script.
             *
             * @param {string} raw The raw text of the script.
             * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
             * @return {!Promise.<!libjass.ASS>}
             *
             * @static
             */
            ASS.fromString = function (raw, type) {
                if (type === void 0) {
                    type = misc_1.Format.ASS;
                }
                return ASS.fromStream(new parser.StringStream(raw), type);
            };
            /**
             * Creates an ASS object from the given {@link libjass.parser.Stream}.
             *
             * @param {!libjass.parser.Stream} stream The stream to parse the script from
             * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
             * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
             *
             * @static
             */
            ASS.fromStream = function (stream, type) {
                if (type === void 0) {
                    type = misc_1.Format.ASS;
                }
                switch (type) {
                  case misc_1.Format.ASS:
                    return new parser.StreamParser(stream).ass;

                  case misc_1.Format.SRT:
                    return new parser.SrtStreamParser(stream).ass;

                  default:
                    throw new Error("Illegal value of type: " + type);
                }
            };
            /**
             * Creates an ASS object from the given URL.
             *
             * @param {string} url The URL of the script.
             * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
             * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
             *
             * @static
             */
            ASS.fromUrl = function (url, type) {
                if (type === void 0) {
                    type = misc_1.Format.ASS;
                }
                if (typeof global.fetch === "function" && typeof global.ReadableStream === "function" && typeof global.ReadableStream.prototype.getReader === "function" && typeof global.TextDecoder === "function") {
                    return global.fetch(url).then(function (response) {
                        return ASS.fromReadableStream(response.body, "utf-8", type);
                    });
                }
                var xhr = new XMLHttpRequest();
                var result = ASS.fromStream(new parser.XhrStream(xhr), type);
                xhr.open("GET", url, true);
                xhr.send();
                return result;
            };
            /**
             * Creates an ASS object from the given ReadableStream.
             *
             * @param {!ReadableStream} stream
             * @param {string="utf-8"} encoding
             * @param {number=0} type The type of the script. One of the {@link libjass.Format} constants.
             * @return {!Promise.<!libjass.ASS>} A promise that will be resolved with the ASS object when it has been fully parsed
             *
             * @static
             */
            ASS.fromReadableStream = function (stream, encoding, type) {
                if (encoding === void 0) {
                    encoding = "utf-8";
                }
                if (type === void 0) {
                    type = misc_1.Format.ASS;
                }
                return ASS.fromStream(new parser.BrowserReadableStream(stream, encoding), type);
            };
            return ASS;
        }();
        exports.ASS = ASS;
    }, /* 24 ./types/dialogue */ function (exports, require) {
        var misc_1 = require(25);
        var parse_1 = require(3);
        var parts = require(7);
        var settings_1 = require(22);
        /**
         * This class represents a dialogue in a {@link libjass.ASS} script.
         *
         * @param {!Map.<string, string>} template The template object that contains the dialogue's properties. It is a map of the string values read from the ASS file.
         * @param {string} template["Style"] The name of the default style of this dialogue
         * @param {string} template["Start"] The start time
         * @param {string} template["End"] The end time
         * @param {string} template["Layer"] The layer number
         * @param {string} template["Text"] The text of this dialogue
         * @param {ASS} ass The ASS object to which this dialogue belongs
         *
         * @constructor
         * @memberOf libjass
         */
        var Dialogue = function () {
            function Dialogue(template, ass) {
                this._parts = null;
                this._sub = null;
                this._id = ++Dialogue._lastDialogueId;
                var style = template.get("Style");
                this._style = ass.styles.get(style);
                if (this._style === undefined) {
                    throw new Error("Unrecognized style " + style);
                }
                this._start = Dialogue._toTime(template.get("Start"));
                this._end = Dialogue._toTime(template.get("End"));
                this._layer = Math.max(misc_1.valueOrDefault(template, "Layer", parseInt, function (value) {
                    return !isNaN(value);
                }, "0"), 0);
                this._rawPartsString = template.get("Text");
                if (this._rawPartsString === undefined || this._rawPartsString === null || this._rawPartsString.constructor !== String) {
                    throw new Error("Dialogue doesn't have any text.");
                }
            }
            Object.defineProperty(Dialogue.prototype, "id", {
                /**
                 * The unique ID of this dialogue. Auto-generated.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._id;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "start", {
                /**
                 * The start time of this dialogue.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._start;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "end", {
                /**
                 * The end time of this dialogue.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._end;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "style", {
                /**
                 * The default style of this dialogue.
                 *
                 * @type {!libjass.Style}
                 */
                get: function () {
                    return this._style;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "alignment", {
                /**
                 * The alignment number of this dialogue.
                 *
                 * @type {number}
                 */
                get: function () {
                    if (this._parts === null) {
                        this._parsePartsString();
                    }
                    return this._alignment;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "layer", {
                /**
                 * The layer number of this dialogue.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._layer;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Dialogue.prototype, "parts", {
                /**
                 * The {@link libjass.parts} of this dialogue.
                 *
                 * @type {!Array.<!libjass.parts.Part>}
                 */
                get: function () {
                    if (this._parts === null) {
                        this._parsePartsString();
                    }
                    return this._parts;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @return {string} A simple representation of this dialogue's properties and parts.
             */
            Dialogue.prototype.toString = function () {
                return "#" + this._id + " [" + this._start.toFixed(3) + "-" + this._end.toFixed(3) + "] " + (this._parts !== null ? this._parts.join(", ") : this._rawPartsString);
            };
            /**
             * Parses this dialogue's parts from the raw parts string.
             *
             * @private
             */
            Dialogue.prototype._parsePartsString = function () {
                var _this = this;
                this._parts = parse_1.parse(this._rawPartsString, "dialogueParts");
                this._alignment = this._style.alignment;
                this._parts.forEach(function (part, index) {
                    if (part instanceof parts.Alignment) {
                        _this._alignment = part.value;
                    } else if (part instanceof parts.Move) {
                        if (part.t1 === null || part.t2 === null) {
                            _this._parts[index] = new parts.Move(part.x1, part.y1, part.x2, part.y2, 0, _this._end - _this._start);
                        }
                    } else if (part instanceof parts.Transform) {
                        if (part.start === null || part.end === null || part.accel === null) {
                            _this._parts[index] = new parts.Transform(part.start === null ? 0 : part.start, part.end === null ? _this._end - _this._start : part.end, part.accel === null ? 1 : part.accel, part.tags);
                        }
                    }
                });
                if (settings_1.debugMode) {
                    var possiblyIncorrectParses = this._parts.filter(function (part) {
                        return part instanceof parts.Comment && part.value.indexOf("\\") !== -1;
                    });
                    if (possiblyIncorrectParses.length > 0) {
                        console.warn("Possible incorrect parse:\n" + this._rawPartsString + "\nwas parsed as\n" + this.toString() + "\nThe possibly incorrect parses are:\n" + possiblyIncorrectParses.join("\n"));
                    }
                }
            };
            /**
             * Converts this string into the number of seconds it represents. This string must be in the form of hh:mm:ss.MMM
             *
             * @param {string} str
             * @return {number}
             *
             * @private
             * @static
             */
            Dialogue._toTime = function (str) {
                return str.split(":").reduce(function (previousValue, currentValue) {
                    return previousValue * 60 + parseFloat(currentValue);
                }, 0);
            };
            Dialogue._lastDialogueId = -1;
            return Dialogue;
        }();
        exports.Dialogue = Dialogue;
    }, /* 25 ./types/misc */ function (exports) {
        /**
         * The format of the string passed to {@link libjass.ASS.fromString}
         *
         * @enum
         * @memberOf libjass
         */
        (function (Format) {
            Format[Format["ASS"] = 0] = "ASS";
            Format[Format["SRT"] = 1] = "SRT";
        })(exports.Format || (exports.Format = {}));
        /**
         * The wrapping style defined in the {@link libjass.ScriptProperties}
         *
         * @enum
         * @memberOf libjass
         */
        (function (WrappingStyle) {
            WrappingStyle[WrappingStyle["SmartWrappingWithWiderTopLine"] = 0] = "SmartWrappingWithWiderTopLine";
            WrappingStyle[WrappingStyle["SmartWrappingWithWiderBottomLine"] = 3] = "SmartWrappingWithWiderBottomLine";
            WrappingStyle[WrappingStyle["EndOfLineWrapping"] = 1] = "EndOfLineWrapping";
            WrappingStyle[WrappingStyle["NoLineWrapping"] = 2] = "NoLineWrapping";
        })(exports.WrappingStyle || (exports.WrappingStyle = {}));
        /**
         * The border style defined in the {@link libjass.Style} properties.
         *
         * @enum
         * @memberOf libjass
         */
        (function (BorderStyle) {
            BorderStyle[BorderStyle["Outline"] = 1] = "Outline";
            BorderStyle[BorderStyle["OpaqueBox"] = 3] = "OpaqueBox";
        })(exports.BorderStyle || (exports.BorderStyle = {}));
        /**
         * @param {!Map.<string, string>} template
         * @param {string} key
         * @param {function(string):T} converter
         * @param {?function(T):boolean} validator
         * @param {T} defaultValue
         * @return {T}
         *
         * @template T
         */
        function valueOrDefault(template, key, converter, validator, defaultValue) {
            var value = template.get(key);
            if (value === undefined) {
                return converter(defaultValue);
            }
            try {
                var numValue = converter(value);
                if (validator !== null && !validator(numValue)) {
                    throw new Error("Validation failed.");
                }
                return numValue;
            } catch (ex) {
                throw new Error("Property " + key + " has invalid value " + value + " - " + ex.stack);
            }
        }
        exports.valueOrDefault = valueOrDefault;
    }, /* 26 ./types/script-properties */ function (exports) {
        /**
         * This class represents the properties of a {@link libjass.ASS} script.
         *
         * @constructor
         * @memberOf libjass
         */
        var ScriptProperties = function () {
            function ScriptProperties() {}
            Object.defineProperty(ScriptProperties.prototype, "resolutionX", {
                /**
                 * The horizontal script resolution.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._resolutionX;
                },
                /**
                 * The horizontal script resolution.
                 *
                 * @type {number}
                 */
                set: function (value) {
                    this._resolutionX = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ScriptProperties.prototype, "resolutionY", {
                /**
                 * The vertical script resolution.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._resolutionY;
                },
                /**
                 * The vertical script resolution.
                 *
                 * @type {number}
                 */
                set: function (value) {
                    this._resolutionY = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ScriptProperties.prototype, "wrappingStyle", {
                /**
                 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._wrappingStyle;
                },
                /**
                 * The wrap style. One of the {@link libjass.WrappingStyle} constants.
                 *
                 * @type {number}
                 */
                set: function (value) {
                    this._wrappingStyle = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ScriptProperties.prototype, "scaleBorderAndShadow", {
                /**
                 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._scaleBorderAndShadow;
                },
                /**
                 * Whether to scale outline widths and shadow depths from script resolution to video resolution or not. If true, widths and depths are scaled.
                 *
                 * @type {boolean}
                 */
                set: function (value) {
                    this._scaleBorderAndShadow = value;
                },
                enumerable: true,
                configurable: true
            });
            return ScriptProperties;
        }();
        exports.ScriptProperties = ScriptProperties;
    }, /* 27 ./types/style */ function (exports, require) {
        var misc_1 = require(25);
        var parse_1 = require(3);
        /**
         * This class represents a single global style declaration in a {@link libjass.ASS} script. The styles can be obtained via the {@link libjass.ASS.styles} property.
         *
         * @param {!Map.<string, string>} template The template object that contains the style's properties. It is a map of the string values read from the ASS file.
         * @param {string} template["Name"] The name of the style
         * @param {string} template["Italic"] -1 if the style is italicized
         * @param {string} template["Bold"] -1 if the style is bold
         * @param {string} template["Underline"] -1 if the style is underlined
         * @param {string} template["StrikeOut"] -1 if the style is struck-through
         * @param {string} template["Fontname"] The name of the font
         * @param {string} template["Fontsize"] The size of the font
         * @param {string} template["ScaleX"] The horizontal scaling of the font
         * @param {string} template["ScaleY"] The vertical scaling of the font
         * @param {string} template["Spacing"] The letter spacing of the font
         * @param {string} template["PrimaryColour"] The primary color
         * @param {string} template["OutlineColour"] The outline color
         * @param {string} template["BackColour"] The shadow color
         * @param {string} template["Outline"] The outline thickness
         * @param {string} template["Shadow"] The shadow depth
         * @param {string} template["Alignment"] The alignment number
         * @param {string} template["MarginL"] The left margin
         * @param {string} template["MarginR"] The right margin
         * @param {string} template["MarginV"] The vertical margin
         *
         * @constructor
         * @memberOf libjass
         */
        var Style = function () {
            function Style(template) {
                this._name = template.get("Name");
                if (this._name === undefined || this._name === null || this._name.constructor !== String) {
                    throw new Error("Style doesn't have a name.");
                }
                this._italic = template.get("Italic") === "-1";
                this._bold = template.get("Bold") === "-1";
                this._underline = template.get("Underline") === "-1";
                this._strikeThrough = template.get("StrikeOut") === "-1";
                this._fontName = template.get("Fontname");
                this._fontSize = misc_1.valueOrDefault(template, "Fontsize", parseFloat, function (value) {
                    return !isNaN(value);
                }, "50");
                this._fontScaleX = misc_1.valueOrDefault(template, "ScaleX", parseFloat, function (value) {
                    return !isNaN(value);
                }, "100") / 100;
                this._fontScaleY = misc_1.valueOrDefault(template, "ScaleY", parseFloat, function (value) {
                    return !isNaN(value);
                }, "100") / 100;
                this._letterSpacing = misc_1.valueOrDefault(template, "Spacing", parseFloat, function (value) {
                    return !isNaN(value);
                }, "0");
                this._rotationZ = misc_1.valueOrDefault(template, "Angle", parseFloat, function (value) {
                    return !isNaN(value);
                }, "0");
                this._primaryColor = misc_1.valueOrDefault(template, "PrimaryColour", function (str) {
                    return parse_1.parse(str, "colorWithAlpha");
                }, null, "&H0000FFFF");
                this._secondaryColor = misc_1.valueOrDefault(template, "SecondaryColour", function (str) {
                    return parse_1.parse(str, "colorWithAlpha");
                }, null, "&H00000000");
                this._outlineColor = misc_1.valueOrDefault(template, "OutlineColour", function (str) {
                    return parse_1.parse(str, "colorWithAlpha");
                }, null, "&H00000000");
                this._shadowColor = misc_1.valueOrDefault(template, "BackColour", function (str) {
                    return parse_1.parse(str, "colorWithAlpha");
                }, null, "&H00000000");
                this._outlineThickness = misc_1.valueOrDefault(template, "Outline", parseFloat, function (value) {
                    return !isNaN(value);
                }, "1");
                this._borderStyle = misc_1.valueOrDefault(template, "BorderStyle", parseInt, function (value) {
                    return !isNaN(value);
                }, "1");
                this._shadowDepth = misc_1.valueOrDefault(template, "Shadow", parseFloat, function (value) {
                    return !isNaN(value);
                }, "1");
                this._alignment = misc_1.valueOrDefault(template, "Alignment", parseInt, function (value) {
                    return !isNaN(value);
                }, "2");
                this._marginLeft = misc_1.valueOrDefault(template, "MarginL", parseFloat, function (value) {
                    return !isNaN(value);
                }, "80");
                this._marginRight = misc_1.valueOrDefault(template, "MarginR", parseFloat, function (value) {
                    return !isNaN(value);
                }, "80");
                this._marginVertical = misc_1.valueOrDefault(template, "MarginV", parseFloat, function (value) {
                    return !isNaN(value);
                }, "35");
            }
            Object.defineProperty(Style.prototype, "name", {
                /**
                 * The name of this style.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "italic", {
                /**
                 * Whether this style is italicized or not.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._italic;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "bold", {
                /**
                 * Whether this style is bold or not.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._bold;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "underline", {
                /**
                 * Whether this style is underlined or not.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._underline;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "strikeThrough", {
                /**
                 * Whether this style is struck-through or not.
                 *
                 * @type {boolean}
                 */
                get: function () {
                    return this._strikeThrough;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "fontName", {
                /**
                 * The name of this style's font.
                 *
                 * @type {string}
                 */
                get: function () {
                    return this._fontName;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "fontSize", {
                /**
                 * The size of this style's font.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._fontSize;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "fontScaleX", {
                /**
                 * The horizontal scaling of this style's font.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._fontScaleX;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "fontScaleY", {
                /**
                 * The vertical scaling of this style's font.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._fontScaleY;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "letterSpacing", {
                /**
                 * The letter spacing scaling of this style's font.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._letterSpacing;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "rotationZ", {
                /**
                 * The default Z-rotation of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._rotationZ;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "primaryColor", {
                /**
                 * The color of this style's font.
                 *
                 * @type {!libjass.parts.Color}
                 */
                get: function () {
                    return this._primaryColor;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "secondaryColor", {
                /**
                 * The alternate color of this style's font, used in karaoke.
                 *
                 * @type {!libjass.parts.Color}
                 */
                get: function () {
                    return this._secondaryColor;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "outlineColor", {
                /**
                 * The color of this style's outline.
                 *
                 * @type {!libjass.parts.Color}
                 */
                get: function () {
                    return this._outlineColor;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "shadowColor", {
                /**
                 * The color of this style's shadow.
                 *
                 * @type {!libjass.parts.Color}
                 */
                get: function () {
                    return this._shadowColor;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "outlineThickness", {
                /**
                 * The thickness of this style's outline.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._outlineThickness;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "borderStyle", {
                /**
                 * The border style of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._borderStyle;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "shadowDepth", {
                /**
                 * The depth of this style's shadow.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._shadowDepth;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "alignment", {
                /**
                 * The alignment of dialogues of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._alignment;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "marginLeft", {
                /**
                 * The left margin of dialogues of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._marginLeft;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "marginRight", {
                /**
                 * The right margin of dialogues of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._marginRight;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Style.prototype, "marginVertical", {
                /**
                 * The vertical margin of dialogues of this style.
                 *
                 * @type {number}
                 */
                get: function () {
                    return this._marginVertical;
                },
                enumerable: true,
                configurable: true
            });
            return Style;
        }();
        exports.Style = Style;
    }, /* 28 ./utility/extends */ function (exports) {
        /**
         * Class inheritance shim.
         *
         * @param {!Function} derived
         * @param {!Function} base
         */
        function __extends(derived, base) {
            for (var property in base) {
                if (base.hasOwnProperty(property)) {
                    derived[property] = base[property];
                }
            }
            function __() {
                this.constructor = derived;
            }
            __.prototype = base.prototype;
            derived.prototype = new __();
        }
        exports.__extends = __extends;
    }, /* 29 ./utility/map */ function (exports) {
        /**
         * Map implementation for browsers that don't support it. Only supports keys which are of Number or String type, or which have a property called "id".
         *
         * Keys and values are stored as properties of an object, with property names derived from the key type.
         *
         * @param {!Array.<!Array.<*>>=} iterable Only an array of elements (where each element is a 2-tuple of key and value) is supported.
         */
        var SimpleMap = function () {
            function SimpleMap(iterable) {
                this.clear();
                if (iterable === undefined) {
                    return;
                }
                if (!Array.isArray(iterable)) {
                    throw new Error("Non-array iterables are not supported by the SimpleMap constructor.");
                }
                for (var _i = 0; _i < iterable.length; _i++) {
                    var element = iterable[_i];
                    this.set(element[0], element[1]);
                }
            }
            /**
             * @param {K} key
             * @return {V}
             */
            SimpleMap.prototype.get = function (key) {
                var property = this._keyToProperty(key);
                if (property === null) {
                    return undefined;
                }
                return this._values[property];
            };
            /**
             * @param {K} key
             * @return {boolean}
             */
            SimpleMap.prototype.has = function (key) {
                var property = this._keyToProperty(key);
                if (property === null) {
                    return false;
                }
                return property in this._keys;
            };
            /**
             * @param {K} key
             * @param {V} value
             * @return {libjass.Map.<K, V>} This map
             */
            SimpleMap.prototype.set = function (key, value) {
                var property = this._keyToProperty(key);
                if (property === null) {
                    throw new Error("This Map implementation only supports Number and String keys, or keys with an id property.");
                }
                if (!(property in this._keys)) {
                    this._size++;
                }
                this._keys[property] = key;
                this._values[property] = value;
                return this;
            };
            /**
             * @param {K} key
             * @return {boolean} true if the key was present before being deleted, false otherwise
             */
            SimpleMap.prototype.delete = function (key) {
                var property = this._keyToProperty(key);
                if (property === null) {
                    return false;
                }
                var result = property in this._keys;
                if (result) {
                    delete this._keys[property];
                    delete this._values[property];
                    this._size--;
                }
                return result;
            };
            /**
             */
            SimpleMap.prototype.clear = function () {
                this._keys = Object.create(null);
                this._values = Object.create(null);
                this._size = 0;
            };
            /**
             * @param {function(V, K, libjass.Map.<K, V>)} callbackfn A function that is called with each key and value in the map.
             * @param {*} thisArg
             */
            SimpleMap.prototype.forEach = function (callbackfn, thisArg) {
                for (var _i = 0, _a = Object.keys(this._keys); _i < _a.length; _i++) {
                    var property = _a[_i];
                    callbackfn.call(thisArg, this._values[property], this._keys[property], this);
                }
            };
            Object.defineProperty(SimpleMap.prototype, "size", {
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._size;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Converts the given key into a property name for the internal map.
             *
             * @param {K} key
             * @return {string}
             *
             * @private
             */
            SimpleMap.prototype._keyToProperty = function (key) {
                if (typeof key === "number") {
                    return "#" + key;
                }
                if (typeof key === "string") {
                    return "'" + key;
                }
                if (key.id !== undefined) {
                    return "!" + key.id;
                }
                return null;
            };
            return SimpleMap;
        }();
        /**
         * Set to the global implementation of Map if the environment has one, else set to {@link ./utility/map.SimpleMap}
         *
         * Set it to null to force {@link ./utility/map.SimpleMap} to be used even if a global Map is present.
         *
         * @type {function(new:Map, !Array.<!Array.<*>>=)}
         *
         * @memberOf libjass
         */
        exports.Map = global.Map;
        if (exports.Map === undefined || typeof exports.Map.prototype.forEach !== "function" || function () {
            try {
                return new exports.Map([ [ 1, "foo" ], [ 2, "bar" ] ]).size !== 2;
            } catch (ex) {
                return true;
            }
        }()) {
            exports.Map = SimpleMap;
        }
        /**
         * Sets the Map implementation used by libjass to the provided one. If null, {@link ./utility/map.SimpleMap} is used.
         *
         * @param {?function(new:Map, !Array.<!Array.<*>>=)} value
         */
        function setImplementation(value) {
            if (value !== null) {
                exports.Map = value;
            } else {
                exports.Map = SimpleMap;
            }
        }
        exports.setImplementation = setImplementation;
    }, /* 30 ./utility/mixin */ function (exports) {
        /**
         * Adds properties of the given mixins' prototypes to the given class's prototype.
         *
         * @param {!*} clazz
         * @param {!Array.<*>} mixins
         */
        function mixin(clazz, mixins) {
            for (var _i = 0; _i < mixins.length; _i++) {
                var mixin_1 = mixins[_i];
                for (var _a = 0, _b = Object.getOwnPropertyNames(mixin_1.prototype); _a < _b.length; _a++) {
                    var name_1 = _b[_a];
                    clazz.prototype[name_1] = mixin_1.prototype[name_1];
                }
            }
        }
        exports.mixin = mixin;
    }, /* 31 ./utility/promise */ function (exports) {
        /**
         * Promise implementation for browsers that don't support it.
         *
         * @param {function(function(T), function(*))} resolver
         */
        var SimplePromise = function () {
            function SimplePromise(resolver) {
                var _this = this;
                this._state = SimplePromiseState.PENDING;
                this._thens = [];
                this._propagateIsPending = false;
                this._alreadyFulfilledValue = null;
                this._alreadyRejectedReason = null;
                try {
                    resolver(function (value) {
                        return _this._resolve(value);
                    }, function (reason) {
                        return _this._reject(reason);
                    });
                } catch (ex) {
                    this._reject(ex);
                }
            }
            /**
             * @param {?function(T):(U|Promise.<U>)} fulfilledHandler
             * @param {?function(*):(U|Promise.<U>)} rejectedHandler
             * @return {!Promise.<U>}
             *
             * @template U
             */
            SimplePromise.prototype.then = function (fulfilledHandler, rejectedHandler) {
                var _this = this;
                fulfilledHandler = typeof fulfilledHandler === "function" ? fulfilledHandler : null;
                rejectedHandler = typeof rejectedHandler === "function" ? rejectedHandler : null;
                if (fulfilledHandler === null && rejectedHandler === null) {
                    return this;
                }
                if (fulfilledHandler === null) {
                    fulfilledHandler = function (value) {
                        return value;
                    };
                }
                if (rejectedHandler === null) {
                    rejectedHandler = function (reason) {
                        throw reason;
                    };
                }
                var result = new exports.Promise(function (resolve, reject) {
                    _this._thens.push({
                        propagateFulfilling: function (value) {
                            try {
                                resolve(fulfilledHandler(value));
                            } catch (ex) {
                                reject(ex);
                            }
                        },
                        propagateRejection: function (reason) {
                            try {
                                resolve(rejectedHandler(reason));
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                    });
                });
                this._propagateResolution();
                return result;
            };
            /**
             * @param {function(*):(T|Promise.<T>)} rejectedHandler
             * @return {!Promise.<T>}
             */
            SimplePromise.prototype.catch = function (rejectedHandler) {
                return this.then(null, rejectedHandler);
            };
            /**
             * @return {boolean}
             */
            SimplePromise.prototype.isFulfilled = function () {
                return this._state === SimplePromiseState.FULFILLED;
            };
            /**
             * @return {boolean}
             */
            SimplePromise.prototype.isRejected = function () {
                return this._state === SimplePromiseState.REJECTED;
            };
            /**
             * @return {boolean}
             */
            SimplePromise.prototype.isPending = function () {
                return this._state === SimplePromiseState.PENDING;
            };
            /**
             * @return {T}
             */
            SimplePromise.prototype.value = function () {
                if (this._state !== SimplePromiseState.FULFILLED) {
                    throw new Error("This promise is not in FULFILLED state.");
                }
                return this._alreadyFulfilledValue;
            };
            /**
             * @return {*}
             */
            SimplePromise.prototype.reason = function () {
                if (this._state !== SimplePromiseState.REJECTED) {
                    throw new Error("This promise is not in FULFILLED state.");
                }
                return this._alreadyRejectedReason;
            };
            /**
             * @param {T|!Promise.<T>} value
             * @return {!Promise.<T>}
             *
             * @template T
             * @static
             */
            SimplePromise.resolve = function (value) {
                if (value instanceof SimplePromise) {
                    return value;
                }
                return new exports.Promise(function (resolve) {
                    return resolve(value);
                });
            };
            /**
             * @param {!Array.<T|!Promise.<T>>} values
             * @return {!Promise.<!Array.<T>>}
             *
             * @template T
             * @static
             */
            SimplePromise.all = function (values) {
                return new exports.Promise(function (resolve, reject) {
                    var result = [];
                    var numUnresolved = values.length;
                    if (numUnresolved === 0) {
                        resolve(result);
                        return;
                    }
                    values.forEach(function (value, index) {
                        return exports.Promise.resolve(value).then(function (value) {
                            result[index] = value;
                            numUnresolved--;
                            if (numUnresolved === 0) {
                                resolve(result);
                            }
                        });
                    }, reject);
                });
            };
            /**
             * @param {T|!Promise.<T>} value
             *
             * @private
             */
            SimplePromise.prototype._resolve = function (value) {
                var _this = this;
                var alreadyCalled = false;
                try {
                    if (value === this) {
                        throw new TypeError("2.3.1");
                    }
                    var thenMethod = SimplePromise._getThenMethod(value);
                    if (thenMethod === null) {
                        this._fulfill(value);
                        return;
                    }
                    thenMethod.call(value, function (value) {
                        if (alreadyCalled) {
                            return;
                        }
                        alreadyCalled = true;
                        _this._resolve(value);
                    }, function (reason) {
                        if (alreadyCalled) {
                            return;
                        }
                        alreadyCalled = true;
                        _this._reject(reason);
                    });
                } catch (ex) {
                    if (alreadyCalled) {
                        return;
                    }
                    this._reject(ex);
                }
            };
            /**
             * @param {T} value
             *
             * @private
             */
            SimplePromise.prototype._fulfill = function (value) {
                if (this._state !== SimplePromiseState.PENDING) {
                    return;
                }
                this._state = SimplePromiseState.FULFILLED;
                this._alreadyFulfilledValue = value;
                this._propagateResolution();
            };
            /**
             * @param {*} reason
             *
             * @private
             */
            SimplePromise.prototype._reject = function (reason) {
                if (this._state !== SimplePromiseState.PENDING) {
                    return;
                }
                this._state = SimplePromiseState.REJECTED;
                this._alreadyRejectedReason = reason;
                this._propagateResolution();
            };
            /**
             * @param {!*} obj
             * @return {?function(function(T):(T|!Promise.<T>), function(*):(T|!Promise.<T>)):!Promise.<T>}
             *
             * @template T
             * @private
             * @static
             */
            SimplePromise._getThenMethod = function (obj) {
                if (typeof obj !== "object" && typeof obj !== "function") {
                    return null;
                }
                if (obj === null || obj === undefined) {
                    return null;
                }
                var then = obj.then;
                if (typeof then !== "function") {
                    return null;
                }
                return then;
            };
            /**
             * Propagates the result of the current promise to all its children.
             *
             * @private
             */
            SimplePromise.prototype._propagateResolution = function () {
                var _this = this;
                if (this._state === SimplePromiseState.PENDING) {
                    return;
                }
                if (this._propagateIsPending) {
                    return;
                }
                this._propagateIsPending = true;
                SimplePromise._nextTick(function () {
                    _this._propagateIsPending = false;
                    if (_this._state === SimplePromiseState.FULFILLED) {
                        while (_this._thens.length > 0) {
                            var nextThen = _this._thens.shift();
                            nextThen.propagateFulfilling(_this._alreadyFulfilledValue);
                        }
                    } else if (_this._state === SimplePromiseState.REJECTED) {
                        while (_this._thens.length > 0) {
                            var nextThen = _this._thens.shift();
                            nextThen.propagateRejection(_this._alreadyRejectedReason);
                        }
                    }
                });
            };
            // Based on https://github.com/petkaantonov/bluebird/blob/1b1467b95442c12378d0ea280ede61d640ab5510/src/schedule.js
            SimplePromise._nextTick = function () {
                var MutationObserver = global.MutationObserver || global.WebkitMutationObserver;
                if (global.process !== undefined && typeof global.process.nextTick === "function") {
                    return function (callback) {
                        global.process.nextTick(callback);
                    };
                } else if (MutationObserver !== undefined) {
                    var pending = [];
                    var currentlyPending = false;
                    var div = document.createElement("div");
                    var observer = new MutationObserver(function () {
                        var processing = pending;
                        pending = [];
                        for (var _i = 0; _i < processing.length; _i++) {
                            var callback = processing[_i];
                            callback();
                        }
                        currentlyPending = false;
                        if (pending.length > 0) {
                            div.classList.toggle("foo");
                            currentlyPending = true;
                        }
                    });
                    observer.observe(div, {
                        attributes: true
                    });
                    return function (callback) {
                        pending.push(callback);
                        if (!currentlyPending) {
                            div.classList.toggle("foo");
                            currentlyPending = true;
                        }
                    };
                } else {
                    return function (callback) {
                        return setTimeout(callback, 0);
                    };
                }
            }();
            return SimplePromise;
        }();
        /**
         * The state of the {@link ./utility/promise.SimplePromise}
         *
         * @enum
         * @private
         */
        var SimplePromiseState;
        (function (SimplePromiseState) {
            SimplePromiseState[SimplePromiseState["PENDING"] = 0] = "PENDING";
            SimplePromiseState[SimplePromiseState["FULFILLED"] = 1] = "FULFILLED";
            SimplePromiseState[SimplePromiseState["REJECTED"] = 2] = "REJECTED";
        })(SimplePromiseState || (SimplePromiseState = {}));
        /**
         * Set to the global implementation of Promise if the environment has one, else set to {@link ./utility/promise.SimplePromise}
         *
         * Set it to null to force {@link ./utility/promise.SimplePromise} to be used even if a global Promise is present.
         *
         * @type {function(new:Promise)}
         *
         * @memberOf libjass
         */
        exports.Promise = global.Promise;
        if (exports.Promise === undefined) {
            exports.Promise = SimplePromise;
        }
        /**
         * Sets the Promise implementation used by libjass to the provided one. If null, {@link ./utility/promise.SimplePromise} is used.
         *
         * @param {?function(new:Promise)} value
         */
        function setImplementation(value) {
            if (value !== null) {
                exports.Promise = value;
            } else {
                exports.Promise = SimplePromise;
            }
        }
        exports.setImplementation = setImplementation;
        /**
         * A deferred promise.
         *
         * @constructor
         * @memberOf libjass
         * @template T
         */
        var DeferredPromise = function () {
            function DeferredPromise() {
                var _this = this;
                this._promise = new exports.Promise(function (resolve, reject) {
                    _this._resolve = resolve;
                    _this._reject = reject;
                });
            }
            Object.defineProperty(DeferredPromise.prototype, "promise", {
                /**
                 * @type {!Promise.<T>}
                 */
                get: function () {
                    return this._promise;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * @param {T} value
             */
            DeferredPromise.prototype.resolve = function (value) {
                this._resolve(value);
            };
            /**
             * @param {*} reason
             */
            DeferredPromise.prototype.reject = function (reason) {
                this._reject(reason);
            };
            return DeferredPromise;
        }();
        exports.DeferredPromise = DeferredPromise;
    }, /* 32 ./utility/set */ function (exports) {
        /**
         * Set implementation for browsers that don't support it. Only supports Number and String elements.
         *
         * Elements are stored as properties of an object, with names derived from their type.
         *
         * @param {!Array.<T>=} iterable Only an array of values is supported.
         */
        var SimpleSet = function () {
            function SimpleSet(iterable) {
                this.clear();
                if (iterable === undefined) {
                    return;
                }
                if (!Array.isArray(iterable)) {
                    throw new Error("Non-array iterables are not supported by the SimpleSet constructor.");
                }
                for (var _i = 0; _i < iterable.length; _i++) {
                    var value = iterable[_i];
                    this.add(value);
                }
            }
            /**
             * @param {T} value
             * @return {libjass.Set.<T>} This set
             */
            SimpleSet.prototype.add = function (value) {
                var property = this._toProperty(value);
                if (property === null) {
                    throw new Error("This Set implementation only supports Number and String values.");
                }
                if (!(property in this._elements)) {
                    this._size++;
                }
                this._elements[property] = value;
                return this;
            };
            /**
             */
            SimpleSet.prototype.clear = function () {
                this._elements = Object.create(null);
                this._size = 0;
            };
            /**
             * @param {T} value
             * @return {boolean}
             */
            SimpleSet.prototype.has = function (value) {
                var property = this._toProperty(value);
                if (property === null) {
                    return false;
                }
                return property in this._elements;
            };
            /**
             * @param {function(T, T, libjass.Set.<T>)} callbackfn A function that is called with each value in the set.
             * @param {*} thisArg
             */
            SimpleSet.prototype.forEach = function (callbackfn, thisArg) {
                for (var _i = 0, _a = Object.keys(this._elements); _i < _a.length; _i++) {
                    var property = _a[_i];
                    var element = this._elements[property];
                    callbackfn.call(thisArg, element, element, this);
                }
            };
            Object.defineProperty(SimpleSet.prototype, "size", {
                /**
                 * @type {number}
                 */
                get: function () {
                    return this._size;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Converts the given value into a property name for the internal map.
             *
             * @param {T} value
             * @return {string}
             *
             * @private
             */
            SimpleSet.prototype._toProperty = function (value) {
                if (typeof value === "number") {
                    return "#" + value;
                }
                if (typeof value === "string") {
                    return "'" + value;
                }
                return null;
            };
            return SimpleSet;
        }();
        /**
         * Set to the global implementation of Set if the environment has one, else set to {@link ./utility/set.SimpleSet}
         *
         * Set it to null to force {@link ./utility/set.SimpleSet} to be used even if a global Set is present.
         *
         * @type {function(new:Set, !Array.<T>=)}
         *
         * @memberOf libjass
         */
        exports.Set = global.Set;
        if (exports.Set === undefined || typeof exports.Set.prototype.forEach !== "function" || function () {
            try {
                return new exports.Set([ 1, 2 ]).size !== 2;
            } catch (ex) {
                return true;
            }
        }()) {
            exports.Set = SimpleSet;
        }
        /**
         * Sets the Set implementation used by libjass to the provided one. If null, {@link ./utility/set.SimpleSet} is used.
         *
         * @param {?function(new:Set, !Array.<T>=)} value
         */
        function setImplementation(value) {
            if (value !== null) {
                exports.Set = value;
            } else {
                exports.Set = SimpleSet;
            }
        }
        exports.setImplementation = setImplementation;
    }, /* 33 ./webworker/channel */ function (exports, require) {
        var map_1 = require(29);
        var promise_1 = require(31);
        var commands_1 = require(34);
        var misc_1 = require(36);
        /**
         * Internal implementation of libjass.webworker.WorkerChannel
         *
         * @param {!*} comm The object used to talk to the other side of the channel. When created by the main thread, this is the Worker object.
         * When created by the web worker, this is its global object.
         *
         * @constructor
         * @implements {libjass.webworker.WorkerChannel}
         */
        var WorkerChannelImpl = function () {
            function WorkerChannelImpl(comm) {
                var _this = this;
                this._comm = comm;
                this._pendingRequests = new map_1.Map();
                this._comm.addEventListener("message", function (ev) {
                    return _this._onMessage(ev.data);
                }, false);
            }
            /**
             * @param {number} command
             * @param {*} parameters
             * @return {!Promise.<*>}
             */
            WorkerChannelImpl.prototype.request = function (command, parameters) {
                var deferred = new promise_1.DeferredPromise();
                var requestId = ++WorkerChannelImpl._lastRequestId;
                this._pendingRequests.set(requestId, deferred);
                var requestMessage = {
                    requestId: requestId,
                    command: command,
                    parameters: parameters
                };
                this._comm.postMessage(misc_1.serialize(requestMessage));
                return deferred.promise;
            };
            /**
             * @param {number} requestId
             */
            WorkerChannelImpl.prototype.cancelRequest = function (requestId) {
                var deferred = this._pendingRequests.get(requestId);
                if (deferred === undefined) {
                    return;
                }
                this._pendingRequests.delete(requestId);
                deferred.reject(new Error("Cancelled."));
            };
            /**
             * @param {!WorkerResponseMessage} message
             *
             * @private
             */
            WorkerChannelImpl.prototype._respond = function (message) {
                var requestId = message.requestId, error = message.error, result = message.result;
                if (error instanceof Error) {
                    error = {
                        message: error.message,
                        stack: error.stack
                    };
                }
                this._comm.postMessage(misc_1.serialize({
                    command: commands_1.WorkerCommands.Response,
                    requestId: requestId,
                    error: error,
                    result: result
                }));
            };
            /**
             * @param {string} rawMessage
             *
             * @private
             */
            WorkerChannelImpl.prototype._onMessage = function (rawMessage) {
                var _this = this;
                var message = misc_1.deserialize(rawMessage);
                if (message.command === commands_1.WorkerCommands.Response) {
                    var responseMessage = message;
                    var deferred = this._pendingRequests.get(responseMessage.requestId);
                    if (deferred !== undefined) {
                        this._pendingRequests.delete(responseMessage.requestId);
                        if (responseMessage.error === null) {
                            deferred.resolve(responseMessage.result);
                        } else {
                            deferred.reject(responseMessage.error);
                        }
                    }
                } else {
                    var requestMessage = message;
                    var requestId = requestMessage.requestId;
                    var commandCallback = misc_1.getWorkerCommandHandler(requestMessage.command);
                    if (commandCallback === undefined) {
                        this._respond({
                            requestId: requestId,
                            error: new Error("No handler registered for command " + requestMessage.command),
                            result: null
                        });
                        return;
                    }
                    commandCallback(requestMessage.parameters).then(function (result) {
                        return {
                            requestId: requestId,
                            error: null,
                            result: result
                        };
                    }, function (error) {
                        return {
                            requestId: requestId,
                            error: error,
                            result: null
                        };
                    }).then(function (responseMessage) {
                        return _this._respond(responseMessage);
                    });
                }
            };
            WorkerChannelImpl._lastRequestId = -1;
            return WorkerChannelImpl;
        }();
        exports.WorkerChannelImpl = WorkerChannelImpl;
        misc_1.registerWorkerCommand(commands_1.WorkerCommands.Ping, function () {
            return new promise_1.Promise(function (resolve) {
                return resolve();
            });
        });
    }, /* 34 ./webworker/commands */ function (exports) {
        /**
         * The commands that can be sent to or from a web worker.
         */
        (function (WorkerCommands) {
            WorkerCommands[WorkerCommands["Response"] = 0] = "Response";
            WorkerCommands[WorkerCommands["Parse"] = 1] = "Parse";
            WorkerCommands[WorkerCommands["Ping"] = 2] = "Ping";
        })(exports.WorkerCommands || (exports.WorkerCommands = {}));
    }, /* 35 ./webworker/index */ function (exports, require) {
        var channel_1 = require(33);
        var commands_1 = require(34);
        exports.WorkerCommands = commands_1.WorkerCommands;
        /**
         * Indicates whether web workers are supposed in this environment or not.
         *
         * @type {boolean}
         *
         * @memberOf libjass.webworker
         */
        exports.supported = typeof Worker !== "undefined";
        /**
         * Create a new web worker and returns a {@link libjass.webworker.WorkerChannel} to it.
         *
         * @param {string=} scriptPath The path to libjass.js to be loaded in the web worker. If the browser supports document.currentScript, the parameter is optional and, if not provided,
         * the path will be determined from the src attribute of the <script> element that contains the currently running copy of libjass.js
         * @return {!libjass.webworker.WorkerChannel} A communication channel to the new web worker.
         *
         * @memberOf libjass.webworker
         */
        function createWorker(scriptPath) {
            if (scriptPath === void 0) {
                scriptPath = _scriptNode.src;
            }
            return new channel_1.WorkerChannelImpl(new Worker(scriptPath));
        }
        exports.createWorker = createWorker;
        var _scriptNode = null;
        if (typeof document !== "undefined" && document.currentScript !== undefined) {
            _scriptNode = document.currentScript;
        }
        if (typeof WorkerGlobalScope !== "undefined" && global instanceof WorkerGlobalScope) {
            // This is a web worker. Set up a channel to talk back to the main thread.
            new channel_1.WorkerChannelImpl(global);
        }
    }, /* 36 ./webworker/misc */ function (exports, require) {
        var map_1 = require(29);
        var workerCommands = new map_1.Map();
        var classPrototypes = new map_1.Map();
        /**
         * Registers a handler for the given worker command.
         *
         * @param {number} command The command that this handler will handle. One of the {@link libjass.webworker.WorkerCommands} constants.
         * @param {function(*, function(*, *))} handler The handler. A function of the form (parameters: *, response: function(error: *, result: *): void): void
         */
        function registerWorkerCommand(command, handler) {
            workerCommands.set(command, handler);
        }
        exports.registerWorkerCommand = registerWorkerCommand;
        /**
         * Gets the handler for the given worker command.
         *
         * @param {number} command
         * @return {?function(*, function(*, *))}
         */
        function getWorkerCommandHandler(command) {
            return workerCommands.get(command);
        }
        exports.getWorkerCommandHandler = getWorkerCommandHandler;
        /**
         * Registers a prototype as a deserializable type.
         *
         * @param {!*} prototype
         */
        function registerClassPrototype(prototype) {
            prototype._classTag = classPrototypes.size;
            classPrototypes.set(prototype._classTag, prototype);
        }
        exports.registerClassPrototype = registerClassPrototype;
        /**
         * @param {*} obj
         * @return {string}
         */
        function serialize(obj) {
            return JSON.stringify(obj, function (/* ujs:unreferenced */ key, value) {
                if (value && value._classTag !== undefined) {
                    value._classTag = value._classTag;
                }
                return value;
            });
        }
        exports.serialize = serialize;
        /**
         * @param {string} str
         * @return {*}
         */
        function deserialize(str) {
            return JSON.parse(str, function (/* ujs:unreferenced */ key, value) {
                if (value && value._classTag !== undefined) {
                    var hydratedValue = Object.create(classPrototypes.get(value._classTag));
                    for (var _i = 0, _a = Object.keys(value); _i < _a.length; _i++) {
                        var key_1 = _a[_i];
                        if (key_1 !== "_classTag") {
                            hydratedValue[key_1] = value[key_1];
                        }
                    }
                    value = hydratedValue;
                }
                return value;
            });
        }
        exports.deserialize = deserialize;
    } ]);
});
//# sourceMappingURL=libjass.js.map