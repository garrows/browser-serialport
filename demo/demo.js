var SerialPort = require('../index.js').SerialPort;
var SerialPortList = require('../index.js').SerialPortList;

var list = new SerialPortList(function(ports) {

	var portsPath = document.getElementById("portPath");
	for (var i = 0; i < ports.length; i++) {
		portsPath.options[i] = new Option(ports[i], ports[i]);
	}

	var connectButton = document.getElementById("connect");
	connectButton.onclick = function() {
		var port = portsPath.options[portsPath.selectedIndex].value;
		connect(port);
	};

});



function connect(port) {

	var sp = new SerialPort(port, {
	    baudrate: 57600,
	    buffersize: 1
	}, true);

	sp.on('error', function(string) {
		console.log("ERROR", string);
	});

	sp.on('data', function(data) {
		console.log("Data", data);
	});	

	sp.on('dataString', function(data) {
		console.log("DataString", data);
	});	

	//sp.write(new Buffer([0xF0]));

}