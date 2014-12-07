'use strict';

var EE = require('events').EventEmitter;
var util = require('util');

var DATABITS = [7, 8];
var STOPBITS = [1, 2];
var PARITY = ['none', 'even', 'mark', 'odd', 'space'];

var _options = {
	baudrate: 9600,
	parity: 'none',
	rtscts: false,
	databits: 8,
	stopbits: 1,
	buffersize: 256,
	serial: (typeof chrome !== 'undefined' && chrome.serial)
};

function convertOptions(options){
	switch (options.dataBits) {
		case 7:
			options.dataBits = 'seven';
			break;
		case 8:
			options.dataBits = 'eight';
			break;
	}

	switch (options.stopBits) {
		case 1:
			options.stopBits = 'one';
			break;
		case 2:
			options.stopBits = 'two';
			break;
	}

	switch (options.parity) {
		case 'none':
			options.parity = 'no';
			break;
	}

	return options;
}

function SerialPort(path, options, openImmediately, callback) {

	var self = this;

	var args = Array.prototype.slice.call(arguments);
  callback = args.pop();
  if (typeof(callback) !== 'function') {
    callback = null;
  }

	options = (typeof options !== 'function') && options || {};

	openImmediately = (openImmediately === undefined || openImmediately === null) ? true : openImmediately;

	callback = callback || function (err) {
    if (err) {
      self.emit('error', err);
    }
  };

	var err;

	options.baudRate = options.baudRate || options.baudrate || _options.baudrate;

	options.dataBits = options.dataBits || options.databits || _options.databits;
	if (DATABITS.indexOf(options.dataBits) === -1) {
		err = new Error('Invalid "databits": ' + options.dataBits);
		callback(err);
		return;
	}

	options.stopBits = options.stopBits || options.stopbits || _options.stopbits;
	if (STOPBITS.indexOf(options.stopBits) === -1) {
		err = new Error('Invalid "stopbits": ' + options.stopbits);
		callback(err);
		return;
	}

	options.parity = options.parity || _options.parity;
	if (PARITY.indexOf(options.parity) === -1) {
		err = new Error('Invalid "parity": ' + options.parity);
		callback(err);
		return;
	}

	if (!path) {
    err = new Error('Invalid port specified: ' + path);
    callback(err);
    return;
  }

	options.bufferSize = options.bufferSize || options.buffersize || _options.buffersize;

	options.serial = options.serial || _options.serial;

	if (!options.serial) {
		throw 'No access to serial ports. Try loading as a Chrome Application.';
	}

	this.options = convertOptions(options);
	this.path = path;

	if (openImmediately) {
		process.nextTick(function () {
      self.open(callback);
    });
	}
}

util.inherits(SerialPort, EE);

SerialPort.prototype.connectionId = -1;

SerialPort.prototype.open = function (callback) {
	this.options.serial.connect(this.path, {bitrate: parseInt(this.options.baudrate, 10)}, this.proxy('onOpen', callback));
};

SerialPort.prototype.onOpen = function (callback, openInfo) {
	console.log(openInfo);
	this.connectionId = openInfo.connectionId;
	if (this.connectionId == -1) {
		this.emit('error', 'Could not open port.');
		return;
	}

	this.emit('open', openInfo);

	typeof callback == 'function' && callback(chrome.runtime.lastError, openInfo);

	this.options.serial.onReceive.addListener(this.proxy('onRead'));
};

SerialPort.prototype.onRead = function (readInfo) {
	if (readInfo && this.connectionId == readInfo.connectionId) {

		var uint8View = new Uint8Array(readInfo.data);
		var string = '';
		for (var i = 0; i < readInfo.data.byteLength; i++) {
			string += String.fromCharCode(uint8View[i]);
		}

		this.emit('data', toBuffer(uint8View));
		this.emit('dataString', string);
	}
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != 'function') { callback = function() {}; }

	//Make sure its not a browserify faux Buffer.
	if (buffer instanceof ArrayBuffer == false) {
		buffer = buffer2ArrayBuffer(buffer);
	}

	this.options.serial.send(this.connectionId, buffer, function(info){
		callback(chrome.runtime.lastError, info);
	});
};

SerialPort.prototype.writeString = function (string, callback) {
	this.write(str2ab(string), callback);
};

SerialPort.prototype.close = function (callback) {
	this.options.serial.disconnect(this.connectionId, this.proxy('onClose', callback));
};

SerialPort.prototype.onClose = function (callback, result) {
	this.connectionId = -1;
	this.emit('close');
	typeof callback == 'function' && callback(chrome.runtime.lastError, result);
};

SerialPort.prototype.flush = function (callback) {

};

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
		console.log(allArgs);

		self[functionName].apply(self, allArgs);
	}

	return func;
}

SerialPort.prototype.set = function (options, callback) {
	this.options.serial.setControlSignals(this.connectionId, options, function(result){
		callback(chrome.runtime.lastError, result);
	});
};

function SerialPortList(callback) {
	if (typeof chrome != 'undefined' && chrome.serial) {
		chrome.serial.getDevices(function(ports) {
			var portObjects = Array(ports.length);
			for (var i = 0; i < ports.length; i++) {
				portObjects[i] = new SerialPort(ports[i].path, null, false);
			}
			callback(chrome.runtime.lastError, portObjects);
		});
	} else {
		callback('No access to serial ports. Try loading as a Chrome Application.', null);
	}
}

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

function toBuffer(ab) {
	var buffer = new Buffer(ab.byteLength);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buffer.length; ++i) {
			buffer[i] = view[i];
	}
	return buffer;
}

module.exports = {
	SerialPort: SerialPort,
	list: SerialPortList,
	used: [] //TODO: Populate this somewhere.
};
