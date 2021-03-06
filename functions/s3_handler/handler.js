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

  // const headers = event.headers;
  // const receivedParams = paramsFetcher.fetchFrom(event);
  // const a = 'aaa'
  console.log("*********************************************");
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  // console.log(event);
  // console.log(event.Records);
  // console.log(event.Records[0]);

  const s3_record = event.Records;

  CommonSteps.parseS3Record(s3_record)
    .then((promises) => {
      return CommonSteps.updateObjectUsage(promises);
    })
    .then((promises) => {
      return CommonSteps.getS3DomainUsage(promises);
    })
    .then((promises) => {
      return CommonSteps.queryDomain(promises);
    })
    .then((promises) => {
      return CommonSteps.updateDomainUsage(promises);
    })
    .then((promises) => { // successful response
      console.log("Final succeeded:", JSON.stringify(promises, null, 2));
      callback();
    })
    .catch((err) => {
      console.error(`final error: ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
};