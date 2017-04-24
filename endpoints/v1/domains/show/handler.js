'use strict';

require('rootpath')();

// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const STAGE = process.env.SERVERLESS_STAGE;
const REGION = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;

// ================ AWS =====================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });

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
  // const receivedParams = ParamsFetcher.fetchFrom(event);
  const receivedParams = event.query;
  const certificate_serial = receivedParams.certificate_serial;
  const domain_id = uuidV4();

  const domain = event.path.domain;

  console.log(`SERVICE: ${SERVICE}`);
  console.log(`STAGE: ${STAGE}`);
  console.log(`request_id: ${request_id}`);
  console.log(`source_ip: ${source_ip}`);
  console.log(`certificate_serial: ${certificate_serial}`);

  console.log("**************************1");
  console.log(receivedParams);
  receivedParams.domain = domain;
  console.log(`receivedParams: ${JSON.stringify(receivedParams, null, 2)}`);
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
    .then((user_info) => {
      return getDomainItem(event, user_info, receivedParams);
    })
    .then(() => { // successful response
      callback();
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
};

/**
* @function getDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
var getDomainItem = function (event, user_info, params) {
  console.log('============== getDomainItem ==============');
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  return new Promise((resolve, reject) => {
    let hash_key = user_info.cloud_id + "-" + user_info.app_id;
    var payload = {
      TableName: `${STAGE}-${SERVICE}-domains`,
      IndexName: 'cloud_id-app_id-name-index',
      KeyConditionExpression: '#hkey = :hkey and #rkey = :rkey',
      ExpressionAttributeNames: {
        "#hkey": "cloud_id-app_id",
        "#rkey": "name"
      },
      ExpressionAttributeValues: {
        ':hkey': hash_key,
        ':rkey': params.domain
      }
    }; //params
    console.log(`payload: ${JSON.stringify(payload, null, 2)}`);
    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (data.Items) {
        if (data.Items.length > 0) {
          resolve();
        } else {
          reject(ApiErrors.notFound.domain);
        }
      }
      else {
        reject(ApiErrors.unexceptedError);
      }
    }); // ddb


  });
}

