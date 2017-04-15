'use strict';

require('rootpath')();


// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION = process.env.SERVERLESS_REGION;
const STAGE = process.env.SERVERLESS_STAGE;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// ================ Modules =====================
const empty = require('is-empty');
const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const uuidV4 = require('uuid/v4');
const mysql = require('mysql');
const yaml = require('yamljs');
const moment = require( 'moment' );
const underScore  = require('underscore');


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
const s3 = new AWS.S3({apiVersion: '2006-03-01'});


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
* @function verifyHeadersSignature
* @param  {type} params     {description}
* @param  {type} headers    {description}
* @param  {type} public_key {description}
* @return {type} {description}
*/
var verifyHeadersSignature = function (params, headers, public_key) {
  console.log('============== verifyHeadersSignature ==============');

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
      if (receivedParams.domain) validator.validateDomain(receivedParams.domain);
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

var parseS3Record = function (s3_records) {
  console.log('============== parseS3Record ==============');
  let promises = s3_records.map((record, index, array) => {

    return new Promise((resolve, reject) => {

      var event_time = record.eventTime;
      var path = record.s3.object.key;
      // console.log(path);
      var size = record.s3.object.size;
      var key_array = path.split('/');
      var cloud_id = key_array[0];
      var app_id = key_array[1];
      var domain_id = key_array[2];
      var key = key_array[3];
      // console.log(key);
      var file_update_at = moment(event_time, moment.ISO_8601).unix();
      // console.log(file_update_at);
      var updated_at = Utility.getTimestamp();

      queryObject(app_id, domain_id, key, path, (err, data) => {
        if (err) reject(err);
        // else resolve(data);
        else {
          // console.log("************************queryObjectResolveResult");
          // console.log(data);
          // console.log(`event: ${JSON.stringify(data, null, 2)}`);
          data.app_id = app_id;
          data.domain_id = domain_id;
          data.key = key
          data.new_size = size;
          resolve(data);
        } // else
      }); // queryObject

    }); // Promise
  }); // map

  return Promise.all(promises);
}

var queryObject = function (app_id, domain_id, key, path, callback) {
  // console.log(app_id);
  // console.log(domain_id);
  // console.log(key);
  // console.log(path);
  var params = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    KeyConditionExpression: '#domain_id = :hkey and #key = :rkey',
    ExpressionAttributeNames:{
      "#domain_id": "domain_id",
      "#key": "key"
    },
    ExpressionAttributeValues: {
      ':hkey': domain_id,
      ':rkey': key
    }
  };

  ddb.query(params, function(err, data) {
     if (err) {
      console.log(err);
      callback(error);
    } else {
      // console.log(data);
      callback(null, data);
    }
  });

} // queryObject

var updateObjectUsage = function (objects) {
  console.log('============== updateObjectUsage ==============');
  // console.log(`${JSON.stringify(objects, null, 2)}`);
  // var domain_path_array = [];

  let promises = objects.map((object, index, array) => {

    return new Promise((resolve, reject) => {

      if (object.Count == 1) {
        // console.log(object);
        var key = object.Items[0].key;
        // console.log(key);
        var domain_path = object.Items[0].domain_path;
        var app_id = object.app_id;
        var domain_id = object.domain_id;
        var usage = object.new_size;
        // console.log(usage);
        var updated_at = Utility.getTimestamp();

        // domain_path_array = domain_path_array.push(domain_path);

        var payload = {
          TableName: `${STAGE}-${SERVICE}-${app_id}`,
          Key:{
              "domain_id": domain_id,
              "key": key
          },
          UpdateExpression: "set #usage = :usage, #updated_at = :updated_at",
          ConditionExpression: '#key = :key',
          ExpressionAttributeNames:{
              "#usage": "usage",
              "#key": "key",
              "#updated_at": "updated_at"
          },
          ExpressionAttributeValues:{
              ":usage": usage,
              ":key": key,
              ":updated_at": updated_at
          },
          ReturnValues:"UPDATED_NEW"
        };

        ddb.update(payload, function(err, data) {
          if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            reject(error);

          } else {
            // console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            data.domain_path = domain_path;
            resolve(data);
          }
        }); //ddb

      } // if
    }); // Promise
  }); // map

  return Promise.all(promises);

}

var getS3DomainUsage = function(updated_objects) {
  console.log('============== getS3ObjectUsage ==============');
  // console.log(promises);
  // console.log(`${JSON.stringify(updated_objects, null, 2)}`);

  var domain_path_array = [];
  updated_objects.forEach(function(object) {
    var domain_path = object.domain_path;
    domain_path_array.push(domain_path);
  });

  domain_path_array = underScore.uniq(domain_path_array);
  console.log(domain_path_array);

  let promises = domain_path_array.map((domain_path, index, array) => {
    return new Promise((resolve, reject) => {
      console.log(domain_path);


      pollingS3DomainUsage(domain_path, (err, data) => {
        resolve(data);
      });
      // resolve(pollingS3DomainUsage(domain_path));



    }); // Promise
  }); // map

  return Promise.all(promises);

}

function pollingS3DomainUsage(domain_path, callback) {

  var domain_path_tmp_array = domain_path.split('/');
  var cloud_id = domain_path_tmp_array[0];
  var app_id = domain_path_tmp_array[1];
  var domain_id = domain_path_tmp_array[2];

  console.log("**********domain_id")
  console.log(domain_id);

  var total_size = [];
  var initial_size = 0;
  // total_size.push(domain_id);

  var params = {
    Bucket: S3_BUCKET_NAME, /* required */
    // ContinuationToken: 'STRING_VALUE',
    MaxKeys: 2,
    Prefix: domain_path
  };

  s3.listObjectsV2(params, S3Callback);

  function S3Callback(err, data) {
      if (err) {
        console.error(err);
        callback(err)
      }
      else {
        var aaa = data.Contents.map(e => {
          var bb = {
            size: e.Size,
            key: e.Key,
            domain_id: domain_id
          }
          return bb;
        });
        // console.log(aaa);
        total_size = total_size.concat(aaa);
        // total_size.concat(data.Contents.map(e => e.Size));
        console.log(total_size);
        // console.log(data);           // successful response
        // console.log(`event: ${JSON.stringify(data, null, 2)}`);
        // console.log(data.IsTruncated);
        // console.log(data.NextContinuationToken);
        // console.log("**************************")
        // console.log('IsTruncated: ', typeof data.IsTruncated);

        // var initial_size = 0;
         var tmp = data.Contents.map(e => {
            console.log(e);
            initial_size = initial_size + e.Size;
          // return initial_size;
        });

        console.log(initial_size);

        if (data.IsTruncated) {
          params.ContinuationToken = data.NextContinuationToken;
          s3.listObjectsV2(params, S3Callback);
        } else {
          // callback(null, data);
          // console.log('Done: ', total_size.length);
          var final_result = {
            cloud_id: cloud_id,
            app_id: app_id,
            domain_id: domain_id,
            total_size: initial_size
          };
          return callback(null, final_result);
          // return callback(null, total_size);
          // return total_size;
        }
      }
  }

}

var queryDomain = function (domains) {
  console.log('============== queryDomain ==============');

  let promises = domains.map((domain, index, array) => {

    console.log(domain);
    var cloud_id = domain.cloud_id;
    var app_id = domain.app_id;
    var domain_id = domain.domain_id;
    var total_size = domain.total_size;

    return new Promise((resolve, reject) => {

      var params = {
        TableName: `${STAGE}-${SERVICE}-domains`,
        IndexName: 'cloud_id-app_id-id-index',
        KeyConditionExpression: '#hkey = :hkey and #rkey = :rkey',
        ExpressionAttributeNames:{
          "#hkey": "cloud_id-app_id",
          "#rkey": "id"
        },
        ExpressionAttributeValues: {
          ':hkey': cloud_id + "-" + app_id,
          ':rkey': domain_id
        }
      }; //params

      ddb.query(params, function(err, data) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else {
          data.cloud_id = cloud_id;
          data.app_id = app_id;
          data.domain_id = domain_id;
          data.total_size = total_size;
          console.log(data);
          resolve(data);
        }
      }); // ddb

    }); // Promise

  }); // map

  return Promise.all(promises);

}


var updateDomainUsage = function (domains) {
  console.log('============== updateDomainUsage ==============');
  // console.log(`${JSON.stringify(domains, null, 2)}`);

  let promises = domains.map((domain, index, array) => {

    console.log(domain);
    var cloud_id = domain.cloud_id;
    var app_id = domain.app_id;
    var name = domain.Items[0].name
    var domain_id = domain.domain_id;
    var total_size = domain.total_size;
    var updated_at = Utility.getTimestamp();


    return new Promise((resolve, reject) => {

      var payload = {
        TableName: `${STAGE}-${SERVICE}-domains`,
        Key:{
            "cloud_id-app_id": `${cloud_id}-${app_id}`,
            "name": name
        },
        UpdateExpression: "set #file_usage = :total_size, #updated_at = :updated_at",
        ConditionExpression: '#id = :domain_id',
        ExpressionAttributeNames:{
            "#file_usage": "file_usage",
            "#id": "id",
            "#updated_at": "updated_at"
        },
        ExpressionAttributeValues:{
            ":total_size": total_size,
            ":domain_id": domain_id,
            ":updated_at": updated_at
        },
        ReturnValues:"UPDATED_NEW"
      };

      ddb.update(payload, function(err, data) {
        if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          reject(error);

        } else {
          data.cloud_id = cloud_id;
          data.app_id = app_id;
          data.domain_id = domain_id;
          data.name = name;
          data.total_size = total_size;
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          resolve(data);
        }
      }); //ddb

    }); // Promise

  }); // map

  return Promise.all(promises);


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
CommonSteps.parseS3Record = parseS3Record;
CommonSteps.updateObjectUsage = updateObjectUsage;
CommonSteps.getS3DomainUsage = getS3DomainUsage;
CommonSteps.queryDomain = queryDomain
CommonSteps.updateDomainUsage = updateDomainUsage;


module.exports = CommonSteps;
