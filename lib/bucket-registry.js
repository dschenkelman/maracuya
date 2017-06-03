'use strict';
const TokenBucket = require('./token-bucket');
const BucketType = require('./bucket-type');
const storageSchema = require('./storage-schema');
const Joi = require('joi');

const _types = Symbol('types');
const _instances = Symbol('instances');
const _storage = Symbol('storage');
const _bucketFactory = Symbol('bucketFactory');
const _configuration = Symbol('configuration');
const _getType = Symbol('getType');
const _createType = Symbol('createType');

const MemoryStorage = require('./memory-storage');

const paramsSchema = Joi.object().keys({
    // function to create token buckets on demand
    bucketFactory: Joi.func(),
    // storage, used by all bucket types
    storage: storageSchema,
    // bucket type configuration
    configuration: Joi.object().keys({
        get: Joi.func().required()
    }).required()
});

class BucketRegistry {
    constructor(params){
        if (!params) { throw new Error('"params" argument is required'); }
        const result = Joi.validate(params || {}, paramsSchema);
        if (result.error) { throw result.error; }
        this[_bucketFactory] = params.bucketFactory || (params => new TokenBucket(params));
        this[_instances] = new Map();
        this[_types] = new Map();
        this[_storage] = params.storage || new MemoryStorage();
        this[_configuration] = params.configuration;
    }

    [_getType](type){
        let bucketType = this[_types].get(type);
        if (!bucketType){
            const typeConfig = this[_configuration].get(type);
            if (!typeConfig){ return null; }
            bucketType = new BucketType({
                capacity: typeConfig.capacity,
                perInterval: typeConfig.perInterval,
                interval: typeConfig.interval,
                storage: this[_storage]
            });    
            this[_types].set(type, bucketType);
        }

        return bucketType;
    }

    get(type, instanceId){
        const key = `${type}:${instanceId}`;
        let bucket = this[_instances].get(key);
        if (bucket){ return bucket; }
        
        const bucketType = this[_getType](type);
        if (!bucketType) { return null; }
        bucket = this[_bucketFactory]({
            identifier: key,
            type: bucketType
        });

        this[_instances].set(key, bucket);
        return bucket;
    }
}

module.exports = BucketRegistry;