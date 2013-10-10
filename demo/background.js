
chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('demo.html', {
		bounds: {
			width: 1160,
			height: 960,
			left: 100,
			top: 100
		},
		minWidth: 1160,
		minHeight: 960
	});
});

chrome.runtime.onSuspend.addListener(function() { 
	// Do some simple clean-up tasks.
});

chrome.runtime.onInstalled.addListener(function() { 
		// chrome.storage.local.set(object items, function callback);
});