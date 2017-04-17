'use strict';

require('rootpath')();


const STAGE   = process.env.SERVERLESS_STAGE;

const mysql = require('mysql');
const yaml = require('yamljs');
const moment = require('moment');
const secrets = yaml.load(`secrets.${STAGE}.yml`);

module.exports.handler = (event, context, callback) => {

  if(event.functionName === 'createAccessToken') {
    let token = event.token;
    let expires_in = event.expires_in;
    createAccessToken(token, expires_in, callback);
  }
  else if (event.functionName === 'deleteAccessToken') {
    let expired_token_id = event.expired_token_id;
    deleteAccessToken(expired_token_id, callback);
  } else {
    console.log(`else...`);
    callback();
  }

}



/**
* @function createAccessToken
* @param  {type} token      {description}
* @param  {type} expires_in {description}
* @param  {type} callback   {description}
* @return {type} {description}
*/
var createAccessToken = function (token, expires_in, callback) {
  var queryString = 'INSERT INTO oauth_access_tokens SET ?';
  var oauth_access_token = {
    resource_owner_id: 79,
    application_id: 6,
    token: token,
    refresh_token: "refresh_token",
    expires_in: expires_in,
    created_at: moment.utc().format('YYYY-MM-DD hh:mm:ss'),
    scopes: ""
  }
  console.log(JSON.stringify(oauth_access_token));
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


/**
* @function deleteAccessToken
* @param  {type} expired_token_id {description}
* @param  {type} callback         {description}
* @return {type} {description}
*/
var deleteAccessToken = function (expired_token_id, callback) {
  var queryString = `DELETE FROM oauth_access_tokens WHERE id = ${expired_token_id}`;
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
      callback(null, results);
    }
  });
}
