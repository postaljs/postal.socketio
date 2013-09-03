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