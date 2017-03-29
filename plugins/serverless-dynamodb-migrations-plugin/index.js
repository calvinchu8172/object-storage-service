'use strict';

const _ = require('lodash');
const traverse = require('traverse');
const fs = require('fs');
const AWS = require('aws-sdk');

function getAllFiles(file_path) {
  try {
    var files = fs.readdirSync(file_path);
    return (_.flatten(files.map(function (file) {
      if (fs.statSync(file_path + "/" + file).isDirectory()) {
        return (getAllFiles(file_path + "/" + file));
      }
      return (file_path + "/" + file);
    })));

  }
  catch (err) {
    return ([]);
  }
}

class DynamodbMigrations {

  constructor(serverless, options) {
    // 初始化參數
    this.serverless = serverless;
    this.logger = this.logger.bind(this);
    this.populateProperty = this.populateProperty.bind(this);
    this.region = serverless.providers.aws.getRegion();

    // append dynamodb migrations to resources
    this.appendMigrations();

    // seed command line configurations
    this.options = options;
    this.commands = {
      seed: {
        usage: 'Import data to dynamodb',
        lifecycleEvents: [
          'load',
          'write',
        ],
        options: {
          stage: {
            usage: 'The stage used to populate your templates.',
            shortcut: 's',
            required: true
          }
        }
      }
    };

    this.hooks = {
      'seed:load': this.seedLoad.bind(this),
      'seed:write': this.seedWrite.bind(this)
    };

    this.docClient = new AWS.DynamoDB.DocumentClient({ region: this.region });
    this.seeds = [];
  }

  appendMigrations() {
    var serverless = this.serverless;
    var logger = this.logger;
    var migrations_path = `${serverless.config.servicePath}/db/migrations`;
    var migration_files = getAllFiles(migrations_path);

    if (migration_files.length > 0) {
      var populateProperty = this.populateProperty;
      logger('Adding DynamoDB Tables from db/migrations...');
      var tables = [];
      migration_files.map(function(migration_file) {
        var migration = serverless.utils.readFileSync(migration_file);
        if (migration) {
          tables.push(Object.keys(migration).map((key) => {
            return key.replace('Table', '');
          }));
          var resources = {
            Resources: migration
          }
          serverless.service.resources = _.merge(serverless.service.resources || {}, resources);
        }
      });
      logger('Added Tables: ' + tables.join(', '));
    }
  }

  seedLoad() {
    var serverless = this.serverless;
    var logger = this.logger;
    var populateProperty = this.populateProperty;
    var stage = this.options.stage;
    var seeds = this.seeds;

    logger(`Loading seeds from db/${stage}/seeds...`);

    var seeds_path = `${serverless.config.servicePath}/db/seeds/${stage}`;
    var seed_files = getAllFiles(seeds_path);

    if (seed_files.length > 0) {
      seed_files.map(function (seed_file) {
        var seed = serverless.utils.readFileSync(seed_file);
        if (seed) {
          seeds.push(populateProperty(seed));
        }
      });
    }
  }

  seedWrite() {
    var serverless = this.serverless;
    var logger = this.logger;
    var docClient = this.docClient;

    if (this.seeds.length > 0) {
      logger('Writing seeds...');
      this.seeds.map(function(seed) {
        logger(`Table: ${seed.TableName}, Data Nums: ${seed.Items.length}`);
        seed.Items.forEach(function(Item) {
          var params = {
            TableName : seed.TableName,
            Item: Item
          };
          docClient.put(params, function(err) {
            if (err) throw new serverless.classes.Error(err);
          });
        })
      });
    } else {
      logger('No seeds...');
    }
  }

  populateProperty(properties) {
    var serverless = this.serverless;
    traverse(properties).forEach(function (property) {
      const t = this;
      if (typeof property === 'string') {
        property = serverless.variables.populateProperty(property, true);
        t.update(property);
      }
    });
    return properties;
  }

  logger(message) {
    this.serverless.cli.log(message);
  }
}

module.exports = DynamodbMigrations;
