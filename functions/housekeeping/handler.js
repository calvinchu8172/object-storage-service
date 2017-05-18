'use strict';

require( 'rootpath' )();

// ================ ENVs ========================
const AWS             = require('aws-sdk');
const SERVICE         = process.env.SERVERLESS_PROJECT;
const STAGE           = process.env.SERVERLESS_STAGE;
const REGION          = process.env.SERVERLESS_REGION;
const S3_BUCKET_NAME  = process.env.S3_BUCKET_NAME;

// ================ Modules =====================
const S3FS            = require('s3fs');
const fsImpl          = new S3FS(S3_BUCKET_NAME, { region: REGION });
const isEmpty           = require('is-empty');


// ================ Lib/Modules =================
const paramsFetcher   = require('lib/params_fetcher.js');
const CommonSteps     = require('lib/common_steps');
const ApiErrors       = require('lib/api_errors.js');


// ================== AWS ===================
const ddb             = new AWS.DynamoDB.DocumentClient({ region: REGION });

module.exports.handler = ( event, context, callback ) => {
  console.log("*********************************************");
  // console.log(`event: ${JSON.stringify(event, null, 2)}`);

  let customs = {};

  CommonSteps.receiveSQSMessage()
    .then((data) => {
      // console.log(JSON.stringify(data, null, 2));
      customs.cloud_id = data.Messages[0].MessageAttributes.cloud_id.StringValue
      customs.app_id = data.Messages[0].MessageAttributes.app_id.StringValue
      customs.domain_id = data.Messages[0].MessageAttributes.domain_id.StringValue
      customs.receipt_handle = data.Messages[0].ReceiptHandle
      return getObjectItem( customs.app_id, customs.domain_id );
    })
    .then((data) => {
      customs.objects = data.Items
      console.log(customs)
      if (isEmpty(customs.objects) == false) {
        return deleteObjectItems(customs.app_id, data);
      }
    })
    .then((promises) => {
      if (isEmpty(customs.objects) == false) {
        return deleteDomainS3Folder(customs.cloud_id, customs.app_id, customs.domain_id);
        // return deleteDomainS3Folder(customs.cloud_id, customs.app_id, customs.domain_id, promises);
      }
    })
    .then((promises) => {
      return CommonSteps.deleteSQSMessage(customs.receipt_handle);
    })
    .then((data) => { // successful response
      console.log("Final succeeded:", JSON.stringify(data, null, 2));
      callback();
    })
    .catch((err) => {
      if (err == ApiErrors.notFound.sqs ) {
        callback(null, JSON.stringify(ApiErrors.notFound.sqs));
      } else {
        console.error(`final error: ${JSON.stringify(err)}`);
        callback(JSON.stringify(err));
      }
    });

};


var getObjectItem = function (app_id, domain_id) {
  console.log('============== getObjectItem ==============');
  return new Promise((resolve, reject) => {
    var payload = {
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

    ddb.query(payload, function (err, data) {
      console.log(`data: ${JSON.stringify(data, null, 2)}`);
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      }
      else {
        resolve(data);
      }
    }); // ddb
  }); // Promise
} // getObjectItem

var deleteObjectItems = function (app_id, data) {
  console.log('============== deleteObjectItems ==============');
  console.log(data.Items);
  let promises = data.Items.map((item, index, array) => {
    return new Promise((resolve, reject) => {
      console.log(item);

      var payload = {
        TableName: `${STAGE}-${SERVICE}-${app_id}`,
        Key: {
          'domain_id': item.domain_id,
          'id': item.id
        }
      }; // payload

      ddb.delete(payload, function (err, data) {
        if (err) {
          console.log(err);
          reject(ApiErrors.unexceptedError);
        } else {
          console.log(data);
          resolve(item.domain_path);
        }
      }); // delete

    }); // Promise
  }); // map

  return Promise.all(promises);
}


// var deleteDomainS3Folder = function (cloud_id, app_id, domain_id, domain_paths) {
var deleteDomainS3Folder = function (cloud_id, app_id, domain_id) {
  console.log('============== deleteDomainS3Folder ==============');
  return new Promise((resolve, reject) => {

    var domain_path = `${cloud_id}/${app_id}/${domain_id}`
    console.log(domain_path);

    fsImpl.rmdirp( domain_path, function(err, data) {
      if (err) {
        console.log(err);
        reject(ApiErrors.unexceptedError);
      } else {
        console.log(data);
        resolve(data);
      }
    }); // fsImpl

  }); // Promise

}

