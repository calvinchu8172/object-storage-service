'use strict';

// tests for validate access token
// Generated by serverless-mocha-plugin

require('rootpath')();


// ================ Modules =====================
const mochaPlugin          = require('serverless-mocha-plugin');
const expect               = mochaPlugin.chai.expect;


// ================ ENVs ========================
const SERVICE              = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;


// ================ Lib/Modules =================
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require('lib/api_errors.js');
const testDescription      = require('./lib/test_description');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const lambda               = new AWS.Lambda({region: REGION});


describe('OSS_002: Access Token Validator', () => {

  let options = {};
  let customs = {};

  describe(`OSS_002_1: ${testDescription.accessTokenValidator.invalidAccessToken}`, function() {
    // describe('if client requests with that token', function() {
      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, function(done) {
        options.access_token = "invalid_access_token";
        let params = {
          FunctionName: `${SERVICE}-${STAGE}-validateAccessToken`, /* required */
          InvocationType: "RequestResponse",
          Payload: JSON.stringify(options)
        };
        console.log(JSON.stringify(params, null, 2));
        lambda.invoke(params, function (err, data) {
          if(err) {
            console.log(`err: ${JSON.stringify(err)}`);
            done(err);
          } else {
            console.log(`data: ${JSON.stringify(data)}`);
            expect(data.StatusCode).to.equal(200);
            let response = JSON.parse(data['Payload']);
            let body = JSON.parse(response.body);

            expect(response.statusCode).to.equal(401);
            expect(body.code).to.equal(ApiErrors.unauthorized.access_token_invalid.code);
            expect(body.message).to.equal(ApiErrors.unauthorized.access_token_invalid.message);

            done();
          }
        }); // lambda

      }); // it
    // }); // if client requests with that token
  }); // Given an invalid access token


  describe(`OSS_002_2: ${testDescription.accessTokenValidator.expiredAccessToken}`, function() {
    // describe('if client requests with that token', function() {

      before('Create Expired Token', function(done) {
        this.timeout(12000);
        console.log(`Create Expired Token...`);
        options.access_token = "expired_access_token";
        console.log(`options.access_token: ${options.access_token}`);
        testHelper.createAccessToken(options.access_token, 0, (err, data) => {
          if (err) {
            done(err);
          }
          else {
            customs.expired_token_id = data.insertId;
            console.log(`data.insertId: ${data.insertId}`);
            console.log(`customs.expired_token_id: ${customs.expired_token_id}`);
            done();
          }
        }); // registerDevice
      }); // before

      after('Delete Expired Token', function(done) {
        this.timeout(12000);
        console.log(`Delete Expired Token...`);
        console.log(`expired_token_id: ${customs.expired_token_id}`);
        testHelper.deleteAccessToken(customs.expired_token_id, (err, data) => {
          if (err) done(err);
          else done();
        }); // registerDevice
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`, function(done) {
        let params = {
          FunctionName: `${SERVICE}-${STAGE}-validateAccessToken`, /* required */
          InvocationType: "RequestResponse",
          Payload: JSON.stringify(options)
        };
        console.log(JSON.stringify(params, null, 2));
        lambda.invoke(params, function (err, data) {
          if(err) {
            console.log(`err: ${JSON.stringify(err)}`);
            done(err);
          } else {
            console.log(`data: ${JSON.stringify(data)}`);
            expect(data.StatusCode).to.equal(200);
            let response = JSON.parse(data['Payload']);
            let body = JSON.parse(response.body);

            expect(response.statusCode).to.equal(401);
            expect(body.code).to.equal(ApiErrors.unauthorized.access_token_expired.code);
            expect(body.message).to.equal(ApiErrors.unauthorized.access_token_expired.message);
            done();
          }
        }); // lambda

      }); // it
    // }); // if client requests with that token
  }); // Given an expired access token


  describe(`OSS_002_3: ${testDescription.accessTokenValidator.validAccessToken}`, function() {
    // describe('if client requests with that token', function() {

      before('Create Valid Token', function(done) {
        console.log(`Create Valid Token...`);
        options.access_token = "valid_access_token";
        console.log(`options.access_token: ${options.access_token}`);
        testHelper.createAccessToken(options.access_token, 21600, (err, data) => {
          if (err) {
            done(err);
          }
          else {
            customs.valid_token_id = data.insertId;
            console.log(`data.insertId: ${data.insertId}`);
            console.log(`customs.valid_token_id: ${customs.valid_token_id}`);
            done();
          }
        }); // registerDevice
      }); // before

      after('Delete Valid Token', function(done) {
        console.log(`Delete Valid Token...`);
        console.log(`valid_token_id: ${customs.valid_token_id}`);
        testHelper.deleteAccessToken(customs.valid_token_id, (err, data) => {
          if (err) done(err);
          else done();
        }); // registerDevice
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(testDescription.OKWithCloudIDAndAPPID)}`, function(done) {

        let params = {
          FunctionName: `${SERVICE}-${STAGE}-validateAccessToken`, /* required */
          InvocationType: "RequestResponse",
          Payload: JSON.stringify(options)
        };
        console.log(JSON.stringify(params, null, 2));
        lambda.invoke(params, function (err, data) {
          if (err) {
            console.log(`err: ${JSON.stringify(err)}`);
            done(err);
          } else {
            console.log(`data: ${JSON.stringify(data)}`);
            expect(data.StatusCode).to.equal(200);
            console.log('Payload: '+data.Payload);
            let payload = JSON.parse(data.Payload);
            console.log('payload.statusCode: ' + payload.statusCode);
            console.log('payload.body: ' + payload.body);
            expect(payload.statusCode).to.equal(200);
            let payload_body = JSON.parse(payload.body);
            expect(payload_body).to.have.all.keys('app_id', 'cloud_id');
            done();
          }
        }); // lambda

      }); // it
    // }); // if client requests with that token
  }); // Given an valid access token


});