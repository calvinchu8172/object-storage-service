'use strict';

require('rootpath')();
const HISTORY_DAYS_LIMIT          = process.env.HISTORY_DAYS_LIMIT;
const USERS_LIMIT                 = process.env.NOTIFICATION_USERS_LIMIT;
const DEVICES_LIMIT               = process.env.NOTIFICATION_DEVICES_LIMIT;
const ROWS_LIMIT                  = process.env.MAXIMUM_NUMBER_OF_ROWS_OF_CSV;
const APP_INFO_SIZE_LIMIT         = process.env.APP_INFO_SIZE_LIMIT;
const PAYLOAD_DEFAULT_SIZE_LIMIT  = process.env.PAYLOAD_DEFAULT_SIZE_LIMIT;
const IOS_PAYLOAD_SIZE_LIMIT      = process.env.IOS_PAYLOAD_SIZE_LIMIT;
const ANDROID_PAYLOAD_SIZE_LIMIT  = process.env.ANDROID_PAYLOAD_SIZE_LIMIT;

/*
  This is a mapping table, all of the errors are defined here !

  How to use ?

  const apiErrors = require('lib/api_errors.js')

  const response = {
    code: apiErrors.missingRequiredParams.signature.code,
    msg: apiErrors.missingRequiredParams.signature.message,
  }
*/

const apiErrors = {};

apiErrors.missingRequiredParams = {};
apiErrors.missingRequiredParams.signature          = { httpStatus: 400, code: "4000", message: "Missing Required Signature" }
apiErrors.missingRequiredParams.access_key_id      = { httpStatus: 400, code: "4001", message: "Missing Required Access Key ID" }
apiErrors.missingRequiredParams.timestamp          = { httpStatus: 400, code: "4002", message: "Missing Required Timestamp" }
apiErrors.missingRequiredParams.udid               = { httpStatus: 400, code: "4003", message: "Missing Required UDID" }
apiErrors.missingRequiredParams.udids              = { httpStatus: 400, code: "4004", message: "Missing Required UDIDs" }
apiErrors.missingRequiredParams.payload_or_title   = { httpStatus: 400, code: "4005", message: "Missing Required Payload or Title" }
apiErrors.missingRequiredParams.user_id            = { httpStatus: 400, code: "4006", message: "Missing Required User ID" }
apiErrors.missingRequiredParams.user_ids           = { httpStatus: 400, code: "4007", message: "Missing Required User IDs" }
apiErrors.missingRequiredParams.job_id             = { httpStatus: 400, code: "4008", message: "Missing Required Job ID" }
apiErrors.missingRequiredParams.platform           = { httpStatus: 400, code: "4009", message: "Missing Required Platform" }
apiErrors.missingRequiredParams.type               = { httpStatus: 400, code: "4010", message: "Missing Required Type" }
apiErrors.missingRequiredParams.app_info           = { httpStatus: 400, code: "4011", message: "Missing Required App Info" }
apiErrors.missingRequiredParams.push_token         = { httpStatus: 400, code: "4012", message: "Missing Required Push Token" }
apiErrors.missingRequiredParams.days               = { httpStatus: 400, code: "4013", message: "Missing Required Days" }
apiErrors.missingRequiredParams.from               = { httpStatus: 400, code: "4014", message: "Missing Required From" }
apiErrors.missingRequiredParams.to                 = { httpStatus: 400, code: "4015", message: "Missing Required To" }
apiErrors.missingRequiredParams.topic_name         = { httpStatus: 400, code: "4016", message: "Missing Required Topic Name" }
apiErrors.missingRequiredParams.inbox_msg_id       = { httpStatus: 400, code: "4017", message: "Missing Required Inbox Msg ID" }
apiErrors.missingRequiredParams.title              = { httpStatus: 400, code: "4018", message: "Missing Required Title" }
apiErrors.missingRequiredParams.body               = { httpStatus: 400, code: "4019", message: "Missing Required Body" }
apiErrors.missingRequiredParams.uri                = { httpStatus: 400, code: "4020", message: "Missing Required URI" }
apiErrors.missingRequiredParams.app_id             = { httpStatus: 400, code: "4021", message: "Missing Required App ID" }

apiErrors.validationFailed = {};
apiErrors.validationFailed.signature                 = { httpStatus: 400, code: "5000", message: "Invalid Signature" }
apiErrors.validationFailed.time_interval             = { httpStatus: 400, code: "5001", message: "Invalid Time Interval" }
apiErrors.validationFailed.app_id_not_matched        = { httpStatus: 403, code: "5002", message: "The Access Key Can Not Access Other Applications" }
apiErrors.validationFailed.access_key_type           = { httpStatus: 403, code: "5003", message: "Permission Denied, Please Check The Type Of Your Access Key Again" }
apiErrors.validationFailed.timestamp                 = { httpStatus: 400, code: "5004", message: "Timestamp Expired" }
apiErrors.validationFailed.days_limit                = { httpStatus: 400, code: "5005", message: `Exceeded The Limit of ${HISTORY_DAYS_LIMIT} days` }
apiErrors.validationFailed.users_limit               = { httpStatus: 400, code: "5006", message: `Exceeded The Limit of ${USERS_LIMIT} users` }
apiErrors.validationFailed.devices_limit             = { httpStatus: 400, code: "5007", message: `Exceeded The Limit of ${DEVICES_LIMIT} devices` }
apiErrors.validationFailed.access_key_revoked        = { httpStatus: 400, code: "5008", message: "The Access Key Has Been Revoked" }
apiErrors.validationFailed.upload_type               = { httpStatus: 400, code: "5009", message: "Invalid Upload Type" }
apiErrors.validationFailed.payload                   = { httpStatus: 400, code: "5010", message: "Invalid Payload" }
apiErrors.validationFailed.payload_structure         = (type, key) => { return { httpStatus: 400, code: "5011", message: `Invalid ${type} Payload Structure. (Missing Required Key: ${key})` }; }
apiErrors.validationFailed.payload_structure_service = (service) => { return { httpStatus: 400, code: "5012", message: `Invalid Payload Structure. (Unknown Service: ${service})` }; }
apiErrors.validationFailed.column_name               = { httpStatus: 400, code: "5013", message: "Invalid Column Name" }
apiErrors.validationFailed.column_order              = { httpStatus: 400, code: "5014", message: "Invalid Column Order" }
apiErrors.validationFailed.columns                   = { httpStatus: 400, code: "5015", message: "The Number Of The Columns Is Incorrect" }
apiErrors.validationFailed.rows_limit                = { httpStatus: 400, code: "5016", message: `The Number Of The Rows Exceeds The Limit (MAXIMUM is ${ROWS_LIMIT})` }
apiErrors.validationFailed.payload_value             = (key) => { return { httpStatus: 400, code: "5017", message: `The Value Of ${key} In Payload Is Invalid` }; }
apiErrors.validationFailed.yyyymm_from               = { httpStatus: 400, code: "5018", message: "Invalid YYYYMM From" }
apiErrors.validationFailed.yyyymm_to                 = { httpStatus: 400, code: "5019", message: "Invalid YYYYMM To" }
apiErrors.validationFailed.from_bigger_than_to       = { httpStatus: 400, code: "5020", message: "From YYYYMM cannot bigger than To YYYYMM" }
apiErrors.validationFailed.app_info                  = (key) => { return { httpStatus: 400, code: "5021", message: `Invalid App Info. (Missing Required Key: ${key})` }; }
apiErrors.validationFailed.app_info_limit            = { httpStatus: 400, code: "5022", message: `Invalid App Info. (Exceeded The Limit of ${APP_INFO_SIZE_LIMIT} bytes)` }
apiErrors.validationFailed.access_key_inactive       = { httpStatus: 400, code: "5023", message: "The Access Key Not Activated" }
apiErrors.validationFailed.device_has_been_bound     = { httpStatus: 400, code: "5024", message: "The Device Has Been Bound With Another User" }
apiErrors.validationFailed.user_id_mismatch          = { httpStatus: 400, code: "5025", message: "User ID Mismatch, Unbind Failed" }
apiErrors.validationFailed.app_info_format           = { httpStatus: 400, code: "5026", message: "Invalid App Info Format" }
apiErrors.validationFailed.payload_default_limit     = { httpStatus: 400, code: "5027", message: `Invalid Payload. (The Value of "default" Exceeded The Limit of ${PAYLOAD_DEFAULT_SIZE_LIMIT} bytes)` }
apiErrors.validationFailed.ios_payload_limit         = { httpStatus: 400, code: "5028", message: `Invalid iOS Payload. (Exceeded The Limit of ${IOS_PAYLOAD_SIZE_LIMIT} bytes)` }
apiErrors.validationFailed.android_payload_limit     = { httpStatus: 400, code: "5029", message: `Invalid Android Payload. (Exceeded The Limit of ${ANDROID_PAYLOAD_SIZE_LIMIT} bytes)` }
apiErrors.validationFailed.ios_payload               = { httpStatus: 400, code: "5030", message: "Invalid iOS Payload" }
apiErrors.validationFailed.android_payload           = { httpStatus: 400, code: "5031", message: "Invalid Android Payload" }
apiErrors.validationFailed.inbox_message_type        = { httpStatus: 400, code: "5032", message: "Invalid Type (should be one of the following types: plain_text、web_url、deep_link)" }
apiErrors.validationFailed.uri_format                = { httpStatus: 400, code: "5033", message: "Invalid URI Format" }
apiErrors.validationFailed.default_value_is_empty    = { httpStatus: 400, code: "5034", message: "The Value Of The 'default' Cannot Be Empty" }
apiErrors.validationFailed.app_does_not_belong_to_realm = { httpStatus: 400, code: "5035", message: "Some app_ids do not belong to the realm" }
apiErrors.validationFailed.meta_format               = { httpStatus: 400, code: "5036", message: "Invalid Meta Format" }
apiErrors.validationFailed.gcm_payload               = { httpStatus: 400, code: "5037", message: "Invalid GCM Payload" }
apiErrors.validationFailed.apns_payload              = { httpStatus: 400, code: "5038", message: "Invalid APNS Payload" }
apiErrors.validationFailed.apns_sandbox_payload      = { httpStatus: 400, code: "5039", message: "Invalid APNS Sandbox Payload" }


apiErrors.notFound = {};
apiErrors.notFound.access_key   = { httpStatus: 400, code: "2000", message: "Access Key Not Found" }
apiErrors.notFound.device       = { httpStatus: 400, code: "2001", message: "Device Not Found" }
apiErrors.notFound.user         = { httpStatus: 400, code: "2002", message: "User Not Found" }
apiErrors.notFound.job          = { httpStatus: 400, code: "2003", message: "Job Not Found" }
apiErrors.notFound.client       = { httpStatus: 400, code: "2005", message: "Client Not Found" }
apiErrors.notFound.app          = { httpStatus: 400, code: "2006", message: "App Not Found" }
apiErrors.notFound.topic        = { httpStatus: 400, code: "2007", message: "Topic Not Found" }
apiErrors.notFound.inbox_msg    = { httpStatus: 400, code: "2008", message: "Inbox Message Not Found" }
apiErrors.notFound.default_key  = { httpStatus: 400, code: "2009", message: "Not Found The 'default' Key" }

apiErrors.exceptionalErrorHappened = { httpStatus: 500, code: "9999", message: "Unknown Error" };

module.exports = apiErrors;
