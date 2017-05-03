'use strict';

require('rootpath')();


// ------------- ENVs -------------
const USERS_LIMIT = process.env.NOTIFICATION_USERS_LIMIT;
const DEVICES_LIMIT = process.env.NOTIFICATION_DEVICES_LIMIT;
const APP_INFO_LIMIT = process.env.APP_INFO_SIZE_LIMIT;
const HISTORY_DAYS_LIMIT = process.env.HISTORY_DAYS_LIMIT;
const PAYLOAD_DEFAULT_SIZE_LIMIT = process.env.PAYLOAD_DEFAULT_SIZE_LIMIT;
const IOS_PAYLOAD_SIZE_LIMIT = process.env.IOS_PAYLOAD_SIZE_LIMIT;
const ANDROID_PAYLOAD_SIZE_LIMIT = process.env.ANDROID_PAYLOAD_SIZE_LIMIT;

// ------------- Modules -------------
const async = require('async');
const empty = require('is-empty');
const moment = require('moment');
const mime = require('mime-types');

// ------------- Lib/Modules -------------
const apiErrors = require('lib/api_errors.js');
const Utility = require('lib/utility.js');

/*
  Example:

  require('rootpath')();
  var paramsValidator = require('lib/api_params_validator.js');

  var response = { code: '0000', message: 'OK' };
  try {
    var validator = new paramsValidator({ signature: 'signature_val', certificate_serial: 'serial' });
    var validate_columns = ['signature', 'certificate_serial'];
    validator.validate(validate_columns);
  } catch (err_response) {
    console.log(err_response);
    response = err_response;
  }
*/

// constructor
function apiParamsValidator(param_hash) {
  var self = this;
  for (var key in param_hash) {
    self[key] = param_hash[key];
  }
}


/**
* @function validate
* @param  {type} param_keys {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validate = function (param_keys) {
  console.log('============== validate ==============');
  var self = this;
  async.eachSeries(param_keys, (key, callback) => {
    if (empty(self[key])) {
      console.log(`api_params_validator.validate -> empty key: ${key}`);
      console.log(apiErrors.missingRequiredParams[key]);
      callback(apiErrors.missingRequiredParams[key]);
    } else {
      callback();
    }
  }, (err) => {
    if (err) throw err;
  });
}


/**
* @function validateCustomValidations
* @param  {type} execValidations {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validateCustomValidations = function (execValidations) {
  console.log('============== validateCustomParams ==============');
  var self = this;
  if (empty(execValidations)) {
    execValidations = [];
  }
  execValidations.forEach(function(validationName) {
    try {
      self[validationName]();
    } catch (err) {
      if (err.stack) {
        console.error(err.stack);
      }
      console.log('throw error...');
      throw err;
    }
  });
}


/**
* @function validateDomain
* @param  {type} domain {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validateDomain = function (domain) {
  console.log('============== validateDomain ==============');
  // 限制:
  // 1. 可接受
  // 大小寫英數字
  // - ( dash )
  // _ ( underscore )
  // . ( dot )
  // 2. 命名以英文字開頭。
  // 3. 最大 128 characters
  // 4. Case Sensitive
  let matches = domain.match(/^([a-zA-Z][\w\.-]{1,127}|[a-zA-Z])$/);
  if (empty(matches)) {
    throw apiErrors.validationFailed.domain;
  }
}

/**
* @function validateDomain
* @param  {type} domain {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validateNewDomain = function (new_domain) {
  console.log('============== validateNewDomain ==============');
  // 限制:
  // 1. 可接受
  // 大小寫英數字
  // - ( dash )
  // _ ( underscore )
  // . ( dot )
  // 2. 命名以英文字開頭。
  // 3. 最大 128 characters
  // 4. Case Sensitive
  let matches = new_domain.match(/^([a-zA-Z][\w\.-]{1,127}|[a-zA-Z])$/);
  if (empty(matches)) {
    throw apiErrors.validationFailed.new_domain;
  }
}


/**
* @function validateKey
* @param  {type} key {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validateKey = function () {
  console.log('============== validateKey ==============');
  if (validateKeyRegex(this.key)) {
    throw apiErrors.validationFailed.key;
  }
}

/**
* @function validateNewKey
* @return {type} {description}
*/
apiParamsValidator.prototype.validateNewKey = function () {
  console.log('============== validateNewKey ==============');
  if (validateKeyRegex(this.new_key)) {
    throw apiErrors.validationFailed.new_key;
  }
}

/**
* @function validateKeyRegex
* @param  {type} key {description}
* @return {type} {description}
*/
function validateKeyRegex(key) {
  // 限制:
  // 1. 可接受
  // 大小寫英數字
  // - ( dash )
  // _ ( underscore )
  // . ( dot )
  // 2. 命名以英文字開頭。
  // 3. 最大 128 characters
  // 4. Case Sensitive
  let matches = key.match(/^([a-zA-Z][\w\.-]{1,127}|[a-zA-Z])$/);
  console.log(`matches: ${JSON.stringify(matches, null, 2)}`);
  return empty(matches);
}



/**
* @function validateContentType
* @param  {type} content_type {description}
* @return {type} {description}
*/
apiParamsValidator.prototype.validateContentType = function () {
  console.log('============== validateContentType ==============');
  // 限制:
  // 1. 符合 mime-types
  console.log(`content_type: ${this.content_type}`);
  if(empty(mime.extensions[this.content_type])){
    throw apiErrors.validationFailed.content_type;
  }
}


/**
* @function validateContent
* @return {type} {description}
*/
apiParamsValidator.prototype.validateContent = function () {
  console.log('============== validateContent ==============');
  // 限制:
  // 1. 符合 JSON 格式
  console.log(`content: ${this.content}`);
  try {
    JSON.parse(this.content);
  } catch(err) {
    throw apiErrors.validationFailed.content;
  }
}

module.exports = apiParamsValidator;
