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

  //import("socketio.js");

  return postal;

} ));