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
		this.target.removeAllListeners();
		this.off();
		this.target = undefined;
		plugin.remotes = _.without( plugin.remotes, this );
		return this.messageBundle;
	},

	onMessage : function( packingSlip ) {
		this.handle( "onMessage", packingSlip );
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
					self.send( remote.decommission() );
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