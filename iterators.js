"use strict";

/**
 * The base class of all enumerable objects. An enumerable is a lazily evaluated sequence.
 */
var IEnumerable = function () {
	/**
	 * @param transform A function (element) -> (transformedElement)
	 * @return A new {@link IEnumerable} with the given transform applied
	 */
	this.map = function (transform) {
		return new SelectEnumerable(this, transform);
	};

	/**
	 * @param filter A function (element) -> (Boolean). Returns <code>true</code> if <code>element</code> should
	 * remain in the enumeration.
	 * @return A new {@link IEnumerable} with the given filter applied
	 */
	this.filter = function (filter) {
		return new WhereEnumerable(this, filter);
	};

	/**
	 * @param filter A function (element) -> (Boolean). Returns <code>false</code> if enumeration of this
	 * {@link IEnumerable} should stop at <code>element</code>.
	 * @return A new {@link IEnumerable} with the given filter applied
	 */
	this.takeWhile = function (filter) {
		return new TakeWhileEnumerable(this, filter);
	};

	/**
	 * @param filter A function (element) -> (Boolean). Returns <code>true</code> if enumeration of this
	 * {@link IEnumerable} should skip <code>element</code>.
	 * @return A new {@link IEnumerable} with the given filter applied
	 */
	this.skipWhile = function (filter) {
		return new SkipWhileEnumerable(this, filter);
	};
}

var iteratorPrototype;

if (!window.Iterator) {
	/**
	 * A default Iterator for arrays in case Iterator(Array) is not defined by the browser.
	 */
	var ArrayIterator = function (array) {
		// The index of the element which will be returned in the next call to next()
		var currentIndex = 0;

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

	window.Iterator = function (collection, keysOnly) {
		var result;

		if (collection.__iterator__) {
			result = collection.__iterator__();
		}
		else {
			// Assume collection is an Array (or at least supports .length and the [] operator). Everything else is unsupported.
			result = new ArrayIterator(collection);
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
 * Calls the provided function for each element in this {@link IEnumerable}.
 * 
 * @param func A function (element)
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
 * Evaluates this enumerable.
 * 
 * @return An array of the elements of this {@link IEnumerable}
 */
iteratorPrototype.toArray = function () {
	var result = [];
	this.forEach(function (element, index) {
		result.push(element);
	});
	return result;
};

var enumerablePrototype = new IEnumerable();

// If this browser does not have an implementation of StopIteration, mock it
if (!window.StopIteration) {
	window.StopIteration = {};
}

/**
 * This class is an {@link IEnumerable} returned by {@link Array#toEnumerable} and represents an IEnumerable backed by the
 * elements of that array.
 */
var ArrayEnumerable = function (array) {
	this.__iterator__ = function () {
		return Iterator(array);
	};
};
ArrayEnumerable.prototype = enumerablePrototype;

/**
 * @return An {@link IEnumerable} backed by this Array
 */
Array.prototype.toEnumerable = function () {
	return new ArrayEnumerable(this);
};

/**
 * An {@link IEnumerable} returned from {@link IEnumerable#map}.
 * 
 * @param previous The underlying {@link IEnumerable}
 * @param transform The transform function (element) -> (transformedElement)
 */
var SelectEnumerable = function (previous, transform) {
	this.__iterator__ = function () {
		return new SelectIterator(Iterator(previous), transform);
	};
};
SelectEnumerable.prototype = enumerablePrototype;

var SelectIterator = function (previous, transform) {
	var currentIndex = 0;

	this.next = function () {
		// Apply the transform function and return the transformed value
		return transform.call(this, previous.next());
	};
};
SelectIterator.prototype = iteratorPrototype;

/**
 * An {@link IEnumerable} returned from {@link IEnumerable#filter}.
 * 
 * @param previous The underlying {@link IEnumerable}
 * @param filter The filter function (element) -> (Boolean)
 */
var WhereEnumerable = function (previous, filter) {
	this.__iterator__ = function () {
		return new WhereIterator(Iterator(previous), filter);
	};
};
WhereEnumerable.prototype = enumerablePrototype;

var WhereIterator = function (previous, filter) {
	this.next = function () {
		// Loop to find the next element from the underlying IEnumerable which passes the filter and return it
		var result;
		do {
			result = previous.next();
		} while (!filter.call(this, result));
		return result;
	};
};
WhereIterator.prototype = iteratorPrototype;

/**
 * An {@link IEnumerable} returned from {@link IEnumerable#takeWhile}.
 * 
 * @param previous The underlying {@link IEnumerable}
 * @param filter The filter function (element) -> (Boolean)
 */
var TakeWhileEnumerable = function (previous, filter) {
	this.__iterator__ = function () {
		return new TakeWhileIterator(Iterator(previous), filter);
	};
};
TakeWhileEnumerable.prototype = enumerablePrototype;

var TakeWhileIterator = function (previous, filter) {
	// Set to true when an element not matching the filter is found
	var foundEnd = false;

	this.next = function () {
		var result;

		// If we haven't already found the end in a previous call to next()
		if (!foundEnd) {
			// Get the next element from the underlying IEnumerable and see if we've found the end now
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
 * An {@link IEnumerable} returned from {@link IEnumerable#skipWhile}.
 * 
 * @param previous The underlying {@link IEnumerable}
 * @param filter The filter function (element) -> (Boolean)
 */
var SkipWhileEnumerable = function (previous, filter) {
	this.__iterator__ = function () {
		return new SkipWhileIterator(Iterator(previous), filter);
	};
};
SkipWhileEnumerable.prototype = enumerablePrototype;

var SkipWhileIterator = function (previous, filter) {
	// Set to true when an element matching the filter is found
	var foundStart = false;

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
