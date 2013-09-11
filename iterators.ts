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

interface Iterator {
	next(): any
}

declare function Iterator(collection: any, keysOnly?: boolean): Iterator
declare var StopIteration: any

module libjass {
	export class LazySequence<T> {
		/**
		 * The base class of all lazy sequences.
		 *
		 * @constructor
		 * @template T
		 */
		constructor() { }

		/**
		 * @template U
		 * @param transform {function(T): U} A function (element) -> (transformedElement)
		 * @return {!LazySequence.<U>} A new LazySequence with the given transform applied
		 */
		map<U>(transform: (element: T) => U): LazySequence<U> {
			return new LazySequenceMap<T, U>(this, transform);
		}

		/**
		 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns true if element should remain in the enumeration.
		 * @return {!LazySequence.<T>} A new LazySequence with the given filter applied
		 */
		filter(filter: (element: T) => boolean): LazySequence<T> {
			return new LazySequenceFilter<T>(this, filter);
		}

		/**
		 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns false for an element if enumeration of this LazySequence should stop at that element.
		 * @return {!LazySequence.<T>} A new LazySequence which returns new elements from the underlying sequence as long as the predicate returns true for all of them
		 */
		takeWhile(filter: (element: T) => boolean): LazySequence<T> {
			return new LazySequenceTakeWhile<T>(this, filter);
		}

		/**
		 * @param {function(T): boolean} filter A function (element) -> (Boolean). Returns true for an element if enumeration of this LazySequence should skip all elements upto that element.
		 * @return {!LazySequence.<T>} A new LazySequence which returns new elements from the underlying sequence as soon as the predicate returns true for one of them
		 */
		skipWhile(filter: (element: T) => boolean): LazySequence<T> {
			return new LazySequenceSkipWhile<T>(this, filter);
		}

		/**
		 * @return {Array.<T>}
		 */
		toArray(): Array<T> {
			var result: Array = [];

			var iterator = Iterator(this);

			try {
				for (; ;) {
					result.push(iterator.next());
				}
			}
			catch (ex) {
				if (ex !== StopIteration) {
					throw ex;
				}
			}

			return result;
		}
	}

	/**
	 * @template T
	 * @param {Array.<T>} array
	 * @return {!LazySequence.<T>} A LazySequence backed by this Array
	 */
	export function Lazy<T>(array: Array<T>): LazySequence<T> {
		return new LazyArray<T>(array);
	}

	// If this browser does not have an implementation of StopIteration, mock it
	if (typeof StopIteration === "undefined") {
		global.StopIteration = Object.create(null);
	}

	/**
	 * A default Iterator for arrays in case Iterator(Array) is not defined by the browser.
	 *
	 * @constructor
	 * @param {!Array} array
	 */
	class ArrayIterator implements Iterator {
		// The index of the element which will be returned in the next call to next()
		private _currentIndex = 0;

		constructor(private _array: Array) { }

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

	if (typeof Iterator === "undefined") {
		/**
		 * A default function for creating iterators in case it is not defined by the browser.
		 *
		 * @param {!*} collection
		 * @param {boolean=} keysOnly
		 * @return {!{next: function(): *}}
		 */
		global.Iterator = (collection: any, keysOnly?: boolean): Iterator => {
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
	}

	/**
	 * This class is a LazySequence returned by Lazy(Array) and represents a LazySequence backed by the elements of that array.
	 *
	 * @constructor
	 * @template T
	 * @extends {LazySequence.<T>}
	 * @param {!Array} array
	 */
	class LazyArray<T> extends LazySequence<T> {
		constructor(private _array: Array<T>) {
			super();
		}

		/**
		 * @return {{next: function(): T}}
		 */
		__iterator__(): LazyArrayIterator<T> {
			return new LazyArrayIterator<T>(Iterator(this._array));
		}
	}

	/**
	 * @constructor
	 * @template T
	 * @param {!{next: function(): *}} previous
	 */
	class LazyArrayIterator<T> implements Iterator {
		constructor(private _previous: Iterator) { }

		/**
		 * @return {T}
		 */
		next(): T {
			var result: Array<any> = this._previous.next();

			return <T>result[1];
		}
	}

	/**
	 * A LazySequence returned from LazySequence.map()
	 *
	 * @constructor
	 * @template T, U
	 * @extends {LazySequence.<U>}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(T): U} transform The transform function (element) -> (transformedElement)
	 */
	class LazySequenceMap<T, U> extends LazySequence<U> {
		constructor(private _previous: any, private _transform: (element: T) => U) {
			super();
		}

		/**
		 * @return {!LazySequenceMapIterator.<T, U>}
		 */
		__iterator__(): LazySequenceMapIterator<T, U> {
			return new LazySequenceMapIterator<T, U>(Iterator(this._previous), this._transform);
		}
	}

	/**
	 * @constructor
	 * @template T, U
	 * @param {!{next: function(): T}} previous
	 * @param {function(T): U} transform
	 */
	class LazySequenceMapIterator<T, U> implements Iterator {
		constructor(private _previous: Iterator, private _transform: (element: T) => U) { }

		/**
		 * @return {U}
		 */
		next(): U {
			// Apply the transform function and return the transformed value
			return this._transform(<T>this._previous.next());
		}
	}

	/**
	 * A LazySequence returned from LazySequence.filter()
	 *
	 * @constructor
	 * @template T
	 * @extends {LazySequence.<T>}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(T): boolean} filter The filter function (element) -> (Boolean)
	 */
	class LazySequenceFilter<T> extends LazySequence<T> {
		constructor(private _previous: any, private _filter: (element: T) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceFilterIterator.<T>}
		 */
		__iterator__(): LazySequenceFilterIterator<T> {
			return new LazySequenceFilterIterator(Iterator(this._previous), this._filter);
		}
	}

	/**
	 * @constructor
	 * @template T
	 * @param {!{next: function(): T}} previous
	 * @param {function(T): boolean} filter
	 */
	class LazySequenceFilterIterator<T> implements Iterator {
		constructor(private _previous: Iterator, private _filter: (element: T) => boolean) { }

		/**
		 * @return {T}
		 */
		next(): T {
			// Loop to find the next element from the underlying lazy sequence which passes the filter and return it
			var result: T;

			do {
				result = <T>this._previous.next();
			} while (!this._filter(result));

			return result;
		}
	}

	/**
	 * A LazySequence returned from LazySequence.takeWhile()
	 *
	 * @constructor
	 * @template T
	 * @extends {LazySequence.<T>}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(T): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class LazySequenceTakeWhile<T> extends LazySequence<T> {
		constructor(private _previous: any, private _predicate: (element: T) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceTakeWhileIterator.<T>}
		 */
		__iterator__(): LazySequenceTakeWhileIterator<T> {
			return new LazySequenceTakeWhileIterator<T>(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @template T
	 * @param {!{next: function(): T}} previous
	 * @param {function(T): boolean} predicate
	 */
	class LazySequenceTakeWhileIterator<T> implements Iterator {
		// Set to true when an element not matching the predicate is found
		private _foundEnd = false;

		constructor(private _previous: Iterator, private _predicate: (element: T) => boolean) { }

		/**
		 * @return {T}
		 */
		next(): T {
			var result: T;

			// If we haven't already found the end in a previous call to next()
			if (!this._foundEnd) {
				// Get the next element from the underlying lazy sequence and see if we've found the end now
				result = <T>this._previous.next();
				this._foundEnd = !this._predicate(result);
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
	 * A LazySequence returned from LazySequence.skipWhile()
	 *
	 * @constructor
	 * @template T
	 * @extends {LazySequence.<T>}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(T): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class LazySequenceSkipWhile<T> extends LazySequence<T> {
		constructor(private _previous: any, private _predicate: (element: T) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceSkipWhileIterator.<T>}
		 */
		__iterator__(): LazySequenceSkipWhileIterator<T> {
			return new LazySequenceSkipWhileIterator<T>(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @template T
	 * @param {!{next: function(): T}} previous
	 * @param {function(T): boolean} predicate
	 */
	class LazySequenceSkipWhileIterator<T> implements Iterator {
		// Set to true when an element not matching the predicate is found
		private _foundStart = false;

		constructor(private _previous: Iterator, private _predicate: (element: T) => boolean) { }

		/**
		 * @return {T}
		 */
		next(): T {
			var result: T;

			do {
				// Get the next element
				result = <T>this._previous.next();
				// and see if we've already found the start, or if we've found it now
				this._foundStart = this._foundStart || !this._predicate(result);
			} while (!this._foundStart); // Keep looping till we find the start

			// We've found the start, so return the element
			return result;
		}
	}
}
