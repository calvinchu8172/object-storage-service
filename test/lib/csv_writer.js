'use strict';

const CSV_FILE             = process.env.CSV_FILE;
const yaCsv                = require('ya-csv');
const fs                   = require('fs');
let writer;

var all_first_write = function (str) {
  try {
    var str1 = str.substr(0,str.indexOf(':'));
    var str2 = str.substr(str.indexOf(' ') + 1);
    writer = yaCsv.createCsvStreamWriter(fs.createWriteStream(CSV_FILE));
    writer.writeRecord( [str1, str2] );
  } catch (err) {
    console.log(err)
  }
} // write

var title_write = function (str) {
  try {
    var str1 = str.substr(0,str.indexOf(':'));
    var str2 = str.substr(str.indexOf(' ') + 1);
    writer = yaCsv.createCsvStreamWriter(fs.createWriteStream(CSV_FILE, {'flags': 'a'}));
    writer.writeRecord( [str1, str2] );
  } catch (err) {
    console.log(err)
    console.log('throw error...');
  }
} // write

var write = function (str) {
  try {
    var str1 = str.substr(0,str.indexOf(':'));
    var str2 = str.substr(str.indexOf(' ') + 1);
    writer = yaCsv.createCsvStreamWriter(fs.createWriteStream(CSV_FILE, {'flags': 'a'}));
    writer.writeRecord(['', '', str1, str2]);
  } catch (err) {
    console.log(err)
    console.log('throw error...');
  }
} // write

module.exports = {
  all_first_write,
  title_write,
  write
};