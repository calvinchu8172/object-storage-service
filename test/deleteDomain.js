'use strict';

require('rootpath')();


// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require('moment');
const expect               = mochaPlugin.chai.expect;
const uuidV4               = require('uuid/v4');


// ================ ENVs ========================
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const PROJECT_NAME         = process.env.SERVERLESS_PROJECT;
const X_API_KEY            = process.env.X_API_KEY;
const TEST_CLOUD_ID        = process.env.TEST_CLOUD_ID;
const TEST_APP_ID          = process.env.TEST_APP_ID;
const TEST_ACCESS_TOKEN    = process.env.TEST_ACCESS_TOKEN;
const CERTIFICATE_SERIAL   = process.env.CERTIFICATE_SERIAL;
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.deleteDomain.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.deleteDomain.events[0].http.method;
const REQUEST_URL          = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME     = 'object';


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js')
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require('lib/api_errors.js');
const testDescription      = require('./lib/test_description');
const isEmpty              = require('is-empty');
const csvWriter            = require('./lib/csv_writer');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({ region: REGION });
const lambda               = new AWS.Lambda({ region: REGION });



describe('OSS_012: Delete Domain API', () => {

  let options = {};
  let cloud_id = TEST_CLOUD_ID
  let app_id = TEST_APP_ID
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'
  let new_domain_name = 'new_test_domain_name'
  let new_domain_id = 'new_test_domain_id'

  console.log(METHOD);
  console.log(REQUEST_URL);

  before('Write in csv.', function (done) {
    csvWriter.title_write('OSS_012: Delete Domain API');
    done();
  }); // before

  beforeEach('Set Request Options', (done) => {
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
        'X-API-Key': X_API_KEY,
        'X-Signature': ''
      },
      qs: {
        certificate_serial: CERTIFICATE_SERIAL,
        access_token: TEST_ACCESS_TOKEN
      }
    }; // options
    done();
  }); // beforeEach

  /*****************************************************************
  * 1. query string 中必要參數 certificate_serial 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_012_01: ${testDescription.missingRequiredParams.certificate_serial}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_01: ${testDescription.missingRequiredParams.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`);
      done();
    }); // before

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
  describe(`OSS_012_02: ${testDescription.validationFailed.certificate_serial}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_02: ${testDescription.validationFailed.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`);
      done();
    }); // before

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
  describe(`OSS_012_03: ${testDescription.missingRequiredParams.api_key}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_03: ${testDescription.missingRequiredParams.api_key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`);
      done();
    }); // before

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
  describe(`OSS_012_04: ${testDescription.missingRequiredParams.signature}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_04: ${testDescription.missingRequiredParams.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`);
      done();
    }); // before

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
  describe(`OSS_012_05: ${testDescription.missingRequiredParams.signature}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_05: ${testDescription.validationFailed.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`, (done) => {

      options.headers['X-Signature'] = 'invalid_signaure';

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
  * 6. query string 中必要參數 access_token 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_012_06: ${testDescription.missingRequiredParams.access_token}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_06: ${testDescription.missingRequiredParams.access_token}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`, (done) => {

      delete options.qs.access_token;

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
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
  * 7. query string 中必要參數 access_token 帶錯，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_012_07: ${testDescription.unauthorized.access_token_invalid}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_07: ${testDescription.unauthorized.access_token_invalid}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, (done) => {

      options.qs.access_token = 'invalid_access_token';

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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
  describe(`OSS_012_08: ${testDescription.unauthorized.access_token_expired}`, () => {

    let customs = {};

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_012_08: ${testDescription.unauthorized.access_token_expired}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`);
      done();
    }); // before

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

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
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
  * 9. path 中必要參數 domain 不合法，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_012_09: ${testDescription.validationFailed.domain_in_path}`, () => {

    describe(`${testDescription.invalidDomain.begins_with_number}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_012_09_1: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.begins_with_number}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_domain_name = '111_invalid_domain_name'
        options.url = options.url.replace(regexp, invalid_domain_name);
        let queryParams = Object.assign({ domain: invalid_domain_name }, options.qs);
        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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

    describe(`${testDescription.invalidDomain.with_unacceptable_characters}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_012_09_2: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.with_unacceptable_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_domain_name = 'invalid_test_domain_*_name'
        options.url = options.url.replace(regexp, invalid_domain_name);
        let queryParams = Object.assign({ domain: invalid_domain_name }, options.qs);
        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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

    describe(`${testDescription.invalidDomain.over_128_characters}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_012_09_3: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.over_128_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        let invalid_domain_name = domain_name;

        while (invalid_domain_name.length < 129) {
          invalid_domain_name += ('_' + domain_name);
        }

        const regexp = /{.*}/;
        options.url = options.url.replace(regexp, invalid_domain_name);
        let queryParams = Object.assign({ domain: invalid_domain_name }, options.qs);
        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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

  }); // describe

  /****************************************************************
  * 10. 找不到 Doamin。
  ****************************************************************/
  describe(`OSS_012_10: ${testDescription.notFound.domain}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_012_10: ${testDescription.notFound.domain}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`);
      done();
    }); // before

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

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`, (done) => {

      const regexp = /{.*}/;
      let invalid_domain = 'invalid_domain';
      options.url = options.url.replace(regexp, invalid_domain);
      let queryParams = Object.assign({ domain: invalid_domain }, options.qs);
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
  * 11. Delete Domain 成功。
  *****************************************************************/
  describe(`OSS_012_11: ${testDescription.delete.domain}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_012_11: ${testDescription.delete.domain}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

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

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, domain_name);
      let queryParams = Object.assign({ domain: domain_name }, options.qs);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      let deleteDomain = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              expect(response.statusCode).to.equal(200);
              resolve();
            }
          }); // request
        }); // Promise
      }; // function

      deleteDomain()
        .then(() => {
          // console.log(data)
          return new Promise((resolve, reject) => {
            testHelper.getDomain(cloud_id, app_id, domain_name, (err, data) => {
              if (err) {
                console.log(err)
                // console.log(err.name)
                // console.log(err.message)
                reject(err); // an error occurred
              } else {
                console.log(data);
                expect(isEmpty(data)).to.equal(true);
                // expect(data.id).to.equal(domain_id);
                // expect(data.name).to.equal(new_domain_name);
                resolve(data);
              }
            }) // testHealper
          }); // Promise
        }) //then
        .then(() => done())
        .catch((err) => {
          console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
          done(err);
        });
    }); // it
  }); // describe


}); // outter describe