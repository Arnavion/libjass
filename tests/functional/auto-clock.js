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

define(["intern!tdd", "intern/chai!assert", "require", "intern/dojo/node!leadfoot/helpers/pollUntil"], function (tdd, assert, require, pollUntil) {
	tdd.suite("Auto clock", function () {
		tdd.test("Operations", function () {
		this.remote.session.setExecuteAsyncTimeout(10000);

		return this.remote
			.get(require.toUrl("tests/support/browser-test-page.html"))
			.then(pollUntil('return (document.readyState === "complete") ? true : null;'), 100)
			.execute(function () {
				window.driverStartTime = 0;
				window.driverStartTimeAt = new Date();
				window.driver = function () {
					return (new Date() - driverStartTimeAt) / 1000 + driverStartTime;
				};

				window.clock = new libjass.renderers.AutoClock(driver);

				window.events = [];

				clock.addEventListener(libjass.renderers.ClockEvent.Play, function () {
					events.push("play");
				});

				clock.addEventListener(libjass.renderers.ClockEvent.Tick, function () {
					events.push("tick");
				});

				clock.addEventListener(libjass.renderers.ClockEvent.Pause, function () {
					events.push("pause");
				});

				clock.addEventListener(libjass.renderers.ClockEvent.Stop, function () {
					events.push("stop");
				});

				return { enabled: clock.enabled, paused: clock.paused, rate: clock.rate, events: events.slice() };
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, true);
				assert.strictEqual(clock.rate, 1);
				assert.deepEqual(clock.events, []);
			})
			.executeAsync(function (callback) {
				clock.play();

				setTimeout(function () {
					callback({ enabled: clock.enabled, paused: clock.paused, events: events.slice() });
				}, 1000);
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, false);

				assert(clock.events.length >= 2);
				assert.strictEqual(clock.events[0], "play");
				for (var i = 1; i < clock.events.length; i++) {
					assert.strictEqual(clock.events[i], "tick");
				}
			})
			.execute(function () {
				events = [];

				clock.disable();

				return { enabled: clock.enabled, paused: clock.paused, events: events.slice() };
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, false);
				assert.strictEqual(clock.paused, true);
				assert.deepEqual(clock.events, ["pause", "stop"]);
			})
			.execute(function () {
				events = [];

				clock.enable();

				return { enabled: clock.enabled, paused: clock.paused, events: events.slice() };
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, true);
				assert.deepEqual(clock.events, []);
			})
			.executeAsync(function (callback) {
				clock.play();

				setTimeout(function () {
					callback({ enabled: clock.enabled, paused: clock.paused, events: events.slice() });
				}, 1000);
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, false);

				assert(clock.events.length >= 2);
				assert.strictEqual(clock.events[0], "play");
				for (var i = 1; i < clock.events.length; i++) {
					assert.strictEqual(clock.events[i], "tick");
				}
			})
			.execute(function () {
				events = [];

				driverStartTime = 30000;
				clock.seeking();

				var result = { enabled: clock.enabled, paused: clock.paused, currentTime: clock.currentTime, events: events.slice() };
				events = [];
				return result;
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, true);
				assert(clock.currentTime >= 30);
				assert.deepEqual(clock.events, ["pause", "stop", "play", "tick", "pause"]);
			})
			.executeAsync(function (callback) {
				setTimeout(function () {
					callback({ enabled: clock.enabled, paused: clock.paused, currentTime: clock.currentTime, events: events.slice() });
				}, 1000);
			})
			.then(function (clock) {
				assert.strictEqual(clock.enabled, true);
				assert.strictEqual(clock.paused, false);
				assert(clock.currentTime >= 31);

				assert(clock.events.length >= 2);
				assert.strictEqual(clock.events[0], "play");
				for (var i = 1; i < clock.events.length; i++) {
					assert.strictEqual(clock.events[i], "tick");
				}
			});
		});
	});
});
