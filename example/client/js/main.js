postal.instanceId("browser-client-123");

postal.addWireTap(function(d, e) {
  console.log("ID: " + postal.instanceId() + " " + JSON.stringify(e, null, 2));
});

window.__socket = io.connect(window.location.origin);

__socket.on("postal.fromServer", function() {
	console.log("FROM SERVER: " + JSON.stringify(arguments, null, 2));
});

postal.fedx.addFilter([
	{ channel: 'ctrl', topic: '#', direction: 'both' }
]);

postal.fedx.signalReady();