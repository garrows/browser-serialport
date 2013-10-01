var SerialPort = require('../index.js').SerialPort;

var sp = new SerialPort("/dev/usb0", {
    baudrate: 57600,
    buffersize: 1
});

sp.on('error', function(string) {
	console.log("ERROR", string);
});

sp.on('data', function(data) {
	console.log("Data", data);
});

sp.write(new Buffer([0xF0]));