'use strict';

require('rootpath')();


// ================ Modules =====================
const mochaPlugin = require('serverless-mocha-plugin');
const request = require('request');
const uuidV4 = require('uuid/v4');
const fs = require('fs');
const async = require('async');
const sleep = require('sleep');
const expect = mochaPlugin.chai.expect;
const YAML = require('yamljs');
const serverlessYamlObject = YAML.load('serverless.yml');


// ================ ENVs ========================
const SERVICE              = process.env.SERVERLESS_PROJECT;
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const X_API_KEY = process.env.X_API_KEY;
const CONTENT_TYPE = process.env.CONTENT_TYPE;
const CERTIFICATE_SERIAL = process.env.CERTIFICATE_SERIAL;
const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN;
const TEST_CLOUD_ID = process.env.TEST_CLOUD_ID;
const TEST_APP_ID = process.env.TEST_APP_ID;
const PRIVATE_KEY_NAME = "object";
const PATH = serverlessYamlObject.functions.updateObject.events[0].http.path;
const METHOD = serverlessYamlObject.functions.updateObject.events[0].http.method;
const REQUEST_URL = `${API_GATEWAY_INVOKE_URL}/${PATH}`;


// ================ Lib/Modules =================
const testHelper = require('./lib/test_helper');
const signatureGenerator = require('lib/signature_generator.js')
const ApiErrors = require('lib/api_errors.js');
const testDescription = require('./lib/test_description');
const csvWriter = require('./lib/csv_writer');

// ================== AWS ===================
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: REGION });


describe('OSS_011: Update Object API', () => {

  let options = {};
  let customs = {
    cloud_id: TEST_CLOUD_ID,
    app_id: TEST_APP_ID,
    domain_name: "test_domain",
    key: "test_key",
    new_key: "test_new_key"
  };

  before('Create a csv file and write first row.', function (done) {
    csvWriter.title_write('OSS_011: Update Object API');
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
        content_type: "image/png"
      },
      setFormAndPath: function (json) {
        if (json["domain"]) this.form.domain = json["domain"];
        if (json["key"]) this.form.key = json["key"];
        this.url = REQUEST_URL.replace("{domain}", this.form.domain).replace("{key}", this.form.key);
      }
    }; // options

    delete options.form.new_key;
    options.setFormAndPath({ domain: customs.domain_name, key: customs.key });

    done();
  }); // beforeEach


  before('Create Test Domain', function (done) {
    console.log(`Create Test Domain...`);
    let domain_id = uuidV4();
    customs.domain_id = domain_id;
    console.log(`domain_name: ${customs.domain_name}`);
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



  // OSS_011_01
  describe(`OSS_011_01: ${testDescription.missingRequiredParams.api_key}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_01: ${testDescription.missingRequiredParams.api_key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.forbidden.x_api_key)}`);
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

  // OSS_011_02
  describe(`OSS_011_02: ${testDescription.missingRequiredParams.signature}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_02: ${testDescription.missingRequiredParams.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.signature)}`);
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


  // OSS_011_03
  describe(`OSS_011_03: ${testDescription.missingRequiredParams.certificate_serial}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_03: ${testDescription.missingRequiredParams.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.certificate_serial)}`);
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



  // OSS_011_04
  describe(`OSS_011_04: ${testDescription.validationFailed.certificate_serial}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_04: ${testDescription.validationFailed.certificate_serial}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.certificate_serial)}`);
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


  // OSS_011_05
  describe(`OSS_011_05: ${testDescription.validationFailed.signature}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_05: ${testDescription.validationFailed.signature}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.signature)}`);
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


  // // OSS_011_06
  describe(`OSS_011_06: ${testDescription.missingRequiredParams.access_token}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_06: ${testDescription.missingRequiredParams.access_token}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.access_token)}`);
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


  // OSS_011_07
  describe(`OSS_011_07: ${testDescription.unauthorized.access_token_invalid}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_07: ${testDescription.unauthorized.access_token_invalid}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_invalid)}`);
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


  // OSS_011_08
  describe(`OSS_011_08: ${testDescription.unauthorized.access_token_expired}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_08: ${testDescription.unauthorized.access_token_expired}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.unauthorized.access_token_expired)}`);
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



  // OSS_011_09
  describe(`OSS_011_09: ${testDescription.validationFailed.new_key}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_09: ${testDescription.validationFailed.new_key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.new_key)}`);
      done();
    }); // before

    describe(`${testDescription.invalidObject.begins_with_number}`, () => {
      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.new_key)}`, function (done) {

        options.form.new_key = "123abc";
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.new_key.httpStatus);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.new_key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.new_key.message);
            done();
          }
        }); // request
      }); // it
    }); // describe

    describe(`${testDescription.invalidObject.with_unacceptable_characters}`, () => {
      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.new_key)}`, function (done) {

        options.form.new_key = "abc*";
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.new_key.httpStatus);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.new_key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.new_key.message);
            done();
          }
        }); // request
      }); // it
    }); // describe

    describe(`${testDescription.invalidObject.over_128_characters}`, () => {
      it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.new_key)}`, function (done) {

        let invalid_key_name = 'invalid_object_name'

        while (invalid_key_name.length < 129) {
          invalid_key_name += ('_' + invalid_key_name);
        }
        invalid_key_name += '.jpg'

        options.form.new_key = invalid_key_name;
        options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
        request(options, (err, response, body) => {
          if (err) done(err); // an error occurred
          else {
            console.log(response.body);
            expect(response.statusCode).to.equal(ApiErrors.validationFailed.new_key.httpStatus);
            let parsedBody = JSON.parse(body);
            expect(parsedBody).to.have.all.keys(['code', 'message']);
            expect(parsedBody.code).to.equal(ApiErrors.validationFailed.new_key.code);
            expect(parsedBody.message).to.equal(ApiErrors.validationFailed.new_key.message);
            done();
          }
        }); // request
      }); // it
    }); // describe

  }); // If the key param in request is invalid


  // OSS_011_10
  describe(`OSS_011_10: ${testDescription.missingRequiredParams.content_type}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_10: ${testDescription.missingRequiredParams.content_type}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content_type)}`);
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


  // OSS_011_11
  describe(`OSS_011_11: ${testDescription.validationFailed.content_type}`, function () {
    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_11: ${testDescription.validationFailed.content_type}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content_type)}`);
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


  // OSS_011_12
  describe(`OSS_011_12: ${testDescription.missingRequiredParams.content}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_12: ${testDescription.missingRequiredParams.content}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.missingRequiredParams.content)}`);
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


  // OSS_011_13
  describe(`OSS_011_13: ${testDescription.validationFailed.content}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_13: ${testDescription.validationFailed.content}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.content)}`);
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



  // OSS_011_14
  describe(`OSS_011_14: ${testDescription.notFound.domain}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_14: ${testDescription.notFound.domain}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.domain)}`, function (done) {

      options.setFormAndPath({ domain: 'unavailable_domain' });
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


  // OSS_011_15
  describe(`OSS_011_15: ${testDescription.notFound.object}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_15: ${testDescription.notFound.object}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.object)}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.notFound.object)}`, function (done) {

      options.setFormAndPath({ key: 'unavailable_object' });
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(ApiErrors.notFound.object.httpStatus);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.all.keys(['code', 'message']);
          expect(parsedBody.code).to.equal(ApiErrors.notFound.object.code);
          expect(parsedBody.message).to.equal(ApiErrors.notFound.object.message);
          done();
        }
      }); // request
    }); // it
  }); // Can not find object by key


  // OSS_011_16
  describe(`OSS_011_16: ${testDescription.alreadyExists.key}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_16: ${testDescription.alreadyExists.key}\n${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key_duplicated)}`);
      done();
    }); // before

    before('Create Target Object Item', function (done) {
      console.log(`Create Target Object Item...`);
      customs.target_object_id = uuidV4();
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.target_object_id,
        key: customs.key,
        usage: 0,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${customs.key}`,
        content_type: options.form.content_type
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Create Duplicated Object Item', function (done) {
      console.log(`Create Duplicated Object Item...`);
      customs.duplicated_object_id = uuidV4();
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.duplicated_object_id,
        key: customs.new_key,
        usage: 0,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${customs.new_key}`,
        content_type: options.form.content_type
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    after('Delete Target Object Item', function (done) {
      console.log(`Delete Target Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.target_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.duplicated_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(ApiErrors.validationFailed.key_duplicated)}`, function (done) {
      options.form.new_key = customs.new_key;
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


  // OSS_011_17 ( application/json -> application/json )
  describe(`OSS_011_17: ${testDescription.updated.object.jsonToJson}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_17: ${testDescription.updated.object.jsonToJson}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create Target Object Item', function (done) {
      console.log(`Create Target Object Item...`);
      customs.target_object_id = uuidV4();
      customs.content_type = 'application/json';
      customs.content = '{}';
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.target_object_id,
        key: options.form.key,
        usage: 0,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${options.form.key}`,
        content_type: customs.content_type,
        content: customs.content
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.target_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after


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
            customs.target_object_id = item.id;
            let new_item_usage = Buffer.byteLength(JSON.stringify(options.form['content']), 'utf8');
            expect(item.usage).to.equal(new_item_usage); // 驗證 json object 的 usage 確實修改

            testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
              if (err) return done(err);
              console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
              expect(domainItem.file_usage).to.equal(0);
              let new_item_usage = Buffer.byteLength(JSON.stringify(options.form['content']), 'utf8');
              console.log(`new_item_usage: ${new_item_usage}`);
              expect(domainItem.json_usage).to.equal(new_item_usage); // 驗證 domain 的 json usage 確實修改
              done();
            });
          });
        }
      }); // request
    }); // it


    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {
      options.form['content_type'] = 'application/json';
      options.form['content'] = '{\"key1\": \"value1\", \"key2\": \"value2\"}';
      options.form['new_key'] = 'test_key_2';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(200);
          testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form.new_key, (err, item) => {
            if (err) return done(err);
            console.log(`item: ${JSON.stringify(item, null, 2)}`);
            let new_item_usage = Buffer.byteLength(JSON.stringify(options.form['content']), 'utf8');
            expect(item.usage).to.equal(new_item_usage); // 驗證 json object 的 usage 確實修改

            testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
              if (err) return done(err);
              console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
              expect(domainItem.file_usage).to.equal(0);
              let new_item_usage = Buffer.byteLength(JSON.stringify(options.form['content']), 'utf8');
              console.log(`new_item_usage: ${new_item_usage}`);
              expect(domainItem.json_usage).to.equal(new_item_usage); // 驗證 domain 的 json usage 確實修改
              done();
            });
          });
        }
      }); // request
    }); // it

  }); // If client requests creating object successfully


  // OSS_011_18 ( application/json -> file )
  describe(`OSS_011_18: ${testDescription.updated.object.jsonToFile}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_18: ${testDescription.updated.object.jsonToFile}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create Target Object Item', function (done) {
      console.log(`Create Target Object Item...`);
      customs.target_object_id = uuidV4();
      customs.content = '{\"key1\": \"value1\", \"key2\": \"value2\"}';
      customs.old_item_usage = Buffer.byteLength(customs.content, 'utf8');
      console.log(`customs.old_item_usage: ${customs.old_item_usage}`);
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.target_object_id,
        key: options.form.key,
        usage: customs.old_item_usage,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${options.form.key}`,
        content_type: 'application/json',
        content: customs.content
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Get Domain Original Usage', function (done) {
      testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
        if (err) return done(err);
        console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
        customs.file_usage = domainItem.file_usage;
        customs.json_usage = domainItem.json_usage;
        done();
      });
    });

    after('Delete Duplicated Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.target_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OKAndPresignURL)}`, function (done) {
      options.form['content_type'] = 'image/png';
      options.form['new_key'] = 'test_mocha_2.png';
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(200);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.keys('data');
          expect(parsedBody.data).to.have.keys('upload_url');
          testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form.new_key, (err, item) => {
            if (err) return done(err);
            console.log(`item: ${JSON.stringify(item, null, 2)}`);
            customs.target_object_id = item.id;
            expect(item).to.have.property('usage');
            expect(item.usage).to.equal(0);
            expect(item).to.not.have.property('content');
            expect(item.domain_path).to.equal(`${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`);
            expect(item.path).to.equal(`${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${options.form.new_key}`);

            testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
              if (err) return done(err);
              console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
              expect(domainItem.file_usage).to.equal(customs.file_usage);
              expect(domainItem.json_usage).to.equal((customs.json_usage - customs.old_item_usage));
              done();
            });

          });
        }
      }); // request
    }); // it

  }); // If client requests creating object successfully


  // OSS_011_19 ( file -> file )
  describe(`OSS_011_19: ${testDescription.updated.object.fileToFile}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_19: ${testDescription.updated.object.fileToFile}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create Target Object Item', function (done) {
      console.log(`Create Target Object Item...`);
      customs.file_key = "test_mocha.png";
      customs.target_object_id = uuidV4();
      const stats = fs.statSync("test/tmp/test_mocha.png");
      const fileSizeInBytes = stats.size;
      console.log(`fileSizeInBytes: ${fileSizeInBytes}`);
      customs.old_item_usage = fileSizeInBytes;
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.target_object_id,
        key: customs.file_key,
        usage: customs.old_item_usage,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${customs.file_key}`,
        content_type: 'image/png'
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Update Domain Usage', function (done) {
      console.log(`customs.old_item_usage: ${customs.old_item_usage}`);
      testHelper.updateDomainFileUsage(customs.cloud_id, customs.app_id, customs.domain_id, customs.old_item_usage, (err, result) => {
        if (err) return done(err);
        done();
      });
    });

    before('Get Domain Original Usage', function (done) {
      testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
        if (err) return done(err);
        console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
        customs.file_usage = domainItem.file_usage;
        customs.json_usage = domainItem.json_usage;
        done();
      });
    });

    after('Delete Target Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.target_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OKAndPresignURL)}`, function (done) {
      options.form['content_type'] = 'image/png';
      options.form['new_key'] = 'test_mocha_2.png';
      options.setFormAndPath({ key: customs.file_key });
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      console.log(`options: ${JSON.stringify(options, null, 2)}`);
      request(options, (err, response, body) => {
        if (err) done(err); // an error occurred
        else {
          console.log(response.body);
          expect(response.statusCode).to.equal(200);
          let parsedBody = JSON.parse(body);
          expect(parsedBody).to.have.keys('data');
          expect(parsedBody.data).to.have.keys('upload_url');
          testHelper.getObject(customs.cloud_id, customs.app_id, customs.domain_id, options.form['new_key'], (err, item) => {
            if (err) return done(err);
            console.log(`item: ${JSON.stringify(item, null, 2)}`);
            customs.target_object_id = item.id;
            expect(item).to.have.property('usage');
            expect(item.usage).to.equal(customs.old_item_usage);
            expect(item).to.not.have.property('content');
            expect(item.domain_path).to.equal(`${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`);
            expect(item.path).to.equal(`${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${options.form.new_key}`);

            testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
              if (err) return done(err);
              console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
              expect(domainItem.file_usage).to.equal(customs.file_usage);
              expect(domainItem.json_usage).to.equal((customs.json_usage));
              done();
            });
          });
        }
      }); // request
    }); // it
  }); // OSS_011_19


  // OSS_011_20 ( file -> application/json )
  describe(`OSS_011_20: ${testDescription.updated.object.fileToJson}`, function () {

    before('Write in csv', function (done) {
      csvWriter.write(`OSS_011_20: ${testDescription.updated.object.fileToJson}\n${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`);
      done();
    }); // before

    before('Create Target Object Item', function (done) {
      console.log(`Create Target Object Item...`);
      customs.file_key = "test_mocha.png";
      customs.target_object_id = uuidV4();
      const stats = fs.statSync("test/tmp/test_mocha.png");
      customs.old_item_usage = stats.size;
      customs.content_type = 'image/png';
      let object_item = {
        domain_id: customs.domain_id,
        id: customs.target_object_id,
        key: customs.file_key,
        usage: customs.old_item_usage,
        domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
        path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${customs.file_key}`,
        content_type: customs.content_type
      }
      testHelper.createObjectItem(object_item, customs.app_id, (err, data) => {
        if (err) return done(err);
        else {
          console.log(`data: ${JSON.stringify(data)}`);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Upload Object File', function (done) {
      testHelper.uploadS3ObjectItem(customs.cloud_id, customs.app_id, customs.file_key, customs.domain_id, customs.content_type, (err, result) => {
        if (err) return done(err);
        done();
      });
      // testHelper.updateDomainFileUsage(customs.cloud_id, customs.app_id, customs.domain_id, customs.old_item_usage, (err, result) => {
      //   if (err) return done(err);
      //   done();
      // });
    });

    before('Sleep for a while', function (done) {
      this.timeout(6000);
      // 因在 gitlab-ci 跑測試時，上一步 upload file 至 s3 觸發 s3Handler Lamda 後還沒更新完 domain 與 Object，下一步過快取得的 usage 會導致測試錯誤，所以等待兩秒
      sleep.sleep(2);
      done();
    }); // before

    // before('Update Domain Usage', function (done) {
    //   console.log(`customs.old_item_usage: ${customs.old_item_usage}`);
    //   testHelper.updateDomainFileUsage(customs.cloud_id, customs.app_id, customs.domain_id, customs.old_item_usage, (err, result) => {
    //     if (err) return done(err);
    //     done();
    //   });
    // });

    before('Get Domain Original Usage', function (done) {
      testHelper.getDomain(customs.cloud_id, customs.app_id, customs.domain_name, (err, domainItem) => {
        if (err) return done(err);
        console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
        customs.original_domain_file_usage = domainItem.file_usage;
        customs.original_domain_json_usage = domainItem.json_usage;
        done();
      });
    });

    after('Delete Target Object Item', function (done) {
      console.log(`Delete Duplicated Object Item...`);
      testHelper.deleteObjectItem(customs.domain_id, customs.target_object_id, customs.app_id, (err, data) => {
        if (err) done(err);
        else done();
      }); // deleteObjectItem
    }); // after

    it(`${testDescription.server_return} ${JSON.stringify(testDescription.OK)}`, function (done) {

      let params = {
        content_type: 'application/json',
        content: '{\"key1\": \"value1\", \"key2\": \"value2\"}'
      }
      customs.new_item_usage = Buffer.byteLength(JSON.stringify(params.content), 'utf8');

      let expectedCode = 200;
      let expectedBody = { "data": { "upload_url": {} } };
      let path = { domain: customs.domain_name, key: customs.file_key };
      setRequest(options, params, path)
        .then((options) => {
          return sendRequest(options);
        })
        .then((data) => {
          return assertResponse(data, expectedCode)
        })
        .then((data) => {
          return getObjectItem(customs.cloud_id, customs.app_id, customs.domain_id, customs.file_key);
        })
        .then((objItem) => {
          console.log(`objItem: ${JSON.stringify(objItem, null, 2)}`);
          let properties = ['usage', 'content', 'content_type', 'domain_path', 'path', 'created_at', 'updated_at'];
          let expected_values = {
            usage: customs.new_item_usage,
            content: options.form['content'],
            domain_path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}`,
            path: `${customs.cloud_id}/${customs.app_id}/${customs.domain_id}/${customs.file_key}`
          }
          return assertItem(objItem, properties, expected_values);
        })
        .then(() => {
          return getDomainItem(customs.cloud_id, customs.app_id, customs.domain_name);
        })
        .then((domainItem) => {
          console.log(`domainItem: ${JSON.stringify(domainItem, null, 2)}`);
          let expected_values = {
            file_usage: (customs.original_domain_file_usage - customs.old_item_usage),
            json_usage: (customs.original_domain_json_usage + customs.new_item_usage)
          }
          return assertItem(domainItem, null, expected_values);
        })
        .then(() => {
          done();
        })
        .catch((error) => {
          console.log(`error: ${error}`);
          done(error);
        })


    }); // it

  }); // OSS_011_20

});


/**
* @function setRequest
* @param  {type} options {description}
* @param  {type} params  {description}
* @param  {type} path    {description}
* @return {type} {description}
*/
let setRequest = (options, params, path) => {
  return new Promise((resolve, reject) => {
    if (path) {
      options.url = REQUEST_URL;
      async.eachOfSeries(path, (v, k, callback) => {
        console.log(`k: ${k}`);
        console.log(`v: ${v}`);
        options.url = options.url.replace(`{${k}}`, v);
        params[k] = v;
        callback();
      }, (err) => {
        if (err) reject(err);
        console.log(`params: ${JSON.stringify(params, null, 2)}`);
        setParams(options, params, (err, res) => {
          if (err) reject(err);
          else resolve(options);
        });
      });
    } else {
      setParams(options, params, (err, res) => {
        if (err) reject(err);
        else resolve(options);
      });
    }
  });
}

/**
* @function setParams
* @param  {type} options  {description}
* @param  {type} params   {description}
* @param  {type} callback {description}
* @return {type} {description}
*/
let setParams = (options, params, callback) => {
  async.eachOfSeries(params, (v, k, cb) => {
    let method = options.method.toUpperCase();
    if (['POST', 'PUT'].indexOf(method) > -1) {
      options.form[k] = v;
    } else if (['GET', 'DELETE'].indexOf(method) > -1) {
      options.qs[k] = v;
    }
    cb();
  }, (err) => {
    if (err) callback(err);
    options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
    callback(null, options);
  });
}

/**
* @function sendRequest
* @param  {type} options {description}
* @return {type} {description}
*/
let sendRequest = (options) => {
  return new Promise((resolve, reject) => {
    console.log(`options: ${JSON.stringify(options, null, 2)}`);
    request(options, (err, response, body) => {
      if (err) reject(err);
      console.log(`response: ${JSON.stringify(response, null, 2)}`);
      console.log(`body: ${JSON.stringify(body, null, 2)}`);

      let data = {};
      data['response'] = response;
      data['body'] = body;
      resolve(data);
    });
  });
}

/**
* @function assertResponse
* @param  {type} data         {description}
* @param  {type} expectedCode {description}
* @param  {type} expectedBody {description}
* @return {type} {description}
*/
let assertResponse = (data, expectedCode, expectedBody) => {
  return new Promise((resolve, reject) => {
    let response = data['response'];
    expect(response.statusCode).to.equal(expectedCode);
    if (expectedBody) {
      let parsedBody = JSON.parse(body);
      objectRecursiveExpects(expectedBody, parsedBody, (err, res) => {
        if (err) reject(err);
        else resolve(data);
      });
    } else {
      resolve(data)
    }
  });
}

/**
* @function objectRecursiveExpects
* @param  {type} expectedBody {description}
* @param  {type} body         {description}
* @param  {type} callback     {description}
* @return {type} {description}
*/
let objectRecursiveExpects = (expectedBody, body, callback) => {
  if (typeof expectedBody === 'object') {
    let keys = Object.keys(expectedBody);
    async.eachSeries(params, (k, cb) => {
      expect(body).to.have.keys(k);
      objectRecursiveExpects(expectedBody[k], body[k], (err, res) => {
        if (err) cb(err);
        else cb(null, res);
      });
    }, (err) => {
      if (err) callback(err);
      options.headers['X-Signature'] = signatureGenerator.generate(options.form, options.headers, PRIVATE_KEY_NAME);
      callback(null, options);
    });
  } else {
    callback();
  }
}

/**
* @function getObjectItem
* @param  {type} cloud_id   {description}
* @param  {type} app_id     {description}
* @param  {type} domain_id  {description}
* @param  {type} object_key {description}
* @return {type} {description}
*/
let getObjectItem = (cloud_id, app_id, domain_id, object_key) => {
  return new Promise((resolve, reject) => {
    testHelper.getObject(cloud_id, app_id, domain_id, object_key, (err, item) => {
      if (err) reject(err);
      else resolve(item);
    });
  });
}

/**
* @function assertItem
* @param  {type} item            {description}
* @param  {type} properties      {description}
* @param  {type} expected_values {description}
* @return {type} {description}
*/
let assertItem = (item, properties, expected_values) => {
  console.log('============== assertItem ==============');
  return new Promise((resolve, reject) => {
    // console.log(`properties: ${JSON.stringify(properties)}`);
    // console.log(`expected_values: ${JSON.stringify(expected_values)}`);
    if (properties) {
      console.log(`keys: ${Object.keys(item)}`);
      console.log(`properties: ${JSON.stringify(properties, null, 2)}`);
      expect(item).to.contain.all.keys(properties);
    }
    async.eachOfSeries(expected_values, (v, k, cb) => {
      console.log(`item[k]: ${item[k]}, k: ${k}, v: ${v}`);
      expect(item[k]).to.equal(v);
      cb();
    }, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

/**
* @function getDomainItem
* @param  {type} cloud_id    {description}
* @param  {type} app_id      {description}
* @param  {type} domain_name {description}
* @return {type} {description}
*/
let getDomainItem = (cloud_id, app_id, domain_name) => {
  console.log('============== getDomainItem ==============');
  return new Promise((resolve, reject) => {
    testHelper.getDomain(cloud_id, app_id, domain_name, (err, item) => {
      if (err) reject(err);
      else resolve(item);
    });
  });
}
