'use strict';

require('rootpath')();

const STAGE = process.env.SERVERLESS_STAGE;


function Definitions() { }


var plaformServices = {
  android: 'GCM',
  ios: 'APNS'
};


var getPlatformService = function (platform) {
  platform = platform.toLowerCase();
  return plaformServices[platform];
}


var getAllowedPlatformServiceKeys = () => {
  return ['default', 'GCM', 'APNS'];
}

var getNotificationJobTypes = () => {
  return ['broadcast', 'personal', 'batch', 'device'];
}

var getMessageTypeIdColumnMapping = () => {
  console.log('============== getMessageTypeIdColumnMapping ==============');
  return {
    personal: {
      id_column: 'user_id',
    },
    device: {
      id_column: 'udid',
    }
  };
}

var getIdColumnNameForMessageType = (message_type) => {
  console.log('============== getIdColumnNameForMessageType ==============');
  let typeIdColumnMapping = getMessageTypeIdColumnMapping();
  let idColumnName = typeIdColumnMapping[message_type]['id_column'];
  return idColumnName;
}

var getStage = () => {
  return ((['debug', 'dev'].indexOf(STAGE) >= 0) ? 'alpha' : STAGE);
}

var hasPlatform = (platform) => {
  platform = platform.toLowerCase();
  var platforms = Object.keys(plaformServices);
  return (plaforms.indexOf(platform) >= 0);
}

var hasPlatformServiceKey = (serviceKey) => {
  return (getAllowedPlatformServiceKeys().indexOf(serviceKey) >= 0);
}

Definitions.getNotificationJobTypes = getNotificationJobTypes;
Definitions.getPlatformService = getPlatformService;
Definitions.getAllowedPlatformServiceKeys = getAllowedPlatformServiceKeys;
Definitions.getMessageTypeIdColumnMapping = getMessageTypeIdColumnMapping;
Definitions.getIdColumnNameForMessageType = getIdColumnNameForMessageType;
Definitions.getStage = getStage;
Definitions.hasPlatform = hasPlatform;
Definitions.hasPlatformServiceKey = hasPlatformServiceKey;

module.exports = Definitions;
