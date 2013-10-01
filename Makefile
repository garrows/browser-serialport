build:
	@make install
	@browserify demo/demo.js -o demo/serialport.js
install:
	@npm install

demo:
	@google-chrome ./demo/demo.html
	
.PHONY: build install demo