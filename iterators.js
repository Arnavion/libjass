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

"use strict";

/**
 * The base class of all iterable objects. An iterable is a lazily evaluated sequence.
 *
 * @constructor
 */
var Iterable = function () {};

/**
 * @template T, U
 * @this {Iterable.<T>}
 * @param {function(T): U} transform A function (element) -> (transformedElement)
 * @return {!SelectIterable.<T, U>} A new Iterable with the given transform applied
 */
Iterable.prototype.map = function (transform) {
	return new SelectIterable(this, transform);
};

/**
 * @template T
 * @this {Iterable.<T>}
 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns true if element should remain in the enumeration.
 * @return {!WhereIterable.<T>} A new Iterable with the given filter applied
 */
Iterable.prototype.filter = function (filter) {
	return new WhereIterable(this, filter);
};

/**
 * @template T
 * @this {Iterable.<T>}
 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns false for an element if enumeration of this Iterable should stop at that element.
 * @return {!TakeWhileIterable.<T>} A new Iterable with the given filter applied
 */
Iterable.prototype.takeWhile = function (filter) {
	return new TakeWhileIterable(this, filter);
};

/**
 * @template T
 * @this {Iterable.<T>}
 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns true for an element if enumeration of this Iterable should skip all elements upto that element.
 * @return {!SkipWhileIterable.<T>} A new Iterable with the given filter applied
 */
Iterable.prototype.skipWhile = function (filter) {
	return new SkipWhileIterable(this, filter);
};

var iterablePrototype = new Iterable();

var iteratorPrototype;

if (!window.Iterator) {
	/**
	 * A default Iterator for arrays in case Iterator(Array) is not defined by the browser.
	 *
	 * @constructor
	 * @template T
	 * @this {ArrayIterator.<T>}
	 * @param {!Array.<T>} array
	 */
	var ArrayIterator = function (array) {
		// The index of the element which will be returned in the next call to next()
		var currentIndex = 0;

		/**
		 * @return {!Array.<Object>} Returns a tuple [index, element]
		 */
		this.next = function () {
			// Loop through the array looking for an element to return
			while (currentIndex < array.length) {
				// If the index is less than the array's length and an element is in the array at that index
				if (currentIndex in array) {
					var oldCurrentIndex = currentIndex;
					currentIndex++;
					// ... return it
					return [oldCurrentIndex, array[oldCurrentIndex]];
				}
				// Else advance to the next index
				else {
					currentIndex++;
				}
			}
			// If there are no more elements in the array, throw StopIteration
			throw StopIteration;
		};
	};

	/**
	 * A default function for creating iterators in case it is not defined by the browser.
	 *
	 * @param {!Object} collection
	 * @param {boolean=} keysOnly
	 * @return {!{next: function(): Object}}
	 */
	window["Iterator"] = function (collection, keysOnly) {
		var result;

		if (collection.__iterator__) {
			result = collection.__iterator__();
		}
		else {
			// Assume collection is an Array (or at least supports .length and the [] operator). Everything else is unsupported.
			result = new ArrayIterator(/** @type {!Array.<Object>} */ (collection));
		}

		if (!keysOnly) {
			return result;
		}
		else {
			return {
				next: function () {
					return result.next()[0];
				}
			};
		}
	};

	iteratorPrototype = ArrayIterator.prototype;
}
else {
	iteratorPrototype = Iterator.prototype;
}

/**
 * Calls the provided function for each element in this Iterable.
 *
 * @this {{next: function(): Object}}
 * @param {function(Object)} func A function (element)
 */
iteratorPrototype.forEach = function (func) {
	try {
		for (; ;) {
			var result = this.next();
			func.call(this, result);
		}
	}
	catch (ex) {
		if (ex !== StopIteration) {
			throw ex;
		}
	}
};

/**
 * Evaluates this iterable.
 *
 * @this {{next: function(): Object}}
 * @return {!Array.<Object>} An array of the elements of this Iterable
 */
iteratorPrototype.toArray = function () {
	var result = [];
	this.forEach(function (element) {
		result.push(element);
	});
	return result;
};

// If this browser does not have an implementation of StopIteration, mock it
if (!window["StopIteration"]) {
	window["StopIteration"] = {};
}

/**
 * This class is an Iterable returned by Array.toIterable() and represents an Iterable backed by the
 * elements of that array.
 *
 * @template T
 * @constructor
 * @this {ArrayIterable.<T>}
 * @extends {Iterable.<T>}
 * @param {!Array.<T>} array
 */
var ArrayIterable = function (array) {
	/**
	 * @return {{next: function(): Array.<Object>}}
	 */
	this.__iterator__ = function () {
		return Iterator(array);
	};
};
ArrayIterable.prototype = iterablePrototype;

/**
 * @template T
 * @this {Array.<T>}
 * @return {!ArrayIterable.<T>} An Iterable backed by this Array
 */
Array.prototype.toIterable = function () {
	return new ArrayIterable(this);
};

/**
 * An Iterable returned from Iterable.map()
 *
 * @constructor
 * @template T, U
 * @this {SelectIterable.<T, U>}
 * @extends {Iterable.<U>}
 * @param {!Object} previous The underlying iterable
 * @param {function(T): U} transform The transform function (element) -> (transformedElement)
 */
var SelectIterable = function (previous, transform) {
	/**
	 * @return {!SelectIterator.<T, U>}
	 */
	this.__iterator__ = function () {
		return new SelectIterator(Iterator(previous), transform);
	};
};
SelectIterable.prototype = iterablePrototype;

/**
 * @constructor
 * @template T, U
 * @this {SelectIterator.<T, U>}
 * @param {!{next: function(): T}} previous
 * @param {function(T): U} transform
 */
var SelectIterator = function (previous, transform) {
	var currentIndex = 0;

	/**
	 * @return {U}
	 */
	this.next = function () {
		// Apply the transform function and return the transformed value
		return transform.call(this, previous.next());
	};
};
SelectIterator.prototype = iteratorPrototype;

/**
 * An Iterable returned from Iterable.filter()
 *
 * @constructor
 * @template T
 * @this {WhereIterable.<T>}
 * @extends {Iterable.<T>}
 * @param {!Object} previous The underlying iterable
 * @param {function(T): boolean} filter The filter function (element) -> (Boolean)
 */
var WhereIterable = function (previous, filter) {
	/**
	 * @return {!WhereIterator.<T>}
	 */
	this.__iterator__ = function () {
		return new WhereIterator(Iterator(previous), filter);
	};
};
WhereIterable.prototype = iterablePrototype;

/**
 * @constructor
 * @template T
 * @this {WhereIterator.<T>}
 * @param {!{next: function(): T}} previous
 * @param {function(T): boolean} filter
 */
var WhereIterator = function (previous, filter) {
	/**
	 * @return {T}
	 */
	this.next = function () {
		// Loop to find the next element from the underlying Iterable which passes the filter and return it
		var result;
		do {
			result = previous.next();
		} while (!filter.call(this, result));
		return result;
	};
};
WhereIterator.prototype = iteratorPrototype;

/**
 * An Iterable returned from Iterable.takeWhile()
 *
 * @constructor
 * @template T
 * @this {TakeWhileIterable.<T>}
 * @extends {Iterable.<T>}
 * @param {!Object} previous The underlying iterable
 * @param {function(T): boolean} filter The filter function (element) -> (Boolean)
 */
var TakeWhileIterable = function (previous, filter) {
	/**
	 * @return {!TakeWhileIterator.<T>}
	 */
	this.__iterator__ = function () {
		return new TakeWhileIterator(Iterator(previous), filter);
	};
};
TakeWhileIterable.prototype = iterablePrototype;

/**
 * @constructor
 * @template T
 * @this {TakeWhileIterator.<T>}
 * @param {!{next: function(): T}} previous
 * @param {function(T): boolean} filter
 */
var TakeWhileIterator = function (previous, filter) {
	// Set to true when an element not matching the filter is found
	var foundEnd = false;

	/**
	 * @return {T}
	 */
	this.next = function () {
		var result = null; // Assigned null to silence closure compiler warning

		// If we haven't already found the end in a previous call to next()
		if (!foundEnd) {
			// Get the next element from the underlying Iterable and see if we've found the end now
			result = previous.next();
			foundEnd = !filter.call(this, result);
		}

		// If we haven't found the end, return the element
		if (!foundEnd) {
			return result;
		}
			// Else throw StopIteration
		else {
			throw StopIteration;
		}
	};
};
TakeWhileIterator.prototype = iteratorPrototype;

/**
 * An Iterable returned from Iterable.skipWhile()
 *
 * @constructor
 * @template T
 * @this {SkipWhileIterable.<T>}
 * @extends {Iterable.<T>}
 * @param {!Object} previous The underlying iterable
 * @param {function(T): boolean} filter The filter function (element) -> (Boolean)
 */
var SkipWhileIterable = function (previous, filter) {
	/**
	 * @return {!SkipWhileIterator.<T>}
	 */
	this.__iterator__ = function () {
		return new SkipWhileIterator(Iterator(previous), filter);
	};
};
SkipWhileIterable.prototype = iterablePrototype;

/**
 * @constructor
 * @template T
 * @this {SkipWhileIterator.<T>}
 * @param {!{next: function(): T}} previous
 * @param {function(T): boolean} filter
 */
var SkipWhileIterator = function (previous, filter) {
	// Set to true when an element matching the filter is found
	var foundStart = false;

	/**
	 * @return {T}
	 */
	this.next = function () {
		var result;

		do {
			// Get the next element
			result = previous.next();
			// and see if we've already found the start, or if we've found it now
			foundStart = foundStart || !filter.call(this, result);
		} while (!foundStart); // Keep looping till we find the start

		// We've found the start, so return the element
		return result;
	};
};
SkipWhileIterator.prototype = iteratorPrototype;
