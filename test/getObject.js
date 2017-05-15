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
const CSV_FILE             = process.env.CSV_FILE;
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
const testDescription      = require('./lib/test_description');
const csvWriter            = require('./lib/csv_writer');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({ region: REGION });
const lambda               = new AWS.Lambda({ region: REGION });



describe('OSS_007: Get Object API', () => {

  let options = {};
  let customs = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'
  let object_json = 'test1_mocha.json'
  let object_json_id = 'test_object_json_id'
  let object_jpg = 'test2_mocha.jpg'
  let object_jpg_id = 'test_object_jpg_id'

  console.log(METHOD);
  console.log(REQUEST_URL);

  before('Write in csv.', function (done) {
    csvWriter.title_write('OSS_007: Get Object API');
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
        certificate_serial: '1002',
        access_token: '7eda6dd4de708b1886ed34f6c0460ffef2d9094e5052fb706ad7635cadb8ea8b'
      }
    }; // options
    done();
  }); // beforeEach

  /*****************************************************************
  * 1. query string 中必要參數 certificate_serial 未帶，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_007_01: ${testDescription.missingRequiredParams.certificate_serial}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_01: ${testDescription.missingRequiredParams.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`);
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
  describe(`OSS_007_02: ${testDescription.validationFailed.certificate_serial}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_02: ${testDescription.validationFailed.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`);
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
  describe(`OSS_007_03: ${testDescription.missingRequiredParams.api_key}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_03: ${testDescription.missingRequiredParams.api_key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`);
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
  describe(`OSS_007_04: ${testDescription.missingRequiredParams.signature}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_04: ${testDescription.missingRequiredParams.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`);
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
  describe(`OSS_007_05: ${testDescription.validationFailed.signature}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_05: ${testDescription.validationFailed.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`, (done) => {

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
  describe(`OSS_007_06: ${testDescription.missingRequiredParams.access_token}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_06: ${testDescription.missingRequiredParams.access_token}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`, (done) => {

      delete options.qs.access_token;

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, `${domain_name}/${object_jpg}`);
      let queryParams = Object.assign({ domain: domain_name, object: object_jpg }, options.qs);
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
  describe(`OSS_007_07: ${testDescription.unauthorized.access_token_invalid}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_07: ${testDescription.unauthorized.access_token_invalid}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, (done) => {

      options.qs.access_token = 'invalid_access_token';

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, `${domain_name}/${object_jpg}`);
      let queryParams = Object.assign({ domain: domain_name, object: object_jpg }, options.qs);
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
  describe(`OSS_007_08: ${testDescription.unauthorized.access_token_expired}`, () => {

    let customs = {};

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_007_08: ${testDescription.unauthorized.access_token_expired}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`);
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
      options.url = options.url.replace(regexp, `${domain_name}/${object_jpg}`);
      let queryParams = Object.assign({ domain: domain_name, object: object_jpg }, options.qs);
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
  describe(`OSS_007_09: ${testDescription.validationFailed.domain_in_path}`, () => {

    describe(`${testDescription.invalidDomain.begins_with_number}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_007_09_1: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.begins_with_number}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_domain_name = '111_invalid_domain_name'
        options.url = options.url.replace(regexp, `${invalid_domain_name}/${object_jpg}`);
        let queryParams = Object.assign({ domain: invalid_domain_name, key: object_jpg }, options.qs);
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
        csvWriter.write(`OSS_007_09_2: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.with_unacceptable_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_domain_name = 'invalid_test_domain_*_name'
        options.url = options.url.replace(regexp, `${invalid_domain_name}/${object_jpg}`);
        let queryParams = Object.assign({ domain: invalid_domain_name, key: object_jpg }, options.qs);
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
        csvWriter.write(`OSS_007_09_3: ${testDescription.validationFailed.domain_in_path}\n${testDescription.invalidDomain.over_128_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.domain)}`, (done) => {

        let invalid_domain_name = domain_name;

        while (invalid_domain_name.length < 129) {
          invalid_domain_name += ('_' + domain_name);
        }

        const regexp = /{.*}/;
        options.url = options.url.replace(regexp, `${invalid_domain_name}/${object_jpg}`);
        let queryParams = Object.assign({ domain: invalid_domain_name, key: object_jpg }, options.qs);
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

  /*****************************************************************
  * 10. path 中必要參數 key 不合法，回傳錯誤訊息。
  *****************************************************************/
  describe(`OSS_007_10: ${testDescription.validationFailed.key}`, () => {

    describe(`${testDescription.invalidObject.begins_with_number}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_007_10_1: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.begins_with_number}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_key_name = '111_invalid_object_name.jpg'
        options.url = options.url.replace(regexp, `${domain_name}/${invalid_key_name}`);
        let queryParams = Object.assign({ domain: domain_name, key: invalid_key_name }, options.qs);

        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            expect(response.statusCode).to.equal(400);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.key.message);

            done();
          }
        }); // request
      }); // it
    }); // describe

    describe(`${testDescription.invalidObject.with_unacceptable_characters}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_007_10_2: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.with_unacceptable_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_key_name = 'invalid_object_*_name.jpg'
        options.url = options.url.replace(regexp, `${domain_name}/${invalid_key_name}`);
        let queryParams = Object.assign({ domain: domain_name, key: invalid_key_name }, options.qs);

        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            expect(response.statusCode).to.equal(400);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.key.message);

            done();
          }
        }); // request
      }); // it
    }); // describe

    describe(`${testDescription.invalidObject.over_128_characters}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_007_10_3: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.over_128_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, (done) => {

        const regexp = /{.*}/;
        let invalid_key_name = 'invalid_object_name'

        while (invalid_key_name.length < 129) {
          invalid_key_name += ('_' + invalid_key_name);
        }
        invalid_key_name += '.jpg'

        options.url = options.url.replace(regexp, `${domain_name}/${invalid_key_name}`);
        let queryParams = Object.assign({ domain: domain_name, key: invalid_key_name }, options.qs);

        options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            expect(response.statusCode).to.equal(400);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.key.message);

            done();
          }
        }); // request
      }); // it
    }); // describe

  }); // describe

  /****************************************************************
  * 11. 找不到 domain。
  ****************************************************************/
  describe(`OSS_007_11: ${testDescription.notFound.domain}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_007_11: ${testDescription.notFound.domain}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`);
      done();
    }); // before

    before('Create a domain item.', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Delete the domain item.', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`, (done) => {

      const regexp = /{.*}/;
      const invalid_domain_name = 'invalid_domain';
      options.url = options.url.replace(regexp, `${invalid_domain_name}/${object_jpg}`);
      let queryParams = Object.assign({ domain: invalid_domain_name, object: object_jpg }, options.qs);
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
  * 12. 找不到 object。
  *****************************************************************/
  describe(`OSS_007_12: ${testDescription.notFound.object}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_007_12: ${testDescription.notFound.object}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.object)}`);
      done();
    }); // before

    before('Create a domain item.', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    after('Delete the domain item.', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.object)}`, function (done) {

      const regexp = /{.*}/;
      const invalid_object_name = 'invalid_object.jpg';
      options.url = options.url.replace(regexp, `${domain_name}/${invalid_object_name}`);
      let queryParams = Object.assign({ domain: domain_name, object: invalid_object_name }, options.qs);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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
  * 13. Object file 資料搜尋成功。
  *****************************************************************/
  describe(`OSS_007_13: ${testDescription.got.object.file}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_007_13: ${testDescription.got.object.file}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create a domain item', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create an object item', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object_jpg, domain_id, object_jpg_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Upload an object file to S3.', function (done) {
      this.timeout(12000);

      testHelper.uploadS3ObjectItem(cloud_id, app_id, object_jpg, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createS3ObjectItem
    }); // before

    after('Delete the domain item.', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Delete the object item.', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_jpg_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after

    after('Delete the uploaded object item in S3.', function (done) {
      this.timeout(12000);

      testHelper.deleteS3ObjectItem(cloud_id, app_id, object_jpg, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // deleteS3ObjectItem
    }); // after


    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, `${domain_name}/${object_jpg}`);
      let queryParams = Object.assign({ domain: domain_name, object: object_jpg }, options.qs);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

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
  * 14. Object json 資料搜尋成功。
  *****************************************************************/
  describe(`OSS_007_14: ${testDescription.got.object.json}`, () => {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_007_14: ${testDescription.got.object.json}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create a domain item.', function (done) {
      this.timeout(12000);

      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create an object item.', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object_json, domain_id, object_json_id, 'application/json', (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }); // createObjectItem
    }); // before

    after('Delete the domain item.', function (done) {
      this.timeout(12000);

      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Delete the object item.', function (done) {
      this.timeout(12000);

      testHelper.deleteObject(cloud_id, app_id, object_json_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after


    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
      this.timeout(12000);

      const regexp = /{.*}/;
      options.url = options.url.replace(regexp, `${domain_name}/${object_json}`);
      let queryParams = Object.assign({ domain: domain_name, object: object_json }, options.qs);
      options.headers['X-Signature'] = signatureGenerator.generate(queryParams, options.headers, PRIVATE_KEY_NAME);

      let getObject = function () {
        return new Promise((resolve, reject) => {
          request(options, (err, response, body) => {
            if (err) reject(err); // an error occurred
            else {
              console.log(body);
              expect(response.statusCode).to.equal(200);
              let parsedBody = JSON.parse(body);
              console.log(parsedBody);
              // 因為在 testHelper.createObjectItem 內是填入 { "message" : "OK" }
              expect(parsedBody).to.have.all.keys(['message']);
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