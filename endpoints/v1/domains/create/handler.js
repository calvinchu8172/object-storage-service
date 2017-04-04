'use strict';

require( 'rootpath' )();
const AWS             = require('aws-sdk');
const SERVICE         = process.env.SERVERLESS_PROJECT;
const STAGE           = process.env.SERVERLESS_STAGE;
const REGION          = process.env.SERVERLESS_REGION;
const DOMAINS_LIMIT   = process.env.DOMAINS_LIMIT;
// const ddb             = new AWS.DynamoDB.DocumentClient({ region: REGION });
const paramsFetcher   = require('lib/params_fetcher.js');
const CommonSteps     = require('lib/common_steps');
const Utility = require( 'lib/utility.js' );

module.exports.handler = ( event, context, callback ) => {

  const headers = event.headers;
  const receivedParams = paramsFetcher.fetchFrom(event);
  // const a = 'aaa'

  console.log("************event:");
  console.log(event);
  console.log("************request_id:");
  console.log(event.request_id);
  console.log("************source_ip:");
  console.log(event.source_ip);
  console.log("************headers:");
  console.log(headers);
  console.log("************receivedParams");
  console.log(receivedParams);
  console.log("************");
  // console.log(SERVICE);
  // console.log(STAGE);
  // console.log(REGION);
  console.log(`${STAGE}-${SERVICE}-domains`);
  console.log("************certificate_serial:");
  const certificate_serial = receivedParams.certificate_serial
  // console.log(certificate_serial);

  CommonSteps.checkCertificateSerial(certificate_serial, (err, certificate_serial) => {
    if (err){
      console.log(err);
      return Promise.reject(err);
    }
    return Promise.resolve(certificate_serial);
  })
  .then((certificate_serial) => {
    return new Promise((resolve, reject) => {
      CommonSteps.queryCertificateSerial(certificate_serial, (err, public_key) => {
        if (err) reject(err);
        else resolve(public_key);
      });
    });
  })
  .then((public_key) => {
    return new Promise((resolve, reject) => {
      CommonSteps.checkHeadersSignature(headers, (err, signature) => {
        if (err) reject(err);
        else {
          let result = {
            public_key, signature
          };
          resolve(result);
        }
      });
    });
  })
  .then((result) => {
    console.log(result);
    return CommonSteps.verifyHeadersSignatureAsPromised(receivedParams, headers, result.public_key);
  })
  .then(() => {
    let requiredParams = ['access_token', 'domain'];
    return new Promise((resolve, reject) => {
      CommonSteps.checkRequiredParams(receivedParams, requiredParams, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      CommonSteps.verifyAccessToken(receivedParams.access_token, (err, cloud_id_and_app_id) => {
        if (err) reject(err);
        else resolve(cloud_id_and_app_id);
      });
    });
  })
  .then((cloud_id_and_app_id) => {
    return new Promise((resolve, reject) => {
      CommonSteps.writeAccessLog(event, receivedParams, cloud_id_and_app_id, (err, cloud_id_and_app_id) => {
        if (err) reject(err);
        else resolve(cloud_id_and_app_id);
      });
    });
  })
  .then((cloud_id_and_app_id) => {
    return new Promise((resolve, reject) => {
      // let hash_key = data;
      // console.log(hash_key);
      CommonSteps.countDomains(cloud_id_and_app_id, DOMAINS_LIMIT, (err, cloud_id_and_app_id) => {
        if (err) reject(err);
        else resolve(cloud_id_and_app_id);
      });
    });
  })
  .then((cloud_id_and_app_id) => {
    return new Promise((resolve, reject) => {
      // let hash_key = data;
      // console.log(hash_key);
      CommonSteps.createDomainItem(cloud_id_and_app_id, event, receivedParams, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  })
  .then((data) => { // successful response
    const response = { code: '0000', message: 'OK'};
    console.log(JSON.stringify(response, null, 2));
    callback(null, JSON.stringify(response));
  })
  .catch((err) => {
    console.log('final err: ' + err);
    console.log(typeof(err));
    callback(JSON.stringify(err));
  });



  // var payload = {
  //   TableName : `${STAGE}-${SERVICE}-domains`,
  //   Item: {
  //       'cloud_id-app_id': 'zyAXus2oEujRXzg8qNUCt2A-7c9e131ae86c0692042354821f23526929922dae666746b61801d630b84c72b1',
  //       'name': 'ecowork-oauth-client'
  //   },
  //   ConditionExpression: 'attribute_not_exists(#p_key)',
  //   ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
  //   ReturnConsumedCapacity: 'TOTAL'
  // };
  // ddb.put(payload, function(err, data) {
  //   if (err) console.log(err);
  //   else console.log(data);
  // });

  // const response = { code: '0000', message: 'OK' };
  // callback(null, response);

};