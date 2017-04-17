'use strict';

// tests for get object
// Generated by serverless-mocha-plugin

require('rootpath')();

const YAML                 = require('yamljs');
const serverlessYamlObject = YAML.load('serverless.yml');
const PATH                 = serverlessYamlObject.functions.getObject.events[0].http.path;
const METHOD               = serverlessYamlObject.functions.getObject.events[0].http.method;

const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
const PRIVATE_KEY_NAME       = 'object';
const PROJECT_NAME           = process.env.SERVERLESS_PROJECT;

const AWS                  = require('aws-sdk');
const REGION               = process.env.SERVERLESS_REGION;
const STAGE                = process.env.SERVERLESS_STAGE;
const docClient            = new AWS.DynamoDB.DocumentClient({region: REGION});
const lambda               = new AWS.Lambda({region: REGION});

const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js')
// const randomstring         = require("randomstring");
const request              = require('request');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const expect               = mochaPlugin.chai.expect;
const testHelper           = require('./lib/test_helper');
const ApiErrors            = require( 'lib/api_errors.js' );


describe('Create Domains API', () => {

  let options = {};
  let cloud_id = 'zMdCD2J7xrdn77gzcgpiJyQ'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain = 'ecowork1'
  let domain_id = 'test_domain_id'
  let object1 = 'test1_mocha.png'
  let object2 = 'test2_mocha.jpg'

  /*****************************************************************
  * 9. Object json 資料搜尋成功。
  *****************************************************************/
  describe('Successfully get object item', () => {

    before('Create a domain item', function (done) {
      this.timeout(12000);
      console.log('create domain item');
      testHelper.createDomainItem(cloud_id, app_id, domain, domain_id, (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createDomainItem
    }); // before

    before('Create an object1 item', function (done) {
      this.timeout(12000);
      console.log('create object item');

      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, 'image/png', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    before('Create an object2 item', function (done) {
      this.timeout(12000);
      console.log('create object item');

      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // createObjectItem
    }); // before

    // before('Upload an object to s3', function (done) {
    //   this.timeout(12000);
    //   console.log('upload object item to s3');
    //   // done();

    //   testHelper.uploadS3ObjectItem(cloud_id, app_id, object, domain_id, 'image/png', (err, data) => {
    //     if (err) {
    //       return done(err);
    //     } else {
    //       console.log(data);
    //       done();
    //     }
    //   }); // createObjectItem
    // }); // before


    after('Clear Testing Domain Data', function (done) {
      this.timeout(12000);
      console.log('delete domain item');
      // done();
      testHelper.deleteDomain(cloud_id, app_id, domain, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object1 Data', function (done) {
      this.timeout(12000);
      console.log('delete objec1 item');

      testHelper.deleteObject(cloud_id, app_id, object1, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after

    after('Clear Testing Object2 Data', function (done) {
      this.timeout(12000);
      console.log('delete object2 item');

      testHelper.deleteObject(cloud_id, app_id, object2, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after

    after('Clear Testing S3 Object1 Data', function (done) {
      this.timeout(12000);
      console.log('delete S3 object1 item');

      testHelper.deleteS3ObjectItem(cloud_id, app_id, object1, domain_id, 'image/png', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // deleteS3ObjectItem
    }); // after

    after('Clear Testing S3 Object2 Data', function (done) {
      this.timeout(12000);
      console.log('delete S3 object2 item');

      testHelper.deleteS3ObjectItem(cloud_id, app_id, object2, domain_id, 'image/jpg', (err, data) => {
        if (err) {
          return done(err);
        } else {
          console.log(data);
          done();
        }
      }); // deleteS3ObjectItem
    }); // after


    it("should return 'OK'", function(done) {
      this.timeout(30000);

      var before_upload_domain_usage;
      var after_upload_domain_usage;
      var before_upload_object1_usage;
      var before_upload_object2_usage;
      var after_upload_object1_usage;
      var after_upload_object2_usage;

      let getDomain = function () {
        return new Promise((resolve, reject) => {
          testHelper.getDomain(cloud_id, app_id, domain, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              before_upload_domain_usage = data.file_usage;
              console.log('before upload domain usage: ', before_upload_domain_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      };

      getDomain()
      .then((data) => {
        console.log(data);
        return new Promise((resolve, reject) => {
          testHelper.getObject(cloud_id, app_id, domain_id, object1, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              before_upload_object1_usage = data.usage;
              console.log('before upload object1 usage: ', before_upload_object1_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data);
        return new Promise((resolve, reject) => {
          testHelper.getObject(cloud_id, app_id, domain_id, object2, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              before_upload_object2_usage = data.usage;
              console.log('before upload object2 usage: ', before_upload_object2_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data)
        return new Promise((resolve, reject) => {
          // this.timeout(20000);
          testHelper.uploadS3ObjectItem(cloud_id, app_id, object1, domain_id, 'image/png', (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data)
        return new Promise((resolve, reject) => {
          // this.timeout(20000);
          testHelper.uploadS3ObjectItem(cloud_id, app_id, object2, domain_id, 'image/jpg', (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data);
        return new Promise((resolve, reject) => {
          testHelper.getObject(cloud_id, app_id, domain_id, object1, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              after_upload_object1_usage = data.usage;
              console.log('after upload object1 usage: ', after_upload_object1_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data);
        return new Promise((resolve, reject) => {
          testHelper.getObject(cloud_id, app_id, domain_id, object2, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              after_upload_object2_usage = data.usage;
              console.log('after upload object2 usage: ', after_upload_object2_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        console.log(data)
        return new Promise((resolve, reject) => {
          testHelper.getDomain(cloud_id, app_id, domain, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
              // console.log(data);
              after_upload_domain_usage = data.file_usage;
              console.log('after upload domain usage: ', after_upload_domain_usage);
              resolve(data);
            }
          }) // testHealper
        }); // Promise
      })
      .then((data) => {
        expect(after_upload_object1_usage + after_upload_object2_usage).to.equal(after_upload_domain_usage);
      })
      .then((data) => done())
      .catch((err) => {
        console.log("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        done(err);
      });

    }); // it
  }); // describe


}); // outter describe