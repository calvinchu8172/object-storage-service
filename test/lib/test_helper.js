'use strict';

// 載入環境參數
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION  = process.env.SERVERLESS_REGION;
const STAGE   = process.env.SERVERLESS_STAGE;
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

const Utility = require('lib/utility.js');
const signatureGenerator = require('lib/signature_generator.js');
const serverlessYamlObject = yaml.load('serverless.yml');
const secrets = yaml.load(`secrets.${STAGE}.yml`);



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
} // getDomain

var getObject = function(cloud_id, app_id, domain_id, key, callback) {
  console.log(REGION);
  console.log(`${STAGE}-${SERVICE}-${app_id}`);
  console.log("*********");
  var params = {
    TableName : `${STAGE}-${SERVICE}-${app_id}`,
    Key: {
      'domain_id': domain_id,
      'key': key
    }
  };

  docClient.get(params, function(err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data.Item);
    }
  });
} // getObject

/**
* @function createDomainItem
* @param  {type} cloud_id {description}
* @param  {type} app_id   {description}
* @param  {type} name     {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
var createDomainItem = function(cloud_id, app_id, name, domain_id, callback) {
  // var domain_id = uuid.v4()
  // var domain_id = '5743356b-e71f-48cd-b915-019171a7a6a6'
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
      data.domain_id = domain_id;
      callback(null, data);
    }
  });
}

var createObjectItem1 = function(cloud_id, app_id, key, domain_id, content_type, callback) {
  // var object_id = uuid.v4();
  var object_id = '6396f119-98a4-459a-b86a-df258a44c918'
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
    // ConditionExpression: 'attribute_not_exists(#hkey)',
    // ExpressionAttributeNames: {
      // '#hkey': 'cloud_id-app_id'
    // },
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

var uploadS3ObjectItem = function(cloud_id, app_id, object, domain_id, content_type, callback) {

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

var deleteS3ObjectItem = function(cloud_id, app_id, object, domain_id, content_type, callback) {

  var params = {
    Bucket: S3_BUCKET_NAME,
    Key: `${cloud_id}/${app_id}/${domain_id}/${object}`
    // Key: `${cloud_id}/${app_id}/aaaaa/test4_mocha.png`,
    // ACL: 'public-read',
    // Body: data
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

var deleteObject = function (cloud_id, app_id, object, domain_id, callback) {
  var params = {
    TableName: `${STAGE}-${SERVICE}-${app_id}`,
    Key: {
      'domain_id': domain_id,
      'key': object
    }
  };

  docClient.delete(params, function(err, data) {
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
      if(data.StatusCode === 200) {
        data = JSON.parse(data.Payload);
        callback(null, data);
      } else {
        callback(data);
      }
    }
  }); // lambda

  // var queryString = 'INSERT INTO oauth_access_tokens SET ?';
  // var oauth_access_token = {
  //   resource_owner_id: 79,
  //   application_id: 6,
  //   token: token,
  //   refresh_token: "refresh_token",
  //   expires_in: expires_in,
  //   created_at: moment.utc().format('YYYY-MM-DD hh:mm:ss'),
  //   scopes: ""
  // }
  // console.log(JSON.stringify(oauth_access_token));
  // var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  // connection.connect();
  // connection.query(queryString, oauth_access_token, function (error, results, fields) {
  //   connection.end();
  //   if (error) {
  //     console.error(error);
  //     callback(error);
  //   }
  //   else {
  //     console.log(`results: ${JSON.stringify(results)}`);
  //     callback(null, results);
  //   }
  // });
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
      if(data.StatusCode === 200) {
        data = JSON.parse(data.Payload);
        callback(null, data);
      } else {
        callback(data);
      }
    }
  }); // lambda

  // var queryString = `DELETE FROM oauth_access_tokens WHERE id = ${expired_token_id}`;
  // var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  // connection.connect();
  // connection.query(queryString, function (error, results, fields) {
  //   connection.end();
  //   if (error) {
  //     console.error(error);
  //     callback(error);
  //   }
  //   else {
  //     console.log(`results: ${JSON.stringify(results)}`);
  //     callback();
  //   }
  // });
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
