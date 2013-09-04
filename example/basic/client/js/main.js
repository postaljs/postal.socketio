$(function(){
	var mode = "disconnect";

	postal.instanceId("browser-client-123");

	// uncomment the wiretap if you want to flood the console
	//postal.addWireTap(function(d, e) {
	//  console.log("ID: " + postal.instanceId() + " " + JSON.stringify(e, null, 2));
	//});

	// handy dandy global ref
	window.__socket = io.connect(window.location.origin);

	// uncomment this to flood the console with MOAR
	//__socket.on("postal.fromServer", function() {
	//	console.log("FROM SERVER: " + JSON.stringify(arguments, null, 2));
	//});

	postal.fedx.addFilter([
		{ channel: 'ctrl', topic: '#', direction: 'both' }
	]);

	// because, caching
	var $messages = $("#messages");
	var $connMgr = $("#connMgr");
	var $sendMsg = $("#sendMsg");

	var cb = function( d, e ) {
		$messages.prepend( "<div><pre>" + JSON.stringify(e, null, 2) + "</pre></div>" );
	};

	postal.subscribe({
		channel  : "ctrl",
		topic    : "hai.client",
		callback : cb
	});

	postal.subscribe({
		channel  : "postal.federation",
		topic    : "client.federated",
		callback : cb
	});

	$connMgr.on("click", function() {
		switch(mode) {
			case "disconnect":
				__socket.disconnect();
				mode = "connect";
				$connMgr.val("Connect");
			break;
			default :
				__socket.socket.connect();
				mode = "disconnect";
				$connMgr.val("Disconnect");
			break;
		}
	});

	$sendMsg.on("click", function() {
		postal.publish({ channel: "ctrl", topic: "hai.server", data: "In yer clientz, sending messagez..." });
	});

	postal.fedx.signalReady();
});