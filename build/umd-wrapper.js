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

	if (typeof define === "function" && define.amd) {
		define([], function() {
			return factory(global);
		});
	}
	else if (typeof exports === "object" && typeof module === "object") {
		module.exports = factory(global);
	}
	else if (typeof exports === "object") {
		exports.libjass = factory(global);
	}
	else {
		root.libjass = factory(global);
	}
})(this, function (global) {
	"use strict";
	return (function (modules) {
		var installedModules = Object.create(null);
		function require(moduleId) {
			if (installedModules[moduleId]) {
				return installedModules[moduleId];
			}

			var exports = installedModules[moduleId] = Object.create(null);
			modules[moduleId](exports, require);
			return exports;
		}

		return require(0);
	})([
	]);
});
