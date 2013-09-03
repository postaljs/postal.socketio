var SOCKET_IO = "socketio";
var NO_OP = function () {};
var _defaults = {
	enabled    : true,
	autoSignal : true,
	migrate    : true
};
var _config = _defaults;
var _isServer = (typeof window === "undefined");
var _pubEventName = _isServer ? "postal.fromServer" : "postal.fromClient";
var _rcvEventName = _isServer ? "postal.fromClient" : "postal.fromServer";
var _socketEvents = _isServer ?
                   ["disconnect"] :
                   ["connect", "connecting", "disconnect", "connect_failed", "error", "reconnect", "reconnect_failed", "reconnecting"];
var _nextLoop =  (typeof process !== "undefined" && typeof process.nextTick === "function") ? process.nextTick : _.defer;

var _memoRemoteByInstanceId = function(memo, instanceId) {
	var proxy = _.find(this.remotes, function(x) {
		return x.instanceId === instanceId;
	});
	if(proxy) { memo.push(proxy); }
	return memo;
};

var _memoRemoteByTarget = function(memo, tgt) {
	var proxy = _.find(this.remotes, function(x) {
		return x.target === tgt;
	});
	if(proxy) { memo.push(proxy); }
	return memo;
};

var _disconnectClient = function ( client ) {
	client.disconnect();
};

//import("SocketIoClient.js");

//import("plugin.js");

function listenToSocket( socket ) {
	var remote = _.find( plugin.remotes, function ( x ) {
		return x.target === socket;
	});
	if ( !remote ) {
		plugin.staged = _.without( plugin.staged, socket );
		remote = SocketIoClient.getInstance( socket );
		socket.on( _rcvEventName, _.bind( remote.onMessage, remote) );
		plugin.remotes.push( remote );
	}
	return remote;
}

if( _isServer ) {
	io.sockets.on( "connection", function( socket ) {
		plugin.staged.push( socket );
		listenToSocket( socket );
		if( _config.autoSignal ) {
			plugin.signalReady( socket );
		}
	});
}