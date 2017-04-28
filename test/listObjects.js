'use strict';

require('rootpath')();


// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const expect               = mochaPlugin.chai.expect;
const uuidV4               = require('uuid/v4');

// ================ ENVs ========================
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const PROJECT_NAME         = process.env.SERVERLESS_PROJECT;
const X_API_KEY            = process.env.X_API_KEY;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.listObjects.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.listObjects.events[0].http.method;
const REQUEST_URL          = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME     = 'object';


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js')
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require( 'lib/api_errors.js' );


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({region: REGION});
const lambda               = new AWS.Lambda({region: REGION});



describe('List Objects API', () => {

  let options = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let name = 'ecowork1'
  let domain_id = 'test_domain_id'

  console.log(METHOD);
  console.log(REQUEST_URL);
  console.log(STAGE);

  beforeEach('Set Request Options', (done) => {
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': X_API_KEY,
        'X-Signature': ''
      },
      qs: {
        certificate_serial: '1002',
        access_token: '7eda6dd4de708b1886ed34f6c0460ffef2d9094e5052fb706ad7635cadb8ea8b'
      }
    }; // options
    done();
  }); // beforeEach

  /*****************************************************************
  * 1. query string 中必要參數 certificate_serial 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without certificate_serial in the body', () => {

    it("Should return 'Missing Required Parameter: certificate_serial'", (done) => {

      delete options.qs.certificate_serial;
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
  * 2. query string 中必要參數 certificate_serial 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong certificate_serial in the body', () => {

    it("Should return 'Invalid certificate_serial'", (done) => {

      options.qs.certificate_serial = 'invalid_certificate_serial';
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
  * 5. query string 中必要參數 access_token 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe('Without access_token in the body', () => {

    it("Should return 'Missing Required Parameter: access_token'", (done) => {

      delete options.qs.access_token;
      delete options.headers['X-Signature'];

      const regexp = /{.*}/;
      const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain);
      let queryParams = Object.assign({ domain }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

      // console.log(options);

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

  /****************************************************************
  * 6. path 中必要參數 domain 帶錯，回傳錯誤訊息。
  ****************************************************************/
  // describe('Wrong domain in the path', () => {

  //   before('Create a domain item', function (done) {
  //     this.timeout(12000);

  //     testHelper.createDomainItem(cloud_id, app_id, name, domain_id, (err, data) => {
  //       if (err) return done(err);
  //       done();
  //     }); // createDomainItem
  //   }); // before

  //   after('Clear Testing Data', function (done) {
  //     this.timeout(12000);

  //     testHelper.deleteDomain(cloud_id, app_id, name, (err, data) => {
  //       if (err) return done(err);
  //       return done();
  //     }); // deleteDomain
  //   }); // after

  //   it("Should return 'Domain Not Found'", (done) => {

  //     // delete options.form.domain;
  //     delete options.headers['X-Signature'];
  //     const regexp = /{.*}/;
  //     const domain = 'invalid_domain';
  //     options.url = options.url.replace(regexp, domain);
  //     let queryParams = Object.assign({ domain }, options.qs);
  //     console.log(queryParams);

  //     options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

  //     request(options, (err, response, body) => {
  //       if (err) done(err); // an error occurred
  //       else {
  //         expect(response.statusCode).to.equal(404);
  //         let parsedBody = JSON.parse(body);
  //         expect(parsedBody).to.have.all.keys(['code', 'message']);
  //         expect(parsedBody.code).to.equal(ApiErrors.notFound.domain.code);
  //         expect(parsedBody.message).to.equal(ApiErrors.notFound.domain.message);

  //         done();
  //       }
  //     }); // request

  //   }); // it
  // }); // describe

  /*****************************************************************
  * 7. query string 中必要參數 access_token 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong access_token in the body', () => {

    it("Should return 'Invalid access_token'", (done) => {

      delete options.headers['X-Signature'];
      options.qs.access_token = 'invalid_access_token';

      const regexp = /{.*}/;
      const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain);
      let queryParams = Object.assign({ domain }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

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
  * 7. query string 中必要參數 access_token 過期，回傳錯誤訊息。
  *****************************************************************/
  describe('Expired access_token in the body', () => {

    let customs = {};

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

    it("Should return 'Access Token Expired'", (done) => {

      options.qs.access_token = 'expired_access_token';
      delete options.headers['X-Signature'];

      const regexp = /{.*}/;
      const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain);
      let queryParams = Object.assign({ domain }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(401);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.unauthorized.access_token_expired.code);
          expect(parsedBody.message).to.equal(ApiErrors.unauthorized.access_token_expired.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 8. 找不到 Domain。
  *****************************************************************/
  describe('Cannot find domain item', () => {

    it("should return 'Domain Not Found'", function(done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain);
      let queryParams = Object.assign({ domain }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

      let getDomain = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(404);
              let parsedBody = JSON.parse(body);
              expect(parsedBody).to.have.all.keys(['code', 'message']);
              expect(parsedBody.code).to.equal(ApiErrors.notFound.domain.code);
              expect(parsedBody.message).to.equal(ApiErrors.notFound.domain.message);
              resolve();
            }
          }); // request
        }); // Promise
      };

      getDomain()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe

  /*****************************************************************
  * 8. Domain 資料建立成功。
  *****************************************************************/
  describe('Successfully get domain item', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    // before('Create a domain item', function (done) {
    //   this.timeout(12000);

    //   testHelper.createDomainItem(cloud_id, app_id, `${name}_1`, `${domain_id}_1`, (err, data) => {
    //     if (err) return done(err);
    //     done();
    //   }); // createDomainItem
    // }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    // after('Clear Testing Data', function (done) {
    //   this.timeout(12000);

    //   testHelper.deleteDomain(cloud_id, app_id, `${domain_id}_1`, (err, data) => {
    //     if (err) return done(err);
    //     return done();
    //   }); // deleteDomain
    // }); // after

    it("should return 'OK'", function(done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain);
      let queryParams = Object.assign({ domain }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      console.log(options);

      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

      let getDomain = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              // expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              console.log(parsedBody);
              expect(parsedBody).to.have.all.keys(['data']);
              resolve();
            }
          }); // request
        }); // Promise
      };

      getDomain()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe


}); // outter describe