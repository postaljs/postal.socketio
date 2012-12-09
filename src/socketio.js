var SOCKET_IO = 'socketio';
var _defaults = {
  enabled : true
};
var _config = _defaults;

var SocketClient = function( socket, instanceId ) {
  this.socket = socket;
  this.instanceId = instanceId;
};

SocketClient.prototype.send = function(env) {
  plugin.send(this.socket, env);
};

var plugin = postal.fedx.transports[SOCKET_IO] = {

  listening: [],

  config: function(cfg){
    if(cfg) {
      _config = _.defaults(cfg, _defaults);
    }
    return _config;
  },

  getClientInstance: function( data ) {
    return new SocketClient( data.source, data.packingSlip.instanceId );
  },

  getTargets: function() {
    var targets = [];
    // in the browser?
    if(io.sockets && io.sockets.sockets) {
      _.each(io.sockets.sockets, function(socket){
        if(socket.namespace) {
          targets.push(socket.namespace);
        }
      });
    } // in node?
    else if (io.sockets) {
      _.each(io.sockets, function(socket){
        if(socket.namespaces) {
          _.each(socket.namespaces, function(ns) {
            targets.push(ns);
          });
        }
      });
    }
    return targets;
  },

  updateListeners: function(sockets) {
    sockets = sockets || this.getTargets();
    _.each(sockets, function(socket) {
      if(!_.any(this.listening, function(x){
        return x.socket !== socket;
        })
      ) {
        var listener = {
          socket: socket,
          callback: this.getOnEvent(socket)
        };
        listener.socket.on("postal", listener.callback);
        this.listening.push(listener);
      }
    }, this);
  },

  onMessage: function(socket, data) {
    if(this.shouldProcess(data)) {
      postal.fedx.onFederatedMsg({
        transport   : SOCKET_IO,
        packingSlip : data,
        source      : socket
      });
    }
  },

  getOnEvent: function(socket) {
    var self = this;
    return function(data) {
      self.onMessage(socket, data);
    }
  },

  send: function(socket, msg) {
    socket.emit( "postal",  msg );
  },

  shouldProcess: function(event) {
    return _config.enabled;
  }
};

if(io.sockets && typeof io.sockets.on === 'function') {
  io.sockets.on('connection', function(socket){
    plugin.updateListeners([socket]);
  });
}