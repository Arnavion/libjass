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

///<reference path="libjass.ts" />

"use strict";

interface Array<T> {
	toIterable(): any
	// TODO: Change the return type back to libjass.Iterable when https://typescript.codeplex.com/workitem/1454 is fixed.
}

module libjass {
	export class Iterable {
		/**
		 * The base class of all iterable objects. An iterable is a lazily evaluated sequence.
		 *
		 * @constructor
		 */
		constructor() { }

		/**
		 * @param {function(*): *} transform A function (element) -> (transformedElement)
		 * @return {!Iterable} A new Iterable with the given transform applied
		 */
		map(transform: (element: any) => any): Iterable {
			return new SelectIterable(this, transform);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns true if element should remain in the enumeration.
		 * @return {!Iterable} A new Iterable with the given filter applied
		 */
		filter(filter: (element: any) => boolean): Iterable {
			return new WhereIterable(this, filter);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns false for an element if enumeration of this Iterable should stop at that element.
		 * @return {!Iterable} A new Iterable with the given filter applied
		 */
		takeWhile(filter: (element: any) => boolean): Iterable {
			return new TakeWhileIterable(this, filter);
		}

		/**
		 * @param {number} count The number of elements to skip
		 * @return {!Iterable} A new Iterable that skips the given number of elements
		 */
		skip(count: number): Iterable {
			return new SkipIterable(this, count);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns true for an element if enumeration of this Iterable should skip all elements upto that element.
		 * @return {!Iterable} A new Iterable with the given filter applied
		 */
		skipWhile(filter: (element: any) => boolean): Iterable {
			return new SkipWhileIterable(this, filter);
		}
	}

	// If this browser does not have an implementation of StopIteration, mock it
	if (!window.StopIteration) {
		window.StopIteration = Object.create(null);
	}

	class IteratorBase implements Iterator {
		constructor() { }

		next(): any {
			throw new Error("Pure virtual method call.");
		}

		forEach(func: (element: any) => void ): void {
			throw new Error("Pure virtual method call.");
		}

		toArray(): Array {
			throw new Error("Pure virtual method call.");
		}
	}

	/**
	 * A default Iterator for arrays in case Iterator(Array) is not defined by the browser.
	 *
	 * @constructor
	 * @param {!Array} array
	 */
	class ArrayIterator extends IteratorBase {
		// The index of the element which will be returned in the next call to next()
		private _currentIndex = 0;

		constructor(private _array: Array) {
			super();
		}

		/**
		 * @return {!Array} Returns a tuple [index, element]
		 */
		next(): any[] {
			// Loop through the array looking for an element to return
			while (this._currentIndex < this._array.length) {
				// If the index is less than the array's length and an element is in the array at that index
				if (this._currentIndex in this._array) {
					var oldCurrentIndex = this._currentIndex;
					this._currentIndex++;
					// ... return it
					return [oldCurrentIndex, this._array[oldCurrentIndex]];
				}
				// Else advance to the next index
				else {
					this._currentIndex++;
				}
			}
			// If there are no more elements in the array, throw StopIteration
			throw StopIteration;
		}
	}

	var iteratorPrototype: Iterator;

	if (!window.Iterator) {
		/**
		 * A default function for creating iterators in case it is not defined by the browser.
		 *
		 * @param {!*} collection
		 * @param {boolean=} keysOnly
		 * @return {!{next: function(): *}}
		 */
		window.Iterator = (collection: any, keysOnly?: boolean): Iterator => {
			if (keysOnly) {
				throw new Error("This Iterator implementation doesn't support keysOnly = true.");
			}

			if (typeof collection.__iterator__ === "function") {
				return <Iterator>collection.__iterator__();
			}
			else if (Array.isArray(collection)) {
				return new ArrayIterator(<Array>collection);
			}
			else {
				throw new Error("This Iterator implementation doesn't support iterating arbitrary objects.");
			}
		}

		iteratorPrototype = IteratorBase.prototype;
	}
	else {
		<any>IteratorBase.prototype = window.Iterator.prototype;
		iteratorPrototype = window.Iterator.prototype;
	}

	/**
	 * Calls the provided function for each element in this Iterable.
	 *
	 * @this {{next: function(): *}}
	 * @param {function(*)} func A function (element)
	 */
	iteratorPrototype.forEach = function (func: (element: any) => void) {
		var self: Iterator = this;

		try {
			for (; ;) {
				var result = self.next();
				func.call(self, result);
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
	 * @this {{next: function(): *}}
	 * @return {!Array} An array of the elements of this Iterable
	 */
	iteratorPrototype.toArray = function (): Array {
		var self: Iterator = this;

		var result: Array = [];
		self.forEach(element => {
			result.push(element);
		});
		return result;
	};

	/**
	 * This class is an Iterable returned by Array.toIterable() and represents an Iterable backed by the
	 * elements of that array.
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!Array} array
	 */
	class ArrayIterable extends Iterable {
		constructor(private _array: Array) {
			super();
		}

		/**
		 * @return {{next: function(): !Array}}
		 */
		__iterator__(): Iterator {
			return Iterator(this._array);
		}
	}

	/**
	 * @return {!Iterable} An Iterable backed by this Array
	 */
	Array.prototype.toIterable = function (): Iterable {
		return new ArrayIterable(this);
	}

	/**
	 * An Iterable returned from Iterable.map()
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!*} previous The underlying iterable
	 * @param {function(*): *} transform The transform function (element) -> (transformedElement)
	 */
	class SelectIterable extends Iterable {
		constructor(private _previous: any, private _transform: (element: any) => any) {
			super();
		}

		/**
		 * @return {!SelectIterator}
		 */
		__iterator__(): SelectIterator {
			return new SelectIterator(Iterator(this._previous), this._transform);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): *} transform
	 */
	class SelectIterator extends IteratorBase {
		constructor(private _previous: Iterator, private _transform: (element: any) => any) {
			super();
		}

		/**
		 * @return {*}
		 */
		next(): any {
			// Apply the transform function and return the transformed value
			return this._transform.call(this, this._previous.next());
		}
	}

	/**
	 * An Iterable returned from Iterable.filter()
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!*} previous The underlying iterable
	 * @param {function(*): boolean} filter The filter function (element) -> (Boolean)
	 */
	class WhereIterable extends Iterable {
		constructor(private _previous: any, private _filter: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!WhereIterator}
		 */
		__iterator__(): WhereIterator {
			return new WhereIterator(Iterator(this._previous), this._filter);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} filter
	 */
	class WhereIterator extends IteratorBase {
		constructor(private _previous: Iterator, private _filter: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {*}
		 */
		next(): any {
			// Loop to find the next element from the underlying Iterable which passes the filter and return it
			var result: any;
			do {
				result = this._previous.next();
			} while (!this._filter.call(this, result));
			return result;
		}
	}

	/**
	 * An Iterable returned from Iterable.takeWhile()
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!*} previous The underlying iterable
	 * @param {function(*): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class TakeWhileIterable extends Iterable {
		constructor(private _previous: any, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!TakeWhileIterator}
		 */
		__iterator__(): TakeWhileIterator {
			return new TakeWhileIterator(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} predicate
	 */
	class TakeWhileIterator extends IteratorBase {
		// Set to true when an element not matching the predicate is found
		private _foundEnd = false;

		constructor(private _previous: Iterator, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {*}
		 */
		next(): any {
			var result: any; // Assigned null to silence closure compiler warning

			// If we haven't already found the end in a previous call to next()
			if (!this._foundEnd) {
				// Get the next element from the underlying Iterable and see if we've found the end now
				result = this._previous.next();
				this._foundEnd = !this._predicate.call(this, result);
			}

			// If we haven't found the end, return the element
			if (!this._foundEnd) {
				return result;
			}
			// Else throw StopIteration
			else {
				throw StopIteration;
			}
		}
	}

	/**
	 * An Iterable returned from Iterable.skip()
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!*} previous The underlying iterable
	 * @param {number} count The number of elements to skip
	 */
	class SkipIterable extends Iterable {
		constructor(private _previous: any, private _count: number) {
			super();
		}

		/**
		 * @return {!SkipIterator}
		 */
		__iterator__(): SkipIterator {
			return new SkipIterator(Iterator(this._previous), this._count);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {number} count
	 */
	class SkipIterator extends IteratorBase {
		private _skipped = 0;

		constructor(private _previous: Iterator, private _count: number) {
			super();
		}

		/**
		 * @return {*}
		 */
		next(): any {
			for (; this._skipped < this._count; this._skipped++) {
				this._previous.next();
			}

			return this._previous.next();
		}
	}

	/**
	 * An Iterable returned from Iterable.skipWhile()
	 *
	 * @constructor
	 * @extends {Iterable}
	 * @param {!*} previous The underlying iterable
	 * @param {function(*): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class SkipWhileIterable extends Iterable {
		constructor(private _previous: any, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!SkipWhileIterator}
		 */
		__iterator__(): SkipWhileIterator {
			return new SkipWhileIterator(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} predicate
	 */
	class SkipWhileIterator extends IteratorBase {
		// Set to true when an element not matching the filter is found
		private _foundStart = false;

		constructor(private _previous: Iterator, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {*}
		 */
		next(): any {
			var result: any;

			do {
				// Get the next element
				result = this._previous.next();
				// and see if we've already found the start, or if we've found it now
				this._foundStart = this._foundStart || !this._predicate.call(this, result);
			} while (!this._foundStart); // Keep looping till we find the start

			// We've found the start, so return the element
			return result;
		}
	}
}
