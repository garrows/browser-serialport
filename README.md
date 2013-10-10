
# browser-serialport

Robots in the browser. Just like [node-serialport](https://npmjs.org/package/serialport) but for browser apps. 


## Why not Node.js?

[Nodebots](http://nodebots.io/) are awesome but HTML5 apps have access to a lot of APIs that make sense for robotics like the [GamepadAPI](http://www.html5rocks.com/en/tutorials/doodles/gamepad/), [WebRTC Video and Data](http://www.webrtc.org/), [Web Speech API](http://www.google.com/intl/en/chrome/demos/speech.html), etc. Also you get a nice GUI and its easier to run. I'm planning to bring [Jonny-Five](https://github.com/rwaldron/johnny-five) to work in the browser as well by modifying it's dependancy [Firmata](https://github.com/jgautier/firmata) to use browser-serialport.


## Demos

A serial monitor/writer is available in the chrome web store (Link coming soon). Source is available in the demo directory.

A Jonny-five demo is also coming soon.


## Restrictions

You will not be able to add this to your normal website. 

This library only works in a [Chrome Packaged App](http://developer.chrome.com/apps/about_apps.html) as this is the only way to get access to the [serial ports API](http://developer.chrome.com/apps/serial.html) in the browser.

If you want help making your first Chrome App, read the getting ["Create Your First App"](http://developer.chrome.com/apps/first_app.html) tutorial.

There is currently no Firefox extension support but that might come soon if possible.

## Installation

```
npm install browser-serialport
```

## Usage

The library tries to emulate the node-serialport library with some minor differences. If you find some breaking inconsistencies, please submit an issue. 

```js

var SerialPort = require("browser-browser-serialport").SerialPort;
var sp = new SerialPort(port, {
    baudrate: 9600,
    buffersize: 1
}, true);


sp.on("open", function() {
	console.log("Connection is ready.");
	//Send a string
	sp.writeString("Hello robot\n");
	//You can also send buffers
	var buf = new Buffer("Buffers are handy", "utf8");
	sp.write(buf);
});

sp.on("error", function(err) {
	console.log("Error", err);
});

//You can listen for data as a buffer.
sp.on("data", function(buf) {
	console.log("Data", buf);
});	

//Or string encoding can be done for you
sp.on("dataString", function(string) {
	console.log("String", string);
});	


```

You can also list the available serialports.

```js
	
var SerialPortList = require("browser-serialport").SerialPortList;

var list = new SerialPortList(function(portsArray) {
	console.log("Ports available", portsArray)
});

```

