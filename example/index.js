var express = require( 'express' ),
	app        = express(),
	server     = require( 'http' ).createServer( app ),
	io         = require( 'socket.io' ).listen( server ),
	machina    = require( 'machina' )(),
	underscore = require( 'underscore' ),
	riveter    = require( 'riveter' )( underscore ),
	postalCore = require( 'postal.js' )( underscore ),
	postalFedx = require( 'postal.federation' )( underscore, postalCore, riveter ),
	postal     = require( 'postal.socketio.js' )( underscore, io, postalFedx, machina, riveter );

postal.instanceId("node-server-789");

app.use( express.static( __dirname + '/client' ) );

server.listen( 3081 );

postal.addWireTap( function ( d, e ) {
	console.log( "ID: " + postal.instanceId() + " " + JSON.stringify( e, null, 4 ) );
});

postal.fedx.addFilter([
	{ channel: 'ctrl', topic: '#', direction: 'both' }
]);

io.sockets.on( 'connection', function ( socket ) {
	console.log( "CLIENT CONNECTED" );
	socket.on( "disconnect", function ( data ) {
		console.log( "CLIENT DISCONNECTED" );
	});
});
io.set( 'log level', 1 );

module.exports = {
	app     : app,
	io      : io,
	postal  : postal
};