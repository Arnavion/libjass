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
	tdd.suite("SimpleSet", function () {
		var originalSet = null;

		tdd.before(function () {
			assert.isFunction(libjass.Set, "libjass.Set is not a function.");

			originalSet = libjass.Set;

			var nativeSetShouldBeUsed = typeof Set !== "undefined" && typeof Set.prototype.forEach === "function" && (function () {
				try {
					return new Set([1, 2]).size === 2;
				}
				catch (ex) {
					return false;
				}
			})();

			if (nativeSetShouldBeUsed) {
				assert.equal(originalSet, Set, "libjass.Set did not default to the runtime's implementation.");
			}

			libjass.Set = null;
			assert.isNotNull(libjass.Set, "libjass.Set actually got set to null instead of SimpleSet.");

			if (nativeSetShouldBeUsed) {
				assert.notEqual(libjass.Set, originalSet, "libjass.Set is still the runtime's implementation of Set.");
			}
		});

		tdd.test("Basic", function () {
			var set = new libjass.Set();

			// Empty
			assert.equal(set.size, 0);
			assert.isFalse(set.has(5), "Empty set has 5.");
			assert.isFalse(set.has(6), "Empty set has 6.");
			set.forEach(function () {
				throw new Error("forEach callback called for empty set.");
			});

			// Add 5
			set.add(5);

			assert.equal(set.size, 1);
			assert.isTrue(set.has(5));

			var timesCalled = 0;
			set.forEach(function (value, index, theSet) {
				assert.equal(value, 5);
				assert.equal(index, value);
				assert.equal(theSet, set);
				timesCalled++;
			});
			assert.equal(timesCalled, 1, "forEach callback called more than once.");

			// Add 5 again
			set.add(5);

			assert.equal(set.size, 1);
			assert.isTrue(set.has(5));

			// Add 6
			set.add(6);

			assert.equal(set.size, 2);
			assert.isTrue(set.has(6));

			timesCalled = 0;
			var fiveFound = false;
			var sixFound = false;
			set.forEach(function (value, index, theSet) {
				if (value === 5) {
					fiveFound = true;
				}
				else if (value === 6) {
					sixFound = true;
				}
				assert.equal(index, value);
				assert.equal(theSet, set);
				timesCalled++;
			});
			assert.equal(timesCalled, 2, "forEach callback called more than twice.");
			assert.isTrue(fiveFound, "5 was not found.");
			assert.isTrue(sixFound, "6 was not found.");

			// Clear
			set.clear();

			assert.equal(set.size, 0);

			assert.isFalse(set.has(5), "Set still has 5 after being cleared.");
			assert.isFalse(set.has(6), "Set still has 6 after being cleared.");

			set.forEach(function () {
				throw new Error("forEach callback called for empty set.");
			});
		});

		tdd.after(function () {
			libjass.Set = originalSet;
			assert.equal(libjass.Set, originalSet, "libjass.Set did not get reset to the original value.");
		});
	});

	tdd.suite("SimpleMap", function () {
		var originalMap = null;

		tdd.before(function () {
			assert.isFunction(libjass.Map, "libjass.Map is not a function.");

			originalMap = libjass.Map;

			var nativeMapShouldBeUsed = typeof Map === "function" && typeof Map.prototype.forEach === "function" && (function () {
				try {
					return new Map([[1, "foo"], [2, "bar"]]).size === 2;
				}
				catch (ex) {
					return false;
				}
			})();

			if (nativeMapShouldBeUsed) {
				assert.equal(originalMap, Map, "libjass.Map did not default to the runtime's implementation.");
			}

			libjass.Map = null;
			assert.isNotNull(libjass.Map, "libjass.Map actually got set to null instead of SimpleMap.");

			if (nativeMapShouldBeUsed) {
				assert.notEqual(libjass.Map, originalMap, "libjass.Map is still the runtime's implementation of Map.");
			}
		});

		tdd.test("Basic", function () {
			var map = new libjass.Map();

			// Empty
			assert.equal(map.size, 0);
			assert.isFalse(map.has(5), "Empty map has 5.");
			assert.isFalse(map.has(6), "Empty map has 6.");
			map.forEach(function () {
				throw new Error("forEach callback called for empty map.");
			});

			// Set 5 = "a"
			map.set(5, "a");

			assert.equal(map.size, 1);
			assert.isTrue(map.has(5));

			var timesCalled = 0;
			map.forEach(function (value, index, theMap) {
				assert.equal(value, "a");
				assert.equal(index, 5);
				assert.equal(theMap, map);
				timesCalled++;
			});
			assert.equal(timesCalled, 1, "forEach callback called more than once.");

			// Set 5 = "b"
			map.set(5, "b");

			assert.equal(map.size, 1);
			assert.isTrue(map.has(5));

			timesCalled = 0;
			map.forEach(function (value, index, theMap) {
				assert.equal(value, "b");
				assert.equal(index, 5);
				assert.equal(theMap, map);
				timesCalled++;
			});
			assert.equal(timesCalled, 1, "forEach callback called more than once.");

			// Set 6 = "c"
			map.set(6, "c");

			assert.equal(map.size, 2);
			assert.isTrue(map.has(6));

			timesCalled = 0;
			var fiveFound = false;
			var sixFound = false;
			map.forEach(function (value, index, theMap) {
				if (index === 5) {
					assert.equal(value, "b");
					fiveFound = true;
				}
				else if (index === 6) {
					assert.equal(value, "c");
					sixFound = true;
				}
				assert.equal(theMap, map);
				timesCalled++;
			});
			assert.equal(timesCalled, 2, "forEach callback called more than twice.");
			assert.isTrue(fiveFound, "5 was not found.");
			assert.isTrue(sixFound, "6 was not found.");

			// Clear
			map.clear();

			assert.equal(map.size, 0);

			assert.isFalse(map.has(5), "Map still has 5 after being cleared.");
			assert.isFalse(map.has(6), "Map still has 6 after being cleared.");

			map.forEach(function () {
				throw new Error("forEach callback called for empty map.");
			});
		});

		tdd.after(function () {
			libjass.Map = originalMap;
			assert.equal(libjass.Map, originalMap, "libjass.Map did not get reset to the original value.");
		});
	});

	tdd.suite("SimplePromise", function () {
		var originalPromise = null;

		tdd.before(function () {
			assert.isFunction(libjass.Promise, "libjass.Promise is not a function.");

			originalPromise = libjass.Promise;

			if (typeof Promise !== "undefined") {
				assert.equal(originalPromise, Promise, "libjass.Promise did not default to the runtime's implementation.");
			}

			libjass.Promise = null;
			assert.isNotNull(libjass.Promise, "libjass.Promise actually got set to null instead of SimplePromise.");

			if (typeof Promise !== "undefined") {
				assert.notEqual(libjass.Promise, originalPromise, "libjass.Promise is still the runtime's implementation of Promise.");
			}
		});

		tdd.test("Basic", function () {
			var deferred = this.async(1000);

			new libjass.Promise(function (resolve, reject) {
				setTimeout(function () {
					resolve(5);
				}, 0);
			}).then(function (value) {
				assert.equal(value, 5);
			}).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));

			return deferred.promise;
		});

		tdd.after(function () {
			libjass.Promise = originalPromise;
			assert.equal(libjass.Promise, originalPromise, "libjass.Promise did not get reset to the original value.");
		});
	});
});
