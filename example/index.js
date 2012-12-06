var express = require( 'express' ),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    postal = require('./postal.socketio.js')(require('underscore'), io, require('postal.federation'));

postal.instanceId = "node-server-789";

app.use( "/", express.static( __dirname + '/client' ) );
app.listen(3081);

postal.addWireTap(function(d, e) {
  console.log("ID: " + postal.instanceId + " " + JSON.stringify(e, null, 4));
});

var sockets = [];

io.sockets.on('connection', function (socket) {
  sockets.push(socket);
  socket.on("postal", function(data) {
    console.log(data);
  });
});
io.set( 'log level', 1 );

module.exports = {
  app    : app,
  io     : io,
  postal : postal,
  sockets: sockets
};