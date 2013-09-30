build:
	@make install
	@component build
	@component build --name browser-serialport --out demo
	@browserify -r async > demo/bundle.js
install:
	@component install --dev > /dev/null

demo:
	@google-chrome ./demo/demo.html
	
.PHONY: build install demo