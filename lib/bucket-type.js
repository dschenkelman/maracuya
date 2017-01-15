'use strict';

const Joi = require('joi');
const storageSchema = require('./storage-schema');

const requiredPositiveInteger = Joi.number().integer().greater(0).required();

const paramsSchema = Joi.object().keys({
    // storage abstraction
    storage: storageSchema.required(),
    // bucket capacity
    capacity: requiredPositiveInteger,
    // how many tokens to add to the bucket per interval
    perInterval: requiredPositiveInteger,
    // interval to add tokens to the bucket in milliseconds
    interval: requiredPositiveInteger,
});

class BucketType {
    constructor(params){
        if (!params) { throw new Error('"params" argument is required'); }
        const result = Joi.validate(params, paramsSchema);
        if (result.error) { throw result.error; }
        this.capacity = params.capacity;
        this.perInterval = params.perInterval;
        this.interval = params.interval;
        this.storage = params.storage;
    }
}

module.exports = BucketType;