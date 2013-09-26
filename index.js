"use strict";

function SerialPort (path, options, openImmediately) {
	console.log("SerialPort constructed.")
}

SerialPort.prototype.open = function (callback) {
	console.log("SerialPort open.")
	return "blah";
};

SerialPort.prototype.write = function (buffer, callback) {
  
};

SerialPort.prototype.close = function (callback) {
  
};

SerialPort.prototype.flush = function (callback) {

};

module.exports = SerialPort;
