'use strict';

require('rootpath')();

const async = require('async');
const empty = require('is-empty');

// Example:
// {
//   data: {
//     api: {
//       apiStartTimeMs: 1000
//     },
//     fns: {
//       ${fnName}: {
//         order: 1,
//         fnStartTimeMs: 1000
//       },
//       ...
//     },
//     result: {
//       ${fnName}: {
//         times: 0,
//         api: {
//           totalDuration: 0,
//           averageDuraion: 0,
//           durationRecords: [],
//           minDuration: 0,
//           maxDuration: 0
//         },
//         fn: {
//           totalDuration: 0,
//           averageDuraion: 0,
//           durationRecords: [],
//           minDuration: 0,
//           maxDuration: 0
//         }
//       }
//     }
//   }
// }

function Duration() {
  this.ended = false;
  this.data = {
    api: {},
    fns: {},
    result: {}
  };
}

Duration.prototype.start = function () {
  var apiStartTimeMs = new Date().getTime();
  this.data['api']['apiStartTimeMs'] = apiStartTimeMs;
  return this;
}

Duration.prototype.fnStart = function (fnName) {
  var fnStartTimeMs = new Date().getTime();
  this.data['fns'][fnName] = {};
  var fnKeys = Object.keys(this.data['fns']);
  this.data['fns'][fnName]['order'] = fnKeys.length;
  this.data['fns'][fnName]['fnStartTimeMs'] = fnStartTimeMs;
  return this;
}

Duration.prototype.fnEnd = function (fnName) {
  var apiStartTime = this.data['api']['apiStartTimeMs'];
  var fnStartTime = this.data['fns'][fnName]['fnStartTimeMs'];
  var fnEndTime = new Date().getTime();
  var apiDuration = (fnEndTime - apiStartTime);
  var fnDuration = (fnEndTime - fnStartTime);
  var fnOrder = this.data['fns'][fnName]['order'];
  console.log(`${fnOrder}. ${fnName} -> Duration from API start: ${apiDuration} ms, Duration from Function start: ${fnDuration} ms`);
  if (empty(this.data['result'][fnName])) {
    this.data['result'][fnName] = {
      times: 0,
      api: {
        durationSum: 0,
        averageDuraion: 0,
        durationRecords: [],
        minDuration: 0,
        maxDuration: 0
      },
      fn: {
        durationSum: 0,
        averageDuraion: 0,
        durationRecords: [],
        minDuration: 0,
        maxDuration: 0
      }
    };
  }

  var apiData = this.data['result'][fnName]['api'];
  var fnData = this.data['result'][fnName]['fn'];

  this.data['result'][fnName]['times'] += 1;

  apiData['durationSum'] += apiDuration;
  apiData['durationRecords'].push(apiDuration);
  apiData['minDuration'] = Math.min.apply(null, apiData['durationRecords']),
    apiData['maxDuration'] = Math.max.apply(null, apiData['durationRecords']),
    apiData['averageDuraion'] = apiData['durationSum'] / this.data['result'][fnName]['times'];

  fnData['durationSum'] += fnDuration;
  fnData['durationRecords'].push(fnDuration);
  fnData['minDuration'] = Math.min.apply(null, fnData['durationRecords']),
    fnData['maxDuration'] = Math.max.apply(null, fnData['durationRecords']),
    fnData['averageDuraion'] = fnData['durationSum'] / this.data['result'][fnName]['times'];
}

Duration.prototype.end = function () {
  var self = this;
  if (!self.ended) {
    var fnKeys = Object.keys(this.data['result']);
    async.eachSeries(fnKeys, (fnName, callback) => {
      self.data['result'][fnName]['api']['durationRecords'] = JSON.stringify(self.data['result'][fnName]['api']['durationRecords']);
      self.data['result'][fnName]['fn']['durationRecords'] = JSON.stringify(self.data['result'][fnName]['fn']['durationRecords']);
      callback();
    }, () => {
      self.ended = true;
      console.log(`Benchmark report of functions: ${JSON.stringify(this.data['result'], null, 2)}`);
    });
  }
}


// var defaultDurationReportObject = () => {
//   return {
//     durationSum: 0,
//     averageDuraion: 0,
//     durationRecords: [],
//     minDuration: 0,
//     maxDuration: 0
//   };
// }

// var updateDurationReport = (durationReportObj, duration, times) => {
//   durationReportObj['durationSum'] += duration;
//   durationReportObj['durationRecords'].push(duration);
//   durationReportObj['minDuration'] = Math.min.apply(null, durationReportObj['durationRecords']),
//   durationReportObj['maxDuration'] = Math.max.apply(null, durationReportObj['durationRecords']),
//   durationReportObj['averageDuraion'] = durationReportObj['durationSum'] / times;
// }

module.exports = Duration;






