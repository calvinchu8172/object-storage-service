'use strict';

// tests for create domains
// Generated by serverless-mocha-plugin

require('rootpath')();

// ================ ENVs ========================
const PROJECT_NAME         = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const YAML                 = require('yamljs');
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.createDomains.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.createDomains.events[0].http.method;
const REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME       = 'object';


// ================ Modules =====================
// const randomstring         = require("randomstring");
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const expect               = mochaPlugin.chai.expect;


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js');
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require( 'lib/api_errors.js' );


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({region: REGION});
const lambda               = new AWS.Lambda({region: REGION});





describe('Create Domains API', () => {

  let options = {};
  let cloud_id = 'zMdCD2J7xrdn77gzcgpiJyQ'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let name = 'ecowork1'

  beforeEach('Set Request Options', (done) => {
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': 'pBPw6rQzSR3lLJbwMSpXQ5G79ugIUr317TjUdlvx',
        'X-Signature': ''
      },
      form: {
        certificate_serial: '1002',
        access_token: '7eda6dd4de708b1886ed34f6c0460ffef2d9094e5052fb706ad7635cadb8ea8b',
        domain: name
      }
    }; // options

    options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

    done();
  }); // beforeEach

  /*****************************************************************
  * 1. body 中必要參數 certificate_serial 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without certificate_serial in the body', () => {

    it("Should return 'Missing Required Parameter: certificate_serial'", (done) => {

      delete options.form.certificate_serial;
      // options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.certificate_serial.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.certificate_serial.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 2. body 中必要參數 certificate_serial 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong certificate_serial in the body', () => {

    it("Should return 'Invalid certificate_serial'", (done) => {

      options.form.certificate_serial = 'invalid_certificate_serial';
      // options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);


      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.certificate_serial.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.certificate_serial.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 3. header 中必要參數 X-Signature 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without X-Signature in the header', () => {

    it("Should return 'Missing Required Header: X-Signature'", (done) => {

      delete options.headers['X-Signature'];

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.signature.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.signature.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 4. header 中必要參數 X-Signature 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong X-Signature in the header', () => {

    it("Should return 'Invalid Signature'", (done) => {

      options.headers['X-Signature'] = 'invalid_signaure';
      // options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);


      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.signature.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.signature.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 5. body 中必要參數 access_token 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without access_token in the body', () => {

    it("Should return 'Missing Required Parameter: access_token'", (done) => {

      delete options.form.access_token;
      delete options.headers['X-Signature'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.access_token.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.access_token.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 6. body 中必要參數 domain 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without domain in the body', () => {

    it("Should return 'Missing Required Parameter: domain'", (done) => {

      delete options.form.domain;
      delete options.headers['X-Signature'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.domain.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.domain.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 7. body 中必要參數 access_token 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong access_token in the body', () => {

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, name, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it("Should return 'Invalid access_token'", (done) => {

      options.form.access_token = 'invalid_access_token';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      console.log(options);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(401);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.unauthorized.access_token_invalid.code);
          expect(parsedBody.message).to.equal(ApiErrors.unauthorized.access_token_invalid.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 8. 如果 DDB 內已有一筆資料，則無法建立相同的資料，回傳錯誤訊息。
  *****************************************************************/
  describe('Create domain item fail if has the same id', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, name, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, name, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it("Should return 'Domain Already Exists'", (done) => {

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.domain_duplicated.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.domain_duplicated.message);

          done();
        }
      }); // request

    }); // it

  }); // describe

  /*****************************************************************
  * 8. 如果 DDB 內已有兩筆資料，則無法在建立資料，回傳錯誤訊息。
  *****************************************************************/
  describe('Create domain item fail if there are 2 data already', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);
      testHelper.createDomainItem(cloud_id, app_id, name+'1', (err, data) => {
        if (err) return done(err);
        testHelper.createDomainItem(cloud_id, app_id, name+'2', (err, data) => {
          if (err) return done(err);
          done();
        }); // createDomainItem
      }); // createDomainItem
    }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, name+'1', (err, data) => {
        if (err) return done(err);
        testHelper.deleteDomain(cloud_id, app_id, name+'2', (err, data) => {
          if (err) return done(err);
          return done();
        }); // deleteDomain
      }); // deleteDomain
    }); // after

    it("Should return 'Over domains limit'", (done) => {

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.domain_limit.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.domain_limit.message);

          done();
        }
      }); // request

    }); // it

  }); // describe


  /*****************************************************************
  * 9. Domain 資料建立成功。
  *****************************************************************/
  describe('Successfully create domain item', () => {

    // before('Register a device', function (done) {
    //   this.timeout(12000);
    //   // 註冊裝置
    //   testHelper.registerDevice(udid, (err) => {
    //     if (err) return done(err);
    //     done();
    //   }); // registerDevice
    // }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);
      // 刪除裝置
      testHelper.deleteDomain(cloud_id, app_id, name, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it("should return 'OK'", function(done) {

      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      // console.log(options.headers['X-Signature']);
      // done();

      let createDomains = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(200);
              resolve();
            }
          }); // request
        }); // Promise
      };

      createDomains()
      .then(() => {
        return new Promise((resolve, reject) => {
          testHelper.getDomain(cloud_id, app_id, name, (err, domain) => {
            if (err) return reject(err);
            console.log(domain);
            expect(domain).to.have.all.keys([
              'cloud_id-app_id',
              'name',
              'app_id',
              'created_at',
              'created_by',
              'file_usage',
              'id',
              'json_usage',
              'updated_at',
              'updated_by'
            ]);
            expect(domain['cloud_id-app_id']).to.equal(`${cloud_id}-${app_id}`);
            expect(domain.name).to.equal(name);
            resolve();
          }); // getDomain
        }); // Promise
      })
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe


}); // outter describe