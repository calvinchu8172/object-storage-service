'use strict';

require('rootpath')();

// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const STAGE = process.env.SERVERLESS_STAGE;
const REGION = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// ================ AWS =====================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const s3 = new AWS.S3({ region: REGION });

// ================ Modules =====================
const uuidV4 = require('uuid/v4');
const empty = require('is-empty');

// ================ Lib/Modules =================
const ParamsFetcher = require('lib/params_fetcher.js');
const CommonSteps = require('lib/common_steps');
const Utility = require('lib/utility.js');
const ApiErrors = require('lib/api_errors.js');



module.exports.handler = (event, context, callback) => {
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  let receivedParams = event.body;
  let headers = event.headers;
  let source_ip = event.source_ip;
  let certificate_serial = receivedParams.certificate_serial;
  let customs = {};
  let isJsonTypeObject = (receivedParams.content_type === 'application/json');

  CommonSteps.checkCertificateSerial(certificate_serial)
    .then((certificate_serial) => {
      return CommonSteps.queryCertificateSerial(certificate_serial);
    })
    .then((public_key) => {
      return CommonSteps.checkHeadersSignature(headers, public_key);
    })
    .then((result) => {
      return CommonSteps.verifyHeadersSignature(receivedParams, headers, result.public_key);
    })
    .then(() => {
      let requiredParams = ['access_token', 'domain', 'key', 'content_type'];
      let execValidations = ['validateKey', 'validateContentType'];
      if (isJsonTypeObject) {
        requiredParams.push('content');
        execValidations.push('validateContent');
      }
      return CommonSteps.validateParams(receivedParams, requiredParams, execValidations);
    })
    .then(() => {
      return CommonSteps.verifyAccessToken(receivedParams.access_token);
    })
    .then((user_info) => {
      customs.user_info = user_info;
      customs.app_id = user_info.app_id;
      customs.cloud_id = user_info.cloud_id;
    })
    .then(() => {
      return CommonSteps.getDomainItem(customs.cloud_id, customs.app_id, receivedParams.domain);
    })
    .then((result) => {
      customs.domain_id = result.domain_id;
      customs.domain_name = result.domain_name;
      console.log(`customs.domain_id: ${customs.domain_id}`);
      console.log(`customs.domain_name: ${customs.domain_name}`);
      return CommonSteps.writeAccessLog(event, receivedParams, customs.domain_id, customs.user_info);
    })
    .then(() => {
      return queryObjectItem(customs.domain_id, receivedParams.key, customs.app_id);
    })
    .then(() => {
      let object_id = uuidV4();
      let domain_path = `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`;
      let path = `${domain_path}/${receivedParams.key}`;
      let timestamp = Utility.getTimestamp();
      let objectItem = {
        domain_id: customs.domain_id,
        key: receivedParams.key,
        id: object_id,
        content_type: receivedParams.content_type,
        content: receivedParams.content,
        domain_path: domain_path,
        path: path,
        created_at: timestamp,
        updated_at: timestamp
      };
      return createObjectItem(objectItem, customs.app_id);
    })
    .then((result) => {
      if (isJsonTypeObject) {
        console.log(`usage: ${result.usage}`);
        return updateDomainJsonUsage(customs.cloud_id, customs.app_id, customs.domain_id, result.usage, source_ip);
      } else {
        return generatePresignedURL(result.path, receivedParams.content_type);
      }
    })
    .then((signed_url) => { // successful response
      if (isJsonTypeObject) {
        callback();
      } else {
        let response = {};
        response['data'] = {};
        response['data']['upload_url'] = signed_url;
        callback(null, JSON.stringify(response));
      }
    })
    .catch((err) => {
      if (empty(err.httpStatus) || empty(err.code) || empty(err.message)) {
        console.error(err);
        err = ApiErrors.unexceptedError;
      }
      err = JSON.stringify(err);
      console.error(err);
      callback(err);
    });

}


/**
* @function queryObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var queryObjectItem = function (domain_id, key, app_id) {
  return new Promise((resolve, reject) => {
    var payload = {
      TableName: `${STAGE}-${SERVICE}-${app_id}`,
      IndexName: 'domain_id-key-index',
      KeyConditionExpression: '#hkey = :hkey and #rkey = :rkey',
      ExpressionAttributeNames: {
        "#hkey": "domain_id",
        "#rkey": "key"
      },
      ExpressionAttributeValues: {
        ':hkey': domain_id,
        ':rkey': key
      }
    }; //params
    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (data.Items && data.Items.length > 0) {
        reject(ApiErrors.validationFailed.key_duplicated);
      }
      else {
        resolve();
      }
    });
  });
}


/**
* @function createObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var createObjectItem = function (objectItem, app_id) {
  console.log('============== createObjectItem ==============');
  console.log(`objectItem: ${JSON.stringify(objectItem, null, 2)}`);

  return new Promise((resolve, reject) => {
    let usage = 0;
    if (objectItem.content_type !== 'application/json') {
      delete objectItem.content;
    } else {
      usage = Buffer.byteLength(JSON.stringify(objectItem.content), 'utf8');
      objectItem.usage = usage;
    }

    var payload = {
      TableName: `${STAGE}-${SERVICE}-${app_id}`,
      Item: objectItem,
      ConditionExpression: 'attribute_not_exists(#hkey)',
      ExpressionAttributeNames: {
        '#hkey': 'domain_id'
      },
      ReturnConsumedCapacity: 'TOTAL'
    };
    ddb.put(payload, function (err, data) {
      if (err) {
        console.error(`err: ${err}`);
        if (err.code == 'ConditionalCheckFailedException') {
          reject(ApiErrors.validationFailed.key_duplicated);
        }
        else {
          reject(ApiErrors.unexceptedError);
        }
      }
      else {
        console.log(`data: ${JSON.stringify(data)}`);
        let result = {
          usage: usage,
          path: objectItem.path
        }
        resolve(result);
      }
    });
  });
}


/**
* @function updateDomainJsonUsage
* @param  {type} cloud_id    {description}
* @param  {type} app_id      {description}
* @param  {type} domain_name {description}
* @param  {type} usage       {description}
* @return {type} {description}
*/
var updateDomainJsonUsage = function (cloud_id, app_id, domain_id, usage, source_ip) {
  console.log('============== updateDomainJsonUsage ==============');
  return new Promise((resolve, reject) => {

    var payload = {
      TableName: `${STAGE}-${SERVICE}-domains`,
      Key: {
        "cloud_id-app_id": `${cloud_id}-${app_id}`,
        "id": domain_id
      },
      UpdateExpression: 'SET #json_usage = #json_usage + :json_usage, #updated_at = :updated_at,  #updated_by = :updated_by',
      ConditionExpression: 'attribute_exists(#hkey)',
      ExpressionAttributeNames: {
        '#json_usage': 'json_usage',
        '#updated_at': 'updated_at',
        '#updated_by': 'updated_by',
        '#hkey': 'cloud_id-app_id'
      },
      ExpressionAttributeValues: {
        ':json_usage': usage,
        ':updated_by': source_ip,
        ':updated_at': Utility.getTimestamp()
      },
      ReturnConsumedCapacity: 'TOTAL'
    }
    ddb.update(payload, function (err, data) {
      if (err) {
        console.error(`err: ${err}`);
        if (err.code == 'ConditionalCheckFailedException') {
          reject(ApiErrors.validationFailed.key_duplicated);
        }
        else {
          reject(ApiErrors.unexceptedError);
        }
      }
      else {
        console.log(`data: ${JSON.stringify(data)}`);
        resolve();
      }
    });
    resolve();
  });
}


/**
* @function generatePresignedURL
* @param  {type} path {description}
* @return {type} {description}
*/
var generatePresignedURL = function (path, content_type) {
  console.log('============== generatePresignedURL ==============');
  console.log(`S3_BUCKET: ${S3_BUCKET}`);
  console.log(`path: ${path}`);
  return new Promise((resolve, reject) => {
    var params = {
      Bucket: S3_BUCKET,
      Key: path,
      Expires: 3600, // 1 hour
      ContentType: content_type
    };
    var url = s3.getSignedUrl('putObject', params, function (err, url) {
      console.log('The URL is', url);
      resolve(url);
    });
  });
}