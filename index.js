"use strict";

function SerialPort (path, options, openImmediately) {
	console.log("SerialPort constructed.");

	if (options) {
		for (var key in this.options) {
			console.log("Looking for " + key + " option.");
			if (options[key] != undefined) {
				console.log("Replacing " + key + " with " + options[key]);
				this.options[key] = options[key];
			}
		}
	}
}

SerialPort.prototype.options = {
    baudrate: 57600,
    buffersize: 1
};

SerialPort.prototype.eventListeners = {};

SerialPort.prototype.open = function (callback) {
	console.log("SerialPort open.");
	return "blah";
};

SerialPort.prototype.write = function (buffer, callback) {
  
};

SerialPort.prototype.close = function (callback) {
  
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

module.exports = { SerialPort: SerialPort };
