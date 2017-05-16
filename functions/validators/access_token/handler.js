'use strict';

require('rootpath')();


// ================ ENVs ========================
const USER_INFO_URL = process.env.PCLOUD_SSO_USER_INFO_URL;


// ================ Modules =====================
const request = require('request');


// ================ Lib/Modules =================
const apiErrors = require('lib/api_errors.js');

module.exports.handler = (event, context, callback) => {

  let access_token = event.access_token;
  console.log(`access_token: ${access_token}`);

  requestUserInfo(access_token)
    .then((response) => {
      return parseUserInfo(response);
    })
    .then((data) => {
      console.log(`data: ${JSON.stringify(data)}`);
      callback(null, data);
    })
    .catch((err) => {
      console.error(err);
      console.log(`err: ${JSON.stringify(err)}`);
      callback(null, apiErrors.unauthorized.access_token_invalid);
    });
}


/**
* @function requestUserInfo
* @param  {type} access_token {description}
* @return {type} {description}
*/
function requestUserInfo(access_token) {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'get',
      url: USER_INFO_URL,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      qs: {
        access_token: access_token
      }
    }; // options

    request(options, (err, response, body) => {
      if (err) reject(err);
      else resolve(response);
    }); // requests
  });
}


/**
* @function parseUserInfo
* @param  {type} response {description}
* @return {type} {description}
*/
function parseUserInfo(response) {
  return new Promise((resolve, reject) => {
    console.log("====================parseUserInfo=======================")
    console.log(JSON.stringify(response, null, 2));
    let body = response.body;
    let headers = response.headers;
    console.log(`typeof response.statusCode: ${typeof response.statusCode}`);
    console.log(`response.statusCode: ${response.statusCode}`);
    if (response.statusCode == 200) {
      let data = JSON.parse(body);
      resolve({
        statusCode: 200,
        body: JSON.stringify({ cloud_id: data['id'], app_id: data['app_id'] }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } else if (response.statusCode == 401) {

      // if (headers['www-authenticate']) {
      //   let msg = headers['www-authenticate'];
      //   let matches = msg.match(/Bearer realm="([^"]*)", error="([^"]*)", error_description="([^"]*)"/);
      //   console.log(`matches: ${JSON.stringify(matches)}`);

      //   if (matches[2] == 'invalid_token') {
      //     // Bearer realm="Doorkeeper", error="invalid_token", error_description="The access token expired"
      //     if (matches[3].indexOf("access token") >= 0 && matches[3].indexOf("expired") >= 0) {
      //       console.log(`access token expired ...`);
      //       console.log(`body: ${JSON.stringify(apiErrors.unauthorized.access_token_expired)}`);

      //       resolve({
      //         statusCode: 401,
      //         body: JSON.stringify(apiErrors.unauthorized.access_token_expired),
      //         headers: {
      //           'Content-Type': 'application/json',
      //         }
      //       });
      //     } else {
      //       console.log(`body: ${JSON.stringify(apiErrors.unauthorized.access_token_invalid)}`);
      //       resolve({
      //         statusCode: 401,
      //         body: JSON.stringify(apiErrors.unauthorized.access_token_invalid),
      //         headers: {
      //           'Content-Type': 'application/json',
      //         }
      //       });
      //     }
      //   } // if (matches[1] == 'invalid_token') { ... }
      // } // if (headers['www-authenticate']) { ... }

      let result;

      if ( JSON.parse(body).code == apiErrors.unauthorized.access_token_invalid.code ) { // Invalid access_token 401.0
        result = {
          statusCode: 401,
          body: JSON.stringify(apiErrors.unauthorized.access_token_invalid),
          headers: {
            'Content-Type': 'application/json',
          }
        }
        console.log(result)
        resolve(result);

      } else if ( JSON.parse(body).code == apiErrors.unauthorized.access_token_expired.code ) { // Access Token Expired 401.1
        result = {
          statusCode: 401,
          body: JSON.stringify(apiErrors.unauthorized.access_token_expired),
          headers: {
            'Content-Type': 'application/json',
          }
        }
        console.log(result)
        resolve(result);

      }

    } // else if (response.statusCode == 401)

    reject();

  });
}
