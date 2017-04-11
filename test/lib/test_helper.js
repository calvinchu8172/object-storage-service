'use strict';

// 載入環境參數
const SERVICE = process.env.SERVERLESS_PROJECT;
const REGION  = process.env.SERVERLESS_REGION;
const STAGE   = process.env.SERVERLESS_STAGE;

// 載入 AWS 相關服務
const AWS       = require('aws-sdk');
const S3        = new AWS.S3({region: REGION});
const SQS       = new AWS.SQS({region: REGION});
const docClient = new AWS.DynamoDB.DocumentClient({ region: REGION });
const sns       = new AWS.SNS({region: REGION});

// 載入外部模組
const fs                   = require('fs');
const yaml                 = require('yamljs');
// const randomstring         = require("randomstring");
const request              = require('request');
const uuid                 = require('node-uuid');
const mysql                 = require('mysql');

const Utility              = require('lib/utility.js');
const signatureGenerator   = require('lib/signature_generator.js');
const serverlessYamlObject = yaml.load('serverless.yml');
const secrets              = yaml.load(`secrets.${STAGE}.yml`);

const PUSH_TOKEN = secrets.push_token;

var getDomain = function(cloud_id, app_id, name, callback) {
  console.log(REGION);
  console.log(`${STAGE}-${SERVICE}-domains`);
  console.log("*********");
  var params = {
    TableName : `${STAGE}-${SERVICE}-domains`,
    Key: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'name': name
    }
  };

  docClient.get(params, function(err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data.Item);
    }
  });
} // getJob

var createDomainItem = function(cloud_id, app_id, name, callback) {
  var params = {
    TableName : `${STAGE}-${SERVICE}-domains`,
    Item: {
        'cloud_id-app_id': `${cloud_id}-${app_id}`,
        'name': name,
        'id': uuid.v4(),
        'app_id': app_id,
        'json_usage': 0,
        'file_usage': 0,
        'created_by': '1.1.1.1',
        'created_at': Utility.getTimestamp(),
        'updated_by': '1.1.1.1',
        'updated_at': Utility.getTimestamp()
    },
    ConditionExpression: 'attribute_not_exists(#p_key)',
    ExpressionAttributeNames: { '#p_key': 'cloud_id-app_id' },
    ReturnConsumedCapacity: 'TOTAL'
  };
  docClient.put(params, function(err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data);
    }
  });
}

var getJob = function(job_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-jobs`,
    Key: { job_id }
  };

  docClient.get(params, function(err, data) {
    if (err) callback(err);
    else callback(null, data.Item);
  });
} // getJob

var getAccessKey = function(access_key_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-access-keys`,
    Key: { access_key_id }
  };

  docClient.get(params, function(err, data) {
    if (err) callback(err);
    else callback(null, data.Item);
  });
} // getAccessKey

var getInboxMessage = function (inbox_msg_id, realm_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-inbox-msgs`,
    Key: { inbox_msg_id, realm_id }
  };

  docClient.get(params, function(err, data) {
    if (err) callback(err);
    else callback(null, data.Item);
  });
} // getInboxMessage

var getNotifications = function (job_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-notifications`,
    ScanFilter: {
      job_id: {
        ComparisonOperator: 'EQ', /* required */
        AttributeValueList: [ job_id ]
      }
    }
  };

  docClient.scan(params, function (err, data) {
    if (err) callback(err);
    else callback(null, data.Items);
  });
} // getNotifications

var getDevice = function (udid, app_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-devices`,
    Key: { udid, app_id }
  };

  docClient.get(params, function (err, data) {
    if (err) callback(err);
    else callback(null, data.Item);
  });
} // getDevice

var aVeryLongMessage = function (length) {
  return randomstring.generate({
    length: parseInt(length),
    charset: 'alphanumeric'
  });
} // aVeryLongMessage

var registerDevice = function(udid, callback) {

  let METHOD = serverlessYamlObject.functions.registerMobileDevice.events[0].http.method;
  let PATH   = serverlessYamlObject.functions.registerMobileDevice.events[0].http.path;

  let API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  let REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;

  let app_info = {
    app_version: "3.1.0",
    app_build: "1609128Alpha",
    sdk_version: "1.1.0",
    sdk_build: "1609128Beta",
    timezone: "+0800",
    language: ["zh_tw", "en_us"],
    os_version: "8.0.1",
    device_model: "iPhone 7"
  };

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    form: {
      access_key_id: 'android',
      udid: udid,
      push_token: PUSH_TOKEN,
      platform: 'android',
      app_info: JSON.stringify(app_info),
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.form, options.headers, 'android');

  request(options, (err, response, body) => {
    if (err) return callback(err); // an error occurred
    else {
      return callback(null);
    }
  }); // request

} // registerDevice

var bindUser = function (udid, user_id, callback) {

  let METHOD = serverlessYamlObject.functions.bindMobileDeviceUser.events[0].http.method;
  let PATH   = serverlessYamlObject.functions.bindMobileDeviceUser.events[0].http.path;

  let API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  let REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    form: {
      access_key_id: 'android',
      udid: udid,
      user_id: user_id
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.form, options.headers, 'android');

  request(options, (err, response, body) => {
    if (err) return callback(err); // an error occurred
    else {
      return callback(null);
    }
  }); // request
} // bindUser

var scanJob = function (callback) {
  var params = {
    TableName: `${SERVICE}-${STAGE}-jobs`,
    ScanFilter: {
      job_id: {
        ComparisonOperator: 'NOT_NULL', /* required */
      },
    },
  };

  docClient.scan(params, function(err, data) {
    if (err) return callback(err); // an error occurred
    else {
      // console.log(JSON.stringify(data, null, 2));
      return callback(null, data.Items);           // successful response
    }
  });
} // scanJob

var deleteDomain = function (cloud_id, app_id, name, callback) {
  var params = {
    TableName: `${STAGE}-${SERVICE}-domains`,
    Key: {
      'cloud_id-app_id': `${cloud_id}-${app_id}`,
      'name': name
    }
  };

  docClient.delete(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(err); // an error occurred
    }
    else {
      console.log(data);
      return callback(null, data);           // successful response
    }
  });
} // deleteDomain

var deleteJob = function (job_id, callback) {
  var params = {
    Key: { job_id },
    TableName: `${SERVICE}-${STAGE}-jobs`,
  };

  docClient.delete(params, function(err, data) {
    if (err) return callback(err); // an error occurred
    else     return callback(null, data);           // successful response
  });
} // deleteJob

var clearJobsTable = function (callback) {

  let jobs = scanJob((err, jobs) => {
    if (err) return callback(err);
    let promises = jobs.map(job => {
      return new Promise((resolve, reject) => {
        deleteJob(job.job_id, (err, data) => {
          if (err) reject(err);
          else resolve(null, data);
        }); // deleteJob
      }); // Promise
    }); // map
    return Promise.all(promises);
  });

  return callback();
} // clearJobsTable

var scanNotification = function (callback) {
  var params = {
    TableName: `${SERVICE}-${STAGE}-notifications`,
    ScanFilter: {
      notification_id: {
        ComparisonOperator: 'NOT_NULL', /* required */
      },
    },
  };

  docClient.scan(params, function(err, data) {
    if (err) return callback(err); // an error occurred
    else     return callback(null, data.Items);           // successful response
  });
} // scanNotification

var deleteNotification = function (notification_id, job_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-notifications`,
    Key: { notification_id, job_id }
  };

  docClient.delete(params, function(err, data) {
    if (err) return callback(err);
    else     return callback(null, data);
  });
} // deleteNotification

var clearNotificationsTable = function (callback) {

  scanNotification((err, notifications) => {
    if (err) return callback(err);
    let promises =  notifications.map(notification => {
      return new Promise((resolve, reject) => {
        deleteNotification(notification.notification_id, notification.job_id, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        }); // deleteNotification
      }); // Promise
    }); // map
    return Promise.all(promises);
  });
  return callback();
} // clearNotificationsTable

var scanInboxMsg = function (callback) {
  var params = {
    TableName: `${SERVICE}-${STAGE}-inbox-msgs`,
    ScanFilter: {
      inbox_msg_id: {
        ComparisonOperator: 'NOT_NULL', /* required */
      },
    },
  };

  docClient.scan(params, function(err, data) {
    if (err) return callback(err); // an error occurred
    else     return callback(null, data.Items);           // successful response
  });
} // scanInboxMsg

var deleteInboxMsg = function (inbox_msg_id, realm_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-inbox-msgs`,
    Key: { inbox_msg_id, realm_id }
  };

  docClient.delete(params, function(err, data) {
    if (err) return callback(err);
    else     return callback(null, data);
  });
} // deleteInboxMsg

var clearInboxMsgsTable = function (callback) {

  let inbox_msgs = scanInboxMsg((err, inbox_msgs) => {
    if (err) return callback(err);
    let promises =  inbox_msgs.map(inbox_msg => {
      return new Promise((resolve, reject) => {
        deleteInboxMsg(inbox_msg.inbox_msg_id, inbox_msg.realm_id, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        }); // deleteInboxMsg
      }); // Promise
    }); // map
    return Promise.all(promises);
  });
  return callback();
} // clearInboxMsgsTable

var deleteDevice = function (udid, app_id, callback) {
  const params = {
    TableName : `${SERVICE}-${STAGE}-devices`,
    Key: { udid, app_id }
  };

  docClient.delete(params, function(err, data) {
    if (err) return callback(err);
    else     return callback(null, data);
  });
} // deleteDevice

let deleteS3Object = (Bucket, Key, callback) => {
  const params = { Bucket, Key };
  S3.deleteObject(params, function(err, data) {
    if (err) callback(err);
    else     callback(null, data);
  });
} // deleteObject

var sendBroadcastNotification = function (title, callback) {
  let METHOD = serverlessYamlObject.functions.sendBroadcastNotifications.events[0].http.method;
  let PATH   = serverlessYamlObject.functions.sendBroadcastNotifications.events[0].http.path;

  let API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  let REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    form: {
      access_key_id: 'realm',
      title,
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.form, options.headers, 'realm');

  request(options, (err, response, body) => {
    if (err) return callback(err); // an error occurred
    let parsedBody = JSON.parse(body);
    return callback(null, parsedBody);
  }); // request
} // sendBroadcastNotification

var sendDeviceNotification = function (title, udids, callback) {
  let METHOD = serverlessYamlObject.functions.sendDeviceNotifications.events[0].http.method;
  let PATH   = serverlessYamlObject.functions.sendDeviceNotifications.events[0].http.path;

  let API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  let REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    form: {
      access_key_id: 'realm',
      title,
      udids
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.form, options.headers, 'realm');

  request(options, (err, response, body) => {
    if (err) return callback(err); // an error occurred
    let parsedBody = JSON.parse(body);
    return callback(null, parsedBody);
  }); // request
} // sendDeviceNotification

var sendPersonalNotification = function (title, user_ids, callback) {
  let METHOD = serverlessYamlObject.functions.sendPersonalNotifications.events[0].http.method;
  let PATH   = serverlessYamlObject.functions.sendPersonalNotifications.events[0].http.path;

  let API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  let REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    form: {
      access_key_id: 'realm',
      title,
      user_ids
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.form, options.headers, 'realm');

  request(options, (err, response, body) => {
    if (err) return callback(err); // an error occurred
    let parsedBody = JSON.parse(body);
    return callback(null, parsedBody);
  }); // request
} // sendPersonalNotification

var unsubscribeTestDevice = function (SubscriptionArn, callback) {
  let params = { SubscriptionArn };
  sns.unsubscribe(params, function(err, data) {
    if (err) return callback(err); // an error occurred
    else     return callback(null, data); // successful response
  });
} // unsubscribeTestDevice

var getSignedUploadUrl = function (type, callback) {
  const PATH                 = serverlessYamlObject.functions.getSignedUploadUrl.events[0].http.path;
  const METHOD               = serverlessYamlObject.functions.getSignedUploadUrl.events[0].http.method;

  const API_GATEWAY_INVOKE_URL = process.env.API_GATEWAY_INVOKE_URL;
  const REQUEST_URL            = `${API_GATEWAY_INVOKE_URL}/${PATH}`;
  const PRIVATE_KEY_NAME       = 'realm';

  let options = {
    method: METHOD,
    url: REQUEST_URL,
    headers: {
      'X-Eco-Timestamp': Utility.getTimestamp(),
      'X-Eco-Signature': ''
    },
    qs: {
      access_key_id: PRIVATE_KEY_NAME,
      type,
      job_description: 'optional params',
      app_id: '419b0e28-a418-4e79-8dda-72cafbf4b036'
    }
  }; // options

  options.headers['X-Eco-Signature'] = signatureGenerator.generate(options.qs, options.headers, PRIVATE_KEY_NAME);

  request(options, (err, response, body) => {
    if (err) return done(err); // an error occurred
    if (process.env.SLS_DEBUG) {
      console.log(body);
    }
    let parsedBody = JSON.parse(body);
    return callback(null, parsedBody);
  }); // request
}


var createAccessToken = function (token, callback) {
  var queryString = 'INSERT INTO oauth_access_tokens SET ?';
  var oauth_access_token = {
    resource_owner_id: 79, 
    application_id: 6, 
    token: token,
    refresh_token: "refresh_token",
    expires_in: 21600,
    created_at: "2010-01-01 00:00:00",
    scopes: ""
  }
  var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  connection.connect();
  connection.query(queryString, oauth_access_token, function (error, results, fields) {
    connection.end();
    if (error) {
      console.error(error);
      callback(error);
    }
    else {
      console.log(`results: ${JSON.stringify(results)}`);
      callback(null, results);
    }
  });
}



var deleteAccessToken = function (expired_token_id, callback) {
  var queryString = `DELETE FROM oauth_access_tokens WHERE id = ${expired_token_id}`;
  console.log(queryString);
  var connection = mysql.createConnection(secrets.databases.pcloud_portal_rds);
  connection.connect();
  connection.query(queryString, function (error, results, fields) {
    connection.end();
    if (error) {
      console.error(error);
      callback(error);
    }
    else {
      console.log(`results: ${JSON.stringify(results)}`);
      callback();
    }
  });
}


module.exports = {
  getDomain,
  createDomainItem,
  getJob,
  getAccessKey,
  getInboxMessage,
  getNotifications,
  getDevice,
  aVeryLongMessage,
  registerDevice,
  bindUser,
  clearJobsTable,
  deleteDomain,
  deleteJob,
  clearNotificationsTable,
  clearInboxMsgsTable,
  deleteDevice,
  deleteS3Object,
  sendBroadcastNotification,
  sendDeviceNotification,
  sendPersonalNotification,
  unsubscribeTestDevice,
  getSignedUploadUrl,
  createAccessToken,
  deleteAccessToken
};
