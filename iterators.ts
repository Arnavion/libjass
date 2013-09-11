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
	export class LazySequence {
		/**
		 * The base class of all iterable objects. An iterable is a lazily evaluated sequence.
		 *
		 * @constructor
		 */
		constructor() { }

		/**
		 * @param {function(*): *} transform A function (element) -> (transformedElement)
		 * @return {!LazySequence} A new LazySequence with the given transform applied
		 */
		map(transform: (element: any) => any): LazySequence {
			return new LazySequenceMap(this, transform);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns true if element should remain in the enumeration.
		 * @return {!LazySequence} A new LazySequence with the given filter applied
		 */
		filter(filter: (element: any) => boolean): LazySequence {
			return new LazySequenceFilter(this, filter);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns false for an element if enumeration of this LazySequence should stop at that element.
		 * @return {!LazySequence} A new LazySequence which returns new elements from the underlying sequence as long as the predicate returns true for all of them
		 */
		takeWhile(filter: (element: any) => boolean): LazySequence {
			return new LazySequenceTakeWhile(this, filter);
		}

		/**
		 * @param {function(*): boolean} filter A function (element) -> (Boolean). Returns true for an element if enumeration of this LazySequence should skip all elements upto that element.
		 * @return {!LazySequence} A new LazySequence which returns new elements from the underlying sequence as soon as the predicate returns true for one of them
		 */
		skipWhile(filter: (element: any) => boolean): LazySequence {
			return new LazySequenceSkipWhile(this, filter);
		}

		toArray(): Array {
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
	 * @return {!LazySequence} A LazySequence backed by this Array
	 */
	export function Lazy(array: Array): LazySequence {
		return new LazyArray(array);
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
	 * @extends {LazySequence}
	 * @param {!Array} array
	 */
	class LazyArray extends LazySequence {
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
	 * A LazySequence returned from LazySequence.map()
	 *
	 * @constructor
	 * @extends {LazySequence}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(*): *} transform The transform function (element) -> (transformedElement)
	 */
	class LazySequenceMap extends LazySequence {
		constructor(private _previous: any, private _transform: (element: any) => any) {
			super();
		}

		/**
		 * @return {!LazySequenceMapIterator}
		 */
		__iterator__(): LazySequenceMapIterator {
			return new LazySequenceMapIterator(Iterator(this._previous), this._transform);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): *} transform
	 */
	class LazySequenceMapIterator implements Iterator {
		constructor(private _previous: Iterator, private _transform: (element: any) => any) { }

		/**
		 * @return {*}
		 */
		next(): any {
			// Apply the transform function and return the transformed value
			return this._transform(this._previous.next());
		}
	}

	/**
	 * A LazySequence returned from LazySequence.filter()
	 *
	 * @constructor
	 * @extends {LazySequence}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(*): boolean} filter The filter function (element) -> (Boolean)
	 */
	class LazySequenceFilter extends LazySequence {
		constructor(private _previous: any, private _filter: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceFilterIterator}
		 */
		__iterator__(): LazySequenceFilterIterator {
			return new LazySequenceFilterIterator(Iterator(this._previous), this._filter);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} filter
	 */
	class LazySequenceFilterIterator implements Iterator {
		constructor(private _previous: Iterator, private _filter: (element: any) => boolean) { }

		/**
		 * @return {*}
		 */
		next(): any {
			// Loop to find the next element from the underlying lazy sequence which passes the filter and return it
			var result: any;

			do {
				result = this._previous.next();
			} while (!this._filter(result));

			return result;
		}
	}

	/**
	 * A LazySequence returned from LazySequence.takeWhile()
	 *
	 * @constructor
	 * @extends {LazySequence}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(*): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class LazySequenceTakeWhile extends LazySequence {
		constructor(private _previous: any, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceTakeWhileIterator}
		 */
		__iterator__(): LazySequenceTakeWhileIterator {
			return new LazySequenceTakeWhileIterator(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} predicate
	 */
	class LazySequenceTakeWhileIterator implements Iterator {
		// Set to true when an element not matching the predicate is found
		private _foundEnd = false;

		constructor(private _previous: Iterator, private _predicate: (element: any) => boolean) { }

		/**
		 * @return {*}
		 */
		next(): any {
			var result: any;

			// If we haven't already found the end in a previous call to next()
			if (!this._foundEnd) {
				// Get the next element from the underlying lazy sequence and see if we've found the end now
				result = this._previous.next();
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
	 * @extends {LazySequence}
	 * @param {!*} previous The underlying lazy sequence
	 * @param {function(*): boolean} predicate The predicate function (element) -> (Boolean)
	 */
	class LazySequenceSkipWhile extends LazySequence {
		constructor(private _previous: any, private _predicate: (element: any) => boolean) {
			super();
		}

		/**
		 * @return {!LazySequenceSkipWhileIterator}
		 */
		__iterator__(): LazySequenceSkipWhileIterator {
			return new LazySequenceSkipWhileIterator(Iterator(this._previous), this._predicate);
		}
	}

	/**
	 * @constructor
	 * @param {!{next: function(): *}} previous
	 * @param {function(*): boolean} predicate
	 */
	class LazySequenceSkipWhileIterator implements Iterator {
		// Set to true when an element not matching the predicate is found
		private _foundStart = false;

		constructor(private _previous: Iterator, private _predicate: (element: any) => boolean) { }

		/**
		 * @return {*}
		 */
		next(): any {
			var result: any;

			do {
				// Get the next element
				result = this._previous.next();
				// and see if we've already found the start, or if we've found it now
				this._foundStart = this._foundStart || !this._predicate(result);
			} while (!this._foundStart); // Keep looping till we find the start

			// We've found the start, so return the element
			return result;
		}
	}
}
