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
testDescription.validationFailed.domain_in_path = 'If the domain in path is invalid.'
testDescription.validationFailed.new_domain = 'If the new domain param is invalid.'
testDescription.validationFailed.key = 'If the key in path is invalid.'
testDescription.validationFailed.new_key = 'If the new key in param is invalid.'

testDescription.unauthorized = {}
testDescription.unauthorized.access_token_invalid = 'If the access_token param in request is invalid.'
testDescription.unauthorized.access_token_expired = 'If the access_token param in request is expired.'

testDescription.forbidden = {};
testDescription.forbidden.not_device_owner = ''

testDescription.notFound = {};
testDescription.notFound.domain = 'Cannot find domain.'
testDescription.notFound.object = 'Cannot find object.'

testDescription.Found = {};
testDescription.Found.domain = ''
testDescription.Found.list_object_by_all = 'Successfully list objects by all.'
testDescription.Found.list_object_by_key = 'Successfully list objects by key.'
testDescription.Found.list_object_by_begins_with = 'Successfully list objects by begins_with.'

testDescription.Updated = {}
testDescription.Updated.domain = 'Successfully updated domain item.'
testDescription.Updated.object = 'Successfully updated object item.'

testDescription.Updated.fail = {}
testDescription.Updated.fail.new_domain_exists = 'Cannot update domain item. New domain has already exist.'

testDescription.delete = {}
testDescription.delete.domain = 'Successfully deleted domain item.'
testDescription.delete.object = {}
testDescription.delete.object.json = 'Successfully deleted json object item.'
testDescription.delete.object.file = 'Successfully deleted file object item.'

testDescription.server_return = 'Server should return'
testDescription.OK = { httpStatus: 200 }

module.exports = testDescription;