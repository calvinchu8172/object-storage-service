'use strict';

require('rootpath')();


// ================ Modules =====================
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require('moment');
const uuidV4               = require('uuid/v4');
const expect               = mochaPlugin.chai.expect;
const YAML                 = require('yamljs');


// ================ ENVs ========================
const PROJECT_NAME         = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const X_API_KEY            = process.env.X_API_KEY;
const CONTENT_TYPE         = process.env.CONTENT_TYPE;
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.createDomain.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.createDomain.events[0].http.method;
const REQUEST_URL          = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME     = 'object';


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js');
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require('lib/api_errors.js');
const testDescription      = require('./lib/test_description');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({ region: REGION });
const lambda               = new AWS.Lambda({ region: REGION });


describe('OSS_003: Create Domain API', () => {

  let options = {};
  let customs = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'

  beforeEach('Set Request Options', (done) => {
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'X-API-Key': X_API_KEY,
        'X-Signature': ''
      },
      form: {
        certificate_serial: '1002',
        access_token: '7eda6dd4de708b1886ed34f6c0460ffef2d9094e5052fb706ad7635cadb8ea8b',
        domain: domain_name
      }
    }; // options

    options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

    done();
  }); // beforeEach

  /*****************************************************************
  * 1. body 中必要參數 certificate_serial 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_01: ${testDescription.missingRequiredParams.certificate_serial}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`, (done) => {

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
  describe(`OSS_003_02: ${testDescription.validationFailed.certificate_serial}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`, (done) => {

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
  * 3. header 中必要參數 X-API-Key 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_03: ${testDescription.missingRequiredParams.api_key}`, () => {

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
  * 4. header 中必要參數 X-Signature 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_04: ${testDescription.missingRequiredParams.signature}`, () => {

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
  * 5. header 中必要參數 X-Signature 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_05: ${testDescription.validationFailed.signature}`, () => {

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
  * 6. body 中必要參數 access_token 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_06: ${testDescription.missingRequiredParams.access_token}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`, (done) => {

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
  * 7. body 中必要參數 access_token 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_07: ${testDescription.unauthorized.access_token_invalid}`, () => {

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_name, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, (done) => {

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
  * 8. query string 中必要參數 access_token 過期，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_08: ${testDescription.unauthorized.access_token_expired}`, () => {

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

      options.form.access_token = 'expired_access_token';
      delete options.headers['X-Signature'];

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.form);
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
  * 9. body 中必要參數 domain 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_09: ${testDescription.missingRequiredParams.domain}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.domain)}`, (done) => {

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
  * 10. body 中必要參數 domain 不合法，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_013_10: ${testDescription.validationFailed.domain_in_path}`, () => {

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

      options.form.domain = '111ecowork';
      delete options.headers['X-Signature'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(400);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.domain.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.domain.message);

          done();
        }
      }); // request

    }); // it
  }); // describe

  /*****************************************************************
  * 11. 如果 DDB 內已有一筆資料，則無法建立相同的資料，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_11: ${testDescription.alreadyExists.domain}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
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

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain_duplicated)}`, (done) => {

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
  * 12. 如果 DDB 內已有兩筆資料，則無法在建立資料，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_003_12: ${testDescription.alreadyExists.domain_limit}`, () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);
      customs.domain_id_1 = uuidV4();
      customs.domain_id_2 = uuidV4();
      testHelper.createDomainItem(cloud_id, app_id, domain_name + '1', customs.domain_id_1, (err, data) => {
        if (err) return done(err);
        testHelper.createDomainItem(cloud_id, app_id, domain_name + '2', customs.domain_id_2, (err, data) => {
          if (err) return done(err);
          done();
        }); // createDomainItem
      }); // createDomainItem
    }); // before

    after('Clear Testing Data', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, customs.domain_id_1, (err, data) => {
        if (err) return done(err);
        testHelper.deleteDomain(cloud_id, app_id, customs.domain_id_2, (err, data) => {
          if (err) return done(err);
          return done();
        }); // deleteDomain
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain_limit)}`, (done) => {

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
  * 13. Domain 資料建立成功。
  *****************************************************************/
  describe(`OSS_003_13: ${testDescription.created.domain}`, () => {

    after('Clear Testing Data', function (done) {
      this.timeout(12000);
      // 刪除裝置
      testHelper.deleteDomain(cloud_id, app_id, customs.domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {

      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);

      let createDomains = function () {
        return new Promise((resolve, reject) => {
          console.log(`create domains .....`);
          console.log(`options: ${JSON.stringify(options, null, 2)}`);
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
            testHelper.getDomain(cloud_id, app_id, options.form.domain, (err, domain) => {
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
              customs.domain_id = domain.id;
              expect(domain['cloud_id-app_id']).to.equal(`${cloud_id}-${app_id}`);
              expect(domain.name).to.equal(domain_name);
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