'use strict';

require( 'rootpath' )();


// ------------- ENVs -------------
const SERVICE                    = process.env.SERVERLESS_PROJECT;
const REGION                     = process.env.SERVERLESS_REGION;
const STAGE                      = process.env.SERVERLESS_STAGE;
const PAYLOAD_DEFAULT_SIZE_LIMIT = process.env.PAYLOAD_DEFAULT_SIZE_LIMIT;
const IOS_PAYLOAD_SIZE_LIMIT     = process.env.IOS_PAYLOAD_SIZE_LIMIT;
const ANDROID_PAYLOAD_SIZE_LIMIT = process.env.ANDROID_PAYLOAD_SIZE_LIMIT;

// ------------- Modules -------------
const empty = require( 'is-empty' );
const async = require( 'async' );
const crypto = require('crypto');
const fs = require( 'fs' );
const moment = require( 'moment' );
const uuid   = require('node-uuid');
const Underscore = require( "underscore.string" );
const mysql = require('mysql');
const request = require('request');

// ------------- Lib/Modules -------------
const DynamoOp = require( 'lib/dynamodb_operator.js' );
const SigVerifier = require( 'lib/signature_verifier.js' );
const Definitions = require( 'lib/definitions.js' );
const ParamsValidator = require( 'lib/api_params_validator.js' );
const ApiErrors = require( 'lib/api_errors.js' );
const Utility = require( 'lib/utility.js' );

// ------------- AWS -------------
const AWS = require( 'aws-sdk' );
const S3 = new AWS.S3( {
  region: REGION
} );
const SQS = new AWS.SQS( {
  region: REGION
} );
const docClient = new AWS.DynamoDB.DocumentClient({
  region: REGION
});
const sns = new AWS.SNS( {
  region: REGION
} );

function CommonSteps() {}


/**
 * [verifyTimestamp description]
 * @param  {[type]}   timestamp [description]
 * @param  {Function} callback  [description]
 * @return {[type]}             [description]
 */
var verifyTimestamp = function( timestamp, callback ) {
  console.log( '============== verifyTimestamp ==============' );
  try {
    console.log( `timestamp: ${timestamp}` );
    if ( empty( timestamp ) ) {
      console.log(`empty timestamp...`);
      return callback( ApiErrors.missingRequiredParams[ 'timestamp' ] );
    }
    var timestamp_now = Utility.getTimestamp();
    if ( timestamp_now - timestamp >= 300 ) {
      console.log(`timestamp expired...`);
      return callback( ApiErrors.validationFailed.timestamp );
    }
    return callback(null, 'success');
  } catch ( err ) {
    console.error( err.stack );
    return callback( ApiErrors.exceptionalErrorHappened );
  }
}


/**
 * @name   verifySignature
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var verifySignature = function( client, params, headers, callback ) {
  console.log( '============== verifySignature ==============' );

  var signature = headers[ 'X-Eco-Signature' ];

  if ( empty( params.access_key_id ) ) {
    return callback( ApiErrors.missingRequiredParams.access_key_id );
  }
  if ( empty( signature ) ) {
    return callback( ApiErrors.missingRequiredParams.signature );
  }
  var cbData = {
    client: client
  };
  async.waterfall( [
      function( callback ) {
        queryCertificate( params, cbData, callback );
      }
    ],
    function( err, result ) {
      if ( err ) return callback( err );

      let certificateDataItem = result[ 'certificateDataItem' ];

      console.log( `certificateDataItem: ${JSON.stringify(certificateDataItem, null, 2)}` );
      result[ 'appId' ] = certificateDataItem.app_id;
      result[ 'realmId' ] = certificateDataItem.realm_id;
      result[ 'applicationArn' ] = certificateDataItem.application_arn;
      result[ 'appPlatform' ] = certificateDataItem.platform;
      result[ 'appTopicArn' ] = certificateDataItem.app_topic_arn;
      result[ 'realmTopicArn' ] = certificateDataItem.realm_topic_arn;

      let accessKeyType = certificateDataItem.type;
      console.log( `client: ${client}, accessKeyType: ${accessKeyType}` );
      if ( client !== accessKeyType ) return callback( ApiErrors.validationFailed.access_key_type );
      if ( certificateDataItem.status === 'revoked' ) return callback( ApiErrors.validationFailed.access_key_revoked );
      if ( certificateDataItem.status === 'inactive' ) return callback( ApiErrors.validationFailed.access_key_inactive );
      if ( SigVerifier.verify( params, headers, certificateDataItem ) ) return callback( null, result );

      callback( ApiErrors.validationFailed.signature );
    } );
}


/**
 * @name   queryCertificate
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
function queryCertificate( params, cbData, callback ) {
  console.log( '============== queryCertificate ==============' );
  var payload = {
    TableName: `${SERVICE}-${STAGE}-access-keys`,
    Key: {
      access_key_id: params.access_key_id
    },
    ConsistentRead: true,
    ReturnConsumedCapacity: 'TOTAL'
  }

  DynamoOp.execute( 'read', payload, function( err, certificateData ) {
    // error happened when reading certificate
    console.error( JSON.stringify( err ) );
    if ( err ) return callback( ApiErrors.exceptionalErrorHappened );

    // certifcate not found
    if ( empty( certificateData.Item ) ) return callback( ApiErrors.notFound.access_key );

    cbData[ 'capacityUnits' ] = parseInt( certificateData.ConsumedCapacity.CapacityUnits );
    // s3 路徑由 app_name 改為使用 app_id

    cbData[ 'certificateDataItem' ] = certificateData.Item;
    return callback( null, cbData );
  } );
}

/**
 * @name   validateParams
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var validateParams = function( params, validate_columns, custom_validations, callback ) {
  console.log( '============== validateParams ==============' );
  try {
    var validator = new ParamsValidator( params );
    validator.validate( validate_columns );
    validator.validateCustomParams( custom_validations );
    return callback();
  } catch ( err ) {
    console.error( err );
    return callback( err );
  }
}


/**
 * @name   readFileContent
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var readFileContent = function( tmp_file_path, callback ) {
  console.log( '============== readFileContent ==============' );
  fs.readFile( tmp_file_path, function read( err, data ) {
    if ( err ) return callback( err );
    callback( null, data );
  } );
}


/**
 * @name   downloadFileFromS3
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var downloadFileFromS3 = function( s3_bucket_name, s3_key, tmp_file_path, callback ) {
  console.log( '============== downloadFileFromS3 ==============' );
  var params = {
    Bucket: s3_bucket_name,
    Key: s3_key
  };
  var file = fs.createWriteStream( tmp_file_path );

  file.on( 'close', function() {
    callback( null, `fs closed` );
  } );

  file.on( 'error', function( err ) {
    callback( err );
  } );

  S3.getObject( params ).createReadStream().pipe( file );
}


/**
 * @name   createJob
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var createJob = function( jobData, callback ) {
  console.log( '============== createJob ==============' );
  var timestamp_now = Utility.getTimestamp();
  console.log( `jobData: ${JSON.stringify(jobData)}` );

  var expression = 'SET #state = if_not_exists(#state, :state), ' +
    '#type = if_not_exists(#type, :type), ' +
    '#created_at = if_not_exists(#created_at, :created_at), ' +
    '#updated_at = if_not_exists(#updated_at, :updated_at), ' +
    '#total = if_not_exists(#total, :total), ' +
    '#success = if_not_exists(#success, :success), ' +
    '#failure = if_not_exists(#failure, :failure)';

  var expressionAttributeNames = {
    '#state': 'state',
    '#type': 'type',
    '#total': 'total',
    '#created_at': 'created_at',
    '#updated_at': 'updated_at',
    '#success': 'success',
    '#failure': 'failure'
  };

  var expressionAttributeValues = {
    ':total': 0,
    ':success': 0,
    ':failure': 0,
    ':state': jobData[ 'state' ],
    ':type': jobData[ 'type' ],
    ':created_at': timestamp_now,
    ':updated_at': timestamp_now
  };

  if ( !empty( jobData[ 'description' ] ) ) {
    expression += ', #description = if_not_exists(#description, :description)';
    expressionAttributeNames[ '#description' ] = 'description';
    expressionAttributeValues[ ':description' ] = jobData[ 'description' ];
  }

  var payload = {
    TableName: `${SERVICE}-${STAGE}-jobs`,
    Key: {
      job_id: jobData[ 'job_id' ]
    },
    UpdateExpression: expression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnConsumedCapacity: 'TOTAL'
  };
  DynamoOp.execute( 'update', payload, function( err, data ) {
    if ( err ) {
      console.error( `Error: CommonSteps.createJob() -> payload: ${JSON.stringify( payload )} -> detail: ${JSON.stringify( err )}` );
      return callback( err );
    }
    console.log( data );
    var capacityUnits = parseInt( data.ConsumedCapacity.CapacityUnits );
    callback( null, capacityUnits );
  } );

}


/**
 * @name   updateJob
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var updateJob = function( jobData, callback ) {
  console.log( '============== updateJob ==============' );
  var timestamp_now = Utility.getTimestamp();
  console.log( `jobData: ${JSON.stringify(jobData)}` );

  var expression = 'SET #state = :state, ' +
    '#updated_at = :updated_at ' +
    'ADD #total_ids :total_ids, #total :total, #success :success, #failure :failure';
  var payload = {
    TableName: `${SERVICE}-${STAGE}-jobs`,
    Key: {
      job_id: jobData[ 'job_id' ]
    },
    UpdateExpression: expression,
    ExpressionAttributeNames: {
      '#state': 'state',
      '#updated_at': 'updated_at',
      '#total_ids': 'total_ids',
      '#total': 'total',
      '#success': 'success',
      '#failure': 'failure'
    },
    ExpressionAttributeValues: {
      ':total': jobData[ 'total' ],
      ':total_ids': jobData[ 'total_ids' ],
      ':success': jobData[ 'success' ],
      ':failure': jobData[ 'failure' ],
      ':state': jobData[ 'state' ],
      ':updated_at': timestamp_now
    },
    ReturnConsumedCapacity: 'TOTAL'
  }
  DynamoOp.execute( 'update', payload, function( err, data ) {
    if ( err ) return callback( ApiErrors.exceptionalErrorHappened );
    console.log( data );
    var capacityUnits = parseInt( data.ConsumedCapacity.CapacityUnits );
    callback( null, capacityUnits );
  } );

}


/**
 * @name   determineInboxInterval
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
var determineInboxInterval = function( from, to, month_limit, callback ) {
  var start, end, diff;
  var mm;
  var array = [];

  // 若 from 與 to 都沒有帶， callback 回這個月的
  if ( !to && !from ) {
    var date = new Date();
    var formattedDate = moment( date ).format( 'YYYYMM' );
    array.push( formattedDate );
    return callback( null, array );
  }
  // to 不可以比 from 小
  // 假如區間在 month_limit 個月內，callback 回 from 到 to 的月份，若區間超過 month_limit，就回這個月的
  if ( from > to ) {
    callback( ApiErrors.validationFailed.from_bigger_than_to, null );
  } else {
    start = Underscore.insert( from, 4, "-" )
    console.log('Debug by Arisu, start = ', start);
    end = Underscore.insert( to, 4, "-" )
    console.log('Debug by Arisu, start = ', end);
    start = moment( start );
    console.log('Debug by Arisu, moment( start ) = ', start);
    end = moment( end );
    console.log('Debug by Arisu, moment( end ) = ', end);
    diff = end.diff( start, 'months' ) + 1;
    console.log('Debug by Arisu, diff = ', diff);

    // 決定要取幾個月份的資料
    let months = diff > parseInt( month_limit ) ? month_limit : diff;
    console.log('months = ', months);

    for ( var i = 0; i < months; i++ ) { // 這邊決定要從 from 開始取幾個月的
      // 從 to 往前推最多 3 個月
      // moment( start ).add( i, 'months' ).format( "YYYYMM" );
      mm = moment( end ).subtract( i, 'months' ).format( "YYYYMM" );
      array.push( mm );
    }
    console.log(array);
    callback( null, array );
  }
}

/*****************************************************************
* 名稱：checkHeaders
* 功能：檢查 headers 中的 signature 與 timestamp 是否都有傳遞進來。
* 參數說明：
*   1. headers: 實際 headers 傳遞進來的參數。
* 流程：
*   1. 檢查 X-Eco-Signature 是否存在，不存在則回傳錯誤訊息。
*   2. 檢查 X-Eco-Timestamp 是否存在，不存在則回傳錯誤訊息。
*   3. 最後將字串型態的 X-Eco-Timestamp 的值轉為整數形態回傳。
*****************************************************************/

var checkHeaders = function(headers, callback) {
  console.log( '============== checkHeaders ==============' );

  let signature = headers['X-Eco-Signature'];
  let timestamp = headers['X-Eco-Timestamp'];

  if (empty(signature)) return callback(ApiErrors.missingRequiredParams.signature);
  else if (empty(timestamp)) return callback(ApiErrors.missingRequiredParams.timestamp);
  else {
    let clientTimestamp = parseInt(timestamp);
    let data = { signature, clientTimestamp };
    return callback(null, data);
  }
}

var checkHeadersSignature = function(headers, callback) {
  console.log( '============== checkHeadersSignature ==============' );
  console.log(headers['X-Signature']);

  let signature;

  if (headers['X-Signature']) {
    console.log('X-Signature: ' + headers['X-Signature']);
    signature = headers['X-Signature'];
  } else {
    console.log('x-signature: ' + headers['x-signature']);
    signature = headers['x-signature'];
  }

  if (empty(signature)) return callback(ApiErrors.missingRequiredParams.signature);
  // else if (empty(timestamp)) return callback(ApiErrors.missingRequiredParams.timestamp);
  else {
    // let clientTimestamp = parseInt(timestamp);
    // let data = { signature, clientTimestamp };
    return callback(null, signature);
  }
}

var verifyHeadersSignatureAsPromised = function(params, headers, public_key) {
  console.log( '============== verifyHeadersSignatureAsPromised ==============' );

  return new Promise((resolve, reject) => {

    let signature;

    if (headers['X-Signature']) {
      console.log('X-Signature: ' + headers['X-Signature']);
      signature = headers['X-Signature'];
    } else {
      console.log('x-signature: ' + headers['x-signature']);
      signature = headers['x-signature'];
    }

    var cloneParams = Utility.cloneObject(params);

    const verify = crypto.createVerify('SHA224');
    let keysSorted = Object.keys(cloneParams).sort().filter((element) => element !== 'signature');
    let data = keysSorted.map((element) => cloneParams[element]).join('');

    verify.update(data);

    if (verify.verify(public_key, signature, 'base64')) {
      resolve(signature);
    } else {
      reject(ApiErrors.validationFailed.signature);
    }

  });
}

var checkCertificateSerial = function(certificate_serial, callback) {
  console.log( '============== checkCertificateSerial ==============' );

  console.log(certificate_serial);
  console.log(empty(certificate_serial));
  if (empty(certificate_serial)) return callback(ApiErrors.missingRequiredParams.certificate_serial);
  else {
    return callback(null, certificate_serial);
  }

}

var queryCertificateSerial = function(certificate_serial, callback) {
  console.log( '============== queryCertificateSerial ==============' );

  var public_key;
  var host = 'pcloud-alpha-web-db.cobs8nowvie6.us-east-1.rds.amazonaws.com';
  var user = 'webadmin';
  var password = 'AdminVVe6';
  var database = 'personal_cloud_production';

  var queryString = 'SELECT * FROM certificates WHERE serial = ? LIMIT 1'


  var connection = mysql.createConnection({
    host: host,
    user: user,
    password: password,
    database: database
  });

  connection.connect();

  connection.query(queryString, [certificate_serial], function (error, results, fields) {
    if (error) {
      console.log(error);
      return callback(error);
    }
    else if (empty(results)) return callback(ApiErrors.validationFailed.certificate_serial );
    else {
      // console.log('The solution is: ', results[0].serial);
      // certificate_serial = results[0].serial;
      public_key = results[0].content;
      return callback(null, public_key);
    }
  });

  connection.end();
}

var verifyAccessToken = function(access_token, callback) {
  console.log( '============== verifyAccessToken ==============' );

  console.log(access_token);

  var url = 'https://mycloud-sso-alpha.zyxel.ecoworkinc.com/api/v1/my/info'
  var body_hash;
  var cloud_id;
  var app_id;

  // access_token = 'aaa'

  request({
    url: url, //URL to hit
    method: 'GET',
    qs: {
        access_token: access_token,
        uuid: 'uuid'
      }
    }, function(error, response, body){
      if(error) {
        var message = 'Error occurred when sending request to API Server: ' + error;
        console.log(message);
        return callback(message, null);
      } else {
        if(response.statusCode == 200) {
          console.log('Requesting url: ' + url);
          console.log('Response status code: ' + response.statusCode);
          // console.log(response);
          // console.log(body);
          body_hash = JSON.parse(body);
          cloud_id = body_hash.id;
          app_id = body_hash.app_id;
          console.log('cloud_id: ' + cloud_id);
          console.log('app_id: ' + app_id);
          let cloud_id_and_app_id = {
            cloud_id, app_id
          };
          return callback(null, cloud_id_and_app_id);
        } else {
          console.log(response.statusCode.toString());
          // return callback(response.statusCode.toString(), null);
          return callback(ApiErrors.validationFailed.access_token);
        }
      }
    });

}

var writeAccessLog = function(event, receivedParams, cloud_id_and_app_id, callback) {
  console.log( '============== writeAccessLog ==============' );

  var timestamp_now = Utility.getTimestamp();

  try {
    let log = {
      request_id: event.request_id,
      resource_path: event.resource_path,
      http_method: event.method,
      cloud_id: cloud_id_and_app_id.cloud_id,
      app_id: cloud_id_and_app_id.app_id,
      domain_id: cloud_id_and_app_id.cloud_id + "-" + cloud_id_and_app_id.app_id,
      domain_name: receivedParams.name,
      object_id: null,
      object_key: null,
      time: timestamp_now,
      source_ip: event.source_ip
    }
    console.log(log);
    // return callback(null, data.cloud_id + "-" + data.app_id);
    return callback(null, cloud_id_and_app_id);
  } catch (err) {
    return callback(err);
  }
}

var countDomains = function(cloud_id_and_app_id, domains_limit, callback) {
  console.log( '============== countDomains ==============' );
  let hash_key = cloud_id_and_app_id.cloud_id + "-" + cloud_id_and_app_id.app_id

  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    KeyConditionExpression: '#p_key = :hkey',
    ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
    ExpressionAttributeValues: {
      ':hkey': hash_key
    },
    Select: 'COUNT'
  };

  docClient.query(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    else {
      console.log(data);
      if (data.Count >= domains_limit) {
        return callback(ApiErrors.validationFailed.over_domain_limit);
      } else {
        return callback(null, cloud_id_and_app_id); // successful response
      }
    }
  });

}

var createDomainItem = function(cloud_id_and_app_id, event, params, callback) {
  console.log( '============== createDomainItem ==============' );
  let hash_key = cloud_id_and_app_id.cloud_id + "-" + cloud_id_and_app_id.app_id
  // console.log(event);
  // console.log(params);

  var params = {
    TableName : `${STAGE}-${SERVICE}-domains`,
    Item: {
        'cloud_id-app_id': hash_key,
        'name': params.domain,
        'id': uuid.v4(),
        'app_id': cloud_id_and_app_id.app_id,
        'json_usage': 0,
        'file_usage': 0,
        'created_by': event.source_ip,
        'created_at': Utility.getTimestamp(),
        'updated_by': event.source_ip,
        'updated_at': Utility.getTimestamp()
    },
    ConditionExpression: 'attribute_not_exists(#p_key)',
    ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
    ReturnConsumedCapacity: 'TOTAL'
  };
  docClient.put(params, function(err, data) {
    if (err) {
      // console.log("err");
      console.log(err);
      // console.log(err.code);
      if (err.code == 'ConditionalCheckFailedException') {
        return callback(ApiErrors.validationFailed.domain_already_exists);
      } else {
        return callback(err);
      }
    }
    else {
      console.log(data);
      return callback(null);
    }
  });

}


/*****************************************************************
* 名稱：checkRequiredParams
* 功能：檢查 API 的必要參數是否都有傳遞進來。
* 參數說明：
*   1. receivedParams: 實際傳遞進來的參數。
*   2. requiredParams:  此 API 必要的參數有哪些，以陣列方式表示。
* 流程：
*   1. 驗必要參數。
*****************************************************************/

var checkRequiredParams = function(receivedParams, requiredParams, callback) {
  console.log( '============== checkRequiredParams ==============' );

  const validator = new ParamsValidator(receivedParams);

  try {
    validator.validate(requiredParams);
    // if (receivedParams.domain) validator.validateDomains();
    if (receivedParams.user_ids) validator.validateLengthOfUserIds();
    if (receivedParams.udids) validator.validateLengthOfUdids();
    return callback(null);
  } catch (err) {
    return callback(err);
  }
}

/*****************************************************************
* 名稱：checkAccessKey
* 功能：取得金鑰並檢查該金鑰是否有權限可以執行。
* 參數說明：
*   1. access_key_id: 金鑰的 ID。
*   2. allowedAccessKeyTypes: 可允許操作此 API 的 Access Key Type。
* 流程：
*   1. 透過 DynamoDB get API 以 access_key_id 為 hash key 至 access_keys 表中取得 item。
*   2. 如果找不到 key 則回傳錯誤訊息。
*   3. 如果 key 的 status 為 revoke，則結束該次請求。
*   4. 驗證成功，回傳 key。
*****************************************************************/

var checkAccessKey = function(access_key_id, allowedAccessKeyTypes, callback) {
  console.log( '============== checkAccessKey ==============' );

  const docClientParams = {
    TableName: `${SERVICE}-${STAGE}-access-keys`,
    Key: { access_key_id },
    ReturnConsumedCapacity: 'TOTAL'
  };

  docClient.get(docClientParams, (err, data) => {
    const accessKey = data.Item;
    console.log('accessKey = ', JSON.stringify(accessKey, null, 2));
    if (err) {
      return callback(err);
    } else if (empty(accessKey)) {
      return callback(ApiErrors.notFound.access_key);
    } else if (accessKey.status.toLowerCase() !== 'active') {
      if (accessKey.status.toLowerCase() === 'inactive') {
        return callback(ApiErrors.validationFailed.access_key_inactive);
      } else if (accessKey.status.toLowerCase() === 'revoked') {
        return callback(ApiErrors.validationFailed.access_key_revoked);
      }
    } else if (allowedAccessKeyTypes.indexOf(accessKey.type.toLowerCase()) === -1) {
      return callback(ApiErrors.validationFailed.access_key_type);
    } else {
      // console.log('ConsumedCapacity: ', data.ConsumedCapacity);
      return callback(null, accessKey);
    }
  });
}

/*****************************************************************
* 名稱：verifySignatureAsPromised
* 功能：驗證簽證驗證碼的正確性。
* 參數說明：
*   1. params: 實際傳遞進來的參數。
*   2. headers: 實際 headers 傳遞進來的參數。
*   3. accessKey: 金鑰資訊。
* 流程：
*   1. 將 param value 依據 param name 的開頭第一個字母升冪排序串接組成 data
*      (當兩個參數的第一個字母相同時，則比對第二個，以此類推...)。
*   2. 以 nodejs 內建驗證 RSA 的機制檢驗 Signature 的正確性。
*   3. 驗證成功後回傳 access key。
*****************************************************************/

var verifySignatureAsPromised = function(params, headers, accessKey) {
  console.log( '============== verifySignatureAsPromised ==============' );

  return new Promise((resolve, reject) => {

    const signature = headers['X-Eco-Signature'];
    const timestamp = headers['X-Eco-Timestamp'];
    var cloneParams = Utility.cloneObject(params);
    cloneParams['X-Eco-Timestamp'] = timestamp;

    const verify = crypto.createVerify('SHA224');
    let keysSorted = Object.keys(cloneParams).sort().filter((element) => element !== 'signature');
    let data = keysSorted.map((element) => cloneParams[element]).join('');

    verify.update(data);

    if (verify.verify(accessKey.public_key, signature, 'base64')) {
      resolve(accessKey);
    } else {
      reject(ApiErrors.validationFailed.signature);
    }

  });
}

var verifyMeta = function(meta, callback) {
  console.log( '============== verifyMeta ==============' );

  if (!empty(meta)) {
    let parsedMeta;

    try {
      parsedMeta = JSON.parse(meta);
    } catch (err) {
      return callback(ApiErrors.validationFailed.meta_format);
    }

    if (typeof parsedMeta !== 'object') {
      return callback(ApiErrors.validationFailed.meta_format);
    } else {
      return callback(null, parsedMeta);
    }
  } else {
    return callback(null);
  }
}

var verifyDeepLinkURI = function(deepLinkURI, realmId, callback) {
  console.log( '============== verifyDeepLinkURI ==============' );

  let parsedDeepLinkURI;

  try {
    parsedDeepLinkURI = JSON.parse(deepLinkURI);
  } catch (err) {
    return callback(ApiErrors.validationFailed.uri_format);
  }

  if (typeof parsedDeepLinkURI !== 'object') {
    return callback(ApiErrors.validationFailed.uri_format);
  } else if (empty(parsedDeepLinkURI)) {
    // => {}
    return callback(ApiErrors.notFound.default_key);
  } else if (empty(parsedDeepLinkURI.default)) {
    // => { default: '' }
    return callback(ApiErrors.validationFailed.default_value_is_empty);
  } else if (Object.keys(parsedDeepLinkURI).length > 1) {
    // => { default: '...', app_id_1: '...' }
    let providedAppIds = Object.keys(parsedDeepLinkURI).filter(e => e !== 'default');
    console.log('providedAppIds: ', providedAppIds);

    const params = {
      TableName : `${SERVICE}-${STAGE}-access-keys`,
      ConditionalOperator: 'AND',
      ScanFilter: {
        realm_id: {
          ComparisonOperator: 'EQ', /* required */
          AttributeValueList: [ realmId ]
        },
        type: {
          ComparisonOperator: 'EQ', /* required */
          AttributeValueList: [ 'app' ]
        }
      }
    };

    docClient.scan(params, function(err, data) {
      if (err) {
        console.log(err);
        return callback(ApiErrors.exceptionalErrorHappened);
      } else {
        console.log('Scanned Result: ', JSON.stringify(data));

        let appIds = data.Items.map(accessKey => accessKey.app_id);
        console.log('appIds: ', appIds);

        let filtered = providedAppIds.filter(e => appIds.indexOf(e) == -1);
        console.log('filtered: ', filtered);

        if (filtered.length) {
          return callback(ApiErrors.validationFailed.app_does_not_belong_to_realm);
        } else {
          return callback(null, parsedDeepLinkURI);
        }
      } // else

    }); // scan
  } else return callback(null, parsedDeepLinkURI);
}

var generatePayload = function (inbox_msg, job_id, callback) {
  console.log( '============== generatePayload ==============' );

  let payload = {};

  const APNS = {
    aps: {
      alert: {}
    },
    job_id
  };

  const GCM = {
    notification: {},
    data: {
      job_id
    }
  };

  // write title
  payload.default = inbox_msg.notification_title || inbox_msg.title;
  APNS.aps.alert.title = inbox_msg.notification_title || inbox_msg.title;
  GCM.notification.title = inbox_msg.notification_title || inbox_msg.title;

  if (inbox_msg.type === 'plain_text') {
    APNS.aps.alert.body = inbox_msg.notification_body || inbox_msg.body;
    GCM.notification.body = inbox_msg.notification_body || inbox_msg.body;
  }

  if (inbox_msg.type === 'web_url' || inbox_msg.type === 'deep_link') {
    APNS.uri = inbox_msg.uri;
    GCM.data.uri = inbox_msg.uri;
  }

  if (inbox_msg.meta) {
    APNS.meta = inbox_msg.meta;
    GCM.data.meta = inbox_msg.meta;
  }

  console.log('Debug APNS: ', JSON.stringify(APNS, null, 2));
  console.log('Debug GCM: ', JSON.stringify(GCM, null, 2));

  payload.APNS = JSON.stringify(APNS);
  payload.APNS_SANDBOX = payload.APNS;
  payload.GCM = JSON.stringify(GCM);

  let snsPayload = JSON.stringify(payload);
  console.log('snsPayload = ', snsPayload);
  return callback(null, snsPayload);
}

var publishToTopic = function(payload, topicArn, callback) {
  console.log( '============== publishToTopic ==============' );

  const params = {
    Message: payload, /* required */
    MessageStructure: 'json',
    TopicArn: topicArn
  };

  sns.publish(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data);
  });
}

var publishToUser = function(payload, targetArn, callback) {
  console.log( '============== publishToUser ==============' );

  const params = {
    Message: payload, /* required */
    MessageStructure: 'json',
    TargetArn: targetArn
  };

  sns.publish(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data); // successful response
  });
}

var queryDeviceByUserId = function (user_id, callback) {
  console.log( `============== queryDeviceByUserId: ${user_id} ==============` );

  const params = {
    TableName: `${SERVICE}-${STAGE}-devices`,
    IndexName: 'user_id-udid-app_id-index',
    KeyConditionExpression: 'user_id = :hkey',
    ExpressionAttributeValues: {
      ':hkey': user_id
    },
    ReturnConsumedCapacity: 'TOTAL',
  };

  docClient.query(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(ApiErrors.exceptionalErrorHappened);
    } else {
      console.log(`Debug Query Device By User ID: ${user_id}`, JSON.stringify(data, null, 2));
      // data.Items => [ {}, {}, ... ]
      return callback(null, data.Items); // successful response
    }
  });
}

var getUsersDevicesByRealmId = function (realm_id, user_ids, callback) {
  console.log( `============== getUsersDevicesByRealmId ==============` );

  let devices = [];

  const params = {
    TableName: `${SERVICE}-${STAGE}-devices`, /* required */
    ReturnConsumedCapacity: 'TOTAL',
    ScanFilter: {
      realm_id: {
        ComparisonOperator: 'EQ', /* required */
        AttributeValueList: [ realm_id ]
      },
      user_id: {
        ComparisonOperator: 'IN', /* required */
        AttributeValueList: user_ids
      }
    }
  };

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.log("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      return callback(ApiErrors.exceptionalErrorHappened);
    } else {
      console.log("Scan succeeded.");
      devices = devices.concat(data.Items);
      // continue scanning if we have more devices
      if (typeof data.LastEvaluatedKey !== "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
      else return callback(null, devices);
    }
  }
}

var getUsersDevicesByAppId = function (app_id, user_ids, callback) {
  console.log( `============== getUsersDevicesByAppId ==============` );

  let devices = [];

  const params = {
    TableName: `${SERVICE}-${STAGE}-devices`, /* required */
    ReturnConsumedCapacity: 'TOTAL',
    ScanFilter: {
      app_id: {
        ComparisonOperator: 'EQ', /* required */
        AttributeValueList: [ app_id ]
      },
      user_id: {
        ComparisonOperator: 'IN', /* required */
        AttributeValueList: user_ids
      }
    }
  };

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.log("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      return callback(ApiErrors.exceptionalErrorHappened);
    } else {
      console.log("Scan succeeded.");
      devices = devices.concat(data.Items);
      // continue scanning if we have more devices
      if (typeof data.LastEvaluatedKey !== "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
      else return callback(null, devices);
    }
  }
}

var getDevicesByUdid = function (app_id, udids, callback) {
  console.log( `============== getDevicesByUdid ==============` );

  let devices = [];

  const params = {
    TableName: `${SERVICE}-${STAGE}-devices`, /* required */
    ReturnConsumedCapacity: 'TOTAL',
    ScanFilter: {
      app_id: {
        ComparisonOperator: 'EQ', /* required */
        AttributeValueList: [ app_id ]
      },
      udid: {
        ComparisonOperator: 'IN', /* required */
        AttributeValueList: udids
      }
    }
  };

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.log("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      return callback(ApiErrors.exceptionalErrorHappened);
    } else {
      console.log("Scan succeeded.");
      devices = devices.concat(data.Items);
      // continue scanning if we have more devices
      if (typeof data.LastEvaluatedKey !== "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
      else return callback(null, devices);
    }
  }
} // getDevicesByUdid

var getJob = function (job_id, callback) {
  console.log( '============== getJob ==============' );

  const params = {
    TableName : `${SERVICE}-${STAGE}-jobs`,
    Key: { job_id }
  };

  docClient.get(params, function(err, data) {
    if (err) {
      console.error(JSON.stringify(err, null, 2));
      return callback(ApiErrors.exceptionalErrorHappened);
    }

    let job = data.Item;

    if (empty(job)) {
      return callback(ApiErrors.notFound.job);
    }

    return callback(null, job);
  });

} // getJob

var savePlainTextMessageToS3 = function(bucket, key, message, callback) {
  console.log( '============== savePlainTextMessageToS3 ==============' );

  const params = {
    Bucket: bucket, /* required */
    Key: key, /* required */
    ACL: 'public-read',
    Body: JSON.stringify(message, null, 2),
    ContentType: 'application/json'
  };

  S3.putObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data);
  });
}

var createJobItem = function(item, callback) {
  console.log( '============== createJobItem ==============' );

  const timestamp = Utility.getTimestamp();
  const params = {
    TableName : `${SERVICE}-${STAGE}-jobs`,
    Item: {
      created_at: timestamp,
      updated_at: timestamp
    }
  };

  Object.assign(params.Item, item);
  console.log(JSON.stringify(params, null, 2));

  docClient.put(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data);
  });
}

var createNotificationItem = function(item, callback) {
  console.log( '============== createNotificationItem ==============' );

  const timestamp = Utility.getTimestamp();
  const params = {
    TableName : `${SERVICE}-${STAGE}-notifications`,
    Item: {
      created_at: timestamp,
      updated_at: timestamp
    }
  };

  Object.assign(params.Item, item);
  console.log(JSON.stringify(params, null, 2));

  docClient.put(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data);
  });

}

var updateJobItem = function(key, attributeUpdates, callback) {
  console.log( '============== updateJobItem ==============' );

  const timestamp = Utility.getTimestamp();
  const params = {
    TableName: `${SERVICE}-${STAGE}-jobs`,
    Key: key,
    AttributeUpdates: {
      updated_at: { Action: 'PUT', Value: timestamp }
    },
    ReturnConsumedCapacity: 'TOTAL'
  };

  Object.assign(params.AttributeUpdates, attributeUpdates);
  console.log(JSON.stringify(params, null, 2));

  docClient.update(params, (err, data) => {
    if (err) {
      console.log(err);
      return callback(ApiErrors.exceptionalErrorHappened);
    }
    return callback(null, data);
  });
}

var timestampToSection = function(UNIX_timestamp) {
  let date = new Date(UNIX_timestamp * 1000);
  let year = date.getFullYear();
  let month = ('00' + (date.getMonth() + 1)).substr(-2);
  let section = year + month;
  return section;
}

var sectionToTimestamp = function(section) {
  let sectionYYYY = parseInt(section.slice(0,4));
  let sectionMM = parseInt(section.slice(4,6)) - 1;
  let timestamp = (new Date(sectionYYYY,sectionMM).getTime())/1000;
  return timestamp;
}

var verifyGcmPayload = function(gcmPayload, callback) {
  console.log( '============== verifyGcmPayload ==============' );

  if (gcmPayload) {
    let parsedGcmPayload;
    try {
      parsedGcmPayload = JSON.parse(gcmPayload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.gcm_payload);
    } // try ... catch

    if (empty(parsedGcmPayload.notification) || !parsedGcmPayload.notification.title) {
      return callback(ApiErrors.validationFailed.gcm_payload);
    }

    let size = Buffer.byteLength(gcmPayload, 'utf8');
    if (size > parseInt(ANDROID_PAYLOAD_SIZE_LIMIT)) {
      console.log('GCM Payload Size: ', size);
      return callback(ApiErrors.validationFailed.android_payload_limit);
    }
  } // if
  return callback();
} // verifyGcmPayload

var verifyApnsPayload = function(apnsPayload, callback) {
  console.log( '============== verifyApnsPayload ==============' );

  if (apnsPayload) {
    let parsedApnsPayload;
    try {
      parsedApnsPayload = JSON.parse(apnsPayload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.apns_payload);
    } // try ... catch

    if (empty(parsedApnsPayload.aps)) {
      return callback(ApiErrors.validationFailed.apns_payload);
    } else if (typeof parsedApnsPayload.aps !== 'object') {
      return callback(ApiErrors.validationFailed.apns_payload);
    } else if (!parsedApnsPayload.aps.alert) {
      return callback(ApiErrors.validationFailed.apns_payload);
    } else if (typeof parsedApnsPayload.aps.alert === 'object' && !parsedApnsPayload.aps.alert.title) {
      return callback(ApiErrors.validationFailed.apns_payload);
    }

    let size = Buffer.byteLength(apnsPayload, 'utf8');
    if (size > parseInt(IOS_PAYLOAD_SIZE_LIMIT)) {
      console.log('APNS Payload Size: ', size);
      return callback(ApiErrors.validationFailed.ios_payload_limit);
    }
  } // if
  return callback();
} // verifyApnsPayload

var verifyApnsSandboxPayload = function(apnsSandboxPayload, callback) {
  console.log( '============== verifyApnsSandboxPayload ==============' );

  if (apnsSandboxPayload) {
    let parsedApnsSandboxPayload;
    try {
      parsedApnsSandboxPayload = JSON.parse(apnsSandboxPayload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    } // try ... catch

    if (empty(parsedApnsSandboxPayload.aps)) {
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    } else if (typeof parsedApnsSandboxPayload.aps !== 'object') {
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    } else if (!parsedApnsSandboxPayload.aps.alert) {
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    } else if (typeof parsedApnsSandboxPayload.aps.alert === 'object' && !parsedApnsSandboxPayload.aps.alert.title) {
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    }

    let size = Buffer.byteLength(apnsSandboxPayload, 'utf8');
    if (size > parseInt(IOS_PAYLOAD_SIZE_LIMIT)) {
      console.log('APNS Sandbox Payload Size: ', size);
      return callback(ApiErrors.validationFailed.ios_payload_limit);
    }
  } // if
  return callback();
} // verifyApnsSandboxPayload

var generateSnsPayload = function (receivedParams, job_id, callback) {
  console.log( '============== generateSnsPayload ==============' );

  let title = receivedParams.title;
  let body = receivedParams.body;

  let gcmPayload, apnsPayload, apnsSandboxPayload;

  // Set GCM Payload
  if (receivedParams.gcm_payload) {
    try {
      gcmPayload = JSON.parse(receivedParams.gcm_payload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.gcm_payload);
    } // try ... catch

    if (gcmPayload.data && typeof gcmPayload.data === 'object') {
      gcmPayload.data.job_id = job_id;
    } else {
      gcmPayload.data = {};
      gcmPayload.data.job_id = job_id;
    }
  } else {
    gcmPayload = {
      notification: { title },
      data: { job_id }
    };
    if (body) {
      gcmPayload.notification.body = body;
    }
  }
  console.log(JSON.stringify(gcmPayload, null, 2));
  // Set APNS Payload
  if (receivedParams.apns_payload) {
    try {
      apnsPayload = JSON.parse(receivedParams.apns_payload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.apns_payload);
    } // try ... catch

    if (apnsPayload.data && typeof apnsPayload.data === 'object') {
      apnsPayload.data.job_id = job_id;
    } else {
      apnsPayload.data = {};
      apnsPayload.data.job_id = job_id;
    }
  } else {
    apnsPayload = {
      aps: {
        alert: { title }
      },
      data: { job_id }
    };
    if (body) {
      apnsPayload.aps.alert.body = body;
    }
  }
  console.log(JSON.stringify(apnsPayload, null, 2));

  // Set APNS Sandbox Payload
  if (receivedParams.apns_sandbox_payload) {
    try {
      apnsSandboxPayload = JSON.parse(receivedParams.apns_sandbox_payload);
    } catch (err) {
      console.error('JSON Parsing Error:', JSON.stringify(err, null, 2));
      return callback(ApiErrors.validationFailed.apns_sandbox_payload);
    } // try ... catch

    if (apnsSandboxPayload.data && typeof apnsSandboxPayload.data === 'object') {
      apnsSandboxPayload.data.job_id = job_id;
    } else {
      apnsSandboxPayload.data = {};
      apnsSandboxPayload.data.job_id = job_id;
    }
  } else {
    apnsSandboxPayload = {
      aps: {
        alert: { title }
      },
      data: { job_id }
    };
    if (body) {
      apnsSandboxPayload.aps.alert.body = body;
    }
  }
  console.log(JSON.stringify(apnsSandboxPayload, null, 2));

  // Set SNS Payload
  let snsPayload = {
    default: title,
    GCM: JSON.stringify(gcmPayload),
    APNS_SANDBOX: JSON.stringify(apnsSandboxPayload),
    APNS: JSON.stringify(apnsPayload)
  };
  console.log(JSON.stringify(snsPayload, null, 2));
  let res = JSON.stringify(snsPayload);
  return callback(null, res);
} // generateSnsPayload

var checkAppIds = function (realm_id, app_ids, callback) {
  console.log( '============== checkAppIds ==============' );
  console.log('Debug app_ids: ', app_ids);
  if (app_ids) {
    let appIds = app_ids.split(',');

    const params = {
      TableName : `${SERVICE}-${STAGE}-apps`,
      ConditionalOperator: 'AND',
      ScanFilter: {
        realm_id: {
          ComparisonOperator: 'EQ', /* required */
          AttributeValueList: [ realm_id ]
        },
        app_id: {
          ComparisonOperator: 'EQ', /* required */
          AttributeValueList: appIds
        }
      }
    };

    docClient.scan(params, function(err, data) {
      if (err) {
        console.log(err);
        return callback(ApiErrors.exceptionalErrorHappened);
      } else {
        console.log('Scanned Result: ', JSON.stringify(data));

        if (empty(data.Items) || data.Items.length !== appIds.length) {
          return callback(ApiErrors.validationFailed.app_does_not_belong_to_realm);
        } else {
          return callback(null, appIds);
        }
      } // else

    }); // scan
  } // if
  else return callback();
} // checkAppIds

CommonSteps.verifySignature = verifySignature;
CommonSteps.verifyTimestamp = verifyTimestamp;
CommonSteps.validateParams = validateParams;
CommonSteps.readFileContent = readFileContent;
CommonSteps.downloadFileFromS3 = downloadFileFromS3;
CommonSteps.createJob = createJob;
CommonSteps.updateJob = updateJob;
CommonSteps.determineInboxInterval = determineInboxInterval;
CommonSteps.checkHeaders = checkHeaders;
CommonSteps.checkCertificateSerial = checkCertificateSerial;
CommonSteps.queryCertificateSerial = queryCertificateSerial;
CommonSteps.checkHeadersSignature = checkHeadersSignature;
CommonSteps.verifyHeadersSignatureAsPromised = verifyHeadersSignatureAsPromised;
CommonSteps.verifyAccessToken = verifyAccessToken
CommonSteps.writeAccessLog = writeAccessLog
CommonSteps.countDomains = countDomains
CommonSteps.createDomainItem = createDomainItem
CommonSteps.checkRequiredParams = checkRequiredParams;
CommonSteps.checkAccessKey = checkAccessKey;
CommonSteps.verifySignatureAsPromised = verifySignatureAsPromised;
CommonSteps.verifyMeta = verifyMeta;
CommonSteps.verifyDeepLinkURI = verifyDeepLinkURI;
CommonSteps.generatePayload = generatePayload;
CommonSteps.publishToTopic = publishToTopic;
CommonSteps.publishToUser = publishToUser;
CommonSteps.publishToDevice = publishToUser;
CommonSteps.queryDeviceByUserId = queryDeviceByUserId;
CommonSteps.getUsersDevicesByRealmId = getUsersDevicesByRealmId;
CommonSteps.getUsersDevicesByAppId = getUsersDevicesByAppId;
CommonSteps.getDevicesByUdid = getDevicesByUdid;
CommonSteps.getJob = getJob;
CommonSteps.savePlainTextMessageToS3 = savePlainTextMessageToS3;
CommonSteps.createJobItem = createJobItem;
CommonSteps.createNotificationItem = createNotificationItem;
CommonSteps.updateJobItem = updateJobItem;
CommonSteps.timestampToSection = timestampToSection;
CommonSteps.sectionToTimestamp = sectionToTimestamp;
CommonSteps.verifyGcmPayload = verifyGcmPayload;
CommonSteps.verifyApnsPayload = verifyApnsPayload;
CommonSteps.verifyApnsSandboxPayload = verifyApnsSandboxPayload;
CommonSteps.generateSnsPayload = generateSnsPayload;
CommonSteps.checkAppIds = checkAppIds;

module.exports = CommonSteps;
