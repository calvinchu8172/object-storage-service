'use strict';

// Example:
//
//   require('rootpath')();
//   const dyop = require('lib/dynamodb_operator.js')
//
//   var operation = 'create';
//   var payload = {
//     TableName: `${SERVICE}-${STAGE}-devices`,
//     Item: { udid: "udid" },
//     ReturnConsumedCapacity: 'TOTAL'
//   }
//   dyop.execute(operation, payload);

const AWS = require('aws-sdk');
const REGION = process.env.SERVERLESS_REGION;
// const endpoint = 'http://localhost:8000';
// const endpoint = 'https://dynamodb.us-east-1.amazonaws.com';
const ddb = new AWS.DynamoDB.DocumentClient({
    region: REGION
});

module.exports.execute = (operation, payload, callback) => {
  console.log(`dynamodb_operator: operation = ${operation}`);
  switch (operation) {
    case 'create':
      ddb.put(payload, callback);
      break;
    case 'read':
      ddb.get(payload, callback);
      break;
    case 'update':
      ddb.update(payload, callback);
      break;
    case 'delete':
      ddb.delete(payload, callback);
      break;
    case 'query':
      ddb.query(payload, callback);
      break;
    case 'list':
      ddb.scan(payload, callback);
      break;
    default:
      console.error(new Error(`Unrecognized operation "${operation}"`));
  }
};
