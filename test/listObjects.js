'use strict';

require('rootpath')();


// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const expect               = mochaPlugin.chai.expect;
const uuidV4               = require('uuid/v4');
const isEmpty              = require('is-empty');

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
const testDescription      = require('./lib/test_description');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({region: REGION});
const lambda               = new AWS.Lambda({region: REGION});



describe('OSS_009: List Objects API', () => {

  let options = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'
  let object1 = 'test1_mocha.json'
  let object_id1 = 'test_object_id_1'
  let object2 = 'test2_mocha.jpg'
  let object_id2 = 'test_object_id_2'
  let prefix = 'test2'

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
  describe(`OSS_009_01: ${testDescription.missingRequiredParams.certificate_serial}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`, (done) => {

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
  describe(`OSS_009_02: ${testDescription.validationFailed.certificate_serial}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`, (done) => {

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
  * 3. header 中必要參數 X-API-Key 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_009_03: ${testDescription.missingRequiredParams.api_key}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`, (done) => {

      delete options.headers['X-API-Key'];

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(403);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['message']);
          expect(parsedBody.message).to.equal(ApiErrors.forbidden.x_api_key.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 3. header 中必要參數 X-Signature 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_009_04: ${testDescription.missingRequiredParams.signature}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`, (done) => {

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
  describe(`OSS_009_05: ${testDescription.validationFailed.signature}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`, (done) => {

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
  describe(`OSS_009_06: ${testDescription.missingRequiredParams.access_token}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`, (done) => {

      delete options.qs.access_token;
      delete options.headers['X-Signature'];

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

      console.log(options);

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
  describe(`OSS_009_07: ${testDescription.unauthorized.access_token_invalid}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, (done) => {

      delete options.headers['X-Signature'];
      options.qs.access_token = 'invalid_access_token';

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
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
  describe(`OSS_009_08: ${testDescription.unauthorized.access_token_expired}`, () => {

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

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`, (done) => {

      options.qs.access_token = 'expired_access_token';
      delete options.headers['X-Signature'];

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
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
  describe(`OSS_009_09: ${testDescription.notFound.domain}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`, function(done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
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
  * 8. 找不到 Object。
  *****************************************************************/
  describe(`OSS_009_10: ${testDescription.notFound.object}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear a domain item Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.object)}`, function(done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options);
      // options.headers['X-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

      let queryObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(404);
              let parsedBody = JSON.parse(body);
              expect(parsedBody).to.have.all.keys(['code', 'message']);
              expect(parsedBody.code).to.equal(ApiErrors.notFound.object.code);
              expect(parsedBody.message).to.equal(ApiErrors.notFound.object.message);
              resolve();
            }
          }); // request
        }); // Promise
      };

      queryObject()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe


  /*****************************************************************
  * 9. List Object All 成功。
  *****************************************************************/
  describe(`OSS_009_11: ${testDescription.found.list_object_by_all}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item1', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, object_id1, 'application/json', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item2', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, object_id2, 'application/json', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item1', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id1, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item2', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id2, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function(done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      let queryObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              // console.log(parsedBody);
              // console.log(body);
              // console.log(parsedBody.data[0].key)
              expect(parsedBody).to.have.all.keys(['data']);
              expect(parsedBody.data[0].key).to.equal(object1);
              expect(parsedBody.data[1].key).to.equal(object2);
              resolve();
            }
          }); // request
        }); // Promise
      };

      queryObject()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe


  /*****************************************************************
  * 10. List Object by key 成功，而且當 query string 內同時有 key 與 begins_with 時，會以 key 為優先。
  *****************************************************************/
  describe(`OSS_009_12: ${testDescription.found.list_object_by_key}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item1', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, object_id1, 'application/json', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item2', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, object_id2, 'image/jpeg', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item1', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id1, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item2', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id2, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function(done) {
      this.timeout(12000);

      options.qs.key = object1;
      options.qs.begins_with = prefix;

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options);

      let queryObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              console.log(parsedBody.data[1]);
              expect(parsedBody).to.have.all.keys(['data']);
              expect(parsedBody.data[0].key).to.equal(object1);
              expect(isEmpty(parsedBody.data[1])).to.equal(true);
              resolve();
            }
          }); // request
        }); // Promise
      };

      queryObject()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe

  /*****************************************************************
  * 11. List Object by begins_with 成功。
  *****************************************************************/
  describe(`OSS_009_13: ${testDescription.found.list_object_by_begins_with}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item1', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, object_id1, 'application/json', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Create object item2', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, object_id2, 'image/jpeg', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item1', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id1, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object item2', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_id2, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function(done) {
      this.timeout(12000);

      options.qs.begins_with = prefix;

      const regexp = /{.*}/;
      // const domain = 'ecowork1';
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      console.log(queryParams);

      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);
      console.log(options);

      let queryObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              console.log(parsedBody);
              expect(parsedBody).to.have.all.keys(['data']);
              expect(parsedBody.data[0].key).to.equal(object2);
              expect(isEmpty(parsedBody.data[1])).to.equal(true);
              resolve();
            }
          }); // request
        }); // Promise
      };

      queryObject()
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });
    }); // it
  }); // describe

}); // outter describe