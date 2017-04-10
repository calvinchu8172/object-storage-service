'use strict';

require('rootpath')();

const DOMAINS_LIMIT               = process.env.DOMAINS_LIMIT;
// const KEYS_LIMIT                  = process.env.KEYS_LIMIT;

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
apiErrors.missingRequiredParams.signature            = { httpStatus: 400, code: "400.0", message: `Missing Required Header: X-Signature` }
apiErrors.missingRequiredParams.certificate_serial   = { httpStatus: 400, code: "400.2", message: `Missing Required Parameter: certificate_serial` }
apiErrors.missingRequiredParams.app_id               = { httpStatus: 400, code: "400.4", message: `Missing Required Parameter: app_id` }
apiErrors.missingRequiredParams.access_token         = { httpStatus: 400, code: "400.6", message: `Missing Required Parameter: access_token` }
apiErrors.missingRequiredParams.domain               = { httpStatus: 400, code: "400.7", message: `Missing Required Parameter: domain` }
apiErrors.missingRequiredParams.new_domain           = { httpStatus: 400, code: "400.9", message: `Missing Required Parameter: new_domain` }
apiErrors.missingRequiredParams.key                  = { httpStatus: 400, code: "400.13", message: `Missing Required Parameter: key` }
apiErrors.missingRequiredParams.content_type         = { httpStatus: 400, code: "400.18", message: `Missing Required Parameter: content_type` }
apiErrors.missingRequiredParams.content              = { httpStatus: 400, code: "400.20", message: `Missing Required Parameter: content` }
apiErrors.missingRequiredParams.mac_address          = { httpStatus: 400, code: "400.22", message: `Missing Required Parameter: mac_address` }
apiErrors.missingRequiredParams.serial_number        = { httpStatus: 400, code: "400.23", message: `Missing Required Parameter: serial_number` }
apiErrors.missingRequiredParams.cloud_id             = { httpStatus: 400, code: "400.25", message: `Missing Required Parameter: cloud_id` }


apiErrors.validationFailed = {};
apiErrors.validationFailed.signature                 = { httpStatus: 400, code: "400.1", message: `Invalid signature` }
apiErrors.validationFailed.certificate_serial        = { httpStatus: 400, code: "400.3", message: `Invalid certificate_serial` }
apiErrors.validationFailed.app_id                    = { httpStatus: 400, code: "400.5", message: `Invalid app_id` }
apiErrors.validationFailed.domain                    = { httpStatus: 400, code: "400.8", message: `Invalid domain` }
apiErrors.validationFailed.new_domain                = { httpStatus: 400, code: "400.10", message: `Invalid new_domain` }
apiErrors.validationFailed.domain_duplicated         = { httpStatus: 400, code: "400.11", message: `Domain Already Exists` }
apiErrors.validationFailed.domain_limit              = { httpStatus: 400, code: "400.12", message: `Exceeded The Limit Of ${DOMAINS_LIMIT} Domains` }
apiErrors.validationFailed.key                       = { httpStatus: 400, code: "400.14", message: `Invalid key` }
apiErrors.validationFailed.new_key                   = { httpStatus: 400, code: "400.15", message: `Invalid new_key` }
apiErrors.validationFailed.key_duplicated            = { httpStatus: 400, code: "400.16", message: `Key Already Exists` }
// apiErrors.validationFailed.key_limit                 = { httpStatus: 400, code: "400.17", message: `Exceeded The Limit Of ${KEYS_LIMIT} Keys` }
apiErrors.validationFailed.content_type              = { httpStatus: 400, code: "400.19", message: `Invalid content_type` }
apiErrors.validationFailed.content                   = { httpStatus: 400, code: "400.21", message: `Invalid content` }
apiErrors.validationFailed.cloud_id                  = { httpStatus: 400, code: "400.26", message: `Invalid cloud_id` }


apiErrors.unauthorized = {};
apiErrors.unauthorized.access_token_invalid          = { httpStatus: 401, code: "401.0", message: "Invalid access_token" }
apiErrors.unauthorized.access_token_expired          = { httpStatus: 401, code: "401.1", message: "Access Token Expired" }


apiErrors.forbidden = {};
apiErrors.forbidden.not_device_owner                 = { httpStatus: 403, code: "403.0", message: `User Is Not Device Owner` }


apiErrors.notFound = {};
apiErrors.notFound.device                            = { httpStatus: 400, code: "400.24", message: `Device Not Found` }
apiErrors.notFound.domain                            = { httpStatus: 404, code: "404.0", message: `Domain Not Found` }
apiErrors.notFound.object                            = { httpStatus: 404, code: "404.1", message: `Object Not Found` }


apiErrors.unexceptedError = { httpStatus: 500 };

module.exports = apiErrors;
