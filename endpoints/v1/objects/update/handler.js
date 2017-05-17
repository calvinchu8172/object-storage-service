
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
const _ = require('lodash');

// ================ Lib/Modules =================
const ParamsFetcher = require('lib/params_fetcher.js');
const CommonSteps = require('lib/common_steps');
const Utility = require('lib/utility.js');
const ApiErrors = require('lib/api_errors.js');

module.exports.handler = (event, context, callback) => {

  console.log(`event: ${JSON.stringify(event, null, 2)}`);
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
      return queryObjectItem(customs.domain_id, receivedParams.key, receivedParams.new_key, customs.app_id);
    })
    .then((oldItem) => {
      console.log(`oldItem: ${JSON.stringify(oldItem, null, 2)}`);
      return CommonSteps.writeAccessObjectLog(event, receivedParams, customs.domain_id, customs.user_info, oldItem);
    })
    .then((oldItem) => {
      let timestamp = Utility.getTimestamp();
      let key = receivedParams.new_key ? receivedParams.new_key : receivedParams.key;
      let newItem = {
        domain_id: customs.domain_id,
        key: key,
        id: oldItem.id,
        content_type: receivedParams.content_type,
        content: receivedParams.content,
        domain_path: oldItem.domain_path,
        path: `${oldItem.domain_path}/${key}`,
        created_at: timestamp,
        updated_at: timestamp
      };
      return updateObjectItem(oldItem, newItem, customs.app_id);
    })
    .then((diffItem) => {
      console.log(`diffItem: ${JSON.stringify(diffItem, null, 2)}`);
      if (receivedParams.new_key && diffItem.oldItem.content_type !== 'application/json' && !isJsonTypeObject) {
        return renameObject(diffItem);
      } else {
        return Promise.resolve(diffItem);
      }
    })
    .then((diffItem) => {
      return updateDomain(customs.cloud_id, customs.app_id, diffItem.oldItem, diffItem.newItem);
    })
    .then((newItemPath) => {
      if (isJsonTypeObject) {
        return Promise.resolve();
      } else {
        return generatePresignedURL(newItemPath, receivedParams.content_type);
      }
    })
    .then((signed_url) => {
      if (isJsonTypeObject) {
        callback();
      } else {
        let response = {};
        response['data'] = {};
        response['data']['upload_url'] = signed_url;
        callback(null, JSON.stringify(response));
      }
    })
    .catch((err) => {
      if (empty(err.httpStatus) || empty(err.code) || empty(err.message)) {
        console.error(err);
        err = ApiErrors.unexceptedError;
      }
      err = JSON.stringify(err);
      console.error(err);
      callback(err);
    });
}


/**
* @function queryObjectItem
* @param  {type} objectItem {description}
* @param  {type} app_id     {description}
* @return {type} {description}
*/
var queryObjectItem = function (domain_id, key, new_key, app_id) {
  console.log('============== queryObjectItem ==============');
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
    console.log(`payload: ${JSON.stringify(payload, null, 2)}`);

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
  console.log('============== updateObjectItem ==============');
  console.log(`newItem: ${JSON.stringify(newItem, null, 2)}`);

  return new Promise((resolve, reject) => {
    let usage = 0;
    if (newItem.content_type !== 'application/json') {
      // 假如 file type 修改為 file type，則不修改 usage
      if (oldItem.content_type !== 'application/json') {
        usage = oldItem.usage;
      }
      if (newItem.content) delete newItem.content;
    } else { // application/json
      usage = Buffer.byteLength(JSON.stringify(newItem.content), 'utf8');
    }
    newItem.usage = usage;

    var payload = {
      TableName: `${STAGE}-${SERVICE}-${app_id}`,
      Item: newItem,
      ConditionExpression: 'attribute_exists(#hkey)',
      ExpressionAttributeNames: {
        '#hkey': 'domain_id'
      },
      ReturnConsumedCapacity: 'TOTAL'
    };
    console.log(`payload: ${JSON.stringify(payload, null, 2)}`);
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
var updateDomain = function (cloud_id, app_id, oldItem, newItem) {
  console.log('============== updateDomain ==============');
  return new Promise((resolve, reject) => {
    let domain_id = oldItem.domain_id;
    let trans_type = getObjectTrasitionType(oldItem, newItem);
    updateDomainItem(cloud_id, app_id, domain_id, trans_type, oldItem.usage, newItem.usage, (err, data) => {
      if (err) reject(err);
      else {
        console.log(`data: ${JSON.stringify(data, null, 2)}`);
        resolve(newItem.path);
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
  console.log('============== getObjectTrasitionType ==============');
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
  console.log('============== updateDomainItem ==============');
  let expressionAttrNames = {
    "#id": "id",
    "#updated_at": "updated_at"
  };
  let expressionAttrValues = {
    ":domain_id": domain_id,
    ":updated_at": Utility.getTimestamp()
  };

  console.log(`old_usage: ${old_usage}`);
  console.log(`new_usage: ${new_usage}`);

  var expression = "set #updated_at = :updated_at";
  if (transType === 'json_to_json') {
    expression += `, #json_usage = #json_usage + :usage`;
    expressionAttrNames["#json_usage"] = "json_usage";
    expressionAttrValues[":usage"] = (new_usage - old_usage);
  }
  else if (transType === 'json_to_file') {
    expression += `, #json_usage = #json_usage - :old_usage`;
    expressionAttrNames["#json_usage"] = "json_usage";
    expressionAttrValues[":old_usage"] = old_usage;
    // file_usage 在上傳檔案時更新
  }
  else if (transType === 'file_to_json') {
    expression += `, #file_usage = #file_usage - :old_usage`;
    expression += `, #json_usage = #json_usage + :new_usage`;
    expressionAttrNames["#file_usage"] = "file_usage";
    expressionAttrNames["#json_usage"] = "json_usage";
    expressionAttrValues[":old_usage"] = old_usage;
    expressionAttrValues[":new_usage"] = new_usage;
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
    ExpressionAttributeNames: expressionAttrNames,
    ExpressionAttributeValues: expressionAttrValues,
    ReturnValues: "ALL_NEW"
  };
  console.log(`payload: ${JSON.stringify(payload, null, 2)}`);
  ddb.update(payload, function (err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      callback(err);
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      callback(null, data['Attributes']);
    }
  }); //ddb
}


/**
* @function generatePresignedURL
* @param  {type} path {description}
* @return {type} {description}
*/
var generatePresignedURL = function (path, content_type) {
  console.log('============== generatePresignedURL ==============');
  console.log(`S3_BUCKET: ${S3_BUCKET}`);
  console.log(`path: ${path}`);
  return new Promise((resolve, reject) => {
    var params = {
      Bucket: S3_BUCKET,
      Key: path,
      Expires: 3600, // 1 hour
      ContentType: content_type
    };
    console.log(`params: ${JSON.stringify(params, null, 2)}`);
    var url = s3.getSignedUrl('putObject', params, function (err, url) {
      if (err) reject(err);
      console.log('The URL is', url);
      resolve(url);
    });
  });
}

/**
* @function renameObject
* @param  {type} old_key {description}
* @param  {type} new_key {description}
* @return {type} {description}
*/
var renameObject = function (diffItem) {
  console.log('============== renameObject ==============');
  return new Promise((resolve, reject) => {
    let old_key = diffItem.oldItem.path;
    let new_key = diffItem.newItem.path;
    console.log(`old_key: ${old_key}`);
    console.log(`new_key: ${new_key}`);
    var params = {
      Bucket: S3_BUCKET,
      CopySource: `${S3_BUCKET}/${old_key}`,
      Key: new_key
    }
    console.log(`params: ${JSON.stringify(params, null, 2)}`);
    s3.copyObject(params, (err, data) => {
      if (err) {
        console.log(err, err.stack); // an error occurred
        if (err.code === 'NoSuchKey') {
          resolve(diffItem);
        } else {
          reject(err);
        }
      }
      else {
        console.log(data); // successful response
        s3.deleteObject({ Bucket: S3_BUCKET, Key: old_key }, (err, data) => {
          if (err) {
            console.log(err, err.stack); // an error occurred
            reject(err);
          }
          else {
            resolve(diffItem);
          }
        }); // s3.deleteObject(...) 
      }
    });
  });
}

