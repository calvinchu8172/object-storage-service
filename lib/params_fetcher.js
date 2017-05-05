'use strict';


// Example:
//
// var params = paramsFetcher.fetchFrom(event);

require( 'rootpath' )();
const keyDel = require( 'key-del' );
const sigGen = require( 'lib/signature_generator.js' );
const utility = require( 'lib/utility.js' );
const stage = process.env.SERVERLESS_STAGE;
const uuidV4 = require('uuid/v4');

module.exports.fetchFrom = ( event ) => {
  console.log( `event: ${JSON.stringify(event, null, 2)}` );
  console.log( `stage: ${stage}` );

  // fake job_id for local
  if ( [ 'debug', 'dev' ].indexOf( stage ) >= 0 ) {
    event.request_id = uuidV4();
    console.log( `params_fetcher create fake request_id: ${event.request_id}` );
  }

  /**
   * stage "debug" for using "serverless-offline" plugin
   * stage "dev" for using "serverless invoke local" command
   */
  if ( [ 'debug', 'dev' ].indexOf( stage ) >= 0 ) {
    let params = {};
    if ( stage == 'debug' ) params = keyDel( event, [ 'stageVariables', 'isOffline' ] );
    if ( event.method === 'GET' || 'DELETE' ) {
      // set all params in path to event.query
      for ( var path_param_key in event.path ) {
        event.query[ path_param_key ] = event.path[ path_param_key ]
      }
      params = event.query;
    } else {
      if ( stage == 'dev' ) params = event.body;
    }
    // params.timestamp = utility.getTimestamp();
    var timestamp = utility.getTimestamp();
    event.headers['X-Eco-Timestamp'] = timestamp;

    /**
     * private_key 檔案如果用以下方式命名：
     * 1. private_key_server
     * 2. private_key_android
     * 3. private_key_ios
     * 這樣假設在參數傳 event.cert_type 可以指定用哪把 private key 產生 signature
     */
    var signature = sigGen.generate( params, event.headers, params.cert_type );
    // params.signature = signature;
    event.headers['X-Eco-Signature'] = signature;
    console.log( `params: ${JSON.stringify(params, null, 2)}` );
    return params;

  } else { // alpha, beta, prod
    if ( event.method === 'GET' || 'DELETE' ) {
      // 把 path 的 params 加到 query
      for ( var path_param_key in event.path ) {
        //
        let decoded = decodeURI(event.path[ path_param_key ]);
        const regexp = /^{.*}$/;
        let matched = decoded.match(regexp);
        if(!matched) {
          event.query[ path_param_key ] = event.path[ path_param_key ];
        }
      }
      console.log( `params: ${JSON.stringify(event.query, null, 2)}` );
      return event.query;
    } else {
      console.log( `params: ${JSON.stringify(event.body, null, 2)}` );
      return event.body;
    }
  }
}
