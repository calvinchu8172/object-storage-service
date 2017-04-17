'use strict';

// 載入環境參數
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION = process.env.SERVERLESS_REGION;
const STAGE = process.env.SERVERLESS_STAGE;

// 載入 AWS 相關服務
const AWS = require('aws-sdk');
const S3 = new AWS.S3({ region: REGION });
const SQS = new AWS.SQS({ region: REGION });
const docClient = new AWS.DynamoDB.DocumentClient({ region: REGION });
const sns = new AWS.SNS({ region: REGION });

// 載入外部模組
const fs = require('fs');
const yaml = require('yamljs');
// const randomstring         = require("randomstring");
const request = require('request');
const uuidV4 = require('uuid/v4');
const mysql = require('mysql');
const moment = require('moment');

const Utility = require('lib/utility.js');
const signatureGenerator = require('lib/signature_generator.js');
const serverlessYamlObject = yaml.load('serverless.yml');
const secrets = yaml.load(`secrets.${STAGE}.yml`);

const PUSH_TOKEN = secrets.push_token;



/**
* @function getDomain
* @param  {type} cloud_id {description}
* @param  {type} app_id   {description}
* @param  {type} name     {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
var getDomain = function (cloud_id, app_id, name, callback) {
  console.log(REGION);
  console.log(`${STAGE}-${SERVICE}-domains`);
  console.log("*********");
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Key: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'name': name
    }
  };

  docClient.get(params, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data.Item);
    }
  });
} // getJob


/**
* @function createDomainItem
* @param  {type} cloud_id {description}
* @param  {type} app_id   {description}
* @param  {type} name     {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
var createDomainItem = function (cloud_id, app_id, name, callback) {
  let domain_id = uuidV4();
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
      'created_at': Utility.getTimestamp(),
      'updated_by': '1.1.1.1',
      'updated_at': Utility.getTimestamp()
    },
    ConditionExpression: 'attribute_not_exists(#p_key)',
    ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
    ReturnConsumedCapacity: 'TOTAL'
  };
  docClient.put(params, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      let result = {
        data: data,
        domain_id: domain_id
      }
      callback(null, result);
    }
  });
}


/**
* @function deleteDomain
* @param  {type} cloud_id {description}
* @param  {type} app_id   {description}
* @param  {type} name     {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
var deleteDomain = function (cloud_id, app_id, name, callback) {
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Key: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'name': name
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
} // deleteDomain


/**
* @function createAccessToken
* @param  {type} token      {description}
* @param  {type} expires_in {description}
* @param  {type} callback   {description}
* @return {type} {description}
*/
var createAccessToken = function (token, expires_in, callback) {
  var queryString = 'INSERT INTO oauth_access_tokens SET ?';
  var oauth_access_token = {
    resource_owner_id: 79,
    application_id: 6,
    token: token,
    refresh_token: "refresh_token",
    expires_in: expires_in,
    created_at: moment.utc().format('YYYY-MM-DD hh:mm:ss'),
    scopes: ""
  }
  console.log(JSON.stringify(oauth_access_token));
  var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  connection.connect();
  connection.query(queryString, oauth_access_token, function (error, results, fields) {
    connection.end();
    if (error) {
      console.error(error);
      callback(error);
    }
    else {
      console.log(`results: ${JSON.stringify(results)}`);
      callback(null, results);
    }
  });
}


/**
* @function deleteAccessToken
* @param  {type} expired_token_id {description}
* @param  {type} callback         {description}
* @return {type} {description}
*/
var deleteAccessToken = function (expired_token_id, callback) {
  var queryString = `DELETE FROM oauth_access_tokens WHERE id = ${expired_token_id}`;
  var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  connection.connect();
  connection.query(queryString, function (error, results, fields) {
    connection.end();
    if (error) {
      console.error(error);
      callback(error);
    }
    else {
      console.log(`results: ${JSON.stringify(results)}`);
      callback();
    }
  });
}


/**
* @function createObjectItem
* @param  {type} domain_id {description}
* @param  {type} key       {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
var createObjectItem = function (domain_id, key, app_id, callback) {
  let objectItem = {
    domain_id: domain_id,
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
var deleteObjectItem = function (domain_id, key, app_id, callback) {
  var payload = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Key: {
      'domain_id': domain_id,
      'key': key
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



module.exports = {
  getDomain,
  createDomainItem,
  deleteDomain,
  createAccessToken,
  deleteAccessToken,
  createObjectItem,
  deleteObjectItem
};
