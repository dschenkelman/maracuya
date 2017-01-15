'use strict';
const TokenBucket = require('./token-bucket');
const BucketType = require('./bucket-type');
const Storage = require('./storage');
const Joi = require('joi');

const _types = Symbol('types');
const _instances = Symbol('instances');
const _storage = Symbol('storage');
const _bucketFactory = Symbol('bucketFactory');
const _configuration = Symbol('configuration');

const paramsSchema = Joi.object().keys({
    // function to create token buckets on demand
    bucketFactory: Joi.func().default(params => new TokenBucket(params)),
    // storage, used by all bucket types
    storage: Storage.schema.required(),
    // bucket type configuration
    configuration: Joi.object().keys({
        get: Joi.func().required()
    }).required()
});

class BucketRegistry{
    constructor(params){
        if (!params) { throw new Error('"params" argument is required'); }
        const result = Joi.validate(params || {}, paramsSchema);
        if (result.error) { throw result.error; }
        this[_bucketFactory] = result.value.bucketFactory;
        this[_instances] = new Map();
        this[_types] = new Map();
        this[_storage] = result.value.storage;
        this[_configuration] = result.value.configuration;
    }

    _getType(type){
        let bucketType = this[_types].get(type);
        if (!bucketType){
            console.log(type);
            const typeConfig = this[_configuration].get(type);
            bucketType =  new BucketType({
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
        
        const bucketType = this._getType(type);
        bucket = this[_bucketFactory]({
            identifier: key,
            type: bucketType
        });

        this[_instances].set(key, bucket);
        return bucket;
    }
}

module.exports = BucketRegistry;