;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var SerialPort = require('../index.js').SerialPort;
var SerialPortList = require('../index.js').SerialPortList;

var list = new SerialPortList(function(ports) {

	var portsPath = document.getElementById("portPath");
	for (var i = 0; i < ports.length; i++) {
		portsPath.options[i] = new Option(ports[i], ports[i]);

		if (ports[i].indexOf("USB") !== -1) {
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

});



function connect(port, baudrate) {

	var sp = new SerialPort(port, {
	    baudrate: 9600,
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

	sp.on("data", function(data) {
		//console.log("Data", data);
	});	

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
	}

}
},{"../index.js":2}],2:[function(require,module,exports){
"use strict";

function SerialPort(path, options, openImmediately) {
	console.log("SerialPort constructed.");

	this.portPath = path;

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

		if (openImmediately) {
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

SerialPort.prototype.portPath = "";

SerialPort.prototype.eventListeners = {};

SerialPort.prototype.open = function (callback) {
	console.log("Opening ", this.portPath);
	chrome.serial.open(this.portPath, {bitrate: this.options.baudrate}, this.proxy('onOpen', callback));
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

	chrome.serial.read(this.connectionId, this.options.buffersize, this.proxy('onRead'));
	
};

SerialPort.prototype.onRead = function (readInfo) {
	if (readInfo && readInfo.bytesRead > 0) {

		var uint8View = new Uint8Array(readInfo.data);
		var string = "";
		for (var i = 0; i < readInfo.bytesRead; i++) {
			string += String.fromCharCode(uint8View[i]);
		}
		if (string != "") {
			console.log("Read:", string);
		}

		//console.log("Got data", string, readInfo.data);	

		//Maybe this should be a Buffer()
		this.publishEvent("data", readInfo.data);
		this.publishEvent("dataString", string);
	}

	chrome.serial.read(this.connectionId, this.options.buffersize, this.proxy('onRead'));
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != "function") { callback = function() {}; }
	chrome.serial.write(this.connectionId, buffer, callback);  
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
		chrome.serial.getPorts(callback);
	} else {
		throw "No access to serial ports. Try loading as a Chrome Application.";
	}
}

// Convert string to ArrayBuffer
function str2ab(str) {
  var buf=new ArrayBuffer(str.length);
  var bufView=new Uint8Array(buf);
  for (var i=0; i<str.length; i++) {
	bufView[i]=str.charCodeAt(i);
  }
  return buf;
}

module.exports = { 
	SerialPort: SerialPort,
	SerialPortList: SerialPortList
};


},{}]},{},[1])
;