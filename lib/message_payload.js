'use strict';

require('rootpath')();


// ------------- ENVs -------------
const REGION = process.env.SERVERLESS_REGION;


// ------------- Modules -------------
const empty = require('is-empty');
const async = require('async');
const fs = require('fs');


// ------------- Lib/Modules -------------
const DynamoOp = require('lib/dynamodb_operator.js');
const SigVerifier = require('lib/signature_verifier.js');
const Definitions = require('lib/definitions.js');
const ParamsValidator = require('lib/api_params_validator.js');
const ApiErrors = require('lib/api_errors.js');
const Utility = require('lib/utility.js');

// ------------- AWS -------------
const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  region: REGION
});
const SQS = new AWS.SQS({
  region: REGION
});

function MessagePayload(sns_msg_payload) {
  if (typeof sns_msg_payload == 'string') {
    sns_msg_payload = JSON.parse(sns_msg_payload);
  }
  // set payload object
  this['notificationPayloadObj'] = Utility.cloneObject(sns_msg_payload);

  var payload;
  // parse payload of each platform
  for (var platform_service in sns_msg_payload) {

    console.log(`platform_service: ${platform_service}`);
    if (!Definitions.hasPlatformServiceKey(platform_service)) {
      throw ApiErrors.validationFailed.payload_structure_service(platform_service);
    }
    this[platform_service] = {};
    if (platform_service == 'default') {
      this[platform_service]['title'] = sns_msg_payload[platform_service];
    } else {
      var message_payload = sns_msg_payload[platform_service];

      try {
        if (typeof message_payload == 'string') payload = JSON.parse(message_payload);
        else if (typeof message_payload == 'object') payload = message_payload;
      } catch (jsonParseErr) {
        throw jsonParseErr;
      }
      // 執行指定推播服務名稱的 payload 驗證 function
      // * 例如 platform_service == 'APNS' 則執行 parseAPNSPayload()
      // * 例如 platform_service == 'GCM' 則執行 parseGCMPayload()
      var parsed;
      try {
        parsed = parseFunctions[`parse${platform_service}Payload`](payload);
      } catch (apiErr) {
        throw apiErr;
      }
      this[platform_service]['title'] = parsed['title'];
      if (!empty(parsed['body'])) {
        this[platform_service]['body'] = parsed['body'];
      }
      if (!empty(parsed['viewer'])) {
        this[platform_service]['viewer'] = parsed['viewer'];
      }
      if (!empty(parsed['command'])) {
        this[platform_service]['command'] = parsed['command'];
      }
    }
  }
}

var parseFunctions = {
  parseAPNSPayload: function (iosPayload) {
    var parsed = {};
    // aps 與 alert 都要有
    if (empty(iosPayload.aps)) {
      throw ApiErrors.validationFailed.payload_structure('iOS', 'aps');
    }
    console.log(`iosPayload.aps: ${JSON.stringify(iosPayload.aps)}`);
    // parse aps.alert
    if (empty(iosPayload.aps.alert)) {
      throw ApiErrors.validationFailed.payload_structure('iOS', 'alert');
    }

    if (typeof iosPayload.aps.alert === 'object') {
      // parse title
      if (empty(iosPayload.aps.alert.title)) {
        throw ApiErrors.validationFailed.payload_structure('iOS', 'title');
      } else {
        parsed['title'] = iosPayload.aps.alert.title;
      }
      // parse body
      if (iosPayload.aps.alert.body) {
        parsed['body'] = iosPayload.aps.alert.body;
      }
    } else if (typeof iosPayload.aps.alert === 'string') {
      parsed['title'] = iosPayload.aps.alert;
    }
    var custom;
    try {
      custom = this.parseCustomPayload(iosPayload);
    } catch (err) {
      throw err;
    }
    if (!empty(custom.viewer)) {
      parsed['viewer'] = custom.viewer;
    }
    console.log(`command: ${JSON.stringify(custom.command)}`);
    if (!empty(custom.command)) {
      parsed['command'] = custom.command;
    }
    return parsed;
  },
  parseGCMPayload: function (androidPayload) {
    var parsed = {};
    // notification 與 title 都要有
    if (empty(androidPayload.notification)) {
      throw ApiErrors.validationFailed.payload_structure('Android', 'notification');
    }
    if (empty(androidPayload.notification.title)) {
      throw ApiErrors.validationFailed.payload_structure('Android', 'title');
    }

    parsed['title'] = androidPayload.notification.title;
    if (!empty(androidPayload.notification.body)) {
      parsed['body'] = androidPayload.notification.body;
    }
    if (!empty(androidPayload.data)) {
      var custom;
      try {
        custom = this.parseCustomPayload(androidPayload.data);
      } catch (err) {
        throw err;
      }
      if (!empty(custom.viewer)) {
        parsed['viewer'] = custom.viewer;
      }
      console.log(`command: ${JSON.stringify(custom.command)}`);
      if (!empty(custom.command)) {
        parsed['command'] = custom.command;
      }
    }
    return parsed;
  },
  parseCustomPayload: function (customPayload) {
    var custom = {};
    // viewer (Optional)
    const viewer = customPayload.viewer;
    if (!empty(viewer)) {
      if (!empty(viewer.mode) && isInvalidMode(viewer.mode)) {
        throw ApiErrors.validationFailed.payload_value('Mode');
      }
      custom['viewer'] = viewer;
    }
    const command = customPayload.command;
    if (!empty(command)) {
      if (!empty(command.action) && isInvalidAction(command.action)) {
        throw ApiErrors.validationFailed.payload_value('Action');
      }
      if (isParamsRequiredAction(command.action)) {
        if (empty(command.params) || Object.keys(command.params).length == 0) {
          throw ApiErrors.validationFailed.payload_value('Params');
        }
      }
      custom['command'] = command;
    }
    return custom;
  }
}

// 需要有 params 的 actions
const paramsRequiredActions = [
  'ViewPrivateMessage'
];

function isParamsRequiredAction(command_action) {
  return paramsRequiredActions.indexOf(command_action) > -1;
}

function isInvalidAction(action) {
  return ['ViewMessageList', 'ViewMessageDetail', 'ViewPrivateMessage'].indexOf(action) === -1;
}

function isInvalidMode(mode) {
  return ['OpenInternal', 'OpenExternal', 'ViewText'].indexOf(mode) === -1;
}

MessagePayload.prototype.getTitle = function (platform_service) {
  var self = this;
  if (!empty(self[platform_service]) && !empty(self[platform_service]['title'])) return self[platform_service]['title'];
}

MessagePayload.prototype.getBody = function (platform_service) {
  var self = this;
  if (!empty(self[platform_service]) && !empty(self[platform_service]['body'])) return self[platform_service]['body'];
}

MessagePayload.prototype.getViewer = function (platform_service) {
  var self = this;
  if (self.hasPlatformViewer(platform_service)) return self[platform_service]['viewer'];
}

MessagePayload.prototype.getViewerMode = function (platform_service) {
  var self = this;
  if (self.hasPlatformViewerMode(platform_service)) return self[platform_service]['viewer']['mode'];
}

MessagePayload.prototype.setViewerMode = function (platform_service, mode) {
  var self = this;
  self[platform_service]['viewer']['mode'] = mode;
}

MessagePayload.prototype.getViewerUrl = function (platform_service) {
  var self = this;
  if (self.hasPlatformViewerUrl(platform_service)) return self[platform_service]['viewer']['url'];
}

MessagePayload.prototype.getCommand = function (platform_service) {
  var self = this;
  if (self.hasPlatformCommand(platform_service)) return self[platform_service]['command'];
}

MessagePayload.prototype.getAllPlatformModeUrl = function () {
  var self = this;
  var all_platform_mode_url = {};
  var allowedServices = Definitions.getAllowedPlatformServiceKeys();

  allowedServices.forEach(function (service_key, index) {
    if (service_key != 'default' && self.hasPlatform(service_key)) {
      all_platform_mode_url['mode'] = {};
      all_platform_mode_url['url'] = {};
      all_platform_mode_url['mode'][service_key] = {};
      all_platform_mode_url['url'][service_key] = {};
      all_platform_mode_url['mode'][service_key] = self.getViewerMode(service_key);
      all_platform_mode_url['url'][service_key] = self.getViewerUrl(service_key);
    }
  });
  return all_platform_mode_url;
}

MessagePayload.prototype.getNotificationPayload = function () {
  var self = this;
  if (!empty(self['notificationPayloadObj'])) {
    Definitions.getAllowedPlatformServiceKeys().forEach(function (service_key, index) {
      if(service_key !== 'default') {
        if (!empty(self['notificationPayloadObj'][service_key])) {
          if(typeof self['notificationPayloadObj'][service_key] === 'object') {
            self['notificationPayloadObj'][service_key] = JSON.stringify(self['notificationPayloadObj'][service_key]);
          }
        } // if (!empty(self['notificationPayloadObj'][service_key])) { ... } 
      } // if(service_key !== 'default') { ... } 
    })
  }
  return JSON.stringify(self['notificationPayloadObj']);
}

MessagePayload.prototype.setNotificationPayload = function (payload_obj) {
  var self = this;
  if (!empty(notificationPayloadObj['APNS']['viewer']['url']))
    self['notificationPayloadObj'] = payload_obj;
}

MessagePayload.prototype.getPayloadServiceKeys = function () {
  var self = this;
  var keys = [];
  var allowedServices = Definitions.getAllowedPlatformServiceKeys();
  allowedServices.forEach(function (service_key, index) {
    if (self.hasPlatform(service_key)) keys.push(service_key);
  });
  return keys;
}

MessagePayload.prototype.hasPlatform = function (platform_service) {
  var self = this;
  return !empty(self[platform_service]);
}

MessagePayload.prototype.hasPlatformViewer = function (platform_service) {
  var self = this;
  return (self.hasPlatform(platform_service) && !empty(self[platform_service]['viewer']));
}

MessagePayload.prototype.hasPlatformViewerMode = function (platform_service) {
  var self = this;
  return (self.hasPlatformViewer(platform_service) && !empty(self[platform_service]['viewer']['mode']));
}

MessagePayload.prototype.hasPlatformViewerUrl = function (platform_service) {
  var self = this;
  return (self.hasPlatformViewer(platform_service) && !empty(self[platform_service]['viewer']['url']));
}

MessagePayload.prototype.isPlatformViewTextMode = function (platform_service) {
  var self = this;
  return (self.hasPlatformViewerMode(platform_service) && self.getViewerMode(platform_service) == 'ViewText');
}

MessagePayload.prototype.hasPlatformCommand = function (platform_service) {
  var self = this;
  return (self.hasPlatform(platform_service) && !empty(self[platform_service]['command']));
}

MessagePayload.prototype.setViewTextUrl = function (platformService, viewTextUrl) {
  var self = this;
  // * 如果傳入的 payload 有包含對應的推播平台 ( platformService ) 的 viewer 設定
  // * 且如果 viewer 設定的 mode 為 ViewText
  if (self.isPlatformViewTextMode(platformService)) {
    var notificationPayloadObj = self['notificationPayloadObj'];
    switch (platformService) {
      case 'APNS':
        if (typeof notificationPayloadObj['APNS'] === 'string') {
          notificationPayloadObj['APNS'] = JSON.parse(notificationPayloadObj['APNS']);
        }
        notificationPayloadObj['APNS']['viewer']['url'] = viewTextUrl;
        break;
      case 'GCM':
        if (typeof notificationPayloadObj['GCM'] === 'string') {
          notificationPayloadObj['GCM'] = JSON.parse(notificationPayloadObj['GCM']);
        }
        notificationPayloadObj['GCM']['data']['viewer']['url'] = viewTextUrl;
        break;
      default:
        return reject(new Error(`Error: Invalid platform service.`));
    }
    self[platformService]['viewer']['url'] = viewTextUrl;
  }
}



module.exports = MessagePayload;


