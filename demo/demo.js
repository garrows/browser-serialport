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