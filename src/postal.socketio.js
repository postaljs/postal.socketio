(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = function(_, io, postal) {
      return factory( _, io, postal);
    }
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( ["underscore", "socket.io", "postal.federation"], function ( _, io, postal ) {
      return factory( _, io, postal, root );
    } );
  } else {
    // Browser globals
    root.postal = factory( root._, root.io, root.postal, root );
  }
}( this, function ( _, io, postal, global, undefined ) {

  //import("socketio.js");

  return postal;

} ));