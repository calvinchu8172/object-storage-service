'use strict'

const BbPromise = require('bluebird')

class DeploymentBucket {
  constructor (serverless, options) {
    // 初始化參數
    this.serverless = serverless
    this.logger = this.logger.bind(this)
    this.options = options
    this.provider = this.serverless.getProvider('aws')
    this.service = this.serverless.variables.populateService(options)
    this.deploymentBucket = this.service.provider.deploymentBucket
    this.hooks = {
      'before:deploy:cleanup': this.checkDeploymentBucket.bind(this),
      'after:remove:remove': this.removeDeploymentBucket.bind(this)
    }
  }

  checkDeploymentBucket () {
    if (this.deploymentBucket !== undefined) {
      this.logger('Creating deployment bucket if it does not exist...')
      return this.provider.request(
        'S3',
        'createBucket',
        {
          Bucket: this.deploymentBucket
        },
        this.options.stage,
        this.options.region
      ).then((response) => {
        return BbPromise.resolve()
      })
    }
  }

  removeDeploymentBucket () {
    if (this.deploymentBucket !== undefined) {
      this.logger('Removing deployment bucket if it exists...')
      return this.provider.request(
        'S3',
        'deleteBucket',
        {
          Bucket: this.deploymentBucket
        },
        this.options.stage,
        this.options.region
      ).then((response) => {
        return BbPromise.resolve()
      })
    }
  }

  logger (message) {
    this.serverless.cli.log(message)
  }
}

module.exports = DeploymentBucket
