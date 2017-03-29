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


var getInboxList = function (client, app_id, inbox_index, inbox_type, target_name, callback) {
  var result = [];

  async.eachSeries(inbox_index, function(index, eachCallback){
    client.hget(`${app_id}:${inbox_type}:${target_name}:${index}:inbox-list`, 'data', function (err, obj) {
      obj = JSON.parse(obj);
      result = result.concat(obj);
      if (err){
        eachCallback(err, null);
      } else {
        eachCallback(null, `success`);
      }
    });
  }, function done (err, each_series_result) {
    if (err){
      callback(err, null);
    } else {
      result = result.filter(function(n){ return n != null });
      client.quit();
      callback(null, result);
    }

  });

}


ElastiCache.connect       = connect;
ElastiCache.getInboxList  = getInboxList;

module.exports = ElastiCache;