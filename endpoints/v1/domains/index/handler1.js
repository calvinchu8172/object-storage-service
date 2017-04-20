'use strict';

require( 'rootpath' )();
const AWS             = require('aws-sdk');
const SERVICE         = process.env.SERVERLESS_PROJECT;
const STAGE           = process.env.SERVERLESS_STAGE;
const REGION          = process.env.SERVERLESS_REGION;
const ddb             = new AWS.DynamoDB.DocumentClient({ region: REGION });
const paramsFetcher   = require('lib/params_fetcher.js');
const CommonSteps     = require('lib/common_steps');

module.exports.handler = ( event, context, callback ) => {

  const headers = event.headers;
  const receivedParams = paramsFetcher.fetchFrom(event);
  // const a = 'aaa'

  console.log(event);
  console.log("************");
  console.log(headers);
  console.log("************");
  console.log(receivedParams);
  console.log("************");

  const response = { code: '0000', message: 'OK' };
  callback(null, response);

};