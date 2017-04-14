'use strict';

require('rootpath')();


// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION = process.env.SERVERLESS_REGION;
const STAGE = process.env.SERVERLESS_STAGE;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;

// ================ Modules =====================
const empty = require('is-empty');
const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const uuidV4 = require('uuid/v4');
const mysql = require('mysql');
const yaml = require('yamljs');


// ================ Lib/Modules =================
const ParamsValidator = require('lib/api_params_validator.js');
const ApiErrors = require('lib/api_errors.js');
const Utility = require('lib/utility.js');


// ================== Secrets ===================
const secrets = yaml.load(`secrets.${STAGE}.yml`);


// ================== AWS ===================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const lambda = new AWS.Lambda({ region: REGION });


function CommonSteps() { }


/**
* @function checkHeadersSignature
* @param  {type} headers  {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
var checkHeadersSignature = function (headers, public_key) {
  console.log('============== checkHeadersSignature ==============');
  return new Promise((resolve, reject) => {
    console.log(`headers: ${JSON.stringify(headers, null, 2)}`);

    let signature;

    if (headers['X-Signature']) {
      console.log('X-Signature: ' + headers['X-Signature']);
      signature = headers['X-Signature'];
    } else {
      console.log('x-signature: ' + headers['x-signature']);
      signature = headers['x-signature'];
    }

    if (empty(signature)) {
      reject(ApiErrors.missingRequiredParams.signature);
    }
    else {
      let result = {
        public_key, signature
      };
      console.log(`result: ${JSON.stringify(result, null, 2)}`);
      resolve(result);
    }
  });
}


/**
* @function verifyHeadersSignatureAsPromised
* @param  {type} params     {description}
* @param  {type} headers    {description}
* @param  {type} public_key {description}
* @return {type} {description}
*/
var verifyHeadersSignature = function (params, headers, public_key) {
  console.log('============== verifyHeadersSignatureAsPromised ==============');

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


/**
* @function checkCertificateSerial
* @param  {type} certificate_serial {description}
* @param  {type} callback           {description}
* @return {type} {description}
*/
var checkCertificateSerial = function (certificate_serial) {
  console.log('============== checkCertificateSerial ==============');
  return new Promise((resolve, reject) => {
    if (empty(certificate_serial)) {
      reject(ApiErrors.missingRequiredParams.certificate_serial);
    }
    else {
      resolve(certificate_serial);
    }
  });
}


/**
* @function queryCertificateSerial
* @param  {type} certificate_serial {description}
* @return {type} {description}
*/
var queryCertificateSerial = function (certificate_serial) {
  console.log('============== queryCertificateSerial ==============');
  return new Promise((resolve, reject) => {
    var queryString = 'SELECT * FROM certificates WHERE serial = ? LIMIT 1'
    var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
    connection.connect();
    connection.query(queryString, [certificate_serial], function (error, results, fields) {
      connection.end();
      if (error) {
        console.error(error);
        reject(error);
      }
      else {
        if (empty(results)) {
          return reject(ApiErrors.validationFailed.certificate_serial);
        }
        var public_key = results[0].content;
        resolve(public_key);
      }
    });
  });
}


/**
* @function verifyAccessToken
* @param  {type} access_token {description}
* @param  {type} callback     {description}
* @return {type} {description}
*/
var verifyAccessToken = function (access_token) {
  console.log('============== verifyAccessToken ==============');
  return new Promise((resolve, reject) => {
    let payload = {
      access_token: access_token
    }
    let params = {
      FunctionName: `${SERVICE}-${STAGE}-validateAccessToken`, /* required */
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(payload)
    };
    lambda.invoke(params, function (err, data) {
      if (err) {
        console.error(err, err.stack); // an error occurred
        reject(err);
      }
      else {
        console.log(data);           // successful response
        if (data.StatusCode == 200) {
          let response = JSON.parse(data['Payload']);
          let body = JSON.parse(response.body);
          if (response.statusCode == 200) {
            let user_info = {
              cloud_id: body.cloud_id,
              app_id: body.app_id
            };
            console.log(`user_info: ${JSON.stringify(user_info)}`);
            resolve(user_info);
          } else {
            reject(body);
          }
        } else {
          reject(ApiErrors.unexceptedError);
        }
      }
    }); // lambda
  });
}


/**
* @function writeAccessLog
* @param  {type} event          {description}
* @param  {type} receivedParams {description}
* @param  {type} user_info      {description}
* @return {type} {description}
*/
var writeAccessLog = function (event, receivedParams, domain_id, user_info) {
  console.log('============== writeAccessLog ==============');

  return new Promise((resolve, reject) => {
    try {
      let log = {
        request_id: event.request_id,
        resource_path: event.resource_path,
        http_method: event.method,
        cloud_id: user_info.cloud_id,
        app_id: user_info.app_id,
        domain_id: domain_id,
        domain_name: receivedParams.domain,
        object_id: null,
        object_key: null,
        time: Utility.getTimestamp(),
        source_ip: event.source_ip
      }
      console.log(log);
      resolve(user_info);
    } catch (err) {
      reject(err);
    }
  });
}


/**
* @function countDomains
* @param  {type} user_info {description}
* @return {type} {description}
*/
var countDomains = function (user_info) {
  console.log('============== countDomains ==============');
  return new Promise((resolve, reject) => {
    let hash_key = user_info.cloud_id + "-" + user_info.app_id
    var params = {
      TableName: `${STAGE}-${SERVICE}-domains`,
      KeyConditionExpression: '#hkey = :hkey',
      ExpressionAttributeNames: {
        '#hkey': 'cloud_id-app_id'
      },
      ExpressionAttributeValues: {
        ':hkey': hash_key
      },
      Select: 'COUNT'
    };

    ddb.query(params, function (err, data) {
      if (err) {
        console.error(err);
        reject(ApiErrors.unexceptedError);
      }
      else {
        console.log(JSON.stringify(data, null, 2));
        if (data.Count >= DOMAINS_LIMIT) {
          reject(ApiErrors.validationFailed.domain_limit);
        } else {
          resolve(user_info); // successful response
        }
      }
    });
  });
}


/**
* @function validateParams
* @param  {type} receivedParams  {description}
* @param  {type} requiredParams  {description}
* @param  {type} execValidations {description}
* @param  {type} callback        {description}
* @return {type} {description}
*/
var validateParams = function (receivedParams, requiredParams, execValidations) {
  console.log('============== validateParams ==============');
  return new Promise((resolve, reject) => {
    try {
      var validator = new ParamsValidator(receivedParams);
      validator.validate(requiredParams);
      validator.validateCustomValidations(execValidations);
      resolve()
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}


/**
* @function checkRequiredParams
* @param  {type} receivedParams {description}
* @param  {type} requiredParams {description}
* @return {type} {description}
*/
var checkRequiredParams = function (receivedParams, requiredParams) {
  console.log('============== checkRequiredParams ==============');

  return new Promise((resolve, reject) => {
    const validator = new ParamsValidator(receivedParams);
    try {
      validator.validate(requiredParams);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}


/**s
* @function getDomainItem
* @param  {type} domain {description}
* @return {type} {description}
*/
var getDomainItem = function (cloud_id, app_id, domain) {
  console.log('============== getDomainItem ==============');
  return new Promise((resolve, reject) => {
    var payload = {
      TableName: `${STAGE}-${SERVICE}-domains`,
      Key: {
        "cloud_id-app_id": `${cloud_id}-${app_id}`,
        "name": domain
      },
      ConsistentRead: true,
      ReturnConsumedCapacity: 'TOTAL'
    }
    console.log(`payload: ${JSON.stringify(payload, null, 2)}`);
    ddb.get(payload, (err, data) => {
      if (err) return reject(err);
      console.log(JSON.stringify(data, null, 2));
      if (empty(data.Item)) return reject(ApiErrors.notFound.domain);
      let result = {};
      result.domain_id = data.Item.id;
      result.domain_name = data.Item.name;
      resolve(result);
    });
  });
}



CommonSteps.checkCertificateSerial = checkCertificateSerial;
CommonSteps.queryCertificateSerial = queryCertificateSerial;
CommonSteps.checkHeadersSignature = checkHeadersSignature;
CommonSteps.verifyHeadersSignature = verifyHeadersSignature;
CommonSteps.verifyAccessToken = verifyAccessToken
CommonSteps.writeAccessLog = writeAccessLog
CommonSteps.countDomains = countDomains
CommonSteps.validateParams = validateParams;
CommonSteps.checkRequiredParams = checkRequiredParams;
CommonSteps.getDomainItem = getDomainItem;

module.exports = CommonSteps;
