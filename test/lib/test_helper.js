'use strict';

// 載入環境參數
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION = process.env.SERVERLESS_REGION;
const STAGE = process.env.SERVERLESS_STAGE;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME

// 載入 AWS 相關服務
const AWS = require('aws-sdk');
const S3 = new AWS.S3({ region: REGION });
const SQS = new AWS.SQS({ region: REGION });
const docClient = new AWS.DynamoDB.DocumentClient({ region: REGION });
const sns = new AWS.SNS({ region: REGION });
const lambda = new AWS.Lambda({ region: REGION });

// 載入外部模組
const fs = require('fs');
const yaml = require('yamljs');
// const randomstring         = require("randomstring");
const request = require('request');
const uuidV4 = require('uuid/v4');
const mysql = require('mysql');
const moment = require('moment');
const empty = require('is-empty');

const Utility = require('lib/utility.js');
const signatureGenerator = require('lib/signature_generator.js');
const serverlessYamlObject = yaml.load('serverless.yml');
const secrets = yaml.load(`secrets.${STAGE}.yml`);



/**
* @function getDomain
* @param  {type} cloud_id    {description}
* @param  {type} app_id      {description}
* @param  {type} domain_name {description}
* @param  {type} callback    {description}
* @return {type} {description}
*/
var getDomain = function (cloud_id, app_id, domain_name, callback) {
  console.log('============== test_helper.getDomain ==============');
  var hash_key = `${cloud_id}-${app_id}`;
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    IndexName: 'cloud_id-app_id-name-index',
    KeyConditionExpression: '#hkey = :hkey and #rkey = :rkey',
    ExpressionAttributeNames: {
      "#hkey": "cloud_id-app_id",
      "#rkey": "name"
    },
    ExpressionAttributeValues: {
      ':hkey': hash_key,
      ':rkey': domain_name
    }
  }; //params
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  docClient.query(params, function (err, data) {
    if (err) {
      callback(err);
    }
    else if (!empty(data.Items)) {
      callback(null, data.Items[0]);
    }
    else {
      callback(new Error(`Domain Item Not Found ...`));
    }
  });
} // getDomain



/**
* @function getObject
* @param  {type} cloud_id  {description}
* @param  {type} app_id    {description}
* @param  {type} domain_id {description}
* @param  {type} key       {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var getObject = function (cloud_id, app_id, domain_id, key, callback) {
  console.log('============== test_helper.getObject ==============');

  var params = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    IndexName: 'domain_id-key-index',
    KeyConditionExpression: '#hkey = :hkey and #rkey = :rkey',
    ExpressionAttributeNames: {
      "#hkey": "domain_id",
      "#rkey": "key"
    },
    ExpressionAttributeValues: {
      ':hkey': domain_id,
      ':rkey': key
    }
  }; //params
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  docClient.query(params, function (err, data) {
    if (err) {
      callback(err);
    }
    else if (!empty(data.Items)) {
      callback(null, data.Items[0]);
    }
    else {
      callback(new Error(`Object Item Not Found ...`));
    }
  });

} // getObject


/**
* @function createDomainItem
* @param  {type} cloud_id  {description}
* @param  {type} app_id    {description}
* @param  {type} name      {description}
* @param  {type} domain_id {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var createDomainItem = function (cloud_id, app_id, name, domain_id, callback) {
  console.log('============== test_helper.createDomainItem ==============');
  let timestamp = Utility.getTimestamp();
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Item: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'name': name,
      'id': domain_id,
      'app_id': app_id,
      'json_usage': 0,
      'file_usage': 0,
      'created_by': '1.1.1.1',
      'created_at': timestamp,
      'updated_by': '1.1.1.1',
      'updated_at': timestamp
    },
    ConditionExpression: 'attribute_not_exists(#p_key)',
    ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
    ReturnConsumedCapacity: 'TOTAL'
  };
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  docClient.put(params, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      data.domain_id = domain_id;
      callback(null, data);
    }
  });
}


/**
* @function createObjectItem1
* @param  {type} cloud_id     {description}
* @param  {type} app_id       {description}
* @param  {type} key          {description}
* @param  {type} domain_id    {description}
* @param  {type} content_type {description}
* @param  {type} callback     {description}
* @return {type} {description}
*/
var createObjectItem1 = function (cloud_id, app_id, key, domain_id, object_id, content_type, callback) {

  var timestamp = Utility.getTimestamp()
  var content;

  if (content_type == 'application/json') {
    content = {
      "message": "OK"
    }
    content = JSON.stringify(content);
  } else {
    content = null
  }

  var payload = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Item: {
      'domain_id': domain_id,
      'key': key,
      'id': object_id,
      'content_type': content_type,
      'content': content,
      'domain_path': `${cloud_id}/${app_id}/${domain_id}`,
      'path': `${cloud_id}/${app_id}/${domain_id}/${key}`,
      'usage': 0,
      'file_created_at': timestamp,
      'file_updated_at': timestamp,
      'created_at': timestamp,
      'updated_at': timestamp
    },
    ReturnConsumedCapacity: 'TOTAL'
  };
  docClient.put(payload, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data);
    }
  });

}



/**
* @function uploadS3ObjectItem
* @param  {type} cloud_id     {description}
* @param  {type} app_id       {description}
* @param  {type} object       {description}
* @param  {type} domain_id    {description}
* @param  {type} content_type {description}
* @param  {type} callback     {description}
* @return {type} {description}
*/
var uploadS3ObjectItem = function (cloud_id, app_id, object, domain_id, content_type, callback) {
  fs.readFile(`./test/tmp/${object}`, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // upload file to s3 bucket
      console.log(data);
      var params = {
        Bucket: S3_BUCKET_NAME,
        Key: `${cloud_id}/${app_id}/${domain_id}/${object}`,
        // Key: `${cloud_id}/${app_id}/aaaaa/test4_mocha.png`,
        ACL: 'public-read',
        Body: data
      };
      S3.putObject(params, (err, data) => {
        if (err) {
          console.error(err);
          callback(err);
          // reject(apiErrors.exceptionalErrorHappened);
        } else {
          console.log("Uploaded with success!");
          console.log(data);
          callback(null, data);
          // resolve(job);
        }
      }); // putObject
    } // else
  }); // fs
} // uploadObjectItem


/**
* @function deleteS3ObjectItem
* @param  {type} cloud_id     {description}
* @param  {type} app_id       {description}
* @param  {type} object       {description}
* @param  {type} domain_id    {description}
* @param  {type} content_type {description}
* @param  {type} callback     {description}
* @return {type} {description}
*/
var deleteS3ObjectItem = function (cloud_id, app_id, object, domain_id, content_type, callback) {

  var params = {
    Bucket: S3_BUCKET_NAME,
    Key: `${cloud_id}/${app_id}/${domain_id}/${object}`
  };

  S3.deleteObject(params, (err, data) => {
    if (err) {
      console.error(err);
      callback(err);
      // reject(apiErrors.exceptionalErrorHappened);
    } else {
      console.log("Deleted with success!");
      console.log(data);
      callback(null, data);
      // resolve(job);
    }
  }); // putObject
} // deleteS3ObjectItem



/**
* @function deleteDomain
* @param  {type} cloud_id  {description}
* @param  {type} app_id    {description}
* @param  {type} domain_id {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var deleteDomain = function (cloud_id, app_id, domain_id, callback) {
  console.log('============== test_helper.deleteDomain ==============');
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Key: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'id': domain_id
    }
  };
  console.log(`params: ${JSON.stringify(params, null, 2)}`);
  docClient.delete(params, function (err, data) {
    if (err) {
      console.log(err);
      return callback(err); // an error occurred
    }
    else {
      console.log(data);
      return callback(null, data);           // successful response
    }
  });
} // deleteDomain


/**
* @function deleteObject
* @param  {type} cloud_id  {description}
* @param  {type} app_id    {description}
* @param  {type} object    {description}
* @param  {type} domain_id {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var deleteObject = function (cloud_id, app_id, object_id, domain_id, callback) {
  console.log('============== test_helper.deleteObject ==============');
  var params = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Key: {
      'domain_id': domain_id,
      'id': object_id
    }
  };

  docClient.delete(params, function (err, data) {
    if (err) {
      console.log(err);
      return callback(err); // an error occurred
    }
    else {
      console.log(data);
      return callback(null, data);           // successful response
    }
  });
} // deleteObject



/**
* @function createObjectItem
* @param  {type} domain_id {description}
* @param  {type} key       {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var createObjectItem = function (domain_id, object_id, key, app_id, callback) {
  let objectItem = {
    domain_id: domain_id,
    id: object_id,
    key: key
  };
  console.log(`objectItem: ${JSON.stringify(objectItem, null, 2)}`);
  var payload = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Item: objectItem,
    ConditionExpression: 'attribute_not_exists(#hkey)',
    ExpressionAttributeNames: {
      '#hkey': 'domain_id'
    },
    ReturnConsumedCapacity: 'TOTAL'
  };
  docClient.put(payload, function (err, data) {
    if (err) {
      console.error(`err: ${err}`);
      if (err.code == 'ConditionalCheckFailedException') return callback(null, data);
      callback(err);
    }
    else {
      callback(null, data);
    }
  });
}


/**
* @function deleteObjectItem
* @param  {type} domain_id {description}
* @param  {type} key       {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var deleteObjectItem = function (domain_id, object_id, app_id, callback) {
  var payload = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Key: {
      'domain_id': domain_id,
      'id': object_id
    }
  };
  docClient.delete(payload, function (err, data) {
    if (err) {
      console.log(err);
      return callback(err); // an error occurred
    }
    else {
      console.log(data);
      return callback(null, data);           // successful response
    }
  });
} // deleteDomain



/**
* @function createAccessToken
* @param  {type} token      {description}
* @param  {type} expires_in {description}
* @param  {type} callback   {description}
* @return {type} {description}
*/
var createAccessToken = function (token, expires_in, callback) {
  let payload = {
    functionName: 'createAccessToken',
    token: token,
    expires_in: expires_in
  }
  let params = {
    FunctionName: `${SERVICE}-${STAGE}-RdsOperator`, /* required */
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(payload)
  };
  lambda.invoke(params, function (err, data) {
    if (err) {
      console.error(err, err.stack); // an error occurred
      callback(err);
    }
    else {
      console.log(JSON.stringify(data, null, 2));           // successful response
      if (data.StatusCode === 200) {
        data = JSON.parse(data.Payload);
        callback(null, data);
      } else {
        callback(data);
      }
    }
  }); // lambda
}


/**
* @function deleteAccessToken
* @param  {type} expired_token_id {description}
* @param  {type} callback         {description}
* @return {type} {description}
*/
var deleteAccessToken = function (expired_token_id, callback) {

  let payload = {
    functionName: 'deleteAccessToken',
    expired_token_id: expired_token_id
  }
  let params = {
    FunctionName: `${SERVICE}-${STAGE}-RdsOperator`, /* required */
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(payload)
  };
  lambda.invoke(params, function (err, data) {
    if (err) {
      console.error(err, err.stack); // an error occurred
      callback(err);
    }
    else {
      console.log(JSON.stringify(data, null, 2));           // successful response
      if (data.StatusCode === 200) {
        data = JSON.parse(data.Payload);
        callback(null, data);
      } else {
        callback(data);
      }
    }
  }); // lambda
}



module.exports = {
  getDomain,
  getObject,
  createDomainItem,
  createObjectItem1,
  uploadS3ObjectItem,
  deleteS3ObjectItem,
  deleteDomain,
  deleteObject,
  createAccessToken,
  deleteAccessToken,
  createObjectItem,
  deleteObjectItem
};
