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
const isEmpty         = require('is-empty');


// ================ Lib/Modules =================
const ParamsFetcher = require('lib/params_fetcher.js');
const CommonSteps = require('lib/common_steps');
const Utility = require('lib/utility.js');
const ApiErrors = require('lib/api_errors.js');

module.exports.handler = ( event, context, callback ) => {
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  const headers = event.headers;
  const request_id = event.request_id;
  const source_ip = event.source_ip;
  // const receivedParams = ParamsFetcher.fetchFrom(event);
  const receivedParams = event.query;
  const certificate_serial = receivedParams.certificate_serial;
  const domain_id = uuidV4();

  const domain = event.path.domain;
  const object = event.path.object;

  // console.log(`SERVICE: ${SERVICE}`);
  // console.log(`STAGE: ${STAGE}`);
  // console.log(`request_id: ${request_id}`);
  // console.log(`source_ip: ${source_ip}`);
  // console.log(`certificate_serial: ${certificate_serial}`);
  // console.log(`receivedParams: ${receivedParams}`);
  console.log("**************************1");
  console.log(receivedParams);
  receivedParams.domain = domain;
  receivedParams.object = object;
  console.log(receivedParams);
  console.log(`headers: ${headers}`);
  console.log("**************************2");
  console.log(headers);


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
      return CommonSteps.writeAccessLog(event, receivedParams, domain_id, user_info);
    })
    // .then((user_info) => {
      // return CommonSteps.countDomains(user_info);
    // })
    .then((user_info) => {
      return getDomainItem(event, user_info, domain_id, receivedParams);
    })
    .then((domain_data) => {
      return getObjectItem(event, domain_data, domain_id, receivedParams);
    })
    // .then((path) => {
    //   return generatePresignedURL(path);
    // })
    .then((data) => {
      if (data.Item.content_type == 'application/json') {
        var json = data.Item.content;
        return responseJSON(json);
      } else {
        var path = data.Item.path;
        return generatePresignedURL(path);
      }
    })
    .then((json) => { // successful response
      callback(null, json);
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      // callback(JSON.stringify(err));
      callback(err);
    });
};

/**
* @function getDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
var getDomainItem = function (event, user_info, domain_id, params) {
  console.log('============== getDomainItem ==============');
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  return new Promise((resolve, reject) => {
    let hash_key = user_info.cloud_id + "-" + user_info.app_id;
    let error_hash_key = 'aaa-bbb';
    console.log(hash_key);
    console.log(params);

    var payload = {
      TableName : `${STAGE}-${SERVICE}-domains`,
      Key: {
        'cloud_id-app_id': hash_key,
        'name': params.domain
      }
    };
    ddb.get(payload, function (err, data) {
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (isEmpty(data)) {
        reject(ApiErrors.notFound.domain);
      }
      else {
        resolve(data);
      }
    });
  }); // Promise
}

var getObjectItem = function (event, domain_data, domain_id, params) {
  console.log('============== getObjectItem ==============');
  console.log(domain_data);
  var app_id = domain_data.Item.app_id
  console.log(domain_id);

  return new Promise((resolve, reject) => {

    var payload = {
      TableName : `${STAGE}-${SERVICE}-${app_id}`,
      Key: {
        'domain_id': domain_data.Item.id,
        'key': params.object
        // 'key': 'aaa.jpg'
      }
    };
    ddb.get(payload, function (err, data) {
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (isEmpty(data)) {
        reject(ApiErrors.notFound.object);
      }
      else {
        console.log(data);
        var path = data.Item.path
        console.log(path);
        // var s3_url = generatePresignedURL(path);
        // console.log("******s3_url");
        // console.log(s3_url);
        // resolve(path);
        resolve(data);
        // reject(s3_url)
      }
    }); //ddb
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

