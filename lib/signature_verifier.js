'use strict';

const crypto = require('crypto');
const utility = require('lib/utility');

module.exports.verify = (params, headers, accessKeyItem) => {
  var signature = headers['X-Eco-Signature'];
  var timestamp = headers['X-Eco-Timestamp'];
  var cloneParams = utility.cloneObject(params);
  cloneParams['X-Eco-Timestamp'] = timestamp;

  var keysSorted = Object.keys(cloneParams).sort().filter((element) => { return element !== 'signature'; });
  var data = keysSorted.map((element) => { return cloneParams[element]; }).join('');
  var verifier = crypto.createVerify('sha224');
  verifier.update(data);
  return verifier.verify(accessKeyItem.public_key, signature, 'base64');
};