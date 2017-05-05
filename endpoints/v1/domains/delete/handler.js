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

  const domain = event.path.domain;

  console.log(`SERVICE: ${SERVICE}`);
  console.log(`STAGE: ${STAGE}`);
  console.log(`request_id: ${request_id}`);
  console.log(`source_ip: ${source_ip}`);
  console.log(`certificate_serial: ${certificate_serial}`);
  receivedParams.domain = domain;
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
      let requiredParams = ['access_token', 'domain'];
      return CommonSteps.checkRequiredParams(receivedParams, requiredParams);
    })
    .then(() => {
      return CommonSteps.verifyAccessToken(receivedParams.access_token);
    })
    .then((user_info) => {
      customs.user_info = user_info;
      customs.cloud_id = user_info.cloud_id;
      customs.app_id = user_info.app_id;
      console.log(customs);
    })
    .then((user_info) => {
      return CommonSteps.getDomainItem(customs.cloud_id, customs.app_id, receivedParams.domain);
    })
    .then((data) => {
      console.log(data);
      domain_id = data.domain_id;
      return CommonSteps.deleteDomainItem(customs.cloud_id, customs.app_id, domain_id);
    })
    .then(() => {
      return CommonSteps.sendSQSMessage(domain_id);
    })
    .then(() => {
      return CommonSteps.writeAccessLog(event, receivedParams, domain_id, customs);
    })
    .then((result) => { // successful response
      callback();
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
};

