'use strict';

const _storage = Symbol('storage');
const _identifier = Symbol('identifier');
const _capacity = Symbol('identifier');
const Joi = require('joi');

const requiredPositiveInteger = Joi.number().integer().greater(0).required();

const paramsSchema = Joi.object().keys({
    // bucket identifier
    identifier: Joi.string().max(100).required(),
    // storage abstraction
    storage: Joi.object().keys({
        getAndLock: Joi.func().required(),
        setAndUnlock: Joi.func().required()
    }).required(),
    // bucket capacity
    capacity: requiredPositiveInteger,
    // how many tokens to add to the bucket per interval
    perInterval: requiredPositiveInteger,
    // interval to add tokens to the bucket in milliseconds
    interval: requiredPositiveInteger
});

class TokenBucket {
    constructor(params){
        const result = Joi.validate(params, paramsSchema);
        if (result.error) { throw result.error; }
        
        this[_storage] = result.value.storage;
        this[_identifier] = result.value.identifier;
        this[_capacity] = result.value.capacity;
    }

    take(amount, callback){
        const storage = this[_storage];
        const id = this[_identifier];
        storage.getAndLock(id, function ongetAndLock(err, remaining){
            if (err) { return callback(err); }
            if (remaining >= amount){
                return storage.setAndUnlock(
                    id, 
                    remaining - amount,
                    function onRemoveTokens(err){
                        if (err) { return callback(err); }
                        callback(null, true);
                    });
            }

            return callback(null, false);            
        });
    }
}

module.exports = TokenBucket;