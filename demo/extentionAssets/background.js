
chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('../demo.html', {
		bounds: {
			width: 1200,
			height: 1000,
			left: 100,
			top: 100
		},
		minWidth: 1200,
		minHeight: 1000
	});
});

chrome.runtime.onSuspend.addListener(function() { 
	// Do some simple clean-up tasks.
});

chrome.runtime.onInstalled.addListener(function() { 
		// chrome.storage.local.set(object items, function callback);
});