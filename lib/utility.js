'use strict';

require( 'rootpath' )();


function Utility() {}

var getTimestamp = function() {
  return Math.floor( Date.now() / 1000 );
}


var cloneObject = function( obj ) {
  return ( JSON.parse( JSON.stringify( obj ) ) );
}

Utility.getTimestamp = getTimestamp;
Utility.cloneObject = cloneObject;
module.exports = Utility;