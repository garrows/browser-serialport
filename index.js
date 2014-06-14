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

	if ((typeof chrome != "undefined" && chrome.serial) || window.cordova) {
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
	if (!window.cordova) {
		chrome.serial.connect(this.comName, {bitrate: parseInt(this.options.baudrate)}, this.proxy('onOpen', callback));
	} else {
		console.log("Connecting to " + this.comName);
		var self = this;
		bluetoothSerial.connect(
			this.comName,
			function() {
				console.log("Connected!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
				self.onOpen(callback, {
					connectionId : "Bluetoothy"
				})
			},
			// this.proxy('onOpen', callback),
			function(err) { //fail
				console.log("Failed to connect to bluetooth");
				console.log(err);
				this.publishEvent("error", "Could not open bluetooth port.");
				return;
			}
		);
	}
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

	if (!window.cordova) {
		chrome.serial.onReceive.addListener(this.proxy('onRead'));
	} else {
		var self = this;
		var bRead = function() {
			bluetoothSerial.readBuffer(
				function(data) {
					if (!data) {
						process.nextTick(bRead);
					} else {
						var readInfo = {
							connectionId : self.connectionId,
							data: data
						}
						self.onRead(readInfo);
						process.nextTick(bRead);
						// bRead();
					}
				}, function() {
				this.publishEvent("error", "Could not read from port.");
			});
		}
		bRead();
	}

};

SerialPort.prototype.onRead = function (readInfo) {
	if (readInfo && this.connectionId == readInfo.connectionId) {

		var string = "";
		var uint8View;
		if (typeof readInfo.data == "string") {
			string = readInfo.data;
			var buff = new Buffer(string, "utf8");
			this.publishEvent("data", buff);
			console.log(
				"Data " +
				readInfo.data.length + " " +
				readInfo.data + " " +
				readInfo.data.charCodeAt(0) + " " +
				buff.length + " " +
				buff.toString('hex')
			);
		} else if (readInfo.data instanceof ArrayBuffer) {
			if (readInfo.data.byteLength == 0) { return; }
			var buff = arrayBufferToBuffer(readInfo.data);
			// console.log(
			// 	"Data3 " +
			// 	readInfo.data.byteLength + " " +
			// 	buff.length + " " +
			// 	buff.toString('hex')
			// );
			this.publishEvent("data", buff);
		} else {
			console.log(
				"Data2 " +
				typeof readInfo.data + " " +
				readInfo.data.length + " " +
				readInfo.data + " "
			);
			uint8View = new Uint8Array(readInfo.data);
			for (var i = 0; i < readInfo.data.byteLength; i++) {
				string += String.fromCharCode(uint8View[i]);
			}

			//Maybe this should be a Buffer()
			this.publishEvent("data", uint8View);
		}


		this.publishEvent("dataString", string);
	}
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != "function") { callback = function() {}; }
	var self = this;

	if (!window.cordova) {
		//Make sure its not a browserify faux Buffer.
		if (buffer instanceof ArrayBuffer == false) {
			buffer = buffer2ArrayBuffer(buffer);
		}
		chrome.serial.send(this.connectionId, buffer, callback);
	} else {

		bluetoothSerial.writeBuffer(
			buffer.toString('base64'),
			function() {
				// console.log("Success writing bluetooth: " + buffer.toString('hex') + " " + buffer.toString('base64'));
				callback(null);
			},
			function(err) {
				var errString = "Error sending bluetooth data";
				console.log(err);
				console.log(errString);
				self.publishEvent("error", errString);
				callback(errString);
			}
		);
	}
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
	console.log("SerialPortList ")
	if (typeof chrome != "undefined" && chrome.serial && !window.cordova) {
		chrome.serial.getDevices(function(ports) {
			var portObjects = Array(ports.length);
			for (var i = 0; i < ports.length; i++) {
				portObjects[i] = new SerialPort(ports[i].path, null, false);
			}
			callback(null, portObjects);
		});
	} else if (window.cordova) {
		console.log("Listing");
		bluetoothSerial.list(
			function(devices) {
				console.log("Listed");

				var portObjects = [];

		        devices.forEach(function(device) {
					var debug = "----- device:";

					var deviceId;
		            if (device.hasOwnProperty("uuid")) { // TODO https://github.com/don/BluetoothSerial/issues/5
		                deviceId = device.uuid;
		            } else if (device.hasOwnProperty("address")) {
		                deviceId = device.address;
		            } else {
		                deviceId = "ERROR " + JSON.stringify(device);
		            }
					portObjects.push(new SerialPort(deviceId, null, false));

					debug += deviceId;
					debug += "  " +  JSON.stringify(device);
					console.log(debug);
		        });

		        if (devices.length === 0) {
					callback(new Error("No bluetooth devices found."));
		        } else {
		            app.setStatus("Found " + devices.length + " device" + (devices.length === 1 ? "." : "s."));
		        }
			},
			function() {
				console.log("error1");
				callback(new Error("Error getting cordova bluetooth list."));
			}
		);
	} else {
		console.log("error2");
		callback(new Error("No access to serial ports. Try loading as a Chrome Application."));
	}
};

// Convert string to ArrayBuffer
function str2ab(str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < str.length; i++) {
		console.log(str.charCodeAt(i));
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

function arrayBufferToBuffer(ab) {
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
