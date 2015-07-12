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

define(["intern!tdd", "intern/chai!assert", "libjass"], function (tdd, assert, libjass) {
	tdd.suite("Manual clock", function () {
		tdd.test("Operations", function () {
			var clock = new libjass.renderers.ManualClock();

			var events = [];

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

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.rate, 1);

			clock.disable();

			assert.strictEqual(clock.enabled, false);
			assert.strictEqual(clock.paused, true);
			assert.deepEqual(events, ["stop"]);
			events = [];

			clock.enable();

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.deepEqual(events, []);
			events = [];

			clock.play();

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.deepEqual(events, ["play"]);
			events = [];

			clock.tick(1);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 1);
			assert.deepEqual(events, ["tick"]);
			events = [];

			clock.tick(2);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 2);
			assert.deepEqual(events, ["tick"]);
			events = [];

			clock.tick(2);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 2);
			assert.deepEqual(events, []);
			events = [];

			clock.pause();

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 2);
			assert.deepEqual(events, ["pause"]);
			events = [];

			clock.tick(2);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 2);
			assert.deepEqual(events, []);
			events = [];

			clock.tick(3);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 3);
			assert.deepEqual(events, ["play", "tick"]);
			events = [];

			clock.disable();

			assert.strictEqual(clock.enabled, false);
			assert.strictEqual(clock.paused, true);
			assert.deepEqual(events, ["pause", "stop"]);
			events = [];

			clock.tick(4);

			assert.strictEqual(clock.enabled, false);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 3);
			assert.deepEqual(events, []);
			events = [];

			clock.enable();

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 3);
			assert.deepEqual(events, []);
			events = [];

			clock.tick(4);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 4);
			assert.deepEqual(events, ["play", "tick"]);
			events = [];

			clock.seek(5);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 5);
			assert.deepEqual(events, ["pause", "stop", "play", "tick", "pause"]);
			events = [];

			clock.seek(6);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 6);
			assert.deepEqual(events, ["stop", "play", "tick", "pause"]);
			events = [];

			clock.seek(6);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 6);
			assert.deepEqual(events, []);
			events = [];

			clock.tick(6);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, true);
			assert.strictEqual(clock.currentTime, 6);
			assert.deepEqual(events, []);
			events = [];

			clock.tick(7);

			assert.strictEqual(clock.enabled, true);
			assert.strictEqual(clock.paused, false);
			assert.strictEqual(clock.currentTime, 7);
			assert.deepEqual(events, ["play", "tick"]);
			events = [];
		});
	});
});
