'use strict';

// 載入環境參數
const PROJECT    = process.env.SERVERLESS_PROJECT
const STAGE      = process.env.SERVERLESS_STAGE;

// 設定 Key 的類型名稱
const REALM_KEY_TYPE = 'realm';
const APP_KEY_TYPE   = 'app';

const apiPermissions = {

  [`${PROJECT}-${STAGE}-registerMobileDevice`]      : [APP_KEY_TYPE],
  [`${PROJECT}-${STAGE}-bindMobileDeviceUser`]      : [REALM_KEY_TYPE, APP_KEY_TYPE],
  [`${PROJECT}-${STAGE}-unbindMobileDeviceUser`]    : [REALM_KEY_TYPE, APP_KEY_TYPE],

  [`${PROJECT}-${STAGE}-sendBroadcastNotifications`]: [REALM_KEY_TYPE],
  [`${PROJECT}-${STAGE}-sendPersonalNotifications`] : [REALM_KEY_TYPE],
  [`${PROJECT}-${STAGE}-sendDeviceNotifications`]   : [REALM_KEY_TYPE],
  [`${PROJECT}-${STAGE}-getSignedUploadUrl`]        : [REALM_KEY_TYPE],

  [`${PROJECT}-${STAGE}-checkJobStatus`]            : [REALM_KEY_TYPE],
  [`${PROJECT}-${STAGE}-getDeliveryHistory`]        : [REALM_KEY_TYPE],

  [`${PROJECT}-${STAGE}-createBroadcastInbox`]      : [REALM_KEY_TYPE],
  [`${PROJECT}-${STAGE}-createPersonalInbox`]       : [REALM_KEY_TYPE],

  [`${PROJECT}-${STAGE}-getBroadcastInboxList`]     : [APP_KEY_TYPE],
  [`${PROJECT}-${STAGE}-getPersonalInboxList`]      : [APP_KEY_TYPE],

  [`${PROJECT}-${STAGE}-getBroadcastInboxDetail`]   : [APP_KEY_TYPE],
  [`${PROJECT}-${STAGE}-getPersonalInboxDetail`]    : [APP_KEY_TYPE]
};

module.exports = apiPermissions;
