'use strict';

require( 'rootpath' )();

// 載入環境參數
const STAGE     = process.env.SERVERLESS_STAGE;

const utility = require('lib/utility');
const empty   = require('is-empty');
const yaml    = require('yamljs');

const secrets = yaml.load(`secrets.${STAGE}.yml`);

/**
 * Example:
 *
 * require('rootpath')();
 * const siggen = require('lib/signature_generator.js')
 * var certificate_serial = "1002";
 * var cloud_id = "z-xK6BvU6Ha76Mfx0LQzEFA";
 * var mac_address = "005043D1836D";
 * var serial_number = "S150Y29010840";
 * var data = certificate_serial + cloud_id + mac_address + serial_number;
 * var signature = siggen.generate(data);
 */


/**
 * Generate the rsa signature using given params and specified private key.
 *
 * @param  {Object} params           Object with API parameters as its attributes.
 * @param  {String} private_key_name Specify the type of which private key to use.
 * @return {String}                  RSA signature.
 */
// module.exports.generate = ( params, headers, private_key_name ) => {
//   const crypto = require( 'crypto' );
//   const sign = crypto.createSign( 'sha224' );
//   const fs = require( 'fs' );

//   var cloneParams = utility.cloneObject( params );
//   if ( !empty( headers[ 'X-Eco-Timestamp' ] ) ) {
//     var timestamp = headers[ 'X-Eco-Timestamp' ];
//     cloneParams[ 'X-Eco-Timestamp' ] = timestamp;
//   }

//   var keysSorted = Object.keys( cloneParams ).sort().filter( ( element ) => {
//     return element !== 'signature';
//   } );
//   if (process.env.SLS_DEBUG) {
//     console.log( `keysSorted: ${keysSorted}` );
//   }
//   var data = keysSorted.map( ( element ) => {
//     return cloneParams[ element ];
//   } ).join( '' );

//   var private_key = secrets.private_keys[private_key_name];
//   sign.update( data );

//   var signature = new Buffer( sign.sign( private_key ), 'utf-8' ).toString( 'base64' );
//   return signature;
// };

module.exports.generate1 = ( params, headers, private_key_name ) => {
  const crypto = require( 'crypto' );
  const sign = crypto.createSign( 'sha224' );
  // const fs = require( 'fs' );

  var cloneParams = utility.cloneObject( params );
  // if ( !empty( headers[ 'X-Eco-Timestamp' ] ) ) {
  //   var timestamp = headers[ 'X-Eco-Timestamp' ];
  //   cloneParams[ 'X-Eco-Timestamp' ] = timestamp;
  // }

  var keysSorted = Object.keys( cloneParams ).sort();
  if (process.env.SLS_DEBUG) {
    console.log( `keysSorted: ${keysSorted}` );
  }
  var data = keysSorted.map( ( element ) => {
    return cloneParams[ element ];
  } ).join( '' );

  var private_key = secrets.private_keys[private_key_name];
  sign.update( data );

  var signature = new Buffer( sign.sign( private_key ), 'utf-8' ).toString( 'base64' );
  return signature;
};


/**
 * Add new lines to signature every 60 characters.
 *
 * @param {String} str Just normal string.
 */
// function addNewLines( str ) {
//   return str.match( /.{1,60}/g ).join( "\n" );
// }
