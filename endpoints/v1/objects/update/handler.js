
'use strict';

require('rootpath')();

// ================ ENVs ========================
const SERVICE = process.env.SERVERLESS_PROJECT;
const STAGE = process.env.SERVERLESS_STAGE;
const REGION = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// ================ AWS =====================
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const s3 = new AWS.S3({ region: REGION });

// ================ Modules =====================
const uuidV4 = require('uuid/v4');
const empty = require('is-empty');

// ================ Lib/Modules =================
const ParamsFetcher = require('lib/params_fetcher.js');
const CommonSteps = require('lib/common_steps');
const Utility = require('lib/utility.js');
const ApiErrors = require('lib/api_errors.js');

module.exports.handler = (event, context, callback) => {

  let receivedParams = event.body;
  let headers = event.headers;
  let path = event.path;
  let source_ip = event.source_ip;
  let certificate_serial = receivedParams.certificate_serial;
  receivedParams.domain = path.domain;
  receivedParams.key = path.key;
  let customs = {};
  let isJsonTypeObject = (receivedParams.content_type === 'application/json');

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
      let requiredParams = ['access_token', 'domain', 'key', 'content_type'];
      let execValidations = ['validateContentType'];
      if (isJsonTypeObject) {
        requiredParams.push('content');
        execValidations.push('validateContent');
      }
      if (receivedParams.new_key) {
        execValidations.push('validateNewKey');
      }
      return CommonSteps.validateParams(receivedParams, requiredParams, execValidations);
    })
    .then(() => {
      return CommonSteps.verifyAccessToken(receivedParams.access_token);
    })
    .then((user_info) => {
      customs.user_info = user_info;
      customs.app_id = user_info.app_id;
      customs.cloud_id = user_info.cloud_id;
    })
    .then(() => {
      return CommonSteps.getDomainItem(customs.cloud_id, customs.app_id, receivedParams.domain);
    })
    .then((result) => {
      customs.domain_id = result.domain_id;
      customs.domain_name = result.domain_name;
      console.log(`customs.domain_id: ${customs.domain_id}`);
      console.log(`customs.domain_name: ${customs.domain_name}`);
      return queryObjectItem(customs.domain_id, receivedParams.key, receivedParams.new_key);
    })
    .then((oldItem) => {
      return CommonSteps.writeAccessObjectLog(event, receivedParams, customs.domain_id, customs.user_info, oldItem);
    })
    .then((oldItem) => {
      let newItem = {
        domain_id: customs.domain_id,
        key: receivedParams.key,
        id: object_id,
        content_type: receivedParams.content_type,
        content: receivedParams.content,
        domain_path: domain_path,
        path: path,
        created_at: timestamp,
        updated_at: timestamp
      };
      return UpdateObjectItem(oldItem, newItem, customs.app_id);
    })
    .then((diffItem) => {
      return UpdateObjectDomain(diffItem.oldItem, diffItem.newItem);
    })
}


/**
* @function queryObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var queryObjectItem = function (domain_id, key, new_key, app_id) {
  return new Promise((resolve, reject) => {
    // 1. 查詢指定的 key 是否存在，若不存在在返回 "指定的 key 不存在"
    // 2. 查詢 new_key 是否已存在，若存在則不予更名
    var key_list = [key];
    if (new_key) {
      key_list.push(new_key);
    }
    var payload = {
      TableName: `${STAGE}-${SERVICE}-${app_id}`,
      KeyConditions: {
        'domain_id': {
          ComparisonOperator: 'EQ',
          AttributeValueList: [domain_id]
        }
      },
      QueryFilter: {
        'key': {
          ComparisonOperator: 'IN',
          AttributeValueList: key_list
        }
      }
    }; //params
    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else if (data.Items && data.Items.length > 0) {
        var foundObj = _.find(data.Items, function (i) { return i.key == key; });
        if (foundObj) {
          var duplicatedObj = _.find(data.Items, function (i) { return i.key == new_key; });
          if (duplicatedObj) {
            reject(ApiErrors.validationFailed.key_duplicated);
          } else {
            resolve(foundObj);
          }
        }
      }

      // 1. if data.Item.length == 0
      // 2. if !foundObj
      reject(ApiErrors.notFound.object);

    });
  });
}



/**
* @function createObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var updateObjectItem = function (oldItem, newItem, app_id) {
  console.log('============== createDomainItem ==============');
  console.log(`newItem: ${JSON.stringify(newItem, null, 2)}`);

  return new Promise((resolve, reject) => {
    let usage = 0;
    if (newItem.content_type !== 'application/json') {
      delete newItem.content;

    } else { // application/json
      usage = Buffer.byteLength(JSON.stringify(newItem.content), 'utf8');
      newItem.usage = usage;
    }

    var payload = {
      TableName: `${STAGE}-${SERVICE}-${app_id}`,
      Item: newItem,
      ConditionExpression: 'attribute_exists(#hkey)',
      ExpressionAttributeNames: {
        '#hkey': 'domain_id'
      },
      ReturnConsumedCapacity: 'TOTAL'
    };
    ddb.put(payload, function (err, data) {
      if (err) {
        console.error(`err: ${err}`);
        reject(ApiErrors.unexceptedError);
      }
      else {
        console.log(`data: ${JSON.stringify(data)}`);
        let diffItem = {
          oldItem: oldItem,
          newItem: newItem
        }
        resolve(diffItem);
      }
    });
  });
}

/**
* @function UpdateObjectDomain
* @param  {type} oldItem {description}
* @param  {type} newItem {description}
* @return {type} {description}
*/
var UpdateObjectDomain = function (oldItem, newItem) {
  return new Promise((resolve, reject) => {
    let domain_id = oldItem.domain_id;
    let trans_type = getObjectTrasitionType(oldItem, newItem);
    updateDomainItem(customs.cloud_id, customs.app_id, domain_id, trans_type, old_usage, new_usage, (err, data) => {
      if(err) reject(err);
      else {
        console.log(`data: ${JSON.stringify(data, null, 2)}`);
        resolve(data);
      }
    });
  });
}


/**
* @function getObjectTrasitionType
* @param  {type} oldItem {description}
* @param  {type} newItem {description}
* @return {type} {description}
*/
function getObjectTrasitionType(oldItem, newItem) {
  let transitionType = "";
  transitionType = (oldItem.content_type === 'application/json') ? (transitionType + "json") : (transitionType + "file");
  transitionType += "_to_";
  transitionType = (newItem.content_type === 'application/json') ? (transitionType + "json") : (transitionType + "file");
  return transitionType;
}


/**
* @function updateDomainItem
* @param  {type} cloud_id  {description}
* @param  {type} app_id    {description}
* @param  {type} domain_id {description}
* @param  {type} transType {description}
* @param  {type} old_item  {description}
* @param  {type} new_item  {description}
* @param  {type} callback  {description}
* @return {type} {description}
*/
function updateDomainItem(cloud_id, app_id, domain_id, transType, old_usage, new_usage, callback) {

  var expression = "set #updated_at = :updated_at";
  if (transType == 'json_to_json') {
    expression += `, json_usage = json_usage - ${old_usage} + ${new_usage}`;
  }
  else if (transType == 'json_to_file') {
    expression += `, json_usage = json_usage - ${old_usage}`;
    // file_usage 在上傳檔案時更新
  }
  else if (transType == 'file_to_json') {
    expression += `, file_usage = file_usage - ${old_usage}`;
    expression += `, json_usage = json_usage + ${new_usage}`;
  }

  console.log(`expression: ${expression}`);

  var payload = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Key: {
      "cloud_id-app_id": `${cloud_id}-${app_id}`,
      "id": domain_id
    },
    UpdateExpression: expression,
    ConditionExpression: '#id = :domain_id',
    ExpressionAttributeNames: {
      "#file_usage": "file_usage",
      "#id": "id",
      "#updated_at": "updated_at"
    },
    ExpressionAttributeValues: {
      ":domain_id": domain_id,
      ":updated_at": updated_at
    },
    ReturnValues: "UPDATED_NEW"
  };

  ddb.update(payload, function (err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      reject(err);
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      resolve(data);
    }
  }); //ddb

}