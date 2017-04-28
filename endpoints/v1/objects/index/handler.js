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
    // .then((user_info) => {
    //   return CommonSteps.writeAccessLog(event, receivedParams, domain_id, customs.user_info);
    // })
    .then((user_info) => {
      return CommonSteps.getDomainItem(customs.cloud_id, customs.app_id, domain);
    })
    .then((domain_data) => {
      customs.domain_id = domain_data.domain_id;
      console.log(`customs: ${JSON.stringify(customs, null, 2)}`);
    })
    .then(() => {
      return queryObjectItem(event, customs.app_id, customs.domain_id, receivedParams.key, receivedParams.begins_with);
    })
    .then((item) => {
      return CommonSteps.writeListObjectLog(event, receivedParams, customs.domain_id, customs.user_info, item);
    })
    .then((data) => { // successful response
      console.log("==================final=====================")
      console.log(data);
      data.map(e => {
        delete e.content;
        delete e.id;
        delete e.created_by;
        delete e.updated_by;
        delete e.path;
        delete e.domain_path;
        delete e.id;
        delete e.domain_id;
      });
      var result = {};
      result.data = data;
      callback(null, JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
};

var queryObjectItem = function (event, app_id, domain_id, key, begins_with) {
  console.log('============== gueryObjectItem ==============');
  return new Promise((resolve, reject) => {

    console.log(key)
    console.log(begins_with)

    var payload;

    if (key) {
      console.log('***********1 query object by key');
      payload = {
        TableName: `${STAGE}-${SERVICE}-${app_id}`,
        IndexName: 'domain_id-key-index',
        KeyConditionExpression: '#hkey = :hkey and #key = :rkey',
        ExpressionAttributeNames: {
          "#hkey": "domain_id",
          "#key": "key"
        },
        ExpressionAttributeValues: {
          ':hkey': domain_id,
          ':rkey': key
        }
      }; //payload
    } else if (begins_with) {
      console.log('***********2 query object by begins_with');
      payload = {
        TableName: `${STAGE}-${SERVICE}-${app_id}`,
        IndexName: 'domain_id-key-index',
        KeyConditionExpression: '#hkey = :hkey and begins_with(#key, :rkey)',
        ExpressionAttributeNames: {
          "#hkey": "domain_id",
          "#key": "key"
        },
        ExpressionAttributeValues: {
          ':hkey': domain_id,
          ':rkey': begins_with
        }
      }; //payload
    } else {
      console.log('***********3 query object by domain_id(all)');
      payload = {
        TableName: `${STAGE}-${SERVICE}-${app_id}`,
        IndexName: 'domain_id-key-index',
        KeyConditionExpression: '#hkey = :hkey',
        ExpressionAttributeNames: {
          "#hkey": "domain_id"
        },
        ExpressionAttributeValues: {
          ':hkey': domain_id
        }
      }; //payload
    } // else

    ddb.query(payload, function (err, data) {
      console.log(JSON.stringify(data, null, 2));
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (isEmpty(data.Items)) {
        reject(ApiErrors.notFound.domain);
      }
      else {
        // data.Items.map(e => {
        //   delete e.content;
        //   delete e.id;
        //   delete e.created_by;
        //   delete e.updated_by;
        //   delete e.path;
        //   delete e.domain_path;
        //   delete e.id;
        //   delete e.domain_id;
        // });
        resolve(data.Items);
      }

    }); // ddb
  }); // Promise
} // queryObjectItem

