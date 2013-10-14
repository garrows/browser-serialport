;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
			portsPath.options[i] = new Option(ports[i].comName, ports[i].comName);

			if (ports[i].comName.indexOf("USB") !== -1) {
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
	chrome.serial.open(this.comName, {bitrate: this.options.baudrate}, this.proxy('onOpen', callback));
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

		//console.log("Got data", string, readInfo.data);	

		//Maybe this should be a Buffer()
		this.publishEvent("data", uint8View);
		this.publishEvent("dataString", string);
	}

	chrome.serial.read(this.connectionId, this.options.buffersize, this.proxy('onRead'));
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != "function") { callback = function() {}; }

	//Make sure its not a browserify faux Buffer.
	if (buffer instanceof ArrayBuffer == false) {
		buffer = buffer2ArrayBuffer(buffer);
	}

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
		chrome.serial.getPorts(function(ports) {
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


},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9nbGVuL0Ryb3Bib3gvRXhwZXJpbWVudHMvcm9ib3RpY3MvY29tcG9uZW50cy9icm93c2VyLXNlcmlhbHBvcnQvZGVtby9kZW1vLmpzIiwiL2hvbWUvZ2xlbi9Ecm9wYm94L0V4cGVyaW1lbnRzL3JvYm90aWNzL2NvbXBvbmVudHMvYnJvd3Nlci1zZXJpYWxwb3J0L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFNlcmlhbFBvcnRMaWIgPSByZXF1aXJlKCcuLi9pbmRleC5qcycpO1xudmFyIFNlcmlhbFBvcnQgPSBTZXJpYWxQb3J0TGliLlNlcmlhbFBvcnQ7XG5cblNlcmlhbFBvcnRMaWIubGlzdChmdW5jdGlvbihlcnIsIHBvcnRzKSB7XG5cdHZhciBwb3J0c1BhdGggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcnRQYXRoXCIpO1xuXG5cdGlmIChlcnIpIHtcblx0XHRjb25zb2xlLmxvZyhcIkVycm9yIGxpc3RpbmcgcG9ydHNcIiwgZXJyKTtcblx0XHRwb3J0c1BhdGgub3B0aW9uc1swXSA9IG5ldyBPcHRpb24oZXJyLCBcIkVSUk9SOlwiICsgZXJyKTtcblx0XHRwb3J0c1BhdGgub3B0aW9uc1swXS5zZWxlY3RlZCA9IHRydWU7XHRcdFx0XG5cdFx0cmV0dXJuO1xuXHR9IGVsc2Uge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcG9ydHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHBvcnRzUGF0aC5vcHRpb25zW2ldID0gbmV3IE9wdGlvbihwb3J0c1tpXS5jb21OYW1lLCBwb3J0c1tpXS5jb21OYW1lKTtcblxuXHRcdFx0aWYgKHBvcnRzW2ldLmNvbU5hbWUuaW5kZXhPZihcIlVTQlwiKSAhPT0gLTEpIHtcblx0XHRcdFx0cG9ydHNQYXRoLm9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB0cnVlO1x0XHRcdFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBjb25uZWN0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb25uZWN0XCIpO1xuXHRcdGNvbm5lY3RCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHBvcnQgPSBwb3J0c1BhdGgub3B0aW9uc1twb3J0c1BhdGguc2VsZWN0ZWRJbmRleF0udmFsdWU7XG5cdFx0XHR2YXIgYmF1ZHJhdGVFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXVkcmF0ZVwiKTtcblx0XHRcdHZhciBiYXVkcmF0ZSA9IGJhdWRyYXRlRWxlbWVudC5vcHRpb25zW2JhdWRyYXRlRWxlbWVudC5zZWxlY3RlZEluZGV4XS52YWx1ZTtcblx0XHRcdGNvbm5lY3QocG9ydCwgYmF1ZHJhdGUpO1xuXHRcdH07XG5cdH1cbn0pO1xuXG5cblxuZnVuY3Rpb24gY29ubmVjdChwb3J0LCBiYXVkcmF0ZSkge1xuXG5cdHZhciBzcCA9IG5ldyBTZXJpYWxQb3J0KHBvcnQsIHtcblx0ICAgIGJhdWRyYXRlOiA5NjAwLFxuXHQgICAgYnVmZmVyc2l6ZTogMVxuXHR9LCB0cnVlKTtcblxuXHR2YXIgb3V0cHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvdXRwdXRcIik7XG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2V0dGluZ3NcIikuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuXG5cdHNwLm9uKFwib3BlblwiLCBmdW5jdGlvbigpIHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbm5lY3RlZC1jb250YWluZXJcIikuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcblx0XHRvdXRwdXQudGV4dENvbnRlbnQgKz0gXCJDb25uZWN0aW9uIG9wZW5cXG5cIjtcblx0fSk7XG5cblx0c3Aub24oXCJlcnJvclwiLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRvdXRwdXQudGV4dENvbnRlbnQgKz0gXCJcXG5FcnJvcjogXCIgKyBzdHJpbmcgKyBcIlxcblwiO1xuXHR9KTtcblxuXHRzcC5vbihcImRhdGFcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdC8vY29uc29sZS5sb2coXCJEYXRhXCIsIGRhdGEpO1xuXHR9KTtcdFxuXG5cdHNwLm9uKFwiZGF0YVN0cmluZ1wiLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRvdXRwdXQudGV4dENvbnRlbnQgKz0gc3RyaW5nO1xuXHR9KTtcdFxuXG5cdGZ1bmN0aW9uIHNlbmQoKSB7XG5cdFx0dmFyIGxpbmUgPSBpbnB1dC52YWx1ZTtcblx0XHRpbnB1dC52YWx1ZSA9IFwiXCI7XG5cdFx0c3Aud3JpdGVTdHJpbmcobGluZSArIFwiXFxuXCIpO1xuXHR9XG5cblxuXHR2YXIgaW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0XCIpO1xuXHR2YXIgc2VuZEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2VuZFwiKTtcblx0c2VuZEJ1dHRvbi5vbmNsaWNrID0gc2VuZDtcblx0aW5wdXQub25rZXlwcmVzcyA9IGZ1bmN0aW9uKGUpIHsgXG5cdFx0aWYgKGUud2hpY2ggPT0gMTMpIHtcblx0XHRcdHNlbmQoKTtcblx0XHR9IFxuXHR9XG5cbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gU2VyaWFsUG9ydChwYXRoLCBvcHRpb25zLCBvcGVuSW1tZWRpYXRlbHkpIHtcblx0Y29uc29sZS5sb2coXCJTZXJpYWxQb3J0IGNvbnN0cnVjdGVkLlwiKTtcblxuXHR0aGlzLmNvbU5hbWUgPSBwYXRoO1xuXG5cdGlmIChvcHRpb25zKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIHRoaXMub3B0aW9ucykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIkxvb2tpbmcgZm9yIFwiICsga2V5ICsgXCIgb3B0aW9uLlwiKTtcblx0XHRcdGlmIChvcHRpb25zW2tleV0gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJSZXBsYWNpbmcgXCIgKyBrZXkgKyBcIiB3aXRoIFwiICsgb3B0aW9uc1trZXldKTtcblx0XHRcdFx0dGhpcy5vcHRpb25zW2tleV0gPSBvcHRpb25zW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHR5cGVvZiBjaHJvbWUgIT0gXCJ1bmRlZmluZWRcIiAmJiBjaHJvbWUuc2VyaWFsKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0aWYgKG9wZW5JbW1lZGlhdGVseSAhPSBmYWxzZSkge1xuXHRcdFx0dGhpcy5vcGVuKCk7XG5cdFx0fVxuXG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgXCJObyBhY2Nlc3MgdG8gc2VyaWFsIHBvcnRzLiBUcnkgbG9hZGluZyBhcyBhIENocm9tZSBBcHBsaWNhdGlvbi5cIjtcblx0fVxufVxuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5vcHRpb25zID0ge1xuICAgIGJhdWRyYXRlOiA1NzYwMCxcbiAgICBidWZmZXJzaXplOiAxXG59O1xuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5jb25uZWN0aW9uSWQgPSAtMTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUuY29tTmFtZSA9IFwiXCI7XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLmV2ZW50TGlzdGVuZXJzID0ge307XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0Y29uc29sZS5sb2coXCJPcGVuaW5nIFwiLCB0aGlzLmNvbU5hbWUpO1xuXHRjaHJvbWUuc2VyaWFsLm9wZW4odGhpcy5jb21OYW1lLCB7Yml0cmF0ZTogdGhpcy5vcHRpb25zLmJhdWRyYXRlfSwgdGhpcy5wcm94eSgnb25PcGVuJywgY2FsbGJhY2spKTtcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLm9uT3BlbiA9IGZ1bmN0aW9uIChjYWxsYmFjaywgb3BlbkluZm8pIHtcblx0Y29uc29sZS5sb2coXCJvbk9wZW5cIiwgY2FsbGJhY2ssIG9wZW5JbmZvKTtcblx0dGhpcy5jb25uZWN0aW9uSWQgPSBvcGVuSW5mby5jb25uZWN0aW9uSWQ7XG5cdGlmICh0aGlzLmNvbm5lY3Rpb25JZCA9PSAtMSkge1xuXHRcdHRoaXMucHVibGlzaEV2ZW50KFwiZXJyb3JcIiwgXCJDb3VsZCBub3Qgb3BlbiBwb3J0LlwiKTtcblx0XHRyZXR1cm47XG5cdH1cblx0XG5cdHRoaXMucHVibGlzaEV2ZW50KFwib3BlblwiLCBvcGVuSW5mbyk7XG5cblx0XG5cdGNvbnNvbGUubG9nKCdDb25uZWN0ZWQgdG8gcG9ydC4nLCB0aGlzLmNvbm5lY3Rpb25JZCk7XG5cdFxuXHR0eXBlb2YgY2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiICYmIGNhbGxiYWNrKG9wZW5JbmZvKTtcblxuXHRjaHJvbWUuc2VyaWFsLnJlYWQodGhpcy5jb25uZWN0aW9uSWQsIHRoaXMub3B0aW9ucy5idWZmZXJzaXplLCB0aGlzLnByb3h5KCdvblJlYWQnKSk7XG5cdFxufTtcblxuU2VyaWFsUG9ydC5wcm90b3R5cGUub25SZWFkID0gZnVuY3Rpb24gKHJlYWRJbmZvKSB7XG5cdGlmIChyZWFkSW5mbyAmJiByZWFkSW5mby5ieXRlc1JlYWQgPiAwKSB7XG5cblx0XHR2YXIgdWludDhWaWV3ID0gbmV3IFVpbnQ4QXJyYXkocmVhZEluZm8uZGF0YSk7XG5cdFx0dmFyIHN0cmluZyA9IFwiXCI7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZWFkSW5mby5ieXRlc1JlYWQ7IGkrKykge1xuXHRcdFx0c3RyaW5nICs9IFN0cmluZy5mcm9tQ2hhckNvZGUodWludDhWaWV3W2ldKTtcblx0XHR9XG5cblx0XHQvL2NvbnNvbGUubG9nKFwiR290IGRhdGFcIiwgc3RyaW5nLCByZWFkSW5mby5kYXRhKTtcdFxuXG5cdFx0Ly9NYXliZSB0aGlzIHNob3VsZCBiZSBhIEJ1ZmZlcigpXG5cdFx0dGhpcy5wdWJsaXNoRXZlbnQoXCJkYXRhXCIsIHVpbnQ4Vmlldyk7XG5cdFx0dGhpcy5wdWJsaXNoRXZlbnQoXCJkYXRhU3RyaW5nXCIsIHN0cmluZyk7XG5cdH1cblxuXHRjaHJvbWUuc2VyaWFsLnJlYWQodGhpcy5jb25uZWN0aW9uSWQsIHRoaXMub3B0aW9ucy5idWZmZXJzaXplLCB0aGlzLnByb3h5KCdvblJlYWQnKSk7XG59XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBjYWxsYmFjayAhPSBcImZ1bmN0aW9uXCIpIHsgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHt9OyB9XG5cblx0Ly9NYWtlIHN1cmUgaXRzIG5vdCBhIGJyb3dzZXJpZnkgZmF1eCBCdWZmZXIuXG5cdGlmIChidWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciA9PSBmYWxzZSkge1xuXHRcdGJ1ZmZlciA9IGJ1ZmZlcjJBcnJheUJ1ZmZlcihidWZmZXIpO1xuXHR9XG5cblx0Y2hyb21lLnNlcmlhbC53cml0ZSh0aGlzLmNvbm5lY3Rpb25JZCwgYnVmZmVyLCBjYWxsYmFjayk7ICBcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLndyaXRlU3RyaW5nID0gZnVuY3Rpb24gKHN0cmluZywgY2FsbGJhY2spIHtcblx0dGhpcy53cml0ZShzdHIyYWIoc3RyaW5nKSwgY2FsbGJhY2spOyAgXG59O1xuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRjaHJvbWUuc2VyaWFsLmNsb3NlKHRoaXMuY29ubmVjdGlvbklkLCB0aGlzLnByb3h5KCdvbkNsb3NlJywgY2FsbGJhY2spKTtcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLm9uQ2xvc2UgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0dGhpcy5jb25uZWN0aW9uSWQgPSAtMTtcblx0Y29uc29sZS5sb2coXCJDbG9zZWQgcG9ydFwiLCBhcmd1bWVudHMpO1xuXHR0aGlzLnB1Ymxpc2hFdmVudChcImNsb3NlXCIpO1xuXHR0eXBlb2YgY2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiICYmIGNhbGxiYWNrKG9wZW5JbmZvKTtcbn07XG5cblNlcmlhbFBvcnQucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cbn07XG5cbi8vRXhwZWN0aW5nOiBkYXRhLCBlcnJvclxuU2VyaWFsUG9ydC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaykge1xuXHRpZiAodGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdO1xuXHR9XG5cdGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0dGhpcy5ldmVudExpc3RlbmVyc1tldmVudE5hbWVdLnB1c2goY2FsbGJhY2spO1x0XHRcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBcImNhbiBub3Qgc3Vic2NyaWJlIHdpdGggYSBub24gZnVuY3Rpb24gY2FsbGJhY2tcIjtcblx0fVxufVxuXG5TZXJpYWxQb3J0LnByb3RvdHlwZS5wdWJsaXNoRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhKSB7XG5cdGlmICh0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gIT0gdW5kZWZpbmVkKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmV2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVtpXShkYXRhKTtcblx0XHR9XG5cdH1cbn1cblxuU2VyaWFsUG9ydC5wcm90b3R5cGUucHJveHkgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0dmFyIHByb3h5QXJncyA9IFtdO1xuXG5cdC8vYXJndW1lbnRzIGlzbnQgYWN0dWFsbHkgYW4gYXJyYXkuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBwcm94eUFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG5cdH1cblxuXHR2YXIgZnVuY3Rpb25OYW1lID0gcHJveHlBcmdzLnNwbGljZSgwLCAxKVswXTtcblxuXHR2YXIgZnVuYyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmdW5jQXJncyA9IFtdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ICAgIGZ1bmNBcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuXHRcdH1cblx0XHR2YXIgYWxsQXJncyA9IHByb3h5QXJncy5jb25jYXQoZnVuY0FyZ3MpO1xuXG5cdFx0c2VsZltmdW5jdGlvbk5hbWVdLmFwcGx5KHNlbGYsIGFsbEFyZ3MpO1xuXHR9XG5cblx0cmV0dXJuIGZ1bmM7XG59XG5cbmZ1bmN0aW9uIFNlcmlhbFBvcnRMaXN0KGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2YgY2hyb21lICE9IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lLnNlcmlhbCkge1xuXHRcdGNocm9tZS5zZXJpYWwuZ2V0UG9ydHMoZnVuY3Rpb24ocG9ydHMpIHtcblx0XHRcdHZhciBwb3J0T2JqZWN0cyA9IEFycmF5KHBvcnRzLmxlbmd0aCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBvcnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHBvcnRPYmplY3RzW2ldID0gbmV3IFNlcmlhbFBvcnQocG9ydHNbaV0sIG51bGwsIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKG51bGwsIHBvcnRPYmplY3RzKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjYWxsYmFjayhcIk5vIGFjY2VzcyB0byBzZXJpYWwgcG9ydHMuIFRyeSBsb2FkaW5nIGFzIGEgQ2hyb21lIEFwcGxpY2F0aW9uLlwiLCBudWxsKTtcblx0fVxufTtcblxuLy8gQ29udmVydCBzdHJpbmcgdG8gQXJyYXlCdWZmZXJcbmZ1bmN0aW9uIHN0cjJhYihzdHIpIHtcblx0dmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihzdHIubGVuZ3RoKTtcblx0dmFyIGJ1ZlZpZXcgPSBuZXcgVWludDhBcnJheShidWYpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuXHRcdGJ1ZlZpZXdbaV0gPSBzdHIuY2hhckNvZGVBdChpKTtcblx0fVxuXHRyZXR1cm4gYnVmO1xufVxuXG4vLyBDb252ZXJ0IGJ1ZmZlciB0byBBcnJheUJ1ZmZlclxuZnVuY3Rpb24gYnVmZmVyMkFycmF5QnVmZmVyKGJ1ZmZlcikge1xuXHR2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKGJ1ZmZlci5sZW5ndGgpO1xuXHR2YXIgYnVmVmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSsrKSB7XG5cdFx0YnVmVmlld1tpXSA9IGJ1ZmZlcltpXTtcblx0fVxuXHRyZXR1cm4gYnVmO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgXG5cdFNlcmlhbFBvcnQ6IFNlcmlhbFBvcnQsXG5cdGxpc3Q6IFNlcmlhbFBvcnRMaXN0LFxuXHR1c2VkOiBbXSAvL1RPRE86IFBvcHVsYXRlIHRoaXMgc29tZXdoZXJlLlxufTtcblxuIl19
;