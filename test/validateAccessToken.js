'use strict';

// tests for validate access token
// Generated by serverless-mocha-plugin

require('rootpath')();

// ================ ENVs ========================
const SERVICE              = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;


// ================ Modules =====================
const mochaPlugin          = require('serverless-mocha-plugin');
const expect               = mochaPlugin.chai.expect;


// ================ Lib/Modules =================
const testHelper           = require('./lib/test_helper');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const lambda               = new AWS.Lambda({region: REGION});


// const serverlessYamlObject = YAML.load('serverless.yml');

describe('Access Token Validator', () => {

  let options = {};
  let customs = {};

  describe('Given an invalid access token', function() {
    describe('if client requests with that token', function() {
      it('should return HTTP 401: { "code": "401.0", "message": "Invalid access_token" }', function(done) {
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
            expect(body.code).to.equal('401.0');
            expect(body.message).to.equal('Invalid access_token');
            done();
          }
        }); // lambda

      }); // it
    }); // if client requests with that token
  }); // Given an invalid access token


  describe('Given an expired access token', function() {
    describe('if client requests with that token', function() {

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

      it('should return HTTP 401: { "code": "401.1", "message": "Access Token Expired" }', function(done) {
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
            expect(body.code).to.equal('401.1');
            expect(body.message).to.equal('Access Token Expired');
            done();
          }
        }); // lambda

      }); // it
    }); // if client requests with that token
  }); // Given an expired access token


  describe('Given an valid access token', function() {
    describe('if client requests with that token', function() {

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

      it('should return HTTP 200 and the response should include cloud_id and app_id.', function(done) {

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
    }); // if client requests with that token
  }); // Given an valid access token


});