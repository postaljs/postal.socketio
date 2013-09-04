var express = require( 'express' ),
	app        = express(),
	server     = require( 'http' ).createServer( app ),
	io         = require( 'socket.io' ).listen( server ),
	machina    = require( 'machina' )(),
	underscore = require( 'underscore' ),
	riveter    = require( 'riveter' )( underscore ),
	postalCore = require( 'postal' )( underscore ),
	postalFedx = require( 'postal.federation' )( underscore, postalCore, riveter ),
	postal     = require( 'postal.socketio' )( underscore, io, postalFedx, machina, riveter ),
    uuid       = require('node-uuid');

postal.instanceId(uuid.v4());

app.use( express.static( __dirname + '/client' ) );

server.listen( 3082 );

postal.addWireTap( function ( d, e ) {
	if( e.topic !== "hai.client" ) {
		console.log( e );
	}
});

postal.fedx.addFilter([
	{ channel: 'ko', topic: '#', direction: 'both' }
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