build:
	@make install
	@browserify demo/demo.js -o demo/bundle.js
install:
	@npm install

demo:
	@google-chrome --load-and-launch-app=demo/
	
.PHONY: build install demo