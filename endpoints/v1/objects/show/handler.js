'use strict';

require('rootpath')();

// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const STAGE = process.env.SERVERLESS_STAGE;
const REGION = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// ================ AWS =====================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const s3 = new AWS.S3({ region: REGION });

// ================ Modules =====================
const uuidV4 = require('uuid/v4');
const isEmpty = require('is-empty');


// ================ Lib/Modules =================
const ParamsFetcher = require('lib/params_fetcher.js');
const CommonSteps = require('lib/common_steps');
const Utility = require('lib/utility.js');
const ApiErrors = require('lib/api_errors.js');

module.exports.handler = (event, context, callback) => {
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  const headers = event.headers;
  const request_id = event.request_id;
  const source_ip = event.source_ip;
  const receivedParams = event.query;
  const certificate_serial = receivedParams.certificate_serial;
  const domain_id = uuidV4();

  const domain = event.path.domain;
  const key = event.path.key;

  console.log("**************************1");
  console.log(receivedParams);
  receivedParams.domain = domain;
  receivedParams.key = key;
  console.log(receivedParams);
  console.log(`headers: ${headers}`);
  console.log("**************************2");
  console.log(headers);
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
      let requiredParams = ['access_token'];
      return CommonSteps.checkRequiredParams(receivedParams, requiredParams);
    })
    .then(() => {
      return CommonSteps.verifyAccessToken(receivedParams.access_token);
    })
    .then((user_info) => {
      customs.user_info = user_info;
      customs.cloud_id = user_info.cloud_id;
      customs.app_id = user_info.app_id;
    })
    .then(() => {
      return CommonSteps.getDomainItem(customs.cloud_id, customs.app_id, domain);
    })
    .then((domain_data) => {
      customs.domain_id = domain_data.domain_id;
      console.log(`customs: ${JSON.stringify(customs, null, 2)}`);
    })
    // .then(() => {
    //   console.log(`xxxxxxxx.....`);
    //   return CommonSteps.writeAccessLog(event, receivedParams, customs.domain_id, customs.user_info);
    // })
    .then(() => {
      console.log(`xxxxxxxx.....`);
      return getObjectItem(event, customs.app_id, customs.domain_id, receivedParams);
    })
    .then((item) => {
      return CommonSteps.writeAccessObjectLog(event, receivedParams, customs.domain_id, customs.user_info, item);
    })
    .then((item) => {
      if (item.content_type == 'application/json') {
        var json = item.content;
        return responseJSON(json);
      } else {
        var path = item.path;
        return generatePresignedURL(path);
      }
    })
    .then((json) => { // successful response
      callback(null, json);
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      // callback(JSON.stringify(err));
      console.log(typeof err)
      if (typeof err == 'object') {
        callback(JSON.stringify(err));
      } else {
        callback(err);
      }
      // callback(err);
    });
};

/**
* @function getDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
// var getDomainItem = function (event, user_info, domain_id, params) {
//   console.log('============== getDomainItem ==============');
//   console.log(`params: ${JSON.stringify(params, null, 2)}`);
//   return new Promise((resolve, reject) => {
//     let hash_key = user_info.cloud_id + "-" + user_info.app_id;
//     console.log(hash_key);
//     console.log(params);

//     var payload = {
//       TableName : `${STAGE}-${SERVICE}-domains`,
//       Key: {
//         'cloud_id-app_id': hash_key,
//         'name': params.domain
//       }
//     };
//     ddb.get(payload, function (err, data) {
//       if (err) {
//         console.log(err);
//         reject(ApiErrors.unexceptedError);
//       }
//       else if (isEmpty(data)) {
//         reject(ApiErrors.notFound.domain);
//       }
//       else {
//         resolve(data);
//       }
//     });
//   }); // Promise
// }

var getObjectItem = function (event, app_id, domain_id, params) {
  console.log('============== getObjectItem ==============');
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
        ':rkey': params.key
      }
    }; //payload

    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (data.Items) {
        if (data.Items.length > 0) {
          let item = data.Items[0];
          resolve(item);
        } else {
          reject(ApiErrors.notFound.object);
        }
      }
      else {
        reject(ApiErrors.unexceptedError);
      }

    }); // ddb
    // resolve('aaa');
  }); // Promise

}

var responseJSON = function (json) {
  return new Promise((resolve, reject) => {
    try {
      resolve(json);
    } catch (err) {
      reject(err);
    }
  });
}

var generatePresignedURL = function (path) {
  console.log('============== generatePresignedURL ==============');
  console.log(`S3_BUCKET: ${S3_BUCKET}`);
  console.log(`path: ${path}`);
  return new Promise((resolve, reject) => {
    var params = {
      Bucket: S3_BUCKET,
      Key: path,
      Expires: 3600 // 1 hour
    };
    var url = s3.getSignedUrl('getObject', params, function (err, url) {
      console.log('The URL is', url);
      // resolve(url);
      reject(url);
    });
  });
}

