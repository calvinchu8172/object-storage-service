'use strict';

require('rootpath')();


// ================ Modules =====================
const mochaPlugin          = require('serverless-mocha-plugin');
const request              = require('request');
const uuidV4               = require('uuid/v4');
const expect               = mochaPlugin.chai.expect;
const YAML                 = require('yamljs');
const serverlessYamlObject = YAML.load('serverless.yml');


// ================ ENVs ========================
const SERVICE              = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const X_API_KEY            = process.env.X_API_KEY;
const CONTENT_TYPE         = process.env.CONTENT_TYPE;
const TEST_CLOUD_ID        = process.env.TEST_CLOUD_ID;
const TEST_APP_ID          = process.env.TEST_APP_ID;
const TEST_ACCESS_TOKEN    = process.env.TEST_ACCESS_TOKEN;
const CERTIFICATE_SERIAL   = process.env.CERTIFICATE_SERIAL;
const PRIVATE_KEY_NAME     = "object";
const PATH                 = serverlessYamlObject.functions.createObject.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.createObject.events[0].http.method;
const REQUEST_URL          = `${API_GATEWAY_INVOKE_URL}/${PATH}`;


// ================ Lib/Modules =================
const testHelper           = require('./lib/test_helper');
const signatureGenerator   = require('lib/signature_generator.js')
const ApiErrors            = require('lib/api_errors.js');
const testDescription      = require('./lib/test_description');
const csvWriter            = require('./lib/csv_writer');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const lambda               = new AWS.Lambda({ region: REGION });


describe('OSS_004: Create Object API', () => {

  let options = {};
  let customs = {
    cloud_id: TEST_CLOUD_ID,
    app_id: TEST_APP_ID,
    domain_name: "test_domain"
  };

  before('Write in csv.', function (done) {
    csvWriter.title_write('OSS_004: Create Object API');
    done();
  }); // before

  beforeEach('Set Request Options', (done) => {
    console.log('Set Request Options....');
    options = {
      method: METHOD,
      url: REQUEST_URL,
      headers: {
        'Content-Type': CONTENT_TYPE,
        'X-API-Key': X_API_KEY,
        'X-Signature': ''
      },
      form: {
        certificate_serial: CERTIFICATE_SERIAL,
        access_token: TEST_ACCESS_TOKEN,
        domain: "test_domain",
        key: "test_key",
        content_type: "image/png",
        content: "{}"
      }
    }; // options

    done();
  }); // beforeEach


  before('Create Test Domain', function (done) {
    console.log(`Create Test Domain...`);
    let domain_id = uuidV4();
    customs.domain_id = domain_id;
    testHelper.createDomainItem(customs.cloud_id, customs.app_id, customs.domain_name, customs.domain_id, (err, data) => {
      if (err) {
        done(err);
      }
      else {
        console.log(`data: ${JSON.stringify(data, null, 2)}`);
        done();
      }
    }); // registerDevice
  }); // before


  after('Delete Test Domain', function (done) {
    console.log(`Delete Test Domain...`);
    testHelper.deleteDomain(customs.cloud_id, customs.app_id, customs.domain_id, (err, data) => {
      if (err) done(err);
      else done();
    }); // registerDevice
  }); // after



  // OSS_004_01
  describe(`OSS_004_01: ${testDescription.missingRequiredParams.api_key}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_01: ${testDescription.missingRequiredParams.api_key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`, function (done) {

      delete options.headers['X-API-Key'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(403);
          console.log(response.body);
          done();
        }
      }); // request
    }); // it

  }); // If the X-Api-Key Header in request is missing

  // OSS_004_02
  describe(`OSS_004_02: ${testDescription.missingRequiredParams.signature}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_02: ${testDescription.missingRequiredParams.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`, function (done) {

      delete options.headers['X-Signature'];
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(ApiErrors.missingRequiredParams.signature.httpStatus);
          console.log(response.body);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.signature.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.signature.message);
          done();
        }
      }); // request
    }); // it

  }); // If the X-Signature Header in request is missing


  // OSS_004_03
  describe(`OSS_004_03: ${testDescription.missingRequiredParams.certificate_serial}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_03: ${testDescription.missingRequiredParams.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`, function (done) {

      delete options.form['certificate_serial'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(ApiErrors.missingRequiredParams.certificate_serial.httpStatus);
          console.log(response.body);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.certificate_serial.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.certificate_serial.message);
          done();
        }
      }); // request
    }); // it

  }); // If the certificate_serial param in request is missing



  // OSS_004_04
  describe(`OSS_004_04: ${testDescription.validationFailed.certificate_serial}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_04: ${testDescription.validationFailed.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`, function (done) {

      options.form['certificate_serial'] = "invalid_certificate_serial";
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          expect(response.statusCode).to.equal(ApiErrors.validationFailed.certificate_serial.httpStatus);
          console.log(response.body);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.certificate_serial.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.certificate_serial.message);
          done();
        }
      }); // request
    }); // it

  }); // If the certificate_serial param in request is invalid


  // OSS_004_05
  describe(`OSS_004_05: ${testDescription.validationFailed.signature}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_05: ${testDescription.validationFailed.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`, function (done) {

      options.headers['X-Signature'] = "invalid_signature";
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.validationFailed.signature.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.signature.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.signature.message);
          done();
        }
      }); // request
    }); // it

  }); // If the signature in request failed the verification


  // OSS_004_06
  describe(`OSS_004_06: ${testDescription.missingRequiredParams.access_token}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_06: ${testDescription.missingRequiredParams.access_token}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`, function (done) {

      delete options.form['access_token'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.missingRequiredParams.access_token.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.access_token.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.access_token.message);
          done();
        }
      }); // request
    }); // it
  }); // If the access_token param in request is missing


  // OSS_004_07
  describe(`OSS_004_07: ${testDescription.validationFailed.key}`, function () {

    describe(`${testDescription.invalidObject.begins_with_number}`, () => {

      before('Write in csv', function (done) {
        csvWriter.write(`OSS_004_07_1: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.begins_with_number}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, function (done) {

        options.form['key'] = "123abc";
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.key.httpStatus);
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
        csvWriter.write(`OSS_004_07_2: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.with_unacceptable_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, function (done) {

        options.form['key'] = "abc*";
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.key.httpStatus);
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
        csvWriter.write(`OSS_004_07_3: ${testDescription.validationFailed.key}\n${testDescription.invalidObject.over_128_characters}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`);
        done();
      }); // before

      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key)}`, function (done) {

        let invalid_key_name = 'invalid_object_name'

        while (invalid_key_name.length < 129) {
          invalid_key_name += ('_' + invalid_key_name);
        }
        invalid_key_name += '.jpg'

        options.form['key'] = invalid_key_name;
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.key.httpStatus);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.key.message);
            done();
          }
        }); // request
      }); // it
    }); // describe

  }); // If the key param in request is invalid


  // OSS_004_08
  describe(`OSS_004_08: ${testDescription.missingRequiredParams.content_type}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_08: ${testDescription.missingRequiredParams.content_type}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content_type)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content_type)}`, function (done) {

      delete options.form['content_type'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.missingRequiredParams.content_type.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.content_type.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.content_type.message);
          done();
        }
      }); // request
    }); // it
  }); // If the content_type param in request is missing


  // OSS_004_09
  describe(`OSS_004_09: ${testDescription.validationFailed.content_type}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_09: ${testDescription.validationFailed.content_type}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content_type)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content_type)}`, function (done) {

      options.form['content_type'] = "invalid_content_type";
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.validationFailed.content_type.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.content_type.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.content_type.message);
          done();
        }
      }); // request
    }); // it
  }); // If the content_type param in request is invalid


  // OSS_004_10
  describe(`OSS_004_10: ${testDescription.missingRequiredParams.content}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_10: ${testDescription.missingRequiredParams.content}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content)}`, function (done) {

      options.form['content_type'] = 'application/json';
      delete options.form['content'];
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.missingRequiredParams.content.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.missingRequiredParams.content.code);
          expect(parsedBody.message).to.equal(ApiErrors.missingRequiredParams.content.message);
          done();
        }
      }); // request
    }); // it
  }); // If the content param in request is missing


  // OSS_004_11
  describe(`OSS_004_11: ${testDescription.validationFailed.content}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_11: ${testDescription.validationFailed.content}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content)}`, function (done) {

      options.form['content_type'] = 'application/json';
      options.form['content'] = "invalid_content";
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.validationFailed.content.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.content.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.content.message);
          done();
        }
      }); // request
    }); // it
  }); // If the content param in request is invalid


  // OSS_004_12
  describe(`OSS_004_12: ${testDescription.unauthorized.access_token_invalid}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_12: ${testDescription.unauthorized.access_token_invalid}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`, function (done) {

      options.form['access_token'] = 'invalid_access_token';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.unauthorized.access_token_invalid.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.unauthorized.access_token_invalid.code);
          expect(parsedBody.message).to.equal(ApiErrors.unauthorized.access_token_invalid.message);
          done();
        }
      }); // request
    }); // it
  }); // If the access_token param in request is invalid



  // OSS_004_13
  describe(`OSS_004_13: ${testDescription.unauthorized.access_token_expired}`, function () {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_004_13: ${testDescription.unauthorized.access_token_expired}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`);
      done();
    }); // before

    before('Create Expired Token', function (done) {
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
          console.log(`data: ${JSON.stringify(data, null, 2)}`);
          console.log(`data.insertId: ${data.insertId}`);
          console.log(`customs.expired_token_id: ${customs.expired_token_id}`);
          done();
        }
      }); // registerDevice
    }); // before

    after('Delete Expired Token', function (done) {
      this.timeout(12000);
      console.log(`Delete Expired Token...`);
      console.log(`expired_token_id: ${customs.expired_token_id}`);
      testHelper.deleteAccessToken(customs.expired_token_id, (err, data) => {
        if (err) {
          done(err);
        }
        else {
          console.log(`data: ${JSON.stringify(data, null, 2)}`);
          done();
        }
      }); // registerDevice
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`, function (done) {

      options.form['access_token'] = 'expired_access_token';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.unauthorized.access_token_expired.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.unauthorized.access_token_expired.code);
          expect(parsedBody.message).to.equal(ApiErrors.unauthorized.access_token_expired.message);
          done();
        }
      }); // request
    }); // it
  }); // If the access_token param in request is expired



  // OSS_004_14
  describe(`OSS_004_14: ${testDescription.notFound.domain}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_14: ${testDescription.notFound.domain}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`, function (done) {

      options.form['domain'] = 'unavailable_domain';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.notFound.domain.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.notFound.domain.code);
          expect(parsedBody.message).to.equal(ApiErrors.notFound.domain.message);
          done();
        }
      }); // request
    }); // it
  }); // Can not find domain by domain


  // OSS_004_15
  describe(`OSS_004_15: ${testDescription.alreadyExists.key}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_15: ${testDescription.alreadyExists.key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key_duplicated)}`);
      done();
    }); // before

    before('Create Duplicated Object Item', function (done) {
      console.log(`Create Duplicated Object Item...`);
      customs.object_id = uuidV4();
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.object_id,
        key: options.form.key,
        usage: 0
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // registerDevice
    }); // before

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // registerDevice
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key_duplicated)}`, function (done) {

      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.validationFailed.key_duplicated.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.validationFailed.key_duplicated.code);
          expect(parsedBody.message).to.equal(ApiErrors.validationFailed.key_duplicated.message);
          done();
        }
      }); // request
    }); // it
  }); // If the object key client try to create is already exists


  // OSS_004_16
  describe(`OSS_004_16: ${testDescription.created.object.json}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_16: ${testDescription.created.object.json}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    // describe('and the content_type of object is application/json', function () {
      it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
        options.form['content_type'] = 'application/json';
        options.form['content'] = '{}';
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(200);
            testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form.key, (err, item) => {
              if (err) return done(err);
              console.log(`item: ${JSON.stringify(item, null, 2)}`);
              customs.object_id = item.id;
              done();
            });
          }
        }); // request
      }); // it
    // }); // and the content_type of object is application/json
  }); // If client requests creating object successfully


  // OSS_004_17
  describe(`OSS_004_17: ${testDescription.created.object.file}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_17: ${testDescription.created.object.file}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    // describe('and the content_type of object is not application/json', function () {
      it(`${testDescription.server_return} ${JSON.stringify(testDescription.OKAndPresignURL)}`, function (done) {
        options.form['content_type'] = 'image/png';
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(200);
            console.log(`body: ${body}`);
            console.log(`typeof data: ${typeof body}`);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.keys('data');
            expect(parsedBody.data).to.have.keys('upload_url');
            testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form.key, (err, item) => {
              if (err) return done(err);
              console.log(`item: ${JSON.stringify(item, null, 2)}`);
              customs.object_id = item.id;
              done();
            });
          }
        }); // request
      }); // it
    // }); // and the content_type of object is not application/json
  }); // If client requests creating object successfully




  // OSS_004_18
  describe(`OSS_004_18: ${testDescription.created.object.jsonContainsChineseWords}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_004_18: ${testDescription.created.object.jsonContainsChineseWords}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    // describe('and the content_type of object is application/json', function () {
      it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
        options.form['content_type'] = 'application/json';
        options.form['content'] = '{"key":"一二三"}';
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(200);
            testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form.key, (err, item) => {
              if (err) return done(err);
              console.log(`item: ${JSON.stringify(item, null, 2)}`);
              customs.object_id = item.id;
              done();
            });
          }
        }); // request
      }); // it
    // }); // and the content_type of object is application/json
  }); // If client requests creating object successfully




});