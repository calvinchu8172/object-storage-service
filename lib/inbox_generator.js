'use strict';

require('rootpath')();
const isEmpty = require('is-empty');

const inboxContent = {
  data: {
    default: "", /* required */
    GCM: {
      title: "", /* required */
    },
    APNS: {
      title: "", /* required */
    }
  }
};

module.exports.generate = (params) => {
  setDefaultContent(params);
  setAndroidContent(params);
  setIosContent(params);
  return inboxContent;
} // inboxGenerator

function setDefaultContent(params) {
  // 優先使用 full_title 其次為 sns payload 的 default 最後為 title
  if (!isEmpty(params.full_title)) {
    inboxContent.data.default = params.full_title;
  } else if (!isEmpty(params.payload)) {
    inboxContent.data.default = JSON.parse(params.payload).default;
  } else if (!isEmpty(params.title)) {
    inboxContent.data.default = params.title;
  } else {
    inboxContent.data.default = "";
  }
}

function setAndroidContent(params) {
  // 優先使用 full_title 其次為 gcm payload 的 title 最後為 title
  if (!isEmpty(params.full_title)) {
    inboxContent.data.GCM.title = params.full_title;
  }
  // 判斷 GCM payload
  else if (!isEmpty(params.payload) && !isEmpty(JSON.parse(params.payload).GCM)) {
    let gcmPayload = JSON.parse(JSON.parse(params.payload).GCM);
    inboxContent.data.GCM.title = gcmPayload.notification.title;
  }
  // 用 title 參數作為 android inbox 的 title
  else if (!isEmpty(params.title)) {
    inboxContent.data.GCM.title = params.title;
  }
  // 都沒有則設定空字串
  else {
    inboxContent.data.GCM.title = "";
  }

  // 優先使用 full_body 其次為 gcm payload 的 body 最後為 body
  if (!isEmpty(params.full_body)) {
    inboxContent.data.GCM.body = params.full_body;
  }
  // 判斷 GCM payload
  else if (!isEmpty(params.payload) && !isEmpty(JSON.parse(params.payload).GCM)) {
    let gcmPayload = JSON.parse(JSON.parse(params.payload).GCM);
    if (!isEmpty(gcmPayload.notification.body)) {
      inboxContent.data.GCM.body = gcmPayload.notification.body;
    }
  }
  // 用 body 參數作為 android inbox 的 body
  else if (!isEmpty(params.body)) {
    inboxContent.data.GCM.body = params.body;
  }

}


function setIosContent(params) {
  // 優先使用 full_title 其次為 apns payload 的 title 最後為 title
  if (!isEmpty(params.full_title)) {
    inboxContent.data.APNS.title = params.full_title;
  }
  // 判斷 APNS payload
  else if (!isEmpty(params.payload) && !isEmpty(JSON.parse(params.payload).APNS)) {
    let apnsPayload = JSON.parse(JSON.parse(params.payload).APNS);
    if (typeof apnsPayload.aps.alert === 'object') {
      inboxContent.data.APNS.title = apnsPayload.aps.alert.title;
    } else {
      inboxContent.data.APNS.title = apnsPayload.aps.alert;
    }
  }
  // 用 title 參數作為 ios inbox 的 title
  else if (!isEmpty(params.title)) {
    inboxContent.data.APNS.title = params.title;
  }
  // 都沒有則設定空字串
  else {
    inboxContent.data.APNS.title = "";
  }

  // 優先使用 full_body 其次為 apns payload 的 body 最後為 body
  if (!isEmpty(params.full_body)) {
    inboxContent.data.APNS.body = params.full_body;
  }
  // 判斷 APNS payload
  else if (!isEmpty(params.payload) && !isEmpty(JSON.parse(params.payload).APNS)) {
    let apnsPayload = JSON.parse(JSON.parse(params.payload).APNS);
    if (!isEmpty(apnsPayload.aps.alert.body)) {
      inboxContent.data.APNS.body = apnsPayload.aps.alert.body;
    }
  }
  // 用 body 參數作為 ios inbox 的 body
  else if (!isEmpty(params.body)) {
    inboxContent.data.APNS.body = params.body;
  }

}
