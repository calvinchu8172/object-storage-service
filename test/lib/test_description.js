'use strict';

require('rootpath')();

const DOMAINS_LIMIT = process.env.DOMAINS_LIMIT;

const testDescription = {};
testDescription.missingRequiredParams = {};
testDescription.missingRequiredParams.certificate_serial = 'If the certificate_serial param in request is missing.';
testDescription.missingRequiredParams.api_key = 'If the X-Api-Key Header in request is missing.';
testDescription.missingRequiredParams.signature = 'If the X-Signature Header in request is missing.';
testDescription.missingRequiredParams.access_token = 'If the access_token param in request is missing.';
testDescription.missingRequiredParams.domain = 'If the domain param in request is missing.';
testDescription.missingRequiredParams.content_type = 'If the content_type param in request is missing.';
testDescription.missingRequiredParams.content = 'If the content param in request is missing.';

testDescription.validationFailed = {};
testDescription.validationFailed.certificate_serial = 'If the certificate_serial param in request is invalid.';
testDescription.validationFailed.signature = 'If the signature in request failed the verification.';
testDescription.validationFailed.access_token = 'If the access_token param in request is invalid.';
testDescription.validationFailed.domain_in_path = 'If the domain in path is invalid.';
testDescription.validationFailed.domain = 'If the domain param is invalid.';
testDescription.validationFailed.new_domain = 'If the new domain param is invalid.';
testDescription.validationFailed.key = 'If the key param is invalid.';
testDescription.validationFailed.new_key = 'If the new key in param is invalid.';
testDescription.validationFailed.content_type = 'If the content_type param in request is invalid.';
testDescription.validationFailed.content = 'If the content param in request is invalid.';

testDescription.invalidDomain = {};
testDescription.invalidDomain.begins_with_number = 'Invalid domain name begins with number.';
testDescription.invalidDomain.with_unacceptable_characters = 'Invalid domain name with unacceptable characters.';
testDescription.invalidDomain.over_128_characters = 'Invalid domain name over 128 characters.';

testDescription.invalidNewDomain = {};
testDescription.invalidNewDomain.begins_with_number = 'Invalid new domain name begins with number.';
testDescription.invalidNewDomain.with_unacceptable_characters = 'Invalid new domain name with unacceptable characters.';
testDescription.invalidNewDomain.over_128_characters = 'Invalid new domain name over 128 characters.';

testDescription.invalidObject = {};
testDescription.invalidObject.begins_with_number = 'Invalid object name begins with number.';
testDescription.invalidObject.with_unacceptable_characters = 'Invalid object name with unacceptable characters.';
testDescription.invalidObject.over_128_characters = 'Invalid object name over 128 characters.';

testDescription.unauthorized = {};
testDescription.unauthorized.access_token_invalid = 'If the access_token param in request is invalid.';
testDescription.unauthorized.access_token_expired = 'If the access_token param in request is expired.';

testDescription.forbidden = {};
testDescription.forbidden.not_device_owner = '';

testDescription.notFound = {};
testDescription.notFound.domain = 'Cannot find domain.';
testDescription.notFound.object = 'Cannot find object.';

testDescription.found = {};
testDescription.found.domain = '';
testDescription.found.list_object_by_all = 'Successfully list objects by all.';
testDescription.found.list_object_by_key = 'Successfully list objects by key.';
testDescription.found.list_object_by_begins_with = 'Successfully list objects by begins_with.';

testDescription.alreadyExists = {};
testDescription.alreadyExists.domain = 'If the domain already exists.';
testDescription.alreadyExists.domain_limit = `If it has already reached ${DOMAINS_LIMIT} domains limit.`;
testDescription.alreadyExists.key = 'If the key already exists.';

testDescription.created = {};
testDescription.created.domain = 'Successfully created domain item.';
testDescription.created.object = {};
testDescription.created.object.json = 'Successfully created json object item.';
testDescription.created.object.file = 'Successfully created file object item.';

testDescription.got = {};
testDescription.got.domain = 'Successfully got domain item.';
testDescription.got.object = {};
testDescription.got.object.json = 'Successfully got object json item.';
testDescription.got.object.file = 'Successfully got object file item.';

testDescription.list = {};
testDescription.list.domain = 'Successfully list domain item.';
testDescription.list.empty_domain = 'Successfully list empty domain item.';
testDescription.list.empty_object = 'Successfully list empty object item.';
testDescription.list.empty_domain_ok = { httpStatus: 200, data: [] };
testDescription.list.empty_object_ok = { httpStatus: 200, data: [] };

testDescription.updated = {};
testDescription.updated.domain = 'Successfully updated domain item.';
testDescription.updated.object = {};
testDescription.updated.object.jsonToJson = 'Successfully updated json object item to json object item.';
testDescription.updated.object.jsonToFile = 'Successfully updated json object item to file object item.';
testDescription.updated.object.fileToJson = 'Successfully updated file object item to json object item.';
testDescription.updated.object.fileToFile = 'Successfully updated file object item to file object item.';

testDescription.updated.fail = {};
testDescription.updated.fail.new_domain_exists = 'Cannot update domain item. New domain has already exist.';

testDescription.delete = {};
testDescription.delete.domain = 'Successfully deleted domain item.';
testDescription.delete.object = {};
testDescription.delete.object.json = 'Successfully deleted json object item.';
testDescription.delete.object.file = 'Successfully deleted file object item.';

testDescription.s3Handler = 'Successfully updated domain file_usage and object usage.';

testDescription.housekeeping = {};
testDescription.housekeeping.emptySQS = 'No message in SQS.';
testDescription.housekeeping.noObjectsAndS3Files = 'No Object and S3 files.';
testDescription.housekeeping.successDeleteObjectsAndS3Files = 'Successfully deleted object items in DB and S3 object files under domain.';
testDescription.housekeeping.return = {};
testDescription.housekeeping.return.emptySQS = 'SQS is empty'
testDescription.housekeeping.return.OKwithDeleteSQSMessage = 'Deleted SQS message.'
testDescription.housekeeping.return.OKWithDelteObjectsAndS3Files = 'Successfully deleted Object items in DB and Object files in S3 and deleted SQS message.'

testDescription.accessTokenValidator = {};
testDescription.accessTokenValidator.invalidAccessToken = 'if client requests with invalid access token.';
testDescription.accessTokenValidator.expiredAccessToken = 'if client requests with expired access token.';
testDescription.accessTokenValidator.validAccessToken = 'if client requests with valid access token.';

testDescription.server_return = 'Server should return';
testDescription.OK = { httpStatus: 200 };
testDescription.OKAndPresignURL = { httpStatus: 200, data: { upload_url: 'https://s3_upload_url'} };
testDescription.OKWithCloudIDAndAPPID = `${JSON.stringify(testDescription.OK)} and the response should include cloud_id and app_id.`;
testDescription.OKWithDomainFileUsageEqualAllOjectUsage = 'Domain file usage equals all uploaded Objects usages';

module.exports = testDescription;