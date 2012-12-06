var SOCKET_IO = 'socketio';
var _defaults = {
  autoReciprocate : true,
  enabled         : true
};
var _config = _defaults;

var SocketClient = function(socket, instanceId, autoReciprocate) {
  this.socket = socket;
  this.instanceId = instanceId;
  this.autoReciprocate = autoReciprocate;
};

SocketClient.prototype.send = function(env) {
  this.socket.emit("postal", postal.fedx.transports[SOCKET_IO].getWrapper('message', env));
};

SocketClient.prototype.reciprocate = function() {
  this.socket.emit("postal", postal.fedx.transports[SOCKET_IO].getWrapper('ready'));
};

// TODO: -
SocketClient.prototype.attachToClient = function(client) {
  if(!client[SOCKET_IO]) {
    client[SOCKET_IO] = this;
    if(this.autoReciprocate) {
      this.reciprocate();
    }
  }
};

var plugin = postal.fedx.transports[SOCKET_IO] = {

  listening: [],

  config: function(cfg){
    if(cfg) {
      _config = _.defaults(cfg, _defaults);
    }
    return _config;
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

  getWrapper: function(type, envelope) {
    switch(type) {
      case 'ready' :
        return {
          postal     : true,
          type       : "federation." + type,
          instanceId : postal.instanceId
        };
        break;
      default:
        return {
          postal     : true,
          type       : "federation." + type,
          instanceId : postal.instanceId,
          envelope   : envelope
        };
        break;
    }
  },

  onMessage: function(socket, data) {
    if(this.shouldProcess(data)) {
      if(data.type === "federation.ready") {
        postal.fedx.addClient(new SocketClient(socket, data.instanceId, _config.autoReciprocate), SOCKET_IO);
      } else if(data.type === "federation.message") {
        postal.fedx.onFederatedMsg( data.envelope, data.instanceId );
      }
    }
  },

  getOnEvent: function(socket) {
    var self = this;
    return function(data) {
      self.onMessage(socket, data);
    }
  },

  shouldProcess: function(event) {
    return _config.enabled && event.postal;
  },

  signalReady: function(socket) {
    var _targets = !socket ? this.getTargets() : (_.isArray(socket) ? socket : [socket]);
    this.updateListeners(_targets);
    _.each(_targets, function(target) {
      target.emit("postal", this.getWrapper("ready"));
    }, this);
  }

};

if(io.sockets && typeof io.sockets.on === 'function') {
  io.sockets.on('connection', function(socket){
    plugin.updateListeners([socket]);
  });
}
