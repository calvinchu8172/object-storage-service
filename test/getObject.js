'use strict';

require('rootpath')();


// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require('moment');
const expect               = mochaPlugin.chai.expect;
const isEmpty              = require('is-empty');


// ================ ENVs ========================
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const PROJECT_NAME         = process.env.SERVERLESS_PROJECT;
const X_API_KEY            = process.env.X_API_KEY;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.getObject.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.getObject.events[0].http.method;
const REQUEST_URL          = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME     = 'object';


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js')
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require('lib/api_errors.js');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({ region: REGION });
const lambda               = new AWS.Lambda({ region: REGION });



describe('Get Object API', () => {

  let options = {};
  let customs = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain = 'ecowork1'
  let domain_id = 'test_domain_id'
  let object = 'test_mocha.jpg'

  console.log(METHOD);
  console.log(REQUEST_URL);

  beforeEach('Set Request Options', (done) => {
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
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
      // const domain = 'ecowork1';
      // const object = 'test_mocha.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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
  * 6. query string 中必要參數 access_token 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong access_token in the body', () => {

    it("Should return 'Invalid access_token'", (done) => {

      options.qs.access_token = 'invalid_access_token';

      delete options.headers['X-Signature'];
      const regexp = /{.*}/;
      // const domain = 'ecowork1';
      // const object = 'test_mocha.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
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

  /****************************************************************
  * 7. path 中必要參數 domain 帶錯，回傳錯誤訊息。
  ****************************************************************/
  describe('Wrong domain in the path', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it("Should return 'Domain Not Found'", (done) => {

      // delete options.form.domain;
      delete options.headers['X-Signature'];
      const regexp = /{.*}/;
      const domain = 'invalid_domain';
      // const object = 'test_mocha.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(404);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.notFound.domain.code);
          expect(parsedBody.message).to.equal(ApiErrors.notFound.domain.message);

          done();
        }
      }); // request

    }); // it
  }); // describe



  /*****************************************************************
  * 8. path 中必要參數 object 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe('Wrong Object in the path', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it("should return 'Object not found'", function (done) {

      const regexp = /{.*}/;
      // const domain = 'ecowork1';
      const object = 'invalid_object.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      // options.qs.domain = 'ecowork1';
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options.headers['X-Signature']);
      // done();

      let getDomain = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              // console.log(body);
              expect(response.statusCode).to.equal(404);
              let parsedBody = JSON.parse(body);
              // console.log(body);
              expect(parsedBody).to.have.all.keys(['code', 'message']);
              expect(parsedBody.code).to.equal(ApiErrors.notFound.object.code);
              expect(parsedBody.message).to.equal(ApiErrors.notFound.object.message);
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
  * 8. Object jpeg 資料搜尋成功。
  *****************************************************************/
  describe('Successfully get object item', () => {
    var tmp;
    // var domain_id;

    before('Create a domain item', function (done) {
      this.timeout(12000);
      console.log('create domain item');
      testHelper.createDomainItem(cloud_id, app_id, domain, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          tmp = data;
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create an object item', function (done) {
      this.timeout(12000);
      console.log('create object item');
      console.log(domain_id);
      var object_id = '6396f119-98a4-459a-b86a-df258a44c918';
      customs.object_id = object_id;
      testHelper.createObjectItem1(cloud_id, app_id, object, domain_id, object_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Upload an object to s3', function (done) {
      this.timeout(12000);
      console.log('upload object item to s3');

      testHelper.uploadS3ObjectItem(cloud_id, app_id, object, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createS3ObjectItem
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);
      console.log('delete domain item');
      // done();
      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object Data', function (done) {
      this.timeout(12000);
      console.log('delete object item');
      testHelper.deleteObject(cloud_id, app_id, customs.object_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after

    after('Clear Testing S3 Object Data', function (done) {
      this.timeout(12000);
      console.log('delete S3 object item');

      testHelper.deleteS3ObjectItem(cloud_id, app_id, object, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // deleteS3ObjectItem
    }); // after


    it("should return 'OK'", function (done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      // const domain = 'ecowork1';
      // const object = 'test_mocha.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      // options.qs.domain = 'ecowork1';
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options.headers['X-Signature']);
      // done();

      let getObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              console.log("final result");
              expect(response.statusCode).to.equal(200);
              expect(isEmpty(body)).to.equal(false);
              resolve();
            }
          }); // request
        }); // Promise
      };

      getObject()
        .then(() => done())
        .catch((err) => {
          console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
          done(err);
        });
    }); // it
  }); // describe


  /*****************************************************************
  * 9. Object json 資料搜尋成功。
  *****************************************************************/
  describe('Successfully get object item', () => {
    var tmp;
    // var domain_id;

    before('Create a domain item', function (done) {
      this.timeout(12000);
      console.log('create domain item');
      testHelper.createDomainItem(cloud_id, app_id, domain, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          tmp = data;
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create a object item', function (done) {
      this.timeout(12000);
      console.log('create object item');
      console.log(domain_id);
      object = 'test_mocha.json';
      var object_id = '6396f119-98a4-459a-b86a-df258a44c918';
      customs.object_id = object_id;
      testHelper.createObjectItem1(cloud_id, app_id, object, domain_id, object_id, 'application/json', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);
      console.log('delete domain item');
      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object Data', function (done) {
      this.timeout(12000);
      console.log('delete object item');
      // done();

      testHelper.deleteObject(cloud_id, app_id, customs.object_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after


    it("should return 'OK'", function (done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      // const domain = 'ecowork1';
      // const object = 'test_mocha.jpg';
      options.url = options.url.replace(regexp, `${domain}/${object}`);
      // options.qs.domain = 'ecowork1';
      let queryParams = Object.assign({ domain, object }, options.qs);
      console.log(queryParams);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options.headers['X-Signature']);
      // done();

      let getObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              console.log(body);
              // console.log(response);
              // expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              console.log(parsedBody);
              // console.log(body);
              expect(parsedBody).to.have.all.keys(['message']);
              // expect(parsedBody.code).to.equal(ApiErrors.notFound.object.code);
              expect(parsedBody.message).to.equal('OK');
              resolve();
            }
          }); // request
        }); // Promise
      };

      getObject()
        .then(() => done())
        .catch((err) => {
          console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
          done(err);
        });
    }); // it
  }); // describe


}); // outter describe