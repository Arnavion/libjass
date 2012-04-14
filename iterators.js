var IEnumerable = function () {
	this.map = function (transform) {
		return new SelectEnumerable(this, transform);
	};

	this.filter = function (filter) {
		return new WhereEnumerable(this, filter);
	};

	this.takeWhile = function (filter) {
		return new TakeWhileEnumerable(this, filter);
	};

	this.skipWhile = function (filter) {
		return new SkipWhileEnumerable(this, filter);
	};

	this.forEach = function (func) {
		try {
			for (; ; ) {
				func(this.next());
			}
		}
		catch (ex) {
			if (!(ex instanceof StopIteration)) {
				throw ex;
			}
		}
	};

	this.toArray = function () {
		var result = [];
		this.forEach(result.push.bind(result));
		return result;
	};
};
var prototype = new IEnumerable();

var StopIteration = function () {
};

var ArrayEnumerable = function (array) {
	this.reset = function () {
		currentIndex = -1;
		return this;
	};

	this.setUserToken = function (userToken) {
		return this;
	};

	this.next = function () {
		if (++currentIndex < array.length) {
			return array[currentIndex];
		}
		else {
			throw new StopIteration();
		}
	};

	var currentIndex = -1;
};
ArrayEnumerable.prototype = prototype;

var SelectEnumerable = function (previous, transform) {
	this.reset = function () {
		previous.reset();
		return this;
	};

	this.setUserToken = function (userToken) {
		this.userToken = userToken;
		previous.setUserToken(userToken);
		return this;
	};

	this.next = function () {
		return transform(previous.next(), this.userToken);
	};
};
SelectEnumerable.prototype = prototype;

var WhereEnumerable = function (previous, filter) {
	this.reset = function () {
		previous.reset();
		return this;
	};

	this.setUserToken = function (userToken) {
		this.userToken = userToken;
		previous.setUserToken(userToken);
		return this;
	};

	this.next = function () {
		var result;
		for (result = previous.next(); result && !filter(result, this.userToken); result = previous.next());
		return result;
	};
};
WhereEnumerable.prototype = prototype;

var TakeWhileEnumerable = function (previous, filter) {
	this.reset = function () {
		foundEnd = false;
		previous.reset();
		return this;
	};

	this.setUserToken = function (userToken) {
		this.userToken = userToken;
		previous.setUserToken(userToken);
		return this;
	};

	this.next = function () {
		var result;
		for (result = previous.next(); foundEnd = foundEnd || !filter(result, this.userToken); result = previous.next());
		return result;
	};

	var foundEnd = false;
};
TakeWhileEnumerable.prototype = prototype;

var SkipWhileEnumerable = function (previous, filter) {
	this.reset = function () {
		foundStart = false;
		previous.reset();
		return this;
	};

	this.setUserToken = function (userToken) {
		this.userToken = userToken;
		previous.setUserToken(userToken);
		return this;
	};

	this.next = function () {
		var result;
		for (result = previous.next(); !(foundStart = foundStart || !filter(result, this.userToken)); result = previous.next());
		return result;
	};

	var foundStart = false;
};
SkipWhileEnumerable.prototype = prototype;

Array.prototype.toEnumerable = function () {
	return new ArrayEnumerable(this);
};