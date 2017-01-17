'use strict';

const Joi = require('joi');
const _values = Symbol('values');

const requiredPositiveInteger = Joi.number().integer().greater(0).required();

const configSchema = Joi.object()
    .pattern(/^[-a-zA-Z0-9]+$/, Joi.object().keys({
        perInterval: requiredPositiveInteger,
        interval: requiredPositiveInteger,
        capacity: requiredPositiveInteger
    }));

class Config{
    constructor(config){
        this[_values] = config;
    }

    get(key) { return this[_values][key]; }
}

class Configuration {
    static fromObject(config){
        if (!config) { throw new Error('"config" argument is required'); }
        const result = Joi.validate(config, configSchema);
        if (result.error) { throw result.error; }

        // clone
        return new Config(Object.assign({}, config));
    };
};

module.exports = Configuration;