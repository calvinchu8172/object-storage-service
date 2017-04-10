'use strict';

require('rootpath')();

const redis             = require('redis');
const async             = require('async');
const REDIS_HOST        = process.env.REDIS_HOST;
const REDIS_PORT        = process.env.REDIS_PORT;


function ElastiCache() {}

var connect = function (client, callback) {
  client = redis.createClient({ host: REDIS_HOST, port: REDIS_PORT });
  client.on("connect", function () {
    console.log(`redis client connected...`);
    // callback(null, client, 'redis-success');
  });
  client.on("error", function (err) {
    console.log("redis error: " + err);
    // callback(err);
  });
  client.on("end", function () {
    console.log(`redis client end...`);
    // callback(null, 'redis-connect-end');
  });
  callback(null, client);
}


ElastiCache.connect       = connect;
module.exports = ElastiCache;