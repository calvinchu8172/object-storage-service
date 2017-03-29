'use strict';

require( 'rootpath' )();


// ------------- ENVs -------------
const USERS_LIMIT = process.env.NOTIFICATION_USERS_LIMIT;
const DEVICES_LIMIT = process.env.NOTIFICATION_DEVICES_LIMIT;
const APP_INFO_LIMIT = process.env.APP_INFO_SIZE_LIMIT;
const HISTORY_DAYS_LIMIT = process.env.HISTORY_DAYS_LIMIT;
const PAYLOAD_DEFAULT_SIZE_LIMIT = process.env.PAYLOAD_DEFAULT_SIZE_LIMIT;
const IOS_PAYLOAD_SIZE_LIMIT = process.env.IOS_PAYLOAD_SIZE_LIMIT;
const ANDROID_PAYLOAD_SIZE_LIMIT = process.env.ANDROID_PAYLOAD_SIZE_LIMIT;

// ------------- Modules -------------
const async = require( 'async' );
const empty = require( 'is-empty' );
const moment = require( 'moment' );


// ------------- Lib/Modules -------------
const apiErrors = require( 'lib/api_errors.js' );
const Utility = require( 'lib/utility.js' );

/*
  Example:

  require('rootpath')();
  var paramsValidator = require('lib/api_params_validator.js');

  var response = { code: '0000', message: 'OK' };
  try {
    var validator = new paramsValidator({ signature: 'signature_val', certificate_serial: 'serial' });
    var validate_columns = ['signature', 'certificate_serial'];
    validator.validate(validate_columns);
  } catch (err_response) {
    console.log(err_response);
    response = err_response;
  }
*/

// constructor
function apiParamsValidator( param_hash ) {
  var self = this;
  for ( var key in param_hash ) {
    self[ key ] = param_hash[ key ];
  }
}

apiParamsValidator.prototype.validate = function( param_keys ) {
  console.log( '============== validate ==============' );
  var self = this;
  async.eachSeries( param_keys, ( key, callback ) => {
    if ( empty( self[ key ] ) ) {
      console.log( `api_params_validator.validate -> empty key: ${key}` );
      console.log( apiErrors.missingRequiredParams[ key ] );
      callback( apiErrors.missingRequiredParams[ key ] );
    } else {
      callback();
    }
  }, ( err ) => {
    if ( err ) throw err;
  } );
}

apiParamsValidator.prototype.validateLengthOfUserIds = function() {
  console.log( '============== validateLengthOfUserIds ==============' );
  var self = this;
  if ( empty( self[ 'user_ids' ] ) ) throw apiErrors.missingRequiredParams[ 'user_ids' ];
  var user_ids_length = self[ 'user_ids' ].split( ',' ).length;
  console.log( `user_ids_length: ${user_ids_length}` );
  if ( user_ids_length > USERS_LIMIT ) throw apiErrors.validationFailed.users_limit;
}

apiParamsValidator.prototype.validateLengthOfUdids = function() {
  console.log( '============== validateLengthOfUdids ==============' );
  var self = this;
  if ( empty( self[ 'udids' ] ) ) throw apiErrors.missingRequiredParams[ 'udids' ];
  var udids_length = self[ 'udids' ].split( ',' ).length;
  console.log( `udids_length: ${udids_length}` );
  if ( udids_length > DEVICES_LIMIT ) throw apiErrors.validationFailed.devices_limit;
}


apiParamsValidator.prototype.validateDays = function() {
  console.log( '============== validateDays ==============' );
  var self = this;
  if ( empty( self[ 'days' ] ) ) throw apiErrors.missingRequiredParams[ 'days' ];
  var days = self[ 'days' ];
  if ( days <= 0 ) throw ApiErrors.validationFailed.days;
  if ( days > HISTORY_DAYS_LIMIT ) throw ApiErrors.validationFailed.days_limit;
}

apiParamsValidator.prototype.validateFromToFormat = function() {
  console.log( '============== validateFromToFormat ==============' );

  const pattern = new RegExp( "([12][0-9]{3})(0[1-9]|1[0-2])" ); // 正規表達式 100001 ~ 299912

  if ( this[ 'from' ] ) {
    if ( empty( this[ 'to' ] ) ) {
      throw apiErrors.missingRequiredParams.to;
    } else if ( pattern.test( this[ 'from' ] ) == false || this[ 'from' ].length != 6 ) {
      throw apiErrors.validationFailed.yyyymm_from;
    }
  }

  if ( this[ 'to' ] ) {
    if ( empty( this[ 'from' ] ) ) {
      throw apiErrors.missingRequiredParams.from;
    } else if ( pattern.test( this[ 'to' ] ) == false || this[ 'to' ].length != 6 ) {
      throw apiErrors.validationFailed.yyyymm_to;
    }
  }
}

/**
 * [validateCheckGetDeliveryHistoryFromTo description]
 * @return {[type]} [description]
 */
apiParamsValidator.prototype.validateCheckGetDeliveryHistoryFromTo = function() {
  console.log( '============== validateCheckGetDeliveryHistoryFromTo ==============' );

  var from;
  var to;
  var check_from;
  var check_to;

  try {
    from = moment( this[ 'from' ] ).unix();
    check_from = moment( this[ 'from' ], moment.ISO_8601 ).isValid();
    if ( !check_from ) {
      throw new Error( "Invalid from format" );
    }
  } catch ( err ) {
    // console.log(err);
    throw apiErrors.validationFailed.yyyymm_from;
  }


  try {
    to = moment( this[ 'to' ] ).unix();
    check_to = moment( this[ 'to' ], moment.ISO_8601 ).isValid();
    if ( !check_to ) {
      throw new Error( "Invalid to format" );
    }
  } catch ( err ) {
    // console.log(err);
    throw apiErrors.validationFailed.yyyymm_to;
  }

  console.log( `The interval is ${(to - from)/(24*60*60)} days` );

  if ( to - from < 0 ) {
    throw apiErrors.validationFailed.from_bigger_than_to;
  }

  if ( to - from > HISTORY_DAYS_LIMIT * 24 * 60 * 60 ) {
    throw apiErrors.validationFailed.days_limit;
  }

}


/**
 * [validateTimestamp description]
 * @return {[type]} [description]
 */
apiParamsValidator.prototype.validateTimestamp = function() {
  console.log( '============== validateTimestamp ==============' );
  try {
    var self = this;
    if ( empty( self[ 'timestamp' ] ) ) throw apiErrors.missingRequiredParams[ 'timestamp' ];
    var timestamp = self[ 'timestamp' ];
    var timestamp_now = Utility.getTimestamp();
    if ( timestamp_now - timestamp >= 300 ) throw apiErrors.validationFailed.timestamp;
  } catch ( err ) {
    throw err;
  }
}


/**
 * [validateAppInfo description]
 * @return {[type]} [description]
 */
apiParamsValidator.prototype.validateAppInfo = function() {
  console.log( '============== validateAppInfo ==============' );
  var self = this;
  if ( empty( self[ 'app_info' ] ) ) {
    throw apiErrors.missingRequiredParams[ 'app_info' ];
  } else {
    var app_info = self[ 'app_info' ];
    var bytelength = Buffer.byteLength( app_info, 'utf8' );
    console.log( `app_info: ${self['app_info']}` );
    console.log( `app_info byte: ${bytelength}` );
    console.log( `APP_INFO_LIMIT: ${APP_INFO_LIMIT}` );
    if ( bytelength > parseInt( APP_INFO_LIMIT ) ) {
      console.log( `${bytelength} > ${APP_INFO_LIMIT}` );
      throw apiErrors.validationFailed.app_info_limit;
    }
    var required_keys = [
      'app_version',
      'app_build',
      'sdk_version',
      'sdk_build',
      'timezone',
      'language',
      'os_version',
      'device_model'
    ];
    try {
      if ( typeof app_info == 'string' ) {
        console.log( `typeof app_info == 'string'` );
        app_info = JSON.parse( app_info );
      }
    } catch ( err ) {
      console.log( `validateAppInfo.catch -> ${err}` );
      throw apiErrors.validationFailed.app_info_format;
    }
    required_keys.forEach( function( key, index ) {
      if ( empty( app_info[ key ] ) ) {
        throw apiErrors.validationFailed.app_info( key );
      }
    } );
  }

}


/**
 * [validateCustomParams description]
 * @param  {[type]} custom_validations [description]
 * @return {[type]}                    [description]
 */
apiParamsValidator.prototype.validateCustomParams = function( custom_validations ) {
  console.log( '============== validateCustomParams ==============' );
  var self = this;
  if ( empty( custom_validations ) ) {
    custom_validations = [];
  }
  custom_validations.forEach( function( validationName ) {
    try {
      self[ 'validate' + validationName ]();
    } catch ( err ) {
      if ( err.stack ) {
        console.error( err.stack );
      }
      var err_msg;
      if ( typeof err === 'object' && !empty( err[ 'code' ] ) && !empty( err[ 'message' ] ) ) {
        err_msg = JSON.stringify( err );
      } else {
        err_msg = err;
      }
      console.log( `validateCustomParams.catch -> ${err_msg}` );
      throw err;
    }
  } );
}

/*****************************************************************
 * 名稱：validatePayloadOrTitle
 * 功能：驗證發送推播時的 payload 或 title 是否有擇一帶上來。
 * 流程：
 *   1. 優先找 payload 其次 title。
 *   2. 兩者都無則回傳錯誤訊息。
 *   3. 如果傳的為 payload 時，則至少驗證 default，若有帶 APNS 或 GCM 則再分別驗證格式。
 *   4. 如果有傳 APNS，則至少驗證 aps 與 alert。
 *   5. 如果有傳 GCM，則至少驗證 notification 與 title。
 *   6. 如果有傳 viewer，則驗證 mode 所帶的值是否為內建所提供的三種類型之一。
 * 補充：
 *   1. 基本的 payload 範例：
 *      {"default":"SNS default message","APNS":"{\"aps\":{\"alert\":\"iOS alert\"}}","GCM":"{\"notification\":{\"title\":\"Android title\"}}"}
 *****************************************************************/
apiParamsValidator.prototype.validatePayloadOrTitle = function() {
  console.log( '============== validatePayloadOrTitle ==============' );
  try {
    var self = this;
    console.log( `self[ 'payload' ]: ${self[ 'payload' ]}` );
    if ( !empty( self[ 'payload' ] ) ) { // 優先檢查 Payload
      var snsPayload;
      try {
        snsPayload = JSON.parse( self[ 'payload' ] );
      } catch ( parseErr ) {
        console.error( `parseErr: ${parseErr.stack}` );
        throw apiErrors.validationFailed.payload;
      }
      validateSnsPayload( snsPayload );
    } else if ( empty( self[ 'title' ] ) ) { // 兩者都未帶時，回傳錯誤訊息
      throw apiErrors.missingRequiredParams[ 'payload_or_title' ];
    }
  } catch ( err ) {
    console.log( err.stack );
    throw err;
  }
}

/**
 * [validateSnsPayload description]
 * @param  {[type]} snsPayload [description]
 * @return {[type]}            [description]
 */
function validateSnsPayload( snsPayload ) {
  console.log( "@ validateSnsPayload()" );
  console.log( `snsPayload: ${snsPayload}` );
  console.log( `typeof snsPayload: ${typeof snsPayload} ` );

  if ( typeof snsPayload == 'string' ) {
    snsPayload = JSON.parse( snsPayload );
  }
  if ( snsPayload.default ) {
    console.log( `snsPayload.default: ${snsPayload.default}` );

    /**
     * default 的值應該會是所有推播平台的 payload limit 取最小
     *
     * Example:
     *   GCM pyaload limit: 4096 bytes
     *   APNS payload limit : 4096 bytes
     *   default limit 應該要設為兩者中的最小值 4096 bytes
     */
    var payloadDefaultByteLength = Buffer.byteLength( snsPayload.default, 'utf8' );
    console.log( `payloadDefaultByteLength: ${payloadDefaultByteLength}` );
    console.log( `PAYLOAD_DEFAULT_SIZE_LIMIT: ${PAYLOAD_DEFAULT_SIZE_LIMIT}` );
    if ( payloadDefaultByteLength > parseInt( PAYLOAD_DEFAULT_SIZE_LIMIT ) ) {
      throw apiErrors.validationFailed.payload_default_limit;
    }
  }
  // 必驗 default
  if ( empty( snsPayload.default ) ) {
    throw apiErrors.validationFailed.payload_structure( 'SNS', 'default' );
  }
  // APNS 有帶的話就檢查
  if ( snsPayload.APNS ) {
    try {
      console.log( `snsPayload.APNS: ${snsPayload.APNS}` );
      var iosPayload;
      if ( typeof snsPayload.APNS == 'object' ) {
        iosPayload = snsPayload.APNS;
      } else if ( typeof snsPayload.APNS == 'string' ) {
        try {
          iosPayload = JSON.parse( snsPayload.APNS );
        } catch ( parseErr ) {
          console.error( parseErr.stack );
          throw apiErrors.validationFailed.ios_payload;
        }
      }
      // validate byte length of ios payload
      var iosPayloadByteLength = Buffer.byteLength( JSON.stringify( iosPayload ), 'utf8' );
      console.log( `iosPayloadByteLength: ${iosPayloadByteLength}` );
      console.log( `IOS_PAYLOAD_SIZE_LIMIT: ${IOS_PAYLOAD_SIZE_LIMIT}` );
      if ( iosPayloadByteLength > parseInt( IOS_PAYLOAD_SIZE_LIMIT ) ) {
        throw apiErrors.validationFailed.ios_payload_limit;
      }
      validateIosPayload( iosPayload );
    } catch ( err ) {
      console.log( err.stack );
      throw err;
    }
  }
  // GCM 有帶的話就檢查
  if ( snsPayload.GCM ) {
    try {
      var androidPayload;
      if ( typeof snsPayload.GCM == 'object' ) {
        androidPayload = snsPayload.GCM;
      } else if ( typeof snsPayload.GCM == 'string' ) {
        try {
          androidPayload = JSON.parse( snsPayload.GCM );
        } catch ( parseErr ) {
          console.error( parseErr.stack );
          throw apiErrors.validationFailed.android_payload;
        }
      }
      // validate byte length of android payload
      var androidPayloadByteLength = Buffer.byteLength( JSON.stringify( androidPayload ), 'utf8' );
      console.log( `androidPayloadByteLength: ${androidPayloadByteLength}` );
      console.log( `ANDROID_PAYLOAD_SIZE_LIMIT: ${ANDROID_PAYLOAD_SIZE_LIMIT}` );
      if ( androidPayloadByteLength > parseInt( ANDROID_PAYLOAD_SIZE_LIMIT ) ) {
        throw apiErrors.validationFailed.android_payload_limit;
      }
      validateAndriodPayload( androidPayload );
    } catch ( err ) {
      console.log( err.stack );
      throw err;
    }
  }
}

/**
 * [validateIosPayload description]
 * @param  {[type]} iosPayload [description]
 * @return {[type]}            [description]
 */
function validateIosPayload( iosPayload ) {
  console.log( "@ validateIosPayload()" );
  // aps 與 alert 都要有
  if ( empty( iosPayload.aps ) ) { // aps 一定要有
    throw apiErrors.validationFailed.payload_structure( 'iOS', 'aps' );
  } else if ( empty( iosPayload.aps.alert ) ) { // aps.alert 一定要有
    throw apiErrors.validationFailed.payload_structure( 'iOS', 'alert' );
  } else if ( typeof iosPayload.aps.alert === 'object' && empty( iosPayload.aps.alert.title ) ) {
    throw apiErrors.validationFailed.payload_structure( 'iOS', 'title' );
  } else validateCustomPayload( iosPayload );
}

/**
 * [validateAndriodPayload description]
 * @param  {[type]} androidPayload [description]
 * @return {[type]}                [description]
 */
function validateAndriodPayload( androidPayload ) {
  console.log( "@ validateAndriodPayload()" );
  // notification 與 title 都要有
  if ( empty( androidPayload.notification ) ) {
    throw apiErrors.validationFailed.payload_structure( 'Android', 'notification' );
  } else if ( empty( androidPayload.notification.title ) ) {
    throw apiErrors.validationFailed.payload_structure( 'Android', 'title' );
  } else if ( !empty( androidPayload.data ) ) {
    validateCustomPayload( androidPayload.data );
  }
}


/**
 * [validateCustomPayload description]
 * @param  {[type]} customPayload [description]
 * @return {[type]}               [description]
 */
function validateCustomPayload( customPayload ) {
  console.log( "@ validateCustomPayload()" );
  const viewer = customPayload.viewer;
  // 如果有帶 mode 上來，檢查 value 是否正確
  if ( !empty( viewer ) && !empty( viewer.mode ) && isInvalidMode( viewer.mode ) ) {
    throw apiErrors.validationFailed.payload_value( 'Mode' );
  }
  // 其餘需要驗證的部分，可在此往下擴充驗證。
}


/**
 * [isInvalidMode description]
 * @param  {[type]}  mode [description]
 * @return {Boolean}      [description]
 */
function isInvalidMode( mode ) {
  return [ 'OpenInternal', 'OpenExternal', 'ViewText' ].indexOf( mode ) === -1;
}

apiParamsValidator.prototype.validateMessagePayload = function() {
  var self = this;
  try {
    if ( !empty( self[ 'payload' ] ) ) {
      validateSnsPayload( this[ 'payload' ] );
    }
  } catch ( err ) {
    throw err;
  }
}

function validateAps( payload ) {
  if ( empty( payload[ 'aps' ] ) ) {
    return false;
  } else {
    var payload_alert = payload[ 'aps' ][ 'alert' ];
    if ( empty( payload_alert ) ) {
      return false;
    } else { // not empty payload alert
      if ( typeof payload_alert === 'object' ) { // alert: { title: "message title", body: "message body" }
        if ( empty( payload_alert[ 'title' ] ) || empty( payload_alert[ 'body' ] ) ) {
          return false;
        } else { // aps 內容驗證完成
          return true;
        }
      } else if ( typeof payload_alert === 'string' ) { // alert: "just message"
        return true;
      } else {
        return false;
      }
    }
  }
}


// 如果有傳入 viewer 的情況下: ESUN 新版 App
function validateViewer( payload ) {
  if ( empty( payload[ 'viewer' ] ) ) {
    return false;
  } else {
    if ( empty( payload[ 'viewer' ][ 'mode' ] ) ) {
      return false;
    } else {
      var viewer_mode = payload[ 'viewer' ][ 'mode' ];
      var viewer_url = payload[ 'viewer' ][ 'url' ];
      if ( viewer_mode == 'ViewText' ) {
        // ViewText 下 viewer url 可以為空字串
        // url 會由 server 寫入
        if ( viewer_url == "" ) {
          return true;
        } else {
          return false;
        }
      } else if ( [ 'OpenInternal', 'OpenExternal' ].indexOf( viewer_mode ) > -1 ) {
        if ( empty( viewer_url ) ) {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    }
  }
}

// 如果有傳入 viewer 的情況下: ESUN 新版 App
function validateCommand( payload ) {
  console.log( `payload: ${JSON.stringify(payload, null, 2)}` );
  console.log( `payload.command: ${JSON.stringify(payload['command'], null, 2)}` );
  var paramsRequiredActions = [
    'ViewPrivateMessage'
  ];

  var actionsParamsMapping = {
    ViewPrivateMessage: [ 'id', 'type' ]
  }

  var isParamsRequiredAction = function( command_action ) {
    return paramsRequiredActions.indexOf( command_action ) > -1;
  }

  var getRequiredCommandParams = function( command_action ) {
    return actionsParamsMapping[ command_action ];
  }

  var checkRequiredCommandParams = function( command_action, command_params ) {
    return !empty( command_params );

    var result = true;
    getRequiredCommandParams( command_action ).forEach( function( paramName, index ) {
      if ( empty( command_params[ paramName ] ) ) {
        result = false;
      }
    } );
    return result;
  }

  var command_action = payload[ 'command' ][ 'action' ];
  var command_params = payload[ 'command' ][ 'params' ];

  return !empty( payload[ 'command' ] ) // command is required
    && !empty( command_action ) // command_action is required
    && ( isParamsRequiredAction( command_action ) ? checkRequiredCommandParams( command_action, command_params ) : true ); // if command_action is params required
}


module.exports = apiParamsValidator;
