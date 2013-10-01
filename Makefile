build:
	@make install
	@component build --name serialport
	@component build --name serialport --out demo
	@browserify -r async > demo/bundle.js
install:
	@component install --dev

demo:
	@google-chrome ./demo/demo.html
	
.PHONY: build install demo