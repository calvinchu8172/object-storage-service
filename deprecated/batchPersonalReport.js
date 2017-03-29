'use strict';

// tests for batchPersonalReport
// Generated by serverless-mocha-plugin

const AWS             = require('aws-sdk');
const lambda          = new AWS.Lambda({ region: REGION });

const mod = require('../index.js');
const mochaPlugin = require('serverless-mocha-plugin');

const lambdaWrapper = mochaPlugin.lambdaWrapper;
const expect = mochaPlugin.chai.expect;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'batchPersonalReportHandler' });

describe('batchPersonalReport', () => {
  // before((done) => {
  //   // lambdaWrapper.init(liveFunction); // Run the deployed lambda
  // });

  it('should run the deployed function', () => {

    const checkJobStatusEvent = { job_id: 'c0db5991-ed43-4621-81cc-a283f1b530dc' };

    const params = {
      FunctionName: `serverless-private-push-service-alpha-batchPersonalReport`,
      InvocationType: 'Event',
      Payload: JSON.stringify(checkJobStatusEvent)
    };

    lambda.invoke(params, function(err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        return Promise.reject(err);
      } else {
        expect(data).to.not.be.empty;
        return Promise.resolve();
      }
    });

    // return wrapped.run({}).then((response) => {
    //   expect(response).to.not.be.empty;
    // });
  });
});
