(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/glen/ga/browser-serialport/demo/fake_c493c990.js":[function(require,module,exports){
var SerialPortLib = require('../index.js');
var SerialPort = SerialPortLib.SerialPort;

SerialPortLib.list(function(err, ports) {
	var portsPath = document.getElementById("portPath");

	if (err) {
		console.log("Error listing ports", err);
		portsPath.options[0] = new Option(err, "ERROR:" + err);
		portsPath.options[0].selected = true;
		return;
	} else {
		for (var i = 0; i < ports.length; i++) {
			portsPath.options[i] = new Option(ports[i].comName.path, ports[i].comName.path);

			if (ports[i].comName.path.toLowerCase().indexOf("usb") !== -1) {
				portsPath.options[i].selected = true;
			}
		}

		var connectButton = document.getElementById("connect");
		connectButton.onclick = function() {
			var port = portsPath.options[portsPath.selectedIndex].value;
			var baudrateElement = document.getElementById("baudrate");
			var baudrate = baudrateElement.options[baudrateElement.selectedIndex].value;
			connect(port, baudrate);
		};
	}
});



function connect(port, baudrate) {
	var baud = 9600;
	if (baudrate) {
		baud = baudrate;
	}

	var sp = new SerialPort(port, {
	    baudrate: baud,
	    buffersize: 1
	}, true);

	var output = document.getElementById("output");
	document.getElementById("settings").style.display = "none";

	sp.on("open", function() {
		document.getElementById("connected-container").style.display = "block";
		output.textContent += "Connection open\n";
	});

	sp.on("error", function(string) {
		output.textContent += "\nError: " + string + "\n";
	});

	// sp.on("data", function(data) {
	// 	//console.log("Data", data);
	// });

	sp.on("dataString", function(string) {
		output.textContent += string;
	});

	function send() {
		var line = input.value;
		input.value = "";
		sp.writeString(line + "\n");
	}


	var input = document.getElementById("input");
	var sendButton = document.getElementById("send");
	sendButton.onclick = send;
	input.onkeypress = function(e) {
		if (e.which == 13) {
			send();
		}
	};

}

},{"../index.js":"/Users/glen/ga/browser-serialport/index.js"}],"/Users/glen/ga/browser-serialport/index.js":[function(require,module,exports){
"use strict";

function SerialPort(path, options, openImmediately) {
	console.log("SerialPort constructed.");

	this.comName = path;

	if (options) {
		for (var key in this.options) {
			//console.log("Looking for " + key + " option.");
			if (options[key] != undefined) {
				//console.log("Replacing " + key + " with " + options[key]);
				this.options[key] = options[key];
			}
		}
	}

	if (typeof chrome != "undefined" && chrome.serial) {
		var self = this;

		if (openImmediately != false) {
			this.open();
		}

	} else {
		throw "No access to serial ports. Try loading as a Chrome Application.";
	}
}

SerialPort.prototype.options = {
    baudrate: 57600,
    buffersize: 1
};

SerialPort.prototype.connectionId = -1;

SerialPort.prototype.comName = "";

SerialPort.prototype.eventListeners = {};

SerialPort.prototype.open = function (callback) {
	console.log("Opening ", this.comName);
	chrome.serial.connect(this.comName, {bitrate: parseInt(this.options.baudrate)}, this.proxy('onOpen', callback));
};

SerialPort.prototype.onOpen = function (callback, openInfo) {
	console.log("onOpen", callback, openInfo);
	this.connectionId = openInfo.connectionId;
	if (this.connectionId == -1) {
		this.publishEvent("error", "Could not open port.");
		return;
	}

	this.publishEvent("open", openInfo);


	console.log('Connected to port.', this.connectionId);

	typeof callback == "function" && callback(openInfo);

	chrome.serial.onReceive.addListener(this.proxy('onRead'));

};

SerialPort.prototype.onRead = function (readInfo) {
	if (readInfo && this.connectionId == readInfo.connectionId) {

		var uint8View = new Uint8Array(readInfo.data);
		var string = "";
		for (var i = 0; i < readInfo.data.byteLength; i++) {
			string += String.fromCharCode(uint8View[i]);
		}

		//console.log("Got data", string, readInfo.data);

		//Maybe this should be a Buffer()
		this.publishEvent("data", uint8View);
		this.publishEvent("dataString", string);
	}
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != "function") { callback = function() {}; }

	//Make sure its not a browserify faux Buffer.
	if (buffer instanceof ArrayBuffer == false) {
		buffer = buffer2ArrayBuffer(buffer);
	}

	chrome.serial.send(this.connectionId, buffer, callback);
};

SerialPort.prototype.writeString = function (string, callback) {
	this.write(str2ab(string), callback);
};

SerialPort.prototype.close = function (callback) {
	chrome.serial.close(this.connectionId, this.proxy('onClose', callback));
};

SerialPort.prototype.onClose = function (callback) {
	this.connectionId = -1;
	console.log("Closed port", arguments);
	this.publishEvent("close");
	typeof callback == "function" && callback(openInfo);
};

SerialPort.prototype.flush = function (callback) {

};

//Expecting: data, error
SerialPort.prototype.on = function (eventName, callback) {
	if (this.eventListeners[eventName] == undefined) {
		this.eventListeners[eventName] = [];
	}
	if (typeof callback == "function") {
		this.eventListeners[eventName].push(callback);
	} else {
		throw "can not subscribe with a non function callback";
	}
}

SerialPort.prototype.publishEvent = function (eventName, data) {
	if (this.eventListeners[eventName] != undefined) {
		for (var i = 0; i < this.eventListeners[eventName].length; i++) {
			this.eventListeners[eventName][i](data);
		}
	}
}

SerialPort.prototype.proxy = function () {
	var self = this;
	var proxyArgs = [];

	//arguments isnt actually an array.
	for (var i = 0; i < arguments.length; i++) {
	    proxyArgs[i] = arguments[i];
	}

	var functionName = proxyArgs.splice(0, 1)[0];

	var func = function() {
		var funcArgs = [];
		for (var i = 0; i < arguments.length; i++) {
		    funcArgs[i] = arguments[i];
		}
		var allArgs = proxyArgs.concat(funcArgs);

		self[functionName].apply(self, allArgs);
	}

	return func;
}

function SerialPortList(callback) {
	if (typeof chrome != "undefined" && chrome.serial) {
		chrome.serial.getDevices(function(ports) {
			var portObjects = Array(ports.length);
			for (var i = 0; i < ports.length; i++) {
				portObjects[i] = new SerialPort(ports[i], null, false);
			}
			callback(null, portObjects);
		});
	} else {
		callback("No access to serial ports. Try loading as a Chrome Application.", null);
	}
};

// Convert string to ArrayBuffer
function str2ab(str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

// Convert buffer to ArrayBuffer
function buffer2ArrayBuffer(buffer) {
	var buf = new ArrayBuffer(buffer.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < buffer.length; i++) {
		bufView[i] = buffer[i];
	}
	return buf;
}

module.exports = {
	SerialPort: SerialPort,
	list: SerialPortList,
	used: [] //TODO: Populate this somewhere.
};

},{}]},{},["/Users/glen/ga/browser-serialport/demo/fake_c493c990.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ2xlbi9nYS9icm93c2VyLXNlcmlhbHBvcnQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2dsZW4vZ2EvYnJvd3Nlci1zZXJpYWxwb3J0L2RlbW8vZmFrZV9jNDkzYzk5MC5qcyIsIi9Vc2Vycy9nbGVuL2dhL2Jyb3dzZXItc2VyaWFscG9ydC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgU2VyaWFsUG9ydExpYiA9IHJlcXVpcmUoJy4uL2luZGV4LmpzJyk7XG52YXIgU2VyaWFsUG9ydCA9IFNlcmlhbFBvcnRMaWIuU2VyaWFsUG9ydDtcblxuU2VyaWFsUG9ydExpYi5saXN0KGZ1bmN0aW9uKGVyciwgcG9ydHMpIHtcblx0dmFyIHBvcnRzUGF0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9ydFBhdGhcIik7XG5cblx0aWYgKGVycikge1xuXHRcdGNvbnNvbGUubG9nKFwiRXJyb3IgbGlzdGluZyBwb3J0c1wiLCBlcnIpO1xuXHRcdHBvcnRzUGF0aC5vcHRpb25zWzBdID0gbmV3IE9wdGlvbihlcnIsIFwiRVJST1I6XCIgKyBlcnIpO1xuXHRcdHBvcnRzUGF0aC5vcHRpb25zWzBdLnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRyZXR1cm47XG5cdH0gZWxzZSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb3J0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0cG9ydHNQYXRoLm9wdGlvbnNbaV0gPSBuZXcgT3B0aW9uKHBvcnRzW2ldLmNvbU5hbWUucGF0aCwgcG9ydHNbaV0uY29tTmFtZS5wYXRoKTtcblxuXHRcdFx0aWYgKHBvcnRzW2ldLmNvbU5hbWUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoXCJ1c2JcIikgIT09IC0xKSB7XG5cdFx0XHRcdHBvcnRzUGF0aC5vcHRpb25zW2ldLnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgY29ubmVjdEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29ubmVjdFwiKTtcblx0XHRjb25uZWN0QnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBwb3J0ID0gcG9ydHNQYXRoLm9wdGlvbnNbcG9ydHNQYXRoLnNlbGVjdGVkSW5kZXhdLnZhbHVlO1xuXHRcdFx0dmFyIGJhdWRyYXRlRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmF1ZHJhdGVcIik7XG5cdFx0XHR2YXIgYmF1ZHJhdGUgPSBiYXVkcmF0ZUVsZW1lbnQub3B0aW9uc1tiYXVkcmF0ZUVsZW1lbnQuc2VsZWN0ZWRJbmRleF0udmFsdWU7XG5cdFx0XHRjb25uZWN0KHBvcnQsIGJhdWRyYXRlKTtcblx0XHR9O1xuXHR9XG59KTtcblxuXG5cbmZ1bmN0aW9uIGNvbm5lY3QocG9ydCwgYmF1ZHJhdGUpIHtcblx0dmFyIGJhdWQgPSA5NjAwO1xuXHRpZiAoYmF1ZHJhdGUpIHtcblx0XHRiYXVkID0gYmF1ZHJhdGU7XG5cdH1cblxuXHR2YXIgc3AgPSBuZXcgU2VyaWFsUG9ydChwb3J0LCB7XG5cdCAgICBiYXVkcmF0ZTogYmF1ZCxcblx0ICAgIGJ1ZmZlcnNpemU6IDFcblx0fSwgdHJ1ZSk7XG5cblx0dmFyIG91dHB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0cHV0XCIpO1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNldHRpbmdzXCIpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuXHRzcC5vbihcIm9wZW5cIiwgZnVuY3Rpb24oKSB7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb25uZWN0ZWQtY29udGFpbmVyXCIpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG5cdFx0b3V0cHV0LnRleHRDb250ZW50ICs9IFwiQ29ubmVjdGlvbiBvcGVuXFxuXCI7XG5cdH0pO1xuXG5cdHNwLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0b3V0cHV0LnRleHRDb250ZW50ICs9IFwiXFxuRXJyb3I6IFwiICsgc3RyaW5nICsgXCJcXG5cIjtcblx0fSk7XG5cblx0Ly8gc3Aub24oXCJkYXRhXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0Ly8gXHQvL2NvbnNvbGUubG9nKFwiRGF0YVwiLCBkYXRhKTtcblx0Ly8gfSk7XG5cblx0c3Aub24oXCJkYXRhU3RyaW5nXCIsIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdG91dHB1dC50ZXh0Q29udGVudCArPSBzdHJpbmc7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHNlbmQoKSB7XG5cdFx0dmFyIGxpbmUgPSBpbnB1dC52YWx1ZTtcblx0XHRpbnB1dC52YWx1ZSA9IFwiXCI7XG5cdFx0c3Aud3JpdGVTdHJpbmcobGluZSArIFwiXFxuXCIpO1xuXHR9XG5cblxuXHR2YXIgaW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0XCIpO1xuXHR2YXIgc2VuZEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2VuZFwiKTtcblx0c2VuZEJ1dHRvbi5vbmNsaWNrID0gc2VuZDtcblx0aW5wdXQub25rZXlwcmVzcyA9IGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS53aGljaCA9PSAxMykge1xuXHRcdFx0c2VuZCgpO1xuXHRcdH1cblx0fTtcblxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFNlcmlhbFBvcnQocGF0aCwgb3B0aW9ucywgb3BlbkltbWVkaWF0ZWx5KSB7XG5cdGNvbnNvbGUubG9nKFwiU2VyaWFsUG9ydCBjb25zdHJ1Y3RlZC5cIik7XG5cblx0dGhpcy5jb21OYW1lID0gcGF0aDtcblxuXHRpZiAob3B0aW9ucykge1xuXHRcdGZvciAodmFyIGtleSBpbiB0aGlzLm9wdGlvbnMpIHtcblx0XHRcdC8vY29uc29sZS5sb2coXCJMb29raW5nIGZvciBcIiArIGtleSArIFwiIG9wdGlvbi5cIik7XG5cdFx0XHRpZiAob3B0aW9uc1trZXldICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiUmVwbGFjaW5nIFwiICsga2V5ICsgXCIgd2l0aCBcIiArIG9wdGlvbnNba2V5XSk7XG5cdFx0XHRcdHRoaXMub3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmICh0eXBlb2YgY2hyb21lICE9IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnNlcmlhbCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdGlmIChvcGVuSW1tZWRpYXRlbHkgIT0gZmFsc2UpIHtcblx0XHRcdHRoaXMub3BlbigpO1xuXHRcdH1cblxuXHR9IGVsc2Uge1xuXHRcdHRocm93IFwiTm8gYWNjZXNzIHRvIHNlcmlhbCBwb3J0cy4gVHJ5IGxvYWRpbmcgYXMgYSBDaHJvbWUgQXBwbGljYXRpb24uXCI7XG5cdH1cbn1cblxuU2VyaWFsUG9ydC5wcm90b3R5cGUub3B0aW9ucyA9IHtcbiAgICBiYXVkcmF0ZTogNTc2MDAsXG4gICAgYnVmZmVyc2l6ZTogMVxufTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUuY29ubmVjdGlvbklkID0gLTE7XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLmNvbU5hbWUgPSBcIlwiO1xuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5ldmVudExpc3RlbmVycyA9IHt9O1xuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdGNvbnNvbGUubG9nKFwiT3BlbmluZyBcIiwgdGhpcy5jb21OYW1lKTtcblx0Y2hyb21lLnNlcmlhbC5jb25uZWN0KHRoaXMuY29tTmFtZSwge2JpdHJhdGU6IHBhcnNlSW50KHRoaXMub3B0aW9ucy5iYXVkcmF0ZSl9LCB0aGlzLnByb3h5KCdvbk9wZW4nLCBjYWxsYmFjaykpO1xufTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUub25PcGVuID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBvcGVuSW5mbykge1xuXHRjb25zb2xlLmxvZyhcIm9uT3BlblwiLCBjYWxsYmFjaywgb3BlbkluZm8pO1xuXHR0aGlzLmNvbm5lY3Rpb25JZCA9IG9wZW5JbmZvLmNvbm5lY3Rpb25JZDtcblx0aWYgKHRoaXMuY29ubmVjdGlvbklkID09IC0xKSB7XG5cdFx0dGhpcy5wdWJsaXNoRXZlbnQoXCJlcnJvclwiLCBcIkNvdWxkIG5vdCBvcGVuIHBvcnQuXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRoaXMucHVibGlzaEV2ZW50KFwib3BlblwiLCBvcGVuSW5mbyk7XG5cblxuXHRjb25zb2xlLmxvZygnQ29ubmVjdGVkIHRvIHBvcnQuJywgdGhpcy5jb25uZWN0aW9uSWQpO1xuXG5cdHR5cGVvZiBjYWxsYmFjayA9PSBcImZ1bmN0aW9uXCIgJiYgY2FsbGJhY2sob3BlbkluZm8pO1xuXG5cdGNocm9tZS5zZXJpYWwub25SZWNlaXZlLmFkZExpc3RlbmVyKHRoaXMucHJveHkoJ29uUmVhZCcpKTtcblxufTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUub25SZWFkID0gZnVuY3Rpb24gKHJlYWRJbmZvKSB7XG5cdGlmIChyZWFkSW5mbyAmJiB0aGlzLmNvbm5lY3Rpb25JZCA9PSByZWFkSW5mby5jb25uZWN0aW9uSWQpIHtcblxuXHRcdHZhciB1aW50OFZpZXcgPSBuZXcgVWludDhBcnJheShyZWFkSW5mby5kYXRhKTtcblx0XHR2YXIgc3RyaW5nID0gXCJcIjtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlYWRJbmZvLmRhdGEuYnl0ZUxlbmd0aDsgaSsrKSB7XG5cdFx0XHRzdHJpbmcgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSh1aW50OFZpZXdbaV0pO1xuXHRcdH1cblxuXHRcdC8vY29uc29sZS5sb2coXCJHb3QgZGF0YVwiLCBzdHJpbmcsIHJlYWRJbmZvLmRhdGEpO1xuXG5cdFx0Ly9NYXliZSB0aGlzIHNob3VsZCBiZSBhIEJ1ZmZlcigpXG5cdFx0dGhpcy5wdWJsaXNoRXZlbnQoXCJkYXRhXCIsIHVpbnQ4Vmlldyk7XG5cdFx0dGhpcy5wdWJsaXNoRXZlbnQoXCJkYXRhU3RyaW5nXCIsIHN0cmluZyk7XG5cdH1cbn1cblxuU2VyaWFsUG9ydC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIGNhbGxiYWNrICE9IFwiZnVuY3Rpb25cIikgeyBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge307IH1cblxuXHQvL01ha2Ugc3VyZSBpdHMgbm90IGEgYnJvd3NlcmlmeSBmYXV4IEJ1ZmZlci5cblx0aWYgKGJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyID09IGZhbHNlKSB7XG5cdFx0YnVmZmVyID0gYnVmZmVyMkFycmF5QnVmZmVyKGJ1ZmZlcik7XG5cdH1cblxuXHRjaHJvbWUuc2VyaWFsLnNlbmQodGhpcy5jb25uZWN0aW9uSWQsIGJ1ZmZlciwgY2FsbGJhY2spO1xufTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUud3JpdGVTdHJpbmcgPSBmdW5jdGlvbiAoc3RyaW5nLCBjYWxsYmFjaykge1xuXHR0aGlzLndyaXRlKHN0cjJhYihzdHJpbmcpLCBjYWxsYmFjayk7XG59O1xuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRjaHJvbWUuc2VyaWFsLmNsb3NlKHRoaXMuY29ubmVjdGlvbklkLCB0aGlzLnByb3h5KCdvbkNsb3NlJywgY2FsbGJhY2spKTtcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLm9uQ2xvc2UgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0dGhpcy5jb25uZWN0aW9uSWQgPSAtMTtcblx0Y29uc29sZS5sb2coXCJDbG9zZWQgcG9ydFwiLCBhcmd1bWVudHMpO1xuXHR0aGlzLnB1Ymxpc2hFdmVudChcImNsb3NlXCIpO1xuXHR0eXBlb2YgY2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiICYmIGNhbGxiYWNrKG9wZW5JbmZvKTtcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cbn07XG5cbi8vRXhwZWN0aW5nOiBkYXRhLCBlcnJvclxuU2VyaWFsUG9ydC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaykge1xuXHRpZiAodGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdO1xuXHR9XG5cdGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0dGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdLnB1c2goY2FsbGJhY2spO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IFwiY2FuIG5vdCBzdWJzY3JpYmUgd2l0aCBhIG5vbiBmdW5jdGlvbiBjYWxsYmFja1wiO1xuXHR9XG59XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLnB1Ymxpc2hFdmVudCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcblx0aWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSAhPSB1bmRlZmluZWQpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdW2ldKGRhdGEpO1xuXHRcdH1cblx0fVxufVxuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5wcm94eSA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR2YXIgcHJveHlBcmdzID0gW107XG5cblx0Ly9hcmd1bWVudHMgaXNudCBhY3R1YWxseSBhbiBhcnJheS5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0ICAgIHByb3h5QXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcblx0fVxuXG5cdHZhciBmdW5jdGlvbk5hbWUgPSBwcm94eUFyZ3Muc3BsaWNlKDAsIDEpWzBdO1xuXG5cdHZhciBmdW5jID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZ1bmNBcmdzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHQgICAgZnVuY0FyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG5cdFx0fVxuXHRcdHZhciBhbGxBcmdzID0gcHJveHlBcmdzLmNvbmNhdChmdW5jQXJncyk7XG5cblx0XHRzZWxmW2Z1bmN0aW9uTmFtZV0uYXBwbHkoc2VsZiwgYWxsQXJncyk7XG5cdH1cblxuXHRyZXR1cm4gZnVuYztcbn1cblxuZnVuY3Rpb24gU2VyaWFsUG9ydExpc3QoY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBjaHJvbWUgIT0gXCJ1bmRlZmluZWRcIiAmJiBjaHJvbWUuc2VyaWFsKSB7XG5cdFx0Y2hyb21lLnNlcmlhbC5nZXREZXZpY2VzKGZ1bmN0aW9uKHBvcnRzKSB7XG5cdFx0XHR2YXIgcG9ydE9iamVjdHMgPSBBcnJheShwb3J0cy5sZW5ndGgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb3J0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRwb3J0T2JqZWN0c1tpXSA9IG5ldyBTZXJpYWxQb3J0KHBvcnRzW2ldLCBudWxsLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhudWxsLCBwb3J0T2JqZWN0cyk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0Y2FsbGJhY2soXCJObyBhY2Nlc3MgdG8gc2VyaWFsIHBvcnRzLiBUcnkgbG9hZGluZyBhcyBhIENocm9tZSBBcHBsaWNhdGlvbi5cIiwgbnVsbCk7XG5cdH1cbn07XG5cbi8vIENvbnZlcnQgc3RyaW5nIHRvIEFycmF5QnVmZmVyXG5mdW5jdGlvbiBzdHIyYWIoc3RyKSB7XG5cdHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoc3RyLmxlbmd0aCk7XG5cdHZhciBidWZWaWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcblx0XHRidWZWaWV3W2ldID0gc3RyLmNoYXJDb2RlQXQoaSk7XG5cdH1cblx0cmV0dXJuIGJ1Zjtcbn1cblxuLy8gQ29udmVydCBidWZmZXIgdG8gQXJyYXlCdWZmZXJcbmZ1bmN0aW9uIGJ1ZmZlcjJBcnJheUJ1ZmZlcihidWZmZXIpIHtcblx0dmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXIubGVuZ3RoKTtcblx0dmFyIGJ1ZlZpZXcgPSBuZXcgVWludDhBcnJheShidWYpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKykge1xuXHRcdGJ1ZlZpZXdbaV0gPSBidWZmZXJbaV07XG5cdH1cblx0cmV0dXJuIGJ1Zjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFNlcmlhbFBvcnQ6IFNlcmlhbFBvcnQsXG5cdGxpc3Q6IFNlcmlhbFBvcnRMaXN0LFxuXHR1c2VkOiBbXSAvL1RPRE86IFBvcHVsYXRlIHRoaXMgc29tZXdoZXJlLlxufTtcbiJdfQ==
