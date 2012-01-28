"use strict";

addEventListener("load", function () {
	var createSubDiv;
	var wrappers = {};
	(function () {
		var defaultSubDiv = document.createElement("div");

		createSubDiv = function (dialogue) {
			var result = defaultSubDiv.cloneNode(true);
			result.dialogue = dialogue;
			dialogue.setSub(result);
			wrappers[dialogue.getLayer()][dialogue.getAlignment()].appendChild(result);
			return result;
		};

		defaultSubDiv.constructor.prototype.remove = function () {
			this.parentElement.removeChild(this);
			this.dialogue.setSub(null);
		};
	})();

	var video = document.querySelector("#video");
	var subsRequest = new XMLHttpRequest();
	subsRequest.open("GET", video.dataset.subs, false);
	subsRequest.send();
	if (subsRequest.readyState === XMLHttpRequest.DONE && subsRequest.status === 200) {
		var ass = parseASS(subsRequest.responseText);

		var videoWidth = video.videoWidth;
		var videoHeight = video.videoHeight;
		document.body.style.width = video.style.width = videoWidth + "px";
		document.body.style.height = video.style.height = videoHeight + "px";
		document.body.style.marginLeft = video.style.marginLeft = (-videoWidth / 2) + "px";

		var subsWrapper = document.querySelector("#subs-wrapper");

		ass.getInfo().scaleTo(videoWidth, videoHeight);

		var layers = [];
		ass.getDialogues().map(function (dialogue) {
			return dialogue.getLayer();
		}).forEach(function (layer) {
			if (layers.indexOf(layer) === -1) {
				layers.push(layer);
			}
		});
		layers.sort().forEach(function (layer) {
			var i;
			wrappers[layer] = {};
			for (i = 1; i <= 9; ++i) {
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "an" + i + " layer" + layer;
				subsWrapper.appendChild(wrapperDiv);
				wrappers[layer][i] = wrapperDiv;
			}
		});

		var currentSubs = [];

		video.addEventListener("timeupdate", function () {
			var currentTime = video.currentTime;
			var currentDialogues = ass.getDialogues().filter(function (dialogue) { return dialogue.getStart() <= currentTime && dialogue.getEnd() >= currentTime; });

			var subsPartition = currentSubs.partition(function (currentSub) {
				return currentTime > currentSub.dialogue.getEnd() || currentDialogues.every(function (dialogue) {
					return dialogue.getSub() !== currentSub;
				});
			});

			subsPartition[0].forEach(function (sub) {
				sub.remove();
			});

			currentSubs = subsPartition[1].concat(currentDialogues.filter(function (dialogue) {
				return dialogue.getSub() === null;
			}).map(function (dialogue) {
				return createSubDiv(dialogue);
			}));
		}, false);

		video.addEventListener("seeking", function () {
			currentSubs.forEach(function (sub) {
				sub.remove();
			});
			currentSubs = [];
		});

		video.play();
	}
}, false);