'use strict';


require('rootpath')();

// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const uuidV4               = require('uuid/v4');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const isEmpty              = require('is-empty');
const expect               = mochaPlugin.chai.expect;


// ================ ENVs ========================
const PROJECT_NAME           = process.env.SERVERLESS_PROJECT;
const REGION                 = process.env.SERVERLESS_REGION;
const STAGE                  = process.env.SERVERLESS_STAGE;
const TEST_CLOUD_ID          = process.env.TEST_CLOUD_ID;
const TEST_APP_ID            = process.env.TEST_APP_ID;
const LAMBDA_FUNCTION        = 'housekeeping'


// ================ Lib/Modules =================
const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js')
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require( 'lib/api_errors.js' );
const testDescription      = require('./lib/test_description');
const csvWriter            = require('./lib/csv_writer');


// ================== AWS ===================
const AWS                  = require('aws-sdk');
const docClient            = new AWS.DynamoDB.DocumentClient({region: REGION});
const lambda               = new AWS.Lambda({region: REGION});


describe('OSS_014: Housekeeping', () => {

  // let options = {};
  // let customs = {};
  let cloud_id = TEST_CLOUD_ID
  let app_id = TEST_APP_ID
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'
  let object1 = 'test1_mocha.png'
  let object_id1 = 'test_object_id1'
  let object2 = 'test2_mocha.jpg'
  let object_id2 = 'test_object_id2'
  let object_json = 'test1_mocha.json'
  let object_json_id = 'test_object_json_id'
  let request_id = 'test_request_id'

  before('Write in csv.', function (done) {
    csvWriter.title_write('OSS_014: Housekeeping');
    done();
  }); // before

  before('Purge SQS', function (done) {
    this.timeout(12000);
    testHelper.purgeSQS((err, data) => {
      if (err) {
        return done(err);
      } else {
        // console.log(data);
        done();
      }
    }); // purgeSQS
  }); // before

  /*****************************************************************
  * 1. Housekeeking 在沒有 SQS message 的情況下，回 SQS is empty。
  *****************************************************************/
  describe(`OSS_014_01: ${testDescription.housekeeping.emptySQS}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_014_01: ${testDescription.housekeeping.emptySQS}\n${testDescription.server_return} ${testDescription.housekeeping.return.emptySQS}`);
      done();
    }); // before

    it(`${testDescription.server_return} ${testDescription.housekeeping.return.emptySQS}`, function(done) {
      this.timeout(30000);

      let invokeHousekeeping = function () {
        return new Promise((resolve, reject) => {
          testHelper.invokeLambda(LAMBDA_FUNCTION, null, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              resolve(data);
            }
          }) // testHelper.invokeLambda
        }); // Promise
      };

      invokeHousekeeping()
      .then((data) => {
        console.log(data);
        expect(JSON.parse(data.Payload)).to.have.all.keys(['message']);
        expect(JSON.parse(data.Payload).message).to.equal('SQS is empty');
      })
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });

    }); // it


  }); // describe

  /*****************************************************************
  * 2. Housekeeking 在沒有 objects 與 s3 檔案的情況下，刪除 SQS domain message。
  *****************************************************************/
  describe(`OSS_014_02: ${testDescription.housekeeping.noObjectsAndS3Files}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_014_02: ${testDescription.housekeeping.noObjectsAndS3Files}\n${testDescription.server_return} ${testDescription.housekeeping.return.OKwithDeleteSQSMessage}`);
      done();
    }); // before

    before('Create a domain item', function (done) {
      this.timeout(12000);
      console.log('create domain item');
      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createDomainItem
    }); // before

    before('Send Message to SQS', function (done) {
      testHelper.sendSQSMessage(cloud_id, app_id, domain_id, request_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }) // sendSQSMessage
    }); // before

    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);
      console.log('delete domain item');
      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    it(`${testDescription.server_return} ${testDescription.housekeeping.return.OKwithDeleteSQSMessage}`, function(done) {
      this.timeout(30000);

      let invokeHousekeeping = function () {
        return new Promise((resolve, reject) => {
          testHelper.invokeLambda(LAMBDA_FUNCTION, null, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              resolve(data);
            }
          }) // testHelper.invokeLambda
        }); // Promise
      };

      invokeHousekeeping()
      .then((data) => {
        return new Promise((resolve, reject) => {
          testHelper.queryObject(cloud_id, app_id, domain_id, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              console.log(data);
              expect(isEmpty(data)).to.equal(true);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        return new Promise((resolve, reject) => {
          testHelper.listS3Objects(cloud_id, app_id, domain_id, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              expect(isEmpty(data.Contents)).to.equal(true);
              expect(data.KeyCount).to.equal(0);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        return new Promise((resolve, reject) => {
          testHelper.receiveSQSMessage((err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              expect(isEmpty(data.Messages)).to.equal(true);
              resolve();
            }
          }) // testHealper
        }); // Promise
      })
      .then(() => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });

    }); // it
  }); // describe


  /*****************************************************************
  * 3. Housekeeking 成功刪除 objects 與 s3 資料夾。
  *****************************************************************/
  describe(`OSS_014_03: ${testDescription.housekeeping.successDeleteObjectsAndS3Files}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_014_03: ${testDescription.housekeeping.successDeleteObjectsAndS3Files}\n${testDescription.server_return} ${testDescription.housekeeping.return.OKWithDelteObjectsAndS3Files}`);
      done();
    }); // before

    before('Create a domain item', function (done) {
      this.timeout(12000);
      console.log('create domain item');
      testHelper.createDomainItem(cloud_id, app_id, domain_name, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create a file object1 item', function (done) {
      this.timeout(12000);
      console.log('create object item');
      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, object_id1, 'image/png', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Create a file object2 item', function (done) {
      this.timeout(12000);
      console.log('create object item');
      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, object_id2, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Create a json object item', function (done) {
      this.timeout(12000);

      testHelper.createObjectItem1(cloud_id, app_id, object_json, domain_id, object_json_id, 'application/json', (err, data) => {
        if (err) return done(err);
        done();
      }); // createDomainItem
    }); // before

    before('Upload an object1 item to S3', function (done) {
      this.timeout(12000);
      testHelper.uploadS3ObjectItem(cloud_id, app_id, object1, domain_id, 'image/png', (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }) // uploadS3ObjectItem
    }); // before

    before('Upload an object2 item to S3', function (done) {
      this.timeout(12000);
      testHelper.uploadS3ObjectItem(cloud_id, app_id, object2, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }) // uploadS3ObjectItem
    }); // before

    before('Send Message to SQS', function (done) {
      testHelper.sendSQSMessage(cloud_id, app_id, domain_id, request_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          done();
        }
      }) // sendSQSMessage
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


    it(`${testDescription.server_return} ${testDescription.housekeeping.return.OKWithDelteObjectsAndS3Files}`, function(done) {
      this.timeout(30000);

      let invokeHousekeeping = function () {
        return new Promise((resolve, reject) => {
          testHelper.invokeLambda(LAMBDA_FUNCTION, null, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              resolve(data);
            }
          }) // testHelper.invokeLambda
        }); // Promise
      };

      invokeHousekeeping()
      .then((data) => {
        return new Promise((resolve, reject) => {
          testHelper.queryObject(cloud_id, app_id, domain_id, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              console.log(data);
              expect(isEmpty(data)).to.equal(true);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        // console.log(data);
        return new Promise((resolve, reject) => {
          testHelper.listS3Objects(cloud_id, app_id, domain_id, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              expect(isEmpty(data.Contents)).to.equal(true);
              expect(data.KeyCount).to.equal(0);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        return new Promise((resolve, reject) => {
          testHelper.receiveSQSMessage((err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              expect(isEmpty(data.Messages)).to.equal(true);
              resolve();
            }
          }) // testHealper
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