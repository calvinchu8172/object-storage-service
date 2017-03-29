'use strict';

require('rootpath')();
const isEmpty = require('is-empty');
const paramsValidator = require('lib/api_params_validator.js');

const snsPayload = {
  default: ''
};

const iosPayload = {
  aps: {
    alert: {
      title: ''
    }
  }
};

const androidPayload = {
  notification: {
    title: ''
  },
  data: {}
};

const defaultViewer = {
  mode: 'ViewText',
  url: ''
};

const defaultCommand = {
  action: 'ViewMessageDetail'
};

const defaultMeta = {};

module.exports.generate = (params, requestId, s3Url) => {
  try {
    // const validator = new paramsValidator(params);
    defaultViewer.url = s3Url;
    // validator.validatePayloadOrTitle();

    if (params.payload) {
      const payload = JSON.parse(params.payload);
      return createSnsPayloadFromPayload(payload, requestId, s3Url);
    } else {
      const body = params.body || '';
      return createSnsPayloadFromTitle(params.title, body, requestId, s3Url);
    }
  } catch (err) {
    throw err;
  }
} // payloadGenerator

function createSnsPayloadFromPayload(payload, requestId, s3Url) {
  if (!isEmpty(payload.APNS)) {
    const apnsPyaload = checkCustomPayload(JSON.parse(payload.APNS), requestId, s3Url);
    payload.APNS = JSON.stringify(apnsPyaload);
  }
  if (!isEmpty(payload.GCM)) {
    const gcmPyaload = JSON.parse(payload.GCM);
    if (isEmpty(gcmPyaload.data)) {
      gcmPyaload.data = {};
    }
    const gcmDataPyaload = checkCustomPayload(gcmPyaload.data, requestId, s3Url);

    payload.GCM = JSON.stringify(gcmPyaload);
  }

  return JSON.stringify(payload);
}

function checkCustomPayload(payload, requestId, s3Url) {
  if (isEmpty(payload.viewer)) {
    payload.viewer = defaultViewer;
  }
  // 當 s3Url 不為空字串時，表示有指定存入 inbox 並已產生 url
  else if (!isEmpty(s3Url)) {
    payload.viewer.url = s3Url;
  }

  if (isEmpty(payload.command)) {
    payload.command = defaultCommand;
  }
  if (isEmpty(payload.meta)) {
    payload.meta = defaultMeta;
  }

  payload.req_id = requestId;
  // payload.msg_id = messageId;

  return payload;
}

function createSnsPayloadFromTitle(title, body, requestId, s3Url) {
  snsPayload.default = title;
  iosPayload.aps.alert.title = title;
  androidPayload.notification.title = title;

  if (!isEmpty(body)) {
    iosPayload.aps.alert.body = body;
    androidPayload.notification.body = body;
  }

  checkCustomPayload(iosPayload, requestId, s3Url);
  checkCustomPayload(androidPayload.data, requestId, s3Url);

  snsPayload.APNS = JSON.stringify(iosPayload);
  snsPayload.GCM  = JSON.stringify(androidPayload);

  return JSON.stringify(snsPayload);
}


