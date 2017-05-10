'use strict';

require('rootpath')();

// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const STAGE = process.env.SERVERLESS_STAGE;
const REGION = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// ================ AWS =====================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const S3  = new AWS.S3({region: REGION});

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
  console.log(`context: ${JSON.stringify(context, null, 2)}`);

  const headers = event.headers;
  const request_id = event.request_id;
  const source_ip = event.source_ip;
  // const receivedParams = ParamsFetcher.fetchFrom(event);
  const receivedParams = event.query;
  const certificate_serial = receivedParams.certificate_serial;
  let domain_id;
  let object_id;

  const domain = event.path.domain;
  const key = event.path.key;

  console.log(`SERVICE: ${SERVICE}`);
  console.log(`STAGE: ${STAGE}`);
  console.log(`request_id: ${request_id}`);
  console.log(`source_ip: ${source_ip}`);
  console.log(`certificate_serial: ${certificate_serial}`);
  receivedParams.domain = domain;
  receivedParams.key = key;
  console.log(`receivedParams: ${JSON.stringify(receivedParams, null, 2)}`);
  console.log(`headers: ${headers}`);
  let customs = {};

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
      let requiredParams = ['access_token', 'domain', 'key']; //要去檢查之前的 api 有沒有 check domain 與 key
      return CommonSteps.checkRequiredParams(receivedParams, requiredParams);
    })
    .then(() => {
      return CommonSteps.verifyAccessToken(receivedParams.access_token);
    })
    .then((user_info) => {
      console.log("************** save user_info to customs")
      customs.user_info = user_info;
      // customs.cloud_id = user_info.cloud_id;
      // customs.app_id = user_info.app_id;
      console.log(customs);
    })
    .then((user_info) => {
      return CommonSteps.getDomainItem(customs.user_info.cloud_id, customs.user_info.app_id, receivedParams.domain);
    })
    .then((data) => {
      console.log("************** save domain to customs")
      console.log(data);
      // domain_id = data.domain_id;
      customs.domain = {};
      customs.domain.id = data.domain_id;
      customs.domain.json_usage = data.domain_json_usage;
      customs.domain.file_usage = data.domain_file_usage;
    })
    .then(() => {
      return CommonSteps.getObjectItem(customs.user_info.app_id, customs.domain.id, key);
    })
    .then((data) => {
      console.log("************** save object to customs")
      console.log(data);
      // object_id = data.id;
      // customs.content_type = data.content_type;
      // customs.usage = data.usage;
      customs.object = {};
      customs.object.id = data.id;
      customs.object.key = data.key;
      customs.object.content_type = data.content_type;
      customs.object.usage = data.usage;
    })
    .then(() => {
      return CommonSteps.deleteObjectItem(customs.user_info.app_id, customs.domain.id, customs.object.id);
    })
    .then(() => {
      if (customs.object.content_type != 'application/json') {
        return deleteS3ObjectItem(customs.user_info.cloud_id, customs.user_info.app_id, customs.domain.id, key);
      }
    })
    .then(() => {
      console.log(customs)
      let usage;
      if ( customs.object.content_type == 'application/json' ) {
        usage = customs.domain.json_usage - customs.object.usage
      } else {
        usage = customs.domain.file_usage - customs.object.usage
      }
      return updateDomainItemUsage(customs.user_info.cloud_id, customs.user_info.app_id, customs.domain.id, customs.object.content_type, usage);
    })
    .then(() => {
      return CommonSteps.writeAccessObjectLog(event, receivedParams, customs.domain.id, customs.user_info, customs.object);
    })
    .then(() => { // successful response
      // const response = { code: '0000', message: 'OK' };
      // callback(null, response);
      callback();
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
};

/**
* @function createDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
var updateDomainItemUsage = function (cloud_id, app_id, domain_id, content_type, usage) {
  console.log('============== updateDomainItemUsage ==============');
  console.log(`Domain Table: ${cloud_id}-${app_id}`);
  return new Promise((resolve, reject) => {
    let timestamp = Utility.getTimestamp();
    let payload;

    if (content_type == 'application/json') {
      payload = {
        TableName: `${STAGE}-${SERVICE}-domains`,
        Key:{
          "cloud_id-app_id": `${cloud_id}-${app_id}`,
          "id": domain_id
        },
        Expected: { // optional (map of attribute name to ExpectedAttributeValue)
          "cloud_id-app_id": {
            Exists: true,
            Value: `${cloud_id}-${app_id}`
          }
        },
        AttributeUpdates: { // The attributes to update (map of attribute name to AttributeValueUpdate)
          "json_usage": {
            Action: 'PUT',
            Value: usage
          },
          "updated_at": {
            Action: 'PUT',
            Value: timestamp
          }
        },
        ReturnConsumedCapacity: 'TOTAL'
      };

    } else {
      payload = {
        TableName: `${STAGE}-${SERVICE}-domains`,
        Key:{
          "cloud_id-app_id": `${cloud_id}-${app_id}`,
          "id": domain_id
        },
        Expected: { // optional (map of attribute name to ExpectedAttributeValue)
          "cloud_id-app_id": {
            Exists: true,
            Value: `${cloud_id}-${app_id}`
          }
        },
        AttributeUpdates: { // The attributes to update (map of attribute name to AttributeValueUpdate)
          "file_usage": {
            Action: 'PUT',
            Value: usage
          },
          "updated_at": {
            Action: 'PUT',
            Value: timestamp
          }
        },
        ReturnConsumedCapacity: 'TOTAL'
      };

    }

    console.log(payload);

    ddb.update(payload, function (err, data) {
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else {
        console.log(data);
        resolve();
      }
    });
  }); // Promise
}

var deleteS3ObjectItem = function (cloud_id, app_id, domain_id, key) {
  console.log('============== deleteS3ObjectItem ==============');
  return new Promise((resolve, reject) => {
    var params = {
      Bucket: S3_BUCKET_NAME,
      Key: `${cloud_id}/${app_id}/${domain_id}/${key}`
    };

    console.log(params);

    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.error(err);
        reject(ApiErrors.unexceptedError);
      } else {
        console.log("Deleted with success!");
        console.log(data);
        resolve();
      }
    }); // deleteObject
  }); // Promise
} // deleteS3ObjectItem

