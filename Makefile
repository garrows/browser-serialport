build:
	@make install
	@gulp
install:
	@npm install

demo:
	@google-chrome --load-and-launch-app=demo/

.PHONY: build install demo
