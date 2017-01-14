'use strict';

const _storage = Symbol('storage');
const _identifier = Symbol('identifier');
const _capacity = Symbol('identifier');
const _timestampProvider = Symbol('timestampProvider');
const _perInterval = Symbol('perInterval');
const _interval = Symbol('interval');
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
    interval: requiredPositiveInteger,
    // timestamp provider, useful for mocking or in case we want to change the implementation
    timestampProvider: Joi.func().default(() => +new Date())
});

class TokenBucket {
    constructor(params){
        const result = Joi.validate(params, paramsSchema);
        if (result.error) { throw result.error; }
        const value = result.value;
        
        this[_storage] = value.storage;
        this[_identifier] = value.identifier;
        this[_capacity] = value.capacity;
        this[_timestampProvider] = value.timestampProvider;
        this[_perInterval] = value.perInterval;
        this[_interval] = value.interval;
    }

    _mutateState(existingState, toTake, currentTimestamp){
        const lastChange = existingState.lastChange;
        const diff = currentTimestamp - lastChange;
        const toIncrease = diff * (this[_perInterval] / this[_interval]);

        return {
            count: existingState.count + toIncrease - toTake,
            lastChange: currentTimestamp
        };
    }

    take(amount, callback){
        const self = this;
        const storage = this[_storage];
        const id = this[_identifier];
        storage.getAndLock(id, function onGetAndLock(err, state){
            if (err) { return callback(err); }

            const currentTimestamp = self[_timestampProvider]();

            state = state || { count: self[_capacity], lastChange: currentTimestamp };

            if (state.count < amount){
                return callback(null, false);
            }

            const newState = self._mutateState(state, amount, currentTimestamp);
            
            return storage.setAndUnlock(
                id, 
                newState,
                function onRemoveTokens(err){
                    if (err) { return callback(err); }
                    callback(null, true);
                }); 
        });
    }
}

module.exports = TokenBucket;