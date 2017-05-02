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

  const headers = event.headers;
  const request_id = event.request_id;
  const source_ip = event.source_ip;
  // const receivedParams = ParamsFetcher.fetchFrom(event);
  const receivedParams = event.body;
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
      return querryOldAndNewDomainItems(customs.cloud_id, customs.app_id, receivedParams.domain, receivedParams.new_domain);
    })
    .then((data) => {
      console.log("*********************")
      console.log(data);
      domain_id = data.Items[0].id;
      return updateDomainItemName(customs.cloud_id, customs.app_id, domain_id, receivedParams.new_domain);
    })
    .then(() => {
      return CommonSteps.writeAccessLog(event, receivedParams, domain_id, customs);
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
* @function createDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
var updateDomainItemName = function (cloud_id, app_id, domain_id, new_domain) {
  console.log('============== updateDomainItemName ==============');
  console.log(`Domain Table: ${cloud_id}-${app_id}`);
  return new Promise((resolve, reject) => {
    let timestamp = Utility.getTimestamp();

    var payload = {
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
        "name": {
          Action: 'PUT',
          Value: new_domain
        },
        "updated_at": {
          Action: 'PUT',
          Value: timestamp
        }
      },
      ReturnConsumedCapacity: 'TOTAL'
    };

    ddb.update(payload, function (err, data) {
      if (err) {
        console.log(err);
        // if (err.code == 'ConditionalCheckFailedException') {
          // reject(ApiErrors.validationFailed.domain_duplicated);
        // }
        // else {
          reject(ApiErrors.unexceptedError);
        // }
      }
      else {
        console.log(data);
        resolve();
      }
    });
  });
}


/**
* @function getDomainItem
* @param  {type} user_info {description}
* @param  {type} event     {description}
* @param  {type} params    {description}
* @return {type} {description}
*/
var querryOldAndNewDomainItems = function (cloud_id, app_id, domain, new_domain) {
  console.log('============== querryOldAndNewDomainItems ==============');
  return new Promise((resolve, reject) => {
    var result = [];

    var payload = {
      TableName: `${STAGE}-${SERVICE}-domains`,
      KeyConditions: {
        'cloud_id-app_id': {
          ComparisonOperator: 'EQ',
          AttributeValueList: [`${cloud_id}-${app_id}`]
        }
      },
      QueryFilter: {
        'name': {
          ComparisonOperator: 'IN', /* required */
          AttributeValueList: [ domain, new_domain ]
        }
      }
    };
    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (data.Items.length == 0) {
        reject(ApiErrors.notFound.domain);
      }
      else {
        data.Items.map(e => {
          result.push(e.name);
        });
        console.log(result);
        if ( result.indexOf(domain) == -1 ) {
          reject(ApiErrors.notFound.domain);
        } else if ( result.indexOf(new_domain) != -1 ) {
          reject(ApiErrors.validationFailed.domain_duplicated);
        }
        resolve(data);
      }
    });
  }); // Promise
}