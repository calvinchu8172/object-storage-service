
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

  let receivedParams = event.body;
  let headers = event.headers;
  let path = event.path;
  let source_ip = event.source_ip;
  let certificate_serial = receivedParams.certificate_serial;
  receivedParams.domain = path.domain;
  receivedParams.key = path.key;
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
      let execValidations = ['validateContentType'];
      if (isJsonTypeObject) {
        requiredParams.push('content');
        execValidations.push('validateContent');
      }
      if (receivedParams.new_key) {
        execValidations.push('validateNewKey');
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
      return UpdateObjectItem(objectItem, customs.app_id)
    })
}


/**
* @function createObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var updateObjectItem = function (objectItem, app_id) {
  console.log('============== createDomainItem ==============');
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
      ConditionExpression: 'attribute_exists(#hkey)',
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

