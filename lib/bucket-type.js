'use strict';

const Joi = require('joi');
const Storage = require('./storage');

const requiredPositiveInteger = Joi.number().integer().greater(0).required();

const paramsSchema = Joi.object().keys({
    // storage abstraction
    storage: Storage.schema.required(),
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
        const value = result.value;
        this.capacity = value.capacity;
        this.perInterval = value.perInterval;
        this.interval = value.interval;
        this.storage = value.storage;
    }
}

module.exports = BucketType;