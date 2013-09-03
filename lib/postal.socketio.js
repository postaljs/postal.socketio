/*
 postal.socketio
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.0.0
 */
(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = function(_, io, postal, machina, riveter) {
      return factory( _, io, postal, machina, riveter);
    }
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( [ "underscore", "socket.io", "postal.federation", "machina", "riveter" ], function ( _, io, postal, machina, riveter ) {
      return factory( _, io, postal, machina, riveter, root );
    } );
  } else {
    // Browser globals
    root.postal = factory( root._, root.io, root.postal, root.machina, root.riveter, root );
  }
}( this, function ( _, io, postal, machina, riveter, global, undefined ) {

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
  
  var SocketIoClient = machina.Fsm.extend({
  
  	initialize: function() {
  		var self = this;
  		self.pings = {};
  		self.handshakeComplete = false;
  		if(self.target) {
  			_.each(_socketEvents, function(evnt) {
  				self.target.on(evnt, function(){
  					var args = Array.prototype.slice.call(arguments, 0);
  					args.unshift(evnt);
  					self.handle.apply(self, args);
  				});
  			});
  		}
  		self.initialState = _isServer ?
  		                        (self.target.disconnected ? "disconnected" : "connected" ) :
  		                        (self.target.socket.connected ? "connected" : "disconnected")
  	},
  
  	transportName : SOCKET_IO,
  
  	initialState: "disconnected",
  
  	states : {
  		disconnected: {
  			send : function( packingSlip ) {
  				if(_config.migrate) {
  					if(!this.messageBundle) {
  						this.messageBundle = postal.fedx.getPackingSlip("bundle");
  						this.messageBundle.packingSlips = [];
  					}
  					this.messageBundle.packingSlips.push( packingSlip );
  				}
  			},
  			connect   : "connected",
  			reconnect : "connected"
  		},
  		connected : {
  			_onEnter : function() {
  				var bundle, self = this;
  				if(bundle = self.messageBundle) {
  					_nextLoop(function(){
  						self.send(bundle);
  					});
  					self.messageBundle = undefined;
  				}
  			},
  			send : function( packingSlip ) {
  				this.target.emit( _pubEventName, packingSlip );
  			},
  			sendQueued : function () {
  				var bundle, self = this;
  				if(bundle = self.messageBundle) {
  					_nextLoop(function(){
  						self.send(bundle);
  					});
  					self.messageBundle = undefined;
  				}
  			},
  			onMessage : function( packingSlip ) {
  				var remote, hasPing;
  				if ( this.shouldProcess() ) {
  					postal.fedx.onFederatedMsg( {
  						transport   : this.transportName,
  						packingSlip : packingSlip,
  						source      : this
  					} );
  				}
  			},
  			connecting       : "disconnected",
  			disconnect       : "disconnected",
  			connect_failed   : "disconnected",
  			reconnect_failed : "disconnected",
  			reconnecting     : "disconnected"
  		}
  	},
  
  	decommission : function() {
  		if(!this.decommissioned) {
  			this.target.removeAllListeners();
  			this.off();
  			this.target = undefined;
  			plugin.remotes = _.without( plugin.remotes, this );
  			this.decommissioned = true;
  			return this.messageBundle;
  		}
  	},
  
  	onMessage : function( packingSlip ) {
  		if( packingSlip ) {
  			this.handle( "onMessage", packingSlip );
  		}
  	},
  
  	send : function( packingSlip ) {
  		this.handle( "send", packingSlip );
  	},
  
  	shouldProcess : function() {
  		return _config.enabled; // TODO: Are there other constraints?
  	},
  
  	setInstanceId : function( id ) {
  		var remote, queued, self = this;
  		this.instanceId = id;
  		remote = _.find( plugin.remotes, function ( x ) {
  			return x !== this && x.instanceId === id;
  		}, this);
  		if(remote) {
  			if(_config.migrate) {
  				_nextLoop(function() {
  					self.send( remote.decommission.call(remote) );
  				});
  			}
  		}
  	}
  });
  
  riveter( SocketIoClient );
  
  SocketIoClient.inherits(postal.fedx.FederationClient, {
  	getInstance: function( socket, options, instanceId ) {
  		return new SocketIoClient( {
  			target     : socket,
  			options    : options || {},
  			instanceId : instanceId
  		});
  	}
  });
  
  var plugin = postal.fedx.transports[ SOCKET_IO ] = {
  	staged: [],
  	remotes: [],
  	SocketIoClient: SocketIoClient,
  	configure : function ( cfg ) {
  		if ( cfg ) {
  			_config = _.defaults( cfg, _defaults );
  		}
  		return _config;
  	},
  	disconnect: function( options ) {
  		options = options || {};
  		var clients = options.instanceId ?
  			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
  			          _.reduce(_.isArray( options.instanceId ) ? options.instanceId : [ options.instanceId ], _memoRemoteByInstanceId, [], this) :
  			// Ok so we don't have instanceId(s), let's try target(s)
  			          options.target ?
  				          // Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
  			          _.reduce(_.isArray( options.target ) ? options.target : [ options.target ], _memoRemoteByTarget, [], this) :
  				          // aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
  			          this.remotes;
  		if(!options.doNotNotify) {
  			_.each( clients, _disconnectClient, this );
  		}
  		this.remotes = _.without.apply(null, [ this.remotes ].concat(clients));
  	},
  	getTargets : _isServer ?
  	             function() {
  		             return this.staged;
  	             } :
  	             function() {
  		             return _.reduce(io.sockets, function(memo, socket ) {
  			             _.each(socket.namespaces, function(ns) {
  				             memo.push(ns);
  			             });
  			             return memo;
  		             }, []);
  	             },
  	sendMessage : function ( envelope ) {
  		_.each( this.remotes, function ( remote ) {
  			remote.sendMessage( envelope );
  		} );
  	},
  	signalReady : function( targets, callback ) {
  		if(arguments.length === 1) {
  			if(typeof targets === "function") {
  				callback = targets;
  				targets = [];
  			} else {
  				callback = NO_OP;
  			}
  		}
  		targets = _.isArray( targets ) ? targets : [ targets ];
  		targets = targets.length ? targets : this.getTargets();
  		_.each( targets, function( target ){
  			var remote = listenToSocket( target );
  			remote.sendPing( callback );
  		}, this );
  	}
  };
  
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

  return postal;

} ));