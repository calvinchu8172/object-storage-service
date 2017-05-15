'use strict';


require('rootpath')();

// ================ Modules =====================
const YAML                 = require('yamljs');
const request              = require('request');
const uuidV4               = require('uuid/v4');
const mochaPlugin          = require('serverless-mocha-plugin');
const moment               = require( 'moment' );
const expect               = mochaPlugin.chai.expect;


// ================ ENVs ========================
// const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
const PROJECT_NAME           = process.env.SERVERLESS_PROJECT;
const REGION                 = process.env.SERVERLESS_REGION;
const STAGE                  = process.env.SERVERLESS_STAGE;
const CSV_FILE               = process.env.CSV_FILE;
// const serverlessYamlObject   = YAML.load('serverless.yml');
// const PATH                   = serverlessYamlObject.functions.getObject.events[0].http.path;
// const METHOD                 = serverlessYamlObject.functions.getObject.events[0].http.method;
// const REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
// const PRIVATE_KEY_NAME       = 'object';



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



describe('OSS_005: S3 Event Handler', () => {

  // let options = {};
  // let customs = {};
  let cloud_id = 'zLanZi_liQQ_N_xGLr5g8mw'
  let app_id = '886386c171b7b53b5b9a8fed7f720daa96297225fdecd2e81b889a6be7abbf9d'
  let domain_name = 'test_domain_name'
  let domain_id = 'test_domain_id'
  let object1 = 'test1_mocha.png'
  let object_id1 = 'test_object_id1'
  let object2 = 'test2_mocha.jpg'
  let object_id2 = 'test_object_id2'

  before('Write in csv.', function (done) {
    csvWriter.title_write('OSS_005: S3 Event Handler');
    done();
  }); // before

  /*****************************************************************
  * 1. S3 Handler 修改 Domain file_usage 與 Object usage 成功。
  *****************************************************************/
  describe(`OSS_005_01: ${testDescription.s3Handler}`, () => {

    before('Write in csv.', function (done) {
      csvWriter.write(`OSS_005_01: ${testDescription.s3Handler}\n${testDescription.server_return} ${testDescription.OKWithDomainFileUsageEqualAllOjectUsage}`);
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

    before('Create an object1 item', function (done) {
      this.timeout(12000);
      console.log('create object item');
      // var object_id1 = uuidV4();
      // customs.object_id1 = object_id1;
      testHelper.createObjectItem1(cloud_id, app_id, object1, domain_id, object_id1, 'image/png', (err, data) => {
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
      // var object_id2 = uuidV4();
      // customs.object_id2 = object_id2;
      testHelper.createObjectItem1(cloud_id, app_id, object2, domain_id, object_id2, 'image/jpg', (err, data) => {
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
      // done();
      testHelper.deleteDomain(cloud_id, app_id, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteDomain
    }); // after

    after('Clear Testing Object1 Data', function (done) {
      this.timeout(12000);
      console.log('delete objec1 item');

      testHelper.deleteObject(cloud_id, app_id, object_id1, domain_id, (err, data) => {
        if (err) return done(err);
        return done();
      }); // deleteObject
    }); // after

    after('Clear Testing Object2 Data', function (done) {
      this.timeout(12000);
      console.log('delete object2 item');

      testHelper.deleteObject(cloud_id, app_id, object_id2, domain_id, (err, data) => {
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


    it(`${testDescription.server_return} ${testDescription.OKWithDomainFileUsageEqualAllOjectUsage}`, function(done) {
      this.timeout(30000);

      var before_upload_domain_usage;
      var after_upload_domain_usage;
      var before_upload_object1_usage;
      var before_upload_object2_usage;
      var after_upload_object1_usage;
      var after_upload_object2_usage;

      let getDomain = function () {
        return new Promise((resolve, reject) => {
          testHelper.getDomain(cloud_id, app_id, domain_name, (err, data) => {
            if (err) {
              console.log(err)
              reject(err); // an error occurred
            } else {
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
          testHelper.getDomain(cloud_id, app_id, domain_name, (err, data) => {
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