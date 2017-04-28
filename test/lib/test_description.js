'use strict';

require('rootpath')();

const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;

const testDescription = {};
testDescription.missingRequiredParams = {};
testDescription.missingRequiredParams.certificate_serial = 'If the certificate_serial param in request is missing.'
testDescription.missingRequiredParams.api_key = 'If the X-Api-Key Header in request is missing.'
testDescription.missingRequiredParams.signature = 'If the X-Signature Header in request is missing.'
testDescription.missingRequiredParams.access_token = 'If the access_token param in request is missing.'

testDescription.validationFailed = {};
testDescription.validationFailed.certificate_serial = 'If the certificate_serial param in request is invalid.'
testDescription.validationFailed.signature = 'If the signature in request failed the verification.'
testDescription.validationFailed.access_token = 'If the access_token param in request is invalid.'

testDescription.unauthorized = {}
testDescription.unauthorized.access_token_invalid = 'If the access_token param in request is invalid.'
testDescription.unauthorized.access_token_expired = 'If the access_token param in request is expired.'

testDescription.forbidden = {};
testDescription.forbidden.not_device_owner = ''

testDescription.notFound = {};
testDescription.notFound.domain = 'Cannot find domain'
testDescription.notFound.object = 'Cannot find object'

testDescription.Found = {};
testDescription.Found.domain = ''
testDescription.Found.list_object_by_all = 'Successfully list objects by all'
testDescription.Found.list_object_by_key = 'Successfully list objects by key'
testDescription.Found.list_object_by_begins_with = 'Successfully list objects by begins_with'

testDescription.server_return = 'Server should return'
testDescription.OK = { httpStatus: 200 }

module.exports = testDescription;