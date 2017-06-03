'use strict'

const Handlers = require('./lib/handlers');
const BucketRegistry = require('./lib/bucket-registry');
const Configuration = require('./lib/configuration');

module.exports = {
    Configuration: require('./lib/configuration'),
    BucketRegistry: require('./lib/bucket-registry'),
    Handlers: Handlers,
    configureFromObject: (config) => {
        return new Handlers(new BucketRegistry(
                { configuration: Configuration.fromObject(config) }));
    }
};