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

class BucketState {
    constructor(count, lastChange){
        this.count = count;
        this.lastChange = lastChange;
    }
}

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
        const diff = Math.max(currentTimestamp - lastChange, 0);
        const toIncrease = diff * (this[_perInterval] / this[_interval]);
        const increased = Math.min(existingState.count + toIncrease, this[_capacity]);

        return new BucketState(increased - toTake, currentTimestamp);
    }

    take(amount, callback){
        const self = this;
        const storage = this[_storage];
        const id = this[_identifier];
        storage.getAndLock(id, function onGetAndLock(err, state){
            if (err) { return callback(err); }

            const currentTimestamp = self[_timestampProvider]();

            if (!state){
                // if no bucket existed in storage, then this is the first time being used
                // create set it to initial state
                state = new BucketState(self[_capacity], currentTimestamp);
            }

            const newState = self._mutateState(state, amount, currentTimestamp);

            if (newState.count < 0){
                return callback(null, false);
            }

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