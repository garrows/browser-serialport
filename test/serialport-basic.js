"use strict";

var sinon = require("sinon");
var chai = require('chai');
var expect = chai.expect;

var MockedSerialPort = require('../');
var SerialPort = MockedSerialPort.SerialPort;

var options;

var hardware = {
  ports: {},
  createPort: function(path){
    this.ports[path] = true;
  },
  reset: function(){
    this.ports = {};
    this.onReceive = function(){console.log("onreceive unset");};
    this.onReceiveError = function(){console.log("onReceiveError unset");};
  },
  onReceive: function(){
    console.log("onreceive unset");
  },
  onReceiveError: function(){
    console.log("onReceiveError unset");
  },
  emitData: function(buffer){
    var self = this;
    process.nextTick(function(){
      var readInfo = {data: MockedSerialPort.buffer2ArrayBuffer(buffer), connectionId: 1}
      self.onReceive(readInfo);
    });
  },
  disconnect: function(path){
    this.ports[path] = false;
    var info = {error: "disconnected", connectionId: 1}
    this.onReceiveError(info);
    console.log("disconnect");
  },
  timeout: function(path){
    this.ports[path] = false;
    var info = {error: "timeout", connectionId: 1}
    this.onReceiveError(info);
    console.log("timeout");
  },
  loseDevice: function(path){
    this.ports[path] = false;
    var info = {error: "device_lost", connectionId: 1}
    this.onReceiveError(info);
    console.log("loseDevice");
  },
  systemError: function(path){
    this.ports[path] = false;
    var info = {error: "system_error", connectionId: 1}
    this.onReceiveError(info);
    console.log("systemError");
  }
}

describe('SerialPort', function () {
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    global.chrome = { runtime: { lastError: null } };

    options = {
      serial: {
        connect: function(path, options, cb){
          if (!hardware.ports[path]) {
            global.chrome.runtime.lastError = new Error({message: "Failed to connect to the port."});
          }

          cb({ 
            bitrate: 9600,
            bufferSize: 4096,
            connectionId: 1,
            ctsFlowControl: true,
            dataBits: "eight",
            name: "",
            parityBit: "no",
            paused: false,
            persistent: false,
            receiveTimeout: 0,
            sendTimeout: 0,
            stopBits: "one"
           });
        },
        onReceive: {
          addListener: function(cb){
            hardware.onReceive = cb;
          }
        },
        onReceiveError: {
          addListener: function(cb){
            hardware.onReceiveError = cb;
          }
        },
        send: function(){},
        disconnect: function(){
          
        }
      }
    };
    // Create a port for fun and profit
    hardware.reset();
    hardware.createPort('/dev/exists');
  });

  afterEach(function () {
    options = null;

    sandbox.restore();
  });

  describe('Constructor', function () {
    it("opens the port immediately", function (done) {
      var port = new SerialPort('/dev/exists', options, function (err) {
        expect(err).to.not.be.ok;
        done();
      });
    });

    it.skip('emits an error on the factory when erroring without a callback', function (done) {
      // finish the test on error
      MockedSerialPort.once('error', function (err) {
        chai.assert.isDefined(err, "didn't get an error");
        done();
      });

      var port = new SerialPort('/dev/johnJacobJingleheimerSchmidt');
    });

    it('emits an error on the serialport when explicit error handler present', function (done) {
      var port = new SerialPort('/dev/johnJacobJingleheimerSchmidt', options);

      port.once('error', function(err) {
        chai.assert.isDefined(err);
        done();
      });
    });

    it('errors with invalid databits', function (done) {
      var errorCallback = function (err) {
        chai.assert.isDefined(err, 'err is not defined');
        done();
      };

      var port = new SerialPort('/dev/exists', { databits : 19 }, false, errorCallback);
    });

    it('allows optional options', function (done) {
      global.chrome.serial = options.serial;
      var cb = function () {};
      var port = new SerialPort('/dev/exists', cb);
      // console.log(port);
      expect(typeof port.options).to.eq('object');
      delete global.chrome.serial;
      done();
    });

  });

  describe('reading data', function () {

    it('emits data events by default', function (done) {
      var testData = new Buffer("I am a really short string");
      var port = new SerialPort('/dev/exists', options, function () {
        port.once('data', function(recvData) {
          expect(recvData).to.eql(testData);
          done();
        });
        hardware.emitData(testData);
      });
    });

    it('calls the dataCallback if set', function (done) {
      var testData = new Buffer("I am a really short string");
      options.dataCallback = function (recvData) {
          expect(recvData).to.eql(testData);
          done();
        }

      var port = new SerialPort('/dev/exists', options, function () {
        hardware.emitData(testData);
      });
    });

  });

  describe('#open', function () {

    it('passes the port to the bindings', function (done) {
      var openSpy = sandbox.spy(options.serial, 'connect');
      var port = new SerialPort('/dev/exists', options, false);
      port.open(function (err) {
        expect(err).to.not.be.ok;
        expect(openSpy.calledWith('/dev/exists'));
        done();
      });
    });

    it('calls back an error when opening an invalid port', function (done) {
      var port = new SerialPort('/dev/unhappy', options, false);
      port.open(function (err) {
        expect(err).to.be.ok;
        done();
      });
    });

    it("emits data after being reopened", function (done) {
      var data = new Buffer("Howdy!");
      var port = new SerialPort('/dev/exists', options, function () {
        port.close();
        port.open(function () {
          port.once('data', function (res) {
            expect(res).to.eql(data);
            done();
          });
          hardware.emitData(data);
        });
      });
    });

  });

  describe('close', function () {
    it("fires a close event when it's closed", function (done) {
      var port = new SerialPort('/dev/exists', options, function () {
        var closeSpy = sandbox.spy();
        port.on('close', closeSpy);
        port.close();
        expect(closeSpy.calledOnce);
        done();
      });
    });

    it("fires a close event after being reopened", function (done) {
      var port = new SerialPort('/dev/exists', options, function () {
        var closeSpy = sandbox.spy();
        port.on('close', closeSpy);
        port.close();
        port.open();
        port.close();
        expect(closeSpy.calledTwice);
        done();
      });
    });
  });

  describe('disconnect', function () {
    it("fires a disconnect event", function (done) {
      options.disconnectedCallback = function (err) {
          expect(err).to.not.be.ok;
          done();
        };
      var port = new SerialPort('/dev/exists', options, function () {
        hardware.disconnect('/dev/exists');
      });
    });
  });

});

