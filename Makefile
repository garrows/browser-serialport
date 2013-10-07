build:
	@make install
	@browserify demo/demo.js -o demo/bundle.js
install:
	@npm install

demo:
	@google-chrome ./demo/demo.html
	
.PHONY: build install demo