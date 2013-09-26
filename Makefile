build:
	@make install
	@component build --dev
	

install:
	@component install --dev > /dev/null

demo:
	@google-chrome ./demo/demo.html
	
.PHONY: build install demo